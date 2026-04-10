import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as followService from "../services/followService.js";

const router = Router();

/** POST /users/:id/follow — follow a user. */
router.post("/:id/follow", requireAuth, async (req, res, next) => {
  try {
    await followService.follow(String(req.user!._id), req.params.id);
    res.json({ following: true });
  } catch (e) {
    next(e);
  }
});

/** DELETE /users/:id/follow — unfollow a user. */
router.delete("/:id/follow", requireAuth, async (req, res, next) => {
  try {
    await followService.unfollow(String(req.user!._id), req.params.id);
    res.json({ following: false });
  } catch (e) {
    next(e);
  }
});

/** GET /users/:id/followers — list followers. */
router.get("/:id/followers", async (req, res, next) => {
  try {
    const followers = await followService.getFollowers(req.params.id);
    res.json(followers);
  } catch (e) {
    next(e);
  }
});

/** GET /users/:id/following — list following. */
router.get("/:id/following", async (req, res, next) => {
  try {
    const following = await followService.getFollowing(req.params.id);
    res.json(following);
  } catch (e) {
    next(e);
  }
});

export default router;
