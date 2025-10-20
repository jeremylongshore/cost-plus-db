/**
 * Workflow Service
 *
 * Manages customer onboarding workflow and status transitions:
 * - Workflow checkpoint tracking
 * - Status transition validation
 * - Blocker detection
 * - Automated notifications
 *
 * @module services/workflow
 */

import Database from 'better-sqlite3';
import { CustomerStatus } from '../database/schema.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Workflow checkpoints in customer journey
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
  | 'onboarding_complete';

/**
 * Workflow status record
 */
export interface WorkflowStatus {
  customer_id: number;
  current_status: CustomerStatus;
  checkpoints: Array<{
    checkpoint: WorkflowCheckpoint;
    completed_at: string;
  }>;
  blockers: Blocker[];
  next_steps: string[];
  progress_percentage: number;
}

/**
 * Workflow blocker
 */
export interface Blocker {
  type: 'payment_pending' | 'consultation_overdue' | 'provisioning_failed' | 'manual_intervention';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected_at: string;
  resolution_steps: string[];
}

/**
 * Valid status transitions
 */
const VALID_TRANSITIONS: Record<CustomerStatus, CustomerStatus[]> = {
  prospect: ['consultation', 'churned'],
  consultation: ['approved', 'churned'],
  approved: ['provisioning', 'churned'],
  provisioning: ['active', 'approved'], // Can roll back to approved on failure
  active: ['suspended', 'churned'],
  suspended: ['active', 'churned'],
  churned: [], // Terminal state
};

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
  onboarding_complete: 'active',
};

/**
 * Workflow service class
 */
export class WorkflowService {
  constructor(private db: Database.Database) {}

  /**
   * Update workflow checkpoint
   *
   * Records that a customer has reached a specific checkpoint in the workflow.
   *
   * @param customerId - Customer ID
   * @param checkpoint - Checkpoint reached
   * @returns Updated workflow status
   */
  async updateWorkflowCheckpoint(
    customerId: number,
    checkpoint: WorkflowCheckpoint
  ): Promise<WorkflowStatus> {
    logger.info('Updating workflow checkpoint', { customerId, checkpoint });

    // Verify customer exists
    const customer = await this.getCustomer(customerId);

    // Validate checkpoint matches current status
    const expectedStatus = CHECKPOINT_STATUS_MAP[checkpoint];
    if (customer.status !== expectedStatus) {
      logger.warn('Checkpoint status mismatch', {
        customerId,
        checkpoint,
        customerStatus: customer.status,
        expectedStatus,
      });
    }

    // Store checkpoint in activity log
    await this.logCheckpoint(customerId, checkpoint);

    // Get updated workflow status
    return this.getWorkflowStatus(customerId);
  }

  /**
   * Get workflow status for customer
   *
   * @param customerId - Customer ID
   * @returns Current workflow status
   */
  async getWorkflowStatus(customerId: number): Promise<WorkflowStatus> {
    logger.debug('Getting workflow status', { customerId });

    const customer = await this.getCustomer(customerId);

    // Get completed checkpoints from activity log
    const checkpoints = await this.getCompletedCheckpoints(customerId);

    // Detect blockers
    const blockers = await this.detectBlockers(customerId);

    // Calculate next steps
    const nextSteps = this.calculateNextSteps(customer.status as CustomerStatus, checkpoints);

    // Calculate progress
    const progressPercentage = this.calculateProgress(checkpoints);

    return {
      customer_id: customerId,
      current_status: customer.status as CustomerStatus,
      checkpoints,
      blockers,
      next_steps: nextSteps,
      progress_percentage: progressPercentage,
    };
  }

  /**
   * Detect workflow blockers
   *
   * Analyzes customer state to identify issues blocking progress.
   *
   * @param customerId - Customer ID
   * @returns List of detected blockers
   */
  async detectBlockers(customerId: number): Promise<Blocker[]> {
    logger.debug('Detecting workflow blockers', { customerId });

    const customer = await this.getCustomer(customerId);
    const blockers: Blocker[] = [];

    // Check for payment pending
    if (customer.status === 'approved') {
      const hasPayment = await this.hasReceivedPayment(customerId);
      if (!hasPayment) {
        const daysSinceApproval = this.getDaysSince(customer.updated_at);
        if (daysSinceApproval > 7) {
          blockers.push({
            type: 'payment_pending',
            description: 'Payment pending for more than 7 days',
            severity: 'high',
            detected_at: new Date().toISOString(),
            resolution_steps: [
              'Send payment reminder email',
              'Contact customer via phone',
              'Verify payment link is still valid',
            ],
          });
        }
      }
    }

    // Check for consultation overdue
    if (customer.status === 'consultation') {
      const daysSinceConsultation = this.getDaysSince(customer.updated_at);
      if (daysSinceConsultation > 3) {
        blockers.push({
          type: 'consultation_overdue',
          description: 'Consultation status for more than 3 days',
          severity: 'medium',
          detected_at: new Date().toISOString(),
          resolution_steps: [
            'Follow up with customer to schedule consultation',
            'Check calendar for available slots',
          ],
        });
      }
    }

    // Check for provisioning stuck
    if (customer.status === 'provisioning') {
      const daysSinceProvisioning = this.getDaysSince(customer.updated_at);
      if (daysSinceProvisioning > 1) {
        blockers.push({
          type: 'provisioning_failed',
          description: 'Provisioning stuck for more than 1 day',
          severity: 'critical',
          detected_at: new Date().toISOString(),
          resolution_steps: [
            'Check provisioning logs',
            'Verify VPS availability',
            'Manual intervention required',
          ],
        });
      }
    }

    return blockers;
  }

  /**
   * Transition customer status
   *
   * Validates and performs status transition with logging.
   *
   * @param customerId - Customer ID
   * @param newStatus - Target status
   * @throws ValidationError if transition is invalid
   */
  async transitionStatus(customerId: number, newStatus: CustomerStatus): Promise<void> {
    logger.info('Transitioning customer status', { customerId, newStatus });

    const customer = await this.getCustomer(customerId);
    const currentStatus = customer.status as CustomerStatus;

    // Validate transition
    if (!this.isValidTransition(currentStatus, newStatus)) {
      throw new ValidationError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }

    // Update status
    await this.updateCustomerStatus(customerId, newStatus);

    // Log transition
    await this.logActivity(customerId, 'status_transitioned', {
      from: currentStatus,
      to: newStatus,
    });

    // Send notification
    await this.sendStatusNotification(customerId, newStatus);

    logger.info('Status transition completed', { customerId, from: currentStatus, to: newStatus });
  }

  /**
   * Validate status transition
   */
  private isValidTransition(from: CustomerStatus, to: CustomerStatus): boolean {
    const validTargets = VALID_TRANSITIONS[from] || [];
    return validTargets.includes(to);
  }

  /**
   * Calculate next steps based on current status
   */
  private calculateNextSteps(
    status: CustomerStatus,
    checkpoints: Array<{ checkpoint: WorkflowCheckpoint; completed_at: string }>
  ): string[] {
    const completedCheckpoints = new Set(checkpoints.map(c => c.checkpoint));

    switch (status) {
      case 'prospect':
        return [
          'Review intake form details',
          'Schedule consultation call',
          'Prepare pricing proposal',
        ];

      case 'consultation':
        if (!completedCheckpoints.has('consultation_completed')) {
          return [
            'Complete consultation call',
            'Finalize requirements',
            'Approve customer for provisioning',
          ];
        }
        return ['Approve customer for provisioning'];

      case 'approved':
        if (!completedCheckpoints.has('payment_link_sent')) {
          return ['Generate and send payment link'];
        }
        if (!completedCheckpoints.has('payment_received')) {
          return ['Wait for payment confirmation'];
        }
        return ['Begin database provisioning'];

      case 'provisioning':
        const provisioningSteps = [];
        if (!completedCheckpoints.has('database_created')) {
          provisioningSteps.push('Create PostgreSQL database');
        }
        if (!completedCheckpoints.has('backups_configured')) {
          provisioningSteps.push('Configure pgBackRest backups');
        }
        if (!completedCheckpoints.has('credentials_sent')) {
          provisioningSteps.push('Send welcome email with credentials');
        }
        return provisioningSteps.length > 0 ? provisioningSteps : ['Complete onboarding'];

      case 'active':
        return ['Monitor database health', 'Provide ongoing support'];

      case 'suspended':
        return ['Resolve payment issue', 'Reactivate service'];

      case 'churned':
        return ['No further action required'];

      default:
        return [];
    }
  }

  /**
   * Calculate progress percentage
   */
  private calculateProgress(
    checkpoints: Array<{ checkpoint: WorkflowCheckpoint; completed_at: string }>
  ): number {
    const totalCheckpoints = 10; // Total checkpoints in workflow
    const completedCount = checkpoints.length;
    return Math.round((completedCount / totalCheckpoints) * 100);
  }

  // ============================================================================
  // DATABASE HELPERS
  // ============================================================================

  private async getCustomer(customerId: number): Promise<any> {
    const stmt = this.db.prepare('SELECT * FROM customers WHERE id = ?');
    const customer = stmt.get(customerId);

    if (!customer) {
      throw new NotFoundError(`Customer with ID ${customerId} not found`);
    }

    return customer;
  }

  private async updateCustomerStatus(customerId: number, status: CustomerStatus): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE customers
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(status, customerId);
  }

  private async logCheckpoint(customerId: number, checkpoint: WorkflowCheckpoint): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO activity_log (customer_id, actor, action, resource_type, details)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      customerId,
      'system',
      'workflow_checkpoint',
      'workflow',
      JSON.stringify({ checkpoint })
    );
  }

  private async getCompletedCheckpoints(
    customerId: number
  ): Promise<Array<{ checkpoint: WorkflowCheckpoint; completed_at: string }>> {
    const stmt = this.db.prepare(`
      SELECT details, created_at
      FROM activity_log
      WHERE customer_id = ?
        AND action = 'workflow_checkpoint'
      ORDER BY created_at ASC
    `);

    const rows = stmt.all(customerId) as Array<{ details: string; created_at: string }>;

    return rows.map(row => {
      const details = JSON.parse(row.details);
      return {
        checkpoint: details.checkpoint,
        completed_at: row.created_at,
      };
    });
  }

  private async hasReceivedPayment(customerId: number): Promise<boolean> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM billing_records
      WHERE customer_id = ? AND status = 'paid'
    `);

    const result = stmt.get(customerId) as { count: number };
    return result.count > 0;
  }

  private getDaysSince(timestamp: string): number {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  private async logActivity(
    customerId: number,
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO activity_log (customer_id, actor, action, resource_type, details)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      customerId,
      'system',
      action,
      'workflow',
      JSON.stringify(details)
    );
  }

  private async sendStatusNotification(customerId: number, status: CustomerStatus): Promise<void> {
    // TODO: Integrate with EmailService to send notifications
    logger.info('TODO: Send status notification email', { customerId, status });
  }
}
