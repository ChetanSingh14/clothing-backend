import { Request, Response } from "express";
import prisma from "../../common/config/prisma.config";
import { sendOrderDeliveredEmail } from "../../common/services/email.service";
import { logger } from "../../common/utils/logger.utils";
import crypto from "crypto";

// Map NimbusPost status values to internal order status values
function mapNimbusStatusToOrderStatus(nimbusStatus: string): string | null {
  const status = nimbusStatus.toLowerCase();
  if (status.includes("deliver")) {
    return "DELIVERED";
  }
  if (status.includes("cancel")) {
    return "CANCELLED";
  }
  if (
    status.includes("ship") || 
    status.includes("transit") || 
    status.includes("dispatch") || 
    status.includes("pickup") || 
    status.includes("out for delivery")
  ) {
    return "SHIPPED";
  }
  if (status.includes("rto") || status.includes("return")) {
    return "RETURNED";
  }
  return null;
}

export const handleNimbuspostWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info(`Incoming NimbusPost Webhook payload: ${JSON.stringify(req.body)}`);

    // Verify HMAC signature if webhook secret is configured
    const webhookSecret = process.env.NIMBUSPOST_WEBHOOK_SECRET;
    const signature = req.headers["x-hmac-sha256"] as string;

    if (webhookSecret) {
      if (!signature) {
        logger.warn("NimbusPost webhook rejected: missing signature header (x-hmac-sha256)");
        res.status(401).json({ success: false, error: "Missing signature header" });
        return;
      }
      const rawBody = (req as any).rawBody;
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody || "")
        .digest("base64");

      if (signature !== expectedSignature) {
        logger.warn(`NimbusPost webhook rejected: invalid signature. Got: ${signature}, expected: ${expectedSignature}`);
        res.status(400).json({ success: false, error: "Invalid signature" });
        return;
      }
    }

    // extract AWB and status using various potential keys for robustness
    const awb = req.body.awb || req.body.awb_number || req.body.tracking_number || req.body.data?.awb || req.body.data?.awb_number;
    let nimbusStatus = req.body.status || req.body.tag || req.body.current_status || req.body.data?.status || req.body.data?.tag;

    if (typeof nimbusStatus === "object" && nimbusStatus !== null) {
      nimbusStatus = nimbusStatus.status || nimbusStatus.status_name || nimbusStatus.tag || nimbusStatus.name;
    }

    if (!awb || !nimbusStatus) {
      logger.warn(`NimbusPost Webhook did not contain required awb or status fields. Request body: ${JSON.stringify(req.body)}`);
      res.status(400).json({ success: false, error: "Missing awb or status field" });
      return;
    }

    // Find the corresponding order by AWB (check standard orders first)
    const order = await prisma.order.findFirst({
      where: { nimbuspostAwb: String(awb) }
    });

    let exchangeOrder = null;
    if (!order) {
      // If not found in standard orders, check exchange orders
      exchangeOrder = await prisma.exchangeOrder.findFirst({
        where: { nimbuspostAwb: String(awb) }
      });
    }

    if (!order && !exchangeOrder) {
      logger.warn(`No order or exchange order found with nimbuspostAwb: ${awb}`);
      res.status(404).json({ success: false, error: "Order or Exchange order not found for AWB" });
      return;
    }

    const mappedStatus = mapNimbusStatusToOrderStatus(String(nimbusStatus));
    
    if (mappedStatus) {
      if (exchangeOrder) {
        if (mappedStatus !== exchangeOrder.status) {
          logger.info(`Updating Exchange Order #${exchangeOrder.id} status from ${exchangeOrder.status} to ${mappedStatus} via NimbusPost Webhook`);
          
          await prisma.exchangeOrder.update({
            where: { id: exchangeOrder.id },
            data: {
              status: mappedStatus,
              ...(mappedStatus === "DELIVERED" && !exchangeOrder.deliveredAt ? { deliveredAt: new Date() } : {})
            }
          });
        }
      } else if (order) {
        if (mappedStatus !== order.status) {
          logger.info(`Updating Order #${order.id} status from ${order.status} to ${mappedStatus} via NimbusPost Webhook`);
          
          const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: {
              status: mappedStatus,
              ...(mappedStatus === "DELIVERED" && !order.deliveredAt ? { deliveredAt: new Date() } : {})
            }
          });

          // If status changed to DELIVERED, send the delivered email
          if (mappedStatus === "DELIVERED") {
            let email = updatedOrder.email;
            if (!email) {
              const user = await prisma.user.findUnique({
                where: { id: updatedOrder.userId },
                select: { email: true }
              });
              email = user?.email || null;
            }
            if (email) {
              sendOrderDeliveredEmail(email, updatedOrder);
            }
          }
        }
      }
    } else {
      logger.info(`AWB ${awb} status update ignored: already at target status or status mapping failed for ${nimbusStatus}`);
    }

    res.status(200).json({ success: true, message: "Webhook processed successfully" });
  } catch (error: any) {
    logger.error(`Error processing NimbusPost webhook: ${error.message}`);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};
