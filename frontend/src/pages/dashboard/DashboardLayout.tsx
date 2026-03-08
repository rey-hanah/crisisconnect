import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { MapPin, FileText, MessageCircle, User, LogOut } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar"
import { AnimatedThemeToggler } from "@/registry/magicui/animated-theme-toggler"
import MapView from "@/components/dashboard/MapView"
import MyPostsView from "@/components/dashboard/MyPostsView"
import ChatView from "@/components/dashboard/ChatView"
import AccountView from "@/components/dashboard/AccountView"

type View = "map" | "posts" | "chat" | "account"

const NAV_ITEMS: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: "map", label: "Map", icon: <MapPin className="size-4" /> },
  { id: "posts", label: "My Posts", icon: <FileText className="size-4" /> },
  { id: "chat", label: "Inbox", icon: <MessageCircle className="size-4" /> },
  { id: "account", label: "Account", icon: <User className="size-4" /> },
]

export default function DashboardLayout() {
  const [activeView, setActiveView] = useState<View>("map")
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate("/login", { replace: true })
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon" className="border-r border-sidebar-border">
          <SidebarHeader className="border-b border-sidebar-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" tooltip="CrisisConnect" className="cursor-default hover:bg-transparent">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <img src="/logo/logo.svg" alt="CC" className="size-5" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold text-sm">CrisisConnect</span>
                    <span className="text-xs text-sidebar-foreground/60">Dashboard</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV_ITEMS.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={activeView === item.id}
                        tooltip={item.label}
                        onClick={() => setActiveView(item.id)}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Toggle theme" className="justify-center group-data-[collapsible=icon]:justify-center">
                  <AnimatedThemeToggler className="size-4" />
                  <span>Theme</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={user?.displayName ?? "Account"}
                  className="cursor-default hover:bg-transparent"
                >
                  <div className="flex size-6 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground uppercase">
                    {user?.displayName?.charAt(0) ?? "?"}
                  </div>
                  <div className="flex flex-col gap-0 leading-none min-w-0">
                    <span className="text-sm font-medium truncate">{user?.displayName}</span>
                    <span className="text-[11px] text-sidebar-foreground/60 truncate">{user?.email}</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Sign out" onClick={handleLogout}>
                  <LogOut className="size-4" />
                  <span>Sign out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>

          <SidebarRail />
        </Sidebar>

        <main className="flex-1 overflow-hidden h-screen">
          {activeView === "map" && <MapView />}
          {activeView === "posts" && <MyPostsView />}
          {activeView === "chat" && <ChatView />}
          {activeView === "account" && <AccountView />}
        </main>
      </SidebarProvider>
    </TooltipProvider>
  )
}
