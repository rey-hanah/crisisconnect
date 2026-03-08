import { useEffect, useRef, useState, useCallback } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import PostForm from "@/components/dashboard/PostForm"
import { ChevronLeft, ChevronRight, Plus, MessageCircle, Loader2, Search, X, HandHelping, Image as ImageIcon } from "lucide-react"
import type { ConversationTarget } from "@/pages/dashboard/DashboardLayout"
import { API_URL as API } from "@/lib/api"

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
  aiSummary: string
  type: "need" | "offer"
  urgency?: string
  aiScore?: number
  createdAt?: string
  description?: string
  photos?: string[]
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

  let postedBy: Post["postedBy"] = undefined
  if (raw.userId && typeof raw.userId === "object" && raw.userId.displayName) {
    postedBy = {
      id: raw.userId._id ?? raw.userId.id,
      displayName: raw.userId.displayName,
    }
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
    description: raw.description,
    photos: Array.isArray(raw.photos) ? raw.photos : [],
    postedBy,
  }
}

// Priority colors from CSS vars
function getPriorityColor(priority: Priority): string {
  const style = getComputedStyle(document.documentElement)
  const map: Record<Priority, string> = {
    CRITICAL: style.getPropertyValue("--priority-critical").trim(),
    HIGH: style.getPropertyValue("--priority-high").trim(),
    MEDIUM: style.getPropertyValue("--priority-medium").trim(),
    LOW: style.getPropertyValue("--priority-low").trim(),
  }
  return map[priority] || map.MEDIUM
}

const CATEGORY_LABELS: Record<Category, string> = {
  water: "Water", food: "Food", medical: "Medical",
  shelter: "Shelter", rescue: "Rescue", other: "Other",
}
const PRIORITY_ORDER: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

function createPin(priority: Priority, pulse = false) {
  const color = getPriorityColor(priority)
  const pulseHtml = pulse
    ? `<div style="position:absolute;inset:-4px;border-radius:50%;background:${color};opacity:0.3;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>`
    : ""
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:18px;height:18px;">
      ${pulseHtml}
      <div style="position:absolute;inset:2px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.25);cursor:pointer;"></div>
    </div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

// Panel resize constants
const MIN_PANEL = 52
const MAX_PANEL = 380
const PANEL_COLLAPSE_THRESHOLD = 100

interface MapViewProps {
  onContactPoster?: (target: ConversationTarget) => void
}

export default function MapView({ onContactPoster }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  const { token, user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [filter, setFilter] = useState<FilterType>("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"))
  const [panelOpen, setPanelOpen] = useState(true)
  const [panelWidth, setPanelWidth] = useState(320)
  const [showPostForm, setShowPostForm] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [ownerLoading, setOwnerLoading] = useState(false)

  const panelDragging = useRef(false)
  const panelStartX = useRef(0)
  const panelStartW = useRef(0)

  function handlePanelMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    panelDragging.current = true
    panelStartX.current = e.clientX
    panelStartW.current = panelOpen ? panelWidth : MIN_PANEL
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!panelDragging.current) return
      const delta = e.clientX - panelStartX.current
      const newW = Math.max(MIN_PANEL, Math.min(MAX_PANEL, panelStartW.current + delta))
      if (newW <= PANEL_COLLAPSE_THRESHOLD) {
        setPanelOpen(false)
      } else {
        setPanelOpen(true)
        setPanelWidth(newW)
      }
    }
    function onUp() {
      if (!panelDragging.current) return
      panelDragging.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      setTimeout(() => mapRef.current?.invalidateSize(), 50)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [panelWidth])

  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    )
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  const loadPosts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/posts`)
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        setPosts(data.map(mapApiPost))
      }
    } catch {
      // Backend offline
    }
  }, [])

  useEffect(() => {
    loadPosts()
    const interval = setInterval(loadPosts, 15000)
    return () => clearInterval(interval)
  }, [loadPosts])

  // ── Filtered posts (shared between panel list AND map markers) ──
  const filteredPosts = posts
    .filter((p) => String(p.status).toUpperCase() !== "FULFILLED")
    .filter((p) => {
      if (filter === "NEEDS") return p.type === "need"
      if (filter === "OFFERS") return p.type === "offer"
      return true
    })
    .filter((p) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.locationLabel.toLowerCase().includes(q) ||
        (p.aiSummary && p.aiSummary.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.postedBy?.displayName && p.postedBy.displayName.toLowerCase().includes(q))
      )
    })
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

  // ── Sync markers to filtered posts ──
  const syncMarkers = useCallback(() => {
    if (!mapRef.current) return
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    filteredPosts.forEach((post) => {
      const marker = L.marker(post.location, {
        icon: createPin(post.priority, post.priority === "CRITICAL" && String(post.status) !== "CLAIMED" && String(post.status) !== "FULFILLED"),
      })
        .addTo(mapRef.current!)
        .on("click", () => setSelectedPost(post))
      markersRef.current.push(marker)
    })
  }, [filteredPosts])

  useEffect(() => { syncMarkers() }, [syncMarkers])

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return
    const map = L.map(mapContainerRef.current, {
      center: [49.265, -123.07], zoom: 12, zoomControl: false,
      worldCopyJump: false, maxBounds: [[-85, -180], [85, 180]], maxBoundsViscosity: 1.0,
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

  useEffect(() => {
    if (!mapRef.current) return
    if (tileLayerRef.current) mapRef.current.removeLayer(tileLayerRef.current)
    const url = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
    tileLayerRef.current = L.tileLayer(url, {
      attribution: "&copy; CARTO &copy; OSM", subdomains: "abcd", maxZoom: 19, noWrap: true,
    }).addTo(mapRef.current)
  }, [isDark])

  useEffect(() => {
    if (selectedPost && mapRef.current) {
      mapRef.current.flyTo(selectedPost.location, 14, { duration: 0.9 })
    }
  }, [selectedPost])

  useEffect(() => {
    setTimeout(() => mapRef.current?.invalidateSize(), 200)
  }, [panelOpen, panelWidth])

  async function handleContactPoster(post: Post) {
    if (!onContactPoster || !token) return
    if (post.postedBy && post.postedBy.id !== user?.id) {
      onContactPoster({ recipientId: post.postedBy.id, recipientName: post.postedBy.displayName })
      return
    }
    setOwnerLoading(true)
    try {
      const res = await fetch(`${API}/posts/${post.id}/owner`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error()
      const owner = await res.json()
      if (owner && owner.id !== user?.id) {
        onContactPoster({ recipientId: owner.id, recipientName: owner.displayName })
      }
    } catch { /* ignore */ } finally { setOwnerLoading(false) }
  }

  async function handleClaim(postId: string) {
    setActionLoading(true)
    try {
      const res = await fetch(`${API}/posts/${postId}/claim`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { await loadPosts(); setSelectedPost(null) }
    } finally { setActionLoading(false) }
  }

  const canAct = (status: Status | string) => String(status).toUpperCase() === "OPEN"

  return (
    <div className="flex h-full w-full overflow-hidden bg-background relative">
      {showPostForm && (
        <PostForm
          token={token}
          onClose={() => setShowPostForm(false)}
          onCreated={(post) => { setPosts((prev) => [mapApiPost(post), ...prev]); setShowPostForm(false) }}
        />
      )}

      {/* Left panel */}
      <div
        className="relative flex flex-col border-r border-border bg-card z-10 transition-[width] duration-150 ease-out overflow-hidden shrink-0"
        style={{ width: panelOpen ? panelWidth : 0 }}
      >
        <div className="flex flex-col h-full" style={{ width: panelWidth }}>
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div>
              <p className="text-sm font-semibold text-foreground">Active reports</p>
              <p className="text-xs text-muted-foreground">{filteredPosts.length} listing{filteredPosts.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowPostForm(true)}>
                <Plus className="size-3.5" />Post
              </Button>
              <button onClick={() => setPanelOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
                <ChevronLeft className="size-4" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="px-3 py-2.5 border-b border-border shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reports..."
                className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 px-4 py-2.5 border-b border-border shrink-0">
            {(["ALL", "NEEDS", "OFFERS"] as FilterType[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}`}
              >{f}</button>
            ))}
          </div>

          {/* Priority legend */}
          <div className="flex gap-4 px-4 py-2.5 border-b border-border shrink-0">
            {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as Priority[]).map((p) => (
              <div key={p} className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full shrink-0" style={{ background: `var(--priority-${p.toLowerCase()})` }} />
                <span className="text-xs text-muted-foreground capitalize">{p.toLowerCase()}</span>
              </div>
            ))}
          </div>

          {/* Post list */}
          <div className="flex-1 overflow-y-auto">
            {filteredPosts.length === 0 ? (
              <p className="text-center py-12 text-sm text-muted-foreground">
                {searchQuery ? "No results found" : "No reports found"}
              </p>
            ) : (
              <div className="divide-y divide-border">
                {filteredPosts.map((post) => (
                  <button key={post.id} onClick={() => setSelectedPost(post)}
                    className={`w-full text-left px-4 py-3 transition-colors ${selectedPost?.id === post.id ? "bg-accent/60" : "hover:bg-accent/30"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="size-2.5 rounded-full shrink-0" style={{ background: `var(--priority-${post.priority.toLowerCase()})` }} />
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">{CATEGORY_LABELS[post.category]}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className={`text-xs ${post.type === "need" ? "text-destructive" : "text-primary"}`}>{post.type}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground leading-snug mb-1 line-clamp-2">{post.title}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {post.postedBy && (<><span className="font-medium text-foreground/70">{post.postedBy.displayName}</span><span>·</span></>)}
                      <span>{post.locationLabel}</span><span>·</span><span>{post.timeAgo}</span>
                      {post.photos && post.photos.length > 0 && (<><span>·</span><ImageIcon className="size-3 inline" /><span>{post.photos.length}</span></>)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sidebar-resize-handle" onMouseDown={handlePanelMouseDown}
          onDoubleClick={() => { if (panelOpen) setPanelOpen(false); else { setPanelOpen(true); setPanelWidth(320) } }}
        />
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {!panelOpen && (
          <button onClick={() => { setPanelOpen(true); setPanelWidth(320) }}
            className="absolute top-3 left-3 z-[1000] flex items-center gap-2 rounded-lg border border-border bg-card/95 backdrop-blur-sm px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent transition-colors"
          ><ChevronRight className="size-4" />Reports</button>
        )}
        {!panelOpen && (
          <button onClick={() => setShowPostForm(true)}
            className="absolute top-3 left-[120px] z-[1000] rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium shadow-sm hover:bg-primary/90 transition-colors"
          >+ Post</button>
        )}

        <div ref={mapContainerRef} className="absolute inset-0" />

        {selectedPost && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-[360px] rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full shrink-0" style={{ background: `var(--priority-${selectedPost.priority.toLowerCase()})` }} />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{CATEGORY_LABELS[selectedPost.category]} · {selectedPost.type}</span>
                </div>
                <button onClick={() => setSelectedPost(null)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors">
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
                </button>
              </div>
              <p className="text-sm font-semibold text-foreground leading-snug mb-1.5">{selectedPost.title}</p>
              {selectedPost.aiSummary && <p className="text-sm text-muted-foreground leading-relaxed mb-3">{selectedPost.aiSummary}</p>}
              {/* Photo thumbnails */}
              {selectedPost.photos && selectedPost.photos.length > 0 && (
                <div className="flex gap-1.5 mb-3 overflow-x-auto">
                  {selectedPost.photos.filter((p) => /\.(jpg|jpeg|png|gif|webp)$/i.test(p)).slice(0, 3).map((photo, i) => (
                    <img
                      key={i}
                      src={`${API}${photo}`}
                      alt=""
                      className="size-16 rounded-lg object-cover border border-border shrink-0"
                    />
                  ))}
                  {selectedPost.photos.length > 3 && (
                    <div className="flex size-16 items-center justify-center rounded-lg border border-border bg-muted shrink-0">
                      <span className="text-xs text-muted-foreground font-medium">+{selectedPost.photos.length - 3}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <span>{selectedPost.locationLabel}</span><span>·</span>
                <span>{selectedPost.peopleAffected} {selectedPost.peopleAffected === 1 ? "person" : "people"}</span>
                <span>·</span><span>{selectedPost.timeAgo}</span>
              </div>
              {selectedPost.postedBy && (
                <div className="flex items-center gap-2.5 mb-4 px-3 py-2.5 rounded-lg bg-muted/50">
                  <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground uppercase">{selectedPost.postedBy.displayName.charAt(0)}</div>
                  <span className="text-sm text-foreground font-medium">{selectedPost.postedBy.displayName}</span>
                </div>
              )}
              {canAct(selectedPost.status) && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-9 text-sm gap-1.5" disabled={actionLoading} onClick={() => handleClaim(selectedPost.id)}
                    title="Volunteer to help with this request. The poster will review and approve your offer."
                  >
                    {actionLoading ? <Loader2 className="size-3.5 animate-spin" /> : <><HandHelping className="size-3.5" />I can help</>}
                  </Button>
                  <Button size="sm" className="flex-1 h-9 text-sm gap-2" disabled={ownerLoading} onClick={() => handleContactPoster(selectedPost)}>
                    {ownerLoading ? <Loader2 className="size-3.5 animate-spin" /> : <><MessageCircle className="size-3.5" />Message</>}
                  </Button>
                </div>
              )}
              {String(selectedPost.status).toUpperCase() === "CLAIMED" && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-9 text-sm gap-2" disabled={ownerLoading} onClick={() => handleContactPoster(selectedPost)}>
                    {ownerLoading ? <Loader2 className="size-3.5 animate-spin" /> : <><MessageCircle className="size-3.5" />Message</>}
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
