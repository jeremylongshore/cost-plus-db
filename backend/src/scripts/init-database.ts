/**
 * Database Initialization Script
 *
 * Initializes the SQLite database from schema.sql file.
 * Run this once to create the database structure.
 *
 * Usage: npm run db:init
 *
 * @module scripts/init-database
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize database from schema file
 */
async function initDatabase(): Promise<void> {
  try {
    logger.info('Starting database initialization...');

    // Get database path
    const dbPath = config.DATABASE_URL.replace('file:', '');
    logger.info(`Database path: ${dbPath}`);

    // Check if database already exists
    if (fs.existsSync(dbPath)) {
      logger.warn('Database file already exists. Skipping initialization.');
      logger.warn('To recreate the database, delete the file first or use migrations.');
      return;
    }

    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      logger.info(`Created directory: ${dbDir}`);
    }

    // Read schema file
    const schemaPath = path.join(dbDir, 'schema.sql');
    logger.info(`Reading schema from: ${schemaPath}`);

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    // Create database and execute schema
    logger.info('Creating database...');
    const db = new Database(dbPath);

    logger.info('Executing schema SQL...');
    db.exec(schemaSql);

    // Enable WAL mode
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Verify database was created
    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all() as { name: string }[];

    logger.info(`Database initialized successfully with ${tables.length} tables:`);
    tables.forEach(t => logger.info(`  - ${t.name}`));

    db.close();
    logger.info('Database connection closed');

  } catch (error) {
    logger.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// Run initialization
initDatabase()
  .then(() => {
    logger.info('✓ Database initialization complete');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Database initialization error:', error);
    process.exit(1);
  });
