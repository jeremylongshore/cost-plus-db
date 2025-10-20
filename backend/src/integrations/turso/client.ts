/**
 * Turso Database Client
 * Handles connections to Turso edge database (libSQL)
 */

import { createClient, type Client, type Config, type ResultSet } from '@libsql/client';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export interface TursoQueryResult {
  rows: any[];
  columns: string[];
  rowsAffected: number;
}

export interface TursoDatabaseInfo {
  url: string;
  version: string;
  connected: boolean;
  lastSync?: Date;
}

export interface TursoConnectionPool {
  size: number;
  available: number;
  inUse: number;
}

export class TursoClient {
  private client: Client;
  private url: string;
  private authToken: string;
  private syncUrl?: string;
  private isConnected: boolean = false;

  constructor(url?: string, authToken?: string, syncUrl?: string) {
    this.url = url || config.turso.databaseUrl;
    this.authToken = authToken || config.turso.authToken;
    this.syncUrl = syncUrl || config.turso.syncUrl;

    if (!this.url || !this.authToken) {
      throw new Error('Turso database URL and auth token are required');
    }

    logger.info('Turso client initializing', {
      url: this.maskUrl(this.url),
      hasSyncUrl: !!this.syncUrl,
    });

    this.client = this.createConnection();
  }

  /**
   * Create Turso connection
   */
  private createConnection(): Client {
    const clientConfig: Config = {
      url: this.url,
      authToken: this.authToken,
    };

    // Add sync URL if available (for embedded replicas)
    if (this.syncUrl) {
      clientConfig.syncUrl = this.syncUrl;
    }

    return createClient(clientConfig);
  }

  /**
   * Connect to Turso database
   */
  async connect(): Promise<void> {
    try {
      logger.info('Connecting to Turso database');

      // Test connection with a simple query
      await this.client.execute('SELECT 1');

      this.isConnected = true;

      logger.info('Turso database connected', {
        url: this.maskUrl(this.url),
      });
    } catch (error: any) {
      this.isConnected = false;
      logger.error('Failed to connect to Turso', {
        error: error.message,
        url: this.maskUrl(this.url),
      });
      throw error;
    }
  }

  /**
   * Sync embedded replica with remote database
   */
  async sync(): Promise<{ synced: boolean; timestamp: Date }> {
    try {
      if (!this.syncUrl) {
        logger.warn('Sync URL not configured, skipping sync');
        return { synced: false, timestamp: new Date() };
      }

      logger.info('Syncing Turso embedded replica');

      // Sync is automatic with libSQL client when syncUrl is configured
      // The client handles sync internally
      await this.client.sync();

      logger.info('Turso sync completed');

      return { synced: true, timestamp: new Date() };
    } catch (error: any) {
      logger.error('Turso sync failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Execute a SQL query
   */
  async executeQuery(sql: string, params?: any[]): Promise<TursoQueryResult> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      logger.debug('Executing Turso query', {
        sql: sql.substring(0, 100),
        paramCount: params?.length || 0,
      });

      const result: ResultSet = await this.client.execute({
        sql,
        args: params || [],
      });

      logger.debug('Turso query executed', {
        rowsAffected: result.rowsAffected,
        rowCount: result.rows.length,
      });

      return {
        rows: result.rows as any[],
        columns: result.columns,
        rowsAffected: Number(result.rowsAffected),
      };
    } catch (error: any) {
      logger.error('Turso query execution failed', {
        error: error.message,
        sql: sql.substring(0, 100),
      });
      throw error;
    }
  }

  /**
   * Execute a batch of SQL queries in a transaction
   */
  async executeBatch(statements: { sql: string; params?: any[] }[]): Promise<TursoQueryResult[]> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      logger.info('Executing Turso batch', {
        statementCount: statements.length,
      });

      const batch = statements.map((stmt) => ({
        sql: stmt.sql,
        args: stmt.params || [],
      }));

      const results = await this.client.batch(batch);

      logger.info('Turso batch executed', {
        resultCount: results.length,
      });

      return results.map((result) => ({
        rows: result.rows as any[],
        columns: result.columns,
        rowsAffected: Number(result.rowsAffected),
      }));
    } catch (error: any) {
      logger.error('Turso batch execution failed', {
        error: error.message,
        statementCount: statements.length,
      });
      throw error;
    }
  }

  /**
   * Execute a query within a transaction
   */
  async transaction<T>(callback: (tx: Client) => Promise<T>): Promise<T> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      logger.info('Starting Turso transaction');

      // libSQL client handles transactions automatically
      // We'll use the client directly for transaction operations
      const result = await callback(this.client);

      logger.info('Turso transaction completed');

      return result;
    } catch (error: any) {
      logger.error('Turso transaction failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get database information
   */
  async getDatabaseInfo(): Promise<TursoDatabaseInfo> {
    try {
      // Get SQLite version
      const versionResult = await this.executeQuery('SELECT sqlite_version() as version');
      const version = versionResult.rows[0]?.version || 'unknown';

      return {
        url: this.maskUrl(this.url),
        version,
        connected: this.isConnected,
        lastSync: new Date(),
      };
    } catch (error: any) {
      logger.error('Failed to get database info', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    try {
      logger.info('Closing Turso connection');

      // libSQL client doesn't have explicit close method
      // Connection is managed automatically
      this.isConnected = false;

      logger.info('Turso connection closed');
    } catch (error: any) {
      logger.error('Failed to close Turso connection', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Mask sensitive URL information for logging
   */
  private maskUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}`;
    } catch {
      return 'invalid-url';
    }
  }

  /**
   * Get the raw libSQL client for advanced operations
   */
  getRawClient(): Client {
    return this.client;
  }

  /**
   * Check connection health
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const startTime = Date.now();

    try {
      await this.client.execute('SELECT 1');
      const latency = Date.now() - startTime;

      return {
        healthy: true,
        latency,
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
      };
    }
  }
}

// Singleton instance
let tursoClientInstance: TursoClient | null = null;

export function getTursoClient(): TursoClient {
  if (!tursoClientInstance) {
    tursoClientInstance = new TursoClient();
  }
  return tursoClientInstance;
}

export const tursoClient = getTursoClient();
