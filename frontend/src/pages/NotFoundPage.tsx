import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <p className="text-7xl font-bold text-foreground mb-2">404</p>
        <p className="text-lg text-muted-foreground mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Button render={<Link to="/" />}>
            Go home
          </Button>
          <Button variant="outline" render={<Link to="/login" />}>
            Sign in
          </Button>
        </div>
      </div>
    </div>
  )
}
