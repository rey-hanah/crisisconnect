# Data Model

MongoDB collections. All schemas use Mongoose.

---

## Users

```ts
// user.schema.ts
@Schema({ timestamps: true })
export class User {
  @Prop({ unique: true, sparse: true })
  email?: string

  @Prop({ unique: true, sparse: true })
  phone?: string

  @Prop({ required: true })
  displayName: string

  @Prop({ required: true })
  passwordHash: string

  @Prop({ required: true })
  country: string

  @Prop({ default: 25 })
  responseRadius: number  // km

  @Prop({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  })
  location: { type: string; coordinates: number[] }
}
```

**Index:** `location` as `2dsphere` for geospatial queries.

> Phone and email are **never returned** in any API response that goes to another user. Use a DTO that excludes them.

---

## Posts

```ts
// post.schema.ts
@Schema({ timestamps: true })
export class Post {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId

  @Prop({ enum: ['need', 'offer'], required: true })
  type: string

  @Prop({ enum: ['water','food','medical','shelter','rescue','other'], required: true })
  category: string

  @Prop({ required: true, maxlength: 120 })
  title: string

  @Prop({ required: true })
  description: string

  @Prop({ type: [String], default: [] })
  photos: string[]  // storage URLs

  @Prop({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  })
  location: { type: string; coordinates: number[] }

  @Prop()
  locationLabel: string  // "East Vancouver" — reverse geocoded

  @Prop({ default: 1 })
  peopleAffected: number

  @Prop({ enum: ['low','medium','high','critical'], default: 'medium' })
  selfReportedUrgency: string

  @Prop({ enum: ['open','claimed','fulfilled'], default: 'open' })
  status: string

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  claimedBy: Types.ObjectId | null

  // AI fields — populated async after submission
  @Prop({ default: 50 })
  aiScore: number

  @Prop({ enum: ['critical','high','medium','low','offer'], default: 'medium' })
  aiPriority: string

  @Prop({ default: '' })
  aiSummary: string

  @Prop({ default: 0 })
  aiConfidence: number

  @Prop({ type: [String], default: [] })
  aiTags: string[]

  @Prop()
  lastScoredAt: Date

  @Prop()
  respondedAt: Date
}
```

**Indexes:**
- `location` → `2dsphere`
- `aiScore` → descending (default sort)
- `status` + `aiScore` → compound (feed queries)

---

## Conversations

```ts
@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  postId: Types.ObjectId

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], required: true })
  participants: Types.ObjectId[]  // always exactly 2

  @Prop({ default: null })
  lastMessageAt: Date
}
```

---

## Messages

```ts
@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId

  @Prop({ required: true, maxlength: 1000 })
  text: string

  @Prop({ default: null })
  readAt: Date | null
}
```

---

## Seed Data (for demo)

```ts
// seed/seed.ts — run with: npx ts-node src/seed/seed.ts

const LOCATIONS = {
  eastVan:   { coordinates: [-123.069, 49.279] },
  downtown:  { coordinates: [-123.121, 49.282] },
  surrey:    { coordinates: [-122.845, 49.187] },
  burnaby:   { coordinates: [-122.980, 49.248] },
  richmond:  { coordinates: [-123.137, 49.167] },
}

const SEED_POSTS = [
  {
    type: 'need', category: 'water',
    title: 'Family of 5 — no water for 2 days',
    description: 'We have a baby at home and have not had clean water since Tuesday morning. Please help.',
    location: { type: 'Point', ...LOCATIONS.eastVan },
    locationLabel: 'East Vancouver',
    peopleAffected: 5,
    selfReportedUrgency: 'critical',
    aiScore: 94, aiPriority: 'critical',
    aiSummary: 'Family of 5 including infant without water for 2+ days — critical.',
  },
  // ... 7 more posts
]
```
