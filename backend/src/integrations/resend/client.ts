/**
 * Resend Email Client
 * Handles email sending with retry logic and rate limiting
 */

import { Resend } from 'resend';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import type { EmailOptions, EmailResult } from './types';

export class ResendClient {
  private client: Resend;
  private defaultFrom: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // Base delay in ms

  constructor() {
    if (!config.resend.apiKey) {
      throw new Error('Resend API key is not configured');
    }

    this.client = new Resend(config.resend.apiKey);
    this.defaultFrom = config.resend.fromEmail || 'CostPlusDB <noreply@costplusdb.com>';

    logger.info('Resend client initialized', {
      from: this.defaultFrom,
      apiKeyLength: config.resend.apiKey.length,
    });
  }

  /**
   * Send an email with retry logic
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const emailOptions = {
      from: options.from || this.defaultFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      cc: options.cc,
      bcc: options.bcc,
      reply_to: options.reply_to,
      tags: options.tags,
      attachments: options.attachments,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        logger.info('Sending email', {
          attempt: attempt + 1,
          to: options.to,
          subject: options.subject,
        });

        const response = await this.client.emails.send(emailOptions);

        logger.info('Email sent successfully', {
          id: response.id,
          to: options.to,
          subject: options.subject,
        });

        return {
          id: response.id!,
          success: true,
        };
      } catch (error) {
        lastError = error as Error;

        logger.warn('Email send failed', {
          attempt: attempt + 1,
          maxRetries: this.maxRetries,
          error: lastError.message,
          to: options.to,
        });

        // Check if error is retryable
        if (!this.isRetryableError(lastError)) {
          break;
        }

        // Wait before retrying with exponential backoff
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    logger.error('Email send failed after all retries', {
      error: lastError?.message,
      to: options.to,
      subject: options.subject,
    });

    return {
      id: '',
      success: false,
      error: lastError?.message || 'Unknown error',
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'rate_limit',
      'timeout',
      'network',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
    ];

    return retryableErrors.some((err) =>
      error.message.toLowerCase().includes(err.toLowerCase())
    );
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Send bulk emails (with rate limiting)
   */
  async sendBulkEmails(emails: EmailOptions[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    const batchSize = 10; // Resend free tier allows ~100/day, be conservative
    const batchDelay = 1000; // 1 second between batches

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      logger.info('Sending email batch', {
        batchNumber: Math.floor(i / batchSize) + 1,
        batchSize: batch.length,
        total: emails.length,
      });

      const batchResults = await Promise.all(
        batch.map((email) => this.sendEmail(email))
      );

      results.push(...batchResults);

      // Wait between batches to respect rate limits
      if (i + batchSize < emails.length) {
        await this.sleep(batchDelay);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    logger.info('Bulk email send complete', {
      total: emails.length,
      success: successCount,
      failed: emails.length - successCount,
    });

    return results;
  }
}

// Singleton instance
export const resendClient = new ResendClient();
