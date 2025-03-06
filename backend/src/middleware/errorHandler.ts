import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Custom error class
export class ApiError extends Error {
  statusCode: number;
  
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error(`Error: ${err.message} - Stack: ${err.stack}`);
  
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    });
    return;
  }

  // MongoDB duplicate key error
  if ((err as any).code === 11000) {
    res.status(409).json({
      success: false,
      message: 'Duplicate resource',
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    });
    return;
  }

  // Default to 500 server error
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
} 