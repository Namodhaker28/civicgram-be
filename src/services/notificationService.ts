import { Notification, User } from "../models/index.js";
import { toAuthorJson } from "./userService.js";

/** List notifications for user (newest first). */
export async function listNotifications(
  userId: string,
  page: number = 1,
  limit: number = 30
): Promise<{ notifications: Record<string, unknown>[]; hasMore: boolean }> {
  const skip = (page - 1) * limit;
  const notifications = await Notification.find({ user: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit + 1)
    .populate("actor")
    .populate("post")
    .lean();
  const hasMore = notifications.length > limit;
  const slice = notifications.slice(0, limit);
  const result = slice.map((n) => {
    const doc = n as unknown as { _id: unknown; type: string; actor?: InstanceType<typeof User>; post?: unknown; read: boolean; createdAt: Date };
    return {
      id: doc._id,
      type: doc.type,
      actor: doc.actor ? toAuthorJson(doc.actor) : null,
      post: doc.post ?? null,
      read: doc.read,
      createdAt: doc.createdAt,
    };
  });
  return { notifications: result, hasMore };
}

/** Mark notification as read. */
export async function markRead(notificationId: string, userId: string): Promise<boolean> {
  const result = await Notification.updateOne(
    { _id: notificationId, user: userId },
    { $set: { read: true } }
  );
  return result.modifiedCount > 0;
}

/** Mark all notifications as read. */
export async function markAllRead(userId: string): Promise<void> {
  await Notification.updateMany({ user: userId }, { $set: { read: true } });
}
