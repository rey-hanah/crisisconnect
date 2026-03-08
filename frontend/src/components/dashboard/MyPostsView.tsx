import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import PostForm from "@/components/dashboard/PostForm"
import { Plus, FileText } from "lucide-react"

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

const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-500",
  claimed: "bg-amber-500",
  fulfilled: "bg-muted-foreground/40",
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

  useEffect(() => { loadPosts() }, [loadPosts])

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
      {/* Filter tabs + new post button */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
        <div className="flex gap-1">
          {(["all", "active", "claimed", "fulfilled"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-2.5 py-1.5 text-[12px] font-medium rounded-md transition-colors capitalize
                ${filter === f
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }
              `}
            >
              {f}{counts[f] > 0 ? ` (${counts[f]})` : ""}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowPostForm(true)} className="h-7 text-[12px] gap-1.5">
          <Plus className="size-3" />
          New post
        </Button>
      </div>

      {/* Posts list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="size-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted mb-4">
              <FileText className="size-5 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <p className="text-[14px] font-medium text-foreground mb-1">
              {filter === "all" ? "No posts yet" : `No ${filter} posts`}
            </p>
            <p className="text-[13px] text-muted-foreground mb-4 text-center max-w-xs">
              {filter === "all"
                ? "Create a post to request or offer help in your area."
                : `You don't have any posts with "${filter}" status.`
              }
            </p>
            {filter === "all" && (
              <Button size="sm" variant="outline" onClick={() => setShowPostForm(true)} className="text-[12px] h-8 gap-1.5">
                <Plus className="size-3" />
                Create your first post
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredPosts.map((post) => (
              <div key={post._id} className="px-5 py-3.5 hover:bg-accent/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {/* Meta line */}
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`size-1.5 rounded-full shrink-0 ${STATUS_DOT[post.status] ?? STATUS_DOT["active"]}`} />
                      <span className="text-[11px] text-muted-foreground capitalize">{post.status}</span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground">{CATEGORY_LABELS[post.category] ?? post.category}</span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className={`text-[11px] ${post.type === "need" ? "text-destructive" : "text-primary"}`}>
                        {post.type}
                      </span>
                    </div>
                    {/* Title */}
                    <p className="text-[13px] font-medium text-foreground leading-snug mb-0.5">{post.title}</p>
                    {/* Summary */}
                    {post.aiSummary && (
                      <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">{post.aiSummary}</p>
                    )}
                    {/* Bottom meta */}
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                      <span>{post.peopleAffected} {post.peopleAffected === 1 ? "person" : "people"}</span>
                      {post.neighborhood && (
                        <>
                          <span>·</span>
                          <span>{post.neighborhood}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>{timeAgo(post.createdAt)}</span>
                    </div>
                  </div>
                  {/* Actions */}
                  {(post.status === "active" || post.status === "claimed") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[11px] h-7 px-2.5 shrink-0"
                      onClick={() => handleFulfill(post._id)}
                    >
                      Mark fulfilled
                    </Button>
                  )}
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
