import mongoose, { Schema, model } from "mongoose";

const storySchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    mediaUrl: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

storySchema.index({ author: 1, expiresAt: 1 });

export const Story = mongoose.models.Story ?? model("Story", storySchema);
