import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import * as commentService from "../services/commentService.js";

const router = Router();

const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().optional().nullable(),
});

/** GET /posts/:postId/comments — list comments for a post. */
router.get("/:postId/comments", async (req, res, next) => {
  try {
    const comments = await commentService.listComments(req.params.postId);
    res.json(comments);
  } catch (e) {
    next(e);
  }
});

/** POST /posts/:postId/comments — create comment. */
router.post(
  "/:postId/comments",
  requireAuth,
  validateBody(createCommentSchema),
  async (req, res, next) => {
    try {
      const comment = await commentService.createComment(
        req.params.postId,
        String(req.user!._id),
        req.body.content,
        req.body.parentId
      );
      res.status(201).json(comment);
    } catch (e) {
      next(e);
    }
  }
);

export default router;
