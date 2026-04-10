import mongoose, { Schema, model } from "mongoose";

const postSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true, default: "" },
    imageUrls: { type: [String], default: [] },
    videoUrl: { type: String, default: null },
    isArchived: { type: Boolean, default: false, index: true },
    tags: { type: [String], default: [], index: true },
  },
  { timestamps: true }
);

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ isArchived: 1, createdAt: -1 });

export const Post = mongoose.models.Post ?? model("Post", postSchema);
