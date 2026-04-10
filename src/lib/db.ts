import mongoose from "mongoose";
import { env } from "./env.js";
import { User } from "../models/User.js";

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
}
