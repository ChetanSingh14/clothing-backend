import { Response, NextFunction } from "express";
import { AuthRequest } from "../../common/middlewares/auth.middleware";
import { catchAsyncError } from "../../common/utils/errorHandler";
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../../common/config/prisma.config";
import nimbuspostService from "../../common/services/nimbuspost.service";

export const handleChatbotMessage = catchAsyncError(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { message, history } = req.body;
    const user = req.user;
    let userName = "";

    if (!message) {
      res.status(400).json({ success: false, message: "Message is required" });
      return;
    }

    // Gather contextual user info if logged in
    let contextPrompt = "";
    if (user) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true }
      });
      userName = dbUser?.name || "Customer";

      const orders = await prisma.order.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5
      });

      const exchangeOrders = await prisma.exchangeOrder.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 3
      });

      const customOrders = await prisma.customOrder.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5
      });

      // Fetch live shipment tracking from NimbusPost for any shipped order safely in parallel
      const ordersWithTracking = await Promise.all(
        orders.map(async (o) => {
          let trackingInfo = null;
          if (o.nimbuspostAwb) {
            try {
              const trackData = await nimbuspostService.trackShipment(o.nimbuspostAwb);
              trackingInfo = {
                status: trackData?.status || trackData?.current_status || "Unknown",
                edd: trackData?.edd || trackData?.expected_delivery_date || null,
                courier: trackData?.courier_name || trackData?.courier || null,
                history: Array.isArray(trackData?.history)
                  ? trackData.history.slice(0, 3).map((h: any) => `${h.status} at ${h.location || 'Hub'} (${h.date || h.time || ''})`)
                  : null
              };
            } catch (err) {
              // Ignore tracking errors to fall back gracefully
            }
          }
          return {
            id: o.id,
            totalAmount: o.totalAmount,
            status: o.status,
            paymentMethod: o.paymentMethod,
            createdAt: o.createdAt,
            awb: o.nimbuspostAwb,
            trackingInfo
          };
        })
      );

      contextPrompt = `\nYou are chatting with ${userName} (Email: ${user.email}). `;
      if (ordersWithTracking.length > 0) {
        contextPrompt += `Their recent regular orders are:\n${ordersWithTracking
          .map((o) => {
            let str = `- Order #${o.id}: Total ₹${o.totalAmount}, Webhook-updated status: ${o.status}, Payment: ${o.paymentMethod}, Date: ${o.createdAt.toDateString()}`;
            if (o.awb) {
              str += `, AWB/Tracking #: ${o.awb}`;
            }
            if (o.trackingInfo) {
              str += ` (Live Shipment Status: ${o.trackingInfo.status}${o.trackingInfo.edd ? `, Expected Delivery: ${o.trackingInfo.edd}` : ""}${o.trackingInfo.courier ? `, Courier: ${o.trackingInfo.courier}` : ""})`;
              if (o.trackingInfo.history && o.trackingInfo.history.length > 0) {
                str += ` [Courier history: ${o.trackingInfo.history.join(" | ")}]`;
              }
            }
            return str;
          })
          .join("\n")}`;
      } else {
        contextPrompt += `They have no regular orders placed yet.`;
      }

      if (exchangeOrders.length > 0) {
        contextPrompt += `\n\nTheir size exchange requests are:\n${exchangeOrders
          .map((eo) => `- Exchange Request #${eo.id} (for Order #${eo.originalOrderId}): Status: ${eo.status}, Exchange Notes: ${eo.exchangeNotes || "None"}, Date: ${eo.createdAt.toDateString()}`)
          .join("\n")}`;
      }

      if (customOrders.length > 0) {
        contextPrompt += `\n\nTheir custom design uploads (custom orders) are:\n${customOrders
          .map((co) => `- Custom Order #${co.id}: Status: ${co.status}, Notes: ${co.designNotes || "None"}, Quantity: ${co.quantity}, Date: ${co.createdAt.toDateString()}`)
          .join("\n")}`;
      }
    } else {
      contextPrompt = `\nThe user is not logged in. Tell them they can click the custom buttons to log in or register.`;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenerativeAI(apiKey);

        const systemInstruction = `You are a helpful customer support assistant for MDFK Clothing, a premium clothing brand. 
We specialize exclusively in high-quality T-Shirts and Couple Tees (other categories like hoodies, coats, sneakers, or sweaters have been removed).
Our brand guidelines:
- Warm cream-colored brand aesthetic.
- We support Cash on Delivery (COD) as our primary payment method.
- We do not offer cancellations, returns, or refunds. Once an order is booked, it cannot be cancelled. We offer an easy 5-day size exchange policy on all delivered products (only for size issues).
- We have a special Couple Tees section featuring beautifully coordinated matching tees for couples.
- For any queries, custom support, or questions, users can contact us via email at clothing.mdfk@gmail.com or call/WhatsApp at 9354864420.
- Tracking info: Our shipping partner is NimbusPost. We use webhooks to update the database automatically when statuses change (BOOKED, SHIPPED, DELIVERED, CANCELLED, RETURNED).
- Custom uploads/orders: Users can place a custom streetwear design print request. They can upload files (front, back, logo) and notes via the chatbot's "Custom Upload" tab directly, or on the /custom-design page. Minimum order quantity is 3 tees. Production begins only after the advance payment is confirmed.
- Answer user queries with clear details. If they ask about tracking, review the live courier updates (if available) and status provided. If they ask about custom uploads, explain the guidelines or guide them to the uploads section. Never mention cancellation options, as we do not support order cancellations; only exchanges are allowed within 5 days of delivery.
Keep your answers brief, friendly, and structured using clean markdown bullet points where appropriate.${contextPrompt}`;
 
        const modelWithSystem = ai.getGenerativeModel({
          model: "gemini-1.5-flash",
          systemInstruction: systemInstruction
        });
 
        const chatSession = modelWithSystem.startChat({
          history: (history || []).map((msg: any) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.text }],
          }))
        });
 
        const result = await chatSession.sendMessage(message);
        const responseText = result.response.text();
 
        res.status(200).json({ success: true, reply: responseText });
        return;
      } catch (err: any) {
        console.error("Gemini API call failed, falling back to mock chatbot:", err);
      }
    }
 
    // Mock Chatbot Fallback Mode
    const query = message.toLowerCase();
    let reply = "";
 
    if (query.includes("hello") || query.includes("hi") || query.includes("hey")) {
      reply = user 
        ? `Hello ${userName}! Welcome to MDFK Clothing Support. How can I help you track your orders, manage your wishlist, or learn about our custom uploads and couple tees today?`
        : `Hello there! Welcome to MDFK Clothing Support. How can I assist you today? You can ask about our catalog, exchange policy, custom uploads, or log in to track your orders.`;
    } else if (query.includes("product") || query.includes("catalog") || query.includes("sell") || query.includes("t-shirt") || query.includes("couple") || query.includes("tee")) {
      reply = `MDFK Clothing offers a premium collection of minimalist clothing. We focus exclusively on:
- **T-Shirts**: Premium heavy-cotton everyday essentials.
- **Couple Tees**: Coordinated matching t-shirts for couples with unique graphics.
 
You can browse our collections on the home page!`;
    } else if (query.includes("contact") || query.includes("support") || query.includes("email") || query.includes("phone") || query.includes("number") || query.includes("query") || query.includes("call")) {
      reply = `For any queries, custom orders, or support, you can reach out to us at:
- **Email**: clothing.mdfk@gmail.com
- **Phone / WhatsApp**: 9354864420
 
Our customer service team is always here to assist you!`;
    } else if (query.includes("return") || query.includes("refund") || query.includes("exchange") || query.includes("policy") || query.includes("cancel")) {
      reply = `MDFK Clothing does not support cancellations, returns, or refunds. However, we provide an easy **5-day size exchange policy** for size issues. You can file a size exchange request directly from your Orders history tab within 5 days of delivery.`;
    } else if (query.includes("payment") || query.includes("pay") || query.includes("cod") || query.includes("cash")) {
      reply = `We support **Cash on Delivery (COD)** for all purchases! You can select Cash on Delivery in the checkout drawer, pay when your parcel is delivered, and enjoy peace of mind.`;
    } else if (query.includes("order") || query.includes("track") || query.includes("booked") || query.includes("status")) {
      if (user) {
        const orders = await prisma.order.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 3
        });
        const customOrders = await prisma.customOrder.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 3
        });
        
        let ordersList = "";
        if (orders.length > 0) {
          ordersList += `*Regular Orders:*\n` + orders
            .map((o) => `* **Order #${o.id}**: ₹${o.totalAmount} (${o.status}) - via ${o.paymentMethod}${o.nimbuspostAwb ? ` (AWB: ${o.nimbuspostAwb})` : ""}`)
            .join("\n") + "\n\n";
        }
        if (customOrders.length > 0) {
          ordersList += `*Custom Upload Requests:*\n` + customOrders
            .map((co) => `* **Custom Order #${co.id}**: Qty ${co.quantity} (${co.status}) - ${co.designNotes || "No notes"}`)
            .join("\n") + "\n\n";
        }
        
        reply = ordersList || `Hi ${userName}, you haven't placed any orders with MDFK Clothing yet. Browse our signature T-Shirts and Couple Tees on the homepage, or upload a custom design!`;
      } else {
        reply = `To track your orders, please click the **Sign In** button at the top right to log into your account. Once logged in, you can view your complete order history under the **Orders** tab or track them right here.`;
      }
    } else if (query.includes("custom") || query.includes("upload") || query.includes("print") || query.includes("design")) {
      reply = `You can place custom streetwear design print requests with MDFK Clothing!
- **Requirements**: Minimum order quantity of 3 tees.
- **Process**: Upload your design (Front/Back/Logo) and add design notes (color, size, instructions) right here in the **Custom Upload** tab of this chatbot, or on our dedicated **/custom-design** page.
- **Production**: Starts after we confirm your advance payment.
- **View status**: Check your active requests under the **My Uploads** tab of this chatbot!`;
    } else if (query.includes("wishlist") || query.includes("like")) {
      reply = `You can save products you love by clicking the Heart icon on any product page. To view and manage your liked items, simply click the Heart icon at the top of the header to open your **Wishlist**!`;
    } else {
      reply = `I'm here to help you with MDFK Clothing! You can ask me about:
- Our catalog (**T-Shirts** and **Couple Tees**)
- Our **5-day size exchange policy**
- Placing a **Cash on Delivery (COD)** order
- Submitting **Custom Uploads / Orders**
- Tracking your recent orders or custom designs (please log in to view details)`;
    }
 
    res.status(200).json({ success: true, reply });
  }
);
