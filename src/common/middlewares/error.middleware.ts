import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.utils';
import ErrorHandler from '../utils/errorHandler';

interface CustomError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
  stack?: string;
}

const sendErrorDev = (err: CustomError, req: Request, res: Response): void => {
  logger.error(JSON.stringify({
    statusCode: err.statusCode,
    url: req.url,
    method: req.method,
    message: err.message,
    stack: err.stack,
    fullError: err
  }));

  res.status(err.statusCode || 500).json({
    success: false,
    status: err.status,
    message: err.message,
    stack: err.stack
  });
};

const globalErrorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (res.headersSent) {
    return next(err);
  }

  err.status = err.status || 'error';
  err.statusCode = err.statusCode || 500;

  let error: any = { ...err, message: err.message, stack: err.stack, name: err.name };

  sendErrorDev(error, req, res);
};

export default globalErrorHandler;
