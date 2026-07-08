import { Response, NextFunction } from "express";
import { AuthRequest } from "../../common/middlewares/auth.middleware";
import { createOrderService, getAdminOrdersService, getMyOrdersService, updateOrderStatusService, updateAdminOrderStatusService, returnOrderService } from "./order.service";
import ErrorHandler, { catchAsyncError } from "../../common/utils/errorHandler";
import { logger } from "../../common/utils/logger.utils";
import prisma from "../../common/config/prisma.config";
import nimbuspostService from "../../common/services/nimbuspost.service";

export const createOrder = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    const { totalAmount, items, paymentMethod, details, applyOffer, shippingCharges, codCharges, rtoCharges, courierId } = req.body;

    if (!userId) {
      throw new ErrorHandler("Unauthorized", 401);
    }
    if (!totalAmount || !items || !Array.isArray(items)) {
      throw new ErrorHandler("Total amount and items array are required", 400);
    }

    logger.info(`📦 [Order] Placement attempt by user ID ${userId} for amount ₹${totalAmount}${applyOffer ? ' with offer applied' : ''}`);
    const result = await createOrderService(userId, totalAmount, items, paymentMethod, details, applyOffer, shippingCharges || 0, codCharges || 0, rtoCharges || 0, courierId || null);
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

export const nimbusShipOrder = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const orderId = Number(req.params.id);
    if (isNaN(orderId)) throw new ErrorHandler("Invalid order ID", 400);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new ErrorHandler("Order not found", 404);

    if (order.nimbuspostAwb) throw new ErrorHandler("Order already shipped with Nimbuspost", 400);

    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

    const nimbusResponse = await nimbuspostService.createShipment(order, items as any[]);
    
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        nimbuspostAwb: nimbusResponse.awb_number,
        nimbuspostShipmentId: String(nimbusResponse.shipment_id),
        nimbuspostOrderId: String(nimbusResponse.order_id),
        nimbuspostLabel: nimbusResponse.label,
        status: "SHIPPED"
      }
    });

    res.status(200).json({ success: true, data: updatedOrder, message: "Order shipped successfully via Nimbuspost" });
  }
);

export const nimbusCancelOrder = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const orderId = Number(req.params.id);
    if (isNaN(orderId)) throw new ErrorHandler("Invalid order ID", 400);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || !order.nimbuspostAwb) throw new ErrorHandler("Order not found or no AWB associated", 404);

    try {
      await nimbuspostService.cancelShipment(order.nimbuspostAwb);
    } catch (error: any) {
      logger.warn(`[NimbusPost Cancel] Shipment cancel failed for AWB ${order.nimbuspostAwb}: ${error.message}. Proceeding with database cancellation.`);
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
      }
    });

    res.status(200).json({ success: true, message: "Shipment cancelled successfully", data: updatedOrder });
  }
);

export const nimbusTrackOrder = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const orderId = Number(req.params.id);
    if (isNaN(orderId)) throw new ErrorHandler("Invalid order ID", 400);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || !order.nimbuspostAwb) throw new ErrorHandler("Order not found or no AWB associated", 404);

    if (req.user?.role !== "ADMIN" && order.userId !== req.user?.id) {
       throw new ErrorHandler("Unauthorized to track this order", 401);
    }

    const trackingInfo = await nimbuspostService.trackShipment(order.nimbuspostAwb);

    res.status(200).json({ success: true, data: trackingInfo });
  }
);

export const calculateShipping = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { pincode, paymentMethod, orderAmount, totalQuantity } = req.body;
    if (!pincode) throw new ErrorHandler("Pincode is required", 400);
    if (!paymentMethod) throw new ErrorHandler("Payment method is required", 400);
    if (!orderAmount) throw new ErrorHandler("Order amount is required", 400);
    if (!totalQuantity) throw new ErrorHandler("Total quantity is required", 400);

    const { shippingFee, codFee, rtoFee, courierId } = await nimbuspostService.calculateShippingRate(
      pincode,
      paymentMethod,
      Number(orderAmount),
      Number(totalQuantity)
    );
    res.status(200).json({ success: true, shippingFee, codFee, rtoFee, courierId });
  }
);
