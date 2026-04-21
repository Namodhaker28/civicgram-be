import mongoose, { Schema, model } from "mongoose";

/** One line per post per closed payout period (earnings snapshot). */
const creatorEarningLineSchema = new Schema(
  {
    period: { type: Schema.Types.ObjectId, ref: "PayoutPeriod", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    netScore: { type: Number, required: true, min: 0 },
    amountPaise: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

creatorEarningLineSchema.index({ period: 1, post: 1 }, { unique: true });

export const CreatorEarningLine =
  mongoose.models.CreatorEarningLine ?? model("CreatorEarningLine", creatorEarningLineSchema);
