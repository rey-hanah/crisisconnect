# Repo Setup

Everything you need to initialize the project from scratch.

---

## Monorepo Structure

```
crisis-connect/
├── README.md
├── docs/
│   ├── REPO_SETUP.md       ← you are here
│   ├── ARCHITECTURE.md
│   ├── MAP.md
│   ├── AI.md
│   ├── DATA_MODEL.md
│   ├── FEATURES.md
│   └── BUILD_PLAN.md
├── client/                 ← React + Vite frontend
└── api/                    ← NestJS backend
```

---

## 1. Frontend — React + Vite + TypeScript

```bash
npm create vite@latest client -- --template react-ts
cd client
```

### Install all dependencies

```bash
# Routing + data fetching
npm install react-router-dom axios @tanstack/react-query

# Forms + validation
npm install react-hook-form zod @hookform/resolvers

# State management
npm install zustand

# Realtime
npm install socket.io-client

# Map
npm install leaflet react-leaflet leaflet.heat
npm install -D @types/leaflet

# Date formatting
npm install date-fns

# Utilities
npm install clsx tailwind-merge lucide-react

# Tailwind + ShadCN
npm install -D tailwindcss postcss autoprefixer tailwindcss-animate
npx tailwindcss init -p

# ShadCN init (run this, answer prompts — see config below)
npx shadcn@latest init

# ShadCN components
npx shadcn@latest add button card badge input textarea
npx shadcn@latest add dialog drawer sheet tabs scroll-area
npx shadcn@latest add avatar separator skeleton
npx shadcn@latest add sonner tooltip popover
```

### `tailwind.config.ts`

```ts
import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        crisis: {
          critical: '#C0392B',
          high:     '#E67E22',
          medium:   '#F1C40F',
          low:      '#27AE60',
          offer:    '#2980B9',
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    }
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config
```

### ShadCN `components.json`

```json
{
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### `vite.config.ts`

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  }
})
```

### `tsconfig.json` paths (add to compilerOptions)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### Client folder structure

```
client/src/
├── components/
│   ├── ui/                  # ShadCN auto-generated — do not edit manually
│   ├── map/
│   │   ├── MapView.tsx      # Main map container
│   │   ├── HeatLayer.tsx    # leaflet.heat wrapper
│   │   ├── DotLayer.tsx     # Individual post pins
│   │   ├── PostPopup.tsx    # Tap-a-dot detail popup
│   │   └── SearchBar.tsx    # Search overlay on map
│   ├── post/
│   │   ├── PostForm.tsx     # Submit need or offer
│   │   ├── PostDetail.tsx   # Full detail sheet
│   │   └── PostBadge.tsx    # Priority chip
│   ├── chat/
│   │   ├── ChatSheet.tsx    # Slide-up chat panel
│   │   ├── MessageList.tsx
│   │   └── MessageInput.tsx
│   └── layout/
│       ├── BottomNav.tsx
│       └── TopBar.tsx
├── pages/
│   ├── MapPage.tsx          # Default / home page
│   ├── PostFormPage.tsx
│   ├── ChatPage.tsx
│   ├── LoginPage.tsx
│   └── SignupPage.tsx
├── store/
│   ├── authStore.ts         # Zustand — user session
│   ├── postStore.ts         # Zustand — posts cache
│   └── chatStore.ts         # Zustand — active conversations
├── hooks/
│   ├── useAuth.ts
│   ├── usePosts.ts
│   ├── useSocket.ts
│   └── useSearch.ts
├── lib/
│   ├── api.ts               # axios instance with JWT interceptor
│   ├── utils.ts             # cn(), formatTimeAgo(), getPriorityColor()
│   └── constants.ts         # MAP_DEFAULTS, CATEGORIES, ZOOM_THRESHOLD
└── types/
    ├── post.ts
    ├── user.ts
    └── chat.ts
```

### `.env` (client)

```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
VITE_MAP_DEFAULT_LAT=49.2827
VITE_MAP_DEFAULT_LNG=-123.1207
VITE_MAP_DEFAULT_ZOOM=11
VITE_ZOOM_THRESHOLD=13
```

---

## 2. Backend — NestJS + TypeScript

```bash
cd ..
npm install -g @nestjs/cli
nest new api --package-manager npm
cd api
```

### Install all dependencies

```bash
npm install \
  @nestjs/mongoose mongoose \
  @nestjs/jwt @nestjs/passport passport passport-jwt \
  @nestjs/websockets @nestjs/platform-socket.io socket.io \
  @nestjs/config @nestjs/schedule \
  class-validator class-transformer \
  bcryptjs \
  @anthropic-ai/sdk

npm install -D \
  @types/passport-jwt \
  @types/bcryptjs \
  @types/socket.io
```

### Backend folder structure

```
api/src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   ├── jwt.strategy.ts
│   └── dto/
│       ├── signup.dto.ts
│       └── login.dto.ts
├── posts/
│   ├── posts.module.ts
│   ├── posts.service.ts
│   ├── posts.controller.ts
│   ├── post.schema.ts
│   └── dto/
│       └── create-post.dto.ts
├── chat/
│   ├── chat.module.ts
│   ├── chat.service.ts
│   ├── chat.gateway.ts        # Socket.io WebSocket gateway
│   ├── conversation.schema.ts
│   └── message.schema.ts
├── ai/
│   ├── ai.module.ts
│   └── ai.service.ts          # All Claude API calls live here
├── users/
│   ├── users.module.ts
│   ├── users.service.ts
│   └── user.schema.ts
├── seed/
│   └── seed.ts                # Demo data seeder
└── main.ts
```

### `.env` (api)

```env
PORT=3001
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/crisisconnect
JWT_SECRET=change_this_to_something_long_and_random
ANTHROPIC_API_KEY=sk-ant-...
CLIENT_URL=http://localhost:5173
```

### `main.ts` — CORS + WebSocket setup

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.CLIENT_URL, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
```

---

## 3. Git Setup

```bash
# From root crisis-connect/
git init
echo "node_modules/\n.env\ndist/\nbuild/" > .gitignore
git add .
git commit -m "init: project scaffold"
```

### Recommended branch strategy for 24hr build

```
main          ← stable, demo-ready at all times
dev           ← integration branch
feat/map      ← Person C working on map
feat/backend  ← Person A working on API
feat/ui       ← Person B working on components
```

```bash
git checkout -b dev
git checkout -b feat/map
# etc.
```

Merge into `dev` every few hours. Merge `dev` → `main` only when it's working end-to-end.
