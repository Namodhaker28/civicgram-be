import { Router } from "express";
import fs from "fs";
import path from "path";
import { isAdminUser, optionalAuth, requireAuth } from "../middleware/auth.js";
import { uploadPost } from "../lib/multer.js";
import { uploadVideo as uploadVideoToCloudinary } from "../lib/cloudinary.js";
import * as postService from "../services/postService.js";
import * as bookmarkService from "../services/bookmarkService.js";

const uploadsDir = path.join(process.cwd(), "uploads");

const router = Router();

/** GET /posts — list posts (optional ?authorId=, ?page=, ?limit=). */
router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const authorId = req.query.authorId as string | undefined;
    const tag = req.query.tag as string | undefined;
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const result = await postService.listPosts({
      authorId,
      tag,
      page,
      limit,
      includeArchived: false,
      currentUserId: req.user ? String(req.user._id) : null,
      viewerIsAdmin: req.user ? isAdminUser(req.user) : false,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

/** GET /posts/:id — get single post. */
router.get("/:id", optionalAuth, async (req, res, next) => {
  try {
    const post = await postService.getPostById(
      req.params.id,
      req.user ? String(req.user._id) : null,
      req.user ? isAdminUser(req.user) : false
    );
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    res.json(post);
  } catch (e) {
    next(e);
  }
});

/** POST /posts — create post (multipart: content, images, video). */
router.post("/", requireAuth, uploadPost, async (req, res, next) => {
  try {
    const content = (req.body.content as string) ?? "";
    const files = (req.files as { images?: Express.Multer.File[]; video?: Express.Multer.File[] }) ?? {};
    const imageFiles = files.images ?? [];
    const videoFile = files.video?.[0];
    let imageUrls: string[] = [];
    let videoUrl: string | null = null;

    // Write image buffers to disk (same flow as before)
    if (imageFiles.length > 0) {
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      for (const f of imageFiles) {
        const ext = path.extname(f.originalname) || ".jpg";
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, f.buffer);
        imageUrls.push(`${baseUrl}/uploads/${filename}`);
      }
    }

    // Upload video to Cloudinary
    if (videoFile) {
      videoUrl = await uploadVideoToCloudinary(
        videoFile.buffer,
        videoFile.originalname || "video"
      );
    }

    const post = await postService.createPost(String(req.user!._id), {
      content,
      imageUrls,
      videoUrl: videoUrl ?? undefined,
    });
    const formatted = await postService.formatPost(post, String(req.user!._id));
    res.status(201).json(formatted);
  } catch (e) {
    next(e);
  }
});

/** PATCH /posts/:id — update post caption. */
router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const content = req.body.content as string | undefined;
    if (content === undefined) {
      res.status(400).json({ error: "content is required" });
      return;
    }
    const updated = await postService.updatePost(
      req.params.id,
      String(req.user!._id),
      { content }
    );
    if (!updated) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    const formatted = await postService.formatPost(updated, String(req.user!._id));
    res.json(formatted);
  } catch (e) {
    next(e);
  }
});

/** DELETE /posts/:id — delete post. */
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const ok = await postService.deletePost(req.params.id, String(req.user!._id));
    if (!ok) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

/** POST /posts/:id/archive — archive post. */
router.post("/:id/archive", requireAuth, async (req, res, next) => {
  try {
    const ok = await postService.setArchive(
      req.params.id,
      String(req.user!._id),
      true
    );
    if (!ok) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    res.json({ archived: true });
  } catch (e) {
    next(e);
  }
});

/** POST /posts/:id/unarchive — unarchive post. */
router.post("/:id/unarchive", requireAuth, async (req, res, next) => {
  try {
    const ok = await postService.setArchive(
      req.params.id,
      String(req.user!._id),
      false
    );
    if (!ok) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    res.json({ archived: false });
  } catch (e) {
    next(e);
  }
});

/** POST /posts/:id/bookmark — toggle bookmark. */
router.post("/:id/bookmark", requireAuth, async (req, res, next) => {
  try {
    const result = await bookmarkService.toggleBookmark(
      String(req.user!._id),
      req.params.id
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
});

/** DELETE /posts/:id/bookmark — remove bookmark. */
router.delete("/:id/bookmark", requireAuth, async (req, res, next) => {
  try {
    const result = await bookmarkService.toggleBookmark(
      String(req.user!._id),
      req.params.id
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
});

export default router;
