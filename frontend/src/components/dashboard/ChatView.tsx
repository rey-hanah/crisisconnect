import { useEffect, useState, useRef, useCallback } from "react"
import { io, Socket } from "socket.io-client"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Send, MessageCircle } from "lucide-react"
import type { ConversationTarget } from "@/pages/dashboard/DashboardLayout"

const API = "http://localhost:3001"

interface Participant {
  _id: string
  displayName: string
}

interface Conversation {
  _id: string
  participant1: Participant
  participant2: Participant
  lastMessage?: string
  lastMessageAt?: string
}

interface Message {
  _id: string
  conversationId: string
  senderId: string
  content: string
  createdAt: string
}

interface ChatViewProps {
  initialTarget?: ConversationTarget | null
  onTargetConsumed?: () => void
}

function timeAgo(dateStr: string | undefined) {
  if (!dateStr) return ""
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function formatMessageTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

export default function ChatView({ initialTarget, onTargetConsumed }: ChatViewProps) {
  const { token, user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const targetConsumedRef = useRef(false)
  const activeConvRef = useRef<Conversation | null>(null)

  // Keep ref in sync so socket handler always sees current conversation
  useEffect(() => {
    activeConvRef.current = activeConv
  }, [activeConv])

  // ── WebSocket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !token) return

    const socket = io(API, {
      transports: ["websocket", "polling"],
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    })

    socketRef.current = socket

    socket.on("connect", () => console.log("[ws] connected"))
    socket.on("connect_error", (err) => console.error("[ws] error:", err.message))

    socket.on("newMessage", (msg: Message) => {
      // Only append to the visible thread if it's the active conversation
      if (activeConvRef.current?._id === msg.conversationId) {
        setMessages((prev) => {
          // Replace matching optimistic message (temp-*) or deduplicate by _id
          const withoutOptimistic = prev.filter(
            (m) => !(m._id.startsWith("temp-") && m.content === msg.content && m.senderId === msg.senderId)
          )
          if (withoutOptimistic.some((m) => m._id === msg._id)) return withoutOptimistic
          return [...withoutOptimistic, msg]
        })
      }
      // Always refresh sidebar to update lastMessage preview
      loadConversations()
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user, token]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Conversations list ─────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API}/chat`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data: Conversation[] = await res.json()
        setConversations(data)
        return data
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
    return [] as Conversation[]
  }, [token])

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Reload conversations every time we return to the list view
  useEffect(() => {
    if (!activeConv) {
      loadConversations()
    }
  }, [activeConv, loadConversations])

  // ── Handle initialTarget (opened from map "Message" button) ───────────────
  useEffect(() => {
    if (!initialTarget || !token || targetConsumedRef.current) return
    targetConsumedRef.current = true

    async function openConversation() {
      try {
        const res = await fetch(`${API}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ recipientId: initialTarget!.recipientId }),
        })
        if (res.ok) {
          const conv: Conversation = await res.json()
          setActiveConv(conv)
          await loadConversations()
        }
      } catch { /* ignore */ } finally {
        onTargetConsumed?.()
      }
    }
    openConversation()
  }, [initialTarget, token, loadConversations, onTargetConsumed])

  useEffect(() => {
    if (!initialTarget) targetConsumedRef.current = false
  }, [initialTarget])

  // ── Load messages when conversation is opened ─────────────────────────────
  useEffect(() => {
    if (!activeConv) return
    setMessages([])
    async function load() {
      try {
        const res = await fetch(`${API}/chat/${activeConv!._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) setMessages(await res.json())
      } catch { /* ignore */ }
    }
    load()
    // Focus input after opening
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [activeConv, token])

  // ── Auto-scroll to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function getOtherParticipant(conv: Conversation): Participant {
    if (!user) return { _id: "", displayName: "Unknown" }
    return conv.participant1._id === user.id ? conv.participant2 : conv.participant1
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const content = newMessage.trim()
    if (!content || !activeConv || !user || !socketRef.current) return

    setSending(true)
    setNewMessage("")

    // Optimistic message
    const optimistic: Message = {
      _id: `temp-${Date.now()}`,
      conversationId: activeConv._id,
      senderId: user.id,
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    socketRef.current.emit("sendMessage", { conversationId: activeConv._id, content })
    setSending(false)
    inputRef.current?.focus()
  }

  // ── Back to list ──────────────────────────────────────────────────────────
  function goBackToList() {
    setActiveConv(null)
    setMessages([])
  }

  // ── Conversation list view ────────────────────────────────────────────────
  if (!activeConv) {
    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <h1 className="text-base font-semibold text-foreground">Messages</h1>
          {!loading && conversations.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="size-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted mb-3">
                <MessageCircle className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No messages yet</p>
              <p className="text-xs text-muted-foreground max-w-[240px]">
                Tap the Message button on any map post to start a conversation.
              </p>
            </div>
          ) : (
            <ul>
              {conversations.map((conv) => {
                const other = getOtherParticipant(conv)
                const initial = other.displayName?.charAt(0).toUpperCase() ?? "?"
                return (
                  <li key={conv._id}>
                    <button
                      onClick={() => setActiveConv(conv)}
                      className="w-full flex items-center gap-3 px-6 py-3.5 hover:bg-accent/40 transition-colors text-left"
                    >
                      {/* Avatar */}
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                        {initial}
                      </div>
                      {/* Text */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">{other.displayName}</p>
                          {conv.lastMessageAt && (
                            <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(conv.lastMessageAt)}</span>
                          )}
                        </div>
                        <p className="text-[13px] text-muted-foreground truncate mt-0.5">
                          {conv.lastMessage ?? "No messages yet"}
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    )
  }

  // ── Message thread view ───────────────────────────────────────────────────
  const other = getOtherParticipant(activeConv)

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = []
  for (const msg of messages) {
    const day = new Date(msg.createdAt).toLocaleDateString(undefined, {
      weekday: "long", month: "long", day: "numeric"
    })
    const last = grouped[grouped.length - 1]
    if (!last || last.date !== day) grouped.push({ date: day, msgs: [msg] })
    else last.msgs.push(msg)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Thread header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={goBackToList}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
          {other.displayName?.charAt(0).toUpperCase() ?? "?"}
        </div>
        <p className="text-sm font-semibold text-foreground truncate">{other.displayName}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <MessageCircle className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Say hello to {other.displayName}!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ date, msgs }) => (
              <div key={date}>
                {/* Date separator */}
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] text-muted-foreground shrink-0">{date}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Messages */}
                <div className="space-y-1">
                  {msgs.map((msg, i) => {
                    const isMine = msg.senderId === user?.id
                    const isOptimistic = msg._id.startsWith("temp-")
                    // Show avatar only on first message in a run from same sender
                    const prevMsg = i > 0 ? msgs[i - 1] : null
                    const isContinuation = prevMsg?.senderId === msg.senderId

                    return (
                      <div
                        key={msg._id}
                        className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"} ${isContinuation ? "mt-0.5" : "mt-3"}`}
                      >
                        {/* Other person's avatar — only on last bubble in a run */}
                        {!isMine && (
                          <div className={`size-7 shrink-0 ${isContinuation ? "invisible" : "flex"} items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground`}>
                            {other.displayName?.charAt(0).toUpperCase()}
                          </div>
                        )}

                        {/* Bubble */}
                        <div className={`flex flex-col gap-0.5 max-w-[72%] ${isMine ? "items-end" : "items-start"}`}>
                          <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words
                            ${isMine
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted text-foreground rounded-bl-sm"
                            }
                            ${isOptimistic ? "opacity-60" : ""}
                          `}>
                            {msg.content}
                          </div>
                          {/* Timestamp on last message of a run */}
                          {(i === msgs.length - 1 || msgs[i + 1]?.senderId !== msg.senderId) && (
                            <span className="text-[10px] text-muted-foreground px-1">
                              {formatMessageTime(msg.createdAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input bar — height matches sidebar footer for aligned border-t */}
      <form
        onSubmit={sendMessage}
        className="flex items-center gap-2 px-4 border-t border-border shrink-0" style={{ height: 96 }}
      >
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={`Message ${other.displayName}...`}
          className="flex-1 h-10 rounded-full border border-border bg-muted/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-colors"
        />
        <Button
          type="submit"
          size="icon-sm"
          disabled={!newMessage.trim() || sending}
          className="rounded-full shrink-0"
        >
          <Send className="size-3.5" />
        </Button>
      </form>
    </div>
  )
}
