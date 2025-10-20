/**
 * Type Definitions - Central Export
 *
 * Exports all TypeScript type definitions used across the application.
 * Provides a single import point for types.
 *
 * @module types
 */

/**
 * TODO: Import and re-export type modules
 *
 * Example:
 * export * from './customer.types.js';
 * export * from './database.types.js';
 * export * from './api.types.js';
 */

/**
 * Common API response types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  errors?: any;
}

/**
 * Pagination types
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Database record timestamps
 */
export interface Timestamps {
  created_at: string;
  updated_at: string;
}
