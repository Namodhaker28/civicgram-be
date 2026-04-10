import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { uploadAvatar } from "../lib/multer.js";
import { uploadProfileAvatar } from "../lib/cloudinary.js";
import * as userService from "../services/userService.js";
import * as postService from "../services/postService.js";

const router = Router();

/** Cleared with null; letters, numbers, underscores; stored lowercase without @. */
const usernameUpdateSchema = z.union([
  z.null(),
  z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username is too long")
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only use letters, numbers, and underscores")
    .transform((s) => s.replace(/^@+/, "").toLowerCase()),
]);

const updateMeSchema = z.object({
  name: z.string().optional(),
  username: usernameUpdateSchema.optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

/** GET /users/me — current user profile. */
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await userService.getUserById(String(req.user!._id));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (e) {
    next(e);
  }
});

/** PATCH /users/me — update profile. */
router.patch("/me", requireAuth, validateBody(updateMeSchema), async (req, res, next) => {
  try {
    const updated = await userService.updateMe(String(req.user!._id), req.body);
    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(updated);
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === 11000) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }
    next(e);
  }
});

/** POST /users/me/avatar — multipart field `avatar`; uploads to Cloudinary (profiles folder) and updates user. */
router.post("/me/avatar", requireAuth, uploadAvatar, async (req, res, next) => {
  try {
    const file = req.file;
    if (!file?.buffer) {
      res.status(400).json({ error: "Avatar image file is required (field name: avatar)" });
      return;
    }
    const avatarUrl = await uploadProfileAvatar(
      String(req.user!._id),
      file.buffer,
      file.originalname || "avatar"
    );
    const updated = await userService.updateMe(String(req.user!._id), { avatarUrl });
    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(updated);
  } catch (e: unknown) {
    next(e);
  }
});

/** GET /users/me/posts/archived — list current user's archived posts. */
router.get("/me/posts/archived", requireAuth, async (req, res, next) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const result = await postService.listArchivedPosts(
      String(req.user!._id),
      page,
      limit
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
});

/** GET /users/:id — get user by ID. */
router.get("/:id", async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (e) {
    next(e);
  }
});

/** GET /users/by-username/:username — get user by username. */
router.get("/by-username/:username", async (req, res, next) => {
  try {
    const user = await userService.getUserByUsername(req.params.username);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (e) {
    next(e);
  }
});

export default router;
