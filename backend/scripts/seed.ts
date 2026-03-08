/**
 * Seed script — inserts 6 demo users and 25 posts at real Vancouver locations.
 * Run with: npx tsx scripts/seed.ts
 *
 * Requires MONGODB_URI in .env
 */
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

/* ── Schemas ── */

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    displayName: { type: String, required: true },
    phone: String,
    city: String,
    country: String,
    location: Object,
    passkeyCredentials: { type: [String], default: [] },
  },
  { timestamps: true },
);

const PostSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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
    claimRequests: [{ type: mongoose.Schema.Types.ObjectId }],
    fulfilledAt: Date,
  },
  { timestamps: true },
);

PostSchema.index({ location: '2dsphere' });

const UserModel = mongoose.model('User', UserSchema);
const PostModel = mongoose.model('Post', PostSchema);

/* ── Seed users ── */

const SEED_USERS = [
  { email: 'alice@demo.com', password: 'demo123', displayName: 'Alice Chen', city: 'Vancouver', country: 'Canada' },
  { email: 'bob@demo.com', password: 'demo123', displayName: 'Bob Martinez', city: 'Burnaby', country: 'Canada' },
  { email: 'carol@demo.com', password: 'demo123', displayName: 'Carol Kim', city: 'Richmond', country: 'Canada' },
  { email: 'dave@demo.com', password: 'demo123', displayName: 'Dave Patel', city: 'North Vancouver', country: 'Canada' },
  { email: 'emma@demo.com', password: 'demo123', displayName: 'Emma Wilson', city: 'New Westminster', country: 'Canada' },
  { email: 'frank@demo.com', password: 'demo123', displayName: 'Frank Li', city: 'Surrey', country: 'Canada' },
];

/* ── Seed posts (userId will be assigned dynamically) ── */

function buildPosts(userIds: mongoose.Types.ObjectId[]) {
  const [alice, bob, carol, dave, emma, frank] = userIds;

  return [
    // ── CRITICAL ──
    {
      userId: alice,
      type: 'need', category: 'water',
      title: 'Family needs clean water urgently',
      description: 'Elderly grandmother in the household. Tap water contaminated after pipe burst. Family of 4 including two children under 5.',
      location: { type: 'Point', coordinates: [-123.1207, 49.2827] },
      neighborhood: 'East Vancouver', urgency: 'critical', aiScore: 92,
      aiSummary: 'Family including elderly grandmother without water for 3 days.',
      peopleAffected: 4, status: 'active',
    },
    {
      userId: carol,
      type: 'need', category: 'rescue',
      title: 'Ground floor flooding rescue',
      description: 'Three people stranded on ground floor, water level rising rapidly. Unable to reach emergency services by phone. One person is elderly with mobility issues.',
      location: { type: 'Point', coordinates: [-123.1362, 49.2204] },
      neighborhood: 'Richmond', urgency: 'critical', aiScore: 99,
      aiSummary: 'Three people stranded in ground floor apartment due to flooding.',
      peopleAffected: 3, status: 'active',
    },
    {
      userId: bob,
      type: 'need', category: 'shelter',
      title: 'Roof collapse displaces families',
      description: 'Partial roof collapse after last night\'s storm. Two families (8 people total) need temporary accommodation. Children ages 2-10.',
      location: { type: 'Point', coordinates: [-123.0878, 49.2945] },
      neighborhood: 'Burnaby', urgency: 'critical', aiScore: 95,
      aiSummary: 'Two families displaced after partial roof collapse.',
      peopleAffected: 8, status: 'active',
    },
    {
      userId: frank,
      type: 'need', category: 'medical',
      title: 'Diabetic needs insulin supply',
      description: 'Type 1 diabetic running out of insulin within 24 hours. Local pharmacy destroyed. Needs emergency insulin delivery.',
      location: { type: 'Point', coordinates: [-122.8490, 49.1900] },
      neighborhood: 'Surrey Central', urgency: 'critical', aiScore: 97,
      aiSummary: 'Diabetic patient at risk of medical emergency without insulin.',
      peopleAffected: 1, status: 'active',
    },

    // ── HIGH ──
    {
      userId: bob,
      type: 'need', category: 'medical',
      title: 'Elderly man needs medication',
      description: 'Cannot leave apartment due to mobility issues. Prescription ready at Shoppers Drug Mart on Broadway. Needs daily heart medication.',
      location: { type: 'Point', coordinates: [-123.1389, 49.2488] },
      neighborhood: 'Kitsilano', urgency: 'high', aiScore: 78,
      aiSummary: 'Elderly resident unable to collect prescription.',
      peopleAffected: 1, status: 'active',
    },
    {
      userId: alice,
      type: 'need', category: 'food',
      title: 'Single mother needs food',
      description: 'Power outage spoiled all stored food. Has a 3-year-old child. Located near Commercial Drive. No car to reach shelters.',
      location: { type: 'Point', coordinates: [-123.0694, 49.2632] },
      neighborhood: 'Commercial Drive', urgency: 'high', aiScore: 88,
      aiSummary: 'Single mother and toddler without food after power outage.',
      peopleAffected: 2, status: 'active',
    },
    {
      userId: dave,
      type: 'need', category: 'shelter',
      title: 'Apartment flooded, family displaced',
      description: 'Ground-level apartment completely flooded. Family of 3 (parents and 6-year-old). Staying temporarily at a coffee shop.',
      location: { type: 'Point', coordinates: [-123.0740, 49.3200] },
      neighborhood: 'North Vancouver', urgency: 'high', aiScore: 82,
      aiSummary: 'Family of 3 displaced by flooding, temporary shelter in coffee shop.',
      peopleAffected: 3, status: 'active',
    },
    {
      userId: carol,
      type: 'need', category: 'water',
      title: 'Seniors home water supply cut',
      description: '15 elderly residents at assisted living facility without running water. Staff trying to source bottled water but running low.',
      location: { type: 'Point', coordinates: [-123.1500, 49.2100] },
      neighborhood: 'Steveston', urgency: 'high', aiScore: 85,
      aiSummary: '15 elderly residents without water at assisted living facility.',
      peopleAffected: 15, status: 'active',
    },
    {
      userId: emma,
      type: 'need', category: 'rescue',
      title: 'Car stranded in floodwater',
      description: 'Vehicle stuck in rising floodwater on Marine Drive. Two adults and a dog inside. Water at door level and rising.',
      location: { type: 'Point', coordinates: [-123.0200, 49.2000] },
      neighborhood: 'Marine Drive', urgency: 'high', aiScore: 90,
      aiSummary: 'Two adults and pet stranded in vehicle surrounded by floodwater.',
      peopleAffected: 2, status: 'active',
    },
    {
      userId: frank,
      type: 'need', category: 'other',
      title: 'Generator needed for medical equipment',
      description: 'Power out for 18 hours. Need a generator to run CPAP machine and oxygen concentrator for elderly parent.',
      location: { type: 'Point', coordinates: [-122.8000, 49.1700] },
      neighborhood: 'Fleetwood', urgency: 'high', aiScore: 80,
      aiSummary: 'Medical equipment dependent on electricity, backup power needed.',
      peopleAffected: 1, status: 'active',
    },

    // ── MEDIUM ──
    {
      userId: emma,
      type: 'need', category: 'food',
      title: 'Food needed for shelter guests',
      description: 'Community shelter at Royal City Centre hosting 30 displaced residents. Running low on food supplies. Any non-perishables welcome.',
      location: { type: 'Point', coordinates: [-122.9100, 49.2000] },
      neighborhood: 'New Westminster', urgency: 'medium', aiScore: 65,
      aiSummary: 'Community shelter running low on food for 30 residents.',
      peopleAffected: 30, status: 'active',
    },
    {
      userId: dave,
      type: 'need', category: 'other',
      title: 'Volunteers needed for sandbag filling',
      description: 'Volunteers needed at Lonsdale Quay to fill and distribute sandbags. Flooding expected to worsen overnight. Tools provided.',
      location: { type: 'Point', coordinates: [-123.0680, 49.3100] },
      neighborhood: 'Lonsdale', urgency: 'medium', aiScore: 55,
      aiSummary: 'Volunteer call for sandbag filling ahead of expected flooding.',
      peopleAffected: 100, status: 'active',
    },
    {
      userId: bob,
      type: 'need', category: 'shelter',
      title: 'Blankets needed for displaced families',
      description: 'Emergency shelter at Burnaby community centre needs blankets, sleeping bags, and warm clothing for about 20 people.',
      location: { type: 'Point', coordinates: [-123.0200, 49.2500] },
      neighborhood: 'Burnaby', urgency: 'medium', aiScore: 60,
      aiSummary: 'Emergency shelter needs warm bedding for 20 displaced people.',
      peopleAffected: 20, status: 'active',
    },

    // ── OFFERS ──
    {
      userId: alice,
      type: 'offer', category: 'food',
      title: '50 hot meals available',
      description: 'Community kitchen on Main St has 50 hot meal portions ready for pickup or delivery within 2km. Vegetarian options available.',
      location: { type: 'Point', coordinates: [-123.1138, 49.2606] },
      neighborhood: 'Mount Pleasant', urgency: 'low', aiScore: 35,
      aiSummary: '50 hot meal portions available from community kitchen.',
      peopleAffected: 50, status: 'active',
    },
    {
      userId: emma,
      type: 'offer', category: 'water',
      title: '200 water bottles for pickup',
      description: '200 sealed 1L water bottles at community depot. Available for pickup 8am-8pm or arranged delivery for elderly/disabled.',
      location: { type: 'Point', coordinates: [-123.005, 49.2575] },
      neighborhood: 'New Westminster', urgency: 'low', aiScore: 30,
      aiSummary: '200 sealed water bottles available for pickup at community depot.',
      peopleAffected: 200, status: 'active',
    },
    {
      userId: dave,
      type: 'offer', category: 'shelter',
      title: 'Spare room for 2 nights',
      description: 'Have a spare room for 1-2 displaced people for up to 2 nights. North Vancouver, near transit. Clean linens, private bathroom.',
      location: { type: 'Point', coordinates: [-123.0710, 49.3180] },
      neighborhood: 'North Vancouver', urgency: 'low', aiScore: 40,
      aiSummary: 'Resident offering spare room for displaced persons.',
      peopleAffected: 2, status: 'active',
    },
    {
      userId: carol,
      type: 'offer', category: 'medical',
      title: 'Off-duty nurse available',
      description: 'Registered nurse available for basic medical checks, wound care, and first aid. Can travel within Richmond area. Have first aid supplies.',
      location: { type: 'Point', coordinates: [-123.1400, 49.2150] },
      neighborhood: 'Richmond Centre', urgency: 'low', aiScore: 45,
      aiSummary: 'Off-duty nurse offering medical assistance in Richmond.',
      peopleAffected: 20, status: 'active',
    },
    {
      userId: frank,
      type: 'offer', category: 'other',
      title: 'Pickup truck for deliveries',
      description: 'I have a pickup truck and free time today. Can help transport supplies, furniture, or people to shelters. Serving Surrey/Delta area.',
      location: { type: 'Point', coordinates: [-122.8300, 49.1850] },
      neighborhood: 'Surrey', urgency: 'low', aiScore: 38,
      aiSummary: 'Volunteer with pickup truck offering delivery assistance.',
      peopleAffected: 10, status: 'active',
    },
    {
      userId: bob,
      type: 'offer', category: 'food',
      title: 'Canned food and baby formula',
      description: 'Collection of canned goods (beans, soup, tuna) and 3 cans of baby formula. Pickup in Burnaby or can deliver nearby.',
      location: { type: 'Point', coordinates: [-123.0300, 49.2700] },
      neighborhood: 'Burnaby Heights', urgency: 'low', aiScore: 42,
      aiSummary: 'Canned food and baby formula available in Burnaby.',
      peopleAffected: 5, status: 'active',
    },
    {
      userId: alice,
      type: 'offer', category: 'shelter',
      title: 'Warm clothing donation drop-off',
      description: 'Collecting winter jackets, boots, gloves, and scarves at our garage. Will distribute to shelters. All sizes welcome.',
      location: { type: 'Point', coordinates: [-123.1000, 49.2700] },
      neighborhood: 'Grandview', urgency: 'low', aiScore: 32,
      aiSummary: 'Clothing donation collection for shelter distribution.',
      peopleAffected: 30, status: 'active',
    },
    {
      userId: dave,
      type: 'offer', category: 'water',
      title: 'Water purification tablets',
      description: 'Have 500 water purification tablets. Can purify 500L of water. Free for anyone who needs them. Pickup in North Van.',
      location: { type: 'Point', coordinates: [-123.0650, 49.3150] },
      neighborhood: 'Lower Lonsdale', urgency: 'low', aiScore: 50,
      aiSummary: 'Water purification tablets available for distribution.',
      peopleAffected: 50, status: 'active',
    },
    {
      userId: carol,
      type: 'offer', category: 'rescue',
      title: 'Boat available for rescue ops',
      description: 'Have an inflatable rescue boat with motor. Experienced on water. Can assist with flood rescue in Richmond/Delta area.',
      location: { type: 'Point', coordinates: [-123.1300, 49.2050] },
      neighborhood: 'Steveston', urgency: 'medium', aiScore: 70,
      aiSummary: 'Volunteer with rescue boat available for flood operations.',
      peopleAffected: 10, status: 'active',
    },
    {
      userId: emma,
      type: 'need', category: 'other',
      title: 'Phone charging station needed',
      description: 'Power still out in our block. Many residents unable to charge phones to contact family. Need portable chargers or charging station.',
      location: { type: 'Point', coordinates: [-122.9200, 49.2100] },
      neighborhood: 'Sapperton', urgency: 'medium', aiScore: 55,
      aiSummary: 'Residents need phone charging capability during prolonged outage.',
      peopleAffected: 25, status: 'active',
    },
    {
      userId: frank,
      type: 'need', category: 'food',
      title: 'Halal food needed for families',
      description: 'Several families at temporary shelter need halal food options. Currently only non-halal food available. About 12 people.',
      location: { type: 'Point', coordinates: [-122.8100, 49.1950] },
      neighborhood: 'Newton', urgency: 'medium', aiScore: 62,
      aiSummary: 'Families at shelter require halal food options.',
      peopleAffected: 12, status: 'active',
    },
    {
      userId: alice,
      type: 'need', category: 'medical',
      title: 'First aid supplies running low',
      description: 'Community first aid station at Trout Lake nearly out of bandages, antiseptic, and gauze. Seeing 20+ minor injuries per day.',
      location: { type: 'Point', coordinates: [-123.0650, 49.2550] },
      neighborhood: 'Trout Lake', urgency: 'medium', aiScore: 68,
      aiSummary: 'First aid station depleted, serving 20+ injuries daily.',
      peopleAffected: 20, status: 'active',
    },
  ];
}

/* ── Main ── */

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // Clear previous seed data
  const seedEmails = SEED_USERS.map((u) => u.email);
  const existingUsers = await UserModel.find({ email: { $in: seedEmails } });
  const existingIds = existingUsers.map((u: any) => u._id);

  if (existingIds.length > 0) {
    await PostModel.deleteMany({ userId: { $in: existingIds } });
    await UserModel.deleteMany({ email: { $in: seedEmails } });
    console.log('Cleared previous seed users and their posts');
  }

  // Also clear posts without userId (from old seed)
  await PostModel.deleteMany({ userId: { $exists: false } });

  // Hash password once (all users share the same demo password)
  const hashedPassword = await bcrypt.hash('demo123', 12);

  // Create users
  const createdUsers = await UserModel.insertMany(
    SEED_USERS.map((u) => ({
      ...u,
      password: hashedPassword,
      location: { type: 'Point', coordinates: [-123.1, 49.25] },
    })),
  );
  const userIds = createdUsers.map((u: any) => u._id);
  console.log(`Created ${createdUsers.length} seed users`);

  // Create posts
  const posts = buildPosts(userIds);
  const createdPosts = await PostModel.insertMany(posts);
  console.log(`Created ${createdPosts.length} seed posts`);

  console.log('\nSeed users (all password: demo123):');
  SEED_USERS.forEach((u) => console.log(`  ${u.email} — ${u.displayName}`));

  await mongoose.disconnect();
  console.log('\nDone.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
