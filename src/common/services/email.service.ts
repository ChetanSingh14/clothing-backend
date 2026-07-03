import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resendApiKey = process.env.RESEND_API_KEY;

let resend: Resend | null = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
} else {
  console.warn("RESEND_API_KEY is not set. Email service is disabled.");
}

export const sendWelcomeEmail = async (email: string, name: string) => {
  if (!resend) {
    console.warn("Resend client not initialized. Skipping email send to:", email);
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "MDFK Clothing <hello@mdfkclothing.com>",
      to: email,
      subject: "Welcome to MDFK Clothing!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Welcome to MDFK Clothing, ${name}!</h2>
          <p style="font-size: 16px; color: #555;">
            We are thrilled to have you here. Explore our latest collections and find the best fit for your style.
          </p>
          <p style="font-size: 16px; color: #555;">
            If you have any questions, feel free to reply to this email.
          </p>
          <br />
          <p style="font-size: 14px; color: #888;">
            Best regards,<br />
            MDFK Clothing Team
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Error sending welcome email:", error);
    } else {
      console.log("Welcome email sent successfully to", email, "ID:", data?.id);
    }
    
    return data;
  } catch (error) {
    console.error("Failed to send welcome email:", error);
  }
};
