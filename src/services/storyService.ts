import { Story, Follow, User } from "../models/index.js";
import { toAuthorJson } from "./userService.js";

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

/** Create a story (expires in 24h). */
export async function createStory(authorId: string, mediaUrl: string) {
  const expiresAt = new Date(Date.now() + STORY_TTL_MS);
  return Story.create({ author: authorId, mediaUrl, expiresAt });
}

/** Get active stories for followed users (grouped by author). */
export async function getStoriesForFeed(userId: string): Promise<
  {
    author: Record<string, unknown>;
    stories: { id: string; mediaUrl: string; expiresAt: Date; createdAt: Date }[];
  }[]
> {
  const followDoc = await Follow.find({ follower: userId }).select("following");
  const followingIds = followDoc.map((f) => f.following);
  const now = new Date();
  const stories = await Story.find({
    author: { $in: followingIds },
    expiresAt: { $gt: now },
  })
    .sort({ createdAt: 1 })
    .populate("author")
    .lean();
  type StoryItem = { id: string; mediaUrl: string; expiresAt: Date; createdAt: Date };
  const byAuthor = new Map<string, { author: Record<string, unknown>; stories: StoryItem[] }>();
  for (const s of stories) {
    const doc = s as unknown as { _id: unknown; author: InstanceType<typeof User>; mediaUrl: string; expiresAt: Date; createdAt: Date };
    const authorId = String(doc.author._id);
    if (!byAuthor.has(authorId)) {
      byAuthor.set(authorId, {
        author: toAuthorJson(doc.author) as Record<string, unknown>,
        stories: [],
      });
    }
    byAuthor.get(authorId)!.stories.push({
      id: String(doc._id),
      mediaUrl: doc.mediaUrl,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt,
    });
  }
  return Array.from(byAuthor.values());
}

/** Get stories by user ID (for profile/view). */
export async function getStoriesByUserId(userId: string): Promise<{
  author: Record<string, unknown>;
  stories: { id: string; mediaUrl: string; expiresAt: Date; createdAt: Date }[];
}> {
  const now = new Date();
  const stories = await Story.find({ author: userId, expiresAt: { $gt: now } })
    .sort({ createdAt: 1 })
    .populate("author")
    .lean();
  const first = stories[0] as unknown as { author: InstanceType<typeof User> } | undefined;
  const author: Record<string, unknown> =
    stories.length > 0 && first?.author
      ? (toAuthorJson(first.author) as Record<string, unknown>)
      : (await User.findById(userId).then((u) => (u ? toAuthorJson(u) : {}))) as Record<string, unknown>;
  return {
    author,
    stories: stories.map((s) => {
      const d = s as unknown as { _id: unknown; mediaUrl: string; expiresAt: Date; createdAt: Date };
      return {
        id: String(d._id),
        mediaUrl: d.mediaUrl,
        expiresAt: d.expiresAt,
        createdAt: d.createdAt,
      };
    }),
  };
}

/** Delete a story (owner only). */
export async function deleteStory(storyId: string, userId: string): Promise<boolean> {
  const result = await Story.deleteOne({ _id: storyId, author: userId });
  return result.deletedCount > 0;
}
