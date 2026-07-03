import { Request, Response, NextFunction } from "express";
import { registerService, loginService } from "./auth.service";
import ErrorHandler, { catchAsyncError } from "../../common/utils/errorHandler";
import { logger } from "../../common/utils/logger.utils";

import { AuthRequest } from "../../common/middlewares/auth.middleware";

export const signup = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { name, email, password } = req.body;

    logger.info(`📝 [Signup] Registration attempt for email: ${email}`);

    const result = await registerService(name, email, password);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: { user: result.user, token: result.token },
    });
  }
);

export const login = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body;

    logger.info(`🔑 [Login] Auth attempt for email: ${email}`);

    const result = await loginService(email, password);

    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      data: { user: result.user, token: result.token },
    });
  }
);

export const logout = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (req.user?.id) {
      const { invalidateTokenService } = await import("./auth.service");
      await invalidateTokenService(req.user.id);
    }

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  }
);
