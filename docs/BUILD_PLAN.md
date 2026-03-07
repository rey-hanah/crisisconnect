# 24-Hour Build Plan

3 people. Hard freeze on new features at hour 22. Last 2 hours = demo only.

Prize tasks are marked with their category in brackets.

---

## Tracks

| Track | Person | Focus |
|-------|--------|-------|
| **A** | Backend | NestJS API + MongoDB + Claude AI + ElevenLabs |
| **B** | Frontend | React components + post form + chat + passkey auth |
| **C** | Map + Demo | Leaflet map + search + voice UI + demo prep |

Sync every 4 hours. Keep a shared channel open for blockers.

---

## Hour-by-Hour

### Hours 0–2: Foundation

**Track A**
- [ ] `nest new api` + install all deps from `REPO_SETUP.md`
- [ ] MongoDB Atlas connection — test it works
- [ ] Deploy to Railway immediately (even empty) — get the URL
- [ ] Register `crisisconnect.tech` — point at Vercel placeholder `[.TECH DOMAIN]`

**Track B**
- [ ] `npm create vite@latest client -- --template react-ts`
- [ ] Install all deps, ShadCN init, Tailwind + crisis color config
- [ ] Routing: `/` `/post` `/chat` `/login` `/signup` `/security`

**Track C**
- [ ] react-leaflet sandbox — get a map rendering with hardcoded pins
- [ ] Confirm `leaflet.heat` loads (add `// @ts-ignore` above import)
- [ ] Color palette + ShadCN theme confirmed

---

### Hours 2–5: Auth + Map Base

**Track A**
- [ ] User schema + auth module (email/phone, JWT)
- [ ] `POST /auth/signup` and `POST /auth/login` — test with Postman
- [ ] JWT guard working on a test route

**Track B**
- [ ] Login + Signup pages (react-hook-form + zod)
- [ ] Auth store (Zustand) — JWT + user object
- [ ] Axios interceptor — attach JWT to every request

**Track C**
- [ ] `MapView.tsx` — full-screen map, zoom listener logging
- [ ] `HeatLayer.tsx` — renders with hardcoded mock points
- [ ] Zoom toggle logic: heatmap below 13, switch above 13

---

### Hours 5–9: Posts + Dots on Map

**Track A**
- [ ] Post schema with `2dsphere` index on location `[MONGODB ATLAS]`
- [ ] `POST /posts` — saves to DB, returns immediately, fires AI async
- [ ] `GET /posts` — geo query with `$near` + radius `[MONGODB ATLAS]`
- [ ] Claude AI service: `scorePost()` wired and returning JSON
- [ ] AI updates post doc with score + summary after save

**Track B**
- [ ] `PostForm.tsx` — type toggle, category pills, title, description, location picker
- [ ] `POST /posts` wired — form submits, success toast, redirects to map
- [ ] `PostDetailSheet.tsx` — ShadCN Sheet, shows all post fields + AI summary

**Track C**
- [ ] `DotLayer.tsx` — CircleMarkers from real API data
- [ ] Dot colors from `aiPriority` field
- [ ] `GET /posts` called on map load + on pan/zoom
- [ ] Tap dot → `PostDetailSheet` opens

---

### Hours 9–13: Real-time + Chat

**Track A**
- [ ] Socket.io gateway — emit `post:created` and `post:updated`
- [ ] `PATCH /posts/:id/claim` and `/fulfill` endpoints
- [ ] Cron job: time-decay re-scoring every 30min `[AI TRIAGE]`
- [ ] Conversation + Message schemas
- [ ] Chat Socket.io gateway — join room, broadcast messages

**Track B**
- [ ] Claim button + Fulfill button wired on `PostDetailSheet`
- [ ] `ChatSheet.tsx` — slide-up panel, message list, send input
- [ ] Socket.io client for chat — real-time messages
- [ ] "Message them" button creates conversation + opens ChatSheet
- [ ] Chat safety filter client-side toast if blocked

**Track C**
- [ ] Socket.io client — `post:created` adds dot on map in real-time
- [ ] Ripple animation on new post pin `[BEST DESIGN]`
- [ ] Pulse CSS keyframe on CRITICAL dots `[BEST DESIGN]`
- [ ] Time indicator tooltip on dots ("⚠ No response — 2 hrs")

---

### Hours 13–17: ElevenLabs + Search

**Track A**
- [ ] `POST /ai/briefing` — Claude generates text summary of visible posts
- [ ] `POST /ai/briefing/voice` — ElevenLabs TTS, returns audio buffer `[ELEVENLABS]`
- [ ] `POST /ai/voice-post` — ElevenLabs STT → Claude structures fields `[ELEVENLABS]`
- [ ] `POST /ai/search` — NL query → Claude → filter object
- [ ] Chat safety filter: `filterMessage()` in AI service

**Track B**
- [ ] NL search bar wired to `/ai/search` — dots filter on result
- [ ] Client-side text filter for instant feedback while debouncing
- [ ] `/security` page — privacy transparency table `[1PASSWORD]`
- [ ] Offline banner (window `online`/`offline` listener)
- [ ] Install `@simplewebauthn/browser` — passkey UI on signup `[1PASSWORD]`

**Track C**
- [ ] Crisis Briefing button on map — calls `/ai/briefing`
- [ ] Speaker icon — calls `/ai/briefing/voice` + plays audio `[ELEVENLABS]`
- [ ] Mic button on PostForm — records audio, calls `/ai/voice-post` `[ELEVENLABS]`
- [ ] Nearby alert: on map load check for CRITICAL within 1km → play ElevenLabs audio `[ELEVENLABS]`
- [ ] "Locate Me" button — fly to user location

---

### Hours 17–20: Polish + Seed

**Track A**
- [ ] Post-to-post matching: find need+offer pairs by category+proximity
- [ ] Emit `match:found` socket event
- [ ] Passkey WebAuthn backend: `/auth/passkey/*` endpoints `[1PASSWORD]`
- [ ] Seed script — 8 posts at 4 demo locations, 4 users, 2 chats (run it, verify data)
- [ ] TTL index on fulfilled posts auto-archive `[MONGODB ATLAS]`

**Track B**
- [ ] Match suggestion banner on `PostDetailSheet` `[DEMO]`
- [ ] Passkey registration + login UI `[1PASSWORD]`
- [ ] Fulfillment celebration animation (dot turns green + fades out) `[BEST DESIGN]`
- [ ] Mobile responsive final pass — test on actual phone `[BEST DESIGN]`

**Track C**
- [ ] Full demo run with seed data — note anything that looks broken
- [ ] Wellness counter: "🤝 X connections made in this area" on map `[WELLNESS]`
- [ ] Verify `crisisconnect.tech` resolves to live Vercel deployment `[.TECH DOMAIN]`
- [ ] Start 5-slide pitch deck

---

### Hours 20–22: Integration + Full Test

All three together.

- [ ] Full user flow: signup (passkey) → map loads → heatmap → zoom → dots → tap → voice briefing plays → voice post submitted → dot appears → chat opens → claim → fulfill
- [ ] NL search "water near me" → filters correctly
- [ ] Crisis briefing text + voice both work
- [ ] Seed data looks good on map (real locations, varied priorities)
- [ ] Load test on throttled network (Chrome DevTools → Slow 3G) — should still show map in under 3 seconds
- [ ] `/security` page live and linked from footer
- [ ] No console errors
- [ ] crisisconnect.tech live

---

### Hours 22–23: Demo Rehearsal

- [ ] 2-minute demo script (one drives, one narrates)
- [ ] Devpost description written — includes MongoDB Atlas section, ElevenLabs section, security section, wellness angle
- [ ] Prize categories opted into on Devpost
- [ ] Practice Q&A: AI triage, no middleman, bad internet, ElevenLabs use case, security model

### Hour 23–24: Sleep

Do not ship new features. One of you sleeps.

---

## Demo Script (2 minutes)

```
0:00  Open crisisconnect.tech on phone and screen
      "This is a live map of a crisis — every dot is a real need or offer"

0:15  Show heatmap at city level
      "Zoomed out you see density — where crises are clustering"
      
0:25  Zoom in — dots appear
      "Zoom in and individual posts appear — red means critical"
      
0:35  Tap the pulsing red dot
      "Tap any dot — full details, AI summary, how long it's been ignored"
      
0:45  Tap voice briefing button
      "Our AI generates a situational briefing — and ElevenLabs reads it aloud"
      [ElevenLabs audio plays]
      
1:05  Switch to post form, tap mic
      "In a crisis you might not be able to type — just speak"
      [Speak a need into the mic]
      "Post appears on the map instantly"
      
1:25  Show chat
      "Tap Message them — all coordination is on-platform. No phone numbers ever."
      
1:40  Show match suggestion
      "AI detected a water need and water offer 800m apart — suggested a match"
      
1:50  Show fulfilled dot fading to green
      "When help arrives — the dot resolves. This is the whole point."
      
2:00  End on /security page
      "Your phone number never appears here. Security isn't a feature — it's the product."
```

---

## Merge Strategy

```
Hour 5:   all branches → dev   (auth working end-to-end)
Hour 9:   all → dev            (posts showing on map)
Hour 13:  all → dev            (real-time + chat)
Hour 17:  all → dev            (voice + search)
Hour 20:  dev → main           (demo-ready, domain live)
```

After hour 20: **main is frozen.** Hotfixes only.

---

## If You're Behind, Cut In This Order

1. Passkey auth (fall back to password only)
2. Nearby audio alert
3. Wellness counter
4. Post-to-post matching
5. Voice post submission (keep voice briefing — more impressive)
6. Photo upload

**Never cut:** map, dots, AI triage, NL search, chat, voice briefing, seed data.
