import { Request, Response } from "express";

export const handleResendWebhook = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    
    // Log the webhook payload for debugging and monitoring
    console.log("Received Resend Webhook:", JSON.stringify(payload, null, 2));

    // Handle different event types from Resend
    // Examples: 'email.sent', 'email.delivered', 'email.bounced', 'email.complained'
    const eventType = payload.type;
    
    switch (eventType) {
      case "email.delivered":
        console.log(`Email delivered to: ${payload.data.to[0]}`);
        break;
      case "email.bounced":
        console.log(`Email bounced for: ${payload.data.to[0]}. Reason: ${payload.data.bounce_summary}`);
        // Here you could update user status in DB if needed
        break;
      case "email.complained":
        console.log(`Email spam complaint from: ${payload.data.to[0]}`);
        break;
      default:
        console.log(`Unhandled Resend event type: ${eventType}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Error processing Resend webhook:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
