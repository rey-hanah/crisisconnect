# Map Design

The map is the entire app. There is no separate feed or card grid — everything happens on or from the map.

---

## Core Concept

```
Zoomed out  →  heatmap (density of crisis reports per area)
Zoomed in   →  individual colored dots (one per post)
Tap a dot   →  slide-up detail sheet
Search bar  →  filter what dots are shown
```

This is the only view. No tabs. No card grid. Map fills the screen.

---

## 1. Heatmap Layer (zoomed out, zoom < 13)

When the user is looking at a city or region level, individual posts collapse into a heatmap.

- **Intensity** = number of open crisis reports in that area
- **Color gradient:** `blue → green → yellow → orange → red`
  - Red = dense cluster of unresponded crises
  - Blue/green = sparse or mostly resolved
- No personal data shown at this level — just density
- Gives first responders an instant read on where to go

**Library:** `leaflet.heat`

```ts
// HeatLayer.tsx
import L from 'leaflet'
import 'leaflet.heat'
import { useMap } from 'react-leaflet'
import { useEffect } from 'react'

interface Props {
  points: [number, number, number][] // [lat, lng, intensity]
}

export function HeatLayer({ points }: Props) {
  const map = useMap()

  useEffect(() => {
    // @ts-ignore — leaflet.heat has no official types
    const heat = L.heatLayer(points, {
      radius: 35,
      blur: 25,
      maxZoom: 13,
      gradient: { 0.2: 'blue', 0.4: 'lime', 0.6: 'yellow', 0.8: 'orange', 1.0: 'red' }
    }).addTo(map)

    return () => { map.removeLayer(heat) }
  }, [points, map])

  return null
}
```

---

## 2. Dot Layer (zoomed in, zoom >= 13)

Once the user zooms in past the threshold, heatmap fades and individual pins appear.

### Dot colors (by AI priority)

| Priority | Color | Hex |
|----------|-------|-----|
| Critical | Red | `#C0392B` |
| High | Orange | `#E67E22` |
| Medium | Yellow | `#F1C40F` |
| Offer | Blue | `#2980B9` |
| Fulfilled | Gray | `#95A5A6` |

### Dot size

- Default: 14px radius circle marker
- Hovered / selected: 20px, with white border
- Pulsing animation on `CRITICAL` posts (CSS keyframe)

```ts
// DotLayer.tsx
import { CircleMarker, Tooltip } from 'react-leaflet'

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#C0392B',
  high:     '#E67E22',
  medium:   '#F1C40F',
  offer:    '#2980B9',
  fulfilled:'#95A5A6',
}

export function DotLayer({ posts, onSelect }) {
  return posts.map(post => (
    <CircleMarker
      key={post._id}
      center={[post.location.coordinates[1], post.location.coordinates[0]]}
      radius={14}
      pathOptions={{
        color: '#fff',
        weight: 2,
        fillColor: PRIORITY_COLOR[post.aiPriority] ?? '#999',
        fillOpacity: 0.9,
      }}
      eventHandlers={{ click: () => onSelect(post) }}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
        {post.aiSummary}
      </Tooltip>
    </CircleMarker>
  ))
}
```

---

## 3. Zoom Toggle Logic

```ts
// MapView.tsx
const ZOOM_THRESHOLD = Number(import.meta.env.VITE_ZOOM_THRESHOLD) || 13

const [zoom, setZoom] = useState(MAP_DEFAULT_ZOOM)
const showHeat = zoom < ZOOM_THRESHOLD
const showDots = zoom >= ZOOM_THRESHOLD

// In JSX:
{showHeat && <HeatLayer points={heatPoints} />}
{showDots && <DotLayer posts={posts} onSelect={setSelected} />}
```

---

## 4. Tap a Dot → Detail Sheet

Tapping any dot opens a **bottom sheet** (ShadCN `Sheet` component, slides up from bottom).

### What the sheet shows

```
┌─────────────────────────────────┐
│  🔴 CRITICAL  ·  Water  ·  14m  │
│                                 │
│  "Family of 5 with no water     │
│   for 2 days — baby at home"    │
│                                 │
│  📍 East Vancouver              │
│  👤 Posted by anonymous_user_42 │
│  👥 5 people affected           │
│                                 │
│  AI Summary:                    │
│  Family urgently needs water.   │
│                                 │
│  ─────────────────────────────  │
│  [ 💬 Message them ]            │
│  [ ✓ Mark as Fulfilled ]        │  ← only shown to post author
└─────────────────────────────────┘
```

- **No phone number shown**
- **No email shown**
- "Message them" opens the in-app chat
- If this is the viewer's own post, they see "Mark as Fulfilled" instead

---

## 5. Search Bar

A persistent search bar sits at the top of the map (semi-transparent, overlaid on the map).

### What search does

1. **Text search** — matches against post title + description
2. **Category filter** — pill buttons: `All` `Water` `Food` `Medical` `Shelter` `Rescue` `Offers`
3. **AI-powered natural language** — user types "water near me" or "medical urgent" → AI interprets and filters (see `docs/AI.md`)

### Search bar behavior

- Typing instantly filters visible dots on the map (client-side filter on cached posts)
- For natural language queries, debounce 500ms then call AI search endpoint
- Clear button resets to all posts
- Filter state persists while navigating

```ts
// SearchBar.tsx — simplified
const [query, setQuery] = useState('')
const [category, setCategory] = useState<string | null>(null)

const filtered = useMemo(() => {
  return posts.filter(p => {
    const matchesText = !query || 
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.description.toLowerCase().includes(query.toLowerCase())
    const matchesCat = !category || p.category === category
    return matchesText && matchesCat
  })
}, [posts, query, category])
```

---

## 6. Locate Me Button

Bottom-right corner. Taps the browser geolocation API and flies the map to the user's location, then shows only posts within their response radius as active dots. Posts outside radius are dimmed (lower opacity) but still visible.

---

## 7. Post a Pin

Floating `+` button, bottom-right. Opens the post submission form as a full-screen modal or page.

After submission → map re-renders with the new dot at the submitted location, immediately pulsing.
