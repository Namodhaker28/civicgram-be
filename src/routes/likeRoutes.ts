import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { toggleLike } from "../services/likeService.js";

const router = Router();

/** POST /:postId/like — like a post (toggle: if already liked, unlike). Mount under /posts. */
router.post("/:postId/like", requireAuth, async (req, res, next) => {
  try {
    const result = await toggleLike(String(req.user!._id), req.params.postId);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

/** DELETE /posts/:postId/like — unlike a post. */
router.delete("/:postId/like", requireAuth, async (req, res, next) => {
  try {
    const result = await toggleLike(String(req.user!._id), req.params.postId);
    res.json({ liked: false, likesCount: result.likesCount });
  } catch (e) {
    next(e);
  }
});

export default router;
