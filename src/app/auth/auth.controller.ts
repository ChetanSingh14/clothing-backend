import { Request, Response, NextFunction } from "express";
import { registerService, loginService } from "./auth.service";
import ErrorHandler, { catchAsyncError } from "../../common/utils/errorHandler";
import { logger } from "../../common/utils/logger.utils";

export const signup = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { name, email, password } = req.body;

    logger.info(`📝 [Signup] Registration attempt for email: ${email}`);

    const result = await registerService(name, email, password);

    // Set auth token cookie
    res.cookie("authToken", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: { user: result.user },
    });
  }
);

export const login = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body;

    logger.info(`🔑 [Login] Auth attempt for email: ${email}`);

    const result = await loginService(email, password);

    // Set auth token cookie
    res.cookie("authToken", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      data: { user: result.user },
    });
  }
);

export const logout = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    res.clearCookie("authToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  }
);
