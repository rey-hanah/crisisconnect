# AI Integration

All AI features use **Claude API (Anthropic)** for reasoning + **ElevenLabs** for voice.
All calls are **server-side only** (NestJS `ai.service.ts`). API keys never touch the client.

---

## Overview

| Feature | API | Trigger | Response time | Prize target |
|---------|-----|---------|--------------|--------------|
| Triage scoring | Claude Haiku | Every post submit | ~600ms async | 1st Place |
| Card summary | Claude Haiku | Same call as triage | included | 1st Place |
| NL Search | Claude Haiku | Search bar debounced | ~800ms | 1st Place |
| Time-decay re-score | Claude Haiku | Cron every 30min | background | 1st Place |
| Crisis Briefing text | Claude Haiku | Button tap | ~1s | 1st Place |
| Voice Briefing | ElevenLabs TTS | After briefing text | ~500ms | ElevenLabs |
| Voice Post Submit | ElevenLabs STT | Mic button | ~1s | ElevenLabs |
| Nearby Audio Alert | ElevenLabs TTS | Map load if critical nearby | ~400ms | ElevenLabs |
| Chat safety filter | Claude Haiku | Every message | ~300ms | 1Password |

---

## 1. Triage Scoring

Every post gets scored 0–100 by Claude on submission. Score stored in MongoDB. Determines dot color + search rank.

```ts
const triagePrompt = `
You are an emergency triage assistant for a crisis coordination platform.
Analyze this post and return ONLY valid JSON. No explanation. No markdown fences.

Post:
{
  "category": "${post.category}",
  "title": "${post.title}",
  "description": "${post.description}",
  "people_affected": ${post.peopleAffected ?? 1},
  "self_reported_urgency": "${post.selfReportedUrgency}",
  "type": "${post.type}"
}

Return exactly:
{
  "score": <integer 0-100>,
  "priority": <"critical" | "high" | "medium" | "low" | "offer">,
  "summary": <one sentence max 120 chars plain English>,
  "confidence": <float 0.0-1.0>,
  "tags": [<up to 3 tags>]
}

Scoring guide:
- Medical life threat or missing medication = 85–100
- Multiple people no water or food 2+ days = 80–95  
- Rescue / trapped / stranded = 85–100
- Single person needing supplies = 40–65
- Offers: always priority "offer", score 0
- Longer implied time without response = higher score
`
```

**Never block post submission on AI failure.** Fallback to `score: 50, priority: "medium"`.

---

## 2. Time-Decay Re-Scoring

Cron runs every 30 minutes. Unresponded open posts get score escalated.

```ts
@Cron('0 */30 * * * *')
async rescoreUnrespondedPosts() {
  const stalePosts = await this.postModel.find({
    status: 'open',
    claimedBy: null,
    createdAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) }
  })

  for (const post of stalePosts) {
    const hoursOld = (Date.now() - post.createdAt.getTime()) / 3_600_000
    const multiplier = 1 + (hoursOld * 0.08)  // +8% per hour unresponded
    const newScore = Math.min(100, Math.round(post.aiScore * multiplier))
    await this.postModel.updateOne({ _id: post._id }, {
      aiScore: newScore,
      aiPriority: scoreToPriority(newScore),
      lastScoredAt: new Date()
    })
    this.postsGateway.emit('post:updated', { id: post._id, aiScore: newScore })
  }
}
```

---

## 3. Natural Language Search

```ts
const searchPrompt = `
Parse this natural language query into a filter for a crisis coordination app.
Return ONLY valid JSON.

Query: "${userQuery}"

Return:
{
  "category": <"water"|"food"|"medical"|"shelter"|"rescue"|"other"|null>,
  "type": <"need"|"offer"|null>,
  "priority": <"critical"|"high"|"medium"|"low"|null>,
  "keywords": [<up to 3 keywords>]
}

Examples:
"water near me"       → { category: "water", type: null, priority: null, keywords: ["water"] }
"urgent medical help" → { category: "medical", type: null, priority: "critical", keywords: ["urgent","medical"] }
"elderly alone"       → { category: null, type: "need", priority: "high", keywords: ["elderly","alone"] }
`
```

---

## 4. Crisis Briefing (Text)

```ts
const briefingPrompt = `
You are an emergency coordinator. Write a situational briefing (under 150 words) 
for these open crisis reports in the same area.

Include:
- How many critical posts and what categories
- Any obvious need+offer match that hasn't been made
- The single most urgent action right now

Posts: ${JSON.stringify(visiblePosts.slice(0, 20))}

Write in plain, calm, professional language. No bullet points. Paragraph form.
`
```

---

## 5. ElevenLabs — Voice Features

Install:
```bash
npm install elevenlabs   # official SDK
```

### 5.1 Voice Crisis Briefing (TTS)

After Claude generates the briefing text, pass it to ElevenLabs and stream audio to the client.

```ts
// ai.service.ts
async generateVoiceBriefing(text: string): Promise<Buffer> {
  const response = await this.elevenlabs.textToSpeech.convert(
    process.env.ELEVENLABS_VOICE_ID,  // use a calm, clear voice
    {
      text,
      model_id: 'eleven_turbo_v2',     // fastest model
      voice_settings: {
        stability: 0.65,
        similarity_boost: 0.80,
        style: 0.2,                    // slight urgency, not robotic
      }
    }
  )
  return Buffer.from(await response.arrayBuffer())
}
```

```ts
// ai.controller.ts
@Post('briefing/voice')
@UseGuards(JwtAuthGuard)
async getVoiceBriefing(@Body() dto: BriefingDto, @Res() res: Response) {
  const text = await this.aiService.generateBriefing(dto.postIds)
  const audio = await this.aiService.generateVoiceBriefing(text)
  res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': audio.length })
  res.send(audio)
}
```

Client plays it:
```ts
const res = await api.post('/ai/briefing/voice', { postIds })
const blob = new Blob([res.data], { type: 'audio/mpeg' })
const url = URL.createObjectURL(blob)
new Audio(url).play()
```

### 5.2 Voice Post Submission (STT)

```ts
// ai.controller.ts
@Post('voice-post')
@UseGuards(JwtAuthGuard)
@UseInterceptors(FileInterceptor('audio'))
async voicePost(@UploadedFile() file: Express.Multer.File) {
  // Step 1: ElevenLabs STT
  const transcript = await this.elevenlabs.speechToText.convert({
    audio: file.buffer,
    model_id: 'scribe_v1',
  })

  // Step 2: Claude structures it into post fields
  const structurePrompt = `
    Extract structured crisis post fields from this transcript.
    Return ONLY valid JSON.
    
    Transcript: "${transcript.text}"
    
    Return: {
      "title": <short title max 100 chars>,
      "description": <cleaned full text>,
      "category": <"water"|"food"|"medical"|"shelter"|"rescue"|"other">,
      "peopleAffected": <number or 1 if unclear>,
      "selfReportedUrgency": <"low"|"medium"|"high"|"critical">
    }
  `
  const structured = await this.aiService.callClaude(structurePrompt)
  return JSON.parse(structured)
}
```

### 5.3 Nearby Audio Alert (TTS)

Triggered on map load when a CRITICAL post is within 1km.

```ts
async generateNearbyAlert(post: Post): Promise<Buffer> {
  const distance = calculateDistance(userLocation, post.location)
  const text = `Critical alert nearby: ${post.aiSummary} — ${Math.round(distance * 1000)} meters from you.`
  return this.generateVoiceBriefing(text)
}
```

Play once per session, respect a `alertPlayed` flag in sessionStorage to avoid repeating.

### ElevenLabs Environment Variables

```env
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=...   # pick a calm, clear voice from ElevenLabs voice library
                           # Recommended: "Rachel" or "Adam" — clear and neutral
```

---

## 6. Chat Safety Filter

```ts
const safetyPrompt = `
Is this message appropriate for a crisis coordination platform?
Return ONLY valid JSON.

Flag as unsafe if it contains:
- Phone numbers or email addresses (privacy violation)
- External links (scam risk)
- Hate speech or harassment
- Obvious spam or irrelevant content

Message: "${messageText}"

Return: { "safe": true } OR { "safe": false, "reason": "<brief reason>" }
`
```

If `safe: false` → message blocked, sender sees toast: *"Message blocked — keep contact info off-platform for your safety."*

---

## 7. `ai.service.ts` Full Structure

```ts
@Injectable()
export class AiService {
  private claude: Anthropic
  private elevenlabs: ElevenLabsClient

  constructor() {
    this.claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    this.elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })
  }

  // Claude methods
  async scorePost(post: CreatePostDto): Promise<AiScore>
  async parseSearchQuery(query: string): Promise<SearchFilter>
  async generateBriefing(posts: Post[]): Promise<string>
  async filterMessage(text: string): Promise<SafetyResult>
  async structureVoicePost(transcript: string): Promise<PostFields>

  // ElevenLabs methods  
  async generateVoiceBriefing(text: string): Promise<Buffer>
  async transcribeAudio(audioBuffer: Buffer): Promise<string>
  async generateNearbyAlert(post: Post, distanceKm: number): Promise<Buffer>

  // Shared
  private async callClaude(prompt: string, maxTokens = 300): Promise<string>
}
```
