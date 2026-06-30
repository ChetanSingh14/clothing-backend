import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import ErrorHandler from '../utils/errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

export const authenticateToken = () => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.split(' ')[1]) || req.cookies?.authToken;

    if (!token) {
      return next(new ErrorHandler('Access denied. No token provided.', 401));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as {
        id: number;
        email: string;
      };
      req.user = decoded;
      next();
    } catch (error) {
      return next(new ErrorHandler('Invalid token, please login again', 401));
    }
  };
};
