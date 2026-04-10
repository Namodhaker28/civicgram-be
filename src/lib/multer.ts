import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsDir = path.join(process.cwd(), "uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

/** Image upload (disk storage, 10MB per file). */
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

/** Memory storage for multipart post (images + video) so we can stream video to Cloudinary. */
const postMemoryStorage = multer.memoryStorage();

/** Post creation: images (max 10) + optional single video. 55MB total limit. */
export const uploadPost = multer({
  storage: postMemoryStorage,
  limits: { fileSize: 55 * 1024 * 1024 },
}).fields([
  { name: "images", maxCount: 10 },
  { name: "video", maxCount: 1 },
]);

const avatarImageMimes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** Single profile avatar in memory (max 5MB). Field name: `avatar`. */
export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (avatarImageMimes.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("Avatar must be a JPEG, PNG, WebP, or GIF image"));
  },
}).single("avatar");
