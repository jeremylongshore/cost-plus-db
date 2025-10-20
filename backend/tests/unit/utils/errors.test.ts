/**
 * Unit Tests - Error Classes
 *
 * Tests for custom error classes:
 * - Error properties and inheritance
 * - HTTP status codes
 * - Error messages and codes
 *
 * @module tests/unit/utils/errors
 */

import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
  DatabaseError,
  ExternalServiceError,
  isOperationalError,
} from '../../../src/utils/errors.js';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with message and status code', () => {
      const error = new AppError('Test error', 500);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it('should have error name', () => {
      const error = new AppError('Test error');

      expect(error.name).toBe('AppError');
    });

    it('should have stack trace', () => {
      const error = new AppError('Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });

    it('should allow custom error code', () => {
      const error = new AppError('Test error', 500, 'CUSTOM_ERROR');

      expect(error.code).toBe('CUSTOM_ERROR');
    });

    it('should default to error name for code', () => {
      const error = new AppError('Test error');

      expect(error.code).toBe('APPERROR');
    });
  });

  describe('ValidationError', () => {
    it('should have 400 status code', () => {
      const error = new ValidationError();

      expect(error.statusCode).toBe(400);
    });

    it('should have VALIDATION_ERROR code', () => {
      const error = new ValidationError();

      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should include validation errors', () => {
      const errors = {
        email: 'Invalid email format',
        password: 'Password too short',
      };

      const error = new ValidationError('Validation failed', errors);

      expect(error.errors).toEqual(errors);
    });

    it('should have default message', () => {
      const error = new ValidationError();

      expect(error.message).toBe('Validation failed');
    });
  });

  describe('UnauthorizedError', () => {
    it('should have 401 status code', () => {
      const error = new UnauthorizedError();

      expect(error.statusCode).toBe(401);
    });

    it('should have UNAUTHORIZED code', () => {
      const error = new UnauthorizedError();

      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should have default message', () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe('Unauthorized');
    });
  });

  describe('ForbiddenError', () => {
    it('should have 403 status code', () => {
      const error = new ForbiddenError();

      expect(error.statusCode).toBe(403);
    });

    it('should have FORBIDDEN code', () => {
      const error = new ForbiddenError();

      expect(error.code).toBe('FORBIDDEN');
    });
  });

  describe('NotFoundError', () => {
    it('should have 404 status code', () => {
      const error = new NotFoundError();

      expect(error.statusCode).toBe(404);
    });

    it('should have NOT_FOUND code', () => {
      const error = new NotFoundError();

      expect(error.code).toBe('NOT_FOUND');
    });

    it('should accept custom message', () => {
      const error = new NotFoundError('Customer not found');

      expect(error.message).toBe('Customer not found');
    });
  });

  describe('ConflictError', () => {
    it('should have 409 status code', () => {
      const error = new ConflictError();

      expect(error.statusCode).toBe(409);
    });

    it('should have CONFLICT code', () => {
      const error = new ConflictError();

      expect(error.code).toBe('CONFLICT');
    });

    it('should accept custom message', () => {
      const error = new ConflictError('Email already exists');

      expect(error.message).toBe('Email already exists');
    });
  });

  describe('UnprocessableEntityError', () => {
    it('should have 422 status code', () => {
      const error = new UnprocessableEntityError();

      expect(error.statusCode).toBe(422);
    });

    it('should have UNPROCESSABLE_ENTITY code', () => {
      const error = new UnprocessableEntityError();

      expect(error.code).toBe('UNPROCESSABLE_ENTITY');
    });
  });

  describe('RateLimitError', () => {
    it('should have 429 status code', () => {
      const error = new RateLimitError();

      expect(error.statusCode).toBe(429);
    });

    it('should have RATE_LIMIT_EXCEEDED code', () => {
      const error = new RateLimitError();

      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('InternalServerError', () => {
    it('should have 500 status code', () => {
      const error = new InternalServerError();

      expect(error.statusCode).toBe(500);
    });

    it('should have INTERNAL_SERVER_ERROR code', () => {
      const error = new InternalServerError();

      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('ServiceUnavailableError', () => {
    it('should have 503 status code', () => {
      const error = new ServiceUnavailableError();

      expect(error.statusCode).toBe(503);
    });

    it('should have SERVICE_UNAVAILABLE code', () => {
      const error = new ServiceUnavailableError();

      expect(error.code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('DatabaseError', () => {
    it('should have 500 status code', () => {
      const error = new DatabaseError();

      expect(error.statusCode).toBe(500);
    });

    it('should have DATABASE_ERROR code', () => {
      const error = new DatabaseError();

      expect(error.code).toBe('DATABASE_ERROR');
    });

    it('should accept custom message', () => {
      const error = new DatabaseError('Connection failed');

      expect(error.message).toBe('Connection failed');
    });
  });

  describe('ExternalServiceError', () => {
    it('should have 502 status code', () => {
      const error = new ExternalServiceError('Stripe');

      expect(error.statusCode).toBe(502);
    });

    it('should have EXTERNAL_SERVICE_ERROR code', () => {
      const error = new ExternalServiceError('Stripe');

      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
    });

    it('should include service name in message', () => {
      const error = new ExternalServiceError('Stripe');

      expect(error.message).toContain('Stripe');
    });

    it('should accept custom message', () => {
      const error = new ExternalServiceError('Stripe', 'Payment processing failed');

      expect(error.message).toBe('Payment processing failed');
    });
  });

  describe('isOperationalError', () => {
    it('should return true for AppError instances', () => {
      const error = new AppError('Test error');

      expect(isOperationalError(error)).toBe(true);
    });

    it('should return true for ValidationError instances', () => {
      const error = new ValidationError();

      expect(isOperationalError(error)).toBe(true);
    });

    it('should return false for generic Error instances', () => {
      const error = new Error('Generic error');

      expect(isOperationalError(error)).toBe(false);
    });

    it('should return false for non-operational AppError', () => {
      const error = new AppError('Test error', 500, undefined, false);

      expect(isOperationalError(error)).toBe(false);
    });
  });

  describe('Error inheritance', () => {
    it('should be instance of Error', () => {
      const errors = [
        new ValidationError(),
        new NotFoundError(),
        new ConflictError(),
        new InternalServerError(),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AppError);
      });
    });

    it('should maintain proper prototype chain', () => {
      const error = new NotFoundError();

      expect(error instanceof NotFoundError).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });
  });
});
