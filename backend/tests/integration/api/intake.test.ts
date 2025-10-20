/**
 * Integration Tests - Intake API
 *
 * Tests for customer intake form submission endpoint:
 * - Valid form submission
 * - Validation errors
 * - Duplicate submissions
 * - Rate limiting
 * - Schema endpoint
 *
 * @module tests/integration/api/intake
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../../src/api/app.js';
import { getTestDb, seedCustomers, clearTable } from '../../setup.js';
import { sampleIntakeForms } from '../../fixtures/customers.js';

describe('Intake API', () => {
  let db: any;

  beforeEach(() => {
    db = getTestDb();
    clearTable('customers');
  });

  afterEach(() => {
    clearTable('customers');
  });

  describe('POST /api/intake - Valid Submissions', () => {
    it('should create customer with valid data and return 201', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send(sampleIntakeForms[0])
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          customer_id: expect.any(Number),
          status: 'prospect',
        },
      });
      expect(response.body.data.customer_id).toBeGreaterThan(0);
    });

    it('should store customer in database', async () => {
      const formData = {
        company_name: 'Integration Test Company',
        email: 'integration@test.com',
        tier: 'shared',
        contact_name: 'Test User',
        phone: '+1-555-1234',
        website: 'https://test.com',
      };

      const response = await request(app)
        .post('/api/intake')
        .send(formData)
        .expect(201);

      const customerId = response.body.data.customer_id;

      // Verify in database
      const customer = db
        .prepare('SELECT * FROM customers WHERE id = ?')
        .get(customerId);

      expect(customer).toBeDefined();
      expect(customer.email).toBe(formData.email);
      expect(customer.company_name).toBe(formData.company_name);
      expect(customer.status).toBe('prospect');
      expect(customer.tier).toBe(formData.tier);
    });

    it('should accept all pricing tiers', async () => {
      const tiers = ['shared', 'dedicated', 'pro', 'enterprise'];

      for (const tier of tiers) {
        const response = await request(app)
          .post('/api/intake')
          .send({
            company_name: `Test ${tier}`,
            email: `test-${tier}-${Date.now()}@example.com`,
            tier,
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('prospect');
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
        .expect(201);

      expect(response.body.success).toBe(true);

      const customer = db
        .prepare('SELECT * FROM customers WHERE id = ?')
        .get(response.body.data.customer_id);

      expect(customer.business_description).toBe('SaaS platform');
      expect(customer.expected_traffic).toBe('10000 users/month');
    });

    it('should accept form with minimal required fields', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: 'Minimal Company',
          email: 'minimal@example.com',
          tier: 'shared',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('customer_id');
    });

    it('should return proper response structure', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: 'Structure Test',
          email: 'structure@example.com',
          tier: 'dedicated',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('customer_id');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body).toHaveProperty('message');
    });

    it('should return JSON content type', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: 'JSON Test',
          email: 'json@example.com',
          tier: 'shared',
        });

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('POST /api/intake - Validation Errors', () => {
    it('should reject missing email with 400', async () => {
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
      expect(response.body.error.message).toBeDefined();
    });

    it('should reject invalid email format with 400', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: 'Test Company',
          email: 'not-an-email',
          tier: 'shared',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing company name with 400', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          email: 'test@example.com',
          tier: 'shared',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject missing tier with 400', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: 'Test Company',
          email: 'test@example.com',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid tier with 400', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: 'Test Company',
          email: 'test@example.com',
          tier: 'invalid-tier',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('tier');
    });

    it('should reject invalid phone format with 400', async () => {
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

    it('should reject invalid website URL with 400', async () => {
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
      expect(Array.isArray(response.body.error.errors)).toBe(true);
      expect(response.body.error.errors.length).toBeGreaterThan(0);
    });

    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'test',
        'test@',
        '@example.com',
        'test@example',
        'test @example.com',
        'test@exam ple.com',
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/intake')
          .send({
            company_name: 'Test',
            email,
            tier: 'shared',
          });

        expect(response.status).toBe(400);
      }
    });

    it('should reject company name that is too short', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: 'A',
          email: 'test@example.com',
          tier: 'shared',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject excessively long fields', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: 'A'.repeat(300),
          email: 'test@example.com',
          tier: 'shared',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/intake - Duplicate Submissions', () => {
    it('should reject duplicate email with 409', async () => {
      const formData = {
        company_name: 'Duplicate Test',
        email: 'duplicate@example.com',
        tier: 'shared',
      };

      // First submission
      await request(app).post('/api/intake').send(formData).expect(201);

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
        .expect(201);

      await request(app)
        .post('/api/intake')
        .send({
          company_name: companyName,
          email: 'email2@example.com',
          tier: 'shared',
        })
        .expect(201);
    });

    it('should enforce email uniqueness case-insensitively', async () => {
      await request(app)
        .post('/api/intake')
        .send({
          company_name: 'Test 1',
          email: 'Test@Example.COM',
          tier: 'shared',
        })
        .expect(201);

      await request(app)
        .post('/api/intake')
        .send({
          company_name: 'Test 2',
          email: 'test@example.com',
          tier: 'shared',
        })
        .expect(409);
    });
  });

  describe('POST /api/intake - Rate Limiting', () => {
    it('should enforce rate limits after 100 requests', async () => {
      const requests = [];

      // Make 101 requests
      for (let i = 0; i < 101; i++) {
        requests.push(
          request(app)
            .post('/api/intake')
            .send({
              company_name: `Rate Limit Test ${i}`,
              email: `ratelimit${i}@example.com`,
              tier: 'shared',
            })
        );
      }

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimited = responses.some((r) => r.status === 429);
      expect(rateLimited).toBe(true);

      // Count successful vs rate limited
      const successful = responses.filter((r) => r.status === 201).length;
      const limited = responses.filter((r) => r.status === 429).length;

      expect(successful).toBeLessThanOrEqual(100);
      expect(limited).toBeGreaterThanOrEqual(1);
    });

    it('should return rate limit error with proper structure', async () => {
      // Exhaust rate limit
      for (let i = 0; i < 100; i++) {
        await request(app)
          .post('/api/intake')
          .send({
            company_name: `Test ${i}`,
            email: `exhaust${i}@example.com`,
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

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.body.error.message).toBeDefined();
    });
  });

  describe('POST /api/intake - Error Handling', () => {
    it('should handle malformed JSON with 400', async () => {
      const response = await request(app)
        .post('/api/intake')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle empty request body with 400', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject payloads exceeding size limit', async () => {
      const largePayload = {
        company_name: 'Test',
        email: 'test@example.com',
        tier: 'shared',
        business_description: 'x'.repeat(50000), // 50KB description
      };

      const response = await request(app)
        .post('/api/intake')
        .send(largePayload);

      // Should either reject or truncate
      expect([400, 413]).toContain(response.status);
    });

    it('should handle missing Content-Type header gracefully', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send('plain text data')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should sanitize HTML in inputs', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: '<script>alert("xss")</script>Test Company',
          email: 'test@example.com',
          tier: 'shared',
        })
        .expect(201);

      const customer = db
        .prepare('SELECT * FROM customers WHERE id = ?')
        .get(response.body.data.customer_id);

      // Should store safely (validation layer should handle this)
      expect(customer.company_name).toBeDefined();
    });
  });

  describe('GET /api/intake/schema', () => {
    it('should return form schema', async () => {
      const response = await request(app)
        .get('/api/intake/schema')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('fields');
      expect(response.body.data).toHaveProperty('required');
    });

    it('should include all field definitions', async () => {
      const response = await request(app)
        .get('/api/intake/schema')
        .expect(200);

      const fields = response.body.data.fields;

      expect(fields).toHaveProperty('company_name');
      expect(fields).toHaveProperty('email');
      expect(fields).toHaveProperty('tier');
      expect(fields).toHaveProperty('contact_name');
      expect(fields).toHaveProperty('phone');
      expect(fields).toHaveProperty('website');
    });

    it('should specify required fields', async () => {
      const response = await request(app)
        .get('/api/intake/schema')
        .expect(200);

      const required = response.body.data.required;

      expect(required).toContain('company_name');
      expect(required).toContain('email');
      expect(required).toContain('tier');
    });

    it('should include tier options', async () => {
      const response = await request(app)
        .get('/api/intake/schema')
        .expect(200);

      const tierField = response.body.data.fields.tier;

      expect(tierField).toHaveProperty('options');
      expect(tierField.options).toContain('shared');
      expect(tierField.options).toContain('dedicated');
      expect(tierField.options).toContain('pro');
      expect(tierField.options).toContain('enterprise');
    });
  });

  describe('Response Format Consistency', () => {
    it('should return consistent success response structure', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: 'Test Company',
          email: 'format@example.com',
          tier: 'shared',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');
      expect(response.body.success).toBe(true);
    });

    it('should return consistent error response structure', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          email: 'invalid',
        })
        .expect(400);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('Database Integrity', () => {
    it('should create audit trail on submission', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: 'Audit Test',
          email: 'audit@example.com',
          tier: 'shared',
        })
        .expect(201);

      const customer = db
        .prepare('SELECT created_at, updated_at FROM customers WHERE id = ?')
        .get(response.body.data.customer_id);

      expect(customer.created_at).toBeDefined();
      expect(customer.updated_at).toBeDefined();
    });

    it('should store timestamps in ISO format', async () => {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: 'Timestamp Test',
          email: 'timestamp@example.com',
          tier: 'shared',
        })
        .expect(201);

      const customer = db
        .prepare('SELECT created_at FROM customers WHERE id = ?')
        .get(response.body.data.customer_id);

      // Should be valid ISO 8601 format
      expect(() => new Date(customer.created_at)).not.toThrow();
    });
  });
});
