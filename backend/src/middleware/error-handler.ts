/**
 * Global error handler middleware
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Zod validation errors
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.issues.map((e: any) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Generic error response
  res.status(500).json({
    error: error.message || 'Internal server error',
  });
};
