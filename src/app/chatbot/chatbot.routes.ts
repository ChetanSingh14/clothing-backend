import { Router, Response, NextFunction } from "express";
import { handleChatbotMessage } from "./chatbot.controller";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../../common/middlewares/auth.middleware";

const router = Router();

// Middleware to optionally authenticate token so chatbot knows user details if logged in
const optionalAuthenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = (authHeader && authHeader.split(" ")[1]) || req.cookies?.authToken;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret") as {
      id: number;
      email: string;
      role: string;
      name: string;
    };
    req.user = decoded;
  } catch (error) {
    // Ignore invalid token, proceed as anonymous
  }
  next();
};

router.post("/", optionalAuthenticate, handleChatbotMessage);

export { router as chatbotRoutes };
