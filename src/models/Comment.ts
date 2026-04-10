import mongoose, { Schema, model } from "mongoose";

const commentSchema = new Schema(
  {
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    parent: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, createdAt: 1 });

export const Comment = mongoose.models.Comment ?? model("Comment", commentSchema);
