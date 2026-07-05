import { Response, NextFunction } from "express";
import { AuthRequest } from "../../common/middlewares/auth.middleware";
import { claimOfferService, getOfferStatusService } from "./offer.service";
import ErrorHandler, { catchAsyncError } from "../../common/utils/errorHandler";
import { logger } from "../../common/utils/logger.utils";

/**
 * Claim the QR scan offer
 * POST /api/v1/offer/claim
 */
export const claimOffer = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) throw new ErrorHandler("Please login to claim this offer", 401);

    logger.info(`🎁 [Offer] User ${userId} claiming QR scan offer`);
    const result = await claimOfferService(userId);
    res.status(200).json(result);
  }
);

/**
 * Check offer status
 * GET /api/v1/offer/status
 */
export const getOfferStatus = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) throw new ErrorHandler("Unauthorized", 401);

    const result = await getOfferStatusService(userId);
    res.status(200).json(result);
  }
);
