import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as feedService from "../services/feedService.js";

const router = Router();

/** GET /feed/for-you — for you feed (paginated). */
router.get("/for-you", requireAuth, async (req, res, next) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const result = await feedService.getForYouFeed(
      String(req.user!._id),
      page,
      limit
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
});

/** GET /feed/following — following feed (paginated). */
router.get("/following", requireAuth, async (req, res, next) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const result = await feedService.getFollowingFeed(
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
