import mongoose from "mongoose";
import { Post, Follow, Block } from "../models/index.js";
import { formatPost } from "./postService.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/** Get blocked user IDs for a user. */
async function getBlockedIds(userId: string): Promise<mongoose.Types.ObjectId[]> {
  const blocks = await Block.find({ blocker: userId }).select("blocked");
  return blocks.map((b) => b.blocked as mongoose.Types.ObjectId);
}

/** For You feed: recent posts from everyone, excluding blocked users. */
export async function getForYouFeed(
  currentUserId: string,
  page: number = DEFAULT_PAGE,
  limit: number = DEFAULT_LIMIT
): Promise<{ posts: Record<string, unknown>[]; hasMore: boolean }> {
  const blocked = await getBlockedIds(currentUserId);
  const skip = (Math.max(1, page) - 1) * Math.min(MAX_LIMIT, Math.max(1, limit));
  const take = Math.min(MAX_LIMIT, Math.max(1, limit)) + 1;
  const query: Record<string, unknown> = {
    isArchived: false,
    moderationStatus: "approved",
  };
  if (blocked.length > 0) query.author = { $nin: blocked };
  const posts = await Post.find(query).sort({ createdAt: -1 }).skip(skip).limit(take).lean();
  const hasMore = posts.length > take - 1;
  const slice = posts.slice(0, take - 1);
  const formatted = await Promise.all(slice.map((p) => formatPost(p as unknown as Parameters<typeof formatPost>[0], currentUserId)));
  return { posts: formatted, hasMore };
}

/** Following feed: posts only from users the current user follows, excluding blocked. */
export async function getFollowingFeed(
  currentUserId: string,
  page: number = DEFAULT_PAGE,
  limit: number = DEFAULT_LIMIT
): Promise<{ posts: Record<string, unknown>[]; hasMore: boolean }> {
  const blocked = await getBlockedIds(currentUserId);
  const follows = await Follow.find({ follower: currentUserId }).select("following");
  const followingIds = follows.map((f) => String(f.following));
  if (followingIds.length === 0) return { posts: [], hasMore: false };
  const blockedStr = blocked.map((b) => String(b));
  const allowed = followingIds.filter((id) => !blockedStr.includes(id));
  if (allowed.length === 0) return { posts: [], hasMore: false };
  const skip = (Math.max(1, page) - 1) * Math.min(MAX_LIMIT, Math.max(1, limit));
  const take = Math.min(MAX_LIMIT, Math.max(1, limit)) + 1;
  const posts = await Post.find({
    author: { $in: allowed },
    isArchived: false,
    moderationStatus: "approved",
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(take)
    .lean();
  const hasMore = posts.length > take - 1;
  const slice = posts.slice(0, take - 1);
  const formatted = await Promise.all(slice.map((p) => formatPost(p as unknown as Parameters<typeof formatPost>[0], currentUserId)));
  return { posts: formatted, hasMore };
}
