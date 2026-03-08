import { useEffect, useRef, useState, useCallback } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Button } from "@/components/ui/button"

const API = "http://localhost:3001"

// ─── Types ───────────────────────────────────────────────────────────────────

type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
type Status = "OPEN" | "CLAIMED" | "FULFILLED" | "active" | "claimed" | "fulfilled"
type Category = "water" | "food" | "medical" | "shelter" | "rescue" | "other"
type FilterType = "ALL" | "NEEDS" | "OFFERS"

interface Post {
  id: string
  _id?: string
  title: string
  category: Category
  priority: Priority
  status: Status
  location: [number, number]
  locationLabel: string
  peopleAffected: number
  timeAgo: string
  hoursUnresponded?: number
  aiSummary: string
  type: "need" | "offer"
  urgency?: string
  aiScore?: number
  createdAt?: string
}

// Map backend post shape → frontend Post
function mapApiPost(raw: any): Post {
  const coords: [number, number] = raw.location?.coordinates
    ? [raw.location.coordinates[1], raw.location.coordinates[0]]
    : [49.265, -123.07]

  const urgencyToPriority: Record<string, Priority> = {
    critical: "CRITICAL",
    high: "HIGH",
    medium: "MEDIUM",
    low: "LOW",
  }

  const statusMap: Record<string, Status> = {
    active: "OPEN",
    claimed: "CLAIMED",
    fulfilled: "FULFILLED",
  }

  const timeAgo = (createdAt: string) => {
    if (!createdAt) return "just now"
    const diff = Date.now() - new Date(createdAt).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins} min ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} hr ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return {
    id: raw._id ?? raw.id,
    _id: raw._id ?? raw.id,
    title: raw.title,
    category: raw.category as Category,
    priority: urgencyToPriority[raw.urgency] ?? "MEDIUM",
    status: statusMap[raw.status] ?? "OPEN",
    location: coords,
    locationLabel: raw.neighborhood ?? "Vancouver",
    peopleAffected: raw.peopleAffected ?? 1,
    timeAgo: timeAgo(raw.createdAt),
    aiSummary: raw.aiSummary ?? raw.description ?? "",
    type: raw.type as "need" | "offer",
    urgency: raw.urgency,
    aiScore: raw.aiScore,
    createdAt: raw.createdAt,
  }
}

// ─── Seed fallback ────────────────────────────────────────────────────────────

const SEED_POSTS: Post[] = [
  { id: "1", title: "Family of 4 — no clean water for 3 days", category: "water", priority: "CRITICAL", status: "OPEN", location: [49.2827, -123.1207], locationLabel: "East Vancouver", peopleAffected: 4, timeAgo: "14 min ago", hoursUnresponded: 72, aiSummary: "Family including elderly grandmother without water for 3 days — urgent.", type: "need" },
  { id: "2", title: "Elderly man needs medication pickup", category: "medical", priority: "HIGH", status: "OPEN", location: [49.2488, -123.1389], locationLabel: "Kitsilano", peopleAffected: 1, timeAgo: "1 hr ago", aiSummary: "Elderly resident unable to collect prescription — mobility limited.", type: "need" },
  { id: "3", title: "Hot meals available — 50 portions", category: "food", priority: "LOW", status: "OPEN", location: [49.2606, -123.1138], locationLabel: "Mount Pleasant", peopleAffected: 50, timeAgo: "2 hrs ago", aiSummary: "Provider offering 50 hot meal portions from community kitchen.", type: "offer" },
  { id: "4", title: "Roof collapse — 2 families displaced", category: "shelter", priority: "CRITICAL", status: "CLAIMED", location: [49.2945, -123.0878], locationLabel: "Burnaby", peopleAffected: 8, timeAgo: "3 hrs ago", aiSummary: "Two families displaced after partial roof collapse — need temporary shelter.", type: "need" },
  { id: "5", title: "Flood rescue needed — ground floor", category: "rescue", priority: "CRITICAL", status: "OPEN", location: [49.2204, -123.1362], locationLabel: "Richmond", peopleAffected: 3, timeAgo: "6 min ago", hoursUnresponded: 0.1, aiSummary: "Three people stranded in ground floor apartment due to flooding.", type: "need" },
  { id: "6", title: "Water bottles — 200 units available", category: "water", priority: "MEDIUM", status: "OPEN", location: [49.2575, -123.005], locationLabel: "New Westminster", peopleAffected: 200, timeAgo: "45 min ago", aiSummary: "200 sealed water bottles available for pickup at community depot.", type: "offer" },
]

// ─── Visual constants ─────────────────────────────────────────────────────────

const PRIORITY_PIN_COLORS: Record<Priority, string> = {
  CRITICAL: "oklch(0.612 0.208 22.241)",
  HIGH:     "oklch(0.560 0.12 45)",
  MEDIUM:   "oklch(0.560 0.078 237.982)",
  LOW:      "oklch(0.636 0.049 199)",
}

const PRIORITY_TEXT: Record<Priority, string> = {
  CRITICAL: "text-destructive font-bold",
  HIGH:     "text-orange-500 font-bold",
  MEDIUM:   "text-primary font-bold",
  LOW:      "text-green-500 font-bold",
}

const STATUS_BADGE: Record<string, string> = {
  OPEN:      "bg-primary/10 text-primary border-primary/20",
  CLAIMED:   "bg-chart-1/10 text-chart-1 border-chart-1/20",
  FULFILLED: "bg-muted text-muted-foreground border-border",
}

const PRIORITY_ORDER: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

const CATEGORY_LABELS: Record<Category, string> = {
  water: "Water", food: "Food", medical: "Medical",
  shelter: "Shelter", rescue: "Rescue", other: "Other",
}

function createPin(priority: Priority, pulse = false) {
  const color = PRIORITY_PIN_COLORS[priority]
  const pulseHtml = pulse
    ? `<div style="position:absolute;inset:-4px;border-radius:50%;background:${color};opacity:0.35;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>`
    : ""
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:20px;height:20px;">
      ${pulseHtml}
      <div style="
        position:absolute;inset:2px;
        background:${color};
        border:2px solid var(--background);
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 1px 6px rgba(0,0,0,0.2);
        cursor:pointer;
      "></div>
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 18],
  })
}

// ─── Auth Modal ──────────────────────────────────────────────────────────────

function AuthModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (token: string, user: any) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const body = mode === "login"
        ? { email, password }
        : { email, password, displayName }
      const res = await fetch(`${API}/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Auth failed")
      onSuccess(data.access_token, data.user)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm mx-4 rounded-xl border border-border bg-background p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-foreground">
            {mode === "login" ? "Sign in" : "Create account"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
        </div>

        <div className="flex gap-1 mb-4 p-1 bg-muted rounded-lg">
          {(["login", "signup"] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError("") }}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
              {m === "login" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <input
              type="text" placeholder="Display name" value={displayName} onChange={e => setDisplayName(e.target.value)} required
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          )}
          <input
            type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
            className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>
      </div>
    </div>
  )
}

// ─── Post Form (with voice) ───────────────────────────────────────────────────

declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any }
}

function PostForm({ token, onClose, onCreated }: { token: string; onClose: () => void; onCreated: (post: Post) => void }) {
  const [type, setType] = useState<"need" | "offer">("need")
  const [category, setCategory] = useState<Category>("water")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [peopleAffected, setPeopleAffected] = useState(1)
  const [neighborhood, setNeighborhood] = useState("")
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [locating, setLocating] = useState(false)

  // Try to get user's location
  function getLocation() {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 8000 }
    )
  }

  // Voice input via Web Speech API → /ai/voice-post
  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert("Voice input not supported in this browser. Try Chrome."); return }
    const rec = new SR()
    rec.lang = "en-US"
    rec.interimResults = false
    rec.maxAlternatives = 1
    setListening(true)
    rec.start()
    rec.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript
      setListening(false)
      try {
        const res = await fetch(`${API}/ai/voice-post`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ text: transcript }),
        })
        const data = await res.json()
        if (data.title) setTitle(data.title)
        if (data.description) setDescription(data.description)
        if (data.category) setCategory(data.category as Category)
        if (data.peopleAffected) setPeopleAffected(data.peopleAffected)
      } catch {
        // If AI fails, just fill title with transcript
        setTitle(transcript)
      }
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!lat || !lng) { setError("Please provide a location"); return }
    setError("")
    setLoading(true)
    try {
      const res = await fetch(`${API}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, category, title, description, lat: parseFloat(lat), lng: parseFloat(lng), peopleAffected, neighborhood }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to create post")
      onCreated(mapApiPost(data))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md mx-4 rounded-xl border border-border bg-background p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-foreground">Post a Request</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
        </div>

        {/* Voice button */}
        <button
          type="button"
          onClick={startVoice}
          disabled={listening}
          className={`w-full mb-4 flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold transition-all ${listening ? "border-destructive/50 bg-destructive/10 text-destructive animate-pulse" : "border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-accent"}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
          </svg>
          {listening ? "Listening… speak now" : "Speak your request (AI will fill the form)"}
        </button>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {/* Type toggle */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {(["need", "offer"] as const).map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${type === t ? (t === "need" ? "bg-destructive/15 text-destructive shadow-sm" : "bg-primary/15 text-primary shadow-sm") : "text-muted-foreground"}`}>
                {t === "need" ? "I need help" : "I can offer"}
              </button>
            ))}
          </div>

          {/* Category */}
          <select value={category} onChange={e => setCategory(e.target.value as Category)}
            className={inputCls}>
            {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          {/* Title */}
          <input type="text" placeholder="Brief title (e.g. Family needs water)" value={title} onChange={e => setTitle(e.target.value)} required maxLength={120} className={inputCls} />

          {/* Description */}
          <textarea placeholder="More details (optional)" value={description} onChange={e => setDescription(e.target.value)} rows={3} className={inputCls} />

          {/* People affected */}
          <div className="flex gap-2 items-center">
            <label className="text-xs text-muted-foreground whitespace-nowrap">People affected:</label>
            <input type="number" min={1} max={1000} value={peopleAffected} onChange={e => setPeopleAffected(parseInt(e.target.value))} className={`${inputCls} w-20`} />
          </div>

          {/* Neighborhood */}
          <input type="text" placeholder="Neighborhood (e.g. Kitsilano)" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className={inputCls} />

          {/* Location */}
          <div className="flex gap-2">
            <input type="text" placeholder="Latitude" value={lat} onChange={e => setLat(e.target.value)} required className={`${inputCls} flex-1`} />
            <input type="text" placeholder="Longitude" value={lng} onChange={e => setLng(e.target.value)} required className={`${inputCls} flex-1`} />
            <button type="button" onClick={getLocation} disabled={locating}
              className="shrink-0 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              {locating ? "…" : "Use GPS"}
            </button>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Posting…" : "Submit post"}
          </Button>
        </form>
      </div>
    </div>
  )
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post, selected, onClick }: { post: Post; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg border px-3 py-2.5 transition-all duration-150 ${selected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30 hover:bg-accent/30"}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
        {CATEGORY_LABELS[post.category] ?? post.category}
      </p>
      <p className="text-sm font-semibold text-card-foreground leading-snug mb-1">{post.title}</p>
      <p className={`text-xs mb-1 ${PRIORITY_TEXT[post.priority]}`}>{post.priority}</p>
      {post.aiSummary && (
        <p className="text-xs text-muted-foreground leading-snug mb-2">{post.aiSummary}</p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {post.locationLabel} · {post.timeAgo}
        </span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${STATUS_BADGE[String(post.status)] ?? STATUS_BADGE["OPEN"]}`}>
          {String(post.status).toUpperCase()}
        </span>
      </div>
      {post.hoursUnresponded && post.hoursUnresponded > 1 && (
        <div className="mt-1.5 text-[10px] font-semibold text-destructive bg-destructive/8 border border-destructive/15 rounded px-2 py-1">
          ⚠ No response · {Math.round(post.hoursUnresponded)}h
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  const [posts, setPosts] = useState<Post[]>(SEED_POSTS)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [filter, setFilter] = useState<FilterType>("ALL")
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"))
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [connectionsCount, setConnectionsCount] = useState(0)
  const [showAuth, setShowAuth] = useState(false)
  const [showPostForm, setShowPostForm] = useState(false)
  const [token, setToken] = useState(() => localStorage.getItem("cc_token") ?? "")
  const [user, setUser] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem("cc_user") ?? "null") } catch { return null }
  })
  const [claimLoading, setClaimLoading] = useState(false)

  // Offline detection
  useEffect(() => {
    const on = () => setIsOffline(false)
    const off = () => setIsOffline(true)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off) }
  }, [])

  // Dark mode observer
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    )
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  // Fetch posts from API
  const loadPosts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/posts`)
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        setPosts(data.map(mapApiPost))
        // Count fulfilled as "connections made"
        setConnectionsCount(data.filter((p: any) => p.status === "fulfilled" || p.status === "claimed").length)
      }
    } catch {
      // Backend offline — keep seed data
    }
  }, [])

  useEffect(() => {
    loadPosts()
    const interval = setInterval(loadPosts, 15000) // Poll every 15s
    return () => clearInterval(interval)
  }, [loadPosts])

  // Sync markers whenever posts change
  const syncMarkers = useCallback(() => {
    if (!mapRef.current) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    posts.forEach((post) => {
      const marker = L.marker(post.location, {
        icon: createPin(post.priority, post.priority === "CRITICAL" && String(post.status) !== "CLAIMED" && String(post.status) !== "FULFILLED"),
      })
        .addTo(mapRef.current!)
        .on("click", () => setSelectedPost(post))
      markersRef.current.push(marker)
    })
  }, [posts])

  // Init map
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return
    const map = L.map(mapContainerRef.current, {
      center: [49.265, -123.07],
      zoom: 12,
      zoomControl: false,
      worldCopyJump: false,
      maxBounds: [[-85, -180], [85, 180]],
      maxBoundsViscosity: 1.0,
    })
    L.control.zoom({ position: "bottomright" }).addTo(map)
    const tile = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      { attribution: "&copy; CARTO &copy; OSM", subdomains: "abcd", maxZoom: 19, noWrap: true }
    ).addTo(map)
    tileLayerRef.current = tile
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => { syncMarkers() }, [syncMarkers])

  // Swap tiles on theme change
  useEffect(() => {
    if (!mapRef.current) return
    if (tileLayerRef.current) mapRef.current.removeLayer(tileLayerRef.current)
    const url = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
    tileLayerRef.current = L.tileLayer(url, {
      attribution: "&copy; CARTO &copy; OSM",
      subdomains: "abcd", maxZoom: 19, noWrap: true,
    }).addTo(mapRef.current)
  }, [isDark])

  // Fly to selected
  useEffect(() => {
    if (selectedPost && mapRef.current) {
      mapRef.current.flyTo(selectedPost.location, 14, { duration: 0.9 })
    }
  }, [selectedPost])

  // Invalidate map size when sidebar toggles
  useEffect(() => {
    setTimeout(() => mapRef.current?.invalidateSize(), 310)
  }, [sidebarOpen])

  function handleAuthSuccess(newToken: string, newUser: any) {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem("cc_token", newToken)
    localStorage.setItem("cc_user", JSON.stringify(newUser))
    setShowAuth(false)
  }

  function handleSignOut() {
    setToken("")
    setUser(null)
    localStorage.removeItem("cc_token")
    localStorage.removeItem("cc_user")
  }

  async function handleClaim(postId: string) {
    if (!token) { setShowAuth(true); return }
    setClaimLoading(true)
    try {
      const res = await fetch(`${API}/posts/${postId}/claim`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setConnectionsCount(c => c + 1)
        await loadPosts()
        setSelectedPost(null)
      }
    } finally {
      setClaimLoading(false)
    }
  }

  async function handleFulfill(postId: string) {
    if (!token) { setShowAuth(true); return }
    setClaimLoading(true)
    try {
      const res = await fetch(`${API}/posts/${postId}/fulfill`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setConnectionsCount(c => c + 1)
        await loadPosts()
        setSelectedPost(null)
      }
    } finally {
      setClaimLoading(false)
    }
  }

  const filteredPosts = [...posts]
    .filter(p => String(p.status).toUpperCase() !== "FULFILLED")
    .filter(p => {
      if (filter === "NEEDS") return p.type === "need"
      if (filter === "OFFERS") return p.type === "offer"
      return true
    })
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

  const canAct = (status: Status | string) =>
    String(status).toUpperCase() === "OPEN"

  return (
    <div className="flex h-[calc(100vh-56px)] w-full overflow-hidden bg-background">

      {/* Offline banner */}
      {isOffline && (
        <div className="absolute top-0 inset-x-0 z-[2000] flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground">
          <span>You are offline — showing cached data</span>
        </div>
      )}

      {/* Connections counter (wellness) */}
      {connectionsCount > 0 && (
        <div className="absolute top-3 right-3 z-[1500] flex items-center gap-1.5 rounded-full border border-primary/30 bg-background/90 backdrop-blur-sm px-3 py-1.5 text-[11px] font-semibold text-primary shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          {connectionsCount} connection{connectionsCount !== 1 ? "s" : ""} made
        </div>
      )}

      {/* Auth modal */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} />}

      {/* Post form modal */}
      {showPostForm && token && (
        <PostForm
          token={token}
          onClose={() => setShowPostForm(false)}
          onCreated={(post) => {
            setPosts(prev => [post, ...prev])
            setShowPostForm(false)
          }}
        />
      )}

      {/* ════ LEFT SIDEBAR ════ */}
      <div className={`flex flex-col border-r border-border bg-sidebar z-10 shadow-sm transition-all duration-300 overflow-hidden ${sidebarOpen ? "w-[320px]" : "w-0"}`}>
        <div className="flex flex-col h-full w-[320px]">

          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div>
              <p className="text-xs font-bold text-foreground">Active Reports</p>
              <p className="text-[10px] text-muted-foreground">
                {filteredPosts.length} listing{filteredPosts.length !== 1 ? "s" : ""}
                {filter !== "ALL" && ` · ${filter.toLowerCase()}`}
              </p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11L5 7l4-4" />
              </svg>
            </button>
          </div>

          {/* Auth / Post CTA row */}
          <div className="flex gap-1.5 px-3 py-2 border-b border-border shrink-0">
            {user ? (
              <>
                <Button size="sm" className="flex-1 text-xs" onClick={() => setShowPostForm(true)}>
                  + Post
                </Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={handleSignOut}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setShowAuth(true)}>
                  Sign in
                </Button>
                <Button size="sm" className="flex-1 text-xs" onClick={() => setShowAuth(true)}>
                  Post a need
                </Button>
              </>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex gap-1.5 px-3 py-2.5 border-b border-border shrink-0">
            {(["ALL", "NEEDS", "OFFERS"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 text-xs font-bold py-1.5 rounded-lg border transition-all ${filter === f
                    ? f === "NEEDS"
                      ? "bg-destructive/15 text-destructive border-destructive/30"
                      : f === "OFFERS"
                        ? "bg-primary/15 text-primary border-primary/30"
                        : "bg-foreground text-background border-foreground"
                    : "bg-transparent text-muted-foreground border-border hover:text-foreground"
                  }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Priority legend */}
          <div className="flex gap-3 flex-wrap px-3 py-2 border-b border-border shrink-0">
            {(Object.entries(PRIORITY_PIN_COLORS) as [Priority, string][]).map(([p, color]) => (
              <div key={p} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-[10px] text-muted-foreground">{p}</span>
              </div>
            ))}
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {filteredPosts.length === 0 ? (
              <p className="text-center py-10 text-sm text-muted-foreground">
                No {filter.toLowerCase()} found
              </p>
            ) : (
              filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  selected={selectedPost?.id === post.id}
                  onClick={() => setSelectedPost(post)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ════ MAP ════ */}
      <div className="flex-1 relative">

        {/* Sidebar open button */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-3 left-3 z-[1000] flex items-center gap-1.5 rounded-lg border border-border bg-background/90 backdrop-blur-sm px-3 py-2 text-xs font-semibold text-foreground shadow-md hover:bg-accent transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 3l4 4-4 4" />
            </svg>
            Reports
          </button>
        )}

        {/* Post button when sidebar closed */}
        {!sidebarOpen && (
          <button
            onClick={() => token ? setShowPostForm(true) : setShowAuth(true)}
            className="absolute top-3 left-28 z-[1000] rounded-lg border border-primary/40 bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold shadow-md hover:bg-primary/90 transition-colors"
          >
            + Post
          </button>
        )}

        <div ref={mapContainerRef} className="absolute inset-0" />

        {/* Selected post popup */}
        {selectedPost && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[320px] rounded-xl border border-border p-4 shadow-xl backdrop-blur-md bg-card/95">
            <div className="flex items-start justify-between mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {CATEGORY_LABELS[selectedPost.category] ?? selectedPost.category} · {selectedPost.type.toUpperCase()}
              </p>
              <button onClick={() => setSelectedPost(null)} className="text-xs text-muted-foreground hover:text-destructive transition-colors">✕</button>
            </div>
            <p className="font-bold text-sm text-card-foreground mb-0.5">{selectedPost.title}</p>
            <p className={`text-xs mb-1.5 ${PRIORITY_TEXT[selectedPost.priority]}`}>{selectedPost.priority}</p>
            {selectedPost.aiSummary && (
              <p className="text-xs text-muted-foreground mb-2">{selectedPost.aiSummary}</p>
            )}
            <div className="flex items-center justify-between text-[10px] mb-3">
              <span className="text-muted-foreground">{selectedPost.locationLabel} · {selectedPost.peopleAffected} {selectedPost.peopleAffected === 1 ? "person" : "people"}</span>
              <span className={`font-semibold px-1.5 py-0.5 rounded border ${STATUS_BADGE[String(selectedPost.status).toUpperCase()] ?? STATUS_BADGE["OPEN"]}`}>
                {String(selectedPost.status).toUpperCase()}
              </span>
            </div>

            {/* Action buttons */}
            {canAct(selectedPost.status) && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                  disabled={claimLoading}
                  onClick={() => handleClaim(selectedPost.id)}
                >
                  {claimLoading ? "…" : "Claim"}
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs"
                  disabled={claimLoading}
                  onClick={() => handleFulfill(selectedPost.id)}
                >
                  {claimLoading ? "…" : "Mark fulfilled"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
