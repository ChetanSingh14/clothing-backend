import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../common/middlewares/auth.middleware";
import { getSettingsService, updateSettingsService } from "./settings.service";
import ErrorHandler, { catchAsyncError } from "../../common/utils/errorHandler";
import { logger } from "../../common/utils/logger.utils";

export const getSettings = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const result = await getSettingsService();
    res.status(200).json(result);
  }
);

export const updateSettings = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    logger.info(`💼 [Admin] Updating brand settings by admin ${req.user?.email}`);
    const result = await updateSettingsService(req.body);
    res.status(200).json(result);
  }
);
