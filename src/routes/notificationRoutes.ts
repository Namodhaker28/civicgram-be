import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as notificationService from "../services/notificationService.js";

const router = Router();

/** GET /notifications — list notifications. */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 30;
    const result = await notificationService.listNotifications(
      String(req.user!._id),
      page,
      limit
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
});

/** PATCH /notifications/:id/read — mark one as read. */
router.patch("/:id/read", requireAuth, async (req, res, next) => {
  try {
    const ok = await notificationService.markRead(
      req.params.id,
      String(req.user!._id)
    );
    if (!ok) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    res.json({ read: true });
  } catch (e) {
    next(e);
  }
});

/** PATCH /notifications/read-all — mark all as read. */
router.patch("/read-all", requireAuth, async (req, res, next) => {
  try {
    await notificationService.markAllRead(String(req.user!._id));
    res.json({ read: true });
  } catch (e) {
    next(e);
  }
});

export default router;
