import mongoose from "mongoose";
import { env } from "./env.js";
import { User } from "../models/User.js";
import { Post } from "../models/Post.js";
import { PayoutPeriod } from "../models/PayoutPeriod.js";
import { CreatorEarningLine } from "../models/CreatorEarningLine.js";

/** One-time style backfill: legacy posts without moderation default to approved. */
async function backfillPostModeration(): Promise<void> {
  const res = await Post.updateMany(
    { moderationStatus: { $exists: false } },
    { $set: { moderationStatus: "approved" } }
  );
  if (res.modifiedCount > 0) {
    console.log(`Backfill: set moderationStatus=approved on ${res.modifiedCount} post(s)`);
  }
}

/** Grant admin role to users whose email is listed in ADMIN_EMAILS. */
async function syncAdminRolesFromEnv(): Promise<void> {
  const emails = env.ADMIN_EMAILS;
  if (emails.length === 0) return;
  const res = await User.updateMany(
    { email: { $in: emails } },
    { $set: { role: "admin" } }
  );
  if (res.modifiedCount > 0) {
    console.log(`Admin sync: promoted ${res.modifiedCount} user(s) from ADMIN_EMAILS`);
  }
}

/** Connect to MongoDB. Call once at app startup. */
export async function connectDb(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected to MongoDB");
  // Replace stale indexes (e.g. unique walletAddress without partial filter) with schema-defined indexes.
  try {
    const dropped = await User.syncIndexes();
    if (dropped.length) {
      console.log("User indexes synced; dropped:", dropped.join(", "));
    }
  } catch (err) {
    console.error("User.syncIndexes() failed — you may need to drop walletAddress_1 manually:", err);
  }
  try {
    await Post.syncIndexes();
    await PayoutPeriod.syncIndexes();
    await CreatorEarningLine.syncIndexes();
  } catch (err) {
    console.error("Post/Payout syncIndexes() failed:", err);
  }
  await backfillPostModeration();
  await syncAdminRolesFromEnv();
}
