import { useAuth } from "@/context/AuthContext"
import { User, Mail, Shield } from "lucide-react"

export default function AccountView() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-lg mx-auto px-6 py-10">
        {/* Profile header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted text-xl font-semibold text-foreground uppercase">
            {user.displayName?.charAt(0) ?? "?"}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground leading-tight">{user.displayName}</h2>
            <p className="text-[13px] text-muted-foreground">{user.email}</p>
          </div>
        </div>

        {/* Info rows */}
        <div className="rounded-lg border border-border divide-y divide-border bg-card">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <User className="size-4 text-muted-foreground shrink-0" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Display name</p>
              <p className="text-[13px] text-foreground mt-0.5">{user.displayName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Mail className="size-4 text-muted-foreground shrink-0" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Email</p>
              <p className="text-[13px] text-foreground mt-0.5">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Shield className="size-4 text-muted-foreground shrink-0" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Account ID</p>
              <p className="text-[13px] text-foreground font-mono mt-0.5 break-all">{user.id}</p>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/60 mt-4">
          Account editing is not available yet. Contact support for changes.
        </p>
      </div>
    </div>
  )
}
