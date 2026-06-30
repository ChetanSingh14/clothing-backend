import { Response, NextFunction } from "express";
import { AuthRequest } from "../../common/middlewares/auth.middleware";
import { getUserProfileService, updateProfileService } from "./user.service";
import ErrorHandler, { catchAsyncError } from "../../common/utils/errorHandler";
import { logger } from "../../common/utils/logger.utils";

export const getMyProfile = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      logger.error("Unauthorized profile fetch attempt");
      throw new ErrorHandler("Unauthorized", 401);
    }

    const result = await getUserProfileService(userId);
    res.status(200).json(result);
  }
);

export const updateProfile = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    const { name } = req.body;

    if (!userId) {
      logger.error("Unauthorized profile update attempt");
      throw new ErrorHandler("Unauthorized", 401);
    }

    if (!name) {
      throw new ErrorHandler("Name is required to update profile", 400);
    }

    const result = await updateProfileService(userId, name);
    res.status(200).json(result);
  }
);
