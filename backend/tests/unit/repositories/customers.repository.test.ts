/**
 * Unit Tests - Customers Repository
 *
 * Tests for database operations on customers table:
 * - CRUD operations
 * - Queries and filters
 * - Constraints and validation
 *
 * @module tests/unit/repositories/customers.repository
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CustomersRepository } from '../../../src/database/repositories/customers.repository.js';
import { NotFoundError } from '../../../src/utils/errors.js';
import { getTestDb, seedCustomers } from '../../setup.js';
import { sampleCustomers } from '../../fixtures/customers.js';

describe('CustomersRepository', () => {
  let repo: CustomersRepository;

  beforeEach(() => {
    repo = new CustomersRepository(getTestDb());
  });

  describe('create', () => {
    it('should create a new customer', async () => {
      const customer = await repo.create({
        company_name: 'Test Company',
        email: 'test@example.com',
        tier: 'dedicated',
        status: 'prospect',
        contact_name: 'John Doe',
        phone: '+1-555-1234',
        website: 'https://test.com',
      });

      expect(customer.id).toBeDefined();
      expect(customer.company_name).toBe('Test Company');
      expect(customer.email).toBe('test@example.com');
      expect(customer.tier).toBe('dedicated');
      expect(customer.status).toBe('prospect');
      expect(customer.created_at).toBeDefined();
      expect(customer.updated_at).toBeDefined();
    });

    it('should create customer with null optional fields', async () => {
      const customer = await repo.create({
        company_name: 'Minimal Company',
        email: 'minimal@example.com',
        tier: 'shared',
        status: 'prospect',
        contact_name: null,
        phone: null,
        website: null,
      });

      expect(customer.contact_name).toBeNull();
      expect(customer.phone).toBeNull();
      expect(customer.website).toBeNull();
    });

    it('should enforce unique email constraint', async () => {
      await repo.create({
        company_name: 'Company A',
        email: 'duplicate@example.com',
        tier: 'shared',
        status: 'prospect',
        contact_name: null,
        phone: null,
        website: null,
      });

      await expect(
        repo.create({
          company_name: 'Company B',
          email: 'duplicate@example.com',
          tier: 'dedicated',
          status: 'prospect',
          contact_name: null,
          phone: null,
          website: null,
        })
      ).rejects.toThrow();
    });

    it('should auto-generate timestamps', async () => {
      const before = new Date().toISOString();
      const customer = await repo.create({
        company_name: 'Test Company',
        email: 'test@example.com',
        tier: 'shared',
        status: 'prospect',
        contact_name: null,
        phone: null,
        website: null,
      });
      const after = new Date().toISOString();

      expect(customer.created_at).toBeDefined();
      expect(customer.updated_at).toBeDefined();
      expect(customer.created_at >= before).toBe(true);
      expect(customer.created_at <= after).toBe(true);
    });
  });

  describe('findById', () => {
    it('should find customer by ID', async () => {
      const created = await repo.create({
        company_name: 'Test Company',
        email: 'test@example.com',
        tier: 'dedicated',
        status: 'prospect',
        contact_name: null,
        phone: null,
        website: null,
      });

      const found = await repo.findById(created.id);

      expect(found).toMatchObject({
        id: created.id,
        company_name: 'Test Company',
        email: 'test@example.com',
      });
    });

    it('should throw NotFoundError for non-existent ID', async () => {
      await expect(repo.findById(99999)).rejects.toThrow(NotFoundError);
      await expect(repo.findById(99999)).rejects.toThrow('Customer with ID 99999 not found');
    });
  });

  describe('findByEmail', () => {
    it('should find customer by email', async () => {
      await repo.create({
        company_name: 'Test Company',
        email: 'unique@example.com',
        tier: 'dedicated',
        status: 'prospect',
        contact_name: null,
        phone: null,
        website: null,
      });

      const found = await repo.findByEmail('unique@example.com');

      expect(found).not.toBeNull();
      expect(found?.email).toBe('unique@example.com');
    });

    it('should return null for non-existent email', async () => {
      const found = await repo.findByEmail('nonexistent@example.com');

      expect(found).toBeNull();
    });

    it('should be case-sensitive', async () => {
      await repo.create({
        company_name: 'Test Company',
        email: 'test@example.com',
        tier: 'shared',
        status: 'prospect',
        contact_name: null,
        phone: null,
        website: null,
      });

      const found = await repo.findByEmail('TEST@EXAMPLE.COM');

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update customer fields', async () => {
      const customer = await repo.create({
        company_name: 'Old Name',
        email: 'test@example.com',
        tier: 'shared',
        status: 'prospect',
        contact_name: null,
        phone: null,
        website: null,
      });

      const updated = await repo.update(customer.id, {
        company_name: 'New Name',
        contact_name: 'John Doe',
      });

      expect(updated.company_name).toBe('New Name');
      expect(updated.contact_name).toBe('John Doe');
      expect(updated.email).toBe('test@example.com'); // Unchanged
    });

    it('should update updated_at timestamp', async () => {
      const customer = await repo.create({
        company_name: 'Test Company',
        email: 'test@example.com',
        tier: 'shared',
        status: 'prospect',
        contact_name: null,
        phone: null,
        website: null,
      });

      const originalUpdatedAt = customer.updated_at;

      // Wait a moment to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await repo.update(customer.id, {
        company_name: 'Updated Name',
      });

      expect(updated.updated_at >= originalUpdatedAt).toBe(true);
    });

    it('should return unchanged customer when no fields provided', async () => {
      const customer = await repo.create({
        company_name: 'Test Company',
        email: 'test@example.com',
        tier: 'shared',
        status: 'prospect',
        contact_name: null,
        phone: null,
        website: null,
      });

      const updated = await repo.update(customer.id, {});

      expect(updated).toMatchObject({
        id: customer.id,
        company_name: customer.company_name,
        email: customer.email,
      });
    });
  });

  describe('updateStatus', () => {
    it('should update customer status', async () => {
      const customer = await repo.create({
        company_name: 'Test Company',
        email: 'test@example.com',
        tier: 'shared',
        status: 'prospect',
        contact_name: null,
        phone: null,
        website: null,
      });

      await repo.updateStatus(customer.id, 'active');

      const updated = await repo.findById(customer.id);
      expect(updated.status).toBe('active');
    });

    it('should update through all status transitions', async () => {
      const customer = await repo.create({
        company_name: 'Test Company',
        email: 'test@example.com',
        tier: 'shared',
        status: 'prospect',
        contact_name: null,
        phone: null,
        website: null,
      });

      const statuses: Array<'consultation' | 'approved' | 'provisioning' | 'active' | 'suspended'> = [
        'consultation',
        'approved',
        'provisioning',
        'active',
        'suspended',
      ];

      for (const status of statuses) {
        await repo.updateStatus(customer.id, status);
        const updated = await repo.findById(customer.id);
        expect(updated.status).toBe(status);
      }
    });
  });

  describe('delete', () => {
    it('should delete customer', async () => {
      const customer = await repo.create({
        company_name: 'Test Company',
        email: 'test@example.com',
        tier: 'shared',
        status: 'prospect',
        contact_name: null,
        phone: null,
        website: null,
      });

      await repo.delete(customer.id);

      await expect(repo.findById(customer.id)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when deleting non-existent customer', async () => {
      await expect(repo.delete(99999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('list', () => {
    beforeEach(() => {
      seedCustomers(sampleCustomers);
    });

    it('should list all customers', async () => {
      const customers = await repo.list();

      expect(customers.length).toBe(sampleCustomers.length);
    });

    it('should filter by status', async () => {
      const customers = await repo.list({ status: 'active' });

      expect(customers.every((c) => c.status === 'active')).toBe(true);
    });

    it('should filter by tier', async () => {
      const customers = await repo.list({ tier: 'dedicated' });

      expect(customers.every((c) => c.tier === 'dedicated')).toBe(true);
    });

    it('should limit results', async () => {
      const customers = await repo.list({ limit: 2 });

      expect(customers).toHaveLength(2);
    });

    it('should offset results', async () => {
      const page1 = await repo.list({ limit: 2, offset: 0 });
      const page2 = await repo.list({ limit: 2, offset: 2 });

      expect(page1[0].id).not.toBe(page2[0].id);
    });

    it('should order by created_at DESC', async () => {
      const customers = await repo.list();

      for (let i = 0; i < customers.length - 1; i++) {
        expect(customers[i].created_at >= customers[i + 1].created_at).toBe(true);
      }
    });

    it('should combine filters', async () => {
      const customers = await repo.list({
        status: 'active',
        tier: 'dedicated',
        limit: 1,
      });

      expect(customers.length).toBeLessThanOrEqual(1);
      if (customers.length > 0) {
        expect(customers[0].status).toBe('active');
        expect(customers[0].tier).toBe('dedicated');
      }
    });
  });

  describe('count', () => {
    beforeEach(() => {
      seedCustomers(sampleCustomers);
    });

    it('should count all customers', async () => {
      const count = await repo.count();

      expect(count).toBe(sampleCustomers.length);
    });

    it('should count by status', async () => {
      const count = await repo.count('active');

      const activeCustomers = sampleCustomers.filter((c) => c.status === 'active');
      expect(count).toBe(activeCustomers.length);
    });

    it('should return 0 for empty table', async () => {
      getTestDb().exec('DELETE FROM customers');

      const count = await repo.count();

      expect(count).toBe(0);
    });
  });

  describe('existsByEmail', () => {
    it('should return true for existing email', async () => {
      await repo.create({
        company_name: 'Test Company',
        email: 'exists@example.com',
        tier: 'shared',
        status: 'prospect',
        contact_name: null,
        phone: null,
        website: null,
      });

      const exists = await repo.existsByEmail('exists@example.com');

      expect(exists).toBe(true);
    });

    it('should return false for non-existent email', async () => {
      const exists = await repo.existsByEmail('nonexistent@example.com');

      expect(exists).toBe(false);
    });
  });
});
