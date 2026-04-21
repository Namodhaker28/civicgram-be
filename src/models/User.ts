import mongoose, { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    /** Set only for wallet users; omitted when absent so unique index does not see duplicate nulls. */
    walletAddress: { type: String, required: false, trim: true },
    email: { type: String, required: false, unique: true, sparse: true, trim: true, lowercase: true, index: true },
    mobile: { type: String, required: false, unique: true, sparse: true, trim: true, index: true },
    passwordHash: { type: String, required: false },
    username: { type: String, required: false, unique: true, sparse: true, trim: true },
    name: { type: String, default: "" },
    bio: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    /** Application role; `admin` can moderate and manage payouts. */
    role: { type: String, enum: ["user", "admin"], default: "user", index: true },
  },
  { timestamps: true }
);

/**
 * Uniqueness applies only when walletAddress is a non-empty string.
 * A plain unique index would treat missing/null as one key and block multiple email/mobile users.
 */
userSchema.index(
  { walletAddress: 1 },
  {
    unique: true,
    partialFilterExpression: { walletAddress: { $type: "string", $gt: "" } },
  }
);

export const User = mongoose.models.User ?? model("User", userSchema);
