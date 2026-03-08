/**
 * Seed script — inserts 8 demo posts at real Vancouver locations.
 * Run with: npx ts-node scripts/seed.ts
 * Or after build: node -e "require('./dist/scripts/seed')"
 *
 * Requires MONGODB_URI in .env
 */
import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const PostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: false },
  type: String,
  category: String,
  title: String,
  description: String,
  location: Object,
  neighborhood: String,
  aiScore: { type: Number, default: 0 },
  aiSummary: String,
  urgency: { type: String, default: 'medium' },
  peopleAffected: { type: Number, default: 1 },
  photos: [String],
  status: { type: String, default: 'active' },
  claimedBy: { type: mongoose.Schema.Types.ObjectId },
  fulfilledAt: Date,
}, { timestamps: true });

PostSchema.index({ location: '2dsphere' });

const PostModel = mongoose.model('Post', PostSchema);

const SEED_POSTS = [
  {
    type: 'need',
    category: 'water',
    title: 'Family of 4 — no clean water for 3 days',
    description: 'Elderly grandmother in the household. Tap water is contaminated after the pipe burst.',
    location: { type: 'Point', coordinates: [-123.1207, 49.2827] },
    neighborhood: 'East Vancouver',
    urgency: 'critical',
    aiScore: 92,
    aiSummary: 'Family including elderly grandmother without water for 3 days — urgent.',
    peopleAffected: 4,
    status: 'active',
  },
  {
    type: 'need',
    category: 'medical',
    title: 'Elderly man needs medication pickup',
    description: 'Cannot leave the apartment due to mobility issues. Prescription is ready at Shoppers Drug Mart on Broadway.',
    location: { type: 'Point', coordinates: [-123.1389, 49.2488] },
    neighborhood: 'Kitsilano',
    urgency: 'high',
    aiScore: 78,
    aiSummary: 'Elderly resident unable to collect prescription — mobility limited.',
    peopleAffected: 1,
    status: 'active',
  },
  {
    type: 'offer',
    category: 'food',
    title: 'Hot meals available — 50 portions',
    description: 'Community kitchen on Main St has 50 hot meal portions ready for pickup or delivery within 2km.',
    location: { type: 'Point', coordinates: [-123.1138, 49.2606] },
    neighborhood: 'Mount Pleasant',
    urgency: 'low',
    aiScore: 35,
    aiSummary: 'Provider offering 50 hot meal portions from community kitchen.',
    peopleAffected: 50,
    status: 'active',
  },
  {
    type: 'need',
    category: 'shelter',
    title: 'Roof collapse — 2 families displaced',
    description: 'Partial roof collapse after last night\'s storm. Two families (8 people total) need temporary accommodation.',
    location: { type: 'Point', coordinates: [-123.0878, 49.2945] },
    neighborhood: 'Burnaby',
    urgency: 'critical',
    aiScore: 95,
    aiSummary: 'Two families displaced after partial roof collapse — need temporary shelter.',
    peopleAffected: 8,
    status: 'claimed',
  },
  {
    type: 'need',
    category: 'rescue',
    title: 'Flood rescue needed — ground floor',
    description: 'Three people stranded on ground floor, water level rising. Unable to reach emergency services.',
    location: { type: 'Point', coordinates: [-123.1362, 49.2204] },
    neighborhood: 'Richmond',
    urgency: 'critical',
    aiScore: 99,
    aiSummary: 'Three people stranded in ground floor apartment due to flooding.',
    peopleAffected: 3,
    status: 'active',
  },
  {
    type: 'offer',
    category: 'water',
    title: 'Water bottles — 200 units available',
    description: '200 sealed 1L water bottles at community depot. Available for pickup or arranged delivery.',
    location: { type: 'Point', coordinates: [-123.005, 49.2575] },
    neighborhood: 'New Westminster',
    urgency: 'low',
    aiScore: 30,
    aiSummary: '200 sealed water bottles available for pickup at community depot.',
    peopleAffected: 200,
    status: 'active',
  },
  {
    type: 'need',
    category: 'food',
    title: 'Single mother — no food for 2 days',
    description: 'Power outage spoiled all stored food. Has a 3-year-old child. Located near Commercial Drive.',
    location: { type: 'Point', coordinates: [-123.0694, 49.2632] },
    neighborhood: 'Commercial Drive',
    urgency: 'high',
    aiScore: 88,
    aiSummary: 'Single mother and toddler without food after power outage spoiled supplies.',
    peopleAffected: 2,
    status: 'active',
  },
  {
    type: 'offer',
    category: 'shelter',
    title: 'Spare room available — 2 nights',
    description: 'Have a spare room for 1-2 displaced people for up to 2 nights. North Vancouver, near transit.',
    location: { type: 'Point', coordinates: [-123.0740, 49.3200] },
    neighborhood: 'North Vancouver',
    urgency: 'low',
    aiScore: 40,
    aiSummary: 'Resident offering spare room for displaced persons for 2 nights.',
    peopleAffected: 2,
    status: 'active',
  },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // Remove existing seed data (no userId = seeded)
  await PostModel.deleteMany({ userId: { $exists: false } });
  console.log('Cleared previous seed posts');

  const inserted = await PostModel.insertMany(SEED_POSTS);
  console.log(`Inserted ${inserted.length} seed posts`);

  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
