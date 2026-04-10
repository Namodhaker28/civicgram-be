import { Comment, Notification, Post, User } from "../models/index.js";
import { toAuthorJson } from "./userService.js";

/** List comments for a post (top-level first, with optional replies). */
export async function listComments(postId: string): Promise<Record<string, unknown>[]> {
  const comments = await Comment.find({ post: postId, parent: null })
    .sort({ createdAt: 1 })
    .populate("author")
    .lean();
  const result: Record<string, unknown>[] = [];
  for (const c of comments) {
    const author = c.author as InstanceType<typeof User>;
    const replies = await Comment.find({ parent: c._id })
      .sort({ createdAt: 1 })
      .populate("author")
      .lean();
    result.push({
      id: c._id,
      content: c.content,
      author: author ? toAuthorJson(author) : null,
      createdAt: c.createdAt,
      replies: replies.map((r) => ({
        id: r._id,
        content: r.content,
        author: (r.author as InstanceType<typeof User>) ? toAuthorJson(r.author as InstanceType<typeof User>) : null,
        createdAt: r.createdAt,
      })),
    });
  }
  return result;
}

/** Create a comment and optionally notify post author and mentioned users. */
export async function createComment(
  postId: string,
  authorId: string,
  content: string,
  parentId?: string | null
): Promise<Record<string, unknown>> {
  const comment = await Comment.create({
    post: postId,
    author: authorId,
    content,
    parent: parentId || null,
  });
  const populated = await Comment.findById(comment._id).populate("author");
  const post = await Post.findById(postId);
  if (post && String(post.author) !== authorId) {
    await Notification.create({
      user: post.author,
      type: "comment",
      actor: authorId,
      post: postId,
    });
  }
  const author = await User.findById(authorId);
  return {
    id: populated!._id,
    content: populated!.content,
    author: author ? toAuthorJson(author) : null,
    createdAt: populated!.createdAt,
    replies: [],
  };
}

/** Extract @username mentions from content and create mention notifications (simple: match @word). */
export function extractMentions(content: string): string[] {
  const matches = content.match(/@[\w]+/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}
