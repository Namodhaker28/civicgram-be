import { Block, User } from "../models/index.js";
import { toUserJson } from "./userService.js";

/** Block a user. */
export async function blockUser(blockerId: string, blockedId: string): Promise<boolean> {
  if (blockerId === blockedId) return false;
  await Block.findOneAndUpdate(
    { blocker: blockerId, blocked: blockedId },
    { blocker: blockerId, blocked: blockedId },
    { upsert: true }
  );
  return true;
}

/** Unblock a user. */
export async function unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
  const result = await Block.deleteOne({ blocker: blockerId, blocked: blockedId });
  return result.deletedCount > 0;
}

/** List blocked users. */
export async function listBlocked(blockerId: string): Promise<Record<string, unknown>[]> {
  const blocks = await Block.find({ blocker: blockerId }).populate("blocked").lean();
  return blocks.map((b) => toUserJson((b as unknown as { blocked: InstanceType<typeof User> }).blocked));
}
