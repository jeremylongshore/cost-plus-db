/**
 * Logging Utility
 *
 * Winston-based structured logging with console and file transports.
 * Provides consistent logging interface across the application.
 *
 * @module utils/logger
 */

import winston from 'winston';
import { config } from '../config/index.js';

/**
 * Custom log format with timestamps and JSON structure
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Console format for development (human-readable)
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }

    return msg;
  })
);

/**
 * Winston logger instance
 */
export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: 'costplusdb-backend' },
  transports: [
    // Console transport (always enabled)
    new winston.transports.Console({
      format: config.NODE_ENV === 'production' ? logFormat : consoleFormat,
    }),

    // File transport (errors only)
    new winston.transports.File({
      filename: config.LOG_FILE_PATH.replace('.log', '-error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // File transport (all logs)
    new winston.transports.File({
      filename: config.LOG_FILE_PATH,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

/**
 * Stream interface for Morgan HTTP logging middleware
 */
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

/**
 * Helper to log database queries (debug level)
 */
export const logQuery = (query: string, params?: any[]) => {
  logger.debug('Database query', { query, params });
};

/**
 * Helper to log API requests
 */
export const logRequest = (method: string, path: string, statusCode: number, responseTime: number) => {
  logger.info('API request', {
    method,
    path,
    statusCode,
    responseTime: `${responseTime}ms`,
  });
};

/**
 * Helper to log errors with context
 */
export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error(error.message, {
    error: error.name,
    stack: error.stack,
    ...context,
  });
};
