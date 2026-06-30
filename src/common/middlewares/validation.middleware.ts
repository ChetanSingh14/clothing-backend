import { Request, Response, NextFunction } from 'express';
import ErrorHandler from '../utils/errorHandler';
import { logger } from '../utils/logger.utils';

export const validateRequiredFields = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const missingFields: string[] = [];

      for (const field of fields) {
        if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
          missingFields.push(field);
        }
      }

      if (missingFields.length > 0) {
        return next(new ErrorHandler(
          `Missing required fields: ${missingFields.join(', ')}`,
          400
        ));
      }

      next();
    } catch (error) {
      logger.error('Required fields validation error:', error);
      return next(new ErrorHandler('Field validation failed', 400));
    }
  };
};
