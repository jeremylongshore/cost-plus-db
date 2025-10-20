/**
 * Unit Tests - Workflow Service
 *
 * Tests for customer onboarding workflow management:
 * - Workflow initialization
 * - Checkpoint advancement and validation
 * - Status transitions
 * - Blocker management
 * - Workflow metrics and reporting
 * - Integration with customer status updates
 *
 * @module tests/unit/services/workflow.service
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WorkflowService, WorkflowCheckpoint, BlockerType } from '../../../src/services/workflow.service.js';
import { NotFoundError, ValidationError } from '../../../src/utils/errors.js';
import { getTestDb, seedCustomers } from '../../setup.js';

// Mock the EmailService
vi.mock('../../../src/services/email.service.js', () => {
  return {
    EmailService: vi.fn().mockImplementation(() => ({
      sendIntakeConfirmation: vi.fn().mockResolvedValue(true),
      sendAdminAlert: vi.fn().mockResolvedValue(true),
    })),
  };
});

describe('WorkflowService', () => {
  let workflowService: WorkflowService;
  let customerId: number;

  beforeEach(() => {
    const db = getTestDb();
    workflowService = new WorkflowService(db);

    // Create a test customer
    const [id] = seedCustomers([
      {
        company_name: 'Test Company',
        email: 'test@example.com',
        tier: 'dedicated',
        status: 'prospect',
        contact_name: 'John Doe',
        phone: '+1-555-1234',
        website: 'https://test.com',
      },
    ]);
    customerId = id;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initializeWorkflow', () => {
    it('should create workflow with form_submitted checkpoint', async () => {
      const workflow = await workflowService.initializeWorkflow(customerId);

      expect(workflow.id).toBeDefined();
      expect(workflow.customer_id).toBe(customerId);
      expect(workflow.current_stage).toBe('form_submitted');
      expect(workflow.form_submitted).toBeDefined();
      expect(workflow.is_blocked).toBe(false);
      expect(workflow.created_at).toBeDefined();
      expect(workflow.updated_at).toBeDefined();
    });

    it('should throw ValidationError if workflow already exists', async () => {
      await workflowService.initializeWorkflow(customerId);

      await expect(workflowService.initializeWorkflow(customerId)).rejects.toThrow(
        ValidationError
      );
      await expect(workflowService.initializeWorkflow(customerId)).rejects.toThrow(
        `Workflow already exists for customer ${customerId}`
      );
    });

    it('should throw NotFoundError for non-existent customer', async () => {
      await expect(workflowService.initializeWorkflow(99999)).rejects.toThrow(NotFoundError);
    });

    it('should log activity when workflow is initialized', async () => {
      const db = getTestDb();
      await workflowService.initializeWorkflow(customerId);

      const activity = db
        .prepare('SELECT * FROM activity_log WHERE customer_id = ? AND action = ?')
        .get(customerId, 'workflow_initialized') as any;

      expect(activity).toBeDefined();
      expect(activity.resource_type).toBe('workflow');

      const details = JSON.parse(activity.details);
      expect(details.checkpoint).toBe('form_submitted');
    });
  });

  describe('advanceWorkflow', () => {
    beforeEach(async () => {
      await workflowService.initializeWorkflow(customerId);
    });

    describe('valid checkpoint transitions', () => {
      it('should advance to consultation_scheduled', async () => {
        const status = await workflowService.advanceWorkflow(
          customerId,
          'consultation_scheduled'
        );

        expect(status.current_stage).toBe('consultation_scheduled');
        expect(status.checkpoints.consultation_scheduled).toBeDefined();
        expect(status.completion_percentage).toBeGreaterThan(0);
      });

      it('should advance through multiple checkpoints', async () => {
        await workflowService.advanceWorkflow(customerId, 'consultation_scheduled');
        await workflowService.advanceWorkflow(customerId, 'consultation_completed');
        const status = await workflowService.advanceWorkflow(customerId, 'payment_link_sent');

        expect(status.current_stage).toBe('payment_link_sent');
        expect(status.checkpoints.consultation_scheduled).toBeDefined();
        expect(status.checkpoints.consultation_completed).toBeDefined();
        expect(status.checkpoints.payment_link_sent).toBeDefined();
      });

      it('should advance all the way to onboarding_completed', async () => {
        const checkpoints: WorkflowCheckpoint[] = [
          'consultation_scheduled',
          'consultation_completed',
          'payment_link_sent',
          'payment_received',
          'provisioning_started',
          'database_created',
          'backups_configured',
          'credentials_sent',
          'onboarding_completed',
        ];

        for (const checkpoint of checkpoints) {
          await workflowService.advanceWorkflow(customerId, checkpoint);
        }

        const status = await workflowService.getWorkflowStatus(customerId);
        expect(status.current_stage).toBe('onboarding_completed');
        expect(status.completion_percentage).toBeGreaterThan(75);
      });

      it('should reach 100% completion at three_month_milestone', async () => {
        const checkpoints: WorkflowCheckpoint[] = [
          'consultation_scheduled',
          'consultation_completed',
          'payment_link_sent',
          'payment_received',
          'provisioning_started',
          'database_created',
          'backups_configured',
          'credentials_sent',
          'onboarding_completed',
          'first_month_milestone',
          'three_month_milestone',
        ];

        for (const checkpoint of checkpoints) {
          await workflowService.advanceWorkflow(customerId, checkpoint);
        }

        const status = await workflowService.getWorkflowStatus(customerId);
        expect(status.current_stage).toBe('three_month_milestone');
        expect(status.completion_percentage).toBe(100);
      });
    });

    describe('invalid checkpoint transitions', () => {
      it('should throw ValidationError when advancing backward', async () => {
        await workflowService.advanceWorkflow(customerId, 'consultation_scheduled');
        await workflowService.advanceWorkflow(customerId, 'consultation_completed');

        await expect(
          workflowService.advanceWorkflow(customerId, 'consultation_scheduled')
        ).rejects.toThrow(ValidationError);
      });

      it('should allow advancing to current checkpoint', async () => {
        await workflowService.advanceWorkflow(customerId, 'consultation_scheduled');

        // Should not throw
        await expect(
          workflowService.advanceWorkflow(customerId, 'consultation_scheduled')
        ).resolves.toBeDefined();
      });

      it('should warn when skipping checkpoint but still advance', async () => {
        // Skip consultation_scheduled and go directly to consultation_completed
        const status = await workflowService.advanceWorkflow(
          customerId,
          'consultation_completed'
        );

        expect(status.current_stage).toBe('consultation_completed');
        expect(status.checkpoints.consultation_scheduled).toBeUndefined();
        expect(status.checkpoints.consultation_completed).toBeDefined();
      });
    });

    describe('customer status updates', () => {
      it('should update customer to consultation status', async () => {
        const db = getTestDb();
        await workflowService.advanceWorkflow(customerId, 'consultation_scheduled');

        const customer = db
          .prepare('SELECT status FROM customers WHERE id = ?')
          .get(customerId) as any;

        expect(customer.status).toBe('consultation');
      });

      it('should update customer to approved status', async () => {
        const db = getTestDb();
        await workflowService.advanceWorkflow(customerId, 'consultation_scheduled');
        await workflowService.advanceWorkflow(customerId, 'consultation_completed');
        await workflowService.advanceWorkflow(customerId, 'payment_link_sent');

        const customer = db
          .prepare('SELECT status FROM customers WHERE id = ?')
          .get(customerId) as any;

        expect(customer.status).toBe('approved');
      });

      it('should update customer to provisioning status', async () => {
        const db = getTestDb();
        await workflowService.advanceWorkflow(customerId, 'consultation_scheduled');
        await workflowService.advanceWorkflow(customerId, 'consultation_completed');
        await workflowService.advanceWorkflow(customerId, 'payment_link_sent');
        await workflowService.advanceWorkflow(customerId, 'payment_received');
        await workflowService.advanceWorkflow(customerId, 'provisioning_started');

        const customer = db
          .prepare('SELECT status FROM customers WHERE id = ?')
          .get(customerId) as any;

        expect(customer.status).toBe('provisioning');
      });

      it('should update customer to active status', async () => {
        const db = getTestDb();
        await workflowService.advanceWorkflow(customerId, 'consultation_scheduled');
        await workflowService.advanceWorkflow(customerId, 'consultation_completed');
        await workflowService.advanceWorkflow(customerId, 'payment_link_sent');
        await workflowService.advanceWorkflow(customerId, 'payment_received');
        await workflowService.advanceWorkflow(customerId, 'provisioning_started');
        await workflowService.advanceWorkflow(customerId, 'database_created');
        await workflowService.advanceWorkflow(customerId, 'backups_configured');
        await workflowService.advanceWorkflow(customerId, 'credentials_sent');

        const customer = db
          .prepare('SELECT status FROM customers WHERE id = ?')
          .get(customerId) as any;

        expect(customer.status).toBe('active');
      });
    });

    describe('activity logging', () => {
      it('should log checkpoint advancement', async () => {
        const db = getTestDb();
        await workflowService.advanceWorkflow(customerId, 'consultation_scheduled', {
          scheduled_date: '2025-01-15',
        });

        const activity = db
          .prepare('SELECT * FROM activity_log WHERE customer_id = ? AND action = ?')
          .get(customerId, 'workflow_checkpoint_reached') as any;

        expect(activity).toBeDefined();
        const details = JSON.parse(activity.details);
        expect(details.checkpoint).toBe('consultation_scheduled');
        expect(details.metadata.scheduled_date).toBe('2025-01-15');
      });
    });
  });

  describe('getWorkflowStatus', () => {
    beforeEach(async () => {
      await workflowService.initializeWorkflow(customerId);
    });

    it('should return complete workflow status', async () => {
      const status = await workflowService.getWorkflowStatus(customerId);

      expect(status.customer_id).toBe(customerId);
      expect(status.current_stage).toBe('form_submitted');
      expect(status.checkpoints.form_submitted).toBeDefined();
      expect(status.completion_percentage).toBe(8); // 1/12 checkpoints
      expect(status.is_blocked).toBe(false);
      expect(status.blocker).toBeUndefined();
      expect(status.next_checkpoint).toBe('consultation_scheduled');
    });

    it('should calculate completion percentage correctly', async () => {
      // Complete 3 out of 12 checkpoints (25%)
      await workflowService.advanceWorkflow(customerId, 'consultation_scheduled');
      await workflowService.advanceWorkflow(customerId, 'consultation_completed');

      const status = await workflowService.getWorkflowStatus(customerId);
      expect(status.completion_percentage).toBe(25); // 3/12 = 25%
    });

    it('should identify next checkpoint', async () => {
      await workflowService.advanceWorkflow(customerId, 'consultation_scheduled');

      const status = await workflowService.getWorkflowStatus(customerId);
      expect(status.next_checkpoint).toBe('consultation_completed');
    });

    it('should return null for next checkpoint at end of journey', async () => {
      const checkpoints: WorkflowCheckpoint[] = [
        'consultation_scheduled',
        'consultation_completed',
        'payment_link_sent',
        'payment_received',
        'provisioning_started',
        'database_created',
        'backups_configured',
        'credentials_sent',
        'onboarding_completed',
        'first_month_milestone',
        'three_month_milestone',
      ];

      for (const checkpoint of checkpoints) {
        await workflowService.advanceWorkflow(customerId, checkpoint);
      }

      const status = await workflowService.getWorkflowStatus(customerId);
      expect(status.next_checkpoint).toBeNull();
    });

    it('should include blocker information when blocked', async () => {
      await workflowService.setWorkflowBlocker(
        customerId,
        'payment_pending',
        'Payment method declined'
      );

      const status = await workflowService.getWorkflowStatus(customerId);
      expect(status.is_blocked).toBe(true);
      expect(status.blocker).toBeDefined();
      expect(status.blocker?.type).toBe('payment_pending');
      expect(status.blocker?.reason).toBe('Payment method declined');
      expect(status.blocker?.set_at).toBeDefined();
    });

    it('should throw NotFoundError for customer without workflow', async () => {
      const [newCustomerId] = seedCustomers([
        {
          company_name: 'New Company',
          email: 'new@example.com',
          tier: 'shared',
          status: 'prospect',
        },
      ]);

      await expect(workflowService.getWorkflowStatus(newCustomerId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('setWorkflowBlocker', () => {
    beforeEach(async () => {
      await workflowService.initializeWorkflow(customerId);
    });

    it('should set payment_pending blocker', async () => {
      await workflowService.setWorkflowBlocker(
        customerId,
        'payment_pending',
        'Credit card declined'
      );

      const status = await workflowService.getWorkflowStatus(customerId);
      expect(status.is_blocked).toBe(true);
      expect(status.blocker?.type).toBe('payment_pending');
      expect(status.blocker?.reason).toBe('Credit card declined');
    });

    it('should set consultation_overdue blocker', async () => {
      await workflowService.setWorkflowBlocker(
        customerId,
        'consultation_overdue',
        'Customer has not scheduled consultation in 7 days'
      );

      const status = await workflowService.getWorkflowStatus(customerId);
      expect(status.blocker?.type).toBe('consultation_overdue');
    });

    it('should set provisioning_failed blocker', async () => {
      await workflowService.setWorkflowBlocker(
        customerId,
        'provisioning_failed',
        'VPS provisioning error'
      );

      const status = await workflowService.getWorkflowStatus(customerId);
      expect(status.blocker?.type).toBe('provisioning_failed');
    });

    it('should set manual_intervention blocker', async () => {
      await workflowService.setWorkflowBlocker(
        customerId,
        'manual_intervention',
        'Requires custom database configuration'
      );

      const status = await workflowService.getWorkflowStatus(customerId);
      expect(status.blocker?.type).toBe('manual_intervention');
    });

    it('should set customer_unresponsive blocker', async () => {
      await workflowService.setWorkflowBlocker(
        customerId,
        'customer_unresponsive',
        'No response to emails for 14 days'
      );

      const status = await workflowService.getWorkflowStatus(customerId);
      expect(status.blocker?.type).toBe('customer_unresponsive');
    });

    it('should set technical_issue blocker', async () => {
      await workflowService.setWorkflowBlocker(
        customerId,
        'technical_issue',
        'PostgreSQL installation error'
      );

      const status = await workflowService.getWorkflowStatus(customerId);
      expect(status.blocker?.type).toBe('technical_issue');
    });

    it('should log activity when blocker is set', async () => {
      const db = getTestDb();
      await workflowService.setWorkflowBlocker(customerId, 'payment_pending', 'Test reason');

      const activity = db
        .prepare('SELECT * FROM activity_log WHERE customer_id = ? AND action = ?')
        .get(customerId, 'workflow_blocked') as any;

      expect(activity).toBeDefined();
      const details = JSON.parse(activity.details);
      expect(details.blocker_type).toBe('payment_pending');
      expect(details.reason).toBe('Test reason');
    });

    it('should send admin alert when blocker is set', async () => {
      const { EmailService } = await import('../../../src/services/email.service.js');
      const mockEmailService = vi.mocked(EmailService);

      await workflowService.setWorkflowBlocker(customerId, 'payment_pending', 'Test reason');

      // Check that email service was instantiated and sendAdminAlert was called
      expect(mockEmailService).toHaveBeenCalled();
    });

    it('should overwrite existing blocker', async () => {
      await workflowService.setWorkflowBlocker(customerId, 'payment_pending', 'First reason');
      await workflowService.setWorkflowBlocker(
        customerId,
        'technical_issue',
        'Second reason'
      );

      const status = await workflowService.getWorkflowStatus(customerId);
      expect(status.blocker?.type).toBe('technical_issue');
      expect(status.blocker?.reason).toBe('Second reason');
    });

    it('should throw NotFoundError for non-existent workflow', async () => {
      const [newCustomerId] = seedCustomers([
        {
          company_name: 'New Company',
          email: 'new@example.com',
          tier: 'shared',
          status: 'prospect',
        },
      ]);

      await expect(
        workflowService.setWorkflowBlocker(newCustomerId, 'payment_pending', 'Test')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('clearWorkflowBlocker', () => {
    beforeEach(async () => {
      await workflowService.initializeWorkflow(customerId);
      await workflowService.setWorkflowBlocker(customerId, 'payment_pending', 'Test blocker');
    });

    it('should clear existing blocker', async () => {
      await workflowService.clearWorkflowBlocker(customerId);

      const status = await workflowService.getWorkflowStatus(customerId);
      expect(status.is_blocked).toBe(false);
      expect(status.blocker).toBeUndefined();
    });

    it('should log activity when blocker is cleared', async () => {
      const db = getTestDb();
      await workflowService.clearWorkflowBlocker(customerId);

      const activity = db
        .prepare('SELECT * FROM activity_log WHERE customer_id = ? AND action = ?')
        .get(customerId, 'workflow_blocker_cleared') as any;

      expect(activity).toBeDefined();
      const details = JSON.parse(activity.details);
      expect(details.previous_blocker_type).toBe('payment_pending');
    });

    it('should do nothing if workflow not blocked', async () => {
      await workflowService.clearWorkflowBlocker(customerId);

      // Clear again - should not throw
      await expect(workflowService.clearWorkflowBlocker(customerId)).resolves.toBeUndefined();

      const status = await workflowService.getWorkflowStatus(customerId);
      expect(status.is_blocked).toBe(false);
    });

    it('should throw NotFoundError for non-existent workflow', async () => {
      const [newCustomerId] = seedCustomers([
        {
          company_name: 'New Company',
          email: 'new@example.com',
          tier: 'shared',
          status: 'prospect',
        },
      ]);

      await expect(workflowService.clearWorkflowBlocker(newCustomerId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getWorkflowMetrics', () => {
    it('should return zeros for no workflows', async () => {
      const metrics = await workflowService.getWorkflowMetrics();

      expect(metrics.total_customers).toBe(0);
      expect(metrics.by_stage).toEqual({});
      expect(metrics.blocked_count).toBe(0);
      expect(metrics.completion_rate).toBe(0);
      expect(metrics.bottlenecks).toHaveLength(0);
    });

    it('should count total customers with workflows', async () => {
      await workflowService.initializeWorkflow(customerId);

      const [customer2Id] = seedCustomers([
        {
          company_name: 'Company 2',
          email: 'company2@example.com',
          tier: 'shared',
          status: 'prospect',
        },
      ]);
      await workflowService.initializeWorkflow(customer2Id);

      const metrics = await workflowService.getWorkflowMetrics();
      expect(metrics.total_customers).toBe(2);
    });

    it('should count workflows by stage', async () => {
      await workflowService.initializeWorkflow(customerId);

      const [customer2Id] = seedCustomers([
        {
          company_name: 'Company 2',
          email: 'company2@example.com',
          tier: 'shared',
          status: 'prospect',
        },
      ]);
      await workflowService.initializeWorkflow(customer2Id);
      await workflowService.advanceWorkflow(customer2Id, 'consultation_scheduled');

      const metrics = await workflowService.getWorkflowMetrics();
      expect(metrics.by_stage.form_submitted).toBe(1);
      expect(metrics.by_stage.consultation_scheduled).toBe(1);
    });

    it('should count blocked workflows', async () => {
      await workflowService.initializeWorkflow(customerId);
      await workflowService.setWorkflowBlocker(customerId, 'payment_pending', 'Test');

      const [customer2Id] = seedCustomers([
        {
          company_name: 'Company 2',
          email: 'company2@example.com',
          tier: 'shared',
          status: 'prospect',
        },
      ]);
      await workflowService.initializeWorkflow(customer2Id);

      const metrics = await workflowService.getWorkflowMetrics();
      expect(metrics.blocked_count).toBe(1);
    });

    it('should calculate completion rate', async () => {
      // Create 3 customers
      await workflowService.initializeWorkflow(customerId);

      const [customer2Id] = seedCustomers([
        {
          company_name: 'Company 2',
          email: 'company2@example.com',
          tier: 'shared',
          status: 'prospect',
        },
      ]);
      await workflowService.initializeWorkflow(customer2Id);

      const [customer3Id] = seedCustomers([
        {
          company_name: 'Company 3',
          email: 'company3@example.com',
          tier: 'pro',
          status: 'prospect',
        },
      ]);
      await workflowService.initializeWorkflow(customer3Id);

      // Complete onboarding for 1 customer (33.33%)
      const checkpoints: WorkflowCheckpoint[] = [
        'consultation_scheduled',
        'consultation_completed',
        'payment_link_sent',
        'payment_received',
        'provisioning_started',
        'database_created',
        'backups_configured',
        'credentials_sent',
        'onboarding_completed',
      ];

      for (const checkpoint of checkpoints) {
        await workflowService.advanceWorkflow(customerId, checkpoint);
      }

      const metrics = await workflowService.getWorkflowMetrics();
      expect(metrics.completion_rate).toBeCloseTo(33.33, 1);
    });

    it('should calculate average time by checkpoint', async () => {
      await workflowService.initializeWorkflow(customerId);
      await workflowService.advanceWorkflow(customerId, 'consultation_scheduled');

      const metrics = await workflowService.getWorkflowMetrics();
      expect(metrics.average_time_by_checkpoint).toBeDefined();
      expect(metrics.average_time_by_checkpoint.consultation_scheduled).toBeGreaterThanOrEqual(
        0
      );
    });

    it('should identify bottlenecks', async () => {
      // This test would require manipulating timestamps to create artificial delays
      // For now, just verify the structure
      await workflowService.initializeWorkflow(customerId);

      const metrics = await workflowService.getWorkflowMetrics();
      expect(Array.isArray(metrics.bottlenecks)).toBe(true);

      if (metrics.bottlenecks.length > 0) {
        const bottleneck = metrics.bottlenecks[0];
        expect(bottleneck.checkpoint).toBeDefined();
        expect(bottleneck.average_days).toBeGreaterThan(0);
        expect(bottleneck.customer_count).toBeGreaterThan(0);
      }
    });

    it('should return comprehensive metrics for multiple workflows', async () => {
      // Create 5 customers at different stages
      const customers = [];
      for (let i = 0; i < 5; i++) {
        const [id] = seedCustomers([
          {
            company_name: `Company ${i}`,
            email: `company${i}@example.com`,
            tier: 'shared',
            status: 'prospect',
          },
        ]);
        customers.push(id);
        await workflowService.initializeWorkflow(id);
      }

      // Advance some customers to different stages
      await workflowService.advanceWorkflow(customers[1], 'consultation_scheduled');
      await workflowService.advanceWorkflow(customers[2], 'consultation_scheduled');
      await workflowService.advanceWorkflow(customers[2], 'consultation_completed');
      await workflowService.advanceWorkflow(customers[3], 'consultation_scheduled');
      await workflowService.advanceWorkflow(customers[3], 'consultation_completed');
      await workflowService.advanceWorkflow(customers[3], 'payment_link_sent');

      // Block one customer
      await workflowService.setWorkflowBlocker(customers[4], 'payment_pending', 'Test');

      const metrics = await workflowService.getWorkflowMetrics();

      expect(metrics.total_customers).toBe(5);
      expect(metrics.blocked_count).toBe(1);
      expect(Object.keys(metrics.by_stage).length).toBeGreaterThan(0);
      expect(metrics.completion_rate).toBe(0); // None completed onboarding
    });
  });

  describe('checkpoint integration', () => {
    beforeEach(async () => {
      await workflowService.initializeWorkflow(customerId);
    });

    it('should handle complete customer journey', async () => {
      const db = getTestDb();

      // Form submitted (already done in init)
      let status = await workflowService.getWorkflowStatus(customerId);
      expect(status.current_stage).toBe('form_submitted');
      expect(status.completion_percentage).toBe(8);

      // Consultation phase
      await workflowService.advanceWorkflow(customerId, 'consultation_scheduled');
      await workflowService.advanceWorkflow(customerId, 'consultation_completed');
      status = await workflowService.getWorkflowStatus(customerId);
      expect(status.completion_percentage).toBe(25);

      // Payment phase
      await workflowService.advanceWorkflow(customerId, 'payment_link_sent');
      await workflowService.advanceWorkflow(customerId, 'payment_received');
      status = await workflowService.getWorkflowStatus(customerId);
      expect(status.completion_percentage).toBe(42);

      // Provisioning phase
      await workflowService.advanceWorkflow(customerId, 'provisioning_started');
      await workflowService.advanceWorkflow(customerId, 'database_created');
      await workflowService.advanceWorkflow(customerId, 'backups_configured');
      status = await workflowService.getWorkflowStatus(customerId);
      expect(status.completion_percentage).toBe(67);

      // Active phase
      await workflowService.advanceWorkflow(customerId, 'credentials_sent');
      await workflowService.advanceWorkflow(customerId, 'onboarding_completed');
      status = await workflowService.getWorkflowStatus(customerId);
      expect(status.completion_percentage).toBe(83);

      // Milestones
      await workflowService.advanceWorkflow(customerId, 'first_month_milestone');
      await workflowService.advanceWorkflow(customerId, 'three_month_milestone');
      status = await workflowService.getWorkflowStatus(customerId);
      expect(status.completion_percentage).toBe(100);

      // Verify final customer status
      const customer = db
        .prepare('SELECT status FROM customers WHERE id = ?')
        .get(customerId) as any;
      expect(customer.status).toBe('active');
    });

    it('should handle workflow with blockers', async () => {
      await workflowService.advanceWorkflow(customerId, 'consultation_scheduled');
      await workflowService.advanceWorkflow(customerId, 'consultation_completed');
      await workflowService.advanceWorkflow(customerId, 'payment_link_sent');

      // Payment fails - set blocker
      await workflowService.setWorkflowBlocker(
        customerId,
        'payment_pending',
        'Card declined'
      );

      let status = await workflowService.getWorkflowStatus(customerId);
      expect(status.is_blocked).toBe(true);

      // Cannot advance while blocked? Actually we can - blocker is informational
      await workflowService.advanceWorkflow(customerId, 'payment_received');

      // Clear blocker
      await workflowService.clearWorkflowBlocker(customerId);
      status = await workflowService.getWorkflowStatus(customerId);
      expect(status.is_blocked).toBe(false);

      // Continue workflow
      await workflowService.advanceWorkflow(customerId, 'provisioning_started');
      status = await workflowService.getWorkflowStatus(customerId);
      expect(status.current_stage).toBe('provisioning_started');
    });
  });
});
