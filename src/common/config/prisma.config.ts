import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.utils';

declare global {
  var prisma: PrismaClient | undefined;
}

const basePrisma = new PrismaClient({
  log: ['info', 'warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  errorFormat: 'pretty',
});

const prisma = global.prisma || basePrisma;

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

prisma.$connect().catch((error: any) => {
  logger.error('Failed to connect to Prisma database:', error);
  process.exit(1);
});

export default prisma;
