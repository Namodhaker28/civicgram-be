import dotenv from "dotenv";

dotenv.config();

/** Validate and export env vars. */
export const env = {
  PORT: Number(process.env.PORT) || 4000,
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/decentsocial",
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-me",
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
} as const;
