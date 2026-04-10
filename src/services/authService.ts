import { randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "../lib/env.js";
import { User } from "../models/index.js";

const JWT_SECRET = env.JWT_SECRET;
const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const MAX_USERNAME_LEN = 50;

/**
 * Builds a URL-safe username base from display name (lowercase, underscores).
 * Ensures at least 3 characters for sensible handles.
 */
function slugifyNameForUsername(name: string): string {
  const s = name
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 28);
  if (s.length >= 3) return s;
  if (s.length > 0) return `${s}_${randomBytes(2).toString("hex")}`;
  return `user_${randomBytes(4).toString("hex")}`;
}

/** Reserves a unique username; retries on collision (including rare races). */
async function generateUniqueUsername(displayName: string): Promise<string> {
  const base = slugifyNameForUsername(displayName);
  for (let i = 0; i < 24; i++) {
    const suffix = i === 0 ? "" : `_${randomBytes(3).toString("hex")}`;
    const candidate = (base + suffix).slice(0, MAX_USERNAME_LEN);
    const taken = await User.exists({ username: candidate });
    if (!taken) return candidate;
  }
  return `user_${randomBytes(12).toString("hex")}`.slice(0, MAX_USERNAME_LEN);
}

/** Register with display name, email or mobile + password; username is auto-assigned. */
export async function registerWithPassword(data: {
  name: string;
  email?: string;
  mobile?: string;
  password: string;
}): Promise<{ user: object; token: string }> {
  if ((!data.email && !data.mobile) || (data.email && data.mobile)) {
    throw new Error("Provide either email or mobile (not both)");
  }
  const trimmedName = data.name.trim();
  if (!trimmedName) {
    throw new Error("Name is required");
  }
  if (trimmedName.length > 100) {
    throw new Error("Name must be at most 100 characters");
  }
  if (data.password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  const identifier = data.email ?? data.mobile!;
  const existing = data.email
    ? await User.findOne({ email: identifier.toLowerCase().trim() })
    : await User.findOne({ mobile: identifier.trim() });
  if (existing) {
    throw new Error(data.email ? "Email already registered" : "Mobile already registered");
  }
  const hash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const username = await generateUniqueUsername(trimmedName);

  let user;
  try {
    user = await User.create({
      email: data.email?.toLowerCase().trim(),
      mobile: data.mobile?.trim(),
      passwordHash: hash,
      name: trimmedName,
      username,
      bio: "",
      avatarUrl: "",
    });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === 11000) {
      const fallback = await generateUniqueUsername(`${trimmedName}_${randomBytes(2).toString("hex")}`);
      user = await User.create({
        email: data.email?.toLowerCase().trim(),
        mobile: data.mobile?.trim(),
        passwordHash: hash,
        name: trimmedName,
        username: fallback,
        bio: "",
        avatarUrl: "",
      });
    } else {
      throw e;
    }
  }
  const payload = { userId: String(user._id), email: user.email ?? undefined, mobile: user.mobile ?? undefined };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
  return {
    user: toUserJson(user),
    token,
  };
}

/** Login with email or mobile + password. */
export async function loginWithPassword(data: {
  email?: string;
  mobile?: string;
  password: string;
}): Promise<{ user: object; token: string }> {
  if ((!data.email && !data.mobile) || (data.email && data.mobile)) {
    throw new Error("Provide either email or mobile (not both)");
  }
  const user = data.email
    ? await User.findOne({ email: data.email.toLowerCase().trim() })
    : await User.findOne({ mobile: data.mobile!.trim() });
  if (!user || !user.passwordHash) {
    throw new Error("Invalid credentials");
  }
  const ok = await bcrypt.compare(data.password, user.passwordHash);
  if (!ok) {
    throw new Error("Invalid credentials");
  }
  const payload = { userId: String(user._id), email: user.email ?? undefined, mobile: user.mobile ?? undefined };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
  return {
    user: toUserJson(user),
    token,
  };
}

function toUserJson(user: InstanceType<typeof User>): object {
  return {
    id: user._id,
    walletAddress: user.walletAddress ?? null,
    email: user.email ?? null,
    mobile: user.mobile ?? null,
    username: user.username ?? null,
    name: user.name ?? "",
    bio: user.bio ?? "",
    avatarUrl: user.avatarUrl ?? "",
    isVerified: user.isVerified ?? false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
