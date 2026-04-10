/**
 * Cloudinary uploads: structured folders per feature (posts vs profiles).
 */

import { v2 as cloudinary } from "cloudinary";

/** Cloudinary folder paths — keep media grouped by app area and purpose. */
export const CLOUDINARY_FOLDERS = {
  /** Post video attachments. */
  POST_VIDEOS: "civic-social/posts/videos",
  /** Post images (use when migrating disk uploads to Cloudinary). */
  POST_IMAGES: "civic-social/posts/images",
  /** User profile avatars. */
  PROFILE_AVATARS: "civic-social/profiles/avatars",
} as const;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

// Only set explicit config when all three are present; otherwise the SDK uses CLOUDINARY_URL from the environment.
if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

/** Returns true if Cloudinary has credentials (split env vars or CLOUDINARY_URL). */
export function isCloudinaryConfigured(): boolean {
  const c = cloudinary.config();
  return Boolean(c.cloud_name && c.api_key && c.api_secret);
}

function assertCloudinaryConfigured(): void {
  if (!isCloudinaryConfigured()) {
    const err = new Error(
      "Cloudinary is not configured. Add CLOUDINARY_URL to .env, or set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET. See backend-social/.env.example."
    ) as Error & { statusCode?: number };
    err.statusCode = 503;
    throw err;
  }
}

function safePublicIdSegment(name: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "file";
  return base.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}

/**
 * Upload an image buffer to a Cloudinary folder; returns HTTPS delivery URL.
 * @param buffer — raw image bytes
 * @param filename — original filename (used for public_id suffix only)
 * @param folder — one of {@link CLOUDINARY_FOLDERS}
 * @param idPrefix — unique prefix (e.g. user id) to avoid collisions
 */
export async function uploadImage(
  buffer: Buffer,
  filename: string,
  folder: string,
  idPrefix: string
): Promise<string> {
  assertCloudinaryConfigured();

  const publicId = `${safePublicIdSegment(idPrefix)}-${Date.now()}-${safePublicIdSegment(filename)}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder,
        public_id: publicId,
        overwrite: false,
      },
      (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        if (!result?.secure_url) {
          reject(new Error("No URL returned from Cloudinary"));
          return;
        }
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}

/**
 * Upload a profile avatar into {@link CLOUDINARY_FOLDERS.PROFILE_AVATARS}.
 */
export async function uploadProfileAvatar(
  userId: string,
  buffer: Buffer,
  originalname: string
): Promise<string> {
  return uploadImage(buffer, originalname, CLOUDINARY_FOLDERS.PROFILE_AVATARS, userId);
}

/**
 * Upload a video buffer to Cloudinary; returns the public URL.
 * @throws Error when Cloudinary env is missing — set CLOUDINARY_URL or the three CLOUDINARY_* vars (see .env.example).
 */
export async function uploadVideo(
  buffer: Buffer,
  filename: string
): Promise<string> {
  assertCloudinaryConfigured();

  const publicId = `${Date.now()}-${safePublicIdSegment(filename)}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        folder: CLOUDINARY_FOLDERS.POST_VIDEOS,
        public_id: publicId,
      },
      (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        if (!result?.secure_url) {
          reject(new Error("No URL returned from Cloudinary"));
          return;
        }
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}
