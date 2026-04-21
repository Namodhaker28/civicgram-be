import dotenv from "dotenv";

dotenv.config();

/** Lowercase trimmed emails that receive `admin` role on sync and registration. */
export function parseAdminEmails(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** INR per net upvote point, stored as paise (1 INR = 100 paise). Default 100 = ₹1 per point. */
const paiseRaw = process.env.INR_PER_NET_POINT_PAISE;
const paiseParsed = paiseRaw != null && paiseRaw !== "" ? Number(paiseRaw) : NaN;

/** Validate and export env vars. */
export const env = {
  PORT: Number(process.env.PORT) || 4000,
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/decentsocial",
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-me",
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  ADMIN_EMAILS: parseAdminEmails(process.env.ADMIN_EMAILS),
  /** Creator earnings: amount in paise per (max(0, upvotes − downvotes)) per post per settlement. */
  INR_PER_NET_POINT_PAISE: Number.isFinite(paiseParsed) && paiseParsed >= 0 ? paiseParsed : 100,
} as const;
