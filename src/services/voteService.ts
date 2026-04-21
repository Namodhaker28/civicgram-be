import { Notification, Post, PostVote } from "../models/index.js";

export type VoteValue = 1 | -1 | 0;

export interface VoteSummary {
  upvotes: number;
  downvotes: number;
  userVote: 1 | -1 | 0;
}

/** Counts and current user's vote for a post. */
export async function getVoteSummary(
  postId: string,
  userId: string | null
): Promise<VoteSummary> {
  const [upvotes, downvotes, userDoc] = await Promise.all([
    PostVote.countDocuments({ post: postId, value: 1 }),
    PostVote.countDocuments({ post: postId, value: -1 }),
    userId ? PostVote.findOne({ user: userId, post: postId }).select("value").lean() : null,
  ]);
  const v = (userDoc as unknown as { value?: number } | null)?.value;
  const userVote: 1 | -1 | 0 = v === 1 || v === -1 ? v : 0;
  return { upvotes, downvotes, userVote };
}

async function syncUpvoteNotification(
  postAuthorId: string,
  actorId: string,
  postId: string,
  shouldExist: boolean
): Promise<void> {
  if (String(postAuthorId) === actorId) return;
  await Notification.deleteOne({
    user: postAuthorId,
    type: "upvote",
    actor: actorId,
    post: postId,
  }).catch(() => {});
  if (shouldExist) {
    await Notification.create({
      user: postAuthorId,
      type: "upvote",
      actor: actorId,
      post: postId,
    });
  }
}

/**
 * Sets the user's vote: 1 up, -1 down, 0 removes vote.
 * Toggle UX is handled by the client sending the resulting value.
 */
export async function setVote(
  userId: string,
  postId: string,
  value: VoteValue
): Promise<VoteSummary> {
  const post = await Post.findById(postId);
  if (!post) {
    const err = new Error("Post not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  if ((post.moderationStatus ?? "approved") !== "approved") {
    const err = new Error("Voting is only allowed on approved posts") as Error & { statusCode?: number };
    err.statusCode = 403;
    throw err;
  }

  const existing = await PostVote.findOne({ user: userId, post: postId });
  const previous = existing?.value as 1 | -1 | undefined;
  const authorId = String(post.author);

  if (value === 0) {
    if (existing) {
      await PostVote.deleteOne({ _id: existing._id });
      if (previous === 1) {
        await syncUpvoteNotification(authorId, userId, postId, false);
      }
    }
    return getVoteSummary(postId, userId);
  }

  // value is 1 or -1
  if (existing) {
    if (previous === value) {
      return getVoteSummary(postId, userId);
    }
    existing.value = value;
    await existing.save();
    if (previous === 1 && value === -1) {
      await syncUpvoteNotification(authorId, userId, postId, false);
    } else if (previous === -1 && value === 1) {
      await syncUpvoteNotification(authorId, userId, postId, true);
    }
  } else {
    await PostVote.create({ user: userId, post: postId, value });
    if (value === 1) {
      await syncUpvoteNotification(authorId, userId, postId, true);
    }
  }

  return getVoteSummary(postId, userId);
}
