/**
 * Test Environment Setup
 *
 * Configures the test environment for Vitest.
 * Sets up test database, mocks, and global utilities.
 *
 * @module tests/setup
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test database instance
 */
let testDb: Database.Database;

/**
 * Setup before all tests
 */
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Suppress logs during tests
  process.env.DATABASE_PATH = ':memory:';
  process.env.CORS_ORIGINS = 'http://localhost:3000';
  process.env.RATE_LIMIT_WINDOW_MS = '900000';
  process.env.RATE_LIMIT_MAX_REQUESTS = '100';

  // Create in-memory test database
  testDb = new Database(':memory:');

  // Enable foreign keys
  testDb.pragma('foreign_keys = ON');

  // Run migrations on test database
  const migrationPath = path.join(__dirname, '../src/database/migrations/001_initial_schema.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // Split by semicolons and execute each statement
  const statements = migrationSQL
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    try {
      testDb.exec(statement);
    } catch (error) {
      // Ignore errors for statements that might already be executed
      // (like INSERT INTO schema_migrations with ON CONFLICT)
    }
  }

  console.log('✓ Test environment initialized with schema');
});

/**
 * Cleanup after each test
 */
afterEach(() => {
  // Clear all tables between tests (maintain schema)
  const tables = ['activity_log', 'support_tickets', 'billing_records', 'customer_databases', 'customers'];

  for (const table of tables) {
    try {
      testDb.exec(`DELETE FROM ${table}`);
    } catch (error) {
      // Table might not exist in some tests
    }
  }

  // Reset all mocks
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

/**
 * Cleanup after all tests
 */
afterAll(() => {
  if (testDb) {
    testDb.close();
  }
  console.log('✓ Test environment cleaned up');
});

/**
 * Export test database for use in tests
 */
export function getTestDb(): Database.Database {
  if (!testDb) {
    throw new Error('Test database not initialized. Make sure to call this after beforeAll.');
  }
  return testDb;
}

/**
 * Helper function to seed test data
 */
export function seedCustomers(customers: any[]): number[] {
  const ids: number[] = [];

  for (const customer of customers) {
    const stmt = testDb.prepare(`
      INSERT INTO customers (company_name, email, tier, status, contact_name, phone, website)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      customer.company_name,
      customer.email,
      customer.tier,
      customer.status || 'prospect',
      customer.contact_name || null,
      customer.phone || null,
      customer.website || null
    );

    ids.push(Number(result.lastInsertRowid));
  }

  return ids;
}

/**
 * Helper function to clear specific table
 */
export function clearTable(tableName: string): void {
  testDb.exec(`DELETE FROM ${tableName}`);
}

/**
 * Helper function to count rows in table
 */
export function countRows(tableName: string): number {
  const result = testDb.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
  return result.count;
}
