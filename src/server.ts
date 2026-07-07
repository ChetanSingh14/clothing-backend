import dotenv from "dotenv";
dotenv.config(); // trigger restart


import { createServer } from "http";
import app from "./app";
import { logger } from "./common/utils/logger.utils";
import prisma from "./common/config/prisma.config";

const PORT: number = Number(process.env.PORT) || 4000;

process.on('uncaughtException', (err: Error) => {
  logger.error('CRITICAL: Uncaught Exception! 💥 Shutting down...', err);
  process.exit(1);
});

process.on('unhandledRejection', (err: any) => {
  logger.error('CRITICAL: Unhandled Rejection! 💥', err);
});

const initializeDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info("✅ Connected to PostgreSQL database via Prisma");
  } catch (error) {
    logger.error("❌ Database connection failed:", error);
    throw error;
  }
};

const startServer = async (): Promise<void> => {
  try {
    await initializeDatabase();

    const httpServer = createServer(app);

    httpServer.listen(PORT, "0.0.0.0", () => {
      logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });

    let isShuttingDown = false;

    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      logger.info(`🛑 ${signal} received. Starting graceful shutdown...`);

      httpServer.close((err?: Error) => {
        if (err) logger.error('Error closing HTTP server:', err);
        else logger.info('HTTP server closed.');
      });

      try {
        await prisma.$disconnect();
        logger.info("🔌 Disconnected from PostgreSQL");
        logger.info("👋 Graceful shutdown complete. Exiting.");
        process.exit(0);
      } catch (error) {
        logger.error("❗ Error during graceful shutdown:", error);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
