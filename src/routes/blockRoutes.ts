import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as blockService from "../services/blockService.js";

const router = Router();

/** POST /users/:id/block — block user. */
router.post("/:id/block", requireAuth, async (req, res, next) => {
  try {
    await blockService.blockUser(String(req.user!._id), req.params.id);
    res.json({ blocked: true });
  } catch (e) {
    next(e);
  }
});

/** DELETE /users/:id/unblock — unblock user. */
router.delete("/:id/unblock", requireAuth, async (req, res, next) => {
  try {
    await blockService.unblockUser(String(req.user!._id), req.params.id);
    res.json({ blocked: false });
  } catch (e) {
    next(e);
  }
});

/** GET /users/me/blocked — list blocked users. */
router.get("/me/blocked", requireAuth, async (req, res, next) => {
  try {
    const list = await blockService.listBlocked(String(req.user!._id));
    res.json(list);
  } catch (e) {
    next(e);
  }
});

export default router;
