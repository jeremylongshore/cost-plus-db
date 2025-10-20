/**
 * Workflow Service
 *
 * Manages customer onboarding workflow and status transitions:
 * - 12-checkpoint customer journey tracking
 * - Workflow initialization and advancement
 * - Status transition validation
 * - Blocker detection and management
 * - Automated notifications
 * - Workflow metrics and reporting
 *
 * @module services/workflow
 */

import Database from 'better-sqlite3';
import { CustomerStatus, CustomerWorkflow } from '../database/schema.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { EmailService } from './email.service.js';

/**
 * Workflow checkpoints in customer journey (12 total)
 */
export type WorkflowCheckpoint =
  | 'form_submitted'
  | 'consultation_scheduled'
  | 'consultation_completed'
  | 'payment_link_sent'
  | 'payment_received'
  | 'provisioning_started'
  | 'database_created'
  | 'backups_configured'
  | 'credentials_sent'
  | 'onboarding_completed'
  | 'first_month_milestone'
  | 'three_month_milestone';

/**
 * Ordered list of checkpoints for validation
 */
const CHECKPOINT_ORDER: WorkflowCheckpoint[] = [
  'form_submitted',
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

/**
 * Checkpoint to status mapping
 */
const CHECKPOINT_STATUS_MAP: Record<WorkflowCheckpoint, CustomerStatus> = {
  form_submitted: 'prospect',
  consultation_scheduled: 'consultation',
  consultation_completed: 'consultation',
  payment_link_sent: 'approved',
  payment_received: 'approved',
  provisioning_started: 'provisioning',
  database_created: 'provisioning',
  backups_configured: 'provisioning',
  credentials_sent: 'active',
  onboarding_completed: 'active',
  first_month_milestone: 'active',
  three_month_milestone: 'active',
};

/**
 * Workflow status response
 */
export interface WorkflowStatus {
  customer_id: number;
  current_stage: WorkflowCheckpoint;
  checkpoints: {
    [K in WorkflowCheckpoint]?: string; // Timestamp if completed
  };
  completion_percentage: number;
  is_blocked: boolean;
  blocker?: {
    type: string;
    reason: string;
    set_at: string;
  };
  next_checkpoint: WorkflowCheckpoint | null;
}

/**
 * Workflow metrics response
 */
export interface WorkflowMetrics {
  total_customers: number;
  by_stage: Record<string, number>;
  average_time_by_checkpoint: Record<WorkflowCheckpoint, number>;
  bottlenecks: Array<{
    checkpoint: WorkflowCheckpoint;
    average_days: number;
    customer_count: number;
  }>;
  blocked_count: number;
  completion_rate: number;
}

/**
 * Blocker type
 */
export type BlockerType =
  | 'payment_pending'
  | 'consultation_overdue'
  | 'provisioning_failed'
  | 'manual_intervention'
  | 'customer_unresponsive'
  | 'technical_issue';

/**
 * Workflow service class
 */
export class WorkflowService {
  private emailService: EmailService;

  constructor(private db: Database.Database) {
    this.emailService = new EmailService();
  }

  /**
   * Initialize workflow for a new customer
   *
   * Creates the workflow record and sets the first checkpoint (form_submitted).
   *
   * @param customerId - Customer ID
   * @returns Created workflow record
   */
  async initializeWorkflow(customerId: number): Promise<CustomerWorkflow> {
    logger.info('Initializing workflow', { customerId });

    // Verify customer exists
    await this.getCustomer(customerId);

    // Check if workflow already exists
    const existing = this.db
      .prepare('SELECT id FROM customer_workflow WHERE customer_id = ?')
      .get(customerId);

    if (existing) {
      throw new ValidationError(`Workflow already exists for customer ${customerId}`);
    }

    // Create workflow record with first checkpoint
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO customer_workflow (
        customer_id,
        current_stage,
        form_submitted,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(customerId, 'form_submitted', now, now, now);

    // Log activity
    await this.logActivity(customerId, 'workflow_initialized', {
      checkpoint: 'form_submitted',
      timestamp: now,
    });

    logger.info('Workflow initialized', { customerId, workflowId: result.lastInsertRowid });

    // Get and return the created workflow
    return this.getWorkflowRecord(customerId);
  }

  /**
   * Advance workflow to next checkpoint
   *
   * Validates checkpoint order, updates timestamp, and triggers automatic actions.
   *
   * @param customerId - Customer ID
   * @param checkpoint - Target checkpoint
   * @param metadata - Optional metadata for the checkpoint
   * @returns Updated workflow status
   */
  async advanceWorkflow(
    customerId: number,
    checkpoint: WorkflowCheckpoint,
    metadata?: Record<string, any>
  ): Promise<WorkflowStatus> {
    logger.info('Advancing workflow', { customerId, checkpoint, metadata });

    // Get current workflow
    const workflow = await this.getWorkflowRecord(customerId);

    // Validate checkpoint order
    this.validateCheckpointOrder(workflow, checkpoint);

    // Update checkpoint timestamp and current_stage
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE customer_workflow
      SET ${checkpoint} = ?,
          current_stage = ?,
          updated_at = ?
      WHERE customer_id = ?
    `);

    stmt.run(now, checkpoint, now, customerId);

    // Log to activity_log
    await this.logActivity(customerId, 'workflow_checkpoint_reached', {
      checkpoint,
      timestamp: now,
      metadata,
    });

    // Update customer status if needed
    const expectedStatus = CHECKPOINT_STATUS_MAP[checkpoint];
    const customer = await this.getCustomer(customerId);
    if (customer.status !== expectedStatus) {
      await this.updateCustomerStatus(customerId, expectedStatus);
    }

    // Trigger automatic actions based on checkpoint
    await this.triggerAutomaticActions(customerId, checkpoint, metadata);

    logger.info('Workflow advanced', { customerId, checkpoint });

    // Return updated status
    return this.getWorkflowStatus(customerId);
  }

  /**
   * Get workflow status for customer
   *
   * Returns current stage, all checkpoint timestamps, and progress metrics.
   *
   * @param customerId - Customer ID
   * @returns Workflow status with progress
   */
  async getWorkflowStatus(customerId: number): Promise<WorkflowStatus> {
    logger.debug('Getting workflow status', { customerId });

    const workflow = await this.getWorkflowRecord(customerId);

    // Build checkpoints object
    const checkpoints: WorkflowStatus['checkpoints'] = {};
    for (const checkpoint of CHECKPOINT_ORDER) {
      const timestamp = workflow[checkpoint as keyof CustomerWorkflow];
      if (timestamp && typeof timestamp === 'string') {
        checkpoints[checkpoint] = timestamp;
      }
    }

    // Calculate completion percentage
    const completedCount = Object.keys(checkpoints).length;
    const completion_percentage = Math.round((completedCount / CHECKPOINT_ORDER.length) * 100);

    // Find next checkpoint
    const currentIndex = CHECKPOINT_ORDER.indexOf(workflow.current_stage as WorkflowCheckpoint);
    const next_checkpoint =
      currentIndex < CHECKPOINT_ORDER.length - 1 ? CHECKPOINT_ORDER[currentIndex + 1] : null;

    // Build blocker info
    const blocker = workflow.is_blocked
      ? {
          type: workflow.blocker_type!,
          reason: workflow.blocker_reason!,
          set_at: workflow.blocker_set_at!,
        }
      : undefined;

    const status: WorkflowStatus = {
      customer_id: customerId,
      current_stage: workflow.current_stage as WorkflowCheckpoint,
      checkpoints,
      completion_percentage,
      is_blocked: Boolean(workflow.is_blocked),
      next_checkpoint: next_checkpoint || null,
    };

    if (blocker !== undefined) {
      status.blocker = blocker;
    }

    return status;
  }

  /**
   * Set workflow blocker
   *
   * Marks workflow as blocked with reason and sends admin alert.
   *
   * @param customerId - Customer ID
   * @param blockerType - Type of blocker
   * @param reason - Detailed reason for blocker
   */
  async setWorkflowBlocker(
    customerId: number,
    blockerType: BlockerType,
    reason: string
  ): Promise<void> {
    logger.warn('Setting workflow blocker', { customerId, blockerType, reason });

    // Verify workflow exists
    await this.getWorkflowRecord(customerId);

    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE customer_workflow
      SET is_blocked = 1,
          blocker_type = ?,
          blocker_reason = ?,
          blocker_set_at = ?,
          updated_at = ?
      WHERE customer_id = ?
    `);

    stmt.run(blockerType, reason, now, now, customerId);

    // Log activity
    await this.logActivity(customerId, 'workflow_blocked', {
      blocker_type: blockerType,
      reason,
      timestamp: now,
    });

    // Send admin alert
    const customer = await this.getCustomer(customerId);
    await this.emailService.sendAdminAlert(
      `Workflow Blocked: ${blockerType}`,
      `Customer ${customerId} (${customer.company_name}) - ${reason}`,
      'warning'
    );

    logger.info('Workflow blocker set', { customerId, blockerType });
  }

  /**
   * Clear workflow blocker
   *
   * Removes blocker and resumes normal workflow.
   *
   * @param customerId - Customer ID
   */
  async clearWorkflowBlocker(customerId: number): Promise<void> {
    logger.info('Clearing workflow blocker', { customerId });

    // Verify workflow exists
    const workflow = await this.getWorkflowRecord(customerId);

    if (!workflow.is_blocked) {
      logger.warn('Workflow not blocked, nothing to clear', { customerId });
      return;
    }

    const stmt = this.db.prepare(`
      UPDATE customer_workflow
      SET is_blocked = 0,
          blocker_type = NULL,
          blocker_reason = NULL,
          blocker_set_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE customer_id = ?
    `);

    stmt.run(customerId);

    // Log activity
    await this.logActivity(customerId, 'workflow_blocker_cleared', {
      previous_blocker_type: workflow.blocker_type,
      timestamp: new Date().toISOString(),
    });

    logger.info('Workflow blocker cleared', { customerId });
  }

  /**
   * Get workflow metrics
   *
   * Returns admin dashboard metrics including bottlenecks and completion rates.
   *
   * @returns Workflow metrics
   */
  async getWorkflowMetrics(): Promise<WorkflowMetrics> {
    logger.debug('Getting workflow metrics');

    // Total customers with workflows
    const totalResult = this.db
      .prepare('SELECT COUNT(*) as count FROM customer_workflow')
      .get() as { count: number };
    const total_customers = totalResult.count;

    // Count by stage
    const stageResults = this.db
      .prepare(
        `SELECT current_stage, COUNT(*) as count
         FROM customer_workflow
         GROUP BY current_stage`
      )
      .all() as Array<{ current_stage: string; count: number }>;

    const by_stage: Record<string, number> = {};
    for (const row of stageResults) {
      by_stage[row.current_stage] = row.count;
    }

    // Average time between checkpoints
    const average_time_by_checkpoint = await this.calculateAverageTimeBetweenCheckpoints();

    // Identify bottlenecks (checkpoints taking >7 days on average)
    const bottlenecks: WorkflowMetrics['bottlenecks'] = [];
    for (const [checkpoint, avgDays] of Object.entries(average_time_by_checkpoint)) {
      if (avgDays > 7) {
        const count =
          by_stage[checkpoint] || 0;
        bottlenecks.push({
          checkpoint: checkpoint as WorkflowCheckpoint,
          average_days: avgDays,
          customer_count: count,
        });
      }
    }

    // Blocked count
    const blockedResult = this.db
      .prepare('SELECT COUNT(*) as count FROM customer_workflow WHERE is_blocked = 1')
      .get() as { count: number };
    const blocked_count = blockedResult.count;

    // Completion rate (customers who reached onboarding_completed)
    const completedResult = this.db
      .prepare('SELECT COUNT(*) as count FROM customer_workflow WHERE onboarding_completed IS NOT NULL')
      .get() as { count: number };
    const completion_rate =
      total_customers > 0 ? (completedResult.count / total_customers) * 100 : 0;

    return {
      total_customers,
      by_stage,
      average_time_by_checkpoint,
      bottlenecks,
      blocked_count,
      completion_rate,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Validate checkpoint order
   */
  private validateCheckpointOrder(workflow: CustomerWorkflow, targetCheckpoint: WorkflowCheckpoint): void {
    const currentIndex = CHECKPOINT_ORDER.indexOf(workflow.current_stage as WorkflowCheckpoint);
    const targetIndex = CHECKPOINT_ORDER.indexOf(targetCheckpoint);

    // Allow setting current or future checkpoints, but not past ones
    if (targetIndex < currentIndex) {
      throw new ValidationError(
        `Cannot advance to ${targetCheckpoint} - already past this checkpoint (current: ${workflow.current_stage})`
      );
    }

    // Check if previous checkpoint is completed (allow skipping only 1 checkpoint)
    if (targetIndex > currentIndex + 1) {
      const previousCheckpoint = CHECKPOINT_ORDER[targetIndex - 1];
      const previousTimestamp = workflow[previousCheckpoint as keyof CustomerWorkflow];
      if (!previousTimestamp) {
        logger.warn('Skipping checkpoint', {
          customer_id: workflow.customer_id,
          skipped: previousCheckpoint,
          target: targetCheckpoint,
        });
      }
    }
  }

  /**
   * Trigger automatic actions based on checkpoint
   */
  private async triggerAutomaticActions(
    customerId: number,
    checkpoint: WorkflowCheckpoint,
    metadata?: Record<string, any>
  ): Promise<void> {
    const customer = await this.getCustomer(customerId);

    switch (checkpoint) {
      case 'form_submitted':
        // Send intake confirmation email
        await this.emailService.sendIntakeConfirmation(customer, metadata);
        break;

      case 'payment_link_sent':
        // Payment link email sent externally via payment service
        logger.info('Payment link sent checkpoint reached', { customerId });
        break;

      case 'provisioning_started':
        // Send provisioning started notification
        logger.info('Provisioning started checkpoint reached', { customerId });
        // Note: Provisioning updates are sent by the provisioning service
        break;

      case 'credentials_sent':
        // Welcome email with credentials sent externally
        logger.info('Credentials sent checkpoint reached', { customerId });
        break;

      case 'onboarding_completed':
        // Send admin notification
        await this.emailService.sendAdminAlert(
          'Onboarding Completed',
          `Customer ${customerId} (${customer.company_name}, ${customer.tier}) completed onboarding`,
          'info'
        );
        break;
    }
  }

  /**
   * Calculate average time between checkpoints
   */
  private async calculateAverageTimeBetweenCheckpoints(): Promise<Record<WorkflowCheckpoint, number>> {
    const averages: Record<string, number> = {};

    for (let i = 1; i < CHECKPOINT_ORDER.length; i++) {
      const prevCheckpoint = CHECKPOINT_ORDER[i - 1];
      const currCheckpoint = CHECKPOINT_ORDER[i];

      if (!prevCheckpoint || !currCheckpoint) {
        continue;
      }

      const rows = this.db
        .prepare(
          `SELECT
            julianday(${currCheckpoint}) - julianday(${prevCheckpoint}) as days
           FROM customer_workflow
           WHERE ${prevCheckpoint} IS NOT NULL
             AND ${currCheckpoint} IS NOT NULL`
        )
        .all() as Array<{ days: number }>;

      if (rows.length > 0) {
        const totalDays = rows.reduce((sum, row) => sum + row.days, 0);
        averages[currCheckpoint] = Math.round(totalDays / rows.length);
      } else {
        averages[currCheckpoint] = 0;
      }
    }

    return averages as Record<WorkflowCheckpoint, number>;
  }

  /**
   * Get workflow record
   */
  private async getWorkflowRecord(customerId: number): Promise<CustomerWorkflow> {
    const stmt = this.db.prepare('SELECT * FROM customer_workflow WHERE customer_id = ?');
    const workflow = stmt.get(customerId) as CustomerWorkflow | undefined;

    if (!workflow) {
      throw new NotFoundError(`Workflow not found for customer ${customerId}`);
    }

    return workflow;
  }

  /**
   * Get customer record
   */
  private async getCustomer(customerId: number): Promise<any> {
    const stmt = this.db.prepare('SELECT * FROM customers WHERE id = ?');
    const customer = stmt.get(customerId);

    if (!customer) {
      throw new NotFoundError(`Customer with ID ${customerId} not found`);
    }

    return customer;
  }

  /**
   * Update customer status
   */
  private async updateCustomerStatus(customerId: number, status: CustomerStatus): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE customers
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(status, customerId);

    logger.info('Customer status updated', { customerId, status });
  }

  /**
   * Log activity to activity_log table
   */
  private async logActivity(
    customerId: number,
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO activity_log (customer_id, actor, action, resource_type, details)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(customerId, 'system', action, 'workflow', JSON.stringify(details));
  }
}
