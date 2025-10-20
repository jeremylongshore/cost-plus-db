/**
 * Integration Tests - Database Repositories
 *
 * Tests all repository methods with real database
 *
 * @module tests/integration/database/repositories
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CustomersRepository } from '../../../src/database/repositories/customers.repository.js';
import { getTestDb } from '../../setup.js';

describe('Database Repositories Integration', () => {
  let repo: CustomersRepository;
  let db: any;

  beforeEach(() => {
    db = getTestDb();
    repo = new CustomersRepository(db);
  });

  describe('transaction handling', () => {
    it('should rollback on error', () => {
      db.prepare('BEGIN').run();

      try {
        repo.create({
          company_name: 'Test',
          email: 'test1@example.com',
          tier: 'shared',
          status: 'prospect',
          contact_name: null,
          phone: null,
          website: null,
        });

        // Force error
        throw new Error('Test error');
      } catch (error) {
        db.prepare('ROLLBACK').run();
      }

      const count = db.prepare('SELECT COUNT(*) as count FROM customers').get();
      expect(count.count).toBe(0);
    });

    it('should commit on success', async () => {
      db.prepare('BEGIN').run();

      await repo.create({
        company_name: 'Test',
        email: 'commit@example.com',
        tier: 'shared',
        status: 'prospect',
        contact_name: null,
        phone: null,
        website: null,
      });

      db.prepare('COMMIT').run();

      const count = db.prepare('SELECT COUNT(*) as count FROM customers').get();
      expect(count.count).toBe(1);
    });
  });

  describe('concurrent updates', () => {
    it('should handle concurrent customer creation', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          repo.create({
            company_name: `Concurrent ${i}`,
            email: `concurrent${i}@example.com`,
            tier: 'shared',
            status: 'prospect',
            contact_name: null,
            phone: null,
            website: null,
          })
        );
      }

      await Promise.all(promises);

      const count = await repo.count();
      expect(count).toBe(10);
    });

    it('should handle concurrent updates to same customer', async () => {
      const customer = await repo.create({
        company_name: 'Test',
        email: 'concurrent-update@example.com',
        tier: 'shared',
        status: 'prospect',
        contact_name: null,
        phone: null,
        website: null,
      });

      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          repo.update(customer.id, {
            company_name: `Updated ${i}`,
          })
        );
      }

      await Promise.all(promises);

      const updated = await repo.findById(customer.id);
      expect(updated.company_name).toContain('Updated');
    });
  });

  describe('cascading deletes', () => {
    it('should cascade delete to billing_records', async () => {
      const customer = await repo.create({
        company_name: 'Test',
        email: 'cascade-billing@example.com',
        tier: 'shared',
        status: 'active',
        contact_name: null,
        phone: null,
        website: null,
      });

      db.prepare(
        'INSERT INTO billing_records (customer_id, amount, currency, status, billing_period_start, billing_period_end) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(customer.id, 4900, 'USD', 'paid', '2024-01-01', '2024-02-01');

      await repo.delete(customer.id);

      const records = db
        .prepare('SELECT * FROM billing_records WHERE customer_id = ?')
        .all(customer.id);
      expect(records).toHaveLength(0);
    });

    it('should cascade delete to customer_databases', async () => {
      const customer = await repo.create({
        company_name: 'Test',
        email: 'cascade-db@example.com',
        tier: 'dedicated',
        status: 'active',
        contact_name: null,
        phone: null,
        website: null,
      });

      db.prepare(
        'INSERT INTO customer_databases (customer_id, database_name, host, port, username, password_hash, storage_gb) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(customer.id, 'test_db', 'localhost', 5432, 'user', 'hash', 50);

      await repo.delete(customer.id);

      const databases = db
        .prepare('SELECT * FROM customer_databases WHERE customer_id = ?')
        .all(customer.id);
      expect(databases).toHaveLength(0);
    });
  });

  describe('complex queries', () => {
    it('should filter and paginate', async () => {
      for (let i = 0; i < 10; i++) {
        await repo.create({
          company_name: `Company ${i}`,
          email: `query${i}@example.com`,
          tier: i % 2 === 0 ? 'shared' : 'dedicated',
          status: i < 5 ? 'active' : 'prospect',
          contact_name: null,
          phone: null,
          website: null,
        });
      }

      const results = await repo.list({
        status: 'active',
        tier: 'shared',
        limit: 2,
        offset: 0,
      });

      expect(results.length).toBeLessThanOrEqual(2);
      expect(results.every((c) => c.status === 'active' && c.tier === 'shared')).toBe(true);
    });
  });
});
