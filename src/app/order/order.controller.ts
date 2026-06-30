import { Response, NextFunction } from "express";
import { AuthRequest } from "../../common/middlewares/auth.middleware";
import { createOrderService, getAdminOrdersService } from "./order.service";
import ErrorHandler, { catchAsyncError } from "../../common/utils/errorHandler";
import { logger } from "../../common/utils/logger.utils";

export const createOrder = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    const { totalAmount, items } = req.body;

    if (!userId) {
      throw new ErrorHandler("Unauthorized", 401);
    }
    if (!totalAmount || !items || !Array.isArray(items)) {
      throw new ErrorHandler("Total amount and items array are required", 400);
    }

    logger.info(`📦 [Order] Placement attempt by user ID ${userId} for amount $${totalAmount}`);
    const result = await createOrderService(userId, totalAmount, items);
    res.status(201).json(result);
  }
);

export const getAdminOrders = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    logger.info(`💼 [Admin] Retrieving order placement logs by admin ${req.user?.email}`);
    const result = await getAdminOrdersService();
    res.status(200).json(result);
  }
);
