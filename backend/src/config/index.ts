/**
 * Configuration Management
 *
 * Validates and exports all environment variables using Zod schemas.
 * Ensures type-safe configuration with runtime validation.
 *
 * @module config
 */

import { z } from 'zod';

/**
 * Environment variable validation schema
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  TURSO_DATABASE_URL: z.string().optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  RESEND_FROM_EMAIL: z.string().email('Invalid RESEND_FROM_EMAIL'),
  RESEND_ADMIN_EMAIL: z.string().email('Invalid RESEND_ADMIN_EMAIL'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // API
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('3000'),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),

  // Security
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:8000'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE_PATH: z.string().default('./logs/app.log'),

  // Feature Flags
  ENABLE_TURSO_SYNC: z.string().default('false'),
  ENABLE_EMAIL_NOTIFICATIONS: z.string().default('true'),
  ENABLE_STRIPE_WEBHOOKS: z.string().default('true'),
});

/**
 * Parsed and validated configuration
 */
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsedEnv.error.format());
  process.exit(1);
}

/**
 * Type-safe configuration object
 */
export const config = {
  // Database
  DATABASE_URL: parsedEnv.data.DATABASE_URL,
  TURSO_DATABASE_URL: parsedEnv.data.TURSO_DATABASE_URL,
  TURSO_AUTH_TOKEN: parsedEnv.data.TURSO_AUTH_TOKEN,

  // Email
  RESEND_API_KEY: parsedEnv.data.RESEND_API_KEY,
  RESEND_FROM_EMAIL: parsedEnv.data.RESEND_FROM_EMAIL,
  RESEND_ADMIN_EMAIL: parsedEnv.data.RESEND_ADMIN_EMAIL,

  // Stripe
  STRIPE_SECRET_KEY: parsedEnv.data.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: parsedEnv.data.STRIPE_WEBHOOK_SECRET,
  STRIPE_PUBLISHABLE_KEY: parsedEnv.data.STRIPE_PUBLISHABLE_KEY,

  // API
  NODE_ENV: parsedEnv.data.NODE_ENV,
  PORT: parseInt(parsedEnv.data.PORT, 10),
  API_BASE_URL: parsedEnv.data.API_BASE_URL,

  // Security
  JWT_SECRET: parsedEnv.data.JWT_SECRET,
  ENCRYPTION_KEY: parsedEnv.data.ENCRYPTION_KEY,

  // CORS
  CORS_ORIGINS: parsedEnv.data.CORS_ORIGIN.split(',').map(origin => origin.trim()),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(parsedEnv.data.RATE_LIMIT_WINDOW_MS, 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(parsedEnv.data.RATE_LIMIT_MAX_REQUESTS, 10),

  // Logging
  LOG_LEVEL: parsedEnv.data.LOG_LEVEL,
  LOG_FILE_PATH: parsedEnv.data.LOG_FILE_PATH,

  // Feature Flags
  ENABLE_TURSO_SYNC: parsedEnv.data.ENABLE_TURSO_SYNC === 'true',
  ENABLE_EMAIL_NOTIFICATIONS: parsedEnv.data.ENABLE_EMAIL_NOTIFICATIONS === 'true',
  ENABLE_STRIPE_WEBHOOKS: parsedEnv.data.ENABLE_STRIPE_WEBHOOKS === 'true',
} as const;

/**
 * Configuration type for type inference
 */
export type Config = typeof config;
