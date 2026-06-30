import prisma from "../../common/config/prisma.config";
import ErrorHandler from "../../common/utils/errorHandler";

export const getUserProfileService = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
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

export default { getUserProfileService, updateProfileService };
