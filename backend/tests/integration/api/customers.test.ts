/**
 * Integration Tests - Customers API
 *
 * Tests for customer management endpoints
 *
 * @module tests/integration/api/customers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../../src/api/app.js';
import { getTestDb, seedCustomers } from '../../setup.js';
import { sampleCustomers } from '../../fixtures/customers.js';

describe('Customers API', () => {
  beforeEach(() => {
    seedCustomers(sampleCustomers);
  });

  describe('GET /api/customers', () => {
    it('should list all customers', async () => {
      const response = await request(app).get('/api/customers').expect(200);

      expect(response.body.data.customers).toHaveLength(sampleCustomers.length);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/customers')
        .query({ status: 'active' })
        .expect(200);

      expect(response.body.data.customers.every((c: any) => c.status === 'active')).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/customers')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.data.customers).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
    });
  });

  describe('GET /api/customers/:id', () => {
    it('should get customer by ID', async () => {
      const response = await request(app).get('/api/customers/1').expect(200);

      expect(response.body.data).toMatchObject({
        id: 1,
        company_name: expect.any(String),
        email: expect.any(String),
      });
    });

    it('should return 404 for non-existent customer', async () => {
      await request(app).get('/api/customers/99999').expect(404);
    });
  });

  describe('PUT /api/customers/:id', () => {
    it('should update customer', async () => {
      const response = await request(app)
        .put('/api/customers/1')
        .send({ company_name: 'Updated Name' })
        .expect(200);

      expect(response.body.data.company_name).toBe('Updated Name');
    });

    it('should return 404 for non-existent customer', async () => {
      await request(app)
        .put('/api/customers/99999')
        .send({ company_name: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /api/customers/:id', () => {
    it('should delete customer', async () => {
      await request(app).delete('/api/customers/1').expect(200);

      await request(app).get('/api/customers/1').expect(404);
    });

    it('should return 404 for non-existent customer', async () => {
      await request(app).delete('/api/customers/99999').expect(404);
    });
  });
});
