import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { User, Mail, Shield, MapPin, Globe, LogOut, Trash2 } from "lucide-react"

interface AccountViewProps {
  onLogout: () => void
}

export default function AccountView({ onLogout }: AccountViewProps) {
  const { user } = useAuth()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!user) return null

  const infoRows = [
    { icon: User, label: "Display name", value: user.displayName },
    { icon: Mail, label: "Email", value: user.email },
    { icon: MapPin, label: "City", value: user.city || "Not set" },
    { icon: Globe, label: "Country", value: user.country || "Not set" },
    { icon: Shield, label: "Account ID", value: user.id, mono: true },
  ]

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl px-8 py-10">
        {/* Profile header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted text-xl font-semibold text-foreground uppercase">
            {user.displayName?.charAt(0) ?? "?"}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-foreground leading-tight">{user.displayName}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
            {user.city && (
              <p className="text-sm text-muted-foreground">
                {user.city}{user.country ? `, ${user.country}` : ""}
              </p>
            )}
          </div>
        </div>

        {/* Info card */}
        <div className="rounded-xl border border-border divide-y divide-border bg-card">
          {infoRows.map((row) => {
            const Icon = row.icon
            return (
              <div key={row.label} className="flex items-center gap-4 px-5 py-4">
                <Icon className="size-[18px] text-muted-foreground shrink-0" strokeWidth={1.75} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{row.label}</p>
                  <p className={`text-sm text-foreground mt-0.5 ${row.mono ? "font-mono break-all" : ""}`}>
                    {row.value}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="mt-8 space-y-3">
          <Button
            variant="outline"
            className="w-full h-10 text-sm gap-2 justify-start"
            onClick={onLogout}
          >
            <LogOut className="size-4" strokeWidth={1.75} />
            Sign out
          </Button>

          {!showDeleteConfirm ? (
            <Button
              variant="ghost"
              className="w-full h-10 text-sm gap-2 justify-start text-destructive hover:text-destructive hover:bg-destructive/5"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
              Delete account
            </Button>
          ) : (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-foreground mb-1">Are you sure?</p>
              <p className="text-sm text-muted-foreground mb-4">
                This will permanently delete your account and all your data. This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    // TODO: implement actual account deletion API call
                    onLogout()
                  }}
                >
                  Delete my account
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground/60 mt-6">
          Account editing is not available yet. Contact support for changes.
        </p>
      </div>
    </div>
  )
}
