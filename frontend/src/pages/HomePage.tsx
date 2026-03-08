import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

/**
 * Minimal landing page placeholder.
 * A teammate is building the full landing page — this is just the route shell.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center max-w-lg">
        <img src="/logo/logo.svg" alt="CrisisConnect" className="h-14 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
          CrisisConnect
        </h1>
        <p className="text-base text-muted-foreground mb-8 leading-relaxed">
          Community-powered crisis response. Report needs, offer help, and
          connect with your neighbors when it matters most.
        </p>
        <div className="flex gap-3 justify-center">
          <Button size="lg" render={<Link to="/dashboard" />}>
            Open Dashboard
          </Button>
          <Button variant="outline" size="lg" render={<Link to="/login" />}>
            Sign in
          </Button>
        </div>
      </div>
    </div>
  )
}
