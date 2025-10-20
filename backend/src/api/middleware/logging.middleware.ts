/**
 * Request Logging Middleware
 *
 * Logs HTTP requests with method, path, status code, and response time.
 * Uses Winston logger for structured logging.
 *
 * @module api/middleware/logging
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Log request start
  logger.debug('Request received', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Capture response finish event
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;

    // Determine log level based on status code
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    logger.log(level, 'Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
    });
  });

  next();
}
