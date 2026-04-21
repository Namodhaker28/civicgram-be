import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { setVote, type VoteValue } from "../services/voteService.js";

const router = Router();

function isVoteValue(n: unknown): n is VoteValue {
  return n === 1 || n === -1 || n === 0;
}

/** POST /:postId/vote — body: { value: 1 | -1 | 0 }. Mount under /posts. */
router.post("/:postId/vote", requireAuth, async (req, res, next) => {
  try {
    const raw = (req.body as { value?: unknown })?.value;
    if (!isVoteValue(raw)) {
      res.status(400).json({ error: "value must be 1, -1, or 0" });
      return;
    }
    const summary = await setVote(String(req.user!._id), req.params.postId, raw);
    res.json(summary);
  } catch (e) {
    next(e);
  }
});

export default router;
