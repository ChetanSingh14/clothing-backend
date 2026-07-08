import { Response, NextFunction } from "express";
import { AuthRequest } from "../../common/middlewares/auth.middleware";
import * as customOrderService from "./custom-order.service";
import ErrorHandler, { catchAsyncError } from "../../common/utils/errorHandler";

export const createCustomOrder = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    const { designImageUrl, designNotes, color, size, quantity, fullName, email, phone, address, landmark, pincode, state, city } = req.body;

    if (!userId) {
      throw new ErrorHandler("Unauthorized", 401);
    }
    if (!designImageUrl) {
      throw new ErrorHandler("Design image URL is required", 400);
    }

    const order = await customOrderService.createCustomOrder({
      userId,
      designImageUrl,
      designNotes,
      color,
      size,
      quantity,
      fullName,
      email,
      phone,
      address,
      landmark,
      pincode,
      state,
      city
    });

    res.status(201).json({
      success: true,
      data: order,
    });
  }
);

export const getMyCustomOrders = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ErrorHandler("Unauthorized", 401);
    }
    const orders = await customOrderService.getUserCustomOrders(userId);

    res.status(200).json({
      success: true,
      data: orders,
    });
  }
);

export const getAdminCustomOrders = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const orders = await customOrderService.getAllCustomOrders();

    res.status(200).json({
      success: true,
      data: orders,
    });
  }
);

export const updateCustomOrderStatus = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const orderId = Number(req.params.id);
    const { status } = req.body;

    if (isNaN(orderId)) {
      throw new ErrorHandler("Invalid order ID", 400);
    }
    if (!status) {
      throw new ErrorHandler("Status is required", 400);
    }

    const order = await customOrderService.updateCustomOrderStatus(orderId, status);

    res.status(200).json({
      success: true,
      data: order,
    });
  }
);
