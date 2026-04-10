import { Follow, User, Block } from "../models/index.js";
import { toUserJson } from "./userService.js";

/** Follow a user. */
export async function follow(followerId: string, followingId: string): Promise<boolean> {
  if (followerId === followingId) return false;
  await Follow.findOneAndUpdate(
    { follower: followerId, following: followingId },
    { follower: followerId, following: followingId },
    { upsert: true }
  );
  return true;
}

/** Unfollow a user. */
export async function unfollow(followerId: string, followingId: string): Promise<boolean> {
  const result = await Follow.deleteOne({
    follower: followerId,
    following: followingId,
  });
  return result.deletedCount > 0;
}

/** Get followers of a user. */
export async function getFollowers(userId: string): Promise<Record<string, unknown>[]> {
  const follows = await Follow.find({ following: userId }).populate("follower").lean();
  return follows.map((f) => toUserJson((f as unknown as { follower: InstanceType<typeof User> }).follower));
}

/** Get users that a user follows. */
export async function getFollowing(userId: string): Promise<Record<string, unknown>[]> {
  const follows = await Follow.find({ follower: userId }).populate("following").lean();
  return follows.map((f) => toUserJson((f as unknown as { following: InstanceType<typeof User> }).following));
}

/** Get suggested users to follow (not yet followed, not blocked, limit). */
export async function getSuggestions(
  userId: string,
  limit: number = 10
): Promise<Record<string, unknown>[]> {
  const following = await Follow.find({ follower: userId }).select("following");
  const followingIds = following.map((f) => String(f.following));
  const blocked = await Block.find({ blocker: userId }).select("blocked");
  const blockedIds = blocked.map((b) => String(b.blocked));
  const exclude = [...new Set([userId, ...followingIds, ...blockedIds])];
  const users = await User.find({ _id: { $nin: exclude } })
    .limit(limit * 2)
    .lean();
  const shuffled = [...users].sort(() => Math.random() - 0.5).slice(0, limit);
  return shuffled.map((u) => toUserJson(u as Record<string, unknown>));
}
