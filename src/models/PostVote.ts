import mongoose, { Schema, model } from "mongoose";

/** User vote on a post: +1 upvote or -1 downvote; at most one document per (user, post). */
const postVoteSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    value: { type: Number, required: true, enum: [1, -1] },
  },
  { timestamps: false }
);

postVoteSchema.index({ post: 1 });
postVoteSchema.index({ user: 1, post: 1 }, { unique: true });

export const PostVote =
  mongoose.models.PostVote ?? model("PostVote", postVoteSchema, "postvotes");
