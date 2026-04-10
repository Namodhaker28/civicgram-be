import mongoose, { Schema, model } from "mongoose";

const blockSchema = new Schema(
  {
    blocker: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    blocked: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: false }
);

blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

export const Block = mongoose.models.Block ?? model("Block", blockSchema);
