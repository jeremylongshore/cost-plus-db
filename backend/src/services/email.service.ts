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

import { Resend } from 'resend';
import { config } from '../config/index.js';
import { ExternalServiceError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Email recipient
 */
interface EmailRecipient {
  email: string;
  name?: string;
}

/**
 * Customer data for emails
 */
interface CustomerEmailData {
  id: number;
  company_name: string;
  email: string;
  contact_name: string | null;
  tier: string;
}

/**
 * Database credentials for welcome email
 */
interface DatabaseCredentials {
  database_name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  connection_string: string;
  ssl_enabled: boolean;
}

/**
 * Email service class
 */
export class EmailService {
  private resend: Resend;
  private fromEmail: string;
  private adminEmail: string;

  constructor() {
    this.resend = new Resend(config.RESEND_API_KEY);
    this.fromEmail = config.RESEND_FROM_EMAIL;
    this.adminEmail = config.RESEND_ADMIN_EMAIL;
  }

  /**
   * Send intake confirmation to customer
   *
   * Sent immediately after customer submits intake form.
   */
  async sendIntakeConfirmation(customer: CustomerEmailData): Promise<void> {
    logger.info('Sending intake confirmation', { customerId: customer.id, email: customer.email });

    const subject = 'Welcome to CostPlusDB - Intake Received';
    const html = this.buildIntakeConfirmationEmail(customer);

    try {
      await this.sendEmail({
        to: { email: customer.email, name: customer.contact_name || customer.company_name },
        subject,
        html,
      });

      logger.info('Intake confirmation sent', { customerId: customer.id });
    } catch (error) {
      logger.error('Failed to send intake confirmation', {
        customerId: customer.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new ExternalServiceError('Resend', 'Failed to send intake confirmation email');
    }
  }

  /**
   * Send payment request to customer
   *
   * Sent after customer is approved with Stripe payment link.
   */
  async sendPaymentRequest(
    customer: CustomerEmailData,
    paymentLink: string,
    pricing: {
      total: number;
      tier: string;
      billing_period: string;
    }
  ): Promise<void> {
    logger.info('Sending payment request', { customerId: customer.id, email: customer.email });

    const subject = 'CostPlusDB - Payment Request for Your Database';
    const html = this.buildPaymentRequestEmail(customer, paymentLink, pricing);

    try {
      await this.sendEmail({
        to: { email: customer.email, name: customer.contact_name || customer.company_name },
        subject,
        html,
      });

      logger.info('Payment request sent', { customerId: customer.id });
    } catch (error) {
      logger.error('Failed to send payment request', {
        customerId: customer.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new ExternalServiceError('Resend', 'Failed to send payment request email');
    }
  }

  /**
   * Send provisioning update to customer
   *
   * Sent during database provisioning to keep customer informed.
   */
  async sendProvisioningUpdate(
    customer: CustomerEmailData,
    status: 'started' | 'in_progress' | 'completed' | 'failed',
    message?: string
  ): Promise<void> {
    logger.info('Sending provisioning update', {
      customerId: customer.id,
      email: customer.email,
      status,
    });

    const subject = `CostPlusDB - Database Provisioning ${this.capitalizeFirst(status)}`;
    const html = this.buildProvisioningUpdateEmail(customer, status, message);

    try {
      await this.sendEmail({
        to: { email: customer.email, name: customer.contact_name || customer.company_name },
        subject,
        html,
      });

      logger.info('Provisioning update sent', { customerId: customer.id, status });
    } catch (error) {
      logger.error('Failed to send provisioning update', {
        customerId: customer.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - provisioning updates are non-critical
    }
  }

  /**
   * Send welcome email with database credentials
   *
   * Sent after successful provisioning with connection details.
   * CRITICAL: Contains sensitive credentials.
   */
  async sendWelcomeEmail(
    customer: CustomerEmailData,
    credentials: DatabaseCredentials
  ): Promise<void> {
    logger.info('Sending welcome email with credentials', {
      customerId: customer.id,
      email: customer.email,
    });

    const subject = 'Welcome to CostPlusDB - Your Database is Ready!';
    const html = this.buildWelcomeEmail(customer, credentials);

    try {
      await this.sendEmail({
        to: { email: customer.email, name: customer.contact_name || customer.company_name },
        subject,
        html,
      });

      logger.info('Welcome email sent', { customerId: customer.id });
    } catch (error) {
      logger.error('CRITICAL: Failed to send welcome email with credentials', {
        customerId: customer.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new ExternalServiceError('Resend', 'Failed to send welcome email with credentials');
    }
  }

  /**
   * Send admin notification
   *
   * Internal notifications for admins (new customers, issues, etc.)
   */
  async sendAdminNotification(
    type: 'new_customer' | 'payment_received' | 'provisioning_failed' | 'support_ticket',
    data: Record<string, any>
  ): Promise<void> {
    logger.info('Sending admin notification', { type, data });

    const subject = `CostPlusDB Admin Alert: ${this.formatNotificationType(type)}`;
    const html = this.buildAdminNotificationEmail(type, data);

    try {
      await this.sendEmail({
        to: { email: this.adminEmail, name: 'CostPlusDB Admin' },
        subject,
        html,
      });

      logger.info('Admin notification sent', { type });
    } catch (error) {
      logger.error('Failed to send admin notification', {
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - admin notifications shouldn't block customer workflows
    }
  }

  /**
   * Send email via Resend API
   */
  private async sendEmail(params: {
    to: EmailRecipient;
    subject: string;
    html: string;
  }): Promise<void> {
    const { to, subject, html } = params;

    const response = await this.resend.emails.send({
      from: this.fromEmail,
      to: to.email,
      subject,
      html,
    });

    if (!response.data) {
      throw new Error('Failed to send email: No response data');
    }

    logger.debug('Email sent via Resend', { messageId: response.data.id });
  }

  // ============================================================================
  // EMAIL TEMPLATES
  // ============================================================================

  private buildIntakeConfirmationEmail(customer: CustomerEmailData): string {
    const greeting = customer.contact_name
      ? `Hi ${customer.contact_name},`
      : `Hi there,`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: monospace; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .footer { border-top: 1px solid #ccc; padding-top: 10px; margin-top: 30px; font-size: 0.9em; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>CostPlusDB - Intake Received</h2>
          </div>

          <p>${greeting}</p>

          <p>Thank you for your interest in CostPlusDB! We've received your intake form for <strong>${customer.company_name}</strong>.</p>

          <p><strong>What's Next:</strong></p>
          <ul>
            <li>We'll review your requirements within 2 business hours</li>
            <li>Schedule a brief consultation call to finalize details</li>
            <li>Provide transparent pricing breakdown</li>
            <li>Provision your database within 24 hours of payment</li>
          </ul>

          <p><strong>Selected Tier:</strong> ${customer.tier.toUpperCase()}</p>

          <p>If you have any questions in the meantime, simply reply to this email.</p>

          <div class="footer">
            <p>CostPlusDB - Transparent, Affordable PostgreSQL<br>
            <a href="https://costplusdb.com">costplusdb.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private buildPaymentRequestEmail(
    customer: CustomerEmailData,
    paymentLink: string,
    pricing: { total: number; tier: string; billing_period: string }
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: monospace; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .pricing { background: #f5f5f5; padding: 15px; margin: 20px 0; }
          .cta { background: #000; color: #fff; padding: 15px 30px; text-decoration: none; display: inline-block; margin: 20px 0; }
          .footer { border-top: 1px solid #ccc; padding-top: 10px; margin-top: 30px; font-size: 0.9em; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>CostPlusDB - Payment Request</h2>
          </div>

          <p>Hi ${customer.contact_name || 'there'},</p>

          <p>Great news! Your database has been approved and is ready to provision.</p>

          <div class="pricing">
            <p><strong>Pricing Breakdown:</strong></p>
            <p>Tier: ${pricing.tier.toUpperCase()}<br>
            Billing Period: ${pricing.billing_period}<br>
            <strong>Total: $${pricing.total.toFixed(2)} USD</strong></p>
          </div>

          <p>Please complete payment to begin provisioning:</p>

          <a href="${paymentLink}" class="cta">Complete Payment →</a>

          <p>Once payment is confirmed, we'll provision your database within 30 minutes.</p>

          <div class="footer">
            <p>CostPlusDB - Transparent, Affordable PostgreSQL<br>
            <a href="https://costplusdb.com">costplusdb.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private buildProvisioningUpdateEmail(
    customer: CustomerEmailData,
    status: string,
    message?: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: monospace; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .status { background: #f5f5f5; padding: 15px; margin: 20px 0; }
          .footer { border-top: 1px solid #ccc; padding-top: 10px; margin-top: 30px; font-size: 0.9em; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>CostPlusDB - Provisioning Update</h2>
          </div>

          <p>Hi ${customer.contact_name || 'there'},</p>

          <div class="status">
            <p><strong>Status:</strong> ${this.capitalizeFirst(status)}</p>
            ${message ? `<p>${message}</p>` : ''}
          </div>

          <p>We'll notify you as soon as your database is ready.</p>

          <div class="footer">
            <p>CostPlusDB - Transparent, Affordable PostgreSQL<br>
            <a href="https://costplusdb.com">costplusdb.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private buildWelcomeEmail(customer: CustomerEmailData, credentials: DatabaseCredentials): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: monospace; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .credentials { background: #f5f5f5; padding: 15px; margin: 20px 0; font-family: monospace; }
          .warning { background: #fffacd; padding: 10px; margin: 15px 0; border-left: 4px solid #ffa500; }
          .footer { border-top: 1px solid #ccc; padding-top: 10px; margin-top: 30px; font-size: 0.9em; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Welcome to CostPlusDB!</h2>
          </div>

          <p>Hi ${customer.contact_name || 'there'},</p>

          <p>Your PostgreSQL database is ready! Here are your connection details:</p>

          <div class="credentials">
            <p><strong>Database Name:</strong> ${credentials.database_name}<br>
            <strong>Host:</strong> ${credentials.host}<br>
            <strong>Port:</strong> ${credentials.port}<br>
            <strong>Username:</strong> ${credentials.username}<br>
            <strong>Password:</strong> ${credentials.password}<br>
            <strong>SSL:</strong> ${credentials.ssl_enabled ? 'Required' : 'Optional'}</p>

            <p><strong>Connection String:</strong><br>
            <code>${credentials.connection_string}</code></p>
          </div>

          <div class="warning">
            <p><strong>⚠️ Security Note:</strong> Store these credentials securely. We recommend using environment variables or a secrets manager. Never commit credentials to version control.</p>
          </div>

          <p><strong>Next Steps:</strong></p>
          <ul>
            <li>Test your connection using the credentials above</li>
            <li>Review our documentation at <a href="https://costplusdb.com/docs">costplusdb.com/docs</a></li>
            <li>Backups are configured automatically (pgBackRest + S3)</li>
            <li>Contact support anytime at ${this.adminEmail}</li>
          </ul>

          <div class="footer">
            <p>CostPlusDB - Transparent, Affordable PostgreSQL<br>
            <a href="https://costplusdb.com">costplusdb.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private buildAdminNotificationEmail(type: string, data: Record<string, any>): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: monospace; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .data { background: #f5f5f5; padding: 15px; margin: 20px 0; }
          pre { background: #fff; padding: 10px; border: 1px solid #ccc; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>CostPlusDB Admin Alert</h2>
          </div>

          <p><strong>Type:</strong> ${this.formatNotificationType(type)}</p>

          <div class="data">
            <p><strong>Details:</strong></p>
            <pre>${JSON.stringify(data, null, 2)}</pre>
          </div>

          <p>Check the admin dashboard for more details.</p>
        </div>
      </body>
      </html>
    `;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private formatNotificationType(type: string): string {
    return type
      .split('_')
      .map(word => this.capitalizeFirst(word))
      .join(' ');
  }
}
