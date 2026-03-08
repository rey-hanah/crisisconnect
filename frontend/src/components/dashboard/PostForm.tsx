import { useState } from "react"
import { Button } from "@/components/ui/button"

const API = "http://localhost:3001"

type Category = "water" | "food" | "medical" | "shelter" | "rescue" | "other"

const CATEGORY_LABELS: Record<Category, string> = {
  water: "Water", food: "Food", medical: "Medical",
  shelter: "Shelter", rescue: "Rescue", other: "Other",
}

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
      onCreated(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background transition-colors"

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md mx-4 rounded-xl border border-border bg-background p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-foreground">Post a Request</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </div>

        {/* Voice button */}
        <button
          type="button"
          onClick={startVoice}
          disabled={listening}
          className={`w-full mb-4 flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold transition-all ${listening ? "border-destructive/50 bg-destructive/10 text-destructive animate-pulse" : "border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-accent"}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
          </svg>
          {listening ? "Listening... speak now" : "Speak your request (AI will fill the form)"}
        </button>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {/* Type toggle */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {(["need", "offer"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${type === t ? (t === "need" ? "bg-destructive/15 text-destructive shadow-sm" : "bg-primary/15 text-primary shadow-sm") : "text-muted-foreground"}`}>
                {t === "need" ? "I need help" : "I can offer"}
              </button>
            ))}
          </div>

          <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className={inputCls}>
            {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          <input type="text" placeholder="Brief title (e.g. Family needs water)" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} className={inputCls} />

          <textarea placeholder="More details (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inputCls} h-auto py-2`} />

          <div className="flex gap-2 items-center">
            <label className="text-xs text-muted-foreground whitespace-nowrap">People affected:</label>
            <input type="number" min={1} max={1000} value={peopleAffected} onChange={(e) => setPeopleAffected(parseInt(e.target.value))} className={`${inputCls} w-20`} />
          </div>

          <input type="text" placeholder="Neighborhood (e.g. Kitsilano)" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className={inputCls} />

          <div className="flex gap-2">
            <input type="text" placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} required className={`${inputCls} flex-1`} />
            <input type="text" placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} required className={`${inputCls} flex-1`} />
            <button type="button" onClick={getLocation} disabled={locating}
              className="shrink-0 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              {locating ? "..." : "GPS"}
            </button>
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full h-10">
            {loading ? "Posting..." : "Submit post"}
          </Button>
        </form>
      </div>
    </div>
  )
}
