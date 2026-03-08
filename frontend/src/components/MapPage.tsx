import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
type Status = "OPEN" | "CLAIMED" | "FULFILLED"
type Category = "Water" | "Food" | "Medical" | "Shelter" | "Rescue" | "Other"
type FilterType = "ALL" | "NEEDS" | "OFFERS"

interface Post {
  id: string
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
}

const SEED_POSTS: Post[] = [
  { id: "1", title: "Family of 4 — no clean water for 3 days", category: "Water", priority: "CRITICAL", status: "OPEN", location: [49.2827, -123.1207], locationLabel: "East Vancouver", peopleAffected: 4, timeAgo: "14 min ago", hoursUnresponded: 72, aiSummary: "Family including elderly grandmother without water for 3 days — urgent.", type: "need" },
  { id: "2", title: "Elderly man needs medication pickup", category: "Medical", priority: "HIGH", status: "OPEN", location: [49.2488, -123.1389], locationLabel: "Kitsilano", peopleAffected: 1, timeAgo: "1 hr ago", aiSummary: "Elderly resident unable to collect prescription — mobility limited.", type: "need" },
  { id: "3", title: "Hot meals available — 50 portions", category: "Food", priority: "LOW", status: "OPEN", location: [49.2606, -123.1138], locationLabel: "Mount Pleasant", peopleAffected: 50, timeAgo: "2 hrs ago", aiSummary: "Provider offering 50 hot meal portions from community kitchen.", type: "offer" },
  { id: "4", title: "Roof collapse — 2 families displaced", category: "Shelter", priority: "CRITICAL", status: "CLAIMED", location: [49.2945, -123.0878], locationLabel: "Burnaby", peopleAffected: 8, timeAgo: "3 hrs ago", aiSummary: "Two families displaced after partial roof collapse — need temporary shelter.", type: "need" },
  { id: "5", title: "Flood rescue needed — ground floor", category: "Rescue", priority: "CRITICAL", status: "OPEN", location: [49.2204, -123.1362], locationLabel: "Richmond", peopleAffected: 3, timeAgo: "6 min ago", hoursUnresponded: 0.1, aiSummary: "Three people stranded in ground floor apartment due to flooding.", type: "need" },
  { id: "6", title: "Water bottles — 200 units available", category: "Water", priority: "MEDIUM", status: "OPEN", location: [49.2575, -123.005], locationLabel: "New Westminster", peopleAffected: 200, timeAgo: "45 min ago", aiSummary: "200 sealed water bottles available for pickup at community depot.", type: "offer" },
]

const PRIORITY_PIN_COLORS: Record<Priority, string> = {
  CRITICAL: "oklch(0.612 0.208 22.241)",
  HIGH:     "oklch(0.560 0.12 45)",
  MEDIUM:   "oklch(0.560 0.078 237.982)",
  LOW:      "oklch(0.636 0.049 199)",
}

// Text color classes for priority — no badges, just colored text
const PRIORITY_TEXT: Record<Priority, string> = {
  CRITICAL: "text-destructive font-bold",
  HIGH:     "text-orange-500 font-bold",
  MEDIUM:   "text-primary font-bold",
  LOW:      "text-green-500 font-bold",
}

const STATUS_BADGE: Record<Status, string> = {
  OPEN:      "bg-primary/10 text-primary border-primary/20",
  CLAIMED:   "bg-chart-1/10 text-chart-1 border-chart-1/20",
  FULFILLED: "bg-muted text-muted-foreground border-border",
}

const PRIORITY_ORDER: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

function createPin(priority: Priority) {
  const color = PRIORITY_PIN_COLORS[priority]
  return L.divIcon({
    className: "",
    html: `<div style="
      width:16px;height:16px;
      background:${color};
      border:2px solid var(--background);
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 1px 6px rgba(0,0,0,0.2);
      cursor:pointer;
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 16],
  })
}

// ─── Post Card — new clean layout ────────────────────────────────────────────
function PostCard({ post, selected, onClick }: { post: Post; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`
        cursor-pointer rounded-lg border px-3 py-2.5 transition-all duration-150
        ${selected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/30 hover:bg-accent/30"
        }
      `}
    >
      {/* Category label */}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
        {post.category}
      </p>

      {/* Title */}
      <p className="text-sm font-semibold text-card-foreground leading-snug mb-1">
        {post.title}
      </p>

      {/* Priority — plain colored text, no badge */}
      <p className={`text-xs mb-1 ${PRIORITY_TEXT[post.priority]}`}>
        {post.priority}
      </p>

      {/* AI summary */}
      <p className="text-xs text-muted-foreground leading-snug mb-2">
        {post.aiSummary}
      </p>

      {/* Footer meta */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {post.locationLabel} · {post.timeAgo}
        </span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${STATUS_BADGE[post.status]}`}>
          {post.status}
        </span>
      </div>

      {/* Unresponded warning */}
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
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [filter, setFilter] = useState<FilterType>("ALL")
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"))
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    )
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

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

    SEED_POSTS.forEach((post) => {
      L.marker(post.location, { icon: createPin(post.priority) })
        .addTo(map)
        .on("click", () => setSelectedPost(post))
    })

    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Swap tiles on theme
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

  const filteredPosts = [...SEED_POSTS]
    .filter((p) => {
      if (filter === "NEEDS") return p.type === "need"
      if (filter === "OFFERS") return p.type === "offer"
      return true
    })
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

  return (
    <div className="flex h-[calc(100vh-56px)] w-full overflow-hidden bg-background">

      {/* ════ LEFT SIDEBAR ════ */}
      <div
        className={`
          flex flex-col border-r border-border bg-sidebar z-10 shadow-sm
          transition-all duration-300 overflow-hidden
          ${sidebarOpen ? "w-[320px]" : "w-0"}
        `}
      >
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
              aria-label="Close sidebar"
            >
              {/* Left-pointing chevron */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11L5 7l4-4" />
              </svg>
            </button>
          </div>

          {/* Filter pills */}
          <div className="flex gap-1.5 px-3 py-2.5 border-b border-border shrink-0">
            {(["ALL", "NEEDS", "OFFERS"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`
                  flex-1 text-xs font-bold py-1.5 rounded-lg border transition-all
                  ${filter === f
                    ? f === "NEEDS"
                      ? "bg-destructive/15 text-destructive border-destructive/30"
                      : f === "OFFERS"
                        ? "bg-primary/15 text-primary border-primary/30"
                        : "bg-foreground text-background border-foreground"
                    : "bg-transparent text-muted-foreground border-border hover:text-foreground"
                  }
                `}
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

        {/* Sidebar open button — shown when closed */}
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

        <div ref={mapContainerRef} className="absolute inset-0" />

        {/* Selected post popup */}
        {selectedPost && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[300px] rounded-xl border border-border p-4 shadow-xl backdrop-blur-md bg-card/95">
            <div className="flex items-start justify-between mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {selectedPost.category}
              </p>
              <button
                onClick={() => setSelectedPost(null)}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                ✕
              </button>
            </div>
            <p className="font-bold text-sm text-card-foreground mb-0.5">{selectedPost.title}</p>
            <p className={`text-xs mb-1.5 ${PRIORITY_TEXT[selectedPost.priority]}`}>{selectedPost.priority}</p>
            <p className="text-xs text-muted-foreground mb-2">{selectedPost.aiSummary}</p>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">{selectedPost.locationLabel} · {selectedPost.peopleAffected} people</span>
              <span className={`font-semibold px-1.5 py-0.5 rounded border ${STATUS_BADGE[selectedPost.status]}`}>
                {selectedPost.status}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
