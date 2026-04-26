import { env } from "../lib/env.js";

const VERIFY_SUBJECT = "Verify your civicGram email";

/**
 * Sends email verification link via Resend when `RESEND_API_KEY` and `MAIL_FROM` are set;
 * otherwise logs the link (development / missing config).
 */
export async function sendVerificationEmail(toEmail: string, rawToken: string): Promise<void> {
  const link = `${env.FRONTEND_ORIGIN.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(rawToken)}`;
  const html = `
    <p>Thanks for signing up for civicGram.</p>
    <p><a href="${link}">Verify your email</a></p>
    <p>If you did not create an account, you can ignore this message.</p>
  `;

  if (env.RESEND_API_KEY && env.MAIL_FROM) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [toEmail],
        subject: VERIFY_SUBJECT,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[email] Resend error", res.status, text);
      throw new Error("Failed to send verification email");
    }
    return;
  }

  console.warn("[email] RESEND_API_KEY or MAIL_FROM not set; verification link:", link);
}
