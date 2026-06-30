import { Request, Response, NextFunction } from 'express';

class ErrorHandler extends Error {
  statusCode: number;
  public status: string | undefined;
  details?: any;
  
  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ErrorHandler;

export const catchAsyncError = (passedFunction: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    passedFunction(req, res, next).catch((error: any) => {
      // If it's already an ErrorHandler instance, pass it as is
      if (error instanceof ErrorHandler) {
        return next(error);
      }
      
      // Get the exact error message
      const message = error.message || 'Something went wrong';
      let statusCode = error.statusCode || 500;
      
      // Smart status code detection based on message keywords
      if (!error.statusCode) {
        const lowerMessage = message.toLowerCase();
        
        // Authentication related errors (401)
        if (
          lowerMessage.includes('unauthorized') || 
          lowerMessage.includes('invalid token') ||
          lowerMessage.includes('token expired') ||
          lowerMessage.includes('authentication failed') ||
          lowerMessage.includes('invalid credentials') ||
          lowerMessage.includes('login failed') ||
          (lowerMessage.includes('access denied') && lowerMessage.includes('token'))
        ) {
          statusCode = 401;
        }
        
        // Forbidden/Permission errors (403)  
        else if (
          lowerMessage.includes('forbidden') ||
          lowerMessage.includes('permission denied') ||
          lowerMessage.includes('access denied') ||
          lowerMessage.includes('already has an account') ||
          lowerMessage.includes('not authorized to') ||
          lowerMessage.includes('insufficient permissions') ||
          lowerMessage.includes('account suspended') ||
          lowerMessage.includes('account blocked')
        ) {
          statusCode = 403;
        }
        
        // Not found errors (404)
        else if (
          lowerMessage.includes('not found') || 
          lowerMessage.includes('does not exist') ||
          lowerMessage.includes('user not found') ||
          lowerMessage.includes('resource not found') ||
          lowerMessage.includes('no data found') ||
          lowerMessage.includes('record not found')
        ) {
          statusCode = 404;
        }
        
        // Conflict errors (409)
        else if (
          lowerMessage.includes('already exists') ||
          lowerMessage.includes('duplicate') ||
          lowerMessage.includes('conflict') ||
          lowerMessage.includes('already registered') ||
          lowerMessage.includes('email already') ||
          lowerMessage.includes('username already')
        ) {
          statusCode = 409;
        }
        
        // Bad request errors (400)
        else if (
          lowerMessage.includes('already') || 
          lowerMessage.includes('invalid') || 
          lowerMessage.includes('required') ||
          lowerMessage.includes('cannot') ||
          lowerMessage.includes('must') ||
          lowerMessage.includes('should') ||
          lowerMessage.includes('missing') ||
          lowerMessage.includes('validation failed') ||
          lowerMessage.includes('bad request') ||
          lowerMessage.includes('malformed') ||
          lowerMessage.includes('format') ||
          lowerMessage.includes('empty') ||
          lowerMessage.includes('minimum') ||
          lowerMessage.includes('maximum') ||
          lowerMessage.includes('length') ||
          lowerMessage.includes('size')
        ) {
          statusCode = 400;
        }
        
        // Too Many Requests (429)
        else if (
          lowerMessage.includes('too many requests') ||
          lowerMessage.includes('rate limit') ||
          lowerMessage.includes('rate exceeded') ||
          lowerMessage.includes('quota exceeded')
        ) {
          statusCode = 429;
        }
        
        // Service Unavailable (503)
        else if (
          lowerMessage.includes('service unavailable') ||
          lowerMessage.includes('temporarily unavailable') ||
          lowerMessage.includes('database connection failed') ||
          lowerMessage.includes('connection timeout')
        ) {
          statusCode = 503;
        }
      }
      
      return next(new ErrorHandler(message, statusCode));
    });
  };
};
