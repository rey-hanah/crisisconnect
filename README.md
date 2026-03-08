# CrisisConnect

<p align="center">
  <img src="/logo/logo.svg" alt="CrisisConnect" width="80" />
</p>

<p align="center">
  <strong>Community-Powered Crisis Response Platform</strong>
</p>

<p align="center">
  A real-time crisis management platform enabling communities to report needs, offer help, and coordinate relief efforts during emergencies.
</p>

---

## Overview

CrisisConnect bridges the gap between those in need and those willing to help during critical situations. The platform provides:

- **Real-time Map Interface** — Visualize active requests and offers geographically
- **AI-Powered Intelligence** — Automatic urgency scoring and crisis briefings
- **Instant Messaging** — Direct communication between responders and requesters
- **Voice Input** — Describe needs hands-free with AI transcription
- **File Attachments** — Share photos and documents for better situational awareness

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT (React + Vite)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Sidebar   │  │  MapView    │  │ MyPostsView │  │  ChatView   │     │
│  │  Navigation │  │  + PostList  │  │   (Claims)  │  │  Inbox DM   │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                 │                 │                 │             │
│         └─────────────────┴────────┬────────┴─────────────────┘             │
│                                    │                                       │
│                           ┌────────▼────────┐                             │
│                           │  AuthContext    │                             │
│                           │  (JWT + Socket) │                             │
│                           └────────┬────────┘                             │
└────────────────────────────────────┼───────────────────────────────────────┘
                                     │ HTTP + WebSocket
┌────────────────────────────────────┼───────────────────────────────────────┐
│                                    │              SERVER (NestJS)         │
│                           ┌────────▼────────┐                             │
│                           │   AuthModule    │                             │
│                           │ (JWT Strategy)  │                             │
│                           └────────┬────────┘                             │
│                                    │                                       │
│         ┌──────────────────────────┼──────────────────────────┐          │
│         │                          │                          │          │
│  ┌──────▼──────┐          ┌──────▼──────┐          ┌───────▼──────┐   │
│  │  PostsModule │          │  ChatModule │          │   AiModule   │   │
│  │              │          │              │          │              │   │
│  │ • CRUD       │          │ • WebSocket │          │ • Scoring    │   │
│  │ • GeoSpatial│          │ • Messages  │          │ • Transcribe │   │
│  │ • Claims    │          │ • Convos    │          │ • Briefing   │   │
│  │ • Upload    │          │              │          │              │   │
│  └─────────────┘          └──────────────┘          └──────────────┘   │
│                                    │                                       │
│                           ┌────────▼────────┐                             │
│                           │    MongoDB      │                             │
│                           │   (Atlas)       │                             │
│                           └─────────────────┘                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS |
| **Backend** | NestJS, TypeScript, Socket.io |
| **Database** | MongoDB Atlas (Mongoose ODM) |
| **Authentication** | JWT (Passport.js) |
| **AI/ML** | Google Gemini 2.0 Flash |
| **Maps** | Leaflet + CARTO Basemaps |
| **Real-time** | Socket.io (WebSocket) |

---

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB Atlas account
- Google Gemini API key

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/crisis-connect.git
cd crisis-connect

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Setup

Create `backend/.env`:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/crisisconnect
JWT_SECRET=your-super-secret-jwt-key-change-in-production
GEMINI_API_KEY=your-google-gemini-api-key
PORT=3001
```

### Running the Application

```bash
# Terminal 1: Start backend (from /backend)
npm run build && npm run start

# Terminal 2: Start frontend (from /frontend)
npm run dev
```

Access the application at `http://localhost:5173`

---

## Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| `alice@demo.com` | `demo123` | User |
| `bob@demo.com` | `demo123` | User |
| `carol@demo.com` | `demo123` | User |
| `dave@demo.com` | `demo123` | User |
| `emma@demo.com` | `demo123` | User |
| `frank@demo.com` | `demo123` | User |

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register new user |
| POST | `/auth/login` | Login, returns JWT |

### Posts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/posts` | List all posts |
| GET | `/posts/mine` | List user's posts (auth) |
| GET | `/posts/nearby` | Geo-spatial search |
| POST | `/posts` | Create post (auth) |
| POST | `/posts/upload` | Upload files (auth, max 5) |
| PATCH | `/posts/:id/claim` | Request to help (auth) |
| PATCH | `/posts/:id/approve-claim` | Approve helper (auth) |
| PATCH | `/posts/:id/fulfill` | Mark as fulfilled (auth) |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chat` | List conversations (auth) |
| POST | `/chat` | Create/get conversation (auth) |
| GET | `/chat/:id` | Get messages (auth) |
| WS | `sendMessage` | Send message (auth) |

### AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/voice-post` | Parse voice transcript |
| POST | `/ai/search` | Natural language search |
| POST | `/ai/briefing` | Generate crisis briefing |

---

## Features

### Map Interface
- Interactive Leaflet map with CARTO basemaps
- Color-coded priority markers (Critical/High/Medium/Low)
- Filter by NEEDS / OFFERS
- Search across posts
- Photo thumbnails on selected post

### Post Creation
- Voice-to-text input with AI parsing
- Automatic type detection (need vs offer)
- Category selection (Water, Food, Medical, Shelter, Rescue, Other)
- File upload (images + documents, max 5 files, 10MB each)
- Auto location detection

### Claim System
- "I can help" volunteer button
- Post owner approval workflow
- Fulfillment tracking

### Real-time Chat
- One conversation per user pair
- Multi-tab support
- Optimistic message updates
- Message timestamps

### AI Features
- **Urgency Scoring** — Auto-scores posts 0-100
- **Crisis Briefing** — AI-generated summary of critical posts
- **Voice Transcription** — Converts speech to structured post data
- **Natural Search** — Parse queries like "urgent medical needs near downtown"

---

## Project Structure

```
crisis-connect/
├── backend/
│   ├── src/
│   │   ├── main.ts              # Entry point
│   │   ├── app.module.ts        # Root module
│   │   ├── config.ts            # Environment config
│   │   ├── auth/                # JWT authentication
│   │   ├── posts/               # Posts CRUD + geo
│   │   ├── chat/                # WebSocket messaging
│   │   ├── ai/                  # Gemini integration
│   │   └── users/               # User management
│   ├── uploads/                 # File uploads
│   └── dist/                    # Compiled output
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx             # React entry
│   │   ├── App.tsx              # Router setup
│   │   ├── index.css            # Global styles + CSS vars
│   │   ├── context/             # Auth context
│   │   ├── pages/               # Route components
│   │   ├── components/          # UI components
│   │   │   ├── dashboard/       # Dashboard views
│   │   │   └── ui/              # Reusable UI
│   │   └── lib/                 # Utilities
│   ├── public/
│   │   └── logo/                # SVG logo
│   └── dist/                    # Production build
│
└── package.json                 # Root dependencies
```

---

## Design System

### Typography
- **Headings**: DM Serif Display
- **Body**: Geist Variable / DM Sans
- **Monospace**: JetBrains Mono

### Color Palette
| Token | Light | Dark |
|-------|-------|------|
| `--primary` | `oklch(0.42 0.055 252)` | `oklch(0.58 0.055 252)` |
| `--background` | `oklch(0.985 0.002 247)` | `oklch(0.141 0.010 250)` |
| `--foreground` | `oklch(0.145 0.025 250)` | `oklch(0.935 0.008 250)` |
| `--priority-critical` | `oklch(0.577 0.245 27.325)` | `oklch(0.645 0.246 16.439)` |

### Spacing Scale
4px base unit: 4, 8, 12, 16, 24, 32, 48, 64px

---

## License

ISC License — See LICENSE file for details.

---

## Acknowledgments

- [Leaflet](https://leafletjs.com/) — Open-source maps
- [Google Gemini](https://gemini.google.com/) — AI capabilities
- [CARTO](https://carto.com/) — Beautiful map basemaps
- [Shadcn UI](https://ui.shadcn.com/) — Design system inspiration
