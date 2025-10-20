/**
 * Integration Tests - Customers API
 *
 * Tests for customer management endpoints including listing, retrieval,
 * updates, deletion, search, and filtering.
 *
 * @module tests/integration/api/customers
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../../src/api/app.js';
import { getTestDb, seedCustomers, clearTable } from '../../setup.js';
import { sampleCustomers } from '../../fixtures/customers.js';

describe('Customers API', () => {
  let db: any;
  let customerIds: number[];

  beforeEach(() => {
    db = getTestDb();
    clearTable('customers');
    customerIds = seedCustomers(sampleCustomers);
  });

  afterEach(() => {
    clearTable('customers');
  });

  describe('GET /api/customers - List Customers', () => {
    it('should list all customers with default pagination', async () => {
      const response = await request(app)
        .get('/api/customers')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(sampleCustomers.length);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should return pagination metadata', async () => {
      const response = await request(app)
        .get('/api/customers')
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        page: expect.any(Number),
        limit: expect.any(Number),
        total: expect.any(Number),
        totalPages: expect.any(Number),
        hasNextPage: expect.any(Boolean),
        hasPrevPage: expect.any(Boolean),
      });
    });

    it('should paginate results with limit', async () => {
      const response = await request(app)
        .get('/api/customers')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.hasNextPage).toBe(true);
    });

    it('should support page navigation', async () => {
      const page1 = await request(app)
        .get('/api/customers')
        .query({ page: 1, limit: 2 })
        .expect(200);

      const page2 = await request(app)
        .get('/api/customers')
        .query({ page: 2, limit: 2 })
        .expect(200);

      expect(page1.body.data[0].id).not.toBe(page2.body.data[0].id);
      expect(page1.body.pagination.hasPrevPage).toBe(false);
      expect(page2.body.pagination.hasPrevPage).toBe(true);
    });

    it('should return empty array for page beyond total', async () => {
      const response = await request(app)
        .get('/api/customers')
        .query({ page: 999, limit: 10 })
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('should include customer details in list', async () => {
      const response = await request(app)
        .get('/api/customers')
        .expect(200);

      const customer = response.body.data[0];

      expect(customer).toHaveProperty('id');
      expect(customer).toHaveProperty('company_name');
      expect(customer).toHaveProperty('email');
      expect(customer).toHaveProperty('tier');
      expect(customer).toHaveProperty('status');
      expect(customer).toHaveProperty('created_at');
      expect(customer).toHaveProperty('updated_at');
    });
  });

  describe('GET /api/customers?status - Filter by Status', () => {
    it('should filter customers by status=active', async () => {
      const response = await request(app)
        .get('/api/customers')
        .query({ status: 'active' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((c: any) => c.status === 'active')).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter customers by status=prospect', async () => {
      const response = await request(app)
        .get('/api/customers')
        .query({ status: 'prospect' })
        .expect(200);

      expect(response.body.data.every((c: any) => c.status === 'prospect')).toBe(true);
    });

    it('should filter customers by status=consultation', async () => {
      const response = await request(app)
        .get('/api/customers')
        .query({ status: 'consultation' })
        .expect(200);

      expect(response.body.data.every((c: any) => c.status === 'consultation')).toBe(true);
    });

    it('should filter customers by status=provisioning', async () => {
      const response = await request(app)
        .get('/api/customers')
        .query({ status: 'provisioning' })
        .expect(200);

      expect(response.body.data.every((c: any) => c.status === 'provisioning')).toBe(true);
    });

    it('should filter customers by status=suspended', async () => {
      const response = await request(app)
        .get('/api/customers')
        .query({ status: 'suspended' })
        .expect(200);

      expect(response.body.data.every((c: any) => c.status === 'suspended')).toBe(true);
    });

    it('should return empty array for status with no customers', async () => {
      const response = await request(app)
        .get('/api/customers')
        .query({ status: 'cancelled' })
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('should reject invalid status values', async () => {
      const response = await request(app)
        .get('/api/customers')
        .query({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/customers?tier - Filter by Tier', () => {
    it('should filter customers by tier=shared', async () => {
      const response = await request(app)
        .get('/api/customers')
        .query({ tier: 'shared' })
        .expect(200);

      expect(response.body.data.every((c: any) => c.tier === 'shared')).toBe(true);
    });

    it('should filter customers by tier=dedicated', async () => {
      const response = await request(app)
        .get('/api/customers')
        .query({ tier: 'dedicated' })
        .expect(200);

      expect(response.body.data.every((c: any) => c.tier === 'dedicated')).toBe(true);
    });

    it('should filter customers by tier=pro', async () => {
      const response = await request(app)
        .get('/api/customers')
        .query({ tier: 'pro' })
        .expect(200);

      expect(response.body.data.every((c: any) => c.tier === 'pro')).toBe(true);
    });

    it('should filter customers by tier=enterprise', async () => {
      const response = await request(app)
        .get('/api/customers')
        .query({ tier: 'enterprise' })
        .expect(200);

      expect(response.body.data.every((c: any) => c.tier === 'enterprise')).toBe(true);
    });
  });

  describe('GET /api/customers/:id - Get Customer by ID', () => {
    it('should get customer by valid ID', async () => {
      const customerId = customerIds[0];

      const response = await request(app)
        .get(`/api/customers/${customerId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: customerId,
        company_name: expect.any(String),
        email: expect.any(String),
        tier: expect.any(String),
        status: expect.any(String),
      });
    });

    it('should return 404 for non-existent customer ID', async () => {
      const response = await request(app)
        .get('/api/customers/999999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('not found');
    });

    it('should return 400 for invalid customer ID format', async () => {
      const response = await request(app)
        .get('/api/customers/not-a-number')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should include all customer fields', async () => {
      const customerId = customerIds[0];

      const response = await request(app)
        .get(`/api/customers/${customerId}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('company_name');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('tier');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('contact_name');
      expect(response.body.data).toHaveProperty('phone');
      expect(response.body.data).toHaveProperty('website');
      expect(response.body.data).toHaveProperty('created_at');
      expect(response.body.data).toHaveProperty('updated_at');
    });
  });

  describe('PATCH /api/customers/:id - Update Customer', () => {
    it('should update customer company name', async () => {
      const customerId = customerIds[0];

      const response = await request(app)
        .patch(`/api/customers/${customerId}`)
        .send({ company_name: 'Updated Company Name' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.company_name).toBe('Updated Company Name');

      // Verify in database
      const customer = db
        .prepare('SELECT * FROM customers WHERE id = ?')
        .get(customerId);

      expect(customer.company_name).toBe('Updated Company Name');
    });

    it('should update customer tier', async () => {
      const customerId = customerIds[0];

      const response = await request(app)
        .patch(`/api/customers/${customerId}`)
        .send({ tier: 'enterprise' })
        .expect(200);

      expect(response.body.data.tier).toBe('enterprise');
    });

    it('should update customer status', async () => {
      const customerId = customerIds[1]; // prospect status

      const response = await request(app)
        .patch(`/api/customers/${customerId}`)
        .send({ status: 'consultation' })
        .expect(200);

      expect(response.body.data.status).toBe('consultation');
    });

    it('should update multiple fields at once', async () => {
      const customerId = customerIds[0];

      const response = await request(app)
        .patch(`/api/customers/${customerId}`)
        .send({
          company_name: 'Multi Update Corp',
          phone: '+1-555-8888',
          website: 'https://multiupdate.com',
        })
        .expect(200);

      expect(response.body.data.company_name).toBe('Multi Update Corp');
      expect(response.body.data.phone).toBe('+1-555-8888');
      expect(response.body.data.website).toBe('https://multiupdate.com');
    });

    it('should update updated_at timestamp', async () => {
      const customerId = customerIds[0];

      const before = db
        .prepare('SELECT updated_at FROM customers WHERE id = ?')
        .get(customerId);

      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await request(app)
        .patch(`/api/customers/${customerId}`)
        .send({ company_name: 'Timestamp Test' })
        .expect(200);

      const after = db
        .prepare('SELECT updated_at FROM customers WHERE id = ?')
        .get(customerId);

      expect(after.updated_at).not.toBe(before.updated_at);
    });

    it('should return 404 for non-existent customer', async () => {
      const response = await request(app)
        .patch('/api/customers/999999')
        .send({ company_name: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should validate updated fields', async () => {
      const customerId = customerIds[0];

      const response = await request(app)
        .patch(`/api/customers/${customerId}`)
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid tier in update', async () => {
      const customerId = customerIds[0];

      const response = await request(app)
        .patch(`/api/customers/${customerId}`)
        .send({ tier: 'invalid-tier' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid status transitions', async () => {
      const customerId = customerIds[0]; // active customer

      const response = await request(app)
        .patch(`/api/customers/${customerId}`)
        .send({ status: 'prospect' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('transition');
    });
  });

  describe('DELETE /api/customers/:id - Delete Customer', () => {
    it('should delete prospect customer', async () => {
      const customerId = customerIds[1]; // prospect status

      await request(app)
        .delete(`/api/customers/${customerId}`)
        .expect(200);

      // Verify deletion
      await request(app)
        .get(`/api/customers/${customerId}`)
        .expect(404);
    });

    it('should prevent deleting active customer', async () => {
      const customerId = customerIds[0]; // active status

      const response = await request(app)
        .delete(`/api/customers/${customerId}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toContain('active');
    });

    it('should return 404 for non-existent customer', async () => {
      const response = await request(app)
        .delete('/api/customers/999999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should delete customer from database', async () => {
      const customerId = customerIds[1];

      await request(app)
        .delete(`/api/customers/${customerId}`)
        .expect(200);

      const customer = db
        .prepare('SELECT * FROM customers WHERE id = ?')
        .get(customerId);

      expect(customer).toBeUndefined();
    });

    it('should allow deleting consultation status customer', async () => {
      const customerId = customerIds[2]; // consultation status

      await request(app)
        .delete(`/api/customers/${customerId}`)
        .expect(200);
    });

    it('should allow deleting suspended customer', async () => {
      const customerId = customerIds[4]; // suspended status

      await request(app)
        .delete(`/api/customers/${customerId}`)
        .expect(200);
    });
  });

  describe('GET /api/customers/search - Search Customers', () => {
    it('should search customers by email', async () => {
      const email = sampleCustomers[0].email;

      const response = await request(app)
        .get('/api/customers/search')
        .query({ q: email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].email).toBe(email);
    });

    it('should return empty results for non-matching search', async () => {
      const response = await request(app)
        .get('/api/customers/search')
        .query({ q: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('should reject search query that is too short', async () => {
      const response = await request(app)
        .get('/api/customers/search')
        .query({ q: 'a' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('2 characters');
    });

    it('should reject missing search query', async () => {
      const response = await request(app)
        .get('/api/customers/search')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle special characters in search', async () => {
      const response = await request(app)
        .get('/api/customers/search')
        .query({ q: 'test@' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/customers/stats - Customer Statistics', () => {
    it('should return customer statistics', async () => {
      const response = await request(app)
        .get('/api/customers/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('byStatus');
      expect(response.body.data.total).toBe(sampleCustomers.length);
    });

    it('should include status breakdown', async () => {
      const response = await request(app)
        .get('/api/customers/stats')
        .expect(200);

      expect(response.body.data.byStatus).toHaveProperty('active');
      expect(response.body.data.byStatus).toHaveProperty('prospect');
      expect(response.body.data.byStatus).toHaveProperty('consultation');
      expect(response.body.data.byStatus).toHaveProperty('provisioning');
      expect(response.body.data.byStatus).toHaveProperty('suspended');
    });

    it('should count customers accurately', async () => {
      const response = await request(app)
        .get('/api/customers/stats')
        .expect(200);

      const activeCount = sampleCustomers.filter(c => c.status === 'active').length;
      expect(response.body.data.byStatus.active).toBe(activeCount);
    });
  });

  describe('Response Format Consistency', () => {
    it('should return consistent success response for list', async () => {
      const response = await request(app)
        .get('/api/customers')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.success).toBe(true);
    });

    it('should return consistent success response for get', async () => {
      const customerId = customerIds[0];

      const response = await request(app)
        .get(`/api/customers/${customerId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.success).toBe(true);
    });

    it('should return consistent error response', async () => {
      const response = await request(app)
        .get('/api/customers/999999')
        .expect(404);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });

    it('should return JSON content type', async () => {
      const response = await request(app)
        .get('/api/customers');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Combined Filters', () => {
    it('should combine status and tier filters', async () => {
      const response = await request(app)
        .get('/api/customers')
        .query({ status: 'active', tier: 'dedicated' })
        .expect(200);

      expect(response.body.data.every((c: any) =>
        c.status === 'active' && c.tier === 'dedicated'
      )).toBe(true);
    });

    it('should combine filters with pagination', async () => {
      const response = await request(app)
        .get('/api/customers')
        .query({ status: 'active', page: 1, limit: 10 })
        .expect(200);

      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.data.every((c: any) => c.status === 'active')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty database gracefully', async () => {
      clearTable('customers');

      const response = await request(app)
        .get('/api/customers')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should handle negative page numbers', async () => {
      const response = await request(app)
        .get('/api/customers')
        .query({ page: -1 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle excessively large limit', async () => {
      const response = await request(app)
        .get('/api/customers')
        .query({ limit: 10000 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle zero limit', async () => {
      const response = await request(app)
        .get('/api/customers')
        .query({ limit: 0 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
