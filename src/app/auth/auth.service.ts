import prisma from "../../common/config/prisma.config";
import ErrorHandler from "../../common/utils/errorHandler";
import { hashPassword, comparePassword, generateJWTToken } from "./auth.utils";
import { sendWelcomeEmail } from "../../common/services/email.service";
import { verifyOtp } from "../../common/services/otp.service";

export const registerService = async (name: string, email: string, password: string) => {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ErrorHandler("Email is already registered. Please use another email.", 409);
  }

  // Hash the password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
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
    },
  });

  // Generate token
  const token = generateJWTToken({ id: user.id, email: user.email, role: user.role });

  // Save token to DB
  await prisma.user.update({
    where: { id: user.id },
    data: { token },
  });

  // Send Welcome Email asynchronously
  sendWelcomeEmail(user.email, user.name);

  return {
    user,
    token,
  };
};

export const loginService = async (email: string, password: string) => {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ErrorHandler("Invalid email or password credentials.", 401);
  }

  // Verify password
  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    throw new ErrorHandler("Invalid email or password credentials.", 401);
  }

  // Generate token
  const token = generateJWTToken({ id: user.id, email: user.email, role: user.role });

  // Save token to DB
  await prisma.user.update({
    where: { id: user.id },
    data: { token },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      fullName: user.fullName,
      phone: user.phone,
      address: user.address,
      landmark: user.landmark,
      pincode: user.pincode,
      state: user.state,
      city: user.city,
      createdAt: user.createdAt,
    },
    token,
  };
};

export const invalidateTokenService = async (userId: number) => {
  await prisma.user.update({
    where: { id: userId },
    data: { token: null },
  });
};

const verifyGoogleIdToken = async (idToken: string) => {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!res.ok) {
      throw new ErrorHandler("Invalid Google ID Token", 401);
    }
    const payload = (await res.json()) as any;
    return {
      email: payload.email,
      name: payload.name || payload.email.split("@")[0],
      profileImage: payload.picture || null,
      emailVerified: payload.email_verified === "true" || payload.email_verified === true
    };
  } catch (err: any) {
    throw new ErrorHandler(err.message || "Failed to verify Google login", 401);
  }
};

export const googleLoginService = async (idToken: string) => {
  const googlePayload = await verifyGoogleIdToken(idToken);
  
  if (!googlePayload.emailVerified) {
    throw new ErrorHandler("Google email is not verified.", 401);
  }

  let user = await prisma.user.findUnique({
    where: { email: googlePayload.email },
  });

  if (!user) {
    const dummyPasswordHash = await hashPassword(Math.random().toString(36).substring(2, 15));
    user = await prisma.user.create({
      data: {
        name: googlePayload.name,
        email: googlePayload.email,
        password: dummyPasswordHash,
        profileImage: googlePayload.profileImage,
      },
    });
    sendWelcomeEmail(user.email, user.name);
  }

  const token = generateJWTToken({ id: user.id, email: user.email, role: user.role });

  await prisma.user.update({
    where: { id: user.id },
    data: { token },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      fullName: user.fullName,
      phone: user.phone,
      address: user.address,
      landmark: user.landmark,
      pincode: user.pincode,
      state: user.state,
      city: user.city,
      createdAt: user.createdAt,
    },
    token,
  };
};

export const registerWithOtpService = async (name: string, email: string, password: string, otp: string, otpToken: string) => {
  const isOtpValid = verifyOtp(email, otp, otpToken);
  if (!isOtpValid) {
    throw new ErrorHandler("Invalid or expired email verification OTP code.", 400);
  }
  return registerService(name, email, password);
};

export default { registerService, loginService, invalidateTokenService, googleLoginService, registerWithOtpService };
