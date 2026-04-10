import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { createReport } from "../services/reportService.js";

const router = Router();

const reportSchema = z.object({
  targetType: z.enum(["post", "user"]),
  targetId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

/** POST /report — submit report. */
router.post("/", requireAuth, validateBody(reportSchema), async (req, res, next) => {
  try {
    await createReport(
      String(req.user!._id),
      req.body.targetType,
      req.body.targetId,
      req.body.reason ?? ""
    );
    res.status(201).json({ reported: true });
  } catch (e) {
    next(e);
  }
});

export default router;
