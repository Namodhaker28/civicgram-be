import mongoose from "mongoose";
import { Post } from "../models/index.js";
import { formatPost } from "./postService.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/** Paginated posts awaiting moderation (oldest first). */
export async function listPendingQueue(page: number = 1, limit: number = DEFAULT_LIMIT) {
  const p = Math.max(1, page);
  const lim = Math.min(MAX_LIMIT, Math.max(1, limit));
  const skip = (p - 1) * lim;
  const posts = await Post.find({ moderationStatus: "pending", isArchived: false })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(lim + 1)
    .lean();
  const hasMore = posts.length > lim;
  const slice = posts.slice(0, lim);
  const formatted = await Promise.all(
    slice.map((doc) => formatPost(doc as unknown as Parameters<typeof formatPost>[0], null, true))
  );
  return { posts: formatted, hasMore };
}

/** Approve a post. */
export async function approvePost(postId: string, adminUserId: string) {
  const post = await Post.findById(postId);
  if (!post) {
    const err = new Error("Post not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  post.moderationStatus = "approved";
  post.reviewedAt = new Date();
  post.reviewedBy = new mongoose.Types.ObjectId(adminUserId);
  post.rejectionReason = "";
  await post.save();
  return formatPost(post as unknown as Parameters<typeof formatPost>[0], null, true);
}

/** Reject a post with optional reason shown to the author. */
export async function rejectPost(postId: string, adminUserId: string, reason: string) {
  const post = await Post.findById(postId);
  if (!post) {
    const err = new Error("Post not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  post.moderationStatus = "rejected";
  post.reviewedAt = new Date();
  post.reviewedBy = new mongoose.Types.ObjectId(adminUserId);
  post.rejectionReason = reason.slice(0, 2000);
  await post.save();
  return formatPost(post as unknown as Parameters<typeof formatPost>[0], null, true);
}
