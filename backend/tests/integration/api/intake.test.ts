/**
 * Integration Tests - Intake API
 *
 * Tests for customer intake form submission endpoint:
 * - Valid form submission
 * - Validation errors
 * - Duplicate submissions
 * - Rate limiting
 *
 * @module tests/integration/api/intake
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../../src/api/app.js';
import { getTestDb } from '../../setup.js';
import { sampleIntakeForms, invalidIntakeForms } from '../../fixtures/customers.js';

describe('POST /api/intake', () => {
  let db: any;

  beforeAll(() => {
    db = getTestDb();
  });

  describe('valid form submission', () => {
    it('should accept valid intake form', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send(sampleIntakeForms[0])
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          customer_id: expect.any(Number),
          status: 'prospect',
          next_step: 'consultation',
        },
      });
    });

    it('should create customer in database', async () => {
      const formData = {
        company_name: 'New Test Company',
        email: 'newtest@example.com',
        tier: 'shared',
        contact_name: 'Test User',
        phone: '+1-555-1234',
        website: 'https://test.com',
      };

      const response = await request(app)
        .post('/api/intake')
        .send(formData)
        .expect(200);

      const customerId = response.body.data.customer_id;

      // Verify in database
      const customer = db
        .prepare('SELECT * FROM customers WHERE id = ?')
        .get(customerId);

      expect(customer).toBeDefined();
      expect(customer.email).toBe(formData.email);
      expect(customer.company_name).toBe(formData.company_name);
    });

    it('should accept all pricing tiers', async () => {
      const tiers = ['shared', 'dedicated', 'pro', 'enterprise'];

      for (const tier of tiers) {
        const response = await request(app)
          .post('/api/intake')
          .send({
            company_name: `Test ${tier}`,
            email: `test-${tier}@example.com`,
            tier,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    it('should accept form with all optional fields', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: 'Full Form Company',
          email: 'fullform@example.com',
          tier: 'pro',
          contact_name: 'John Doe',
          phone: '+1-555-9999',
          website: 'https://fullform.com',
          business_description: 'SaaS platform',
          expected_traffic: '10000 users/month',
          compliance_requirements: 'SOC 2',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should accept form with minimal required fields', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: 'Minimal Company',
          email: 'minimal@example.com',
          tier: 'shared',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('validation errors', () => {
    it('should reject missing email', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: 'Test Company',
          tier: 'shared',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
        },
      });
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: 'Test Company',
          email: 'not-an-email',
          tier: 'shared',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject missing company name', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          email: 'test@example.com',
          tier: 'shared',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject missing tier', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: 'Test Company',
          email: 'test@example.com',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid tier', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: 'Test Company',
          email: 'test@example.com',
          tier: 'invalid-tier',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid phone format', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: 'Test Company',
          email: 'test@example.com',
          tier: 'shared',
          phone: 'not-a-phone',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid website URL', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: 'Test Company',
          email: 'test@example.com',
          tier: 'shared',
          website: 'not-a-url',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return detailed validation errors', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          email: 'invalid',
          tier: 'wrong',
        })
        .expect(400);

      expect(response.body.error).toHaveProperty('errors');
      expect(response.body.error.errors).toBeDefined();
    });
  });

  describe('duplicate submissions', () => {
    it('should reject duplicate email', async () => {
      const formData = {
        company_name: 'Duplicate Test',
        email: 'duplicate@example.com',
        tier: 'shared',
      };

      // First submission
      await request(app).post('/api/intake').send(formData).expect(200);

      // Second submission with same email
      const response = await request(app)
        .post('/api/intake')
        .send(formData)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'CONFLICT',
          message: expect.stringContaining('already exists'),
        },
      });
    });

    it('should allow same company name with different email', async () => {
      const companyName = 'Same Company Name Inc';

      await request(app)
        .post('/api/intake')
        .send({
          company_name: companyName,
          email: 'email1@example.com',
          tier: 'shared',
        })
        .expect(200);

      await request(app)
        .post('/api/intake')
        .send({
          company_name: companyName,
          email: 'email2@example.com',
          tier: 'shared',
        })
        .expect(200);
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limits', async () => {
      // Make many requests quickly
      const requests = [];
      for (let i = 0; i < 110; i++) {
        // Exceeds limit of 100
        requests.push(
          request(app)
            .post('/api/intake')
            .send({
              company_name: `Test ${i}`,
              email: `test${i}@example.com`,
              tier: 'shared',
            })
        );
      }

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimited = responses.some((r) => r.status === 429);
      expect(rateLimited).toBe(true);
    });

    it('should return rate limit error message', async () => {
      // Exhaust rate limit
      for (let i = 0; i < 100; i++) {
        await request(app)
          .post('/api/intake')
          .send({
            company_name: `Test ${i}`,
            email: `ratelimit${i}@example.com`,
            tier: 'shared',
          });
      }

      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: 'Rate Limited',
          email: 'ratelimited@example.com',
          tier: 'shared',
        })
        .expect(429);

      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('error handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/intake')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle very large payloads', async () => {
      const largePayload = {
        company_name: 'Test',
        email: 'test@example.com',
        tier: 'shared',
        business_description: 'x'.repeat(100000), // 100KB
      };

      await request(app).post('/api/intake').send(largePayload).expect(400);
    });
  });

  describe('response format', () => {
    it('should return consistent response structure', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: 'Test Company',
          email: 'format@example.com',
          tier: 'shared',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('customer_id');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('next_step');
      expect(response.body.data).toHaveProperty('message');
    });

    it('should return JSON content type', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: 'Test Company',
          email: 'json@example.com',
          tier: 'shared',
        });

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
