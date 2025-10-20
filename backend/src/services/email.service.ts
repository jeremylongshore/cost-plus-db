/**
 * Email Service
 *
 * Handles all email communications via Resend API:
 * - Customer intake confirmations
 * - Payment requests
 * - Provisioning updates
 * - Welcome emails with credentials
 * - Admin notifications
 *
 * @module services/email
 */

import { resendClient } from '../integrations/resend/client.js';
import {
  intakeConfirmationTemplate,
  paymentRequestTemplate,
  provisioningStartedTemplate,
  credentialsDeliveredTemplate,
  welcomeEmailTemplate,
  adminNotificationTemplate,
} from '../integrations/resend/templates.js';
import type {
  CustomerEmailData,
  PricingEmailData,
  CredentialsEmailData,
  AdminNotificationData,
} from '../integrations/resend/types.js';
import { config } from '../config/index.js';
import { ExternalServiceError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Database record for customer
 */
interface CustomerRecord {
  id: number;
  company_name: string;
  email: string;
  contact_name: string | null;
  tier: string;
}

/**
 * Database record for database instance
 */
interface DatabaseRecord {
  id: number;
  customer_id: number;
  database_name: string;
  host: string;
  port: number;
  status: string;
}

/**
 * Database credentials structure
 */
interface DatabaseCredentials {
  username: string;
  password: string;
  connection_string: string;
  ssl_enabled: boolean;
}

/**
 * Pricing information for payment requests
 */
interface PricingInfo {
  total: number;
  tier: string;
  billing_period: string;
  setup_fee?: number;
  monthly_price?: number;
  features?: string[];
}

/**
 * Email service class
 */
export class EmailService {
  private adminEmail: string;

  constructor() {
    this.adminEmail = config.RESEND_ADMIN_EMAIL;
    logger.info('Email service initialized', {
      adminEmail: this.adminEmail,
      notificationsEnabled: config.ENABLE_EMAIL_NOTIFICATIONS,
    });
  }

  /**
   * Send intake confirmation to customer
   *
   * Sent immediately after customer submits intake form.
   * Returns true if email was sent successfully, false otherwise.
   */
  async sendIntakeConfirmation(
    customer: CustomerRecord,
    _formData?: Record<string, any>
  ): Promise<boolean> {
    if (!config.ENABLE_EMAIL_NOTIFICATIONS) {
      logger.info('Email notifications disabled, skipping intake confirmation');
      return true;
    }

    logger.info('Sending intake confirmation', {
      customerId: customer.id,
      email: customer.email,
    });

    try {
      // Map customer record to email data
      const emailData: CustomerEmailData = {
        email: customer.email,
        name: customer.contact_name || customer.company_name,
        company: customer.company_name,
        tier: customer.tier,
      };

      // Generate email template
      const template = intakeConfirmationTemplate(emailData);

      // Send email via Resend client
      const result = await resendClient.sendEmail({
        to: customer.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        tags: [
          { name: 'type', value: 'intake_confirmation' },
          { name: 'customer_id', value: customer.id.toString() },
        ],
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      logger.info('Intake confirmation sent successfully', {
        customerId: customer.id,
        emailId: result.id,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send intake confirmation', {
        customerId: customer.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Send payment request to customer
   *
   * Sent after customer is approved with Stripe payment link.
   * Returns true if email was sent successfully, false otherwise.
   */
  async sendPaymentRequest(
    customer: CustomerRecord,
    paymentLink: string,
    pricing: PricingInfo
  ): Promise<boolean> {
    if (!config.ENABLE_EMAIL_NOTIFICATIONS) {
      logger.info('Email notifications disabled, skipping payment request');
      return true;
    }

    logger.info('Sending payment request', {
      customerId: customer.id,
      email: customer.email,
      amount: pricing.total,
    });

    try {
      // Map customer record to email data
      const emailData: CustomerEmailData = {
        email: customer.email,
        name: customer.contact_name || customer.company_name,
        company: customer.company_name,
        tier: customer.tier,
      };

      // Map pricing data
      const pricingData: PricingEmailData = {
        tier: pricing.tier,
        monthlyPrice: pricing.monthly_price || pricing.total,
        setupFee: pricing.setup_fee || 0,
        totalFirstMonth: pricing.total,
        features: pricing.features || this.getDefaultFeatures(pricing.tier),
      };

      // Generate email template
      const template = paymentRequestTemplate(emailData, paymentLink, pricingData);

      // Send email via Resend client
      const result = await resendClient.sendEmail({
        to: customer.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        tags: [
          { name: 'type', value: 'payment_request' },
          { name: 'customer_id', value: customer.id.toString() },
          { name: 'amount', value: pricing.total.toFixed(2) },
        ],
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      logger.info('Payment request sent successfully', {
        customerId: customer.id,
        emailId: result.id,
        amount: pricing.total,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send payment request', {
        customerId: customer.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Send provisioning notification to customer
   *
   * Sent when database provisioning starts.
   * Returns true if email was sent successfully, false otherwise.
   */
  async sendProvisioningNotification(
    customer: CustomerRecord,
    database: DatabaseRecord
  ): Promise<boolean> {
    if (!config.ENABLE_EMAIL_NOTIFICATIONS) {
      logger.info('Email notifications disabled, skipping provisioning notification');
      return true;
    }

    logger.info('Sending provisioning notification', {
      customerId: customer.id,
      databaseId: database.id,
      email: customer.email,
    });

    try {
      // Map customer record to email data
      const emailData: CustomerEmailData = {
        email: customer.email,
        name: customer.contact_name || customer.company_name,
        company: customer.company_name,
        tier: customer.tier,
      };

      // Generate email template
      const template = provisioningStartedTemplate(emailData);

      // Send email via Resend client
      const result = await resendClient.sendEmail({
        to: customer.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        tags: [
          { name: 'type', value: 'provisioning_started' },
          { name: 'customer_id', value: customer.id.toString() },
          { name: 'database_id', value: database.id.toString() },
        ],
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      logger.info('Provisioning notification sent successfully', {
        customerId: customer.id,
        databaseId: database.id,
        emailId: result.id,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send provisioning notification', {
        customerId: customer.id,
        databaseId: database.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - provisioning notifications are non-critical
      return false;
    }
  }

  /**
   * Send database credentials to customer
   *
   * Sent after successful provisioning with connection details.
   * CRITICAL: Contains sensitive credentials.
   * Returns true if email was sent successfully, false otherwise.
   */
  async sendCredentials(
    customer: CustomerRecord,
    database: DatabaseRecord,
    credentials: DatabaseCredentials
  ): Promise<boolean> {
    if (!config.ENABLE_EMAIL_NOTIFICATIONS) {
      logger.warn(
        'Email notifications disabled but credentials need to be sent - this should not happen in production'
      );
      return false;
    }

    logger.info('Sending database credentials', {
      customerId: customer.id,
      databaseId: database.id,
      email: customer.email,
    });

    try {
      // Map customer record to email data
      const emailData: CustomerEmailData = {
        email: customer.email,
        name: customer.contact_name || customer.company_name,
        company: customer.company_name,
        tier: customer.tier,
      };

      // Map credentials data
      const credentialsData: CredentialsEmailData = {
        host: database.host,
        port: database.port,
        database: database.database_name,
        username: credentials.username,
        password: credentials.password,
        sslRequired: credentials.ssl_enabled,
        connectionString: credentials.connection_string,
      };

      // Generate email template
      const template = credentialsDeliveredTemplate(emailData, credentialsData);

      // Send email via Resend client
      const result = await resendClient.sendEmail({
        to: customer.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        tags: [
          { name: 'type', value: 'credentials_delivered' },
          { name: 'customer_id', value: customer.id.toString() },
          { name: 'database_id', value: database.id.toString() },
          { name: 'security', value: 'sensitive' },
        ],
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      logger.info('Database credentials sent successfully', {
        customerId: customer.id,
        databaseId: database.id,
        emailId: result.id,
      });

      return true;
    } catch (error) {
      logger.error('CRITICAL: Failed to send database credentials', {
        customerId: customer.id,
        databaseId: database.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // This is critical - throw error so caller can handle
      throw new ExternalServiceError(
        'Resend',
        'Failed to send database credentials email'
      );
    }
  }

  /**
   * Send welcome email to customer
   *
   * Sent after credentials are delivered as a final onboarding step.
   * Returns true if email was sent successfully, false otherwise.
   */
  async sendWelcomeEmail(customer: CustomerRecord): Promise<boolean> {
    if (!config.ENABLE_EMAIL_NOTIFICATIONS) {
      logger.info('Email notifications disabled, skipping welcome email');
      return true;
    }

    logger.info('Sending welcome email', {
      customerId: customer.id,
      email: customer.email,
    });

    try {
      // Map customer record to email data
      const emailData: CustomerEmailData = {
        email: customer.email,
        name: customer.contact_name || customer.company_name,
        company: customer.company_name,
        tier: customer.tier,
      };

      // Generate email template
      const template = welcomeEmailTemplate(emailData);

      // Send email via Resend client
      const result = await resendClient.sendEmail({
        to: customer.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        tags: [
          { name: 'type', value: 'welcome' },
          { name: 'customer_id', value: customer.id.toString() },
        ],
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      logger.info('Welcome email sent successfully', {
        customerId: customer.id,
        emailId: result.id,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send welcome email', {
        customerId: customer.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Welcome emails are non-critical
      return false;
    }
  }

  /**
   * Send admin alert notification
   *
   * Internal notifications for admins (new customers, errors, etc.)
   * Returns true if email was sent successfully, false otherwise.
   */
  async sendAdminAlert(
    subject: string,
    message: string,
    severity: 'info' | 'warning' | 'error' | 'critical' = 'info'
  ): Promise<boolean> {
    logger.info('Sending admin alert', { subject, severity });

    try {
      // Build admin notification data
      const notificationData: AdminNotificationData = {
        type: severity === 'error' || severity === 'critical' ? 'error' : 'new_customer',
        customerEmail: 'system@costplusdb.com',
        customerName: 'System Alert',
        details: {
          subject,
          message,
          severity,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
      };

      // Generate email template
      const template = adminNotificationTemplate(notificationData);

      // Override subject with provided subject
      const fullSubject = `[CostPlusDB ${severity.toUpperCase()}] ${subject}`;

      // Send email via Resend client
      const result = await resendClient.sendEmail({
        to: this.adminEmail,
        subject: fullSubject,
        html: template.html,
        text: template.text,
        tags: [
          { name: 'type', value: 'admin_alert' },
          { name: 'severity', value: severity },
        ],
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      logger.info('Admin alert sent successfully', {
        subject,
        severity,
        emailId: result.id,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send admin alert', {
        subject,
        severity,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - admin alerts shouldn't block customer workflows
      return false;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get default features for a pricing tier
   */
  private getDefaultFeatures(tier: string): string[] {
    const tierLower = tier.toLowerCase();

    const baseFeatures = [
      'PostgreSQL 16 (latest stable)',
      'Daily automated backups',
      'SSL/TLS encryption',
      '24/7 monitoring and alerts',
    ];

    if (tierLower === 'shared') {
      return [
        ...baseFeatures,
        'Shared VPS instance',
        '2GB RAM / 1 vCPU',
        '25GB storage',
        'Email support',
      ];
    } else if (tierLower === 'dedicated') {
      return [
        ...baseFeatures,
        'Dedicated VPS instance',
        '4GB RAM / 2 vCPU',
        '50GB storage',
        'Priority email support',
      ];
    } else if (tierLower === 'pro') {
      return [
        ...baseFeatures,
        'High-performance VPS',
        '8GB RAM / 4 vCPU',
        '100GB storage',
        'Phone + email support',
        'Custom backups',
      ];
    } else if (tierLower === 'enterprise') {
      return [
        ...baseFeatures,
        'Custom infrastructure',
        'Custom specifications',
        'Unlimited storage',
        'Dedicated support',
        'SLA guarantees',
      ];
    }

    return baseFeatures;
  }
}
