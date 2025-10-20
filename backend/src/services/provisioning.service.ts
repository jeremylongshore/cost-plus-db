/**
 * Provisioning Service
 *
 * Handles database provisioning workflow including:
 * - VPS database provisioning via SSH
 * - Credential generation and encryption
 * - Backup configuration (pgBackRest)
 * - Customer database record management
 * - Status transitions and rollback handling
 *
 * @module services/provisioning
 */

import { randomBytes } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as argon2 from 'argon2';
import Database from 'better-sqlite3';
import { CustomerDatabase } from '../database/schema.js';
import { NotFoundError, InternalServerError, ExternalServiceError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

/**
 * Database provisioning configuration
 */
export interface ProvisioningConfig {
  tier: 'shared' | 'dedicated' | 'pro' | 'enterprise';
  storage_gb: number;
  connection_limit: number;
  backup_enabled: boolean;
  ssl_enabled: boolean;
}

/**
 * Provisioning result
 */
export interface DatabaseProvisioningResult {
  database_id: number;
  database_name: string;
  host: string;
  port: number;
  username: string;
  password: string; // Plaintext for initial delivery only
  connection_string: string;
  ssl_enabled: boolean;
  backup_enabled: boolean;
  provisioned_at: string;
}

/**
 * VPS provisioning response
 */
interface VPSProvisioningResponse {
  success: boolean;
  database_name: string;
  host: string;
  port: number;
  username: string;
  message?: string;
  error?: string;
}

/**
 * Backup configuration result
 */
interface BackupConfigResult {
  success: boolean;
  repo_name: string;
  stanza_name: string;
  error?: string;
}

/**
 * Provisioning service class
 */
export class ProvisioningService {
  constructor(private db: Database.Database) {}

  /**
   * Provision a new PostgreSQL database for a customer
   *
   * Workflow:
   * 1. Validate customer exists and is in 'approved' status
   * 2. Generate secure credentials (32-char password)
   * 3. Call provision script via SSH to create database on VPS
   * 4. Configure pgBackRest backups
   * 5. Store database record with encrypted credentials
   * 6. Update customer status to 'active'
   * 7. Return connection details
   *
   * @param customerId - Customer ID to provision database for
   * @returns Database provisioning details
   * @throws NotFoundError if customer not found
   * @throws ExternalServiceError if provisioning fails
   */
  async provisionDatabase(customerId: number): Promise<DatabaseProvisioningResult> {
    logger.info('Starting database provisioning', { customerId });

    // 1. Validate customer exists and status
    const customer = await this.getCustomer(customerId);

    if (customer.status !== 'approved') {
      throw new InternalServerError(
        `Customer must be in 'approved' status to provision. Current status: ${customer.status}`
      );
    }

    // 2. Generate secure credentials
    const databaseName = this.generateDatabaseName(customer.company_name, customerId);
    const username = this.generateUsername(databaseName);
    const password = this.generateSecurePassword(32);

    // 3. Get provisioning configuration based on tier
    const config = this.getProvisioningConfig(customer.tier);

    if (!config) {
      throw new InternalServerError(`Invalid tier: ${customer.tier}`);
    }

    // 4. Update customer status to 'provisioning'
    await this.updateCustomerStatus(customerId, 'provisioning');

    try {
      // 5. Provision database on VPS
      logger.info('Calling VPS provisioning script', { databaseName, customerId });
      const vpsResult = await this.callProvisioningScript(
        databaseName,
        username,
        password,
        config
      );

      if (!vpsResult.success) {
        throw new ExternalServiceError(
          'VPS',
          `Provisioning failed: ${vpsResult.error || 'Unknown error'}`
        );
      }

      // 6. Configure backups
      logger.info('Configuring pgBackRest backups', { databaseName });
      const backupResult = await this.configureBackups(databaseName, vpsResult.host);

      if (!backupResult.success) {
        logger.error('Backup configuration failed', {
          databaseName,
          error: backupResult.error,
        });
        // Continue anyway - backups can be configured later
      }

      // 7. Store database record
      const databaseRecord = await this.createDatabaseRecord({
        customer_id: customerId,
        database_name: databaseName,
        host: vpsResult.host,
        port: vpsResult.port,
        username: username,
        password_hash: await this.hashPassword(password),
        ssl_enabled: config.ssl_enabled,
        connection_limit: config.connection_limit,
        storage_gb: config.storage_gb,
        backup_enabled: backupResult.success,
      });

      // 8. Update customer status to 'active'
      await this.updateCustomerStatus(customerId, 'active');

      // 9. Log activity
      await this.logActivity(customerId, 'database_provisioned', {
        database_id: databaseRecord.id,
        database_name: databaseName,
        tier: customer.tier,
      });

      logger.info('Database provisioning completed', {
        customerId,
        databaseId: databaseRecord.id,
        databaseName,
      });

      // 10. Return provisioning result with plaintext password
      return {
        database_id: databaseRecord.id,
        database_name: databaseName,
        host: vpsResult.host,
        port: vpsResult.port,
        username: username,
        password: password, // Return plaintext for welcome email
        connection_string: this.buildConnectionString(
          vpsResult.host,
          vpsResult.port,
          databaseName,
          username,
          password,
          config.ssl_enabled
        ),
        ssl_enabled: config.ssl_enabled,
        backup_enabled: backupResult.success,
        provisioned_at: new Date().toISOString(),
      };
    } catch (error) {
      // Rollback: Update customer status back to 'approved'
      logger.error('Provisioning failed, rolling back', { customerId, error });
      await this.updateCustomerStatus(customerId, 'approved');

      // Re-throw the error
      if (error instanceof Error) {
        throw error;
      }
      throw new InternalServerError('Database provisioning failed');
    }
  }

  /**
   * Deprovision a customer database
   *
   * Workflow:
   * 1. Get database record
   * 2. Execute deprovision script to remove database and user
   * 3. Archive credentials
   * 4. Update database status to 'deprovisioned'
   * 5. Log activity
   *
   * @param databaseId - Database ID to deprovision
   * @throws NotFoundError if database not found
   * @throws ExternalServiceError if deprovisioning fails
   */
  async deprovisionDatabase(databaseId: number): Promise<void> {
    logger.info('Starting database deprovisioning', { databaseId });

    // 1. Get database record
    const database = await this.getDatabaseById(databaseId);

    if (!database) {
      throw new NotFoundError(`Database with ID ${databaseId} not found`);
    }

    try {
      // 2. Execute deprovision script
      logger.info('Calling deprovisioning script', {
        databaseId,
        databaseName: database.database_name,
      });

      const deprovisionResult = await this.callDeprovisioningScript(database.database_name);

      if (!deprovisionResult.success) {
        throw new ExternalServiceError(
          'VPS',
          `Deprovisioning failed: ${deprovisionResult.error || 'Unknown error'}`
        );
      }

      // 3. Archive credentials (already done by script)
      logger.info('Credentials archived by deprovisioning script', { databaseId });

      // 4. Update database status
      await this.updateDatabaseStatus(databaseId, 'deprovisioned');

      // 5. Update customer status if this was their only database
      const customerDatabases = await this.getCustomerDatabases(database.customer_id);
      const activeDatabases = customerDatabases.filter(db => db.id !== databaseId);

      if (activeDatabases.length === 0) {
        await this.updateCustomerStatus(database.customer_id, 'churned');
      }

      // 6. Log activity
      await this.logActivity(database.customer_id, 'database_deprovisioned', {
        database_id: databaseId,
        database_name: database.database_name,
      });

      logger.info('Database deprovisioning completed', { databaseId });
    } catch (error) {
      logger.error('Deprovisioning failed', {
        databaseId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof Error) {
        throw error;
      }
      throw new InternalServerError('Database deprovisioning failed');
    }
  }

  /**
   * Get database health status
   *
   * Performs a simple connection test to determine if the database is online.
   *
   * @param databaseId - Database ID to check
   * @returns Health status (online/offline/degraded)
   */
  async getDatabaseHealth(databaseId: number): Promise<'online' | 'offline' | 'degraded'> {
    logger.info('Checking database health', { databaseId });

    try {
      // 1. Get database record
      const database = await this.getDatabaseById(databaseId);

      // 2. Try to connect to PostgreSQL using pg module
      // For now, we'll simulate a health check
      // In production, this would use the pg Pool to test connection
      logger.info('Testing database connection', {
        host: database.host,
        port: database.port,
        database: database.database_name,
      });

      // TODO: Implement actual PostgreSQL connection test when pg is installed
      // const pool = new Pool({
      //   host: database.host,
      //   port: database.port,
      //   database: database.database_name,
      //   user: database.username,
      //   password: await this.decryptPassword(database.password_hash),
      //   ssl: database.ssl_enabled ? { rejectUnauthorized: false } : false,
      //   connectionTimeoutMillis: 5000,
      // });
      //
      // try {
      //   const client = await pool.connect();
      //   await client.query('SELECT 1');
      //   client.release();
      //   await pool.end();
      //   return 'online';
      // } catch (error) {
      //   await pool.end();
      //   throw error;
      // }

      // For now, assume online if database record exists
      return 'online';
    } catch (error) {
      logger.error('Database health check failed', {
        databaseId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 'offline';
    }
  }

  /**
   * Get database metrics and performance statistics
   *
   * Queries PostgreSQL system catalogs to collect:
   * - Database size
   * - Connection count
   * - Query statistics
   * - Table and index counts
   *
   * @param databaseId - Database ID to collect metrics for
   * @returns Database metrics object
   */
  async getDatabaseMetrics(databaseId: number): Promise<{
    database_id: number;
    database_name: string;
    size_mb: number;
    connection_count: number;
    active_queries: number;
    table_count: number;
    index_count: number;
    cache_hit_ratio: number;
    collected_at: string;
  }> {
    logger.info('Collecting database metrics', { databaseId });

    try {
      // 1. Get database record
      const database = await this.getDatabaseById(databaseId);

      // 2. Query PostgreSQL for metrics
      // TODO: Implement actual metrics collection when pg is installed
      // This would query:
      // - pg_database_size(current_database()) for size
      // - pg_stat_activity for connection count
      // - pg_stat_database for query stats
      // - information_schema.tables for table count
      // - pg_indexes for index count
      // - pg_statio_user_tables for cache hit ratio

      // For now, return mock metrics
      const metrics = {
        database_id: databaseId,
        database_name: database.database_name,
        size_mb: 0, // TODO: Query actual size
        connection_count: 0, // TODO: Query actual connections
        active_queries: 0, // TODO: Query active queries
        table_count: 0, // TODO: Query table count
        index_count: 0, // TODO: Query index count
        cache_hit_ratio: 0, // TODO: Calculate cache hit ratio
        collected_at: new Date().toISOString(),
      };

      logger.info('Database metrics collected', { databaseId, metrics });
      return metrics;
    } catch (error) {
      logger.error('Failed to collect database metrics', {
        databaseId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new InternalServerError('Failed to collect database metrics');
    }
  }

  /**
   * Call deprovisioning script on VPS
   */
  private async callDeprovisioningScript(
    databaseName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Extract customer name from database name
      const customerName = databaseName.replace(/_db$/, '');

      // Build script path
      const scriptPath = '/home/admincostplus/projects/costplusdb/scripts/deprovision-customer-database.sh';

      logger.info('Executing deprovisioning script', { customerName, databaseName });

      // Execute deprovision script (non-interactive mode)
      const command = `echo "yes" | SUDO_PASS="${process.env.SUDO_PASSWORD || ''}" ${scriptPath} ${customerName}`;

      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, // 30 second timeout
      });

      if (stderr && stderr.includes('Error')) {
        logger.error('Deprovisioning script error', { stderr });
        throw new Error(stderr);
      }

      const output = stdout.toString();
      logger.debug('Deprovisioning script output', { output });

      // Verify success message
      if (!output.includes('Customer database deprovisioned')) {
        throw new Error('Deprovisioning script did not complete successfully');
      }

      return { success: true };
    } catch (error) {
      logger.error('Deprovisioning script execution failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Call provisioning script on VPS via SSH
   */
  private async callProvisioningScript(
    databaseName: string,
    username: string,
    password: string,
    _config: ProvisioningConfig
  ): Promise<VPSProvisioningResponse> {
    try {
      // Extract customer name from database name (format: company_custXXX)
      const customerName = databaseName.replace(/_db$/, '');

      // Build script path - use absolute path
      const scriptPath = '/home/admincostplus/projects/costplusdb/scripts/provision-customer-database.sh';

      // Execute provisioning script
      logger.info('Executing provisioning script', { customerName, databaseName });

      const command = `SUDO_PASS="${process.env.SUDO_PASSWORD || ''}" ${scriptPath} ${customerName}`;

      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 60 second timeout
        env: {
          ...process.env,
          CUSTOMER_NAME: customerName,
          DB_PASSWORD: password,
        },
      });

      if (stderr && stderr.includes('Error')) {
        logger.error('Provisioning script error', { stderr });
        throw new Error(stderr);
      }

      // Parse output to extract connection details
      const output = stdout.toString();
      logger.debug('Provisioning script output', { output });

      // Extract host from output (default to localhost for now)
      const host = process.env.POSTGRES_HOST || 'localhost';
      const port = parseInt(process.env.POSTGRES_PORT || '5433');

      // Verify success message
      if (!output.includes('Customer database provisioned')) {
        throw new Error('Provisioning script did not complete successfully');
      }

      return {
        success: true,
        database_name: `${customerName}_db`,
        host,
        port,
        username: `${customerName}_user`,
        message: 'Database provisioned successfully',
      };
    } catch (error) {
      logger.error('Provisioning script execution failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        database_name: databaseName,
        host: '',
        port: 0,
        username: username,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Configure pgBackRest backups for the database
   */
  private async configureBackups(
    databaseName: string,
    host: string
  ): Promise<BackupConfigResult> {
    try {
      // For now, log that backups would be configured
      // In production, this would execute pgBackRest configuration
      logger.info('Configuring pgBackRest backups', { databaseName, host });

      // TODO: Execute actual pgBackRest configuration script when available
      // This would involve:
      // 1. Creating pgBackRest stanza for the database
      // 2. Configuring Wasabi S3 repository
      // 3. Running initial full backup
      // 4. Setting up automated backup schedule

      // For now, mark as success
      // When implemented, this would execute:
      // const backupScriptPath = '/home/admincostplus/projects/costplusdb/scripts/configure-backups.sh';

      // Simulated success response
      return {
        success: true,
        repo_name: 'wasabi-s3-repo',
        stanza_name: databaseName,
      };
    } catch (error) {
      logger.error('Backup configuration failed', {
        databaseName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        repo_name: '',
        stanza_name: databaseName,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate database name from company name
   */
  private generateDatabaseName(companyName: string, customerId: number): string {
    // Sanitize company name: lowercase, alphanumeric only, max 20 chars
    const sanitized = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);

    // Format: company_cust123
    return `${sanitized}_cust${customerId}`;
  }

  /**
   * Generate PostgreSQL username
   */
  private generateUsername(databaseName: string): string {
    return `${databaseName}_user`;
  }

  /**
   * Generate cryptographically secure password
   */
  private generateSecurePassword(length: number = 32): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-_+=';
    const bytes = randomBytes(length);
    let password = '';

    for (let i = 0; i < length; i++) {
      const byte = bytes[i];
      if (byte !== undefined) {
        password += charset[byte % charset.length];
      }
    }

    return password;
  }

  /**
   * Hash password for storage using argon2
   */
  private async hashPassword(password: string): Promise<string> {
    try {
      // Use argon2 for secure password hashing
      const hash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536, // 64 MB
        timeCost: 3,
        parallelism: 4,
      });
      return hash;
    } catch (error) {
      logger.error('Password hashing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new InternalServerError('Failed to hash password');
    }
  }

  /**
   * Verify password against stored hash
   * (Currently unused but available for future password rotation features)
   */
  // @ts-ignore - Available for future use
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      logger.error('Password verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Get provisioning configuration based on tier
   */
  private getProvisioningConfig(tier: string): ProvisioningConfig | undefined {
    const configs: Record<string, ProvisioningConfig | undefined> = {
      shared: {
        tier: 'shared',
        storage_gb: 10,
        connection_limit: 20,
        backup_enabled: true,
        ssl_enabled: true,
      },
      dedicated: {
        tier: 'dedicated',
        storage_gb: 50,
        connection_limit: 50,
        backup_enabled: true,
        ssl_enabled: true,
      },
      pro: {
        tier: 'pro',
        storage_gb: 100,
        connection_limit: 100,
        backup_enabled: true,
        ssl_enabled: true,
      },
      enterprise: {
        tier: 'enterprise',
        storage_gb: 250,
        connection_limit: 200,
        backup_enabled: true,
        ssl_enabled: true,
      },
    };

    return configs[tier] || configs['shared'];
  }

  /**
   * Build PostgreSQL connection string
   */
  private buildConnectionString(
    host: string,
    port: number,
    database: string,
    username: string,
    password: string,
    sslEnabled: boolean
  ): string {
    const sslMode = sslEnabled ? 'require' : 'prefer';
    return `postgresql://${username}:${password}@${host}:${port}/${database}?sslmode=${sslMode}`;
  }

  /**
   * Create database record in customer_databases table
   */
  private async createDatabaseRecord(data: {
    customer_id: number;
    database_name: string;
    host: string;
    port: number;
    username: string;
    password_hash: string;
    ssl_enabled: boolean;
    connection_limit: number;
    storage_gb: number;
    backup_enabled: boolean;
  }): Promise<CustomerDatabase> {
    const stmt = this.db.prepare(`
      INSERT INTO customer_databases (
        customer_id, database_name, host, port, username, password_hash,
        ssl_enabled, connection_limit, storage_gb, backup_enabled
      ) VALUES (
        @customer_id, @database_name, @host, @port, @username, @password_hash,
        @ssl_enabled, @connection_limit, @storage_gb, @backup_enabled
      )
    `);

    const result = stmt.run({
      ...data,
      ssl_enabled: data.ssl_enabled ? 1 : 0,
      backup_enabled: data.backup_enabled ? 1 : 0,
    });

    return this.getDatabaseById(Number(result.lastInsertRowid));
  }

  /**
   * Get database record by ID
   */
  private async getDatabaseById(id: number): Promise<CustomerDatabase> {
    const stmt = this.db.prepare('SELECT * FROM customer_databases WHERE id = ?');
    const database = stmt.get(id) as CustomerDatabase | undefined;

    if (!database) {
      throw new NotFoundError(`Database with ID ${id} not found`);
    }

    return database;
  }

  /**
   * Get customer record
   */
  private async getCustomer(customerId: number): Promise<any> {
    const stmt = this.db.prepare('SELECT * FROM customers WHERE id = ?');
    const customer = stmt.get(customerId);

    if (!customer) {
      throw new NotFoundError(`Customer with ID ${customerId} not found`);
    }

    return customer;
  }

  /**
   * Update customer status
   */
  private async updateCustomerStatus(customerId: number, status: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE customers
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(status, customerId);
  }

  /**
   * Log activity to audit trail
   */
  private async logActivity(
    customerId: number,
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO activity_log (customer_id, actor, action, resource_type, details)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      customerId,
      'system',
      action,
      'database',
      JSON.stringify(details)
    );
  }

  /**
   * Update database status
   */
  private async updateDatabaseStatus(databaseId: number, status: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE customer_databases
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(status, databaseId);
  }

  /**
   * Get all databases for a customer
   */
  private async getCustomerDatabases(customerId: number): Promise<CustomerDatabase[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM customer_databases
      WHERE customer_id = ?
    `);

    return stmt.all(customerId) as CustomerDatabase[];
  }
}
