import { Like, Notification, Post } from "../models/index.js";

/** Toggle like: if exists, remove and return { liked: false }; else create and return { liked: true }. */
export async function toggleLike(
  userId: string,
  postId: string
): Promise<{ liked: boolean; likesCount: number }> {
  const existing = await Like.findOne({ user: userId, post: postId });
  if (existing) {
    await Like.deleteOne({ _id: existing._id });
    const count = await Like.countDocuments({ post: postId });
    await Notification.deleteOne({
      user: (await Post.findById(postId))?.author,
      type: "like",
      actor: userId,
      post: postId,
    }).catch(() => {});
    return { liked: false, likesCount: count };
  }
  await Like.create({ user: userId, post: postId });
  const count = await Like.countDocuments({ post: postId });
  const post = await Post.findById(postId);
  if (post && String(post.author) !== userId) {
    await Notification.create({
      user: post.author,
      type: "like",
      actor: userId,
      post: postId,
    });
  }
  return { liked: true, likesCount: count };
}
