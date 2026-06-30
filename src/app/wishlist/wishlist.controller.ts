import { Response, NextFunction } from "express";
import { AuthRequest } from "../../common/middlewares/auth.middleware";
import { getWishlistService, toggleWishlistService } from "./wishlist.service";
import ErrorHandler, { catchAsyncError } from "../../common/utils/errorHandler";
import { logger } from "../../common/utils/logger.utils";

export const getWishlist = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ErrorHandler("Unauthorized", 401);
    }
    const result = await getWishlistService(userId);
    res.status(200).json(result);
  }
);

export const toggleWishlist = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    const productId = Number(req.params.productId);

    if (!userId) {
      throw new ErrorHandler("Unauthorized", 401);
    }
    if (isNaN(productId)) {
      throw new ErrorHandler("Invalid product ID", 400);
    }

    logger.info(`❤️ [Wishlist] Toggle attempt by user ID ${userId} for product ID ${productId}`);
    const result = await toggleWishlistService(userId, productId);
    res.status(200).json(result);
  }
);
