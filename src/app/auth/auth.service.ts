import prisma from "../../common/config/prisma.config";
import ErrorHandler from "../../common/utils/errorHandler";
import { hashPassword, comparePassword, generateJWTToken } from "./auth.utils";

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

export default { registerService, loginService, invalidateTokenService };
