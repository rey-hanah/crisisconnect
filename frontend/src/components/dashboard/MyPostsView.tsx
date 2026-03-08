import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import PostForm from "@/components/dashboard/PostForm"

const API = "http://localhost:3001"

type Category = "water" | "food" | "medical" | "shelter" | "rescue" | "other"

interface MyPost {
  _id: string
  title: string
  type: "need" | "offer"
  category: Category
  status: string
  urgency: string
  description?: string
  neighborhood?: string
  peopleAffected: number
  aiScore?: number
  aiSummary?: string
  createdAt: string
}

const CATEGORY_LABELS: Record<Category, string> = {
  water: "Water", food: "Food", medical: "Medical",
  shelter: "Shelter", rescue: "Rescue", other: "Other",
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-primary/10 text-primary border-primary/20",
  claimed: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  fulfilled: "bg-muted text-muted-foreground border-border",
}

const URGENCY_STYLES: Record<string, string> = {
  critical: "text-destructive font-bold",
  high: "text-orange-500 font-semibold",
  medium: "text-primary font-medium",
  low: "text-green-500 font-medium",
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function MyPostsView() {
  const { token } = useAuth()
  const [posts, setPosts] = useState<MyPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showPostForm, setShowPostForm] = useState(false)
  const [filter, setFilter] = useState<"all" | "active" | "claimed" | "fulfilled">("all")

  const loadPosts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/posts/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setPosts(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const filteredPosts = posts.filter((p) => filter === "all" || p.status === filter)

  const counts = {
    all: posts.length,
    active: posts.filter((p) => p.status === "active").length,
    claimed: posts.filter((p) => p.status === "claimed").length,
    fulfilled: posts.filter((p) => p.status === "fulfilled").length,
  }

  async function handleFulfill(postId: string) {
    const res = await fetch(`${API}/posts/${postId}/fulfill`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) loadPosts()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-foreground">My Posts</h1>
          <p className="text-sm text-muted-foreground">{posts.length} total post{posts.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" onClick={() => setShowPostForm(true)}>
          + New post
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-6 py-3 border-b border-border shrink-0">
        {(["all", "active", "claimed", "fulfilled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all capitalize ${filter === f
              ? "bg-foreground text-background border-foreground"
              : "bg-transparent text-muted-foreground border-border hover:text-foreground"
              }`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Posts list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <p className="text-sm text-muted-foreground mb-3">
              {filter === "all" ? "You haven't posted anything yet." : `No ${filter} posts.`}
            </p>
            {filter === "all" && (
              <Button size="sm" variant="outline" onClick={() => setShowPostForm(true)}>
                Create your first post
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredPosts.map((post) => (
              <div key={post._id} className="px-6 py-4 hover:bg-accent/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {CATEGORY_LABELS[post.category] ?? post.category}
                      </span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className={`text-[10px] uppercase ${post.type === "need" ? "text-destructive" : "text-primary"}`}>
                        {post.type}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1 leading-snug">{post.title}</p>
                    {post.aiSummary && (
                      <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{post.aiSummary}</p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className={URGENCY_STYLES[post.urgency] ?? ""}>{post.urgency}</span>
                      <span>{post.peopleAffected} {post.peopleAffected === 1 ? "person" : "people"}</span>
                      {post.neighborhood && <span>{post.neighborhood}</span>}
                      <span>{timeAgo(post.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border capitalize ${STATUS_STYLES[post.status] ?? STATUS_STYLES["active"]}`}>
                      {post.status}
                    </span>
                    {post.status === "active" && (
                      <Button size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={() => handleFulfill(post._id)}>
                        Mark fulfilled
                      </Button>
                    )}
                    {post.status === "claimed" && (
                      <Button size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={() => handleFulfill(post._id)}>
                        Mark fulfilled
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Post form modal */}
      {showPostForm && (
        <PostForm
          token={token}
          onClose={() => setShowPostForm(false)}
          onCreated={() => {
            setShowPostForm(false)
            loadPosts()
          }}
        />
      )}
    </div>
  )
}
