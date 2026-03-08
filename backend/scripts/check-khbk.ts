import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);
  
  const db = mongoose.connection.db;
  
  const khbk = await db.collection('users').findOne({ displayName: 'khbk' });
  
  if (khbk) {
    console.log('khbk user:');
    console.log(`  ID: ${khbk._id}`);
    console.log(`  Email: ${khbk.email}`);
    console.log(`  DisplayName: ${khbk.displayName}`);
    
    // Check conversations involving this user
    console.log('\nConversations involving khbk:');
    const convs = await db.collection('conversations').find({
      $or: [
        { participant1: khbk._id },
        { participant2: khbk._id }
      ]
    }).toArray();
    
    if (convs.length === 0) {
      console.log('  No conversations found');
    } else {
      convs.forEach(c => {
        console.log(`  - Conversation ${c._id}`);
      });
    }
  }
  
  await mongoose.disconnect();
}

check().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
