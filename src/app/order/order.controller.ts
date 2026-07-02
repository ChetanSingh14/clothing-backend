import { Response, NextFunction } from "express";
import { AuthRequest } from "../../common/middlewares/auth.middleware";
import { createOrderService, getAdminOrdersService, getMyOrdersService, updateOrderStatusService, updateAdminOrderStatusService } from "./order.service";
import ErrorHandler, { catchAsyncError } from "../../common/utils/errorHandler";
import { logger } from "../../common/utils/logger.utils";

export const createOrder = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    const { totalAmount, items, paymentMethod } = req.body;

    if (!userId) {
      throw new ErrorHandler("Unauthorized", 401);
    }
    if (!totalAmount || !items || !Array.isArray(items)) {
      throw new ErrorHandler("Total amount and items array are required", 400);
    }

    logger.info(`📦 [Order] Placement attempt by user ID ${userId} for amount $${totalAmount}`);
    const result = await createOrderService(userId, totalAmount, items, paymentMethod);
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
