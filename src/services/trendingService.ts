import { Post } from "../models/index.js";
import { formatPost } from "./postService.js";

/** Only posts from the last N days count toward trending hashtags. */
export const TRENDING_HASHTAG_DAYS = 30;

/** Trending tags by usage count in posts (non-archived, last {@link TRENDING_HASHTAG_DAYS} days). */
export async function getTrendingTags(limit: number = 10): Promise<{ tag: string; count: number }[]> {
  const since = new Date(Date.now() - TRENDING_HASHTAG_DAYS * 24 * 60 * 60 * 1000);
  const agg = await Post.aggregate([
    { $match: { isArchived: false, createdAt: { $gte: since } } },
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { tag: "$_id", count: 1, _id: 0 } },
  ]);
  return agg;
}

/** Trending posts by like count (or engagement). */
export async function getTrendingPosts(
  currentUserId: string | null,
  limit: number = 20
): Promise<Record<string, unknown>[]> {
  const agg = await Post.aggregate([
    { $match: { isArchived: false } },
    { $lookup: { from: "likes", localField: "_id", foreignField: "post", as: "likeCount" } },
    { $addFields: { likesCount: { $size: "$likeCount" } } },
    { $sort: { likesCount: -1, createdAt: -1 } },
    { $limit: limit },
  ]);
  return Promise.all(agg.map((p) => formatPost(p as unknown as Parameters<typeof formatPost>[0], currentUserId)));
}
