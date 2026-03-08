import { useState, useCallback, useRef, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Map, FileText, MessageCircle, User, LogOut } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { AnimatedThemeToggler } from "@/registry/magicui/animated-theme-toggler"
import MapView from "@/components/dashboard/MapView"
import MyPostsView from "@/components/dashboard/MyPostsView"
import ChatView from "@/components/dashboard/ChatView"
import AccountView from "@/components/dashboard/AccountView"

type View = "account" | "map" | "posts" | "chat"

const NAV_ITEMS: { id: View; label: string; icon: typeof Map }[] = [
  { id: "account", label: "Account", icon: User },
  { id: "map", label: "Map", icon: Map },
  { id: "posts", label: "My Posts", icon: FileText },
  { id: "chat", label: "Inbox", icon: MessageCircle },
]

export interface ConversationTarget {
  recipientId: string
  recipientName: string
}

const MIN_SIDEBAR = 52
const MAX_SIDEBAR = 280
const COLLAPSE_THRESHOLD = 100

export default function DashboardLayout() {
  const [activeView, setActiveView] = useState<View>("map")
  const [sidebarWidth, setSidebarWidth] = useState(220)
  const [collapsed, setCollapsed] = useState(false)
  const [conversationTarget, setConversationTarget] = useState<ConversationTarget | null>(null)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  function handleLogout() {
    logout()
    navigate("/login", { replace: true })
  }

  const openConversation = useCallback((target: ConversationTarget) => {
    setConversationTarget(target)
    setActiveView("chat")
  }, [])

  const clearConversationTarget = useCallback(() => {
    setConversationTarget(null)
  }, [])

  // ── Drag-to-resize ──
  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    dragging.current = true
    startX.current = e.clientX
    startWidth.current = collapsed ? MIN_SIDEBAR : sidebarWidth
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!dragging.current) return
      const delta = e.clientX - startX.current
      const newWidth = Math.max(MIN_SIDEBAR, Math.min(MAX_SIDEBAR, startWidth.current + delta))

      if (newWidth <= COLLAPSE_THRESHOLD) {
        setCollapsed(true)
      } else {
        setCollapsed(false)
        setSidebarWidth(newWidth)
      }
    }
    function handleMouseUp() {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [sidebarWidth])

  // Click border to toggle collapse
  function handleBorderClick() {
    if (collapsed) {
      setCollapsed(false)
      setSidebarWidth(220)
    } else {
      setCollapsed(true)
    }
  }

  const width = collapsed ? MIN_SIDEBAR : sidebarWidth

  return (
    <div className="flex h-screen w-full bg-background">
      {/* ── Sidebar ── */}
      <aside
        className="relative flex flex-col shrink-0 border-r border-border bg-sidebar transition-[width] duration-150 ease-out"
        style={{ width }}
      >
        {/* Logo — icon only */}
        <Link
          to="/"
          className="flex items-center justify-center h-14 shrink-0 border-b border-border hover:bg-accent/40 transition-colors"
        >
          <img src="/logo/logo.svg" alt="CrisisConnect" className="size-7" />
        </Link>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col gap-1 px-2 py-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                title={collapsed ? item.label : undefined}
                className={`
                  group flex items-center gap-3 rounded-lg px-3 h-10 text-sm font-medium
                  transition-colors duration-100
                  ${collapsed ? "justify-center px-0" : ""}
                  ${active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }
                `}
              >
                <Icon className="size-[18px] shrink-0" strokeWidth={active ? 2 : 1.75} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Footer: user row + sign out row — shares border-t with main content bottom */}
        <div className="shrink-0 border-t border-border flex flex-col" style={{ height: 96 }}>
          {/* User info row */}
          <button
            onClick={() => setActiveView("account")}
            title={collapsed ? user?.displayName ?? "Account" : undefined}
            className={`flex items-center gap-3 w-full flex-1 hover:bg-accent/40 transition-colors ${collapsed ? "justify-center px-0" : "px-3"}`}
          >
            <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground uppercase shrink-0">
              {user?.displayName?.charAt(0) ?? "?"}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-medium text-foreground truncate leading-tight">{user?.displayName}</p>
                <p className="text-[11px] text-muted-foreground truncate leading-tight">{user?.email}</p>
              </div>
            )}
          </button>

          {/* Subtle inner separator */}
          <div className={`h-px bg-border/50 ${collapsed ? "mx-2" : "mx-3"}`} />

          {/* Sign out row */}
          <div className={`flex items-center flex-1 ${collapsed ? "justify-center" : "px-2"}`}>
            <button
              onClick={handleLogout}
              title="Sign out"
              className={`flex items-center gap-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors ${collapsed ? "p-2" : "px-3 py-2 w-full"}`}
            >
              <LogOut className="size-4 shrink-0" strokeWidth={1.75} />
              {!collapsed && <span>Sign out</span>}
            </button>
          </div>
        </div>

        {/* Resize handle (drag border) */}
        <div
          className="sidebar-resize-handle"
          onMouseDown={handleMouseDown}
          onDoubleClick={handleBorderClick}
        />
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between h-14 shrink-0 border-b border-border bg-background px-5">
          <h1 className="text-sm font-semibold text-foreground">
            {NAV_ITEMS.find((i) => i.id === activeView)?.label ?? "Dashboard"}
          </h1>
          <div className="flex items-center gap-1">
            <AnimatedThemeToggler className="size-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors" />
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-hidden">
          {activeView === "map" && <MapView onContactPoster={openConversation} />}
          {activeView === "posts" && <MyPostsView />}
          {activeView === "chat" && (
            <ChatView
              initialTarget={conversationTarget}
              onTargetConsumed={clearConversationTarget}
            />
          )}
          {activeView === "account" && <AccountView onLogout={handleLogout} />}
        </main>
      </div>
    </div>
  )
}
