import mongoose, { Schema, model } from "mongoose";

const storyHighlightSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    storyIds: [{ type: Schema.Types.ObjectId, ref: "Story" }],
    coverUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

export const StoryHighlight =
  mongoose.models.StoryHighlight ?? model("StoryHighlight", storyHighlightSchema);
