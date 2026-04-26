import { Router } from "express";
import { z } from "zod";
import {
  registerWithPassword,
  loginWithPassword,
  verifyEmailWithToken,
  resendVerificationEmail,
  signInWithGoogle,
} from "../services/authService.js";

const router = Router();

const registerLoginFields = z.object({
  email: z.string().email("Invalid email").optional(),
  mobile: z.string().min(1).optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginBodySchema = registerLoginFields.refine(
  (data) => (!!data.email) !== (!!data.mobile),
  {
    message: "Provide either email or mobile (not both)",
    path: ["email"],
  }
);

const registerBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().email("Invalid email"),
  mobile: z.string().min(1, "Mobile is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const verifyEmailBodySchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

const resendBodySchema = z.object({
  email: z.string().email("Invalid email"),
});

const googleBodySchema = z.object({
  credential: z.string().min(1, "Google credential is required"),
});

/** Extract first user-facing message from Zod field errors. */
function firstValidationMessage(
  fieldErrors: Record<string, string[] | undefined>
): string {
  const first = Object.values(fieldErrors).flat().filter(Boolean)[0];
  return typeof first === "string" ? first : "Validation failed";
}

/** POST /auth/register — email + mobile + password; verification email sent (no JWT). */
router.post("/register", async (req, res, next) => {
  try {
    const result = registerBodySchema.safeParse(req.body);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const message = firstValidationMessage(flat);
      res.status(400).json({ error: message });
      return;
    }
    const r = await registerWithPassword({
      name: result.data.name,
      email: result.data.email,
      mobile: result.data.mobile,
      password: result.data.password,
    });
    res.json(r);
  } catch (e) {
    console.error("[auth/register]", (e as Error).message);
    next(e);
  }
});

/** POST /auth/verify-email — exchange token for JWT after email verification. */
router.post("/verify-email", async (req, res, next) => {
  try {
    const result = verifyEmailBodySchema.safeParse(req.body);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const message = firstValidationMessage(flat);
      res.status(400).json({ error: message });
      return;
    }
    const r = await verifyEmailWithToken(result.data.token);
    res.json(r);
  } catch (e) {
    console.error("[auth/verify-email]", (e as Error).message);
    next(e);
  }
});

/** POST /auth/resend-verification — resend link for unverified password accounts. */
router.post("/resend-verification", async (req, res, next) => {
  try {
    const result = resendBodySchema.safeParse(req.body);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const message = firstValidationMessage(flat);
      res.status(400).json({ error: message });
      return;
    }
    const r = await resendVerificationEmail(result.data.email);
    res.json(r);
  } catch (e) {
    console.error("[auth/resend-verification]", (e as Error).message);
    next(e);
  }
});

/** POST /auth/login — email/mobile + password. */
router.post("/login", async (req, res, next) => {
  try {
    const result = loginBodySchema.safeParse(req.body);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const message = firstValidationMessage(flat);
      res.status(400).json({ error: message });
      return;
    }
    const r = await loginWithPassword({
      email: result.data.email,
      mobile: result.data.mobile,
      password: result.data.password,
    });
    res.json(r);
  } catch (e) {
    console.error("[auth/login]", (e as Error).message);
    next(e);
  }
});

/** POST /auth/google — Google ID token (GIS credential). */
router.post("/google", async (req, res, next) => {
  try {
    const result = googleBodySchema.safeParse(req.body);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const message = firstValidationMessage(flat);
      res.status(400).json({ error: message });
      return;
    }
    const r = await signInWithGoogle(result.data.credential);
    res.json(r);
  } catch (e) {
    console.error("[auth/google]", (e as Error).message);
    next(e);
  }
});

export default router;
