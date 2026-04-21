import mongoose from "mongoose";
import { env } from "../lib/env.js";
import { Post, PostVote, PayoutPeriod, CreatorEarningLine } from "../models/index.js";

/** Start/end of calendar month in UTC. */
function monthBoundsUtc(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { start, end };
}

/** Net votes for a post: max(0, up − down). */
async function netScoreForPost(postId: mongoose.Types.ObjectId): Promise<number> {
  const [up, down] = await Promise.all([
    PostVote.countDocuments({ post: postId, value: 1 }),
    PostVote.countDocuments({ post: postId, value: -1 }),
  ]);
  return Math.max(0, up - down);
}

/**
 * Snapshot period: all approved posts whose createdAt falls in [start, end),
 * earning = netScore * INR_PER_NET_POINT_PAISE per post.
 */
export async function closePeriodAndSnapshot(year: number, month: number) {
  const { start, end } = monthBoundsUtc(year, month);
  const existing = await PayoutPeriod.findOne({ year, month });
  if (existing?.status === "paid") {
    const err = new Error("Period is already marked paid; cannot recompute") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  const posts = await Post.find({
    moderationStatus: "approved",
    createdAt: { $gte: start, $lt: end },
  }).lean();

  let period = existing;
  if (!period) {
    period = await PayoutPeriod.create({ year, month, status: "closed", computedAt: new Date() });
  } else {
    period.status = "closed";
    period.computedAt = new Date();
    await period.save();
    await CreatorEarningLine.deleteMany({ period: period._id });
  }

  const rate = env.INR_PER_NET_POINT_PAISE;
  const lines: { user: mongoose.Types.ObjectId; post: mongoose.Types.ObjectId; netScore: number; amountPaise: number }[] =
    [];

  for (const p of posts) {
    const pid = p._id as mongoose.Types.ObjectId;
    const net = await netScoreForPost(pid);
    const amountPaise = Math.round(net * rate);
    lines.push({
      user: p.author as mongoose.Types.ObjectId,
      post: pid,
      netScore: net,
      amountPaise,
    });
  }

  if (lines.length > 0) {
    await CreatorEarningLine.insertMany(
      lines.map((l) => ({
        period: period!._id,
        user: l.user,
        post: l.post,
        netScore: l.netScore,
        amountPaise: l.amountPaise,
      }))
    );
  }

  const totalsByUser = new Map<string, number>();
  for (const l of lines) {
    const k = String(l.user);
    totalsByUser.set(k, (totalsByUser.get(k) ?? 0) + l.amountPaise);
  }

  return {
    periodId: period._id,
    year,
    month,
    postsProcessed: posts.length,
    linesCreated: lines.length,
    userTotalsPaise: Object.fromEntries(totalsByUser),
  };
}

export async function listPayoutPeriods() {
  const periods = await PayoutPeriod.find().sort({ year: -1, month: -1 }).lean();
  return periods.map((p) => ({
    id: p._id,
    year: p.year,
    month: p.month,
    status: p.status,
    computedAt: p.computedAt,
    createdAt: p.createdAt,
  }));
}

export async function markPeriodPaid(periodId: string) {
  const period = await PayoutPeriod.findById(periodId);
  if (!period) {
    const err = new Error("Period not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  period.status = "paid";
  await period.save();
  return { id: period._id, status: period.status };
}

export async function getPeriodLines(periodId: string) {
  const lines = await CreatorEarningLine.find({ period: periodId })
    .populate("post", "content")
    .populate("user", "username name email")
    .lean();
  return lines.map((l) => ({
    id: l._id,
    userId: l.user,
    postId: l.post,
    netScore: l.netScore,
    amountPaise: l.amountPaise,
    amountInr: l.amountPaise / 100,
  }));
}

/** Live estimate for current calendar month (approved posts created this month). */
export async function getEstimatedEarningsForUser(userId: string) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const { start, end } = monthBoundsUtc(year, month);
  const posts = await Post.find({
    author: userId,
    moderationStatus: "approved",
    createdAt: { $gte: start, $lt: end },
  }).select("_id");

  let totalPaise = 0;
  const perPost: { postId: string; netScore: number; amountPaise: number }[] = [];
  const rate = env.INR_PER_NET_POINT_PAISE;

  for (const p of posts) {
    const pid = p._id as mongoose.Types.ObjectId;
    const net = await netScoreForPost(pid);
    const amountPaise = Math.round(net * rate);
    totalPaise += amountPaise;
    perPost.push({ postId: String(pid), netScore: net, amountPaise });
  }

  return {
    year,
    month,
    ratePaisePerPoint: rate,
    estimatedTotalPaise: totalPaise,
    estimatedTotalInr: totalPaise / 100,
    posts: perPost,
  };
}

/** History: sum of lines grouped by closed periods for user. */
export async function getUserEarningsHistory(userId: string) {
  const lines = await CreatorEarningLine.find({ user: userId })
    .populate("period", "year month status")
    .lean();

  const byPeriod = new Map<
    string,
    { periodId: string; year: number; month: number; status: string; totalPaise: number }
  >();

  for (const l of lines) {
    const per = l.period as unknown as { _id: mongoose.Types.ObjectId; year: number; month: number; status: string };
    const key = String(per._id);
    const cur = byPeriod.get(key) ?? {
      periodId: key,
      year: per.year,
      month: per.month,
      status: per.status,
      totalPaise: 0,
    };
    cur.totalPaise += l.amountPaise;
    byPeriod.set(key, cur);
  }

  return Array.from(byPeriod.values()).sort((a, b) => (b.year !== a.year ? b.year - a.year : b.month - a.month));
}
