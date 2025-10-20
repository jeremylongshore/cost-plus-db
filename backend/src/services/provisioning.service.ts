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
import Database from 'better-sqlite3';
import { CustomerDatabase } from '../database/schema.js';
import { NotFoundError, InternalServerError, ExternalServiceError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

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
   * Call provisioning script on VPS via SSH
   * TODO: Implement actual SSH connection and script execution
   */
  private async callProvisioningScript(
    databaseName: string,
    username: string,
    _password: string,
    _config: ProvisioningConfig
  ): Promise<VPSProvisioningResponse> {
    // TODO: Replace with actual SSH execution
    // const { Client } = require('ssh2');
    // Execute: /opt/costplusdb/scripts/provision-customer-database.sh

    logger.warn('TODO: SSH provisioning script execution not implemented');

    // Mock response for now
    return {
      success: true,
      database_name: databaseName,
      host: 'db1.costplusdb.com',
      port: 5432,
      username: username,
      message: 'Database provisioned successfully (mock)',
    };
  }

  /**
   * Configure pgBackRest backups for the database
   * TODO: Implement actual pgBackRest configuration
   */
  private async configureBackups(
    databaseName: string,
    _host: string
  ): Promise<BackupConfigResult> {
    // TODO: Execute pgBackRest configuration script
    // - Create stanza
    // - Configure Wasabi S3 repository
    // - Schedule automated backups

    logger.warn('TODO: pgBackRest configuration not implemented');

    // Mock response
    return {
      success: true,
      repo_name: 'wasabi-s3-repo',
      stanza_name: databaseName,
    };
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
   * Hash password for storage
   * TODO: Use proper password hashing (bcrypt/argon2)
   */
  private async hashPassword(password: string): Promise<string> {
    // TODO: Replace with bcrypt or argon2
    // const bcrypt = require('bcrypt');
    // return bcrypt.hash(password, 10);

    logger.warn('TODO: Using mock password hashing', { passwordLength: password.length });
    return `hashed_${password}`;
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
}
