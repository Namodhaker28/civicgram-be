import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../lib/multer.js";
import * as storyService from "../services/storyService.js";

const router = Router();

/** POST /stories — create story (multipart: single image/video). */
router.post("/", requireAuth, upload.single("media"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "media file is required" });
      return;
    }
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const mediaUrl = `${baseUrl}/uploads/${req.file.filename}`;
    const story = await storyService.createStory(String(req.user!._id), mediaUrl);
    res.status(201).json({
      id: story._id,
      mediaUrl,
      expiresAt: story.expiresAt,
      createdAt: story.createdAt,
    });
  } catch (e) {
    next(e);
  }
});

/** GET /stories — stories from followed users (grouped by author). */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const result = await storyService.getStoriesForFeed(String(req.user!._id));
    res.json(result);
  } catch (e) {
    next(e);
  }
});

/** GET /stories/:userId — stories by user. */
router.get("/:userId", async (req, res, next) => {
  try {
    const result = await storyService.getStoriesByUserId(req.params.userId);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

/** DELETE /stories/:id — delete own story. */
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const ok = await storyService.deleteStory(req.params.id, String(req.user!._id));
    if (!ok) {
      res.status(404).json({ error: "Story not found" });
      return;
    }
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export default router;
