# Architecture

## System Overview

```
┌─────────────────────────────────────────────┐
│                   CLIENT                     │
│         React + Vite + TypeScript            │
│                                             │
│  MapPage (default)                          │
│  ├── HeatLayer (zoom < 13)                  │
│  ├── DotLayer (zoom >= 13)                  │
│  ├── SearchBar (overlaid)                   │
│  ├── PostDetailSheet (tap a dot)            │
│  └── ChatSheet (message button)             │
└──────────────┬──────────────────────────────┘
               │  REST + WebSocket
┌──────────────▼──────────────────────────────┐
│                    API                       │
│           NestJS + TypeScript                │
│                                             │
│  /auth      JWT signup/login                │
│  /posts     CRUD + geo queries              │
│  /chat      WebSocket gateway               │
│  /ai        Triage, search, briefing        │
│  /users     Profile                         │
└──────────────┬──────────────────────────────┘
               │  Mongoose
┌──────────────▼──────────────────────────────┐
│              MongoDB Atlas                   │
│   users · posts · conversations · messages  │
└─────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│             Claude API                       │
│  Triage scoring · Search parsing ·          │
│  Chat safety · Crisis briefing              │
└─────────────────────────────────────────────┘
```

---

## Key Design Decisions

### No roles
Everyone is the same type of user. You can post a need or an offer — same form. This removes all role-gating logic and makes onboarding a single page.

### Map is the only view
No separate card grid or feed. The map is the home screen. Detail lives in a bottom sheet on tap. This is simpler to build and more intuitive for a crisis.

### Privacy by default
- Phone numbers and emails collected at signup are for **login only**
- Never surfaced in the UI to other users
- All coordination goes through in-app chat
- Post location stored as coordinates — shown to users as neighborhood name only (reverse geocode)

### AI is async
Posting never waits for AI scoring. The post goes live immediately, the dot appears on the map, and the priority badge updates 1–2 seconds later. This keeps the UX fast even if the AI call takes time.

### Realtime via Socket.io
- New posts emit a `post:created` event — all connected clients add the dot to their map instantly
- Chat messages emit `message:new` per conversation room
- Score updates emit `post:updated` when the cron re-scores

---

## API Endpoints

### Auth
```
POST /auth/signup    { email?, phone?, password, displayName, country, radius }
POST /auth/login     { email?, phone?, password }
```

### Posts
```
GET  /posts          ?lat=&lng=&radius=&category=&type=&priority=
POST /posts          { type, category, title, description, photos, location, peopleAffected, urgency }
GET  /posts/:id
PATCH /posts/:id/claim
PATCH /posts/:id/fulfill
```

### AI
```
POST /ai/search      { query: string } → SearchFilter
POST /ai/briefing    { postIds: string[] } → string
```

### Chat
```
GET  /chat                        → list of conversations for current user
POST /chat                        { postId, recipientId } → new conversation
GET  /chat/:conversationId        → messages
WebSocket: join room, send message, receive message
```

---

## Data Flow — Post Submission

```
User fills form
     ↓
POST /posts (client → api)
     ↓
Post saved to MongoDB (status: open, aiScore: 50 default)
     ↓
Response 201 sent to client immediately
     ↓  (async, non-blocking)
ai.service.scorePost(post)
     ↓
Claude API returns score + summary
     ↓
MongoDB updated with aiScore, aiPriority, aiSummary
     ↓
Socket.io emits post:updated
     ↓
All clients update the dot color on their map
```

---

## Deployment

| Service | Where |
|---------|-------|
| Frontend | Vercel (free tier) |
| Backend | Railway or Render (free tier) |
| Database | MongoDB Atlas (free tier — 512MB) |
| AI | Anthropic API (pay per use — ~$0.10 for the demo) |

Both client and api can be deployed in under 10 minutes each.
