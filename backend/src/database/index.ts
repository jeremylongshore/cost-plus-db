/**
 * Database Connection Manager
 *
 * Manages SQLite database connections (local and Turso cloud).
 * Provides connection pooling and initialization logic.
 *
 * @module database
 */

import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { DatabaseError } from '../utils/errors.js';

/**
 * Local SQLite database connection
 */
let localDb: Database.Database | null = null;

/**
 * Turso cloud database client
 */
let tursoClient: ReturnType<typeof createClient> | null = null;

/**
 * Initialize database connections
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Initialize local SQLite database
    logger.info('Connecting to local SQLite database...', {
      path: config.DATABASE_URL,
    });

    localDb = new Database(config.DATABASE_URL.replace('file:', ''), {
      verbose: config.NODE_ENV === 'development' ? logger.debug.bind(logger) : undefined,
    });

    // Enable WAL mode for better concurrent access
    localDb.pragma('journal_mode = WAL');

    // Enable foreign keys
    localDb.pragma('foreign_keys = ON');

    logger.info('Local SQLite database connected');

    // Initialize Turso client if configured
    if (config.ENABLE_TURSO_SYNC && config.TURSO_DATABASE_URL && config.TURSO_AUTH_TOKEN) {
      logger.info('Connecting to Turso cloud database...');

      tursoClient = createClient({
        url: config.TURSO_DATABASE_URL,
        authToken: config.TURSO_AUTH_TOKEN,
      });

      logger.info('Turso cloud database connected');
    }

    // TODO: Run pending migrations
    // await runMigrations();

  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw new DatabaseError('Database initialization failed');
  }
}

/**
 * Get local SQLite database connection
 */
export function getLocalDb(): Database.Database {
  if (!localDb) {
    throw new DatabaseError('Database not initialized. Call initializeDatabase() first.');
  }
  return localDb;
}

/**
 * Get Turso cloud database client
 */
export function getTursoClient() {
  if (!tursoClient) {
    throw new DatabaseError('Turso client not initialized or not enabled.');
  }
  return tursoClient;
}

/**
 * Close database connections
 */
export async function closeDatabase(): Promise<void> {
  if (localDb) {
    localDb.close();
    localDb = null;
    logger.info('Local database connection closed');
  }

  if (tursoClient) {
    tursoClient.close();
    tursoClient = null;
    logger.info('Turso database connection closed');
  }
}

/**
 * Execute a database transaction
 */
export function transaction<T>(fn: (db: Database.Database) => T): T {
  const db = getLocalDb();
  return db.transaction(fn)();
}

/**
 * Health check - verify database connectivity
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const db = getLocalDb();
    const result = db.prepare('SELECT 1 as health').get() as { health: number };
    return result.health === 1;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}
