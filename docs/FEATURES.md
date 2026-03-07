# Features

---

## Core Features (must ship)

### Map-First Interface
The map is the entire app. No separate feed or card grid.
- Heatmap when zoomed out — shows crisis density by area
- Individual colored dots when zoomed in — one per post
- Tap any dot → bottom sheet with full details
- `+` button → post form

### Post a Need or Offer
Single form. Same for everyone. No roles.
- Category: Water · Food · Medical · Shelter · Rescue · Other
- Type toggle: "I Need Help" / "I Can Offer Help"
- Title (120 chars) + description (no limit)
- Optional photos (up to 3)
- Location pin (map picker or auto-detect)
- Self-reported urgency (AI will override with its own score)

### AI Triage Scoring
Every post is scored 0–100 by Claude on submission.
- Score determines dot color on the map
- Higher scores surface first in search results
- Ignored posts auto-escalate every 30 minutes (time decay cron)

### Natural Language Search
Search bar overlaid on map. "water near me", "urgent medical", "food offers" → AI parses intent → filters visible dots in real time. Debounced 500ms.

### In-App Chat
Tap "Message them" on any post detail sheet. Opens a chat thread scoped to that post.
- Real-time via Socket.io
- **Phone numbers and emails never shown — ever**
- All coordination stays on-platform
- Message deletion available

### Anonymous Posting
Display name can be anything ("Anonymous Helper 42"). Location shown as neighborhood name only — never exact coordinates.

---

## Prize-Targeted Features

---

### 🔊 Voice Crisis Briefing — ElevenLabs TTS
*Targets: [MLH] Best Use of ElevenLabs + ElevenLabs Challenge*

The AI Crisis Briefing button sends visible posts to Claude, then passes the generated text to **ElevenLabs Text-to-Speech**. The app reads it aloud.

> *"There are three critical unresponded posts near you. A family of five has been without water for two days in East Vancouver. A provider 1.2 kilometers away has clean water available and has not been matched yet."*

**Why it matters:** In a real disaster, people are moving, panicked, possibly injured. They cannot always stare at a screen. Voice is the most accessible interface in a crisis.

```ts
// ai.service.ts
async speakBriefing(text: string): Promise<Buffer> {
  const response = await elevenlabs.textToSpeech.convert(VOICE_ID, {
    text,
    model_id: 'eleven_turbo_v2',
    voice_settings: { stability: 0.6, similarity_boost: 0.8 }
  })
  return Buffer.from(await response.arrayBuffer())
}
```

---

### 🎤 Voice Post Submission — ElevenLabs STT
*Targets: [MLH] Best Use of ElevenLabs + ElevenLabs Challenge (bonus: multiple APIs)*

Instead of typing, tap the microphone button and speak your need. ElevenLabs Speech-to-Text transcribes it. Claude structures the fields and submits the post.

**User says:**
> *"I need help. I'm near Hastings and Main. I have four people, no food since yesterday, and my mom needs her medication."*

**Result:** Post created with `category: food + medical`, `people: 4`, `urgency: critical`, `description` cleaned and formatted.

This is the single best accessibility feature possible for a crisis app. Someone who is panicked, injured, or in the dark can just speak.

```ts
// ElevenLabs STT endpoint
POST /ai/voice-post
Body: FormData with audio blob
Returns: { title, description, category, peopleAffected, urgency }
```

---

### 🔔 Nearby Audio Alert — ElevenLabs TTS
*Targets: ElevenLabs (bonus feature)*

On map load, if there is a CRITICAL post within 1km of the user's location, ElevenLabs reads a short audio alert:

> *"Critical alert nearby: someone urgently needs medical help 600 meters from you."*

Auto-plays once per session. User can mute in settings. Drives immediate action without requiring screen attention.

---

### 🔐 Passkey Authentication — WebAuthn
*Targets: 1Password Best Security Hack ($400 CAD)*

Users can register and log in using biometrics (Face ID, Touch ID, fingerprint) instead of a password. Built with WebAuthn / FIDO2.

```bash
npm install @simplewebauthn/server    # backend
npm install @simplewebauthn/browser   # frontend
```

```ts
// Two new auth endpoints
POST /auth/passkey/register-options   // generate challenge
POST /auth/passkey/register-verify    // store credential
POST /auth/passkey/login-options      // generate assertion
POST /auth/passkey/login-verify       // verify + issue JWT
```

Passwords still supported as fallback. Passkey is the recommended path shown first on signup.

---

### 🛡️ Security Transparency Page — `/security`
*Targets: 1Password Best Security Hack*

A public page showing exactly what Crisis Connect collects, what it never shares, and how messages are handled.

| What we collect | What we NEVER share |
|-----------------|---------------------|
| Email or phone (login only) | Your phone number to other users |
| Your general neighborhood | Your exact GPS coordinates |
| What you posted | Your private messages |
| — | Your login credentials |

One sentence summary shown at the top of the page:
> *"Your phone number never appears on this platform. Your location is approximate. Your messages are yours."*

---

## Hackathon Differentiators (High Wow Factor)

### AI Crisis Briefing 🔥🔥🔥
Floating "📊 Briefing" button. Claude summarizes all visible posts in 150 words, finds unmatched need+offer pairs, and recommends the single most urgent action. Then ElevenLabs reads it aloud. Makes AI feel like a real coordinator.

### Post-to-Post Matching 🔥🔥🔥
When a need and offer in the same area share a category, the app shows:
> "⚡ Match found: someone 0.8km away is offering water. [Connect them]"

Tapping it opens a group chat with context pre-filled. This is the core value proposition made visible — your app actively connects people, not just lists them.

### Time Indicators on Dots 🔥🔥
Hovering a dot shows:
> "⚠ No response — 4 hrs" (orange outline after 1hr, red after 3hrs)
> "✓ Claimed 20 min ago" (green)

Unresponded posts visually escalate on the map. No one gets buried.

### Real-Time Pulse Animation 🔥🔥
Critical dots pulse with a red glow (CSS keyframe). New posts trigger a ripple animation visible to all connected users. The map feels alive and urgent.

### Fulfillment Celebration 🔥
When a post is marked Fulfilled, the dot expands, turns green, then fades out. Small but emotionally powerful — disasters are dark, a small celebration of each resolved crisis matters.

### Offline Banner 🔥
If network drops: *"📶 You're offline — showing last loaded posts."* Posts submitted offline queue and send on reconnect. Direct answer to the judge question about bad internet.

---

## Feature Priority Matrix

```
                    HIGH DEMO IMPACT
                          │
    Voice Briefing        │   Heatmap → Dots transition
    Voice Post            │   AI Triage + Time Decay
    Post Matching         │   NL Search
                          │
LOW BUILD ────────────────┼──────────────── HIGH BUILD
    EFFORT                │                   EFFORT
                          │
    .Tech Domain (5 min)  │   Passkey Auth (3–4 hrs)
    MongoDB Atlas docs    │   Full offline queue
    Nearby Audio Alert    │   Push notifications
                          │
                    LOW DEMO IMPACT
```

**Top-left = build first.** Top-right = build second. Bottom-left = free prizes, do it. Bottom-right = skip.

---

## Cut for MVP

| Feature | Why cut |
|---------|---------|
| Organization verification | Too much logic for no visible payoff |
| SMS fallback (Twilio) | Another API to manage, privacy concerns |
| Multi-language UI | Nice but not core |
| Image CDN compression | Skip or use Cloudinary free tier |
| Push notifications | Service worker setup too risky in 24hrs |
| Solana anything | Completely different domain |
