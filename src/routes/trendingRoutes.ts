import { Router } from "express";
import { optionalAuth } from "../middleware/auth.js";
import * as trendingService from "../services/trendingService.js";

const router = Router();

/** GET /trending/tags — trending hashtags. */
router.get("/tags", optionalAuth, async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const tags = await trendingService.getTrendingTags(limit);
    res.json(tags);
  } catch (e) {
    next(e);
  }
});

/** GET /trending/posts — trending posts by engagement. */
router.get("/posts", optionalAuth, async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const currentUserId = req.user ? String(req.user._id) : null;
    const posts = await trendingService.getTrendingPosts(currentUserId, limit);
    res.json(posts);
  } catch (e) {
    next(e);
  }
});

export default router;
