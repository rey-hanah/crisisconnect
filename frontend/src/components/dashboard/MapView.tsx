import { useEffect, useRef, useState, useCallback } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import PostForm from "@/components/dashboard/PostForm"
import { ChevronLeft, ChevronRight, Plus, MessageCircle, Loader2 } from "lucide-react"
import type { ConversationTarget } from "@/pages/dashboard/DashboardLayout"

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
  postedBy?: { id: string; displayName: string }
}

function mapApiPost(raw: any): Post {
  const coords: [number, number] = raw.location?.coordinates
    ? [raw.location.coordinates[1], raw.location.coordinates[0]]
    : [49.265, -123.07]

  const urgencyToPriority: Record<string, Priority> = {
    critical: "CRITICAL", high: "HIGH", medium: "MEDIUM", low: "LOW",
  }

  const statusMap: Record<string, Status> = {
    active: "OPEN", claimed: "CLAIMED", fulfilled: "FULFILLED",
  }

  const timeAgo = (createdAt: string) => {
    if (!createdAt) return "just now"
    const diff = Date.now() - new Date(createdAt).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
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
  { id: "1", title: "Family of 4 -- no clean water for 3 days", category: "water", priority: "CRITICAL", status: "OPEN", location: [49.2827, -123.1207], locationLabel: "East Vancouver", peopleAffected: 4, timeAgo: "14 min ago", hoursUnresponded: 72, aiSummary: "Family including elderly grandmother without water for 3 days.", type: "need" },
  { id: "2", title: "Elderly man needs medication pickup", category: "medical", priority: "HIGH", status: "OPEN", location: [49.2488, -123.1389], locationLabel: "Kitsilano", peopleAffected: 1, timeAgo: "1 hr ago", aiSummary: "Elderly resident unable to collect prescription.", type: "need" },
  { id: "3", title: "Hot meals available -- 50 portions", category: "food", priority: "LOW", status: "OPEN", location: [49.2606, -123.1138], locationLabel: "Mount Pleasant", peopleAffected: 50, timeAgo: "2 hrs ago", aiSummary: "Provider offering 50 hot meal portions from community kitchen.", type: "offer" },
  { id: "4", title: "Roof collapse -- 2 families displaced", category: "shelter", priority: "CRITICAL", status: "CLAIMED", location: [49.2945, -123.0878], locationLabel: "Burnaby", peopleAffected: 8, timeAgo: "3 hrs ago", aiSummary: "Two families displaced after partial roof collapse.", type: "need" },
  { id: "5", title: "Flood rescue needed -- ground floor", category: "rescue", priority: "CRITICAL", status: "OPEN", location: [49.2204, -123.1362], locationLabel: "Richmond", peopleAffected: 3, timeAgo: "6 min ago", hoursUnresponded: 0.1, aiSummary: "Three people stranded in ground floor apartment due to flooding.", type: "need" },
  { id: "6", title: "Water bottles -- 200 units available", category: "water", priority: "MEDIUM", status: "OPEN", location: [49.2575, -123.005], locationLabel: "New Westminster", peopleAffected: 200, timeAgo: "45 min ago", aiSummary: "200 sealed water bottles available for pickup at community depot.", type: "offer" },
]

// ─── Visual constants ─────────────────────────────────────────────────────────

const PRIORITY_PIN_COLORS: Record<Priority, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#3b82f6",
  LOW: "#22c55e",
}

const CATEGORY_LABELS: Record<Category, string> = {
  water: "Water", food: "Food", medical: "Medical",
  shelter: "Shelter", rescue: "Rescue", other: "Other",
}

const PRIORITY_ORDER: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

function createPin(priority: Priority, pulse = false) {
  const color = PRIORITY_PIN_COLORS[priority]
  const pulseHtml = pulse
    ? `<div style="position:absolute;inset:-4px;border-radius:50%;background:${color};opacity:0.3;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>`
    : ""
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:18px;height:18px;">
      ${pulseHtml}
      <div style="
        position:absolute;inset:2px;
        background:${color};
        border:2px solid white;
        border-radius:50%;
        box-shadow:0 1px 4px rgba(0,0,0,0.25);
        cursor:pointer;
      "></div>
    </div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

// ─── Map View ─────────────────────────────────────────────────────────────────

interface MapViewProps {
  onContactPoster?: (target: ConversationTarget) => void
}

export default function MapView({ onContactPoster }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  const { token, user } = useAuth()
  const [posts, setPosts] = useState<Post[]>(SEED_POSTS)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [filter, setFilter] = useState<FilterType>("ALL")
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"))
  const [panelOpen, setPanelOpen] = useState(true)
  const [showPostForm, setShowPostForm] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [ownerLoading, setOwnerLoading] = useState(false)

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
      }
    } catch {
      // Backend offline -- keep seed data
    }
  }, [])

  useEffect(() => {
    loadPosts()
    const interval = setInterval(loadPosts, 15000)
    return () => clearInterval(interval)
  }, [loadPosts])

  // Sync markers
  const syncMarkers = useCallback(() => {
    if (!mapRef.current) return
    markersRef.current.forEach((m) => m.remove())
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

  // Invalidate map size when panel toggles
  useEffect(() => {
    setTimeout(() => mapRef.current?.invalidateSize(), 210)
  }, [panelOpen])

  // Fetch poster info and open conversation
  async function handleContactPoster(post: Post) {
    if (!onContactPoster || !token) return
    setOwnerLoading(true)
    try {
      const res = await fetch(`${API}/posts/${post.id}/owner`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const owner = await res.json()
      if (owner && owner.id !== user?.id) {
        onContactPoster({
          recipientId: owner.id,
          recipientName: owner.displayName,
          postId: post.id,
        })
      }
    } catch {
      // Can't fetch owner
    } finally {
      setOwnerLoading(false)
    }
  }

  async function handleClaim(postId: string) {
    setActionLoading(true)
    try {
      const res = await fetch(`${API}/posts/${postId}/claim`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        await loadPosts()
        setSelectedPost(null)
      }
    } finally {
      setActionLoading(false)
    }
  }

  async function handleFulfill(postId: string) {
    setActionLoading(true)
    try {
      const res = await fetch(`${API}/posts/${postId}/fulfill`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        await loadPosts()
        setSelectedPost(null)
      }
    } finally {
      setActionLoading(false)
    }
  }

  const filteredPosts = [...posts]
    .filter((p) => String(p.status).toUpperCase() !== "FULFILLED")
    .filter((p) => {
      if (filter === "NEEDS") return p.type === "need"
      if (filter === "OFFERS") return p.type === "offer"
      return true
    })
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

  const canAct = (status: Status | string) => String(status).toUpperCase() === "OPEN"

  return (
    <div className="flex h-full w-full overflow-hidden bg-background relative">
      {/* Post form modal */}
      {showPostForm && (
        <PostForm
          token={token}
          onClose={() => setShowPostForm(false)}
          onCreated={(post) => {
            setPosts((prev) => [post, ...prev])
            setShowPostForm(false)
          }}
        />
      )}

      {/* ── Left panel (reports list) ── */}
      <div
        className={`
          flex flex-col border-r border-border bg-card z-10
          transition-[width] duration-200 ease-in-out overflow-hidden shrink-0
          ${panelOpen ? "w-[280px]" : "w-0"}
        `}
      >
        <div className="flex flex-col h-full w-[280px]">
          {/* Panel header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
            <div>
              <p className="text-[13px] font-semibold text-foreground">Active reports</p>
              <p className="text-[11px] text-muted-foreground">
                {filteredPosts.length} listing{filteredPosts.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" className="h-7 text-[11px] gap-1" onClick={() => setShowPostForm(true)}>
                <Plus className="size-3" />
                Post
              </Button>
              <button
                onClick={() => setPanelOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                <ChevronLeft className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Filter row */}
          <div className="flex gap-1 px-3 py-2 border-b border-border shrink-0">
            {(["ALL", "NEEDS", "OFFERS"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`
                  flex-1 text-[11px] font-medium py-1.5 rounded-md transition-colors
                  ${filter === f
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }
                `}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Priority legend */}
          <div className="flex gap-3 px-3 py-2 border-b border-border shrink-0">
            {(Object.entries(PRIORITY_PIN_COLORS) as [Priority, string][]).map(([p, color]) => (
              <div key={p} className="flex items-center gap-1">
                <div className="size-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-[10px] text-muted-foreground capitalize">{p.toLowerCase()}</span>
              </div>
            ))}
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto">
            {filteredPosts.length === 0 ? (
              <p className="text-center py-10 text-[13px] text-muted-foreground">
                No reports found
              </p>
            ) : (
              <div className="divide-y divide-border">
                {filteredPosts.map((post) => {
                  const isSelected = selectedPost?.id === post.id
                  return (
                    <button
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className={`
                        w-full text-left px-3 py-2.5 transition-colors
                        ${isSelected ? "bg-accent/60" : "hover:bg-accent/30"}
                      `}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="size-2 rounded-full shrink-0" style={{ background: PRIORITY_PIN_COLORS[post.priority] }} />
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{CATEGORY_LABELS[post.category]}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className={`text-[10px] ${post.type === "need" ? "text-destructive" : "text-primary"}`}>{post.type}</span>
                      </div>
                      <p className="text-[12px] font-medium text-foreground leading-snug mb-0.5 line-clamp-2">{post.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {post.locationLabel} · {post.timeAgo}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Map ── */}
      <div className="flex-1 relative">
        {/* Panel open button when collapsed */}
        {!panelOpen && (
          <button
            onClick={() => setPanelOpen(true)}
            className="absolute top-3 left-3 z-[1000] flex items-center gap-1.5 rounded-lg border border-border bg-card/95 backdrop-blur-sm px-2.5 py-1.5 text-[12px] font-medium text-foreground shadow-sm hover:bg-accent transition-colors"
          >
            <ChevronRight className="size-3.5" />
            Reports
          </button>
        )}

        {/* Quick post button when panel closed */}
        {!panelOpen && (
          <button
            onClick={() => setShowPostForm(true)}
            className="absolute top-3 left-[100px] z-[1000] rounded-lg bg-primary text-primary-foreground px-2.5 py-1.5 text-[12px] font-medium shadow-sm hover:bg-primary/90 transition-colors"
          >
            + Post
          </button>
        )}

        <div ref={mapContainerRef} className="absolute inset-0" />

        {/* Selected post popup */}
        {selectedPost && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-[320px] rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-xl overflow-hidden">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full shrink-0" style={{ background: PRIORITY_PIN_COLORS[selectedPost.priority] }} />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {CATEGORY_LABELS[selectedPost.category]} · {selectedPost.type}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="rounded-md p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M2 2l8 8M10 2l-8 8" />
                  </svg>
                </button>
              </div>

              {/* Title */}
              <p className="text-[13px] font-semibold text-foreground leading-snug mb-1">{selectedPost.title}</p>

              {/* Summary */}
              {selectedPost.aiSummary && (
                <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">{selectedPost.aiSummary}</p>
              )}

              {/* Meta */}
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3">
                <span>{selectedPost.locationLabel}</span>
                <span>·</span>
                <span>{selectedPost.peopleAffected} {selectedPost.peopleAffected === 1 ? "person" : "people"}</span>
                <span>·</span>
                <span>{selectedPost.timeAgo}</span>
              </div>

              {/* Poster info */}
              {selectedPost.postedBy && (
                <div className="flex items-center gap-2 mb-3 px-2.5 py-2 rounded-md bg-muted/50">
                  <div className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground uppercase">
                    {selectedPost.postedBy.displayName.charAt(0)}
                  </div>
                  <span className="text-[12px] text-foreground font-medium">
                    {selectedPost.postedBy.displayName}
                  </span>
                </div>
              )}

              {/* Actions */}
              {canAct(selectedPost.status) && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-[12px]"
                    disabled={actionLoading}
                    onClick={() => handleClaim(selectedPost.id)}
                  >
                    {actionLoading ? <Loader2 className="size-3 animate-spin" /> : "Claim"}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-[12px] gap-1.5"
                    disabled={ownerLoading}
                    onClick={() => handleContactPoster(selectedPost)}
                  >
                    {ownerLoading ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <>
                        <MessageCircle className="size-3" />
                        Message
                      </>
                    )}
                  </Button>
                </div>
              )}

              {String(selectedPost.status).toUpperCase() === "CLAIMED" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-[12px]"
                    disabled={actionLoading}
                    onClick={() => handleFulfill(selectedPost.id)}
                  >
                    Mark fulfilled
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-[12px] gap-1.5"
                    disabled={ownerLoading}
                    onClick={() => handleContactPoster(selectedPost)}
                  >
                    {ownerLoading ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <>
                        <MessageCircle className="size-3" />
                        Message
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
