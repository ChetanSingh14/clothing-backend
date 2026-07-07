import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../common/middlewares/auth.middleware";
import { createOrderService, getAdminOrdersService, getMyOrdersService, updateOrderStatusService, updateAdminOrderStatusService, returnOrderService } from "./order.service";
import ErrorHandler, { catchAsyncError } from "../../common/utils/errorHandler";
import { logger } from "../../common/utils/logger.utils";
import prisma from "../../common/config/prisma.config";
import { getShippingRates, pushAndAssignOrder, trackOrder, getShippingLabel } from "../../common/services/shipmozo.service";

export const createOrder = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    const { totalAmount, items, paymentMethod, details, applyOffer } = req.body;

    if (!userId) {
      throw new ErrorHandler("Unauthorized", 401);
    }
    if (!totalAmount || !items || !Array.isArray(items)) {
      throw new ErrorHandler("Total amount and items array are required", 400);
    }

    logger.info(`📦 [Order] Placement attempt by user ID ${userId} for amount ₹${totalAmount}${applyOffer ? ' with offer applied' : ''}`);
    const result = await createOrderService(userId, totalAmount, items, paymentMethod, details, applyOffer);
    res.status(201).json(result);
  }
);

export const getMyOrders = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) throw new ErrorHandler("Unauthorized", 401);
    const result = await getMyOrdersService(userId);
    res.status(200).json(result);
  }
);

export const updateOrderStatus = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    const orderId = Number(req.params.id);
    const { status } = req.body;
    
    if (!userId) throw new ErrorHandler("Unauthorized", 401);
    if (isNaN(orderId) || !status) throw new ErrorHandler("Invalid request data", 400);
    
    const result = await updateOrderStatusService(userId, orderId, status);
    res.status(200).json(result);
  }
);

export const getAdminOrders = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    logger.info(`💼 [Admin] Retrieving order placement logs by admin ${req.user?.email}`);
    const result = await getAdminOrdersService();
    res.status(200).json(result);
  }
);

export const updateAdminOrderStatus = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const orderId = Number(req.params.id);
    const { status } = req.body;
    
    if (isNaN(orderId) || !status) throw new ErrorHandler("Invalid request data", 400);
    
    const result = await updateAdminOrderStatusService(orderId, status);
    res.status(200).json(result);
  }
);

export const returnOrder = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    const orderId = Number(req.params.id);
    const { returnAddress } = req.body;

    if (!userId) throw new ErrorHandler("Unauthorized", 401);
    if (isNaN(orderId) || !returnAddress) throw new ErrorHandler("Invalid request data", 400);

    const result = await returnOrderService(userId, orderId, returnAddress);
    res.status(200).json(result);
  }
);

export const calculateRates = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { pincode, totalAmount, items } = req.body;
    if (!pincode || !totalAmount || !items) {
      throw new ErrorHandler("Pincode, total amount, and items are required", 400);
    }
    const rates = await getShippingRates(Number(pincode), Number(totalAmount), items);
    res.status(200).json({ success: true, data: rates });
  }
);

export const adminGetRates = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const orderId = Number(req.params.id);
    if (isNaN(orderId)) {
      throw new ErrorHandler("Invalid order ID", 400);
    }
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new ErrorHandler("Order not found", 404);
    }
    const rates = await getShippingRates(Number(order.pincode), Number(order.totalAmount), order.items as any[]);
    res.status(200).json({ success: true, data: rates });
  }
);

export const adminShipOrder = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const orderId = Number(req.params.id);
    const { weightGrams, length, width, height, courierId } = req.body;
    if (isNaN(orderId)) {
      throw new ErrorHandler("Invalid order ID", 400);
    }
    const result = await pushAndAssignOrder(
      orderId,
      weightGrams ? Number(weightGrams) : undefined,
      { length: String(length), width: String(width), height: String(height) },
      courierId ? Number(courierId) : undefined
    );
    res.status(200).json(result);
  }
);

export const trackShipment = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const orderId = Number(req.params.id);
    const userId = req.user?.id;
    if (isNaN(orderId)) {
      throw new ErrorHandler("Invalid order ID", 400);
    }
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new ErrorHandler("Order not found", 404);
    }
    if (req.user?.role !== "ADMIN" && order.userId !== userId) {
      throw new ErrorHandler("Unauthorized access to this order tracking", 403);
    }

    if (!order.awbNumber) {
      res.status(200).json({ success: false, message: "Order is not shipped yet" });
      return;
    }

    const result = await trackOrder(order.awbNumber);
    res.status(200).json(result);
  }
);

export const adminGetLabel = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const orderId = Number(req.params.id);
    if (isNaN(orderId)) {
      throw new ErrorHandler("Invalid order ID", 400);
    }
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || !order.awbNumber) {
      throw new ErrorHandler("Order not shipped or AWB not found", 400);
    }
    const result = await getShippingLabel(order.awbNumber);
    res.status(200).json(result);
  }
);

export const shipmozoWebhook = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { order_id, reference_id, status } = req.body;
    logger.info(`🌐 [Shipmozo Webhook] Received webhook event for order ID ${order_id || reference_id} with status ${status}`);

    const idStr = String(order_id || reference_id || "");
    const orderId = Number(idStr);

    if (isNaN(orderId)) {
      res.status(400).json({ success: false, message: "Invalid order ID" });
      return;
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    let localStatus = order.status;
    const cleanStatus = String(status).toLowerCase();

    if (cleanStatus === "delivered") {
      localStatus = "DELIVERED";
    } else if (cleanStatus === "returned" || cleanStatus === "returned_to_origin") {
      localStatus = "RETURNED";
    } else if (cleanStatus === "shipped" || cleanStatus === "in_transit" || cleanStatus === "out_for_delivery") {
      localStatus = "SHIPPED";
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: localStatus,
        ...(localStatus === "DELIVERED" && !order.deliveredAt ? { deliveredAt: new Date() } : {}),
      },
    });

    if (localStatus === "DELIVERED" && !order.deliveredAt) {
      const email = updated.email || (await prisma.user.findUnique({ where: { id: updated.userId }, select: { email: true } }))?.email;
      if (email) {
        const { sendOrderDeliveredEmail } = require("../../common/services/email.service");
        sendOrderDeliveredEmail(email, updated);
      }
    }

    res.status(200).json({ success: true, message: `Webhook processed. Order status updated to ${localStatus}` });
  }
);
