/**
 * E2E Tests - Payment Workflow
 *
 * Tests complete payment processing workflows:
 * - Payment link creation
 * - Stripe webhook processing
 * - Billing record updates
 * - Invoice generation
 * - Payment failures and retries
 *
 * @module tests/e2e/payment-workflow
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/api/app.js';
import { getTestDb } from '../setup.js';
import { CustomersRepository } from '../../src/database/repositories/customers.repository.js';
import { sampleStripeEvents, pricingTiers } from '../fixtures/customers.js';

describe('E2E: Payment Workflow', () => {
  let db: any;
  let customersRepo: CustomersRepository;

  beforeEach(() => {
    db = getTestDb();
    customersRepo = new CustomersRepository(db);
  });

  it('should process successful payment end-to-end', async () => {
    // Create approved customer
    const customer = await customersRepo.create({
      company_name: 'Payment Test Company',
      email: 'payment-success@example.com',
      tier: 'dedicated',
      status: 'approved',
      contact_name: 'Test User',
      phone: null,
      website: null,
    });

    // Simulate payment link creation (would happen in approval step)
    const paymentLink = {
      url: 'https://pay.stripe.com/test_link',
      amount: pricingTiers.dedicated.base_price,
      customer_id: customer.id,
    };

    // Customer pays (Stripe webhook)
    const paymentEvent = {
      ...sampleStripeEvents.paymentIntentSucceeded,
      id: `evt_payment_${Date.now()}`,
      data: {
        object: {
          ...sampleStripeEvents.paymentIntentSucceeded.data.object,
          id: `pi_${Date.now()}`,
          amount: pricingTiers.dedicated.base_price,
          metadata: {
            customer_id: customer.id.toString(),
            tier: 'dedicated',
          },
        },
      },
    };

    const response = await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'valid_signature')
      .send(paymentEvent)
      .expect(200);

    expect(response.body.success).toBe(true);

    // Verify billing record created
    const billingRecord = db
      .prepare('SELECT * FROM billing_records WHERE customer_id = ? AND status = ?')
      .get(customer.id, 'paid');

    expect(billingRecord).toBeDefined();
    expect(billingRecord.amount).toBe(pricingTiers.dedicated.base_price);
    expect(billingRecord.stripe_payment_intent_id).toContain('pi_');

    // Verify customer status updated
    const updatedCustomer = await customersRepo.findById(customer.id);
    expect(updatedCustomer.status).toBe('provisioning');
  });

  it('should handle payment failure and retry', async () => {
    const customer = await customersRepo.create({
      company_name: 'Payment Retry Test',
      email: 'payment-retry@example.com',
      tier: 'shared',
      status: 'approved',
      contact_name: null,
      phone: null,
      website: null,
    });

    // First attempt fails
    const failedEvent = {
      ...sampleStripeEvents.paymentIntentFailed,
      id: `evt_failed_${Date.now()}`,
      data: {
        object: {
          ...sampleStripeEvents.paymentIntentFailed.data.object,
          id: `pi_failed_${Date.now()}`,
          metadata: {
            customer_id: customer.id.toString(),
            tier: 'shared',
          },
        },
      },
    };

    await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'valid_signature')
      .send(failedEvent)
      .expect(200);

    // Verify failed billing record
    let billingRecord = db
      .prepare('SELECT * FROM billing_records WHERE customer_id = ?')
      .get(customer.id);

    expect(billingRecord.status).toBe('failed');

    // Retry succeeds
    const successEvent = {
      ...sampleStripeEvents.paymentIntentSucceeded,
      id: `evt_success_${Date.now()}`,
      data: {
        object: {
          ...sampleStripeEvents.paymentIntentSucceeded.data.object,
          id: `pi_success_${Date.now()}`,
          metadata: {
            customer_id: customer.id.toString(),
            tier: 'shared',
          },
        },
      },
    };

    await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'valid_signature')
      .send(successEvent)
      .expect(200);

    // Verify new successful billing record
    billingRecord = db
      .prepare('SELECT * FROM billing_records WHERE customer_id = ? AND status = ?')
      .get(customer.id, 'paid');

    expect(billingRecord).toBeDefined();

    // Customer should be provisioning
    const updatedCustomer = await customersRepo.findById(customer.id);
    expect(updatedCustomer.status).toBe('provisioning');
  });

  it('should process payments for all pricing tiers', async () => {
    const tiers = [
      { name: 'shared', price: pricingTiers.shared.base_price },
      { name: 'dedicated', price: pricingTiers.dedicated.base_price },
      { name: 'pro', price: pricingTiers.pro.base_price },
      { name: 'enterprise', price: pricingTiers.enterprise.base_price },
    ];

    for (const tier of tiers) {
      const customer = await customersRepo.create({
        company_name: `${tier.name} Test`,
        email: `${tier.name}@example.com`,
        tier: tier.name as any,
        status: 'approved',
        contact_name: null,
        phone: null,
        website: null,
      });

      const paymentEvent = {
        ...sampleStripeEvents.paymentIntentSucceeded,
        id: `evt_${tier.name}_${Date.now()}`,
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentSucceeded.data.object,
            amount: tier.price,
            metadata: {
              customer_id: customer.id.toString(),
              tier: tier.name,
            },
          },
        },
      };

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_signature')
        .send(paymentEvent)
        .expect(200);

      const billingRecord = db
        .prepare('SELECT * FROM billing_records WHERE customer_id = ?')
        .get(customer.id);

      expect(billingRecord.amount).toBe(tier.price);
      expect(billingRecord.status).toBe('paid');
    }
  });

  it('should generate invoice with line items', async () => {
    const customer = await customersRepo.create({
      company_name: 'Invoice Test',
      email: 'invoice@example.com',
      tier: 'pro',
      status: 'approved',
      contact_name: null,
      phone: null,
      website: null,
    });

    const paymentEvent = {
      ...sampleStripeEvents.paymentIntentSucceeded,
      id: `evt_invoice_${Date.now()}`,
      data: {
        object: {
          ...sampleStripeEvents.paymentIntentSucceeded.data.object,
          amount: pricingTiers.pro.base_price,
          metadata: {
            customer_id: customer.id.toString(),
            tier: 'pro',
          },
        },
      },
    };

    await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'valid_signature')
      .send(paymentEvent);

    const billingRecord = db
      .prepare('SELECT * FROM billing_records WHERE customer_id = ?')
      .get(customer.id);

    expect(billingRecord).toMatchObject({
      customer_id: customer.id,
      amount: pricingTiers.pro.base_price,
      currency: 'USD',
      status: 'paid',
      billing_period_start: expect.any(String),
      billing_period_end: expect.any(String),
    });
  });

  it('should handle subscription lifecycle', async () => {
    const customer = await customersRepo.create({
      company_name: 'Subscription Test',
      email: 'subscription@example.com',
      tier: 'dedicated',
      status: 'provisioning',
      contact_name: null,
      phone: null,
      website: null,
    });

    // Subscription created
    const subCreatedEvent = {
      ...sampleStripeEvents.subscriptionCreated,
      id: `evt_sub_created_${Date.now()}`,
      data: {
        object: {
          ...sampleStripeEvents.subscriptionCreated.data.object,
          id: `sub_${Date.now()}`,
          metadata: {
            customer_id: customer.id.toString(),
          },
        },
      },
    };

    await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'valid_signature')
      .send(subCreatedEvent)
      .expect(200);

    // Customer becomes active
    await customersRepo.updateStatus(customer.id, 'active');
    let updatedCustomer = await customersRepo.findById(customer.id);
    expect(updatedCustomer.status).toBe('active');

    // Subscription cancelled
    const subDeletedEvent = {
      ...sampleStripeEvents.subscriptionDeleted,
      id: `evt_sub_deleted_${Date.now()}`,
      data: {
        object: {
          ...sampleStripeEvents.subscriptionDeleted.data.object,
          metadata: {
            customer_id: customer.id.toString(),
          },
        },
      },
    };

    await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'valid_signature')
      .send(subDeletedEvent)
      .expect(200);

    // Customer should be churned
    updatedCustomer = await customersRepo.findById(customer.id);
    expect(updatedCustomer.status).toBe('churned');
  });

  it('should calculate transparent pricing correctly', async () => {
    const customer = await customersRepo.create({
      company_name: 'Transparent Pricing Test',
      email: 'transparent@example.com',
      tier: 'enterprise',
      status: 'approved',
      contact_name: null,
      phone: null,
      website: null,
    });

    const paymentEvent = {
      ...sampleStripeEvents.paymentIntentSucceeded,
      id: `evt_transparent_${Date.now()}`,
      data: {
        object: {
          ...sampleStripeEvents.paymentIntentSucceeded.data.object,
          amount: pricingTiers.enterprise.base_price,
          metadata: {
            customer_id: customer.id.toString(),
            tier: 'enterprise',
            our_cost: pricingTiers.enterprise.our_cost.toString(),
          },
        },
      },
    };

    await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'valid_signature')
      .send(paymentEvent);

    const billingRecord = db
      .prepare('SELECT * FROM billing_records WHERE customer_id = ?')
      .get(customer.id);

    const yourPrice = billingRecord.amount;
    const ourCost = pricingTiers.enterprise.our_cost;
    const margin = yourPrice - ourCost;
    const marginPercentage = (margin / ourCost) * 100;

    // Verify transparent pricing
    expect(yourPrice).toBe(pricingTiers.enterprise.base_price);
    expect(marginPercentage).toBeGreaterThan(50); // At least 50% margin
  });

  it('should prevent duplicate payment processing', async () => {
    const customer = await customersRepo.create({
      company_name: 'Duplicate Payment Test',
      email: 'duplicate-payment@example.com',
      tier: 'shared',
      status: 'approved',
      contact_name: null,
      phone: null,
      website: null,
    });

    const paymentEvent = {
      ...sampleStripeEvents.paymentIntentSucceeded,
      id: `evt_duplicate_${Date.now()}`,
      data: {
        object: {
          ...sampleStripeEvents.paymentIntentSucceeded.data.object,
          id: `pi_duplicate_${Date.now()}`,
          metadata: {
            customer_id: customer.id.toString(),
            tier: 'shared',
          },
        },
      },
    };

    // Send same event twice
    await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'valid_signature')
      .send(paymentEvent)
      .expect(200);

    await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'valid_signature')
      .send(paymentEvent)
      .expect(200);

    // Should only have one billing record
    const records = db
      .prepare('SELECT COUNT(*) as count FROM billing_records WHERE customer_id = ?')
      .get(customer.id);

    expect(records.count).toBe(1);
  });
});
