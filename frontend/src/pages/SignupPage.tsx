import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { MapPin, Loader2 } from "lucide-react"

export default function SignupPage() {
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [city, setCity] = useState("")
  const [country, setCountry] = useState("")
  const [lat, setLat] = useState<number | undefined>()
  const [lng, setLng] = useState<number | undefined>()
  const [locating, setLocating] = useState(false)
  const [locationLabel, setLocationLabel] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  function detectLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser")
      return
    }
    setLocating(true)
    setError("")
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude
        const longitude = pos.coords.longitude
        setLat(latitude)
        setLng(longitude)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          )
          const data = await res.json()
          const detectedCity =
            data.address?.city ||
            data.address?.town ||
            data.address?.suburb ||
            data.address?.municipality ||
            ""
          const detectedCountry = data.address?.country || ""
          if (detectedCity && !city) setCity(detectedCity)
          if (detectedCountry && !country) setCountry(detectedCountry)
          setLocationLabel(`${detectedCity}${detectedCountry ? `, ${detectedCountry}` : ""}`)
        } catch {
          setLocationLabel(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
        }
        setLocating(false)
      },
      () => {
        setError("Could not detect your location.")
        setLocating(false)
      },
      { timeout: 10000, enableHighAccuracy: true },
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await signup({
        email,
        password,
        displayName,
        city: city || undefined,
        country: country || undefined,
        lat,
        lng,
      })
      navigate("/dashboard", { replace: true })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <Link to="/" className="inline-block mb-6">
            <img src="/logo/logo.svg" alt="CrisisConnect" className="h-10" />
          </Link>
          <h1 className="text-xl font-semibold text-foreground text-center">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1 text-center">
            Join the community and start helping
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium text-foreground">Display name</label>
            <input
              id="name" type="text" value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required minLength={2} autoComplete="name" placeholder="Your name"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
            <input
              id="email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email" placeholder="you@example.com"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
            <input
              id="password" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              required minLength={6} autoComplete="new-password" placeholder="At least 6 characters"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background transition-colors"
            />
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Location</label>
            <button
              type="button"
              onClick={detectLocation}
              disabled={locating}
              className={`flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-medium transition-all ${
                lat != null
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
              }`}
            >
              {locating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MapPin className="size-4" />
              )}
              {locating ? "Detecting..." : locationLabel || "Detect my location"}
            </button>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <input
                type="text" value={city} onChange={(e) => setCity(e.target.value)}
                placeholder="City" autoComplete="address-level2"
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background transition-colors"
              />
              <input
                type="text" value={country} onChange={(e) => setCountry(e.target.value)}
                placeholder="Country" autoComplete="country-name"
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background transition-colors"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full h-10 mt-1">
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
