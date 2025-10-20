/**
 * Integration Tests - Webhooks API
 *
 * Tests for Stripe webhook handling including:
 * - Signature verification
 * - Payment events
 * - Subscription events
 * - Idempotency
 * - Error handling
 *
 * @module tests/integration/api/webhooks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../../src/api/app.js';
import { getTestDb, seedCustomers, clearTable } from '../../setup.js';
import { sampleStripeEvents, sampleCustomers } from '../../fixtures/customers.js';

describe('Webhooks API', () => {
  let db: any;
  let customerIds: number[];

  beforeEach(() => {
    db = getTestDb();
    clearTable('customers');
    clearTable('billing_records');
    clearTable('webhook_events');
    customerIds = seedCustomers(sampleCustomers);
  });

  afterEach(() => {
    clearTable('customers');
    clearTable('billing_records');
    clearTable('webhook_events');
  });

  describe('POST /api/webhooks/stripe - Signature Verification', () => {
    it('should accept valid webhook signature', async () => {
      const payload = JSON.stringify(sampleStripeEvents.paymentIntentSucceeded);
      const signature = 'valid_test_signature';

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payload);

      // Should not return 401 (signature validation handled by Stripe lib mock)
      expect([200, 400, 404]).toContain(response.status);
    });

    it('should reject invalid signature with 401', async () => {
      const payload = JSON.stringify(sampleStripeEvents.paymentIntentSucceeded);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'invalid_signature')
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject missing signature with 401', async () => {
      const payload = JSON.stringify(sampleStripeEvents.paymentIntentSucceeded);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('signature');
    });

    it('should reject malformed signature with 401', async () => {
      const payload = JSON.stringify(sampleStripeEvents.paymentIntentSucceeded);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', '')
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/webhooks/stripe - payment_intent.succeeded', () => {
    it('should process successful payment event', async () => {
      const customerId = customerIds[0];

      const event = {
        ...sampleStripeEvents.paymentIntentSucceeded,
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentSucceeded.data.object,
            metadata: {
              customer_id: customerId.toString(),
              tier: 'dedicated',
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should update customer status to provisioning', async () => {
      // Create approved customer
      db.prepare(
        'UPDATE customers SET status = ? WHERE id = ?'
      ).run('approved', customerIds[0]);

      const event = {
        ...sampleStripeEvents.paymentIntentSucceeded,
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentSucceeded.data.object,
            metadata: {
              customer_id: customerIds[0].toString(),
              tier: 'dedicated',
            },
          },
        },
      };

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(200);

      const customer = db
        .prepare('SELECT status FROM customers WHERE id = ?')
        .get(customerIds[0]);

      expect(customer.status).toBe('provisioning');
    });

    it('should create billing record', async () => {
      const customerId = customerIds[0];

      const event = {
        ...sampleStripeEvents.paymentIntentSucceeded,
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentSucceeded.data.object,
            metadata: {
              customer_id: customerId.toString(),
            },
          },
        },
      };

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(200);

      const billingRecord = db
        .prepare('SELECT * FROM billing_records WHERE customer_id = ?')
        .get(customerId);

      expect(billingRecord).toBeDefined();
      expect(billingRecord.status).toBe('paid');
      expect(billingRecord.amount).toBe(event.data.object.amount);
    });

    it('should handle payment with amount', async () => {
      const customerId = customerIds[0];

      const event = {
        ...sampleStripeEvents.paymentIntentSucceeded,
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentSucceeded.data.object,
            amount: 12900, // $129.00
            metadata: {
              customer_id: customerId.toString(),
            },
          },
        },
      };

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(200);

      const billingRecord = db
        .prepare('SELECT * FROM billing_records WHERE customer_id = ?')
        .get(customerId);

      expect(billingRecord.amount).toBe(12900);
    });

    it('should return 404 for non-existent customer', async () => {
      const event = {
        ...sampleStripeEvents.paymentIntentSucceeded,
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentSucceeded.data.object,
            metadata: {
              customer_id: '999999',
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing customer_id in metadata', async () => {
      const event = {
        ...sampleStripeEvents.paymentIntentSucceeded,
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentSucceeded.data.object,
            metadata: {},
          },
        },
      };

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/webhooks/stripe - payment_intent.payment_failed', () => {
    it('should process failed payment event', async () => {
      const customerId = customerIds[0];

      const event = {
        ...sampleStripeEvents.paymentIntentFailed,
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentFailed.data.object,
            metadata: {
              customer_id: customerId.toString(),
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should keep customer in approved status', async () => {
      // Set customer to approved
      db.prepare(
        'UPDATE customers SET status = ? WHERE id = ?'
      ).run('approved', customerIds[0]);

      const event = {
        ...sampleStripeEvents.paymentIntentFailed,
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentFailed.data.object,
            metadata: {
              customer_id: customerIds[0].toString(),
            },
          },
        },
      };

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(200);

      const customer = db
        .prepare('SELECT status FROM customers WHERE id = ?')
        .get(customerIds[0]);

      expect(customer.status).toBe('approved');
    });

    it('should create failed billing record', async () => {
      const customerId = customerIds[0];

      const event = {
        ...sampleStripeEvents.paymentIntentFailed,
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentFailed.data.object,
            metadata: {
              customer_id: customerId.toString(),
            },
          },
        },
      };

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(200);

      const billingRecord = db
        .prepare('SELECT * FROM billing_records WHERE customer_id = ?')
        .get(customerId);

      expect(billingRecord).toBeDefined();
      expect(billingRecord.status).toBe('failed');
    });

    it('should include error details', async () => {
      const customerId = customerIds[0];

      const event = {
        ...sampleStripeEvents.paymentIntentFailed,
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentFailed.data.object,
            last_payment_error: {
              code: 'card_declined',
              message: 'Your card was declined',
            },
            metadata: {
              customer_id: customerId.toString(),
            },
          },
        },
      };

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(200);

      const billingRecord = db
        .prepare('SELECT * FROM billing_records WHERE customer_id = ?')
        .get(customerId);

      expect(billingRecord.error_code).toBe('card_declined');
      expect(billingRecord.error_message).toBe('Your card was declined');
    });
  });

  describe('POST /api/webhooks/stripe - Subscription Events', () => {
    it('should handle subscription.created event', async () => {
      const customerId = customerIds[0];

      const event = {
        ...sampleStripeEvents.subscriptionCreated,
        data: {
          object: {
            ...sampleStripeEvents.subscriptionCreated.data.object,
            metadata: {
              customer_id: customerId.toString(),
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle subscription.deleted event', async () => {
      const customerId = customerIds[0];

      const event = {
        ...sampleStripeEvents.subscriptionDeleted,
        data: {
          object: {
            ...sampleStripeEvents.subscriptionDeleted.data.object,
            metadata: {
              customer_id: customerId.toString(),
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should update customer status on subscription cancellation', async () => {
      // Set customer to active
      db.prepare(
        'UPDATE customers SET status = ? WHERE id = ?'
      ).run('active', customerIds[0]);

      const event = {
        ...sampleStripeEvents.subscriptionDeleted,
        data: {
          object: {
            ...sampleStripeEvents.subscriptionDeleted.data.object,
            metadata: {
              customer_id: customerIds[0].toString(),
            },
          },
        },
      };

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(200);

      const customer = db
        .prepare('SELECT status FROM customers WHERE id = ?')
        .get(customerIds[0]);

      expect(customer.status).toBe('cancelled');
    });
  });

  describe('POST /api/webhooks/stripe - Idempotency', () => {
    it('should handle duplicate webhook events', async () => {
      const customerId = customerIds[0];

      const event = {
        ...sampleStripeEvents.paymentIntentSucceeded,
        id: 'evt_unique_idempotency_test',
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentSucceeded.data.object,
            metadata: {
              customer_id: customerId.toString(),
            },
          },
        },
      };

      // Send same event twice
      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(200);

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(200);

      // Should only create one billing record
      const records = db
        .prepare('SELECT COUNT(*) as count FROM billing_records WHERE customer_id = ?')
        .get(customerId);

      expect(records.count).toBe(1);
    });

    it('should track processed event IDs', async () => {
      const customerId = customerIds[0];

      const event = {
        ...sampleStripeEvents.paymentIntentSucceeded,
        id: 'evt_track_test_12345',
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentSucceeded.data.object,
            metadata: {
              customer_id: customerId.toString(),
            },
          },
        },
      };

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(200);

      // Check if event was tracked
      const webhookEvent = db
        .prepare('SELECT * FROM webhook_events WHERE event_id = ?')
        .get('evt_track_test_12345');

      expect(webhookEvent).toBeDefined();
      expect(webhookEvent.processed).toBe(1);
    });

    it('should return success for already processed event', async () => {
      const customerId = customerIds[0];

      const event = {
        ...sampleStripeEvents.paymentIntentSucceeded,
        id: 'evt_duplicate_12345',
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentSucceeded.data.object,
            metadata: {
              customer_id: customerId.toString(),
            },
          },
        },
      };

      // First request
      const response1 = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(200);

      // Second request (duplicate)
      const response2 = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(200);

      expect(response1.body.success).toBe(true);
      expect(response2.body.success).toBe(true);
    });
  });

  describe('GET /api/webhooks/health - Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/webhooks/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'webhooks',
      });
    });

    it('should include timestamp', async () => {
      const response = await request(app)
        .get('/api/webhooks/health')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should include webhook stats', async () => {
      const response = await request(app)
        .get('/api/webhooks/health')
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('total_processed');
      expect(response.body.stats).toHaveProperty('last_24h');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle empty payload', async () => {
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle unknown event type', async () => {
      const event = {
        id: 'evt_unknown_type',
        type: 'unknown.event.type',
        data: {
          object: {},
        },
      };

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(200);

      // Should acknowledge but not process
      expect(response.body.success).toBe(true);
    });

    it('should handle missing event data', async () => {
      const event = {
        id: 'evt_missing_data',
        type: 'payment_intent.succeeded',
      };

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      const customerId = customerIds[0];

      const event = {
        ...sampleStripeEvents.paymentIntentSucceeded,
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentSucceeded.data.object,
            metadata: {
              customer_id: customerId.toString(),
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event);

      // Should either succeed or return proper error
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Response Format Consistency', () => {
    it('should return consistent success response', async () => {
      const customerId = customerIds[0];

      const event = {
        ...sampleStripeEvents.paymentIntentSucceeded,
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentSucceeded.data.object,
            metadata: {
              customer_id: customerId.toString(),
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
    });

    it('should return consistent error response', async () => {
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .send({})
        .expect(401);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });

    it('should return JSON content type', async () => {
      const response = await request(app)
        .get('/api/webhooks/health');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('Security', () => {
    it('should reject requests without signature header', async () => {
      const event = sampleStripeEvents.paymentIntentSucceeded;

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject tampered payloads', async () => {
      const event = {
        ...sampleStripeEvents.paymentIntentSucceeded,
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentSucceeded.data.object,
            amount: 1, // Tampered amount
          },
        },
      };

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'invalid_sig')
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should validate signature timestamp', async () => {
      const event = sampleStripeEvents.paymentIntentSucceeded;
      const oldTimestamp = Math.floor(Date.now() / 1000) - 7200; // 2 hours old

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', `t=${oldTimestamp},v1=invalid`)
        .set('Content-Type', 'application/json')
        .send(event)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large webhook payloads', async () => {
      const event = {
        ...sampleStripeEvents.paymentIntentSucceeded,
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentSucceeded.data.object,
            description: 'x'.repeat(10000),
            metadata: {
              customer_id: customerIds[0].toString(),
              extra_data: 'y'.repeat(5000),
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(event);

      // Should either process or reject based on size limits
      expect([200, 413]).toContain(response.status);
    });

    it('should handle concurrent webhook requests', async () => {
      const customerId = customerIds[0];

      const requests = Array.from({ length: 5 }, (_, i) => {
        const event = {
          ...sampleStripeEvents.paymentIntentSucceeded,
          id: `evt_concurrent_${i}`,
          data: {
            object: {
              ...sampleStripeEvents.paymentIntentSucceeded.data.object,
              metadata: {
                customer_id: customerId.toString(),
              },
            },
          },
        };

        return request(app)
          .post('/api/webhooks/stripe')
          .set('stripe-signature', 'valid_sig')
          .set('Content-Type', 'application/json')
          .send(event);
      });

      const responses = await Promise.all(requests);

      // All should succeed
      expect(responses.every(r => r.status === 200)).toBe(true);
    });

    it('should handle webhook retry scenarios', async () => {
      const customerId = customerIds[0];

      const event = {
        ...sampleStripeEvents.paymentIntentSucceeded,
        id: 'evt_retry_test',
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentSucceeded.data.object,
            metadata: {
              customer_id: customerId.toString(),
            },
          },
        },
      };

      // Simulate multiple retries with same event ID
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/webhooks/stripe')
          .set('stripe-signature', 'valid_sig')
          .set('Content-Type', 'application/json')
          .send(event)
          .expect(200);

        expect(response.body.success).toBe(true);
      }

      // Should only have one billing record
      const records = db
        .prepare('SELECT COUNT(*) as count FROM billing_records WHERE customer_id = ?')
        .get(customerId);

      expect(records.count).toBe(1);
    });
  });
});
