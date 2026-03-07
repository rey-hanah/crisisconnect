# Prize Strategy

> Target multiple prizes simultaneously. Most of the work overlaps.
> Every hour you spend on ElevenLabs or 1Password also makes the main project stronger.

---

## At a Glance

| Prize | Value | Extra work needed | Priority |
|-------|-------|-------------------|----------|
| 🥇 1st Place | $3,388 CAD | You're already building for it | **#1 — everything else serves this** |
| 🎨 Best Design | $120 CAD + swag | Polish map animations (~1 hr) | **Do it — nearly free** |
| 🍃 [MLH] MongoDB Atlas | M5Stack IoT Kit | Already using it — just document | **Do it — free** |
| 🌐 [MLH] .Tech Domain | Desktop mic + domain 10yr | Register crisisconnect.tech ($1) | **Do it — 5 minutes** |
| 🔊 [MLH] Best Use of ElevenLabs | Wireless earbuds | 2–3 hrs, natural fit for crisis app | **High priority** |
| 🔊 ElevenLabs Challenge | Prize TBD | Same work as above — double submit | **Free, submit both** |
| 🔐 1Password Security | $400 CAD | 3–4 hrs — passkey auth + security page | **Medium priority** |
| 💚 Best Wellness Hack | $325 CAD | Reframe the pitch, no extra build | **Low effort, worth a shot** |

**Skip entirely:** Solana (blockchain pivot), Google Antigravity (different IDE), Lovable (different builder), Gemini (already using Claude — don't split AI logic).

---

## Prize Deep Dives

---

### 🥇 1st Place — $3,388 CAD

This is your primary target. Everything else feeds into it.

**What wins 1st place at nwHacks:**
- Real-world impact (not a toy)
- Technical depth visible in the demo
- AI used meaningfully, not decoratively
- A polished story the judges can repeat

**Your edge:**
- Map-first UX — most teams build CRUD dashboards or chatbots. A live heatmap turning into colored crisis pins is visually unlike anything else.
- AI triage with time decay — not just a ranking, a living system that escalates ignored crises
- Bidirectional marketplace (need + offer) — solves a real coordination problem
- Privacy-by-design chat — shows product thinking, not just coding

**Pitch frame for 1st:** *"We built the thing that should have existed during the LA wildfires, the Spain floods, and the BC fires. A live map where anyone can drop a pin saying 'I need water' or 'I have water' — and AI makes sure the most urgent ones are never buried."*

---

### 🎨 Best Design Award — $120 CAD

The judges want to be "wowed by UX/UI." A full-screen Leaflet map with:
- Smooth heatmap ↔ dot transition on zoom
- Pulsing red glow on critical pins
- Clean ShadCN bottom sheet sliding up on tap
- Crisis color palette (red/orange/yellow/green/blue)

...is already more visually impressive than 90% of hackathon projects.

**1-hour investment to lock this in:**
- Add CSS pulse animation on `CRITICAL` dots (keyframe, 10 lines)
- Add ripple animation when a new post appears in real-time
- Make the bottom sheet slide-up buttery smooth
- Ensure it looks good on mobile (judges will check on their phones)

**During judging:** open the app on your phone and hand it to the design judge. Let them tap dots. Don't narrate — let the UI speak.

---

### 🔊 [MLH] Best Use of ElevenLabs + ElevenLabs Challenge

**These are the same submission — enter both categories.**

**Why ElevenLabs is a natural fit for a crisis app:**

In a real disaster — fire, flood, earthquake — people are panicked, moving, possibly injured. They can't always stare at a screen and read. Voice is the most accessible interface in a crisis.

**What to build (3 hours, all in `ai.service.ts` + one new component):**

#### Feature 1: Voice Crisis Briefing
The AI Briefing button (already in FEATURES.md) gets a speaker icon. After Claude generates the text briefing, pass it to ElevenLabs TTS. The app reads it aloud:

> *"There are three critical unresponded posts near you. A family of five has been without water for over two days in East Vancouver. A provider two kilometers away has forty liters of clean water available. These two posts have not been matched yet."*

This is genuinely useful. A first responder driving does not want to read a screen.

#### Feature 2: Voice Post Submission
Instead of typing, tap a microphone button and speak your need. Use ElevenLabs Speech-to-Text (or browser Web Speech API as fallback) → AI cleans and structures the text → submits as a post.

*"I need help. I'm at Hastings and Main. I have no food, four people, including my mom who is diabetic."*

That gets transcribed, AI extracts the structured fields (category: food + medical, people: 4, urgency: critical), and creates the post. **This is the best possible accessibility feature for a crisis app and judges will lose their minds over it.**

#### Feature 3: Nearby Alert Audio (bonus)
When the app detects a CRITICAL post within 1km of the user (on map load), ElevenLabs reads a short alert:

> *"Critical alert nearby: someone needs urgent medical help 600 meters from you."*

**ElevenLabs APIs to use (bonus points for multiple):**
- `POST /v1/text-to-speech/{voice_id}` — TTS for briefings and alerts
- `POST /v1/speech-to-text` — voice post submission

**Installation:**
```bash
npm install elevenlabs  # official SDK
```

**Pitch frame:** *"In a disaster, you can't always look at your phone. We added ElevenLabs voice so the app reads the most critical nearby crises to you out loud — and lets you submit a help request just by speaking."*

---

### 🔐 1Password Best Security Hack — $400 CAD

**1Password's values: Keep it Simple · Lead with Honesty · Put People First**
**Bonus: use passkeys / authentication.**

Crisis Connect already has a strong privacy story (no phone numbers exposed, on-platform chat). Formalize and extend it.

**What to add (3–4 hours):**

#### Passkey Authentication
Replace password login with WebAuthn passkeys via the 1Password compatible flow. Users register with biometrics (face ID, touch ID) instead of a password.

```ts
// auth.controller.ts — add alongside existing JWT
POST /auth/passkey/register   // generate challenge
POST /auth/passkey/verify     // verify and issue JWT
```

Use the `@simplewebauthn/server` library on the backend and `@simplewebauthn/browser` on the client.

#### Security Transparency Page (`/security`)
A simple public page showing exactly what Crisis Connect collects, what it never shares, and how messages are protected. Judges love transparency.

```
WHAT WE COLLECT        WHAT WE NEVER SHARE
─────────────────      ──────────────────────
Email or phone         Your phone number
Your general area      Your exact coordinates
What you posted        Your login credentials
                       Your chat messages (to us)
```

#### Message Deletion
Users can delete their own posts and chat messages. Delete triggers a Socket.io event and wipes from MongoDB. Simple, visible control.

**Pitch frame for 1Password:** *"People in a crisis are at their most vulnerable — to scams, to exploitation, to privacy violations. We built a platform where your phone number never appears, your location is approximate only, your messages never touch our logs, and you can authenticate with just your face. Security isn't a feature for us — it's the product."*

---

### 🍃 [MLH] Best Use of MongoDB Atlas — Free, Already Done

You're already using MongoDB Atlas. To win this:

1. Use at least one Atlas-specific feature beyond basic CRUD:
   - **Atlas Search** — power the NL search with Atlas full-text search index
   - **Geospatial queries** — `$near`, `$geoWithin` for radius filtering (you're already doing this)
   - **Atlas Charts** — embed a live chart of post counts by category in the Crisis Briefing (optional)

2. In your devpost, dedicate a section to how you use Atlas. Mention:
   - `2dsphere` index on post locations
   - `$near` query for radius-based post retrieval
   - TTL index on fulfilled posts (auto-archive after 7 days)
   - Real-time change streams powering Socket.io updates

**Add this to your devpost description.** No extra build required.

---

### 🌐 [MLH] Best .Tech Domain — 5 Minutes

Register `crisisconnect.tech` at get.tech. Student pricing is around $1.

Point it at your Vercel deployment. Done.

In your devpost: *"Live at crisisconnect.tech"*

That's all it takes to enter this category.

---

### 💚 Best Wellness Related Hack — $325 CAD

This is a stretch but requires zero additional build — just a reframe of your pitch.

**The wellness angle:**
Community isolation is one of the biggest mental health factors in a disaster. People feel helpless and alone. Crisis Connect rebuilds social trust and community agency — you don't just wait for help, you *find* it, you *offer* it, you see your neighbors respond.

**Add to your devpost:**
> "Beyond physical survival, disasters cause profound psychological harm through isolation and helplessness. Crisis Connect restores community agency — the knowledge that your neighbors are there, that you are not alone, that help is visible and close. Every fulfilled post on our map is not just a resource delivered — it's a human connection made."

**If you have time:** add a simple `fulfilled` counter on the map homepage: *"🤝 47 connections made in this area"* — makes the wellness angle visible.

---

## Submission Checklist

Before you submit to Devpost, confirm:

- [ ] Opted into: Main prizes, Best Design, MongoDB Atlas, .Tech Domain, ElevenLabs (both), 1Password (if built), Best Wellness
- [ ] crisisconnect.tech is live and pointing to Vercel
- [ ] Demo video is under 3 minutes and shows: map load → heatmap → zoom to dots → tap dot → voice briefing → voice post → chat
- [ ] MongoDB Atlas section in devpost description
- [ ] Security/privacy section in devpost description
- [ ] ElevenLabs section in devpost description (name both APIs used)
- [ ] Project description answers the UBC CS Project Hub questions if you're eligible and interested
