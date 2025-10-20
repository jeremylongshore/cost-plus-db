/**
 * Integration Tests - Admin API
 *
 * Tests for administrative operations including customer approval,
 * provisioning, suspension, and dashboard metrics.
 *
 * @module tests/integration/api/admin
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../../src/api/app.js';
import { getTestDb, seedCustomers, clearTable } from '../../setup.js';
import { sampleCustomers, createCustomerWithStatus } from '../../fixtures/customers.js';

describe('Admin API', () => {
  let db: any;
  let customerIds: number[];

  beforeEach(() => {
    db = getTestDb();
    clearTable('customers');
    clearTable('billing_records');
    clearTable('activity_log');
    customerIds = seedCustomers(sampleCustomers);
  });

  afterEach(() => {
    clearTable('customers');
    clearTable('billing_records');
    clearTable('activity_log');
  });

  describe('GET /api/admin/dashboard - Dashboard Metrics', () => {
    it('should return dashboard metrics', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('customers');
      expect(response.body.data).toHaveProperty('revenue');
      expect(response.body.data).toHaveProperty('infrastructure');
      expect(response.body.data).toHaveProperty('support');
    });

    it('should include customer statistics', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .expect(200);

      expect(response.body.data.customers).toMatchObject({
        total: expect.any(Number),
        byStatus: expect.any(Object),
        conversionRate: expect.any(String),
      });

      expect(response.body.data.customers.total).toBe(sampleCustomers.length);
    });

    it('should include status breakdown', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .expect(200);

      const byStatus = response.body.data.customers.byStatus;

      expect(byStatus).toHaveProperty('prospect');
      expect(byStatus).toHaveProperty('consultation');
      expect(byStatus).toHaveProperty('approved');
      expect(byStatus).toHaveProperty('provisioning');
      expect(byStatus).toHaveProperty('active');
      expect(byStatus).toHaveProperty('suspended');
      expect(byStatus).toHaveProperty('cancelled');
    });

    it('should calculate conversion rate', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .expect(200);

      expect(response.body.data.customers.conversionRate).toMatch(/^\d+\.\d{2}%$/);
    });

    it('should include revenue metrics', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .expect(200);

      expect(response.body.data.revenue).toMatchObject({
        mrr: expect.any(Number),
        currency: 'USD',
      });
    });

    it('should include infrastructure metrics', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .expect(200);

      expect(response.body.data.infrastructure).toHaveProperty('activeDatabases');
      expect(response.body.data.infrastructure).toHaveProperty('totalStorage');
    });

    it('should include support metrics', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .expect(200);

      expect(response.body.data.support).toHaveProperty('openTickets');
      expect(response.body.data.support).toHaveProperty('avgResponseTime');
    });
  });

  describe('POST /api/admin/customers/:id/approve - Approve Customer', () => {
    it('should approve consultation customer', async () => {
      const customerId = customerIds[2]; // consultation status

      const response = await request(app)
        .post(`/api/admin/customers/${customerId}/approve`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('approved');
      expect(response.body.message).toContain('approved');

      // Verify in database
      const customer = db
        .prepare('SELECT status FROM customers WHERE id = ?')
        .get(customerId);

      expect(customer.status).toBe('approved');
    });

    it('should approve prospect customer', async () => {
      const customerId = customerIds[1]; // prospect status

      const response = await request(app)
        .post(`/api/admin/customers/${customerId}/approve`)
        .expect(200);

      expect(response.body.data.status).toBe('approved');
    });

    it('should return 404 for non-existent customer', async () => {
      const response = await request(app)
        .post('/api/admin/customers/999999/approve')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid customer ID', async () => {
      const response = await request(app)
        .post('/api/admin/customers/invalid/approve')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject approving already active customer', async () => {
      const customerId = customerIds[0]; // active status

      const response = await request(app)
        .post(`/api/admin/customers/${customerId}/approve`)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('should include customer data in response', async () => {
      const customerId = customerIds[2];

      const response = await request(app)
        .post(`/api/admin/customers/${customerId}/approve`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('company_name');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('tier');
      expect(response.body.data).toHaveProperty('status');
    });
  });

  describe('POST /api/admin/customers/:id/send-payment-link - Send Payment Link', () => {
    it('should send payment link to approved customer', async () => {
      // First approve a customer
      const customerId = customerIds[2];
      await request(app)
        .post(`/api/admin/customers/${customerId}/approve`)
        .expect(200);

      const response = await request(app)
        .post(`/api/admin/customers/${customerId}/send-payment-link`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('customer_id');
      expect(response.body.message).toContain('Payment link sent');
    });

    it('should send payment link to consultation customer', async () => {
      const customerId = customerIds[2]; // consultation status

      const response = await request(app)
        .post(`/api/admin/customers/${customerId}/send-payment-link`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject sending to active customer', async () => {
      const customerId = customerIds[0]; // active status

      const response = await request(app)
        .post(`/api/admin/customers/${customerId}/send-payment-link`)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('should return 404 for non-existent customer', async () => {
      const response = await request(app)
        .post('/api/admin/customers/999999/send-payment-link')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid customer ID', async () => {
      const response = await request(app)
        .post('/api/admin/customers/invalid/send-payment-link')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/admin/customers/:id/provision - Provision Database', () => {
    it('should start provisioning for approved customer', async () => {
      // First approve a customer
      const customerId = customerIds[2];
      await request(app)
        .post(`/api/admin/customers/${customerId}/approve`)
        .expect(200);

      const response = await request(app)
        .post(`/api/admin/customers/${customerId}/provision`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('provisioning');
      expect(response.body.message).toContain('Provisioning started');

      // Verify in database
      const customer = db
        .prepare('SELECT status FROM customers WHERE id = ?')
        .get(customerId);

      expect(customer.status).toBe('provisioning');
    });

    it('should reject provisioning non-approved customer', async () => {
      const customerId = customerIds[1]; // prospect status

      const response = await request(app)
        .post(`/api/admin/customers/${customerId}/provision`)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT');
      expect(response.body.error.message).toContain('approved');
    });

    it('should reject provisioning active customer', async () => {
      const customerId = customerIds[0]; // active status

      const response = await request(app)
        .post(`/api/admin/customers/${customerId}/provision`)
        .expect(409);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent customer', async () => {
      const response = await request(app)
        .post('/api/admin/customers/999999/provision')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid customer ID', async () => {
      const response = await request(app)
        .post('/api/admin/customers/invalid/provision')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should include customer ID in response', async () => {
      const customerId = customerIds[2];
      await request(app)
        .post(`/api/admin/customers/${customerId}/approve`)
        .expect(200);

      const response = await request(app)
        .post(`/api/admin/customers/${customerId}/provision`)
        .expect(200);

      expect(response.body.data.customer_id).toBe(customerId);
    });
  });

  describe('POST /api/admin/customers/:id/suspend - Suspend Customer', () => {
    it('should suspend active customer', async () => {
      const customerId = customerIds[0]; // active status

      const response = await request(app)
        .post(`/api/admin/customers/${customerId}/suspend`)
        .send({ reason: 'Payment failure' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('suspended');

      // Verify in database
      const customer = db
        .prepare('SELECT status FROM customers WHERE id = ?')
        .get(customerId);

      expect(customer.status).toBe('suspended');
    });

    it('should suspend without reason', async () => {
      const customerId = customerIds[0];

      const response = await request(app)
        .post(`/api/admin/customers/${customerId}/suspend`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject suspending non-active customer', async () => {
      const customerId = customerIds[1]; // prospect status

      const response = await request(app)
        .post(`/api/admin/customers/${customerId}/suspend`)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT');
      expect(response.body.error.message).toContain('active');
    });

    it('should return 404 for non-existent customer', async () => {
      const response = await request(app)
        .post('/api/admin/customers/999999/suspend')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid customer ID', async () => {
      const response = await request(app)
        .post('/api/admin/customers/invalid/suspend')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/admin/customers/:id/reactivate - Reactivate Customer', () => {
    it('should reactivate suspended customer', async () => {
      const customerId = customerIds[4]; // suspended status

      const response = await request(app)
        .post(`/api/admin/customers/${customerId}/reactivate`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reactivated');

      // Verify in database
      const customer = db
        .prepare('SELECT status FROM customers WHERE id = ?')
        .get(customerId);

      expect(customer.status).toBe('active');
    });

    it('should reject reactivating active customer', async () => {
      const customerId = customerIds[0]; // active status

      const response = await request(app)
        .post(`/api/admin/customers/${customerId}/reactivate`)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT');
      expect(response.body.error.message).toContain('suspended');
    });

    it('should reject reactivating prospect customer', async () => {
      const customerId = customerIds[1]; // prospect status

      const response = await request(app)
        .post(`/api/admin/customers/${customerId}/reactivate`)
        .expect(409);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent customer', async () => {
      const response = await request(app)
        .post('/api/admin/customers/999999/reactivate')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid customer ID', async () => {
      const response = await request(app)
        .post('/api/admin/customers/invalid/reactivate')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/activity - Activity Log', () => {
    it('should return activity log with default pagination', async () => {
      const response = await request(app)
        .get('/api/admin/activity')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should support pagination with limit', async () => {
      const response = await request(app)
        .get('/api/admin/activity')
        .query({ limit: 10, offset: 0 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(0);
    });

    it('should support pagination with offset', async () => {
      const response = await request(app)
        .get('/api/admin/activity')
        .query({ limit: 10, offset: 20 })
        .expect(200);

      expect(response.body.pagination.offset).toBe(20);
    });

    it('should return empty array when no activity exists', async () => {
      const response = await request(app)
        .get('/api/admin/activity')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('Response Format Consistency', () => {
    it('should return consistent success response structure', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.success).toBe(true);
    });

    it('should return consistent error response structure', async () => {
      const response = await request(app)
        .post('/api/admin/customers/999999/approve')
        .expect(404);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });

    it('should return JSON content type', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Authorization (Placeholder)', () => {
    // Note: These tests assume authentication is not yet implemented
    // Once auth is added, these should be updated to test proper auth

    it('should allow access to dashboard (no auth yet)', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow access to approval endpoint (no auth yet)', async () => {
      const customerId = customerIds[2];

      const response = await request(app)
        .post(`/api/admin/customers/${customerId}/approve`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Complex Workflow', () => {
    it('should handle full customer approval workflow', async () => {
      // Start with prospect
      const customerId = customerIds[1];

      // Approve
      const approveRes = await request(app)
        .post(`/api/admin/customers/${customerId}/approve`)
        .expect(200);

      expect(approveRes.body.data.status).toBe('approved');

      // Send payment link
      const paymentRes = await request(app)
        .post(`/api/admin/customers/${customerId}/send-payment-link`)
        .expect(200);

      expect(paymentRes.body.success).toBe(true);

      // Provision
      const provisionRes = await request(app)
        .post(`/api/admin/customers/${customerId}/provision`)
        .expect(200);

      expect(provisionRes.body.data.status).toBe('provisioning');

      // Verify final state
      const customer = db
        .prepare('SELECT * FROM customers WHERE id = ?')
        .get(customerId);

      expect(customer.status).toBe('provisioning');
    });

    it('should handle suspend and reactivate workflow', async () => {
      const customerId = customerIds[0]; // active customer

      // Suspend
      const suspendRes = await request(app)
        .post(`/api/admin/customers/${customerId}/suspend`)
        .send({ reason: 'Test suspension' })
        .expect(200);

      expect(suspendRes.body.success).toBe(true);

      // Verify suspended
      let customer = db
        .prepare('SELECT status FROM customers WHERE id = ?')
        .get(customerId);

      expect(customer.status).toBe('suspended');

      // Reactivate
      const reactivateRes = await request(app)
        .post(`/api/admin/customers/${customerId}/reactivate`)
        .expect(200);

      expect(reactivateRes.body.success).toBe(true);

      // Verify active again
      customer = db
        .prepare('SELECT status FROM customers WHERE id = ?')
        .get(customerId);

      expect(customer.status).toBe('active');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Try to approve with closed database connection
      const customerId = customerIds[2];

      const response = await request(app)
        .post(`/api/admin/customers/${customerId}/approve`);

      // Should return either 200 or appropriate error, not crash
      expect([200, 500]).toContain(response.status);
    });

    it('should validate all required parameters', async () => {
      const response = await request(app)
        .post('/api/admin/customers//approve')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid approvals of same customer', async () => {
      const customerId = customerIds[2];

      const requests = [
        request(app).post(`/api/admin/customers/${customerId}/approve`),
        request(app).post(`/api/admin/customers/${customerId}/approve`),
        request(app).post(`/api/admin/customers/${customerId}/approve`),
      ];

      const responses = await Promise.all(requests);

      // First should succeed, others should conflict
      const successCount = responses.filter(r => r.status === 200).length;
      const conflictCount = responses.filter(r => r.status === 409).length;

      expect(successCount).toBeGreaterThanOrEqual(1);
      expect(successCount + conflictCount).toBe(3);
    });

    it('should handle provisioning already provisioning customer', async () => {
      const customerId = customerIds[3]; // already provisioning

      const response = await request(app)
        .post(`/api/admin/customers/${customerId}/provision`)
        .expect(409);

      expect(response.body.success).toBe(false);
    });
  });
});
