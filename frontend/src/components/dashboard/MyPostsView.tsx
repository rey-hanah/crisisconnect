import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import PostForm from "@/components/dashboard/PostForm"
import { Plus, FileText, Check, UserCheck } from "lucide-react"

const API = "http://localhost:3001"

type Category = "water" | "food" | "medical" | "shelter" | "rescue" | "other"

interface ClaimRequest {
  _id: string
  displayName: string
}

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
  claimRequests?: ClaimRequest[]
  createdAt: string
}

const CATEGORY_LABELS: Record<Category, string> = {
  water: "Water", food: "Food", medical: "Medical",
  shelter: "Shelter", rescue: "Rescue", other: "Other",
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function MyPostsView() {
  const { token } = useAuth()
  const [posts, setPosts] = useState<MyPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showPostForm, setShowPostForm] = useState(false)
  const [filter, setFilter] = useState<"all" | "active" | "claimed" | "fulfilled">("all")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

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
    setActionLoading(postId)
    try {
      const res = await fetch(`${API}/posts/${postId}/fulfill`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) loadPosts()
    } finally {
      setActionLoading(null)
    }
  }

  async function handleApproveClaim(postId: string, requesterId: string) {
    setActionLoading(`${postId}-${requesterId}`)
    try {
      const res = await fetch(`${API}/posts/${postId}/approve-claim`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requesterId }),
      })
      if (res.ok) loadPosts()
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter tabs + new post button */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
        <div className="flex gap-1.5">
          {(["all", "active", "claimed", "fulfilled"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-3 py-2 text-sm font-medium rounded-lg transition-colors capitalize
                ${filter === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }
              `}
            >
              {f}{counts[f] > 0 ? ` (${counts[f]})` : ""}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowPostForm(true)} className="h-8 text-sm gap-1.5">
          <Plus className="size-3.5" />
          New post
        </Button>
      </div>

      {/* Posts list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="size-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="flex size-14 items-center justify-center rounded-xl bg-muted mb-4">
              <FileText className="size-6 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <p className="text-base font-medium text-foreground mb-1">
              {filter === "all" ? "No posts yet" : `No ${filter} posts`}
            </p>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-xs">
              {filter === "all"
                ? "Create a post to request or offer help in your area."
                : `You don't have any posts with "${filter}" status.`
              }
            </p>
            {filter === "all" && (
              <Button size="sm" variant="outline" onClick={() => setShowPostForm(true)} className="text-sm h-9 gap-1.5">
                <Plus className="size-3.5" />
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
                    {/* Meta line */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className="size-2 rounded-full shrink-0"
                        style={{ background: `var(--status-${post.status})` }}
                      />
                      <span className="text-xs text-muted-foreground capitalize">{post.status}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[post.category] ?? post.category}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className={`text-xs ${post.type === "need" ? "text-destructive" : "text-primary"}`}>
                        {post.type}
                      </span>
                    </div>
                    {/* Title */}
                    <p className="text-sm font-medium text-foreground leading-snug mb-1">{post.title}</p>
                    {/* Summary */}
                    {(post.aiSummary || post.description) && (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{post.aiSummary || post.description}</p>
                    )}
                    {/* Bottom meta */}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{post.peopleAffected} {post.peopleAffected === 1 ? "person" : "people"}</span>
                      {post.neighborhood && (<><span>·</span><span>{post.neighborhood}</span></>)}
                      <span>·</span>
                      <span>{timeAgo(post.createdAt)}</span>
                    </div>

                    {/* Claim requests (only for active posts) */}
                    {post.status === "active" && post.claimRequests && post.claimRequests.length > 0 && (
                      <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-xs font-medium text-foreground mb-2">
                          Volunteer requests ({post.claimRequests.length})
                        </p>
                        <div className="space-y-2">
                          {post.claimRequests.map((req) => (
                            <div key={req._id} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground uppercase">
                                  {req.displayName?.charAt(0) ?? "?"}
                                </div>
                                <span className="text-sm text-foreground">{req.displayName}</span>
                              </div>
                              <Button
                                size="xs"
                                onClick={() => handleApproveClaim(post._id, req._id)}
                                disabled={actionLoading === `${post._id}-${req._id}`}
                                className="h-7 text-xs gap-1"
                              >
                                <UserCheck className="size-3" />
                                Approve
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {(post.status === "active" || post.status === "claimed") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 px-3 gap-1.5"
                        disabled={actionLoading === post._id}
                        onClick={() => handleFulfill(post._id)}
                      >
                        <Check className="size-3" />
                        Fulfilled
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
