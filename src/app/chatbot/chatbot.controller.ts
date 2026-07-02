import { Response, NextFunction } from "express";
import { AuthRequest } from "../../common/middlewares/auth.middleware";
import { catchAsyncError } from "../../common/utils/errorHandler";
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../../common/config/prisma.config";

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
      contextPrompt = `\nYou are chatting with ${userName} (Email: ${user.email}). `;
      if (orders.length > 0) {
        contextPrompt += `Their recent orders are:\n${orders
          .map((o) => `- Order ID #${o.id}: Total $${o.totalAmount}, Status: ${o.status}, Payment: ${o.paymentMethod}, Date: ${o.createdAt.toDateString()}`)
          .join("\n")}`;
      } else {
        contextPrompt += `They have no orders placed yet.`;
      }
    } else {
      contextPrompt = `\nThe user is not logged in. Tell them they can log in to view their order status or wishlist.`;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

        const systemInstruction = `You are a helpful customer support assistant for MDFK Clothing, a premium clothing brand. 
We specialize exclusively in high-quality T-Shirts and Hoodies (other categories like coats, sneakers, or sweaters have been removed).
Our brand guidelines:
- Warm cream-colored brand aesthetic.
- We support Cash on Delivery (COD) as our primary payment method.
- We offer an easy 7-day return policy on all delivered products.
- You can help users find products, answer questions about shipping/returns, and look up order details.
Keep your answers brief, friendly, and structured using clean markdown bullet points where appropriate.${contextPrompt}`;

        // Prepare standard chat structure
        const chat = model.startChat({
          history: (history || []).map((msg: any) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.text }],
          })),
          generationConfig: {
            maxOutputTokens: 500,
          },
        });

        // Add the system context instruction at the beginning of chat or inside the message if needed,
        // but systemInstruction is officially supported in gemini-1.5-flash options.
        // We'll pass it to the API.
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
        ? `Hello ${userName}! Welcome to MDFK Clothing Support. How can I help you track your orders, manage your wishlist, or learn about our hoodies and t-shirts today?`
        : `Hello there! Welcome to MDFK Clothing Support. How can I assist you today? You can ask about our catalog, return policy, or log in to track your orders.`;
    } else if (query.includes("product") || query.includes("catalog") || query.includes("sell") || query.includes("t-shirt") || query.includes("hoodie")) {
      reply = `MDFK Clothing offers a premium collection of minimalist clothing. We focus exclusively on two key categories:
- **T-Shirts**: Premium heavy-cotton everyday essentials.
- **Hoodies**: Warm, oversized, ultra-soft loungewear.

You can browse our collections on the home page!`;
    } else if (query.includes("return") || query.includes("refund") || query.includes("exchange") || query.includes("policy")) {
      reply = `We want you to love your purchase! MDFK Clothing provides a hassle-free **7-day return policy** on all delivered orders. If you aren't satisfied, you can initiate a return within 7 days of delivery.`;
    } else if (query.includes("payment") || query.includes("pay") || query.includes("cod") || query.includes("cash")) {
      reply = `We support **Cash on Delivery (COD)** for all purchases! You can select Cash on Delivery in the checkout drawer, pay when your parcel is delivered, and enjoy peace of mind.`;
    } else if (query.includes("order") || query.includes("track") || query.includes("booked") || query.includes("status")) {
      if (user) {
        const orders = await prisma.order.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 3
        });
        if (orders.length > 0) {
          reply = `Here are your recent orders, ${userName}:\n\n` + orders
            .map((o) => `* **Order #${o.id}**: $${o.totalAmount} (${o.status}) - Paid via ${o.paymentMethod} on ${o.createdAt.toLocaleDateString()}`)
            .join("\n") + `\n\nYou can cancel any order marked as **BOOKED** directly from your **Orders** dashboard.`;
        } else {
          reply = `Hi ${userName}, you haven't placed any orders with MDFK Clothing yet. Browse our signature Hoodies and T-Shirts on the homepage to place your first Cash on Delivery order!`;
        }
      } else {
        reply = `To track your orders, please click the **Sign In** button at the top right to log into your account. Once logged in, you can view your complete order history under the **Orders** tab.`;
      }
    } else if (query.includes("wishlist") || query.includes("like")) {
      reply = `You can save products you love by clicking the Heart icon on any product page. To view and manage your liked items, simply click the Heart icon at the top of the header to open your **Wishlist**!`;
    } else {
      reply = `I'm here to help you with MDFK Clothing! You can ask me about:
- Our core catalog (**T-Shirts** and **Hoodies**)
- Our **7-day return policy**
- Placing a **Cash on Delivery (COD)** order
- Tracking your recent orders (please log in to view details)`;
    }

    res.status(200).json({ success: true, reply });
  }
);
