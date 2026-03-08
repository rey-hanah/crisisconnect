import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);
  
  const db = mongoose.connection.db;
  
  // Find the latest user
  const latestUser = await db.collection('users').find({}).sort({ createdAt: -1 }).limit(1).toArray();
  
  if (latestUser.length > 0) {
    const user = latestUser[0];
    console.log('Latest user:');
    console.log(JSON.stringify(user, null, 2));
  }
  
  await mongoose.disconnect();
}

check().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
