import { Bookmark, Post, User } from "../models/index.js";
import { formatPost } from "./postService.js";

/** Toggle bookmark. Returns { bookmarked: boolean }. */
export async function toggleBookmark(
  userId: string,
  postId: string
): Promise<{ bookmarked: boolean }> {
  const existing = await Bookmark.findOne({ user: userId, post: postId });
  if (existing) {
    await Bookmark.deleteOne({ _id: existing._id });
    return { bookmarked: false };
  }
  await Bookmark.create({ user: userId, post: postId });
  return { bookmarked: true };
}

/** List bookmarked posts for user. */
export async function listBookmarks(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ posts: Record<string, unknown>[]; hasMore: boolean }> {
  const skip = (page - 1) * limit;
  const bookmarks = await Bookmark.find({ user: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit + 1)
    .populate("post")
    .lean();
  const hasMore = bookmarks.length > limit;
  const posts = bookmarks
    .slice(0, limit)
    .map((b) => (b as unknown as { post: InstanceType<typeof Post> }).post)
    .filter(Boolean);
  const formatted = await Promise.all(posts.map((p) => formatPost(p as unknown as Parameters<typeof formatPost>[0], userId)));
  return { posts: formatted, hasMore };
}
