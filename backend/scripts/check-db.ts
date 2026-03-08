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

  console.log('✅ MONGODB_URI found (not showing for security)');
  
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB\n');

  const db = mongoose.connection.db;
  
  // List all collections
  const collections = await db.listCollections().toArray();
  console.log('📦 Collections:', collections.map(c => c.name).join(', '));
  
  // Count users
  const usersCount = await db.collection('users').countDocuments();
  console.log(`\n👥 Users count: ${usersCount}`);
  
  if (usersCount > 0) {
    const sampleUsers = await db.collection('users').find({}).limit(3).toArray();
    console.log('Sample users:');
    sampleUsers.forEach(u => {
      console.log(`  - ${u.email} | ${u.displayName} | city: ${u.city || 'N/A'} | country: ${u.country || 'N/A'}`);
    });
  }
  
  // Count posts
  const postsCount = await db.collection('posts').countDocuments();
  console.log(`\n📝 Posts count: ${postsCount}`);
  
  if (postsCount > 0) {
    const samplePosts = await db.collection('posts').find({}).limit(3).toArray();
    console.log('Sample posts:');
    samplePosts.forEach(p => {
      console.log(`  - ${p.title} | status: ${p.status} | userId: ${p.userId}`);
    });
  }
  
  // Count conversations
  const conversationsCount = await db.collection('conversations').countDocuments();
  console.log(`\n💬 Conversations count: ${conversationsCount}`);
  
  // Count messages
  const messagesCount = await db.collection('messages').countDocuments();
  console.log(`💬 Messages count: ${messagesCount}`);
  
  await mongoose.disconnect();
}

check().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
