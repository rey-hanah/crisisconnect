import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);
  
  const db = mongoose.connection.db;
  
  console.log('=== All Conversations ===');
  const convs = await db.collection('conversations').find({}).toArray();
  
  if (convs.length === 0) {
    console.log('No conversations found');
  } else {
    for (const conv of convs) {
      console.log(`\nConversation ${conv._id}`);
      console.log(`  Participant 1: ${conv.participant1}`);
      console.log(`  Participant 2: ${conv.participant2}`);
      console.log(`  Last message: ${conv.lastMessage || 'N/A'}`);
      console.log(`  Last message at: ${conv.lastMessageAt || 'N/A'}`);
    }
  }
  
  console.log('\n=== All Messages ===');
  const msgs = await db.collection('messages').find({}).toArray();
  
  if (msgs.length === 0) {
    console.log('No messages found');
  } else {
    msgs.forEach(msg => {
      console.log(`\nMessage ${msg._id}`);
      console.log(`  Conversation: ${msg.conversationId}`);
      console.log(`  Sender: ${msg.senderId}`);
      console.log(`  Content: ${msg.content}`);
    });
  }
  
  await mongoose.disconnect();
}

check().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
