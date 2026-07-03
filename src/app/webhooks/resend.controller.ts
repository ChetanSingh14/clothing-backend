import { Request, Response } from "express";
import { Webhook } from "svix";

export const handleResendWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.warn("RESEND_WEBHOOK_SECRET is not defined. Skipping verification.");
      res.status(500).json({ error: "Webhook secret missing" });
      return;
    }

    const payload = (req as any).rawBody;
    const headers = {
      "svix-id": req.headers["svix-id"] as string,
      "svix-timestamp": req.headers["svix-timestamp"] as string,
      "svix-signature": req.headers["svix-signature"] as string,
    };

    const wh = new Webhook(webhookSecret);
    let evt: any;

    try {
      evt = wh.verify(payload, headers);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    // Log the verified webhook payload for debugging and monitoring
    console.log("Verified Resend Webhook Event:", evt.type);

    // Handle different event types from Resend
    const eventType = evt.type;
    const eventData = evt.data;
    
    switch (eventType) {
      case "email.delivered":
        console.log(`Email delivered to: ${eventData.to[0]}`);
        break;
      case "email.bounced":
        console.log(`Email bounced for: ${eventData.to[0]}. Reason: ${eventData.bounce_summary}`);
        break;
      case "email.complained":
        console.log(`Email spam complaint from: ${eventData.to[0]}`);
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
