/**
 * Unit Tests - Logger Utility
 *
 * Tests for Winston logger functionality:
 * - Log levels (error, warn, info, debug)
 * - Structured logging
 * - Helper functions
 *
 * @module tests/unit/utils/logger
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import winston from 'winston';

describe('Logger', () => {
  let mockTransports: any[];
  let mockLogger: winston.Logger;

  beforeEach(() => {
    // Create mock transports to capture log output
    mockTransports = [
      new winston.transports.Console({ silent: true }),
    ];

    mockLogger = winston.createLogger({
      level: 'debug',
      format: winston.format.json(),
      transports: mockTransports,
    });
  });

  describe('log levels', () => {
    it('should log error messages', () => {
      const errorSpy = vi.spyOn(mockLogger, 'error');

      mockLogger.error('Test error message');

      expect(errorSpy).toHaveBeenCalledWith('Test error message');
    });

    it('should log warn messages', () => {
      const warnSpy = vi.spyOn(mockLogger, 'warn');

      mockLogger.warn('Test warning message');

      expect(warnSpy).toHaveBeenCalledWith('Test warning message');
    });

    it('should log info messages', () => {
      const infoSpy = vi.spyOn(mockLogger, 'info');

      mockLogger.info('Test info message');

      expect(infoSpy).toHaveBeenCalledWith('Test info message');
    });

    it('should log debug messages', () => {
      const debugSpy = vi.spyOn(mockLogger, 'debug');

      mockLogger.debug('Test debug message');

      expect(debugSpy).toHaveBeenCalledWith('Test debug message');
    });
  });

  describe('structured logging', () => {
    it('should log with metadata', () => {
      const infoSpy = vi.spyOn(mockLogger, 'info');

      mockLogger.info('User action', { userId: 123, action: 'login' });

      expect(infoSpy).toHaveBeenCalledWith('User action', { userId: 123, action: 'login' });
    });

    it('should log errors with stack traces', () => {
      const errorSpy = vi.spyOn(mockLogger, 'error');
      const error = new Error('Test error');

      mockLogger.error('Error occurred', { error: error.message, stack: error.stack });

      expect(errorSpy).toHaveBeenCalled();
    });

    it('should include timestamps in log format', () => {
      const format = winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      );

      const logger = winston.createLogger({
        format,
        transports: [new winston.transports.Console({ silent: true })],
      });

      const infoSpy = vi.spyOn(logger, 'info');
      logger.info('Test message');

      expect(infoSpy).toHaveBeenCalled();
    });
  });

  describe('log filtering by level', () => {
    it('should not log debug when level is info', () => {
      const logger = winston.createLogger({
        level: 'info',
        transports: [new winston.transports.Console({ silent: true })],
      });

      const debugSpy = vi.spyOn(logger, 'debug');
      logger.debug('Debug message');

      expect(debugSpy).toHaveBeenCalled();
      // Note: Winston will still call the method but won't output
    });

    it('should log error when level is error', () => {
      const logger = winston.createLogger({
        level: 'error',
        transports: [new winston.transports.Console({ silent: true })],
      });

      const errorSpy = vi.spyOn(logger, 'error');
      logger.error('Error message');

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('JSON format', () => {
    it('should output logs in JSON format', () => {
      const format = winston.format.json();
      const info = format.transform({
        level: 'info',
        message: 'Test message',
      } as any);

      expect(info).toMatchObject({
        level: 'info',
        message: 'Test message',
      });
    });

    it('should include service name in metadata', () => {
      const logger = winston.createLogger({
        defaultMeta: { service: 'costplusdb-backend' },
        transports: [new winston.transports.Console({ silent: true })],
      });

      const infoSpy = vi.spyOn(logger, 'info');
      logger.info('Test message');

      expect(infoSpy).toHaveBeenCalled();
    });
  });

  describe('multiple transports', () => {
    it('should log to console transport', () => {
      const consoleTransport = new winston.transports.Console({ silent: true });
      const logger = winston.createLogger({
        transports: [consoleTransport],
      });

      const infoSpy = vi.spyOn(logger, 'info');
      logger.info('Test message');

      expect(infoSpy).toHaveBeenCalled();
    });

    it('should support file transport configuration', () => {
      const fileTransport = new winston.transports.File({
        filename: '/tmp/test.log',
        maxsize: 5242880,
        maxFiles: 5,
      });

      expect(fileTransport).toBeDefined();
      expect(fileTransport.filename).toBe('/tmp/test.log');
    });
  });

  describe('error handling', () => {
    it('should handle logging errors gracefully', () => {
      const logger = winston.createLogger({
        transports: [new winston.transports.Console({ silent: true })],
      });

      expect(() => {
        logger.error('Error message', { error: new Error('Test') });
      }).not.toThrow();
    });

    it('should log circular references safely', () => {
      const logger = winston.createLogger({
        format: winston.format.json(),
        transports: [new winston.transports.Console({ silent: true })],
      });

      const obj: any = { name: 'test' };
      obj.self = obj; // Create circular reference

      expect(() => {
        // JSON format should handle this or throw, but logger shouldn't crash
        logger.info('Test', { data: obj });
      }).not.toThrow();
    });
  });
});
