import { Response, NextFunction } from "express";
import { AuthRequest } from "../../common/middlewares/auth.middleware";
import { getUserProfileService, updateProfileService, adminUpdateUserService } from "./user.service";
import ErrorHandler, { catchAsyncError } from "../../common/utils/errorHandler";
import { logger } from "../../common/utils/logger.utils";
import { generateAndSendOtp, verifyOtp } from "../../common/services/otp.service";

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

export const requestPhoneOtp = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const email = req.user?.email;
    if (!email) {
      throw new ErrorHandler("Unauthorized", 401);
    }

    logger.info(`📨 [Phone OTP] Sending phone verification OTP to email: ${email}`);

    const otpToken = await generateAndSendOtp(email, "Phone Number Verification");

    res.status(200).json({
      success: true,
      message: "Phone verification OTP sent successfully",
      data: { otpToken }
    });
  }
);

export const verifyPhoneOtp = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    const email = req.user?.email;
    const { otp, otpToken, phone } = req.body;

    if (!userId || !email) {
      throw new ErrorHandler("Unauthorized", 401);
    }

    if (!otp || !otpToken || !phone) {
      throw new ErrorHandler("OTP, token, and phone number are required", 400);
    }

    logger.info(`📱 [Phone Verification] Verifying phone number update for user ID: ${userId}`);

    const isOtpValid = verifyOtp(email, otp, otpToken);
    if (!isOtpValid) {
      throw new ErrorHandler("Invalid or expired verification OTP code.", 400);
    }

    const prisma = (await import("../../common/config/prisma.config")).default;
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { phone },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profileImage: true,
        fullName: true,
        phone: true,
        address: true,
        landmark: true,
        pincode: true,
        state: true,
        city: true,
        createdAt: true,
      }
    });

    res.status(200).json({
      success: true,
      message: "Phone number verified and updated successfully",
      data: updatedUser
    });
  }
);
