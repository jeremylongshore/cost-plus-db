/**
 * Turso Database Synchronization
 * Handles bi-directional sync between local SQLite and Turso edge database
 */

import { Database } from 'better-sqlite3';
import { TursoClient } from './client';
import { logger } from '../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export interface SyncResult {
  success: boolean;
  direction: 'local_to_turso' | 'turso_to_local' | 'bidirectional';
  tablesProcessed: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsDeleted: number;
  duration: number;
  timestamp: Date;
  error?: string;
}

export interface SyncStats {
  lastSyncTimestamp?: Date;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
}

export interface ConflictResolution {
  strategy: 'latest_wins' | 'local_wins' | 'remote_wins' | 'manual';
  conflicts: number;
  resolved: number;
}

export class TursoSync {
  private tursoClient: TursoClient;
  private syncStateTable: string = 'sync_state';
  private conflictStrategy: 'latest_wins' | 'local_wins' | 'remote_wins' = 'latest_wins';

  constructor(tursoClient: TursoClient) {
    this.tursoClient = tursoClient;
    logger.info('TursoSync initialized', {
      conflictStrategy: this.conflictStrategy,
    });
  }

  /**
   * Initialize sync state tracking table
   */
  async initializeSyncState(): Promise<void> {
    try {
      logger.info('Initializing sync state table');

      await this.tursoClient.executeQuery(`
        CREATE TABLE IF NOT EXISTS ${this.syncStateTable} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT NOT NULL,
          last_sync_timestamp INTEGER NOT NULL,
          direction TEXT NOT NULL,
          rows_synced INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          UNIQUE(table_name)
        )
      `);

      logger.info('Sync state table initialized');
    } catch (error: any) {
      logger.error('Failed to initialize sync state', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Sync local SQLite database to Turso
   */
  async syncLocalToTurso(localDbPath: string): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting local to Turso sync', {
        localDbPath,
      });

      // Check if local database exists
      if (!fs.existsSync(localDbPath)) {
        throw new Error(`Local database not found: ${localDbPath}`);
      }

      // Open local SQLite database
      const Database = require('better-sqlite3');
      const localDb = new Database(localDbPath, { readonly: true });

      // Get list of tables to sync
      const tables = localDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all() as { name: string }[];

      logger.info('Found tables to sync', {
        count: tables.length,
        tables: tables.map((t) => t.name),
      });

      let totalInserted = 0;
      let totalUpdated = 0;
      let tablesProcessed = 0;

      // Sync each table
      for (const table of tables) {
        const tableName = table.name;

        // Skip sync state table
        if (tableName === this.syncStateTable) {
          continue;
        }

        logger.info('Syncing table', { tableName });

        // Get last sync timestamp for this table
        const lastSync = await this.getLastSyncTimestamp(tableName);

        // Get rows from local database that changed since last sync
        let rows: any[];
        if (lastSync) {
          rows = localDb
            .prepare(`SELECT * FROM ${tableName} WHERE updated_at > ?`)
            .all(lastSync.getTime()) as any[];
        } else {
          // First sync - get all rows
          rows = localDb.prepare(`SELECT * FROM ${tableName}`).all() as any[];
        }

        if (rows.length === 0) {
          logger.info('No changes to sync for table', { tableName });
          continue;
        }

        logger.info('Syncing rows', {
          tableName,
          rowCount: rows.length,
        });

        // Get column names from first row
        const columns = Object.keys(rows[0]);

        // Build insert/replace statement
        const placeholders = columns.map(() => '?').join(', ');
        const sql = `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

        // Batch insert rows
        const batchSize = 100;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          const statements = batch.map((row) => ({
            sql,
            params: columns.map((col) => row[col]),
          }));

          await this.tursoClient.executeBatch(statements);
        }

        totalInserted += rows.length;
        tablesProcessed++;

        // Update sync state
        await this.updateSyncState(tableName, 'local_to_turso', rows.length);
      }

      localDb.close();

      const duration = Date.now() - startTime;

      logger.info('Local to Turso sync completed', {
        tablesProcessed,
        rowsInserted: totalInserted,
        duration,
      });

      return {
        success: true,
        direction: 'local_to_turso',
        tablesProcessed,
        rowsInserted: totalInserted,
        rowsUpdated: totalUpdated,
        rowsDeleted: 0,
        duration,
        timestamp: new Date(),
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('Local to Turso sync failed', {
        error: error.message,
        duration,
      });

      return {
        success: false,
        direction: 'local_to_turso',
        tablesProcessed: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsDeleted: 0,
        duration,
        timestamp: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Sync Turso database to local SQLite
   */
  async syncTursoToLocal(localDbPath: string): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting Turso to local sync', {
        localDbPath,
      });

      // Open local SQLite database
      const Database = require('better-sqlite3');
      const localDb = new Database(localDbPath);

      // Get list of tables from Turso
      const tablesResult = await this.tursoClient.executeQuery(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );

      const tables = tablesResult.rows as { name: string }[];

      logger.info('Found tables to sync from Turso', {
        count: tables.length,
        tables: tables.map((t) => t.name),
      });

      let totalInserted = 0;
      let totalUpdated = 0;
      let tablesProcessed = 0;

      // Sync each table
      for (const table of tables) {
        const tableName = table.name;

        // Skip sync state table
        if (tableName === this.syncStateTable) {
          continue;
        }

        logger.info('Syncing table from Turso', { tableName });

        // Get last sync timestamp
        const lastSync = await this.getLastSyncTimestamp(tableName);

        // Get rows from Turso that changed since last sync
        let rows: any[];
        if (lastSync) {
          const result = await this.tursoClient.executeQuery(
            `SELECT * FROM ${tableName} WHERE updated_at > ?`,
            [lastSync.getTime()]
          );
          rows = result.rows;
        } else {
          // First sync - get all rows
          const result = await this.tursoClient.executeQuery(`SELECT * FROM ${tableName}`);
          rows = result.rows;
        }

        if (rows.length === 0) {
          logger.info('No changes to sync from Turso', { tableName });
          continue;
        }

        logger.info('Syncing rows from Turso', {
          tableName,
          rowCount: rows.length,
        });

        // Get column names
        const columns = Object.keys(rows[0]);

        // Build insert/replace statement
        const placeholders = columns.map(() => '?').join(', ');
        const sql = `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

        // Prepare statement
        const stmt = localDb.prepare(sql);

        // Insert rows
        const insertMany = localDb.transaction((rows: any[]) => {
          for (const row of rows) {
            stmt.run(columns.map((col) => row[col]));
          }
        });

        insertMany(rows);

        totalInserted += rows.length;
        tablesProcessed++;

        // Update sync state
        await this.updateSyncState(tableName, 'turso_to_local', rows.length);
      }

      localDb.close();

      const duration = Date.now() - startTime;

      logger.info('Turso to local sync completed', {
        tablesProcessed,
        rowsInserted: totalInserted,
        duration,
      });

      return {
        success: true,
        direction: 'turso_to_local',
        tablesProcessed,
        rowsInserted: totalInserted,
        rowsUpdated: totalUpdated,
        rowsDeleted: 0,
        duration,
        timestamp: new Date(),
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('Turso to local sync failed', {
        error: error.message,
        duration,
      });

      return {
        success: false,
        direction: 'turso_to_local',
        tablesProcessed: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsDeleted: 0,
        duration,
        timestamp: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Incremental sync - only sync changed rows
   */
  async incrementalSync(localDbPath: string, direction: 'push' | 'pull' | 'bidirectional'): Promise<SyncResult> {
    logger.info('Starting incremental sync', {
      direction,
      localDbPath,
    });

    if (direction === 'push') {
      return this.syncLocalToTurso(localDbPath);
    } else if (direction === 'pull') {
      return this.syncTursoToLocal(localDbPath);
    } else {
      // Bidirectional sync
      const pushResult = await this.syncLocalToTurso(localDbPath);
      const pullResult = await this.syncTursoToLocal(localDbPath);

      return {
        success: pushResult.success && pullResult.success,
        direction: 'bidirectional',
        tablesProcessed: pushResult.tablesProcessed + pullResult.tablesProcessed,
        rowsInserted: pushResult.rowsInserted + pullResult.rowsInserted,
        rowsUpdated: pushResult.rowsUpdated + pullResult.rowsUpdated,
        rowsDeleted: pushResult.rowsDeleted + pullResult.rowsDeleted,
        duration: pushResult.duration + pullResult.duration,
        timestamp: new Date(),
        error: pushResult.error || pullResult.error,
      };
    }
  }

  /**
   * Full sync - complete database sync
   */
  async fullSync(localDbPath: string): Promise<SyncResult> {
    logger.info('Starting full sync');

    // Clear sync state to force full sync
    await this.clearSyncState();

    // Perform bidirectional sync
    return this.incrementalSync(localDbPath, 'bidirectional');
  }

  /**
   * Get last sync timestamp for a table
   */
  private async getLastSyncTimestamp(tableName: string): Promise<Date | null> {
    try {
      const result = await this.tursoClient.executeQuery(
        `SELECT last_sync_timestamp FROM ${this.syncStateTable} WHERE table_name = ? ORDER BY created_at DESC LIMIT 1`,
        [tableName]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const timestamp = result.rows[0].last_sync_timestamp;
      return new Date(timestamp);
    } catch (error) {
      logger.warn('Failed to get last sync timestamp', {
        tableName,
        error,
      });
      return null;
    }
  }

  /**
   * Update sync state for a table
   */
  private async updateSyncState(tableName: string, direction: string, rowsSynced: number): Promise<void> {
    try {
      await this.tursoClient.executeQuery(
        `INSERT OR REPLACE INTO ${this.syncStateTable} (table_name, last_sync_timestamp, direction, rows_synced, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [tableName, Date.now(), direction, rowsSynced, Date.now()]
      );
    } catch (error) {
      logger.error('Failed to update sync state', {
        tableName,
        error,
      });
    }
  }

  /**
   * Clear sync state (for full sync)
   */
  private async clearSyncState(): Promise<void> {
    try {
      await this.tursoClient.executeQuery(`DELETE FROM ${this.syncStateTable}`);
      logger.info('Sync state cleared');
    } catch (error) {
      logger.error('Failed to clear sync state', { error });
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<SyncStats> {
    try {
      const result = await this.tursoClient.executeQuery(`
        SELECT
          MAX(last_sync_timestamp) as last_sync,
          COUNT(*) as total_syncs,
          SUM(CASE WHEN rows_synced > 0 THEN 1 ELSE 0 END) as successful_syncs
        FROM ${this.syncStateTable}
      `);

      const row = result.rows[0];

      return {
        lastSyncTimestamp: row.last_sync ? new Date(row.last_sync) : undefined,
        totalSyncs: row.total_syncs || 0,
        successfulSyncs: row.successful_syncs || 0,
        failedSyncs: (row.total_syncs || 0) - (row.successful_syncs || 0),
      };
    } catch (error) {
      logger.error('Failed to get sync stats', { error });
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
      };
    }
  }
}

// Factory function
export function createTursoSync(tursoClient: TursoClient): TursoSync {
  return new TursoSync(tursoClient);
}
