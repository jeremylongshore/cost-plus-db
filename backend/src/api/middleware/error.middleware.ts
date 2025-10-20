/**
 * Error Handling Middleware
 *
 * Global error handler for Express that catches all errors,
 * formats them consistently, and returns appropriate HTTP responses.
 *
 * @module api/middleware/error
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../../utils/logger.js';
import { AppError, isOperationalError } from '../../utils/errors.js';
import { config } from '../../config/index.js';

/**
 * Global error handling middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error with context
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Handle known AppError instances
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        // Include validation errors if present
        ...(('errors' in err) && { errors: (err as any).errors }),
      },
    });
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: err.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  // Handle Stripe errors
  if (err.constructor.name === 'StripeError') {
    const stripeError = err as any;
    res.status(400).json({
      success: false,
      error: {
        code: 'STRIPE_ERROR',
        message: stripeError.message,
        type: stripeError.type,
      },
    });
    return;
  }

  // Unknown errors (500)
  const statusCode = 'statusCode' in err ? (err as any).statusCode : 500;

  res.status(statusCode).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: config.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
      // Include stack trace in development
      ...(config.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err,
      }),
    },
  });

  // If error is not operational, exit process in production
  if (config.NODE_ENV === 'production' && !isOperationalError(err)) {
    logger.error('Non-operational error detected, shutting down...', { error: err });
    process.exit(1);
  }
}
