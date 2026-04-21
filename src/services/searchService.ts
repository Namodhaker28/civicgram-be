import { User, Post } from "../models/index.js";
import { toAuthorJson } from "./userService.js";
import { formatPost } from "./postService.js";

/** Search users by username or name. */
export async function searchUsers(
  q: string,
  currentUserId: string | null,
  limit: number = 20
): Promise<Record<string, unknown>[]> {
  if (!q || q.trim().length === 0) return [];
  const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const users = await User.find({
    $or: [{ username: regex }, { name: regex }, { email: regex }, { mobile: regex }],
  })
    .limit(limit)
    .lean();
  return users.map((u) => ({
    id: u._id,
    walletAddress: u.walletAddress,
    username: u.username,
    name: u.name,
    avatarUrl: u.avatarUrl,
    isVerified: u.isVerified,
  }));
}

/** Search posts by content or hashtags. */
export async function searchPosts(
  q: string,
  currentUserId: string | null,
  limit: number = 20
): Promise<Record<string, unknown>[]> {
  if (!q || q.trim().length === 0) return [];
  const term = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const isTag = term.startsWith("#");
  const searchTerm = isTag ? term.slice(1) : term;
  const regex = new RegExp(searchTerm, "i");
  const query = isTag
    ? { tags: regex, isArchived: false, moderationStatus: "approved" as const }
    : {
        $or: [{ content: regex }, { tags: regex }],
        isArchived: false,
        moderationStatus: "approved" as const,
      };
  const posts = await Post.find(query).sort({ createdAt: -1 }).limit(limit).lean();
  return Promise.all(posts.map((p) => formatPost(p as unknown as Parameters<typeof formatPost>[0], currentUserId)));
}

/** Search hashtags (from post tags). */
export async function searchHashtags(q: string, limit: number = 10): Promise<{ tag: string; count: number }[]> {
  if (!q || q.trim().length === 0) return [];
  const regex = new RegExp("^" + q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const agg = await Post.aggregate([
    { $match: { isArchived: false, moderationStatus: "approved" } },
    { $unwind: "$tags" },
    { $match: { tags: regex } },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { tag: "$_id", count: 1, _id: 0 } },
  ]);
  return agg;
}
