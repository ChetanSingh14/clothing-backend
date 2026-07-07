import { PrismaClient } from "@prisma/client";
import ErrorHandler from "../../common/utils/errorHandler";
import { uploadToCloudinary } from "../../common/utils/cloudinary.utils";

const prisma = new PrismaClient();

export const createCustomOrder = async (data: any) => {
  let finalImageUrl = data.designImageUrl;

  // If it's a base64 string, upload to Cloudinary
  if (finalImageUrl && finalImageUrl.startsWith("data:image")) {
    try {
      const uploadRes = await uploadToCloudinary(finalImageUrl, "custom-designs");
      finalImageUrl = uploadRes.url;
    } catch (error) {
      throw new ErrorHandler("Failed to upload custom design image", 500);
    }
  }

  const newOrder = await prisma.customOrder.create({
    data: {
      userId: data.userId,
      designImageUrl: finalImageUrl,
      designNotes: data.designNotes,
      color: data.color,
      size: data.size,
      quantity: data.quantity,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      landmark: data.landmark,
      pincode: data.pincode,
      state: data.state,
      city: data.city,
    },
  });
  return newOrder;
};

export const getUserCustomOrders = async (userId: number) => {
  return prisma.customOrder.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

export const getAllCustomOrders = async () => {
  return prisma.customOrder.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const updateCustomOrderStatus = async (orderId: number, status: string) => {
  const existingOrder = await prisma.customOrder.findUnique({
    where: { id: orderId },
  });

  if (!existingOrder) {
    throw new ErrorHandler("Custom order not found", 404);
  }

  const updatedOrder = await prisma.customOrder.update({
    where: { id: orderId },
    data: { status },
  });

  return updatedOrder;
};
