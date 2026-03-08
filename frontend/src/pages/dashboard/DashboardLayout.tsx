import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Map, FileText, MessageCircle, User, LogOut, ChevronLeft, ChevronRight } from "lucide-react"
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
  postId?: string
}

export default function DashboardLayout() {
  const [activeView, setActiveView] = useState<View>("map")
  const [collapsed, setCollapsed] = useState(false)
  const [conversationTarget, setConversationTarget] = useState<ConversationTarget | null>(null)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

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

  return (
    <div className="flex h-screen w-full bg-background">
      {/* ── Sidebar ── */}
      <aside
        className={`
          flex flex-col shrink-0 border-r border-border bg-sidebar
          transition-[width] duration-200 ease-in-out
          ${collapsed ? "w-[52px]" : "w-[200px]"}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center h-12 shrink-0 border-b border-border ${collapsed ? "justify-center px-0" : "px-3"}`}>
          {collapsed ? (
            <div className="flex size-7 items-center justify-center rounded-md">
              <img src="/logo/logo.svg" alt="CC" className="size-5" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <img src="/logo/logo.svg" alt="CrisisConnect" className="h-6 w-6" />
              <span className="text-[13px] font-semibold text-foreground tracking-tight">CrisisConnect</span>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col gap-0.5 px-2 py-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                title={collapsed ? item.label : undefined}
                className={`
                  group flex items-center gap-2.5 rounded-md px-2.5 h-8 text-[13px] font-medium
                  transition-colors duration-100
                  ${collapsed ? "justify-center px-0" : ""}
                  ${active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }
                `}
              >
                <Icon className="size-[15px] shrink-0" strokeWidth={active ? 2 : 1.75} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Footer: user + sign out + collapse toggle */}
        <div className="shrink-0 border-t border-border">
          {/* User info */}
          <div className={`flex items-center gap-2.5 px-3 py-2.5 ${collapsed ? "justify-center px-0" : ""}`}>
            <div className="flex size-7 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground uppercase shrink-0">
              {user?.displayName?.charAt(0) ?? "?"}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-foreground truncate leading-tight">{user?.displayName}</p>
                <p className="text-[10px] text-muted-foreground truncate leading-tight">{user?.email}</p>
              </div>
            )}
          </div>

          {/* Actions row */}
          <div className={`flex items-center border-t border-border ${collapsed ? "justify-center py-1.5" : "justify-between px-2 py-1.5"}`}>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            >
              <LogOut className="size-3.5" strokeWidth={1.75} />
              {!collapsed && <span>Sign out</span>}
            </button>
            {!collapsed && (
              <button
                onClick={() => setCollapsed(true)}
                title="Collapse sidebar"
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                <ChevronLeft className="size-3.5" />
              </button>
            )}
          </div>

          {/* Expand button when collapsed */}
          {collapsed && (
            <div className="flex justify-center pb-1.5">
              <button
                onClick={() => setCollapsed(false)}
                title="Expand sidebar"
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between h-12 shrink-0 border-b border-border bg-background px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-[13px] font-semibold text-foreground">
              {NAV_ITEMS.find((i) => i.id === activeView)?.label ?? "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <AnimatedThemeToggler className="size-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors" />
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
          {activeView === "account" && <AccountView />}
        </main>
      </div>
    </div>
  )
}
