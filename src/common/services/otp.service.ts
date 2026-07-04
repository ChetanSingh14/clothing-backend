import crypto from "crypto";
import { sendOtpEmail } from "./email.service";

const OTP_SECRET = process.env.JWT_SECRET || "mdfk_otp_secret_key_123";

/**
 * Generates a 6-digit OTP, constructs a signed hash, and emails the OTP to the user.
 * Returns the signed token to be sent back to the client.
 */
export const generateAndSendOtp = async (email: string, reason: string): Promise<string> => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 10 * 60 * 1000; // 10 minutes from now

  const data = `${email}.${otp}.${expires}`;
  const hash = crypto.createHmac("sha256", OTP_SECRET).update(data).digest("hex");
  const token = `${hash}.${expires}`;

  // Send the OTP via email
  await sendOtpEmail(email, otp, reason);

  return token;
};

/**
 * Verifies if the user's OTP matches the cryptographic hash.
 */
export const verifyOtp = (email: string, otp: string, token: string): boolean => {
  try {
    if (!token || !token.includes(".")) return false;

    const [hash, expiresStr] = token.split(".");
    const expires = parseInt(expiresStr, 10);

    // Check expiration
    if (Date.now() > expires) {
      return false;
    }

    // Reconstruct data and verify HMAC
    const data = `${email}.${otp}.${expires}`;
    const calculatedHash = crypto.createHmac("sha256", OTP_SECRET).update(data).digest("hex");

    return calculatedHash === hash;
  } catch (err) {
    console.error("OTP Verification error:", err);
    return false;
  }
};
