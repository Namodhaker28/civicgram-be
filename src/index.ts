import express from "express";
import cors from "cors";
import path from "path";

import { connectDb } from "./lib/db.js";
import { env } from "./lib/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { optionalAuth } from "./middleware/auth.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import followRoutes from "./routes/followRoutes.js";
import blockRoutes from "./routes/blockRoutes.js";
import suggestionsRoutes from "./routes/suggestionsRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import likeRoutes from "./routes/likeRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import feedRoutes from "./routes/feedRoutes.js";
import bookmarkRoutes from "./routes/bookmarkRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import trendingRoutes from "./routes/trendingRoutes.js";
import storyRoutes from "./routes/storyRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

async function main() {
  await connectDb();

  const app = express();

  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(optionalAuth);

  const uploadsPath = path.join(process.cwd(), "uploads");
  app.use("/uploads", express.static(uploadsPath));

  app.use("/auth", authRoutes);
  app.use("/users/suggestions", suggestionsRoutes);
  app.use("/users", blockRoutes);
  app.use("/users", userRoutes);
  app.use("/users", followRoutes);
  app.use("/posts", postRoutes);
  app.use("/posts", likeRoutes);
  app.use("/posts", commentRoutes);
  app.use("/feed", feedRoutes);
  app.use("/bookmarks", bookmarkRoutes);
  app.use("/notifications", notificationRoutes);
  app.use("/search", searchRoutes);
  app.use("/trending", trendingRoutes);
  app.use("/stories", storyRoutes);
  app.use("/report", reportRoutes);

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use(errorHandler);

  app.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
