import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('❌ MONGODB_URI not found in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB\n');

  const db = mongoose.connection.db;
  
  // Check for seed users
  const seedEmails = [
    'alice@demo.com',
    'bob@demo.com', 
    'carol@demo.com',
    'dave@demo.com',
    'emma@demo.com',
    'frank@demo.com'
  ];
  
  console.log('🔍 Checking for seed users...\n');
  
  for (const email of seedEmails) {
    const user = await db.collection('users').findOne({ email });
    if (user) {
      console.log(`✅ ${email} EXISTS`);
      console.log(`   displayName: ${user.displayName}`);
      console.log(`   city: ${user.city || 'MISSING'}`);
      console.log(`   country: ${user.country || 'MISSING'}`);
      console.log(`   location: ${user.location ? 'YES' : 'MISSING'}`);
      console.log('');
    } else {
      console.log(`❌ ${email} NOT FOUND`);
    }
  }
  
  // Check all users
  console.log('\n📋 All users in DB:');
  const allUsers = await db.collection('users').find({}).toArray();
  allUsers.forEach(u => {
    console.log(`  ${u.email} | ${u.displayName} | city: ${u.city || 'N/A'} | country: ${u.country || 'N/A'}`);
  });
  
  await mongoose.disconnect();
}

check().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
