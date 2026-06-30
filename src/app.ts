import cors from "cors";
import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import globalErrorHandler from "./common/middlewares/error.middleware";
import { authRoutes } from "./app/auth/auth.routes";
import { userRoutes } from "./app/user/user.routes";

class ExpressApp {
  public app: Application;

  constructor() {
    this.app = express();
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddlewares(): void {
    this.app.use(helmet());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());
    this.setupCORS();
  }

  private setupCORS(): void {
    const corsOptions: cors.CorsOptions = {
      origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
      allowedHeaders: ["Origin", "Content-Type", "Accept", "Authorization"],
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
