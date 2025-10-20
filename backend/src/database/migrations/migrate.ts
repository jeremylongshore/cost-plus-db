/**
 * Database Migration Runner
 *
 * Manages SQL migrations with version tracking.
 * Runs pending migrations in order and maintains migration history.
 *
 * @module database/migrations
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migration runner class
 */
export class MigrationRunner {
  constructor(private db: Database.Database) {}

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    logger.info('Starting database migrations...');

    // Ensure migrations table exists
    this.createMigrationsTable();

    // Get applied migrations
    const applied = this.getAppliedMigrations();
    logger.info(`Found ${applied.length} applied migrations`);

    // Get all migration files
    const migrationFiles = this.getMigrationFiles();
    logger.info(`Found ${migrationFiles.length} total migration files`);

    // Run pending migrations
    let appliedCount = 0;
    for (const file of migrationFiles) {
      const version = this.extractVersion(file);

      if (!applied.includes(version)) {
        logger.info(`Running migration ${version}: ${file}`);
        await this.runMigration(file, version);
        appliedCount++;
        logger.info(`✓ Migration ${version} completed`);
      }
    }

    if (appliedCount === 0) {
      logger.info('No pending migrations to apply');
    } else {
      logger.info(`Successfully applied ${appliedCount} migrations`);
    }
  }

  /**
   * Create migrations tracking table
   */
  private createMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  /**
   * Get list of applied migration versions
   */
  private getAppliedMigrations(): number[] {
    const stmt = this.db.prepare('SELECT version FROM schema_migrations ORDER BY version');
    const rows = stmt.all() as { version: number }[];
    return rows.map(row => row.version);
  }

  /**
   * Get all migration files sorted by version
   */
  private getMigrationFiles(): string[] {
    const files = fs.readdirSync(__dirname)
      .filter(f => f.endsWith('.sql'))
      .sort();

    return files;
  }

  /**
   * Extract version number from migration filename
   */
  private extractVersion(filename: string): number {
    const match = filename.match(/^(\d+)_/);
    if (!match) {
      throw new Error(`Invalid migration filename format: ${filename}`);
    }
    return parseInt(match[1], 10);
  }

  /**
   * Extract description from migration filename
   */
  private extractDescription(filename: string): string {
    return filename
      .replace(/^\d+_/, '')
      .replace(/\.sql$/, '')
      .replace(/_/g, ' ');
  }

  /**
   * Run a single migration file
   */
  private async runMigration(filename: string, version: number): Promise<void> {
    const filePath = path.join(__dirname, filename);
    const sql = fs.readFileSync(filePath, 'utf-8');
    const description = this.extractDescription(filename);

    // Execute migration in a transaction
    const migrate = this.db.transaction(() => {
      // Run migration SQL
      this.db.exec(sql);

      // Record migration (if not already recorded by migration SQL)
      const exists = this.db.prepare('SELECT 1 FROM schema_migrations WHERE version = ?').get(version);
      if (!exists) {
        this.db.prepare(`
          INSERT INTO schema_migrations (version, description, applied_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
        `).run(version, description);
      }
    });

    migrate();
  }

  /**
   * Rollback last migration (for development only)
   */
  async rollbackLast(): Promise<void> {
    const lastMigration = this.db.prepare(`
      SELECT version, description FROM schema_migrations
      ORDER BY version DESC LIMIT 1
    `).get() as { version: number; description: string } | undefined;

    if (!lastMigration) {
      logger.warn('No migrations to rollback');
      return;
    }

    logger.warn(`Rolling back migration ${lastMigration.version}: ${lastMigration.description}`);
    logger.warn('WARNING: Rollback is not implemented. You must manually revert the database schema.');

    // TODO: Implement rollback logic (requires down migrations)
  }
}

/**
 * CLI entry point
 */
async function main() {
  const dbPath = process.env.DATABASE_URL?.replace('file:', '') || '../../../002-clients/database/costplusdb.db';
  const db = new Database(dbPath);

  const runner = new MigrationRunner(db);

  try {
    await runner.migrate();
    logger.info('Migration process completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
