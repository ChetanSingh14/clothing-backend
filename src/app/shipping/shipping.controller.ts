import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../common/middlewares/auth.middleware";
import { checkServiceabilityService, generateManifestService, calculateRateService, trackShipmentService } from "./shipping.service";
import ErrorHandler, { catchAsyncError } from "../../common/utils/errorHandler";
import { logger } from "../../common/utils/logger.utils";
import prisma from "../../common/config/prisma.config";
import { sendOrderTrackingUpdateEmail, sendOrderDeliveredEmail } from "../../common/services/email.service";

// Pincode Serviceability Check (Public Endpoint for Checkout)
export const checkServiceability = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { pincode } = req.query;

    if (!pincode || typeof pincode !== "string") {
      throw new ErrorHandler("Pincode query parameter is required", 400);
    }

    if (pincode.length !== 6 || isNaN(Number(pincode))) {
      throw new ErrorHandler("Pincode must be a 6-digit number", 400);
    }

    logger.info(`🔍 [Shipping Controller] Checking pincode serviceability for: ${pincode}`);
    const result = await checkServiceabilityService(pincode);
    res.status(200).json({
      success: true,
      data: result
    });
  }
);

// Manual Manifest Generation (Admin Only)
export const generateManifest = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { orderId } = req.body;

    if (!orderId) {
      throw new ErrorHandler("orderId is required", 400);
    }

    const numericOrderId = Number(orderId);
    if (isNaN(numericOrderId)) {
      throw new ErrorHandler("orderId must be a valid number", 400);
    }

    logger.info(`📦 [Shipping Controller] Request to generate manifest for Order #${numericOrderId} by admin ${req.user?.email}`);
    const result = await generateManifestService(numericOrderId);
    res.status(200).json(result);
  }
);

// Dynamic Shipping Cost Calculation (Public)
export const checkShippingRate = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { pincode, weight, subtotal } = req.query;

    if (!pincode || typeof pincode !== "string") {
      throw new ErrorHandler("Pincode query parameter is required", 400);
    }

    const numericWeight = Number(weight) || 280;
    const numericSubtotal = Number(subtotal) || 0;

    logger.info(`🚚 [Shipping Controller] Querying rate for destination: ${pincode}, Weight: ${numericWeight}g`);
    const rateDetails = await calculateRateService(pincode as string, numericWeight, numericSubtotal);
    
    res.status(200).json({
      success: true,
      data: rateDetails
    });
  }
);

// Track package waybill (Requires Auth)
export const trackShipment = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { waybill } = req.params;

    if (!waybill) {
      throw new ErrorHandler("Waybill parameter is required", 400);
    }

    logger.info(`🔍 [Shipping Controller] Tracking waybill: ${waybill}`);
    const trackingData = await trackShipmentService(waybill as string);

    res.status(200).json({
      success: true,
      data: trackingData
    });
  }
);

// Push Status Webhook Listener (Public)
export const delhiveryWebhook = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const payload = req.body;
    logger.info(`📥 [Delhivery Webhook] Received status push: ${JSON.stringify(payload)}`);

    const shipment = payload?.Shipment;
    if (!shipment) {
      res.status(200).json({ success: true, message: "Empty shipment payload ignored" });
      return;
    }

    const waybill = shipment.AWB;
    const statusInfo = shipment.Status;

    if (!waybill || !statusInfo) {
      res.status(200).json({ success: true, message: "Invalid payload parameters ignored" });
      return;
    }

    const statusType = statusInfo.StatusType; // "DLVD", "RTO", "UD", etc.
    const statusText = statusInfo.Status;      // Human readable status
    const instructions = statusInfo.Instructions || "";

    const order = await prisma.order.findFirst({
      where: { delhivery_waybill: waybill }
    });

    if (!order) {
      logger.warn(`⚠️ [Delhivery Webhook] No order found for AWB: ${waybill}`);
      res.status(200).json({ success: true, message: "AWB not found in database" });
      return;
    }

    let orderStatus = order.status;
    let notifyCustomer = false;
    let emailSubject = "";
    let emailDesc = "";

    if (statusType === "DLVD") {
      orderStatus = "DELIVERED";
      notifyCustomer = true;
      emailSubject = "Package Delivered Successfully";
      emailDesc = "Your package has been marked as delivered by our shipping carrier. Thank you for shopping with us!";
    } else if (statusType === "RTO" || statusType === "UD") {
      orderStatus = "Returned/Failed Delivery";
      notifyCustomer = true;
      emailSubject = `Delivery Attempt Failed (${statusType})`;
      emailDesc = `The carrier returned status: "${statusText}". Reason: "${instructions}". Our support team will get in touch with you shortly.`;
    } else {
      notifyCustomer = true;
      emailSubject = `Shipment Update: ${statusText}`;
      emailDesc = `Your shipment is currently in transit. Status: ${statusText}. Location: ${statusInfo.StatusLocation || "Carrier Facility"}.`;
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: orderStatus,
        shipment_status: statusText
      }
    });
    
    logger.info(`✅ [Delhivery Webhook] Updated Order #${order.id} status to ${orderStatus} (Shipment status: ${statusText})`);

    let email = order.email;
    if (!email) {
      const user = await prisma.user.findUnique({
        where: { id: order.userId },
        select: { email: true }
      });
      email = user?.email || "";
    }

    if (email && notifyCustomer) {
      if (statusType === "DLVD") {
        sendOrderDeliveredEmail(email, order);
      } else {
        sendOrderTrackingUpdateEmail(email, order, emailSubject, emailDesc);
      }
    }

    res.status(200).json({
      success: true,
      message: "Webhook processed successfully"
    });
  }
);
