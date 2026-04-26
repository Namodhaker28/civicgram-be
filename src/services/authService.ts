import { createHash, randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { env } from "../lib/env.js";
import { HttpError } from "../lib/httpError.js";
import { User } from "../models/index.js";
import { toUserJson } from "./userService.js";
import { sendVerificationEmail } from "./emailService.js";

const JWT_SECRET = env.JWT_SECRET;
const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const MAX_USERNAME_LEN = 50;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const MOBILE_REGEX = /^\+?[0-9]{10,15}$/;

const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

function hashEmailVerificationToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function generateRawVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

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

function signUserToken(user: { _id: unknown; email?: string | null; mobile?: string | null }): string {
  const payload = {
    userId: String(user._id),
    email: user.email ?? undefined,
    mobile: user.mobile ?? undefined,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

/** Register with display name, email, mobile, and password; sends verification email (no JWT until verified). */
export async function registerWithPassword(data: {
  name: string;
  email: string;
  mobile: string;
  password: string;
}): Promise<{ message: string; email: string }> {
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
  const emailLower = data.email.toLowerCase().trim();
  const mobileTrim = data.mobile.trim();
  if (!emailLower) {
    throw new Error("Email is required");
  }
  if (!mobileTrim || !MOBILE_REGEX.test(mobileTrim)) {
    throw new Error("Invalid mobile format (e.g. +1234567890, 10–15 digits)");
  }

  const existingEmail = await User.findOne({ email: emailLower });
  if (existingEmail) {
    throw new Error("Email already registered");
  }
  const existingMobile = await User.findOne({ mobile: mobileTrim });
  if (existingMobile) {
    throw new Error("Mobile already registered");
  }

  const hash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const username = await generateUniqueUsername(trimmedName);
  const adminRole = env.ADMIN_EMAILS.includes(emailLower) ? ("admin" as const) : ("user" as const);
  const rawToken = generateRawVerificationToken();
  const tokenHash = hashEmailVerificationToken(rawToken);
  const expires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

  try {
    await User.create({
      email: emailLower,
      mobile: mobileTrim,
      passwordHash: hash,
      name: trimmedName,
      username,
      bio: "",
      avatarUrl: "",
      role: adminRole,
      isVerified: false,
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpires: expires,
    });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === 11000) {
      const fallback = await generateUniqueUsername(`${trimmedName}_${randomBytes(2).toString("hex")}`);
      await User.create({
        email: emailLower,
        mobile: mobileTrim,
        passwordHash: hash,
        name: trimmedName,
        username: fallback,
        bio: "",
        avatarUrl: "",
        role: adminRole,
        isVerified: false,
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpires: expires,
      });
    } else {
      throw e;
    }
  }

  await sendVerificationEmail(emailLower, rawToken);
  return {
    message: "Check your email to verify your account before signing in.",
    email: emailLower,
  };
}

/** Complete email verification and return session. */
export async function verifyEmailWithToken(rawToken: string): Promise<{ user: object; token: string }> {
  const trimmed = rawToken?.trim();
  if (!trimmed) {
    throw new HttpError(400, "Verification token is required");
  }
  const tokenHash = hashEmailVerificationToken(trimmed);
  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpires: { $gt: new Date() },
  });
  if (!user) {
    throw new HttpError(400, "Invalid or expired verification link");
  }
  user.isVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();
  const token = signUserToken(user);
  return { user: toUserJson(user), token };
}

/** Resend verification email for an unverified password account. */
export async function resendVerificationEmail(email: string): Promise<{ message: string }> {
  const emailLower = email.toLowerCase().trim();
  if (!emailLower) {
    throw new HttpError(400, "Email is required");
  }
  const user = await User.findOne({ email: emailLower });
  if (!user || !user.passwordHash) {
    return { message: "If an account exists for this email, a verification link has been sent." };
  }
  if (user.isVerified) {
    return { message: "If an account exists for this email, a verification link has been sent." };
  }
  const rawToken = generateRawVerificationToken();
  user.emailVerificationTokenHash = hashEmailVerificationToken(rawToken);
  user.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
  await user.save();
  await sendVerificationEmail(emailLower, rawToken);
  return { message: "If an account exists for this email, a verification link has been sent." };
}

/** Login with email or mobile + password. */
export async function loginWithPassword(data: {
  email?: string;
  mobile?: string;
  password: string;
}): Promise<{ user: object; token: string }> {
  if ((!data.email && !data.mobile) || (data.email && data.mobile)) {
    throw new HttpError(400, "Provide either email or mobile (not both)");
  }
  const user = data.email
    ? await User.findOne({ email: data.email.toLowerCase().trim() })
    : await User.findOne({ mobile: data.mobile!.trim() });
  if (!user || !user.passwordHash) {
    throw new HttpError(401, "Invalid credentials");
  }
  const ok = await bcrypt.compare(data.password, user.passwordHash);
  if (!ok) {
    throw new HttpError(401, "Invalid credentials");
  }
  if (!user.isVerified) {
    const hasPendingVerification =
      Boolean(user.emailVerificationTokenHash) &&
      user.emailVerificationExpires != null &&
      new Date(user.emailVerificationExpires).getTime() > Date.now();
    if (hasPendingVerification) {
      throw new HttpError(401, "Please verify your email before signing in.");
    }
    // Accounts created before email verification had no pending token — treat as verified on login.
    user.isVerified = true;
    await user.save();
  }
  const token = signUserToken(user);
  return {
    user: toUserJson(user),
    token,
  };
}

/** Sign in or register with Google ID token (credential JWT from GIS). */
export async function signInWithGoogle(idToken: string): Promise<{ user: object; token: string }> {
  if (!googleClient || !env.GOOGLE_CLIENT_ID) {
    throw new HttpError(503, "Google sign-in is not configured");
  }
  const trimmed = idToken?.trim();
  if (!trimmed) {
    throw new HttpError(400, "Google credential is required");
  }
  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken: trimmed,
      audience: env.GOOGLE_CLIENT_ID,
    });
  } catch {
    throw new HttpError(401, "Invalid Google sign-in");
  }
  const payload = ticket.getPayload();
  if (!payload?.sub) {
    throw new HttpError(401, "Invalid Google sign-in");
  }
  const sub = payload.sub;
  const email = payload.email?.toLowerCase().trim();
  if (!email) {
    throw new HttpError(400, "Google account has no email");
  }
  const emailVerifiedByGoogle = payload.email_verified === true;
  const name = (payload.name ?? email.split("@")[0] ?? "User").trim().slice(0, 100);
  const picture = typeof payload.picture === "string" ? payload.picture.trim() : "";

  let user = await User.findOne({ googleSub: sub });
  if (user) {
    const token = signUserToken(user);
    return { user: toUserJson(user), token };
  }

  const byEmail = await User.findOne({ email });
  if (byEmail) {
    throw new HttpError(
      409,
      "An account with this email already exists. Sign in with your password, or use the email you used to register."
    );
  }

  const username = await generateUniqueUsername(name);
  const adminRole = env.ADMIN_EMAILS.includes(email) ? ("admin" as const) : ("user" as const);
  try {
    user = await User.create({
      googleSub: sub,
      email,
      name,
      username,
      bio: "",
      avatarUrl: picture,
      role: adminRole,
      isVerified: emailVerifiedByGoogle,
    });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === 11000) {
      const fallback = await generateUniqueUsername(`${name}_${randomBytes(2).toString("hex")}`);
      user = await User.create({
        googleSub: sub,
        email,
        name,
        username: fallback,
        bio: "",
        avatarUrl: picture,
        role: adminRole,
        isVerified: emailVerifiedByGoogle,
      });
    } else {
      throw e;
    }
  }
  const token = signUserToken(user);
  return { user: toUserJson(user), token };
}
