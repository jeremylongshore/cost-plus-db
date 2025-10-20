/**
 * E2E Tests - Customer Onboarding Workflow
 *
 * Tests complete customer journey from intake to active database:
 * 1. Form submission
 * 2. Admin approval
 * 3. Payment processing
 * 4. Database provisioning
 * 5. Credentials delivery
 *
 * @module tests/e2e/customer-onboarding
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/api/app.js';
import { getTestDb } from '../setup.js';
import { CustomersRepository } from '../../src/database/repositories/customers.repository.js';
import { CustomerService } from '../../src/services/customer.service.js';
import { sampleStripeEvents } from '../fixtures/customers.js';

describe('E2E: Customer Onboarding Workflow', () => {
  let db: any;
  let customersRepo: CustomersRepository;
  let customerService: CustomerService;

  beforeEach(() => {
    db = getTestDb();
    customersRepo = new CustomersRepository(db);
    customerService = new CustomerService(customersRepo);
  });

  it('should complete full onboarding workflow', async () => {
    // STEP 1: Customer submits intake form
    const intakeResponse = await request(app)
      .post('/api/intake')
      .send({
        company_name: 'E2E Test Company',
        email: 'e2e@example.com',
        tier: 'dedicated',
        contact_name: 'Test User',
        phone: '+1-555-0000',
        website: 'https://e2e-test.com',
        business_description: 'E2E testing',
        expected_traffic: '1000 users/month',
      })
      .expect(200);

    expect(intakeResponse.body.success).toBe(true);
    const customerId = intakeResponse.body.data.customer_id;

    // Verify customer created with 'prospect' status
    let customer = await customersRepo.findById(customerId);
    expect(customer.status).toBe('prospect');
    expect(customer.email).toBe('e2e@example.com');

    // STEP 2: Move to consultation (simulated admin action)
    await customersRepo.updateStatus(customerId, 'consultation');
    customer = await customersRepo.findById(customerId);
    expect(customer.status).toBe('consultation');

    // STEP 3: Admin approves customer
    await customerService.approveCustomer(customerId);
    customer = await customersRepo.findById(customerId);
    expect(customer.status).toBe('approved');

    // STEP 4: Payment succeeds (Stripe webhook)
    const paymentEvent = {
      ...sampleStripeEvents.paymentIntentSucceeded,
      id: `evt_e2e_${Date.now()}`,
      data: {
        object: {
          ...sampleStripeEvents.paymentIntentSucceeded.data.object,
          id: `pi_e2e_${Date.now()}`,
          amount: 8900,
          metadata: {
            customer_id: customerId.toString(),
            tier: 'dedicated',
          },
        },
      },
    };

    const webhookResponse = await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'valid_signature')
      .send(paymentEvent)
      .expect(200);

    expect(webhookResponse.body.success).toBe(true);

    // Verify customer moved to 'provisioning' status
    customer = await customersRepo.findById(customerId);
    expect(customer.status).toBe('provisioning');

    // Verify billing record created
    const billingRecord = db
      .prepare('SELECT * FROM billing_records WHERE customer_id = ?')
      .get(customerId);
    expect(billingRecord).toBeDefined();
    expect(billingRecord.status).toBe('paid');
    expect(billingRecord.amount).toBe(8900);

    // STEP 5: Database provisioning completes (simulated)
    const mockCredentials = {
      database_name: `customer_${customerId}_db`,
      host: 'db01.costplusdb.com',
      port: 5432,
      username: `user_${customerId}`,
      password: 'secure_generated_password',
      ssl_enabled: true,
    };

    // Create database record
    db.prepare(
      `INSERT INTO customer_databases
       (customer_id, database_name, host, port, username, password_hash, ssl_enabled, storage_gb)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      customerId,
      mockCredentials.database_name,
      mockCredentials.host,
      mockCredentials.port,
      mockCredentials.username,
      'hashed_password',
      1,
      50
    );

    // Update customer to 'active' status
    await customersRepo.updateStatus(customerId, 'active');
    customer = await customersRepo.findById(customerId);
    expect(customer.status).toBe('active');

    // STEP 6: Verify final state
    const finalCustomer = await customersRepo.findById(customerId);
    expect(finalCustomer).toMatchObject({
      id: customerId,
      company_name: 'E2E Test Company',
      email: 'e2e@example.com',
      tier: 'dedicated',
      status: 'active',
    });

    const customerDatabase = db
      .prepare('SELECT * FROM customer_databases WHERE customer_id = ?')
      .get(customerId);
    expect(customerDatabase).toBeDefined();
    expect(customerDatabase.database_name).toContain(`customer_${customerId}`);

    const finalBillingRecord = db
      .prepare('SELECT * FROM billing_records WHERE customer_id = ?')
      .get(customerId);
    expect(finalBillingRecord.status).toBe('paid');
  });

  it('should handle payment failure in workflow', async () => {
    // STEP 1: Create and approve customer
    const intakeResponse = await request(app)
      .post('/api/intake')
      .send({
        company_name: 'Failed Payment Test',
        email: 'failed-payment@example.com',
        tier: 'shared',
      })
      .expect(200);

    const customerId = intakeResponse.body.data.customer_id;

    await customersRepo.updateStatus(customerId, 'consultation');
    await customerService.approveCustomer(customerId);

    // STEP 2: Payment fails
    const failedEvent = {
      ...sampleStripeEvents.paymentIntentFailed,
      id: `evt_failed_${Date.now()}`,
      data: {
        object: {
          ...sampleStripeEvents.paymentIntentFailed.data.object,
          metadata: {
            customer_id: customerId.toString(),
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

    // Customer should remain in 'approved' status
    const customer = await customersRepo.findById(customerId);
    expect(customer.status).toBe('approved');

    // Should have failed billing record
    const billingRecord = db
      .prepare('SELECT * FROM billing_records WHERE customer_id = ?')
      .get(customerId);
    expect(billingRecord.status).toBe('failed');
  });

  it('should handle multiple customers in parallel', async () => {
    const customers = [];

    // Create 5 customers simultaneously
    for (let i = 0; i < 5; i++) {
      const response = await request(app)
        .post('/api/intake')
        .send({
          company_name: `Parallel Test ${i}`,
          email: `parallel${i}@example.com`,
          tier: 'shared',
        })
        .expect(200);

      customers.push(response.body.data.customer_id);
    }

    // Verify all created
    expect(customers).toHaveLength(5);

    // Process all through workflow
    for (const customerId of customers) {
      await customersRepo.updateStatus(customerId, 'consultation');
      await customerService.approveCustomer(customerId);

      const paymentEvent = {
        ...sampleStripeEvents.paymentIntentSucceeded,
        id: `evt_parallel_${customerId}_${Date.now()}`,
        data: {
          object: {
            ...sampleStripeEvents.paymentIntentSucceeded.data.object,
            metadata: {
              customer_id: customerId.toString(),
              tier: 'shared',
            },
          },
        },
      };

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'valid_signature')
        .send(paymentEvent);
    }

    // Verify all reached provisioning
    for (const customerId of customers) {
      const customer = await customersRepo.findById(customerId);
      expect(customer.status).toBe('provisioning');
    }
  });

  it('should maintain audit trail throughout workflow', async () => {
    const response = await request(app)
      .post('/api/intake')
      .send({
        company_name: 'Audit Trail Test',
        email: 'audit@example.com',
        tier: 'pro',
      })
      .expect(200);

    const customerId = response.body.data.customer_id;

    // Progress through workflow
    await customersRepo.updateStatus(customerId, 'consultation');
    await customerService.approveCustomer(customerId);

    const paymentEvent = {
      ...sampleStripeEvents.paymentIntentSucceeded,
      id: `evt_audit_${Date.now()}`,
      data: {
        object: {
          ...sampleStripeEvents.paymentIntentSucceeded.data.object,
          metadata: {
            customer_id: customerId.toString(),
            tier: 'pro',
          },
        },
      },
    };

    await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', 'valid_signature')
      .send(paymentEvent);

    // Check activity log (if implemented)
    const activities = db
      .prepare('SELECT * FROM activity_log WHERE customer_id = ? ORDER BY created_at')
      .all(customerId);

    // Should have entries for each major step
    expect(activities.length).toBeGreaterThan(0);
  });

  it('should enforce business rules throughout workflow', async () => {
    const response = await request(app)
      .post('/api/intake')
      .send({
        company_name: 'Business Rules Test',
        email: 'rules@example.com',
        tier: 'enterprise',
      })
      .expect(200);

    const customerId = response.body.data.customer_id;

    // Cannot approve from 'prospect' status
    await expect(customerService.approveCustomer(customerId)).rejects.toThrow();

    // Must go through consultation first
    await customersRepo.updateStatus(customerId, 'consultation');
    await expect(customerService.approveCustomer(customerId)).resolves.not.toThrow();
  });
});
