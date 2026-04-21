import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import * as moderationService from "../services/moderationService.js";
import * as payoutService from "../services/payoutService.js";

const router = Router();

router.use(requireAuth, requireAdmin);

/** GET /admin/moderation/pending — posts awaiting review. */
router.get("/moderation/pending", async (req, res, next) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const result = await moderationService.listPendingQueue(page, limit);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

const rejectSchema = z.object({
  reason: z.string().max(2000).optional(),
});

/** POST /admin/moderation/:postId/approve */
router.post("/moderation/:postId/approve", async (req, res, next) => {
  try {
    const formatted = await moderationService.approvePost(req.params.postId, String(req.user!._id));
    res.json(formatted);
  } catch (e) {
    next(e);
  }
});

/** POST /admin/moderation/:postId/reject */
router.post("/moderation/:postId/reject", validateBody(rejectSchema), async (req, res, next) => {
  try {
    const formatted = await moderationService.rejectPost(
      req.params.postId,
      String(req.user!._id),
      req.body.reason ?? ""
    );
    res.json(formatted);
  } catch (e) {
    next(e);
  }
});

/** GET /admin/payouts/periods — list payout periods. */
router.get("/payouts/periods", async (req, res, next) => {
  try {
    const periods = await payoutService.listPayoutPeriods();
    res.json(periods);
  } catch (e) {
    next(e);
  }
});

/** POST /admin/payouts/close — body: { year, month } closes previous month earnings snapshot. */
const closePeriodSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

router.post("/payouts/close", validateBody(closePeriodSchema), async (req, res, next) => {
  try {
    const result = await payoutService.closePeriodAndSnapshot(req.body.year, req.body.month);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

/** POST /admin/payouts/periods/:periodId/mark-paid */
router.post("/payouts/periods/:periodId/mark-paid", async (req, res, next) => {
  try {
    const updated = await payoutService.markPeriodPaid(req.params.periodId);
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/** GET /admin/payouts/periods/:periodId/lines — CSV-friendly detail (optional). */
router.get("/payouts/periods/:periodId/lines", async (req, res, next) => {
  try {
    const lines = await payoutService.getPeriodLines(req.params.periodId);
    res.json(lines);
  } catch (e) {
    next(e);
  }
});

export default router;
