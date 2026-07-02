import prisma from "../../common/config/prisma.config";
import ErrorHandler from "../../common/utils/errorHandler";

export const createOrderService = async (userId: number, totalAmount: number, items: any, paymentMethod: string = "COD") => {
  const order = await prisma.order.create({
    data: {
      userId,
      totalAmount: Number(totalAmount),
      items: items, // JSON array of items
      paymentMethod,
      status: "BOOKED",
    },
  });

  return {
    success: true,
    message: "Order placed successfully",
    data: order,
  };
};

export const getMyOrdersService = async (userId: number) => {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return { success: true, data: orders };
};

export const updateOrderStatusService = async (userId: number, orderId: number, status: string) => {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) {
    throw new ErrorHandler("Order not found or unauthorized", 404);
  }
  
  if (order.status !== "BOOKED" && status === "CANCELLED") {
    throw new ErrorHandler("Only BOOKED orders can be cancelled", 400);
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });

  return { success: true, data: updatedOrder };
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

export const updateAdminOrderStatusService = async (orderId: number, status: string) => {
  const order = await prisma.order.findFirst({ where: { id: orderId } });
  if (!order) {
    throw new ErrorHandler("Order not found", 404);
  }
  
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });

  return { success: true, data: updatedOrder };
};
