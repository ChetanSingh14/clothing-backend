import prisma from "../../common/config/prisma.config";
import ErrorHandler from "../../common/utils/errorHandler";

export const createOrderService = async (userId: number, totalAmount: number, items: any) => {
  const order = await prisma.order.create({
    data: {
      userId,
      totalAmount: Number(totalAmount),
      items: items, // JSON array of items
    },
  });

  return {
    success: true,
    message: "Order placed successfully",
    data: order,
  };
};

export const getAdminOrdersService = async () => {
  const orders = await prisma.order.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    success: true,
    data: orders,
  };
};
