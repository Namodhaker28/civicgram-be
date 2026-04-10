import { User } from "../models/index.js";
import type { IUserDoc } from "../types/express.js";

/** Get user by ID. */
export async function getUserById(id: string) {
  const user = await User.findById(id);
  if (!user) return null;
  return toUserJson(user);
}

/** Get user by username. */
export async function getUserByUsername(username: string) {
  const user = await User.findOne({ username: username.trim() });
  if (!user) return null;
  return toUserJson(user);
}

/** Update current user profile. */
export async function updateMe(
  userId: string,
  data: { name?: string; username?: string; bio?: string; avatarUrl?: string }
) {
  const user = await User.findById(userId);
  if (!user) return null;
  if (data.name !== undefined) user.name = data.name;
  if (data.username !== undefined) {
    user.username =
      data.username === null || data.username === ""
        ? undefined
        : String(data.username).trim() || undefined;
  }
  if (data.bio !== undefined) user.bio = data.bio;
  if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;
  await user.save();
  return toUserJson(user);
}

export function toUserJson(user: InstanceType<typeof User> | IUserDoc | Record<string, unknown>): Record<string, unknown> {
  const u = user && typeof user === "object" && "toObject" in user
    ? (user as InstanceType<typeof User>).toObject()
    : (user as Record<string, unknown>) ?? {};
  return {
    id: u._id,
    walletAddress: u.walletAddress ?? null,
    email: u.email ?? null,
    mobile: u.mobile ?? null,
    username: u.username ?? null,
    name: u.name ?? "",
    bio: u.bio ?? "",
    avatarUrl: u.avatarUrl ?? "",
    isVerified: u.isVerified ?? false,
    createdAt: u.createdAt ?? null,
    updatedAt: u.updatedAt ?? null,
  };
}

/** Author shape for embedding in post (frontend expects address, name, avatar). */
export function toAuthorJson(user: InstanceType<typeof User> | IUserDoc | Record<string, unknown>): Record<string, unknown> {
  const u = user && typeof user === "object" && "toObject" in user
    ? (user as InstanceType<typeof User>).toObject()
    : (user as Record<string, unknown>) ?? {};
  const address = u.walletAddress ?? u.email ?? u.mobile ?? "";
  return {
    id: u._id,
    address,
    walletAddress: u.walletAddress ?? address,
    username: u.username ?? null,
    name: u.name ?? "",
    avatar: u.avatarUrl ?? "",
    avatarUrl: u.avatarUrl ?? "",
    isVerified: u.isVerified ?? false,
  };
}
