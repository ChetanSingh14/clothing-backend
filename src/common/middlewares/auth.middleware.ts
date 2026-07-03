import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import ErrorHandler from '../utils/errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export const authenticateToken = () => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.split(' ')[1]);

    if (!token) {
      return next(new ErrorHandler('Access denied. No token provided.', 401));
    }

    if (!process.env.JWT_SECRET) {
      return next(new ErrorHandler('Internal server error: missing JWT configuration.', 500));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
        id: number;
        email: string;
        role: string;
      };

      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.id }
      });

      if (!dbUser || dbUser.token !== token) {
        return next(new ErrorHandler('Session expired or invalid token', 401));
      }

      req.user = decoded;
      next();
    } catch (error) {
      return next(new ErrorHandler('Invalid token, please login again', 401));
    }
  };
};

export const authorizeAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(new ErrorHandler('Access forbidden. Admins only.', 403));
  }
  next();
};

