import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { HttpError } from "../lib/httpError.js";

/** Central error handler; returns consistent JSON error shape and logs errors. */
export function errorHandler(
  err: Error & { statusCode?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "Uploaded file is too large" });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }
  // Multer fileFilter and other upload validation errors
  if (
    err.message === "Avatar must be a JPEG, PNG, WebP, or GIF image" ||
    err.message.startsWith("Unexpected field")
  ) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  const statusCode = err.statusCode ?? 500;
  const message = err.message || "Internal server error";
  if (process.env.NODE_ENV === "production") {
    console.error("[error]", message);
  } else {
    console.error("[error]", message, err.stack);
  }
  res.status(statusCode).json({
    error: message,
  });
}
