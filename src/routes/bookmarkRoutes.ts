import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as bookmarkService from "../services/bookmarkService.js";

const router = Router();

/** GET /bookmarks — list bookmarked posts. */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const result = await bookmarkService.listBookmarks(
      String(req.user!._id),
      page,
      limit
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
});

export default router;
