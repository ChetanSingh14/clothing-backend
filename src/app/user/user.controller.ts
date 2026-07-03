import { Response, NextFunction } from "express";
import { AuthRequest } from "../../common/middlewares/auth.middleware";
import { getUserProfileService, updateProfileService, adminUpdateUserService } from "./user.service";
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
    const { name, profileImage, fullName, phone, address, landmark, pincode, state, city } = req.body;

    if (!userId) {
      logger.error("Unauthorized profile update attempt");
      throw new ErrorHandler("Unauthorized", 401);
    }

    const result = await updateProfileService(userId, {
      name,
      profileImage,
      fullName,
      phone,
      address,
      landmark,
      pincode,
      state,
      city,
    });
    res.status(200).json(result);
  }
);

export const adminUpdateUser = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      throw new ErrorHandler("Invalid user ID", 400);
    }

    logger.info(`💼 [Admin] Updating profile/password for user ID ${id} by admin ${req.user?.email}`);
    const result = await adminUpdateUserService(id, req.body);
    res.status(200).json(result);
  }
);
