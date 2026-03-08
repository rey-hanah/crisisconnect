import { useAuth } from "@/context/AuthContext"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { LogOut, Mail, User, Calendar } from "lucide-react"

export default function AccountView() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate("/login", { replace: true })
  }

  if (!user) return null

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border shrink-0">
        <h1 className="text-lg font-semibold text-foreground">Account</h1>
        <p className="text-sm text-muted-foreground">Your account information</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-lg">
          {/* Avatar and name */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted text-2xl font-bold text-foreground uppercase">
              {user.displayName?.charAt(0) ?? "?"}
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{user.displayName}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Info cards */}
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-3 mb-3">
                <User className="size-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Display Name</p>
              </div>
              <p className="text-sm text-muted-foreground pl-7">{user.displayName}</p>
            </div>

            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="size-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Email</p>
              </div>
              <p className="text-sm text-muted-foreground pl-7">{user.email}</p>
            </div>

            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="size-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Account ID</p>
              </div>
              <p className="text-sm text-muted-foreground pl-7 font-mono text-xs">{user.id}</p>
            </div>
          </div>

          {/* Sign out */}
          <div className="mt-8 pt-6 border-t border-border">
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
