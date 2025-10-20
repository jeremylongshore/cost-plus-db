/**
 * Database Validator
 *
 * Zod schemas for validating database operations including
 * database creation, resource allocation, backup configuration,
 * and database naming conventions.
 *
 * @module validators/database
 */

import { z } from 'zod';

/**
 * Database name validation rules:
 * - Lowercase letters, numbers, and underscores only
 * - Must start with a letter
 * - Maximum 63 characters (PostgreSQL limit)
 * - Minimum 3 characters
 */
const databaseNameRegex = /^[a-z][a-z0-9_]{2,62}$/;

/**
 * Database username validation rules:
 * - Similar to database name but can be shorter
 * - Lowercase letters, numbers, and underscores only
 * - Must start with a letter
 */
const usernameRegex = /^[a-z][a-z0-9_]{2,31}$/;

/**
 * PostgreSQL version enum
 */
const postgresVersionEnum = z.enum([
  '16', // Latest stable
  '15',
  '14',
  '13',
  '12',
]);

/**
 * Backup schedule enum
 */
const backupScheduleEnum = z.enum([
  'hourly',
  'every-6-hours',
  'daily',
  'weekly',
]);

/**
 * Backup retention enum (days)
 */
const backupRetentionEnum = z.enum(['7', '14', '30', '60', '90', '180', '365']);

/**
 * Database creation schema
 */
export const databaseCreateSchema = z.object({
  database_name: z
    .string()
    .regex(databaseNameRegex, 'Database name must start with a letter and contain only lowercase letters, numbers, and underscores (3-63 chars)')
    .min(3)
    .max(63),

  username: z
    .string()
    .regex(usernameRegex, 'Username must start with a letter and contain only lowercase letters, numbers, and underscores')
    .min(3)
    .max(32)
    .optional(),

  postgres_version: postgresVersionEnum.default('16'),

  // Resource allocation
  cpu_cores: z.number().int().min(1).max(64),
  memory_gb: z.number().int().min(1).max(512),
  storage_gb: z.number().int().min(10).max(5000),

  // Connection limits
  max_connections: z.number().int().min(10).max(1000).default(100),

  // SSL/TLS
  ssl_enabled: z.boolean().default(true),

  // Backup configuration
  backup_enabled: z.boolean().default(true),
  backup_schedule: backupScheduleEnum.default('daily'),
  backup_retention_days: backupRetentionEnum.default('30'),

  // Tags/metadata
  tags: z.record(z.string()).optional(),
});

/**
 * Database update schema
 */
export const databaseUpdateSchema = z.object({
  // Resource scaling
  cpu_cores: z.number().int().min(1).max(64).optional(),
  memory_gb: z.number().int().min(1).max(512).optional(),
  storage_gb: z.number().int().min(10).max(5000).optional(),

  // Connection limits
  max_connections: z.number().int().min(10).max(1000).optional(),

  // Backup configuration
  backup_enabled: z.boolean().optional(),
  backup_schedule: backupScheduleEnum.optional(),
  backup_retention_days: backupRetentionEnum.optional(),

  // Tags/metadata
  tags: z.record(z.string()).optional(),
}).strict();

/**
 * Backup configuration schema
 */
export const backupConfigSchema = z.object({
  backup_enabled: z.boolean(),
  backup_schedule: backupScheduleEnum,
  backup_retention_days: backupRetentionEnum,
  s3_bucket: z.string().min(3).max(63).optional(),
  s3_region: z.string().max(50).optional(),
  encryption_enabled: z.boolean().default(true),
});

/**
 * Database connection schema
 */
export const databaseConnectionSchema = z.object({
  host: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535).default(5432),
  database: z.string().min(1).max(63),
  username: z.string().min(1).max(63),
  password: z.string().min(8).max(255),
  ssl: z.boolean().default(true),
  ssl_ca_cert: z.string().optional(),
});

/**
 * Database list filters schema
 */
export const databaseListFiltersSchema = z.object({
  customer_id: z.coerce.number().int().positive().optional(),
  status: z.enum(['provisioning', 'active', 'suspended', 'deleted']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sort_by: z.enum(['created_at', 'database_name', 'storage_gb']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Resource allocation validation
 *
 * Validates that resource allocations are within tier limits
 * and make sense together (e.g., memory should scale with CPU).
 */
export function validateResourceAllocation(data: {
  cpu_cores: number;
  memory_gb: number;
  storage_gb: number;
  tier: string;
}): { valid: boolean; error?: string } {
  const { cpu_cores, memory_gb, storage_gb, tier } = data;

  // Basic ratio validation: memory should be at least 2x CPU cores
  const minMemory = cpu_cores * 2;
  if (memory_gb < minMemory) {
    return {
      valid: false,
      error: `Memory (${memory_gb}GB) should be at least 2x CPU cores (${minMemory}GB recommended)`,
    };
  }

  // Tier-specific limits
  const tierLimits: Record<string, { cpu: number; memory: number; storage: number }> = {
    shared: { cpu: 2, memory: 4, storage: 50 },
    dedicated: { cpu: 4, memory: 8, storage: 200 },
    pro: { cpu: 8, memory: 16, storage: 500 },
    enterprise: { cpu: 16, memory: 32, storage: 1000 },
  };

  const limits = tierLimits[tier];
  if (limits) {
    if (cpu_cores > limits.cpu) {
      return { valid: false, error: `CPU cores exceed tier limit (${limits.cpu})` };
    }
    if (memory_gb > limits.memory) {
      return { valid: false, error: `Memory exceeds tier limit (${limits.memory}GB)` };
    }
    if (storage_gb > limits.storage) {
      return { valid: false, error: `Storage exceeds tier limit (${limits.storage}GB)` };
    }
  }

  return { valid: true };
}

/**
 * Type inference
 */
export type DatabaseCreateData = z.infer<typeof databaseCreateSchema>;
export type DatabaseUpdateData = z.infer<typeof databaseUpdateSchema>;
export type BackupConfigData = z.infer<typeof backupConfigSchema>;
export type DatabaseConnectionData = z.infer<typeof databaseConnectionSchema>;
export type DatabaseListFilters = z.infer<typeof databaseListFiltersSchema>;

/**
 * Validate database creation
 */
export function validateDatabaseCreate(data: unknown): DatabaseCreateData {
  return databaseCreateSchema.parse(data);
}

/**
 * Validate database update
 */
export function validateDatabaseUpdate(data: unknown): DatabaseUpdateData {
  return databaseUpdateSchema.parse(data);
}

/**
 * Validate backup configuration
 */
export function validateBackupConfig(data: unknown): BackupConfigData {
  return backupConfigSchema.parse(data);
}

/**
 * Validate database connection
 */
export function validateDatabaseConnection(data: unknown): DatabaseConnectionData {
  return databaseConnectionSchema.parse(data);
}

/**
 * Validate database list filters
 */
export function validateDatabaseListFilters(data: unknown): DatabaseListFilters {
  return databaseListFiltersSchema.parse(data);
}
