import mongoose, { Schema, model } from "mongoose";

const payoutPeriodSchema = new Schema(
  {
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    status: {
      type: String,
      enum: ["open", "closed", "paid"],
      default: "closed",
      index: true,
    },
    computedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

payoutPeriodSchema.index({ year: 1, month: 1 }, { unique: true });

export const PayoutPeriod =
  mongoose.models.PayoutPeriod ?? model("PayoutPeriod", payoutPeriodSchema);
