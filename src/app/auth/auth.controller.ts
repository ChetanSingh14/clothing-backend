import { Request, Response, NextFunction } from "express";
import { registerService, loginService, googleLoginService, registerWithOtpService } from "./auth.service";
import ErrorHandler, { catchAsyncError } from "../../common/utils/errorHandler";
import { logger } from "../../common/utils/logger.utils";
import { generateAndSendOtp } from "../../common/services/otp.service";

import { AuthRequest } from "../../common/middlewares/auth.middleware";

export const signupOtp = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email } = req.body;
    if (!email) {
      throw new ErrorHandler("Email address is required", 400);
    }

    logger.info(`📨 [Signup OTP] Sending OTP to email: ${email}`);
    
    const prisma = (await import("../../common/config/prisma.config")).default;
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ErrorHandler("Email is already registered. Please use another email.", 409);
    }

    const otpToken = await generateAndSendOtp(email, "New Account Registration");

    res.status(200).json({
      success: true,
      message: "OTP sent to email successfully",
      data: { otpToken }
    });
  }
);

export const signup = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { name, email, password, otp, otpToken } = req.body;

    logger.info(`📝 [Signup] Registration attempt for email: ${email}`);

    if (!otp || !otpToken) {
      throw new ErrorHandler("Email verification OTP and token are required.", 400);
    }

    const result = await registerWithOtpService(name, email, password, otp, otpToken);

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

export const googleLogin = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { idToken } = req.body;
    if (!idToken) {
      throw new ErrorHandler("Google ID Token is required", 400);
    }

    logger.info(`🌐 [Google Login] Processing token`);

    const result = await googleLoginService(idToken);

    res.status(200).json({
      success: true,
      message: "Google login successful",
      data: { user: result.user, token: result.token }
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
