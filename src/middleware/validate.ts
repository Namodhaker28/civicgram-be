import type { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/** Validate req.body against a Zod schema; 400 on failure. */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({ error: e.flatten().fieldErrors });
        return;
      }
      next(e);
    }
  };
}
