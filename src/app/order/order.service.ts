import prisma from "../../common/config/prisma.config";
import ErrorHandler from "../../common/utils/errorHandler";
import { 
  sendOrderConfirmationEmail, 
  sendOrderDeliveredEmail, 
  sendOrderInvoiceEmail,
  sendNewOrderAlertEmail
} from "../../common/services/email.service";



export const createOrderService = async (
  userId: number,
  totalAmount: number,
  items: any,
  paymentMethod: string = "COD",
  details?: {
    fullName?: string;
    email?: string;
    phone?: string;
    address?: string;
    landmark?: string;
    pincode?: string;
    state?: string;
    city?: string;
  },
  applyOffer?: boolean
) => {
  let finalAmount = Number(totalAmount);
  let appliedDiscount = 0;

  // If user wants to apply their claimed offer, validate and apply discount
  if (applyOffer) {
    const claim = await prisma.offerClaim.findUnique({
      where: { userId },
    });

    if (!claim) {
      throw new ErrorHandler("No offer claimed by this user", 400);
    }

    if (claim.isUsed) {
      throw new ErrorHandler("This offer has already been used", 400);
    }

    appliedDiscount = claim.discountAmount;
    finalAmount = Math.max(0, finalAmount - appliedDiscount);

    // Mark offer as used
    await prisma.offerClaim.update({
      where: { userId },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });
  }

  const order = await prisma.order.create({
    data: {
      userId,
      totalAmount: finalAmount,
      items: items, // JSON array of items
      paymentMethod,
      status: "BOOKED",
      fullName: details?.fullName,
      email: details?.email,
      phone: details?.phone,
      address: details?.address,
      landmark: details?.landmark,
      pincode: details?.pincode,
      state: details?.state,
      city: details?.city,
    },
  });

  // Retrieve user's email if not provided in order details
  let email = details?.email;
  if (!email) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    email = user?.email;
  }

  // Send Order Confirmation and Invoice Emails asynchronously
  if (email) {
    sendOrderConfirmationEmail(email, order);
    sendOrderInvoiceEmail(email, order);
  }

  // Send New Order Alert to Admin emails
  sendNewOrderAlertEmail(order);

  return {
    success: true,
    message: appliedDiscount > 0 
      ? `Order placed successfully! ₹${appliedDiscount} discount applied with coupon.`
      : "Order placed successfully",
    data: {
      ...order,
      appliedDiscount,
      appliedOffer: applyOffer || false,
    },
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
    data: { 
      status,
      ...(status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
    },
  });

  // Send Order Delivered Email asynchronously if status changed to DELIVERED
  if (status === "DELIVERED") {
    let email = updatedOrder.email;
    if (!email) {
      const user = await prisma.user.findUnique({
        where: { id: updatedOrder.userId },
        select: { email: true }
      });
      email = user?.email || null;
    }
    if (email) {
      sendOrderDeliveredEmail(email, updatedOrder);
    }
  }

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
    data: { 
      status,
      ...(status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
    },
  });

  // Send Order Delivered Email asynchronously if status changed to DELIVERED
  if (status === "DELIVERED") {
    let email = updatedOrder.email;
    if (!email) {
      const user = await prisma.user.findUnique({
        where: { id: updatedOrder.userId },
        select: { email: true }
      });
      email = user?.email || null;
    }
    if (email) {
      sendOrderDeliveredEmail(email, updatedOrder);
    }
  }

  return { success: true, data: updatedOrder };
};

export const returnOrderService = async (userId: number, orderId: number, returnAddress: string) => {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) {
    throw new ErrorHandler("Order not found or unauthorized", 404);
  }

  if (order.status !== "DELIVERED") {
    throw new ErrorHandler("Only delivered orders can be exchanged", 400);
  }

  if (order.deliveredAt) {
    const diffTime = Math.abs(new Date().getTime() - new Date(order.deliveredAt).getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    if (diffDays > 5) {
      throw new ErrorHandler("Exchanges are only allowed within 5 days of delivery", 400);
    }
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "RETURN_PENDING",
      returnAddress,
    },
  });

  // Send return email alert to admins
  const { sendOrderReturnAlertEmail } = require("../../common/services/email.service");
  sendOrderReturnAlertEmail(updatedOrder, returnAddress);

  return { success: true, message: "Exchange request filed successfully", data: updatedOrder };
};
