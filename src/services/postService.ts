import { Post, PostVote, Comment, Bookmark, User, Block } from "../models/index.js";
import { toAuthorJson } from "./userService.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export type ModerationStatus = "pending" | "approved" | "rejected";

/** Extract hashtags from text (e.g. #Web3 #NFT). */
export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w]+/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

/** Normalize user input for tag queries (matches stored tags: no #, lowercase). */
export function normalizeTagInput(raw: string): string {
  return raw.trim().replace(/^#+/, "").toLowerCase();
}

/** Get list of blocked user IDs for a user. */
async function getBlockedIds(userId: string): Promise<string[]> {
  const blocks = await Block.find({ blocker: userId }).select("blocked");
  return blocks.map((b) => String(b.blocked));
}

/** Whether the viewer may load this post (not considering archive — caller handles archive). */
export function canViewModeration(
  moderationStatus: ModerationStatus | undefined,
  authorId: string,
  viewerUserId: string | null,
  viewerIsAdmin: boolean
): boolean {
  const status = moderationStatus ?? "approved";
  if (status === "approved") return true;
  if (viewerIsAdmin) return true;
  if (viewerUserId && authorId === viewerUserId) return true;
  return false;
}

/** Format a post for API response (with author, counts, votes, isBookmarked). */
export async function formatPost(
  post: {
    _id: unknown;
    author: unknown;
    content?: string;
    imageUrls?: string[];
    videoUrl?: string | null;
    isArchived?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    tags?: string[];
    moderationStatus?: ModerationStatus;
    reviewedAt?: Date | null;
    rejectionReason?: string;
  },
  currentUserId: string | null,
  viewerIsAdmin: boolean = false
): Promise<Record<string, unknown>> {
  const author = await User.findById(post.author);
  const postId = post._id;
  const authorId = String(post.author);
  const mod = (post.moderationStatus ?? "approved") as ModerationStatus;
  const isAuthor = !!(currentUserId && authorId === currentUserId);
  const showRejection = isAuthor || viewerIsAdmin;

  const [upvotes, downvotes, commentsCount, bookmarkExists, userVoteDoc] = await Promise.all([
    PostVote.countDocuments({ post: postId, value: 1 }),
    PostVote.countDocuments({ post: postId, value: -1 }),
    Comment.countDocuments({ post: post._id }),
    currentUserId
      ? Bookmark.exists({ user: currentUserId, post: postId })
      : Promise.resolve(null),
    currentUserId
      ? PostVote.findOne({ user: currentUserId, post: postId }).select("value").lean()
      : Promise.resolve(null),
  ]);
  const uv = (userVoteDoc as unknown as { value?: number } | null)?.value;
  const userVote: 1 | -1 | 0 = uv === 1 || uv === -1 ? uv : 0;
  const base: Record<string, unknown> = {
    id: post._id,
    content: post.content ?? "",
    imageUrls: post.imageUrls ?? [],
    imageUrl: (post.imageUrls ?? [])[0] ?? null,
    videoUrl: post.videoUrl ?? null,
    isArchived: post.isArchived ?? false,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: author ? toAuthorJson(author as InstanceType<typeof User>) : null,
    upvotes,
    downvotes,
    userVote,
    comments: commentsCount,
    isBookmarked: !!bookmarkExists,
    tags: post.tags ?? [],
    moderationStatus: mod,
    reviewedAt: post.reviewedAt ?? null,
  };
  if (showRejection) {
    base.rejectionReason = post.rejectionReason ?? "";
  }
  return base;
}

/** Create a new post (starts as pending moderation). */
export async function createPost(
  authorId: string,
  data: { content: string; imageUrls?: string[]; videoUrl?: string | null }
): Promise<InstanceType<typeof Post>> {
  const tags = extractHashtags(data.content);
  const post = await Post.create({
    author: authorId,
    content: data.content,
    imageUrls: data.imageUrls ?? [],
    videoUrl: data.videoUrl ?? null,
    tags,
    moderationStatus: "pending",
  });
  return post;
}

/** Get post by ID (null if not found, archived for non-owner, or non-public moderation). */
export async function getPostById(
  postId: string,
  currentUserId: string | null,
  viewerIsAdmin: boolean = false
): Promise<Record<string, unknown> | null> {
  const post = await Post.findById(postId).populate("author");
  if (!post) return null;
  if (post.isArchived && String(post.author) !== currentUserId) return null;
  const authorId = String(post.author);
  const mod = (post.moderationStatus ?? "approved") as ModerationStatus;
  if (!canViewModeration(mod, authorId, currentUserId, viewerIsAdmin)) return null;
  return formatPost(post as InstanceType<typeof Post>, currentUserId, viewerIsAdmin);
}

/** List posts with optional author / hashtag filter and pagination. Excludes archived unless authorId filter. */
export async function listPosts(
  options: {
    authorId?: string;
    tag?: string;
    page?: number;
    limit?: number;
    includeArchived?: boolean;
    currentUserId?: string | null;
    viewerIsAdmin?: boolean;
  }
): Promise<{ posts: Record<string, unknown>[]; hasMore: boolean }> {
  const page = Math.max(1, options.page ?? DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, options.limit ?? DEFAULT_LIMIT));
  const skip = (page - 1) * limit;
  const query: Record<string, unknown> = {};
  if (options.authorId) query.author = options.authorId;
  if (!options.includeArchived) query.isArchived = false;

  const viewingOwnProfile =
    !!options.authorId &&
    !!options.currentUserId &&
    options.authorId === options.currentUserId;
  const admin = options.viewerIsAdmin ?? false;
  if (!viewingOwnProfile && !admin) {
    query.moderationStatus = "approved";
  } else {
    query.moderationStatus = { $in: ["pending", "approved", "rejected"] };
  }

  if (options.tag != null && String(options.tag).trim() !== "") {
    const normalized = normalizeTagInput(String(options.tag));
    if (!normalized) {
      return { posts: [], hasMore: false };
    }
    query.tags = normalized;
  }
  const posts = await Post.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit + 1).lean();
  const hasMore = posts.length > limit;
  const slice = posts.slice(0, limit);
  const formatted = await Promise.all(
    slice.map((p) =>
      formatPost(p as unknown as Parameters<typeof formatPost>[0], options.currentUserId ?? null, admin)
    )
  );
  return { posts: formatted, hasMore };
}

/** Update post caption and re-extract hashtags. */
export async function updatePost(
  postId: string,
  authorId: string,
  data: { content: string }
): Promise<InstanceType<typeof Post> | null> {
  const post = await Post.findOne({ _id: postId, author: authorId });
  if (!post) return null;
  post.content = data.content;
  post.tags = extractHashtags(data.content);
  await post.save();
  return post;
}

/** Delete post. */
export async function deletePost(postId: string, authorId: string): Promise<boolean> {
  const result = await Post.deleteOne({ _id: postId, author: authorId });
  return result.deletedCount > 0;
}

/** Archive / unarchive post. */
export async function setArchive(postId: string, authorId: string, archived: boolean): Promise<boolean> {
  const result = await Post.updateOne(
    { _id: postId, author: authorId },
    { $set: { isArchived: archived } }
  );
  return result.modifiedCount > 0;
}

/** List archived posts for current user. */
export async function listArchivedPosts(
  userId: string,
  page?: number,
  limit?: number
): Promise<{ posts: Record<string, unknown>[]; hasMore: boolean }> {
  return listPosts({
    authorId: userId,
    includeArchived: true,
    currentUserId: userId,
    viewerIsAdmin: false,
    page,
    limit,
  });
}
