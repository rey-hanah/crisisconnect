import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type Status = "OPEN" | "CLAIMED" | "FULFILLED";
type Category = "Water" | "Food" | "Medical" | "Shelter" | "Rescue" | "Other";

interface Post {
  id: string;
  title: string;
  category: Category;
  priority: Priority;
  status: Status;
  location: [number, number];
  locationLabel: string;
  peopleAffected: number;
  postedBy: string;
  timeAgo: string;
  hoursUnresponded?: number;
  aiSummary: string;
}

const SEED_POSTS: Post[] = [
  { id: "1", title: "Family of 4 — no clean water for 3 days", category: "Water", priority: "CRITICAL", status: "OPEN", location: [49.2827, -123.1207], locationLabel: "East Vancouver", peopleAffected: 4, postedBy: "anonymous_helper", timeAgo: "14 min ago", hoursUnresponded: 72, aiSummary: "Family including elderly grandmother without water for 3 days — urgent." },
  { id: "2", title: "Elderly man needs medication pickup", category: "Medical", priority: "HIGH", status: "OPEN", location: [49.2488, -123.1389], locationLabel: "Kitsilano", peopleAffected: 1, postedBy: "care_volunteer", timeAgo: "1 hr ago", aiSummary: "Elderly resident unable to collect prescription — mobility limited." },
  { id: "3", title: "Hot meals available — 50 portions", category: "Food", priority: "LOW", status: "OPEN", location: [49.2606, -123.1138], locationLabel: "Mount Pleasant", peopleAffected: 50, postedBy: "Red Cross Calgary", timeAgo: "2 hrs ago", aiSummary: "Provider offering 50 hot meal portions from community kitchen." },
  { id: "4", title: "Roof collapse — 2 families displaced", category: "Shelter", priority: "CRITICAL", status: "CLAIMED", location: [49.2945, -123.0878], locationLabel: "Burnaby", peopleAffected: 8, postedBy: "first_on_scene", timeAgo: "3 hrs ago", aiSummary: "Two families displaced after partial roof collapse — need temporary shelter." },
  { id: "5", title: "Flood rescue needed — ground floor", category: "Rescue", priority: "CRITICAL", status: "OPEN", location: [49.2204, -123.1362], locationLabel: "Richmond", peopleAffected: 3, postedBy: "neighbor_report", timeAgo: "6 min ago", hoursUnresponded: 0.1, aiSummary: "Three people stranded in ground floor apartment due to flooding." },
  { id: "6", title: "Water bottles available — 200 units", category: "Water", priority: "MEDIUM", status: "OPEN", location: [49.2575, -123.005], locationLabel: "New Westminster", peopleAffected: 200, postedBy: "local_depot", timeAgo: "45 min ago", aiSummary: "200 sealed water bottles available for pickup at community depot." },
];

const PRIORITY_COLORS: Record<Priority, string> = { CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#eab308", LOW: "#22c55e" };
const PRIORITY_BG: Record<Priority, string> = { CRITICAL: "bg-red-500/15 text-red-400 border-red-500/30", HIGH: "bg-orange-500/15 text-orange-400 border-orange-500/30", MEDIUM: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", LOW: "bg-green-500/15 text-green-400 border-green-500/30" };
const CATEGORY_ICONS: Record<Category, string> = { Water: "💧", Food: "🍱", Medical: "🏥", Shelter: "🏠", Rescue: "🚨", Other: "📋" };
const STATUS_STYLES: Record<Status, string> = { OPEN: "bg-blue-500/15 text-blue-400 border-blue-500/30", CLAIMED: "bg-purple-500/15 text-purple-400 border-purple-500/30", FULFILLED: "bg-gray-500/15 text-gray-400 border-gray-500/30" };

function createPin(priority: Priority) {
  const color = PRIORITY_COLORS[priority];
  return L.divIcon({
    className: "",
    html: `<div style="width:20px;height:20px;background:${color};border:2.5px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px ${color}99;"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 20],
  });
}

type FilterType = "ALL" | "NEEDS" | "OFFERS";

export default function MapPage() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, { center: [49.265, -123.07], zoom: 12, zoomControl: false });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { attribution: '&copy; CARTO', subdomains: "abcd", maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    SEED_POSTS.forEach((post) => {
      L.marker(post.location, { icon: createPin(post.priority) }).addTo(map).on("click", () => { setSelectedPost(post); setDrawerOpen(true); });
    });
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.eachLayer((layer) => { if (layer instanceof L.TileLayer) mapRef.current!.removeLayer(layer); });
    const url = isDark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    L.tileLayer(url, { attribution: '&copy; CARTO', subdomains: "abcd", maxZoom: 19 }).addTo(mapRef.current);
  }, [isDark]);

  const filteredPosts = SEED_POSTS.sort((a, b) => ({ CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }[a.priority] - { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }[b.priority]));

  function flyToPost(post: Post) {
    mapRef.current?.flyTo(post.location, 14, { duration: 0.8 });
    setSelectedPost(post);
    setDrawerOpen(true);
  }

  const base = isDark ? "bg-zinc-900/90 border-zinc-800 text-white" : "bg-white/90 border-zinc-200 text-zinc-900";

  return (
    <div className="relative w-full h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className={`absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-4 py-2 border-b backdrop-blur-md ${base}`}>
        <div className="flex items-center gap-2">
          <span className="text-red-500 font-black text-lg tracking-tighter">CRISIS</span>
          <span className="font-black text-lg tracking-tighter">CONNECT</span>
          <span className="ml-2 text-xs px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/30 font-medium">LIVE</span>
        </div>
        <div className={`flex gap-1 rounded-full p-1 ${isDark ? "bg-zinc-800" : "bg-zinc-100"}`}>
          {(["ALL", "NEEDS", "OFFERS"] as FilterType[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${filter === f ? isDark ? "bg-zinc-600 text-white" : "bg-white text-zinc-900 shadow-sm" : isDark ? "text-zinc-400" : "text-zinc-500"}`}>{f}</button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {/* Legend */}
      <div className={`absolute top-16 left-4 z-[999] flex flex-col gap-1.5 p-3 rounded-xl border backdrop-blur-md text-xs ${base}`}>
        {(Object.entries(PRIORITY_COLORS) as [Priority, string][]).map(([p, color]) => (
          <div key={p} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            <span className={isDark ? "text-zinc-300" : "text-zinc-600"}>{p}</span>
          </div>
        ))}
      </div>

      {/* Bottom drawer */}
      <div className={`absolute bottom-0 left-0 right-0 z-[1000] transition-all duration-300 border-t backdrop-blur-md ${base} ${drawerOpen ? "h-[42%]" : "h-[120px]"}`}>
        <div className="flex items-center justify-center pt-2 pb-1 cursor-pointer" onClick={() => setDrawerOpen((o) => !o)}>
          <div className={`w-8 h-1 rounded-full ${isDark ? "bg-zinc-600" : "bg-zinc-300"}`} />
        </div>
        <div className="px-4 pb-2 flex items-center justify-between">
          <span className={`text-xs font-bold tracking-widest uppercase ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Nearby · Priority Order</span>
          {selectedPost && <button onClick={() => setSelectedPost(null)} className="text-xs text-zinc-500">clear ×</button>}
        </div>
        <div className="overflow-x-auto px-4 pb-4">
          <div className="flex gap-3" style={{ width: "max-content" }}>
            {filteredPosts.map((post) => (
              <div key={post.id} onClick={() => flyToPost(post)} className={`cursor-pointer rounded-xl border p-3 transition-all hover:scale-[1.02] ${selectedPost?.id === post.id ? isDark ? "border-white/30 bg-white/10" : "border-zinc-900/30 bg-zinc-900/5" : isDark ? "border-zinc-800 bg-zinc-800/60" : "border-zinc-200 bg-zinc-50"}`} style={{ width: "260px", flexShrink: 0 }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>{CATEGORY_ICONS[post.category]} {post.category}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_BG[post.priority]}`}>{post.priority}</span>
                </div>
                <p className="text-sm font-semibold leading-snug mb-1.5">{post.title}</p>
                <p className={`text-xs leading-snug mb-2 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>{post.aiSummary}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>📍 {post.locationLabel} · {post.peopleAffected}p</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${STATUS_STYLES[post.status]}`}>{post.status}</span>
                </div>
                {post.hoursUnresponded && post.hoursUnresponded > 1 && (
                  <div className="mt-2 text-[10px] font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-md px-2 py-1">⚠ No response · {Math.round(post.hoursUnresponded)}h</div>
                )}
                <div className={`mt-2 text-[9px] ${isDark ? "text-zinc-600" : "text-zinc-300"}`}>✦ Priority scored by AI</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}