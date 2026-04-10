import mongoose, { Schema, model } from "mongoose";

const likeSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
  },
  { timestamps: false }
);

likeSchema.index({ post: 1 });
likeSchema.index({ user: 1, post: 1 }, { unique: true });

export const Like = mongoose.models.Like ?? model("Like", likeSchema);
