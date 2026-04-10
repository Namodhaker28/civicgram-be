import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getSuggestions } from "../services/followService.js";

const router = Router();

/** GET /users/suggestions — who to follow (excludes blocked). */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const suggestions = await getSuggestions(String(req.user!._id), limit);
    res.json(suggestions);
  } catch (e) {
    next(e);
  }
});

export default router;
