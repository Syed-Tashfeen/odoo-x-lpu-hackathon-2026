import { Resend } from "resend";
import { env } from "../config/env.js";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

/**
 * Send Password Reset OTP email using Resend.
 */
export async function sendOtpEmail(to: string, otp: string): Promise<boolean> {
  if (!resend || !env.RESEND_API_KEY) {
    console.log(`ℹ️ [Email Skipped] Resend API key not configured. OTP for ${to}: ${otp}`);
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject: "🔐 Your StockSense Password Reset OTP",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
              .card { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
              .logo { font-size: 22px; font-weight: 700; color: #1e293b; margin-bottom: 24px; display: inline-block; }
              .badge { background: #eff6ff; color: #2563eb; font-weight: 600; padding: 4px 10px; border-radius: 9999px; font-size: 12px; }
              .otp-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0; }
              .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a; margin: 0; }
              .info { color: #64748b; font-size: 14px; line-height: 1.6; }
              .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="logo">📦 StockSense <span class="badge">Security</span></div>
              <h2 style="color: #0f172a; margin-top: 0;">Password Reset Request</h2>
              <p class="info">We received a request to reset your password. Use the verification code below to proceed:</p>
              
              <div class="otp-box">
                <p class="otp-code">${otp}</p>
              </div>
              
              <p class="info">⏰ <strong>This code will expire in 10 minutes.</strong></p>
              <p class="info">If you did not request a password reset, you can safely ignore this email — your account remains secure.</p>
              
              <div class="footer">
                StockSense Inventory Management System • Hackathon 2026
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.warn(`⚠️ [Resend Warning] Failed to send email to ${to}:`, error.message);
      return false;
    }

    console.log(`📧 [Resend Success] OTP email sent to ${to} (Message ID: ${data?.id})`);
    return true;
  } catch (err: any) {
    console.error(`❌ [Resend Error] Unexpected error sending email to ${to}:`, err.message);
    return false;
  }
}
