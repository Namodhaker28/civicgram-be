import { Router } from "express";
import { optionalAuth } from "../middleware/auth.js";
import * as searchService from "../services/searchService.js";

const router = Router();

/** GET /search?q=...&type=users|posts|hashtags — search. */
router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const q = (req.query.q as string) ?? "";
    /** Omit type (or use "all") to search users, posts, and hashtags together. */
    const type = String(req.query.type ?? "").toLowerCase();
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const currentUserId = req.user ? String(req.user._id) : null;

    if (type === "users") {
      const users = await searchService.searchUsers(q, currentUserId, limit);
      return res.json({ users });
    }
    if (type === "posts") {
      const posts = await searchService.searchPosts(q, currentUserId, limit);
      return res.json({ posts });
    }
    if (type === "hashtags") {
      const hashtags = await searchService.searchHashtags(q, limit);
      return res.json({ hashtags });
    }
    const [users, posts, hashtags] = await Promise.all([
      searchService.searchUsers(q, currentUserId, limit),
      searchService.searchPosts(q, currentUserId, limit),
      searchService.searchHashtags(q, limit),
    ]);
    res.json({ users, posts, hashtags });
  } catch (e) {
    next(e);
  }
});

export default router;
