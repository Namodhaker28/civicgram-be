/**
 * One-time migration: copy `likes` documents into `postvotes` as upvotes (value: 1), then drop `likes`.
 * Run from backend-social: `npx tsx scripts/migrate-likes-to-votes.ts`
 */
import mongoose from "mongoose";
import { env } from "../src/lib/env.js";

async function main(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("No database connection");
  }
  const names = await db.listCollections({ name: "likes" }).toArray();
  if (names.length === 0) {
    console.log("No `likes` collection — nothing to migrate.");
    await mongoose.disconnect();
    return;
  }

  const likes = db.collection("likes");
  const postvotes = db.collection("postvotes");

  const count = await likes.countDocuments();
  console.log(`Found ${count} like document(s).`);

  const cursor = likes.find({});
  for await (const doc of cursor) {
    const user = doc.user;
    const post = doc.post;
    if (!user || !post) continue;
    await postvotes.updateOne(
      { user, post },
      { $setOnInsert: { user, post, value: 1 } },
      { upsert: true }
    );
  }

  console.log("Migrated likes into postvotes (value: 1) where not already present.");
  await likes.drop();
  console.log("Dropped collection: likes");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
