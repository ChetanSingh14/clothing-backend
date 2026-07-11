import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.config";
import { logger } from "../utils/logger.utils";

class SocketService {
  private io: Server | null = null;

  public init(httpServer: HttpServer): Server {
    this.io = new Server(httpServer, {
      cors: {
        origin: [
          "https://www.mdfkclothing.com",
          "https://mdfkclothing.com",
          "http://localhost:3000",
          "http://localhost:3001"
        ],
        credentials: true,
      }
    });

    // Connection middleware for authentication
    this.io.use(async (socket: Socket, next) => {
      // Allow token to be passed either via handshake auth or headers
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace("Bearer ", "");
      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      if (!process.env.JWT_SECRET) {
        return next(new Error("Authentication error: JWT secret not configured"));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
          id: number;
          email: string;
          role: string;
        };

        const dbUser = await prisma.user.findUnique({
          where: { id: decoded.id }
        });

        if (!dbUser || dbUser.token !== token) {
          return next(new Error("Authentication error: Session expired or invalid token"));
        }

        // Attach user info to socket.data so it is synchronized across RemoteSockets (e.g. fetchSockets)
        socket.data = {
          userId: decoded.id,
          token: token
        };

        next();
      } catch (err) {
        return next(new Error("Authentication error: Invalid token"));
      }
    });

    this.io.on("connection", (socket: Socket) => {
      const userId = socket.data.userId;
      logger.info(`⚡ Socket client connected: ${socket.id} (User: ${userId})`);

      // Join room for this user to target all of their active connections
      socket.join(`user_${userId}`);

      socket.on("disconnect", () => {
        logger.info(`🔌 Socket client disconnected: ${socket.id} (User: ${userId})`);
      });
    });

    return this.io;
  }

  public async checkActiveSessions(userId: number): Promise<void> {
    if (!this.io) return;

    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { token: true }
      });

      if (!dbUser) return;

      const activeToken = dbUser.token;

      // Get all socket instances in the user's room
      const sockets = await this.io.in(`user_${userId}`).fetchSockets();

      for (const socket of sockets) {
        const socketToken = socket.data.token;
        if (socketToken && socketToken !== activeToken) {
          logger.info(`🚨 Invalidating socket session for User: ${userId}, Socket: ${socket.id}`);
          socket.emit("session_expired", { reason: "new_login" });
          socket.disconnect(true);
        }
      }
    } catch (error) {
      logger.error("Error in checkActiveSessions:", error);
    }
  }

  public emitToUser(userId: number, event: string, data: any): void {
    if (this.io) {
      this.io.to(`user_${userId}`).emit(event, data);
    }
  }
}

export const socketService = new SocketService();
