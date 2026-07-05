import path from "path";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import globalErrorHandler from "./common/middlewares/error.middleware";
import { authRoutes } from "./app/auth/auth.routes";
import { userRoutes } from "./app/user/user.routes";
import { productRoutes } from "./app/product/product.routes";
import { orderRoutes } from "./app/order/order.routes";
import { wishlistRoutes } from "./app/wishlist/wishlist.routes";
import { settingsRoutes } from "./app/settings/settings.routes";
import { chatbotRoutes } from "./app/chatbot/chatbot.routes";
import { webhooksRoutes } from "./app/webhooks/webhooks.routes";
import { offerRoutes } from "./app/offer/offer.routes";

class ExpressApp {
  public app: Application;

  constructor() {
    this.app = express();
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddlewares(): void {
    this.app.set("trust proxy", 1);
    // Disable crossOriginResourcePolicy check in helmet so local image URLs can be rendered by the Next.js frontend
    this.app.use(helmet({
      crossOriginResourcePolicy: false,
    }));
    this.app.use(express.json({ 
      limit: "10mb",
      verify: (req: any, res, buf) => {
        if (req.originalUrl.startsWith("/api/v1/webhooks")) {
          req.rawBody = buf.toString('utf8');
        }
      }
    }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));
    this.app.use(cookieParser());
    
    this.setupCORS();
    this.app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));
  }

  private setupCORS(): void {
    // Unconditionally allow both local and production frontend domains to prevent NODE_ENV issues
    let allowedOrigins = [
      "https://www.mdfkclothing.com", 
      "https://mdfkclothing.com",
      "http://localhost:3000", 
      "http://localhost:3001"
    ];

    // If an environment variable is explicitly provided, we can add it or override
    if (process.env.ALLOWED_ORIGINS && process.env.ALLOWED_ORIGINS !== "*") {
      const extraOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
      allowedOrigins = [...allowedOrigins, ...extraOrigins];
    }

    const corsOptions = {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
    };

    this.app.options("*", cors(corsOptions));
    this.app.use(cors(corsOptions));
  }

  private setupRoutes(): void {
    this.app.get("/", (req: Request, res: Response) => {
      res.status(200).send("Web API Server OK");
    });

    // Health check
    this.app.get("/health", (req: Request, res: Response) => {
      res.status(200).json({
        status: "ok",
        uptime: process.uptime(),
      });
    });

    // Auth routes
    this.app.use("/api/v1/auth", authRoutes);

    // User profile routes
    this.app.use("/api/v1/user", userRoutes);

    // Products catalog & Admin routes
    this.app.use("/api/v1/products", productRoutes);

    // Orders checkout routes
    this.app.use("/api/v1/orders", orderRoutes);

    // Wishlist toggles routes
    this.app.use("/api/v1/wishlist", wishlistRoutes);

    // Global settings configuration routes
    this.app.use("/api/v1/settings", settingsRoutes);

    // Chatbot AI & faq routes
    this.app.use("/api/v1/chatbot", chatbotRoutes);

    // Webhooks routes
    this.app.use("/api/v1/webhooks", webhooksRoutes);

    // QR Scan Offer routes (single QR for all packaging)
    this.app.use("/api/v1/offer", offerRoutes);
  }

  private setupErrorHandling(): void {
    this.app.use(globalErrorHandler);
  }

  public getApp(): Application {
    return this.app;
  }
}

const expressApp = new ExpressApp();
export default expressApp.getApp();
