import mongoose, { Schema, model } from "mongoose";

const followSchema = new Schema(
  {
    follower: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    following: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: false }
);

followSchema.index({ follower: 1, following: 1 }, { unique: true });

export const Follow = mongoose.models.Follow ?? model("Follow", followSchema);
