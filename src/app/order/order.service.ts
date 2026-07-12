import prisma from "../../common/config/prisma.config";
import ErrorHandler from "../../common/utils/errorHandler";
import { 
  sendOrderConfirmationEmail, 
  sendOrderDeliveredEmail, 
  sendOrderInvoiceEmail,
  sendNewOrderAlertEmail
} from "../../common/services/email.service";
import nimbuspostService from "../../common/services/nimbuspost.service";



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
  applyOffer?: boolean,
  shippingCharges: number = 0,
  codCharges: number = 0,
  rtoCharges: number = 0,
  courierId: string | null = null
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
      totalAmount: finalAmount + Number(shippingCharges) + Number(codCharges),
      shippingCharges: Number(shippingCharges),
      codCharges: Number(codCharges),
      rtoCharges: Number(rtoCharges),
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
      nimbuspostCourierId: courierId ? String(courierId) : null,
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
  
  if (status === "CANCELLED" && order.nimbuspostAwb) {
    try {
      await nimbuspostService.cancelShipment(order.nimbuspostAwb);
    } catch (error: any) {
      console.warn(`[NimbusPost Cancel] Failed to cancel shipment for AWB ${order.nimbuspostAwb} during admin status update: ${error.message}`);
    }
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

  let pickupAddress = returnAddress;
  let exchangeNotes = "";
  if (returnAddress.includes(" | Size Changes: ")) {
    const parts = returnAddress.split(" | Size Changes: ");
    pickupAddress = parts[0].replace("Pickup Address: ", "");
    exchangeNotes = parts[1];
  }

  // Create separate ExchangeOrder record
  await prisma.exchangeOrder.create({
    data: {
      originalOrderId: orderId,
      userId,
      totalAmount: 0,
      items: order.items || [],
      status: "BOOKED",
      paymentMethod: "PREPAID",
      fullName: order.fullName,
      email: order.email,
      phone: order.phone,
      address: order.address,
      landmark: order.landmark,
      pincode: order.pincode,
      state: order.state,
      city: order.city,
      pickupAddress,
      exchangeNotes,
    }
  });

  // Send return email alert to admins
  const { sendOrderReturnAlertEmail } = require("../../common/services/email.service");
  sendOrderReturnAlertEmail(updatedOrder, returnAddress);

  return { success: true, message: "Exchange request filed successfully", data: updatedOrder };
};

export const getAdminExchangeOrdersService = async () => {
  const exchanges = await prisma.exchangeOrder.findMany({
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
    data: exchanges,
  };
};

export const updateAdminExchangeOrderStatusService = async (id: number, status: string) => {
  const exchange = await prisma.exchangeOrder.findUnique({ where: { id } });
  if (!exchange) {
    throw new ErrorHandler("Exchange order not found", 404);
  }

  if (status === "CANCELLED" && exchange.nimbuspostAwb) {
    try {
      await nimbuspostService.cancelShipment(exchange.nimbuspostAwb);
    } catch (error: any) {
      console.warn(`[NimbusPost Cancel] Failed to cancel shipment for AWB ${exchange.nimbuspostAwb} during exchange status update: ${error.message}`);
    }
  }

  const updatedExchange = await prisma.exchangeOrder.update({
    where: { id },
    data: {
      status,
      ...(status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
    },
  });

  return { success: true, data: updatedExchange };
};

export const nimbusShipExchangeOrderService = async (id: number) => {
  const exchange = await prisma.exchangeOrder.findUnique({ where: { id } });
  if (!exchange) throw new ErrorHandler("Exchange order not found", 404);

  if (exchange.nimbuspostAwb) throw new ErrorHandler("Exchange order already shipped with Nimbuspost", 400);

  const items = typeof exchange.items === 'string' ? JSON.parse(exchange.items) : exchange.items;

  const nimbusResponse = await nimbuspostService.createShipment(exchange, items as any[], true);

  const updatedExchange = await prisma.exchangeOrder.update({
    where: { id },
    data: {
      nimbuspostAwb: nimbusResponse.awb_number,
      nimbuspostShipmentId: String(nimbusResponse.shipment_id),
      nimbuspostOrderId: String(nimbusResponse.order_id),
      nimbuspostLabel: nimbusResponse.label,
      status: "SHIPPED"
    }
  });

  return { success: true, data: updatedExchange, message: "Exchange order shipped successfully via Nimbuspost" };
};

export const nimbusCancelExchangeOrderService = async (id: number) => {
  const exchange = await prisma.exchangeOrder.findUnique({ where: { id } });
  if (!exchange || !exchange.nimbuspostAwb) {
    throw new ErrorHandler("Exchange order not found or no AWB associated", 404);
  }

  try {
    await nimbuspostService.cancelShipment(exchange.nimbuspostAwb);
  } catch (error: any) {
    console.warn(`[NimbusPost Cancel] Shipment cancel failed for exchange AWB ${exchange.nimbuspostAwb}: ${error.message}`);
  }

  const updatedExchange = await prisma.exchangeOrder.update({
    where: { id },
    data: {
      status: "CANCELLED",
    }
  });

  return { success: true, message: "Exchange shipment cancelled successfully", data: updatedExchange };
};

export const nimbusTrackExchangeOrderService = async (id: number) => {
  const exchange = await prisma.exchangeOrder.findUnique({ where: { id } });
  if (!exchange || !exchange.nimbuspostAwb) {
    throw new ErrorHandler("Exchange order not found or no AWB associated", 404);
  }

  const trackingInfo = await nimbuspostService.trackShipment(exchange.nimbuspostAwb);
  return { success: true, data: trackingInfo };
};

export const adminCreateOrderService = async (
  adminUserId: number,
  data: {
    userId?: number;
    totalAmount?: number;
    items?: any;
    paymentMethod?: string;
    status?: string;
    shippingCharges?: number;
    codCharges?: number;
    rtoCharges?: number;
    fullName?: string;
    email?: string;
    phone?: string;
    address?: string;
    landmark?: string;
    pincode?: string;
    state?: string;
    city?: string;
  }
) => {
  // Use provided userId or fall back to admin's own userId (Prisma relation requires it)
  const orderUserId = data.userId || adminUserId;

  const order = await prisma.order.create({
    data: {
      userId: orderUserId,
      totalAmount: data.totalAmount || 0,
      shippingCharges: data.shippingCharges || 0,
      codCharges: data.codCharges || 0,
      rtoCharges: data.rtoCharges || 0,
      items: data.items || [],
      paymentMethod: data.paymentMethod || "COD",
      status: data.status || "BOOKED",
      fullName: data.fullName || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      landmark: data.landmark || null,
      pincode: data.pincode || null,
      state: data.state || null,
      city: data.city || null,
    },
  });

  return {
    success: true,
    message: "Order created successfully by admin",
    data: order,
  };
};

export const updateAdminOrderService = async (orderId: number, data: any) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });

  if (!order) {
    throw new ErrorHandler("Order not found", 404);
  }

  // Update order with dynamic fields provided
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      totalAmount: data.totalAmount !== undefined ? Number(data.totalAmount) : undefined,
      shippingCharges: data.shippingCharges !== undefined ? Number(data.shippingCharges) : undefined,
      codCharges: data.codCharges !== undefined ? Number(data.codCharges) : undefined,
      rtoCharges: data.rtoCharges !== undefined ? Number(data.rtoCharges) : undefined,
      items: data.items !== undefined ? data.items : undefined,
      paymentMethod: data.paymentMethod !== undefined ? data.paymentMethod : undefined,
      status: data.status !== undefined ? data.status : undefined,
      fullName: data.fullName !== undefined ? data.fullName : undefined,
      email: data.email !== undefined ? data.email : undefined,
      phone: data.phone !== undefined ? data.phone : undefined,
      address: data.address !== undefined ? data.address : undefined,
      landmark: data.landmark !== undefined ? data.landmark : undefined,
      pincode: data.pincode !== undefined ? data.pincode : undefined,
      state: data.state !== undefined ? data.state : undefined,
      city: data.city !== undefined ? data.city : undefined,
      deliveredAt: data.status === "DELIVERED" && order.status !== "DELIVERED" ? new Date() : undefined,
    }
  });

  return {
    success: true,
    message: "Order updated successfully",
    data: updatedOrder
  };
};

export const deleteAdminOrderService = async (orderId: number) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });

  if (!order) {
    throw new ErrorHandler("Order not found", 404);
  }

  await prisma.order.delete({
    where: { id: orderId }
  });

  return {
    success: true,
    message: "Order deleted successfully"
  };
};


