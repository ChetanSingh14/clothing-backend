import { Request, Response, NextFunction } from "express";
import { registerService, loginService } from "./auth.service";
import ErrorHandler, { catchAsyncError } from "../../common/utils/errorHandler";
import { logger } from "../../common/utils/logger.utils";

const getCookieOptions = (req: Request) => {
  const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? ("none" as const) : ("lax" as const),
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };
};

export const signup = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { name, email, password } = req.body;

    logger.info(`📝 [Signup] Registration attempt for email: ${email}`);

    const result = await registerService(name, email, password);

    // Set auth token cookie
    res.cookie("authToken", result.token, getCookieOptions(req));

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
    res.cookie("authToken", result.token, getCookieOptions(req));

    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      data: { user: result.user },
    });
  }
);

export const logout = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { maxAge, ...clearOptions } = getCookieOptions(req);
    res.clearCookie("authToken", clearOptions);

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  }
);
