import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Mic, MapPin, Loader2 } from "lucide-react"

const API = "http://localhost:3001"

type Category = "water" | "food" | "medical" | "shelter" | "rescue" | "other"

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "water", label: "Water" },
  { value: "food", label: "Food" },
  { value: "medical", label: "Medical" },
  { value: "shelter", label: "Shelter" },
  { value: "rescue", label: "Rescue" },
  { value: "other", label: "Other" },
]

declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any }
}

interface PostFormProps {
  token: string
  onClose: () => void
  onCreated: (post: any) => void
}

export default function PostForm({ token, onClose, onCreated }: PostFormProps) {
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
  const [locationLabel, setLocationLabel] = useState("")

  function detectLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser")
      return
    }
    setLocating(true)
    setError("")
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude.toFixed(6)
        const longitude = pos.coords.longitude.toFixed(6)
        setLat(latitude)
        setLng(longitude)
        setLocationLabel(`${latitude}, ${longitude}`)
        // Try reverse geocode for a readable name
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          )
          const data = await res.json()
          const place =
            data.address?.suburb ||
            data.address?.neighbourhood ||
            data.address?.city_district ||
            data.address?.city ||
            data.address?.town ||
            ""
          if (place) {
            setLocationLabel(place)
            if (!neighborhood) setNeighborhood(place)
          }
        } catch {
          // Keep coordinate label
        }
        setLocating(false)
      },
      () => {
        setError("Could not get your location. Please allow location access.")
        setLocating(false)
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setError("Voice input is not supported in this browser. Try Chrome.")
      return
    }
    const rec = new SR()
    rec.lang = "en-US"
    rec.interimResults = false
    rec.maxAlternatives = 1
    setListening(true)
    setError("")
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
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (data.title) setTitle(data.title)
        if (data.description) setDescription(data.description)
        if (data.category) setCategory(data.category as Category)
        if (data.peopleAffected) setPeopleAffected(data.peopleAffected)
      } catch {
        // Fallback: just use the transcript as the title
        setTitle(transcript)
      }
    }
    rec.onerror = () => {
      setListening(false)
      setError("Voice recognition failed. Please try again.")
    }
    rec.onend = () => setListening(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!title.trim()) { setError("Please add a title."); return }
    if (!lat || !lng) { setError("Please detect your location first."); return }

    setLoading(true)
    try {
      const res = await fetch(`${API}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type,
          category,
          title: title.trim(),
          description: description.trim(),
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          peopleAffected,
          neighborhood: neighborhood.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to create post")
      onCreated(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="w-full max-w-md mx-4 rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold text-foreground">
            {type === "need" ? "Request help" : "Offer help"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
          <form onSubmit={submit} className="flex flex-col gap-4">
            {/* Type toggle */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {(["need", "offer"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`
                    flex-1 py-2 rounded-md text-[13px] font-medium transition-all capitalize
                    ${type === t
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  {t === "need" ? "I need help" : "I can offer"}
                </button>
              ))}
            </div>

            {/* Voice input */}
            <button
              type="button"
              onClick={startVoice}
              disabled={listening}
              className={`
                w-full flex items-center justify-center gap-2 rounded-lg border py-2.5 text-[13px] font-medium transition-all
                ${listening
                  ? "border-destructive/40 bg-destructive/5 text-destructive"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20"
                }
              `}
            >
              <Mic className={`size-3.5 ${listening ? "animate-pulse" : ""}`} />
              {listening ? "Listening... speak now" : "Describe with voice"}
            </button>

            {/* Category */}
            <div>
              <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`
                      px-3 py-1.5 rounded-md text-[12px] font-medium border transition-all
                      ${category === c.value
                        ? "border-foreground/20 bg-foreground text-background"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
                      }
                    `}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Title</label>
              <input
                type="text"
                placeholder="e.g. Family of 4 needs clean water"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={120}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Details <span className="text-muted-foreground/50">(optional)</span></label>
              <textarea
                placeholder="Any additional context..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow resize-none"
              />
            </div>

            {/* People affected */}
            <div>
              <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">
                {type === "need" ? "People who need help" : "People you can help"}
              </label>
              <input
                type="number"
                min={1}
                max={10000}
                value={peopleAffected}
                onChange={(e) => setPeopleAffected(parseInt(e.target.value) || 1)}
                className="h-9 w-24 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Location</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={locating}
                  className={`
                    flex-1 flex items-center justify-center gap-2 h-9 rounded-lg border text-[13px] font-medium transition-all
                    ${lat && lng
                      ? "border-primary/30 bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
                    }
                  `}
                >
                  {locating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <MapPin className="size-3.5" />
                  )}
                  {locating
                    ? "Detecting..."
                    : lat && lng
                      ? locationLabel || "Location set"
                      : "Use my location"
                  }
                </button>
              </div>
              {/* Neighborhood override */}
              <input
                type="text"
                placeholder="Neighborhood (e.g. Kitsilano)"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="mt-2 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2">
                <p className="text-[12px] text-destructive font-medium">{error}</p>
              </div>
            )}

            {/* Submit */}
            <Button type="submit" disabled={loading} className="w-full h-9 text-[13px]">
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Posting...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
