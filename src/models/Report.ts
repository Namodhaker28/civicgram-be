import mongoose, { Schema, model } from "mongoose";

const reportSchema = new Schema(
  {
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetType: { type: String, required: true, enum: ["post", "user"] },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Report = mongoose.models.Report ?? model("Report", reportSchema);
