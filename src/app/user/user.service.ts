import prisma from "../../common/config/prisma.config";
import ErrorHandler from "../../common/utils/errorHandler";

export const getUserProfileService = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ErrorHandler("User not found", 404);
  }

  return {
    success: true,
    data: user,
  };
};

export const updateProfileService = async (userId: number, name: string) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name },
    select: {
      id: true,
      name: true,
      email: true,
      updatedAt: true,
    },
  });

  return {
    success: true,
    message: "Profile updated successfully",
    data: user,
  };
};

export const adminUpdateUserService = async (
  userId: number,
  data: { name?: string; role?: string; password?: string }
) => {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!existing) {
    throw new ErrorHandler("User not found", 404);
  }

  const updateData: any = {};
  if (data.name !== undefined) {
    updateData.name = data.name;
  }
  if (data.role !== undefined) {
    updateData.role = data.role;
  }
  if (data.password) {
    const bcrypt = require("bcryptjs");
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return {
    success: true,
    message: "User account updated successfully by administrator",
    data: updatedUser,
  };
};

export default { getUserProfileService, updateProfileService, adminUpdateUserService };
