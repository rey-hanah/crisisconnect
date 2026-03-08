import { useEffect, useState, useRef, useCallback } from "react"
import { io, Socket } from "socket.io-client"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Send, MessageCircle } from "lucide-react"
import type { ConversationTarget } from "@/pages/dashboard/DashboardLayout"

const API = "http://localhost:3001"

interface Conversation {
  _id: string
  participant1: { _id: string; displayName: string }
  participant2: { _id: string; displayName: string }
  postId?: string
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
  return `${Math.floor(hrs / 24)}d`
}

export default function ChatView({ initialTarget, onTargetConsumed }: ChatViewProps) {
  const { token, user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const targetConsumedRef = useRef(false)

  // Connect WebSocket with auth token
  useEffect(() => {
    if (!user || !token) return
    const socket = io(API, {
      transports: ["websocket", "polling"],
      auth: { token },
    })
    socketRef.current = socket

    socket.on("newMessage", (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev
        return [...prev, msg]
      })
      loadConversations()
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user, token]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API}/chat`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
        return data as Conversation[]
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
    return [] as Conversation[]
  }, [token])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Handle initialTarget
  useEffect(() => {
    if (!initialTarget || !token || targetConsumedRef.current) return
    targetConsumedRef.current = true

    async function openTargetConversation() {
      try {
        const res = await fetch(`${API}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ recipientId: initialTarget!.recipientId, postId: initialTarget!.postId }),
        })
        if (res.ok) {
          const conv: Conversation = await res.json()
          setActiveConv(conv)
          await loadConversations()
        }
      } catch {
        // silently fail
      } finally {
        onTargetConsumed?.()
      }
    }
    openTargetConversation()
  }, [initialTarget, token, loadConversations, onTargetConsumed])

  useEffect(() => {
    if (!initialTarget) targetConsumedRef.current = false
  }, [initialTarget])

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConv) return
    async function loadMessages() {
      try {
        const res = await fetch(`${API}/chat/${activeConv!._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) setMessages(await res.json())
      } catch { /* ignore */ }
    }
    loadMessages()
  }, [activeConv, token])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function getOtherParticipant(conv: Conversation) {
    if (!user) return { _id: "", displayName: "Unknown" }
    return conv.participant1._id === user.id ? conv.participant2 : conv.participant1
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !activeConv || !user || !socketRef.current) return
    setSendingMessage(true)
    try {
      socketRef.current.emit("sendMessage", {
        conversationId: activeConv._id,
        content: newMessage.trim(),
      })

      const optimisticMsg: Message = {
        _id: `temp-${Date.now()}`,
        conversationId: activeConv._id,
        senderId: user.id,
        content: newMessage.trim(),
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, optimisticMsg])
      setNewMessage("")
    } finally {
      setSendingMessage(false)
    }
  }

  // ─── Conversation list ──
  if (!activeConv) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Inbox</h1>
            <p className="text-sm text-muted-foreground">
              {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="size-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted mb-3">
                <MessageCircle className="size-6 text-muted-foreground" />
              </div>
              <p className="text-base font-medium text-foreground mb-1">No conversations yet</p>
              <p className="text-sm text-muted-foreground text-center max-w-[260px]">
                Use the Message button on a map post to start a conversation.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map((conv) => {
                const other = getOtherParticipant(conv)
                return (
                  <button
                    key={conv._id}
                    onClick={() => setActiveConv(conv)}
                    className="w-full text-left px-6 py-4 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground uppercase shrink-0">
                        {other.displayName?.charAt(0) ?? "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground truncate">{other.displayName}</p>
                          {conv.lastMessageAt && (
                            <span className="text-xs text-muted-foreground shrink-0 ml-2">{timeAgo(conv.lastMessageAt)}</span>
                          )}
                        </div>
                        {conv.lastMessage && (
                          <p className="text-sm text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Message thread ──
  const other = getOtherParticipant(activeConv)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0">
        <Button variant="ghost" size="icon-sm" onClick={() => { setActiveConv(null); setMessages([]) }}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground uppercase">
          {other.displayName?.charAt(0) ?? "?"}
        </div>
        <p className="text-sm font-semibold text-foreground">{other.displayName}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === user?.id
            return (
              <div key={msg._id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${isMine
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {timeAgo(msg.createdAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="flex items-center gap-3 px-6 py-3 border-t border-border shrink-0">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background transition-colors"
        />
        <Button type="submit" size="icon-sm" disabled={!newMessage.trim() || sendingMessage}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  )
}
