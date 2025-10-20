/**
 * E2E Test: Customer Onboarding Workflow
 *
 * Tests the complete end-to-end customer journey from form submission
 * through database provisioning and activation with full workflow tracking.
 *
 * Test Scenarios:
 * 1. Happy Path - Complete onboarding flow with all 12 workflow checkpoints
 * 2. Payment Failure - Blocked workflow with recovery
 * 3. Provisioning Failure - Blocked workflow with manual intervention
 *
 * @module tests/e2e/customer-onboarding
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/api/app.js';
import { getTestDb } from '../setup.js';
import { CustomersRepository } from '../../src/database/repositories/customers.repository.js';
import { CustomerService } from '../../src/services/customer.service.js';
import { WorkflowService, WorkflowCheckpoint } from '../../src/services/workflow.service.js';
import { CustomerStatus } from '../../src/database/schema.js';
import { sampleStripeEvents } from '../fixtures/customers.js';

describe('E2E: Customer Onboarding Workflow', () => {
  let db: any;
  let customersRepo: CustomersRepository;
  let customerService: CustomerService;
  let workflowService: WorkflowService;

  beforeEach(() => {
    db = getTestDb();
    customersRepo = new CustomersRepository(db);
    customerService = new CustomerService(customersRepo);
    workflowService = new WorkflowService(db);
  });

  /**
   * Helper: Get workflow from database
   */
  function getWorkflow(customerId: number): any {
    const stmt = db.prepare('SELECT * FROM customer_workflow WHERE customer_id = ?');
    return stmt.get(customerId);
  }

  /**
   * Helper: Get billing records
   */
  function getBillingRecords(customerId: number): any[] {
    const stmt = db.prepare('SELECT * FROM billing_records WHERE customer_id = ?');
    return stmt.all(customerId);
  }

  /**
   * Helper: Advance workflow checkpoint
   */
  async function advanceWorkflow(customerId: number, checkpoint: WorkflowCheckpoint): Promise<void> {
    await workflowService.advanceWorkflow(customerId, checkpoint);
  }

  it('should complete full onboarding workflow with all checkpoints tracked', async () => {
    const startTime = Date.now();

    // ========================================================================
    // STEP 1: Submit intake form
    // ========================================================================
    const intakeFormData = {
      company_name: 'Acme Corp',
      primary_contact_name: 'John Doe',
      primary_contact_email: 'john@acme.com',
      primary_contact_phone: '+1-555-0123',
      tier_interest: 'dedicated',
      website: 'https://acme.com',
      use_case: 'SaaS application database',
      peak_traffic: '10000 requests/minute',
      compliance: ['soc2', 'gdpr'],
    };

    const intakeResponse = await request(app)
      .post('/api/intake')
      .send(intakeFormData)
      .expect(201);

    expect(intakeResponse.body.success).toBe(true);
    expect(intakeResponse.body.data).toHaveProperty('customer_id');

    const customerId = intakeResponse.body.data.customer_id;

    // Verify customer created with prospect status
    let customer = await customersRepo.findById(customerId);
    expect(customer.status).toBe('prospect');
    expect(customer.company_name).toBe('Acme Corp');
    expect(customer.email).toBe('john@acme.com');
    expect(customer.tier).toBe('dedicated');

    // Initialize workflow
    await workflowService.initializeWorkflow(customerId);
    let workflow = getWorkflow(customerId);
    expect(workflow).toBeDefined();
    expect(workflow.current_stage).toBe('form_submitted');
    expect(workflow.form_submitted).toBeTruthy();

    console.log('✓ Step 1: Intake form submitted and workflow initialized');

    // ========================================================================
    // STEP 2: Admin schedules consultation
    // ========================================================================
    await advanceWorkflow(customerId, 'consultation_scheduled');

    workflow = getWorkflow(customerId);
    expect(workflow.current_stage).toBe('consultation_scheduled');
    expect(workflow.consultation_scheduled).toBeTruthy();

    await customersRepo.updateStatus(customerId, 'consultation');
    expect((await customersRepo.findById(customerId)).status).toBe('consultation');

    console.log('✓ Step 2: Consultation scheduled');

    // ========================================================================
    // STEP 3: Consultation completed
    // ========================================================================
    await advanceWorkflow(customerId, 'consultation_completed');

    workflow = getWorkflow(customerId);
    expect(workflow.current_stage).toBe('consultation_completed');
    expect(workflow.consultation_completed).toBeTruthy();

    console.log('✓ Step 3: Consultation completed');

    // ========================================================================
    // STEP 4: Admin approves customer
    // ========================================================================
    const approveResponse = await request(app)
      .post(`/api/admin/approve/${customerId}`)
      .expect(200);

    expect(approveResponse.body.success).toBe(true);
    expect((await customersRepo.findById(customerId)).status).toBe('approved');

    await advanceWorkflow(customerId, 'payment_link_sent');
    workflow = getWorkflow(customerId);
    expect(workflow.current_stage).toBe('payment_link_sent');
    expect(workflow.payment_link_sent).toBeTruthy();

    console.log('✓ Step 4: Customer approved and payment link sent');

    // ========================================================================
    // STEP 5: Payment processed (Stripe webhook simulation)
    // ========================================================================
    // Create billing record manually (simulating webhook handler)
    const billingStmt = db.prepare(`
      INSERT INTO billing_records (
        customer_id, amount, currency, status,
        stripe_payment_intent_id, billing_period_start, billing_period_end
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    billingStmt.run(customerId, 89.00, 'USD', 'paid', 'pi_test_payment_intent', now, periodEnd);

    // Verify billing record created
    const billingRecords = getBillingRecords(customerId);
    expect(billingRecords).toHaveLength(1);
    expect(billingRecords[0].status).toBe('paid');
    expect(billingRecords[0].amount).toBe(89.00);

    await advanceWorkflow(customerId, 'payment_received');
    workflow = getWorkflow(customerId);
    expect(workflow.current_stage).toBe('payment_received');
    expect(workflow.payment_received).toBeTruthy();

    console.log('✓ Step 5: Payment received and recorded');

    // ========================================================================
    // STEP 6: Database provisioning
    // ========================================================================
    const provisionResponse = await request(app)
      .post(`/api/admin/customers/${customerId}/provision`)
      .expect(200);

    expect(provisionResponse.body.success).toBe(true);
    expect(provisionResponse.body.data.status).toBe('provisioning');
    expect((await customersRepo.findById(customerId)).status).toBe('provisioning');

    await advanceWorkflow(customerId, 'provisioning_started');
    workflow = getWorkflow(customerId);
    expect(workflow.current_stage).toBe('provisioning_started');
    expect(workflow.provisioning_started).toBeTruthy();

    console.log('✓ Step 6a: Provisioning started');

    // Simulate database creation
    const dbStmt = db.prepare(`
      INSERT INTO customer_databases (
        customer_id, database_name, host, port, username, password_hash,
        ssl_enabled, connection_limit, storage_gb, backup_enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    dbStmt.run(
      customerId,
      'acme_corp_db',
      'db-dedicated-01.costplusdb.io',
      5432,
      'acme_admin',
      '$argon2id$v=19$m=65536,t=3,p=4$somehash',
      1,
      100,
      50,
      1
    );

    await advanceWorkflow(customerId, 'database_created');
    workflow = getWorkflow(customerId);
    expect(workflow.current_stage).toBe('database_created');
    expect(workflow.database_created).toBeTruthy();

    console.log('✓ Step 6b: Database created');

    await advanceWorkflow(customerId, 'backups_configured');
    workflow = getWorkflow(customerId);
    expect(workflow.current_stage).toBe('backups_configured');
    expect(workflow.backups_configured).toBeTruthy();

    console.log('✓ Step 6c: Backups configured');

    // ========================================================================
    // STEP 7: Credentials delivered
    // ========================================================================
    await advanceWorkflow(customerId, 'credentials_sent');
    workflow = getWorkflow(customerId);
    expect(workflow.current_stage).toBe('credentials_sent');
    expect(workflow.credentials_sent).toBeTruthy();

    await customersRepo.updateStatus(customerId, 'active');
    expect((await customersRepo.findById(customerId)).status).toBe('active');

    console.log('✓ Step 7: Credentials sent and customer activated');

    // ========================================================================
    // STEP 8: Onboarding completed
    // ========================================================================
    await advanceWorkflow(customerId, 'onboarding_completed');
    workflow = getWorkflow(customerId);
    expect(workflow.current_stage).toBe('onboarding_completed');
    expect(workflow.onboarding_completed).toBeTruthy();

    console.log('✓ Step 8: Onboarding completed');

    // ========================================================================
    // FINAL VERIFICATION
    // ========================================================================
    const finalCustomer = await customersRepo.findById(customerId);
    const finalWorkflow = getWorkflow(customerId);

    expect(finalCustomer.status).toBe('active');

    // All checkpoints completed (except future milestones)
    expect(finalWorkflow.form_submitted).toBeTruthy();
    expect(finalWorkflow.consultation_scheduled).toBeTruthy();
    expect(finalWorkflow.consultation_completed).toBeTruthy();
    expect(finalWorkflow.payment_link_sent).toBeTruthy();
    expect(finalWorkflow.payment_received).toBeTruthy();
    expect(finalWorkflow.provisioning_started).toBeTruthy();
    expect(finalWorkflow.database_created).toBeTruthy();
    expect(finalWorkflow.backups_configured).toBeTruthy();
    expect(finalWorkflow.credentials_sent).toBeTruthy();
    expect(finalWorkflow.onboarding_completed).toBeTruthy();

    // No blockers
    expect(finalWorkflow.is_blocked).toBe(0);

    // Verify database record
    const databases = db.prepare('SELECT * FROM customer_databases WHERE customer_id = ?').all(customerId);
    expect(databases).toHaveLength(1);
    expect(databases[0].database_name).toBe('acme_corp_db');

    // Calculate duration
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    console.log(`\n✅ HAPPY PATH COMPLETE - Total test duration: ${durationMs}ms`);

    // Verify workflow status
    const workflowStatus = await workflowService.getWorkflowStatus(customerId);
    expect(workflowStatus.current_stage).toBe('onboarding_completed');
    expect(workflowStatus.is_blocked).toBe(false);
    expect(workflowStatus.completion_percentage).toBeGreaterThanOrEqual(83);
  });

  it('should block workflow on payment failure and resume after successful payment', async () => {
    // ========================================================================
    // STEP 1: Setup customer through payment link sent
    // ========================================================================
    const intakeFormData = {
      company_name: 'Failed Payment Co',
      primary_contact_name: 'Jane Smith',
      primary_contact_email: 'jane@failedpayment.com',
      tier_interest: 'shared',
    };

    const intakeResponse = await request(app)
      .post('/api/intake')
      .send(intakeFormData)
      .expect(201);

    const customerId = intakeResponse.body.data.customer_id;

    // Fast-forward through consultation
    await workflowService.initializeWorkflow(customerId);
    await customersRepo.updateStatus(customerId, 'consultation');
    await advanceWorkflow(customerId, 'consultation_scheduled');
    await advanceWorkflow(customerId, 'consultation_completed');

    // Approve customer
    await request(app)
      .post(`/api/admin/approve/${customerId}`)
      .expect(200);

    await advanceWorkflow(customerId, 'payment_link_sent');

    console.log('✓ Customer approved and payment link sent');

    // ========================================================================
    // STEP 2: Payment fails
    // ========================================================================
    const billingStmt = db.prepare(`
      INSERT INTO billing_records (
        customer_id, amount, currency, status,
        stripe_payment_intent_id, billing_period_start, billing_period_end
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    const later = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    billingStmt.run(customerId, 49.00, 'USD', 'failed', 'pi_test_failed', now, later);

    // Verify failed billing record
    const billingRecords = getBillingRecords(customerId);
    expect(billingRecords).toHaveLength(1);
    expect(billingRecords[0].status).toBe('failed');

    // Set workflow blocker
    await workflowService.setWorkflowBlocker(
      customerId,
      'payment_pending',
      'Payment failed: card declined'
    );

    console.log('✓ Payment failed and workflow blocked');

    // ========================================================================
    // STEP 3: Verify workflow is blocked
    // ========================================================================
    let workflow = getWorkflow(customerId);
    expect(workflow.is_blocked).toBe(1);
    expect(workflow.blocker_type).toBe('payment_pending');
    expect(workflow.blocker_reason).toBe('Payment failed: card declined');

    const workflowStatus = await workflowService.getWorkflowStatus(customerId);
    expect(workflowStatus.is_blocked).toBe(true);
    expect(workflowStatus.blocker?.type).toBe('payment_pending');
    expect(workflow.current_stage).toBe('payment_link_sent');

    console.log('✓ Workflow confirmed blocked at payment stage');

    // ========================================================================
    // STEP 4: Customer updates payment method and retries
    // ========================================================================
    const successfulBillingStmt = db.prepare(`
      INSERT INTO billing_records (
        customer_id, amount, currency, status,
        stripe_payment_intent_id, billing_period_start, billing_period_end
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    successfulBillingStmt.run(customerId, 49.00, 'USD', 'paid', 'pi_test_success_retry', now, later);

    // Clear blocker
    await workflowService.clearWorkflowBlocker(customerId);

    workflow = getWorkflow(customerId);
    expect(workflow.is_blocked).toBe(0);
    expect(workflow.blocker_type).toBeNull();

    console.log('✓ Payment succeeded and blocker cleared');

    // ========================================================================
    // STEP 5: Resume workflow
    // ========================================================================
    await advanceWorkflow(customerId, 'payment_received');

    workflow = getWorkflow(customerId);
    expect(workflow.current_stage).toBe('payment_received');
    expect(workflow.payment_received).toBeTruthy();

    await request(app)
      .post(`/api/admin/customers/${customerId}/provision`)
      .expect(200);

    expect((await customersRepo.findById(customerId)).status).toBe('provisioning');

    console.log('✓ Workflow resumed and provisioning started');

    // ========================================================================
    // FINAL VERIFICATION
    // ========================================================================
    const finalWorkflowStatus = await workflowService.getWorkflowStatus(customerId);
    expect(finalWorkflowStatus.is_blocked).toBe(false);
    expect(finalWorkflowStatus.current_stage).toBe('payment_received');

    // Verify we have 2 billing records (1 failed, 1 paid)
    const allBillingRecords = getBillingRecords(customerId);
    expect(allBillingRecords).toHaveLength(2);
    expect(allBillingRecords.filter((r) => r.status === 'failed')).toHaveLength(1);
    expect(allBillingRecords.filter((r) => r.status === 'paid')).toHaveLength(1);

    console.log('\n✅ PAYMENT FAILURE SCENARIO COMPLETE - Workflow recovered successfully');
  });

  it('should block workflow on provisioning failure and resume after manual intervention', async () => {
    // ========================================================================
    // STEP 1: Setup customer through payment
    // ========================================================================
    const intakeFormData = {
      company_name: 'Provisioning Fail Inc',
      primary_contact_name: 'Bob Johnson',
      primary_contact_email: 'bob@provfail.com',
      tier_interest: 'pro',
    };

    const intakeResponse = await request(app)
      .post('/api/intake')
      .send(intakeFormData)
      .expect(201);

    const customerId = intakeResponse.body.data.customer_id;

    // Fast-forward through intake, consultation, approval, payment
    await workflowService.initializeWorkflow(customerId);
    await customersRepo.updateStatus(customerId, 'consultation');
    await advanceWorkflow(customerId, 'consultation_scheduled');
    await advanceWorkflow(customerId, 'consultation_completed');

    await request(app)
      .post(`/api/admin/approve/${customerId}`)
      .expect(200);

    await advanceWorkflow(customerId, 'payment_link_sent');

    // Record successful payment
    const billingStmt = db.prepare(`
      INSERT INTO billing_records (
        customer_id, amount, currency, status,
        stripe_payment_intent_id, billing_period_start, billing_period_end
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    const later = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    billingStmt.run(customerId, 129.00, 'USD', 'paid', 'pi_test_pro', now, later);
    await advanceWorkflow(customerId, 'payment_received');

    console.log('✓ Customer setup complete through payment');

    // ========================================================================
    // STEP 2: Start provisioning
    // ========================================================================
    await request(app)
      .post(`/api/admin/customers/${customerId}/provision`)
      .expect(200);

    expect((await customersRepo.findById(customerId)).status).toBe('provisioning');
    await advanceWorkflow(customerId, 'provisioning_started');

    console.log('✓ Provisioning started');

    // ========================================================================
    // STEP 3: Provisioning fails
    // ========================================================================
    await workflowService.setWorkflowBlocker(
      customerId,
      'provisioning_failed',
      'VPS creation timeout - infrastructure provider issue'
    );

    let workflow = getWorkflow(customerId);
    expect(workflow.is_blocked).toBe(1);
    expect(workflow.blocker_type).toBe('provisioning_failed');
    expect((await customersRepo.findById(customerId)).status).toBe('provisioning');

    console.log('✓ Provisioning failed and workflow blocked');

    // ========================================================================
    // STEP 4: Verify workflow blocked
    // ========================================================================
    const blockedStatus = await workflowService.getWorkflowStatus(customerId);
    expect(blockedStatus.is_blocked).toBe(true);
    expect(blockedStatus.blocker?.type).toBe('provisioning_failed');
    expect(blockedStatus.current_stage).toBe('provisioning_started');
    expect(workflow.database_created).toBeNull();

    console.log('✓ Workflow confirmed blocked at provisioning stage');

    // ========================================================================
    // STEP 5: Manual intervention - retry provisioning
    // ========================================================================
    const dbStmt = db.prepare(`
      INSERT INTO customer_databases (
        customer_id, database_name, host, port,
        username, password_hash, ssl_enabled,
        connection_limit, storage_gb, backup_enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    dbStmt.run(
      customerId,
      'provfail_inc_db',
      'db-pro-02.costplusdb.io',
      5432,
      'provfail_admin',
      '$argon2id$v=19$m=65536,t=3,p=4$somehash',
      1,
      200,
      100,
      1
    );

    await workflowService.clearWorkflowBlocker(customerId);

    workflow = getWorkflow(customerId);
    expect(workflow.is_blocked).toBe(0);

    console.log('✓ Manual provisioning successful and blocker cleared');

    // ========================================================================
    // STEP 6: Resume workflow
    // ========================================================================
    await advanceWorkflow(customerId, 'database_created');
    await advanceWorkflow(customerId, 'backups_configured');
    await advanceWorkflow(customerId, 'credentials_sent');

    await customersRepo.updateStatus(customerId, 'active');

    await advanceWorkflow(customerId, 'onboarding_completed');

    console.log('✓ Workflow resumed and onboarding completed');

    // ========================================================================
    // FINAL VERIFICATION
    // ========================================================================
    const finalCustomer = await customersRepo.findById(customerId);
    const finalWorkflow = getWorkflow(customerId);

    expect(finalCustomer.status).toBe('active');
    expect(finalWorkflow.current_stage).toBe('onboarding_completed');
    expect(finalWorkflow.is_blocked).toBe(0);

    const databases = db.prepare('SELECT * FROM customer_databases WHERE customer_id = ?').all(customerId);
    expect(databases).toHaveLength(1);
    expect(databases[0].host).toBe('db-pro-02.costplusdb.io');

    // Verify all checkpoints completed
    expect(finalWorkflow.provisioning_started).toBeTruthy();
    expect(finalWorkflow.database_created).toBeTruthy();
    expect(finalWorkflow.backups_configured).toBeTruthy();
    expect(finalWorkflow.credentials_sent).toBeTruthy();
    expect(finalWorkflow.onboarding_completed).toBeTruthy();

    console.log('\n✅ PROVISIONING FAILURE SCENARIO COMPLETE - Workflow recovered after manual intervention');
  });
});
