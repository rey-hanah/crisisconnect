/**
 * Migration: merge duplicate conversations (one per user pair).
 * For each duplicate group: keep the earliest conversation, re-point all
 * messages from duplicates to it, then delete the duplicates.
 */
import 'dotenv/config';
import mongoose, { Types } from 'mongoose';

const MONGO_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/crisisconnect';

async function run() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db!;
  const convs = db.collection('conversations');
  const msgs = db.collection('messages');

  const all = await convs.find({}).toArray();
  console.log(`Total conversations: ${all.length}`);

  // Group by canonical pair key (smaller id first)
  const groups = new Map<string, typeof all>();
  for (const c of all) {
    const ids = [c.participant1.toString(), c.participant2.toString()].sort();
    const key = ids.join(':');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  let merged = 0;
  for (const [key, group] of groups) {
    if (group.length <= 1) continue;

    // Keep the oldest; merge the rest into it
    group.sort(
      (a, b) =>
        new Date(a.createdAt ?? 0).getTime() -
        new Date(b.createdAt ?? 0).getTime(),
    );
    const keeper = group[0];
    const dupes = group.slice(1);
    const dupeIds = dupes.map((d) => d._id);

    console.log(
      `Merging pair ${key}: keeping ${keeper._id}, removing ${dupeIds.join(', ')}`,
    );

    // Re-point messages
    const result = await msgs.updateMany(
      { conversationId: { $in: dupeIds } },
      { $set: { conversationId: keeper._id } },
    );
    console.log(`  Moved ${result.modifiedCount} messages`);

    // Re-compute lastMessage on keeper from its (now expanded) messages
    const lastMsg = await msgs
      .find({ conversationId: keeper._id })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();
    if (lastMsg.length) {
      await convs.updateOne(
        { _id: keeper._id },
        {
          $set: {
            lastMessage: lastMsg[0].content,
            lastMessageAt: lastMsg[0].createdAt,
            lastMessageBy: lastMsg[0].senderId,
          },
          $unset: { postId: '' },
        },
      );
    } else {
      await convs.updateOne({ _id: keeper._id }, { $unset: { postId: '' } });
    }

    // Remove dupes
    await convs.deleteMany({ _id: { $in: dupeIds } });
    merged += dupeIds.length;
  }

  // Also strip postId from all remaining conversations
  await convs.updateMany({}, { $unset: { postId: '' } });

  console.log(`\nDone. Removed ${merged} duplicate conversation(s).`);
  console.log(`Remaining conversations: ${await convs.countDocuments()}`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
