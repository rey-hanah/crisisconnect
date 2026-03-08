import { useAuth } from "@/context/AuthContext"
import { User, Mail, Shield, MapPin, Globe } from "lucide-react"

export default function AccountView() {
  const { user } = useAuth()

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

        <p className="text-xs text-muted-foreground/60 mt-4">
          Account editing is not available yet. Contact support for changes.
        </p>
      </div>
    </div>
  )
}
