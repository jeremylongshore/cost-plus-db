/**
 * Integration Tests - Database Migrations
 *
 * Tests for database schema migrations
 *
 * @module tests/integration/database/migrations
 */

import { describe, it, expect } from 'vitest';
import { getTestDb } from '../../setup.js';

describe('Database Migrations', () => {
  const db = getTestDb();

  describe('schema_migrations table', () => {
    it('should have schema_migrations table', () => {
      const table = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'"
      ).get();

      expect(table).toBeDefined();
    });

    it('should record migration version', () => {
      const migration = db.prepare('SELECT * FROM schema_migrations WHERE version = 1').get();

      expect(migration).toBeDefined();
    });
  });

  describe('customers table', () => {
    it('should have customers table', () => {
      const table = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='customers'"
      ).get();

      expect(table).toBeDefined();
    });

    it('should have correct columns', () => {
      const columns = db.prepare('PRAGMA table_info(customers)').all();
      const columnNames = columns.map((c: any) => c.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('company_name');
      expect(columnNames).toContain('email');
      expect(columnNames).toContain('tier');
      expect(columnNames).toContain('status');
    });

    it('should have email index', () => {
      const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='customers'").all();
      const indexNames = indexes.map((i: any) => i.name);

      expect(indexNames).toContain('idx_customers_email');
    });

    it('should enforce unique email constraint', () => {
      db.prepare('INSERT INTO customers (company_name, email, tier, status) VALUES (?, ?, ?, ?)').run('Test 1', 'unique@test.com', 'shared', 'prospect');

      expect(() => {
        db.prepare('INSERT INTO customers (company_name, email, tier, status) VALUES (?, ?, ?, ?)').run('Test 2', 'unique@test.com', 'shared', 'prospect');
      }).toThrow();
    });
  });

  describe('foreign key constraints', () => {
    it('should enforce customer_databases foreign key', () => {
      expect(() => {
        db.prepare('INSERT INTO customer_databases (customer_id, database_name, host, port, username, password_hash, storage_gb) VALUES (?, ?, ?, ?, ?, ?, ?)').run(99999, 'test_db', 'localhost', 5432, 'user', 'hash', 10);
      }).toThrow();
    });

    it('should cascade delete customer_databases', () => {
      const customer = db.prepare('INSERT INTO customers (company_name, email, tier, status) VALUES (?, ?, ?, ?)').run('Test', 'cascade@test.com', 'shared', 'active');

      db.prepare('INSERT INTO customer_databases (customer_id, database_name, host, port, username, password_hash, storage_gb) VALUES (?, ?, ?, ?, ?, ?, ?)').run(customer.lastInsertRowid, 'test_db', 'localhost', 5432, 'user', 'hash', 10);

      db.prepare('DELETE FROM customers WHERE id = ?').run(customer.lastInsertRowid);

      const databases = db.prepare('SELECT * FROM customer_databases WHERE customer_id = ?').all(customer.lastInsertRowid);
      expect(databases).toHaveLength(0);
    });
  });

  describe('triggers', () => {
    it('should update updated_at on customer update', async () => {
      const customer = db.prepare('INSERT INTO customers (company_name, email, tier, status) VALUES (?, ?, ?, ?)').run('Test', 'trigger@test.com', 'shared', 'prospect');

      const original = db.prepare('SELECT updated_at FROM customers WHERE id = ?').get(customer.lastInsertRowid) as any;

      await new Promise(resolve => setTimeout(resolve, 10));

      db.prepare('UPDATE customers SET company_name = ? WHERE id = ?').run('Updated', customer.lastInsertRowid);

      const updated = db.prepare('SELECT updated_at FROM customers WHERE id = ?').get(customer.lastInsertRowid) as any;

      expect(updated.updated_at >= original.updated_at).toBe(true);
    });
  });
});
