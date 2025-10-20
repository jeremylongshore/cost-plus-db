/**
 * Database Service
 *
 * Handles PostgreSQL database operations and monitoring:
 * - Database health checks
 * - Connection pool management
 * - Query execution and monitoring
 * - Performance metrics collection
 *
 * @module services/database
 */

// TODO: Install pg package: npm install pg @types/pg
// import { Pool, QueryResult as PgQueryResult } from 'pg';
import Database from 'better-sqlite3';
import { CustomerDatabase } from '../database/schema.js';
import { NotFoundError, DatabaseError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// Temporary types until pg is installed
type Pool = any;
type PgQueryResult = any;

/**
 * Database health status
 */
export interface HealthStatus {
  database_id: number;
  database_name: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time_ms: number;
  active_connections: number;
  max_connections: number;
  disk_usage_gb: number;
  disk_total_gb: number;
  last_backup: string | null;
  checked_at: string;
}

/**
 * Connection pool statistics
 */
export interface PoolStats {
  database_id: number;
  total_connections: number;
  idle_connections: number;
  waiting_clients: number;
  max_connections: number;
  utilization_percentage: number;
}

/**
 * Query execution result
 */
export interface QueryResult {
  rows: any[];
  row_count: number;
  execution_time_ms: number;
  fields: Array<{ name: string; dataType: string }>;
}

/**
 * Database metrics
 */
export interface Metrics {
  database_id: number;
  database_name: string;
  size_mb: number;
  table_count: number;
  index_count: number;
  active_queries: number;
  slow_queries_1h: number;
  cache_hit_ratio: number;
  transactions_per_second: number;
  collected_at: string;
}

/**
 * Connection pool cache
 */
const poolCache = new Map<number, Pool>();

/**
 * Database service class
 */
export class DatabaseService {
  constructor(private db: Database.Database) {}

  /**
   * Check database health
   *
   * Performs comprehensive health check including:
   * - Connection test
   * - Response time measurement
   * - Connection count
   * - Disk usage
   * - Last backup time
   *
   * @param databaseId - Customer database ID
   * @returns Health status
   */
  async checkDatabaseHealth(databaseId: number): Promise<HealthStatus> {
    logger.info('Checking database health', { databaseId });

    const database = await this.getDatabase(databaseId);
    const startTime = Date.now();

    try {
      const pool = await this.getConnectionPool(databaseId);

      // Test connection with simple query
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
      } finally {
        client.release();
      }

      const responseTime = Date.now() - startTime;

      // Get connection statistics
      const connStats = await this.getConnectionStats(pool);

      // Get disk usage
      const diskUsage = await this.getDiskUsage(pool);

      // Get last backup time
      const lastBackup = await this.getLastBackupTime(database.database_name);

      // Determine status
      let status: 'healthy' | 'degraded' | 'down' = 'healthy';
      if (responseTime > 1000) {
        status = 'degraded';
      }
      if (connStats.active_connections >= database.connection_limit * 0.9) {
        status = 'degraded';
      }

      const health: HealthStatus = {
        database_id: databaseId,
        database_name: database.database_name,
        status,
        response_time_ms: responseTime,
        active_connections: connStats.active_connections,
        max_connections: database.connection_limit,
        disk_usage_gb: diskUsage.used_gb,
        disk_total_gb: database.storage_gb,
        last_backup: lastBackup,
        checked_at: new Date().toISOString(),
      };

      logger.info('Health check completed', { databaseId, status });
      return health;
    } catch (error) {
      logger.error('Health check failed', {
        databaseId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        database_id: databaseId,
        database_name: database.database_name,
        status: 'down',
        response_time_ms: Date.now() - startTime,
        active_connections: 0,
        max_connections: database.connection_limit,
        disk_usage_gb: 0,
        disk_total_gb: database.storage_gb,
        last_backup: null,
        checked_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Get connection pool statistics
   *
   * @param databaseId - Customer database ID
   * @returns Pool statistics
   */
  async getConnectionPool(databaseId: number): Promise<Pool> {
    // Check cache first
    if (poolCache.has(databaseId)) {
      return poolCache.get(databaseId)!;
    }

    // TODO: Use actual database connection details when pg is installed
    // const database = await this.getDatabase(databaseId);

    // Create new pool
    // TODO: Uncomment when pg package is installed
    const pool: any = {}; /*new Pool({
      host: database.host,
      port: database.port,
      database: database.database_name,
      user: database.username,
      password: this.decryptPassword(database.password_hash),
      ssl: database.ssl_enabled ? { rejectUnauthorized: false } : false,
      max: Math.min(database.connection_limit, 20), // Pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });*/

    // Cache pool
    poolCache.set(databaseId, pool);

    logger.info('Connection pool created', { databaseId });
    return pool;
  }

  /**
   * Get pool statistics
   *
   * @param databaseId - Customer database ID
   * @returns Pool statistics
   */
  async getPoolStats(databaseId: number): Promise<PoolStats> {
    const database = await this.getDatabase(databaseId);
    const pool = await this.getConnectionPool(databaseId);

    const totalCount = pool.totalCount;
    const idleCount = pool.idleCount;
    const waitingCount = pool.waitingCount;
    const maxConnections = database.connection_limit;

    return {
      database_id: databaseId,
      total_connections: totalCount,
      idle_connections: idleCount,
      waiting_clients: waitingCount,
      max_connections: maxConnections,
      utilization_percentage: Math.round((totalCount / maxConnections) * 100),
    };
  }

  /**
   * Execute query on customer database
   *
   * @param databaseId - Customer database ID
   * @param query - SQL query to execute
   * @param params - Query parameters
   * @returns Query result
   */
  async executeQuery(
    databaseId: number,
    query: string,
    params?: any[]
  ): Promise<QueryResult> {
    logger.debug('Executing query', { databaseId, query });

    const startTime = Date.now();
    const pool = await this.getConnectionPool(databaseId);

    try {
      const result: PgQueryResult = await pool.query(query, params);
      const executionTime = Date.now() - startTime;

      logger.debug('Query executed', {
        databaseId,
        rowCount: result.rowCount,
        executionTime,
      });

      return {
        rows: result.rows,
        row_count: result.rowCount || 0,
        execution_time_ms: executionTime,
        fields: result.fields.map((field: any) => ({
          name: field.name,
          dataType: field.dataTypeID.toString(),
        })),
      };
    } catch (error) {
      logger.error('Query execution failed', {
        databaseId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError(`Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Collect database metrics
   *
   * @param databaseId - Customer database ID
   * @returns Database metrics
   */
  async collectMetrics(databaseId: number): Promise<Metrics> {
    logger.info('Collecting database metrics', { databaseId });

    const database = await this.getDatabase(databaseId);
    const pool = await this.getConnectionPool(databaseId);

    try {
      // Database size
      const sizeResult = await pool.query(`
        SELECT pg_database_size(current_database()) as size_bytes
      `);
      const sizeBytes = parseInt(sizeResult.rows[0].size_bytes);
      const sizeMB = Math.round((sizeBytes / 1024 / 1024) * 100) / 100;

      // Table count
      const tableResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `);
      const tableCount = parseInt(tableResult.rows[0].count);

      // Index count
      const indexResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE schemaname = 'public'
      `);
      const indexCount = parseInt(indexResult.rows[0].count);

      // Active queries
      const activeResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM pg_stat_activity
        WHERE state = 'active'
          AND pid != pg_backend_pid()
      `);
      const activeQueries = parseInt(activeResult.rows[0].count);

      // Cache hit ratio
      const cacheResult = await pool.query(`
        SELECT
          sum(heap_blks_hit) / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0) as ratio
        FROM pg_statio_user_tables
      `);
      const cacheHitRatio = cacheResult.rows[0].ratio
        ? Math.round(parseFloat(cacheResult.rows[0].ratio) * 100)
        : 0;

      return {
        database_id: databaseId,
        database_name: database.database_name,
        size_mb: sizeMB,
        table_count: tableCount,
        index_count: indexCount,
        active_queries: activeQueries,
        slow_queries_1h: 0, // TODO: Implement slow query tracking
        cache_hit_ratio: cacheHitRatio,
        transactions_per_second: 0, // TODO: Calculate TPS
        collected_at: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to collect metrics', {
        databaseId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new DatabaseError('Failed to collect database metrics');
    }
  }

  /**
   * Close connection pool for database
   *
   * @param databaseId - Customer database ID
   */
  async closePool(databaseId: number): Promise<void> {
    const pool = poolCache.get(databaseId);
    if (pool) {
      await pool.end();
      poolCache.delete(databaseId);
      logger.info('Connection pool closed', { databaseId });
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async getDatabase(databaseId: number): Promise<CustomerDatabase> {
    const stmt = this.db.prepare('SELECT * FROM customer_databases WHERE id = ?');
    const database = stmt.get(databaseId) as CustomerDatabase | undefined;

    if (!database) {
      throw new NotFoundError(`Database with ID ${databaseId} not found`);
    }

    return database;
  }

  private async getConnectionStats(pool: Pool): Promise<{ active_connections: number }> {
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as count
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);
      return { active_connections: parseInt(result.rows[0].count) };
    } catch (error) {
      return { active_connections: 0 };
    }
  }

  private async getDiskUsage(pool: Pool): Promise<{ used_gb: number }> {
    try {
      const result = await pool.query(`
        SELECT pg_database_size(current_database()) as size_bytes
      `);
      const sizeBytes = parseInt(result.rows[0].size_bytes);
      const sizeGB = Math.round((sizeBytes / 1024 / 1024 / 1024) * 100) / 100;
      return { used_gb: sizeGB };
    } catch (error) {
      return { used_gb: 0 };
    }
  }

  private async getLastBackupTime(_databaseName: string): Promise<string | null> {
    // TODO: Query pgBackRest for last backup time
    logger.warn('TODO: Implement pgBackRest last backup query');
    return null;
  }

  // TODO: Uncomment when needed
  // private decryptPassword(passwordHash: string): string {
  //   // TODO: Implement proper password decryption
  //   logger.warn('TODO: Implement password decryption');
  //   return passwordHash.replace('hashed_', '');
  // }
}
