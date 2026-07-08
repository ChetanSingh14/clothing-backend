import { PrismaClient } from "@prisma/client";
import ErrorHandler from "../../common/utils/errorHandler";
import { uploadToCloudinary } from "../../common/utils/cloudinary.utils";

const prisma = new PrismaClient();

export const createCustomOrder = async (data: any) => {
  let finalImageUrl = data.designImageUrl;

  if (finalImageUrl) {
    let imagesArray: string[] = [];
    if (Array.isArray(finalImageUrl)) {
      imagesArray = finalImageUrl;
    } else if (typeof finalImageUrl === "string") {
      // Split only on commas that are followed by "data:image" or "http"
      // to avoid breaking individual base64 data URLs which contain a comma.
      imagesArray = finalImageUrl.split(/,(?=\s*(?:data:image|http))/).filter(Boolean);
    }

    const uploadedUrls = [];
    for (const img of imagesArray) {
      if (img.startsWith("data:image")) {
        try {
          const uploadRes = await uploadToCloudinary(img, "custom-designs");
          uploadedUrls.push(uploadRes.url);
        } catch (error) {
          throw new ErrorHandler("Failed to upload custom design image", 500);
        }
      } else {
        uploadedUrls.push(img);
      }
    }
    finalImageUrl = uploadedUrls.join(",");
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
