/**
 * Integration Tests - Webhooks API
 *
 * Tests for Stripe webhook handling:
 * - Valid webhook signatures
 * - Payment events
 * - Subscription events
 * - Invalid signatures
 *
 * @module tests/integration/api/webhooks
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../../src/api/app.js';
import { getTestDb } from '../../setup.js';
import { sampleStripeEvents } from '../../fixtures/customers.js';

describe('POST /api/webhooks/stripe', () => {
  let db: any;

  beforeAll(() => {
    db = getTestDb();
  });

  describe('signature verification', () => {
    it('should accept valid webhook signature', async () => {
      const payload = JSON.stringify(sampleStripeEvents.paymentIntentSucceeded);
      const signature = 'valid_signature_here'; // Mock signature

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload);

      // Should not return 401
      expect(response.status).not.toBe(401);
    });

    it('should reject invalid signature', async () => {
      const payload = JSON.stringify(sampleStripeEvents.paymentIntentSucceeded);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'invalid_signature')
        .send(payload)
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject missing signature', async () => {
      const payload = JSON.stringify(sampleStripeEvents.paymentIntentSucceeded);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .send(payload)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('payment_intent.succeeded event', () => {
    it('should handle successful payment', async () => {
      // Create customer first
      const customer = db
        .prepare(
          'INSERT INTO customers (company_name, email, tier, status) VALUES (?, ?, ?, ?)'
        )
        .run('Test Company', 'payment@example.com', 'dedicated', 'approved');

      const event = {
        ...sampleStripeEvents.paymentIntentSucceeded,
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentSucceeded.data.object,
            metadata: {
              customer_id: customer.lastInsertRowid.toString(),
              tier: 'dedicated',
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .send(event)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should update customer status to provisioning', async () => {
      const customer = db
        .prepare(
          'INSERT INTO customers (company_name, email, tier, status) VALUES (?, ?, ?, ?)'
        )
        .run('Test Company', 'provision@example.com', 'pro', 'approved');

      const customerId = customer.lastInsertRowid;

      const event = {
        ...sampleStripeEvents.paymentIntentSucceeded,
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentSucceeded.data.object,
            metadata: { customer_id: customerId.toString() },
          },
        },
      };

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .send(event);

      const updated = db
        .prepare('SELECT status FROM customers WHERE id = ?')
        .get(customerId);

      expect(updated.status).toBe('provisioning');
    });

    it('should create billing record', async () => {
      const customer = db
        .prepare(
          'INSERT INTO customers (company_name, email, tier, status) VALUES (?, ?, ?, ?)'
        )
        .run('Test Company', 'billing@example.com', 'enterprise', 'approved');

      const event = {
        ...sampleStripeEvents.paymentIntentSucceeded,
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentSucceeded.data.object,
            metadata: { customer_id: customer.lastInsertRowid.toString() },
          },
        },
      };

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .send(event);

      const billingRecord = db
        .prepare('SELECT * FROM billing_records WHERE customer_id = ?')
        .get(customer.lastInsertRowid);

      expect(billingRecord).toBeDefined();
      expect(billingRecord.status).toBe('paid');
    });
  });

  describe('payment_intent.payment_failed event', () => {
    it('should handle failed payment', async () => {
      const customer = db
        .prepare(
          'INSERT INTO customers (company_name, email, tier, status) VALUES (?, ?, ?, ?)'
        )
        .run('Test Company', 'failed@example.com', 'shared', 'approved');

      const event = {
        ...sampleStripeEvents.paymentIntentFailed,
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentFailed.data.object,
            metadata: { customer_id: customer.lastInsertRowid.toString() },
          },
        },
      };

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .send(event)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should keep customer in approved status', async () => {
      const customer = db
        .prepare(
          'INSERT INTO customers (company_name, email, tier, status) VALUES (?, ?, ?, ?)'
        )
        .run('Test Company', 'keep@example.com', 'dedicated', 'approved');

      const customerId = customer.lastInsertRowid;

      const event = {
        ...sampleStripeEvents.paymentIntentFailed,
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentFailed.data.object,
            metadata: { customer_id: customerId.toString() },
          },
        },
      };

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .send(event);

      const updated = db
        .prepare('SELECT status FROM customers WHERE id = ?')
        .get(customerId);

      expect(updated.status).toBe('approved');
    });
  });

  describe('subscription events', () => {
    it('should handle subscription.created', async () => {
      const customer = db
        .prepare(
          'INSERT INTO customers (company_name, email, tier, status) VALUES (?, ?, ?, ?)'
        )
        .run('Test Company', 'sub@example.com', 'pro', 'provisioning');

      const event = {
        ...sampleStripeEvents.subscriptionCreated,
        data: {
          object: {
            ...sampleStripeEvents.subscriptionCreated.data.object,
            metadata: { customer_id: customer.lastInsertRowid.toString() },
          },
        },
      };

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .send(event)
        .expect(200);
    });

    it('should handle subscription.deleted', async () => {
      const customer = db
        .prepare(
          'INSERT INTO customers (company_name, email, tier, status) VALUES (?, ?, ?, ?)'
        )
        .run('Test Company', 'unsub@example.com', 'dedicated', 'active');

      const event = {
        ...sampleStripeEvents.subscriptionDeleted,
        data: {
          object: {
            ...sampleStripeEvents.subscriptionDeleted.data.object,
            metadata: { customer_id: customer.lastInsertRowid.toString() },
          },
        },
      };

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .send(event)
        .expect(200);
    });
  });

  describe('idempotency', () => {
    it('should handle duplicate webhook events', async () => {
      const customer = db
        .prepare(
          'INSERT INTO customers (company_name, email, tier, status) VALUES (?, ?, ?, ?)'
        )
        .run('Test Company', 'idem@example.com', 'shared', 'approved');

      const event = {
        ...sampleStripeEvents.paymentIntentSucceeded,
        id: 'evt_unique_12345',
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentSucceeded.data.object,
            metadata: { customer_id: customer.lastInsertRowid.toString() },
          },
        },
      };

      // Send same event twice
      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .send(event)
        .expect(200);

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .send(event)
        .expect(200);

      // Should only create one billing record
      const records = db
        .prepare('SELECT COUNT(*) as count FROM billing_records WHERE customer_id = ?')
        .get(customer.lastInsertRowid);

      expect(records.count).toBe(1);
    });
  });
});
