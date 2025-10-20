/**
 * Stripe Webhook Handler
 * Processes Stripe webhook events with idempotency
 */

import Stripe from 'stripe';
import { stripeClient } from './client';
import { logger } from '../../utils/logger';
import { resendClient } from '../resend/client';
import { provisioningStartedTemplate } from '../resend/templates';
import type {
  WebhookProcessingResult,
} from './types';

// TODO: Implement database client with required methods
const db = {
  updateCustomer: async (_id: string, _data: any): Promise<void> => { throw new Error('Not implemented'); },
  updateWorkflowState: async (_id: string, _state: string): Promise<void> => { throw new Error('Not implemented'); },
  getCustomer: async (_id: string): Promise<any> => { throw new Error('Not implemented'); },
  logPayment: async (_data: any): Promise<void> => { throw new Error('Not implemented'); },
  query: async (_sql: string, _params: any[]): Promise<any[]> => { throw new Error('Not implemented'); },
  execute: async (_sql: string, _params: any[]): Promise<void> => { throw new Error('Not implemented'); },
};

export class StripeWebhookHandler {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(webhookSecret: string) {
    this.stripe = stripeClient.getStripeInstance();
    this.webhookSecret = webhookSecret;

    logger.info('Stripe webhook handler initialized');
  }

  /**
   * Verify webhook signature and construct event
   */
  verifyWebhookSignature(rawBody: string | Buffer, signature: string): Stripe.Event {
    try {
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret
      );

      logger.info('Webhook signature verified', {
        eventId: event.id,
        eventType: event.type,
      });

      return event;
    } catch (error: any) {
      logger.error('Webhook signature verification failed', {
        error: error.message,
      });
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  }

  /**
   * Process webhook event with idempotency check
   */
  async processWebhookEvent(event: Stripe.Event): Promise<WebhookProcessingResult> {
    const startTime = Date.now();

    try {
      // Check if event already processed (idempotency)
      const alreadyProcessed = await this.isEventProcessed(event.id);
      if (alreadyProcessed) {
        logger.info('Event already processed (idempotent)', {
          eventId: event.id,
          eventType: event.type,
        });

        return {
          success: true,
          eventId: event.id,
          eventType: event.type,
          processed: false,
          timestamp: new Date(),
        };
      }

      // Log the event
      await this.logWebhookEvent(event);

      // Process based on event type
      let result: WebhookProcessingResult;

      switch (event.type) {
        case 'payment_intent.succeeded':
          result = await this.processPaymentIntentSucceeded(event);
          break;

        case 'payment_intent.payment_failed':
          result = await this.processPaymentIntentFailed(event);
          break;

        case 'customer.subscription.created':
          result = await this.processSubscriptionCreated(event);
          break;

        case 'customer.subscription.updated':
          result = await this.processSubscriptionUpdated(event);
          break;

        case 'customer.subscription.deleted':
          result = await this.processSubscriptionDeleted(event);
          break;

        case 'invoice.payment_succeeded':
          result = await this.processInvoicePaymentSucceeded(event);
          break;

        case 'invoice.payment_failed':
          result = await this.processInvoicePaymentFailed(event);
          break;

        case 'checkout.session.completed':
          result = await this.processCheckoutSessionCompleted(event);
          break;

        default:
          logger.info('Unhandled webhook event type', {
            eventId: event.id,
            eventType: event.type,
          });

          result = {
            success: true,
            eventId: event.id,
            eventType: event.type,
            processed: false,
            timestamp: new Date(),
          };
      }

      // Mark event as processed
      await this.markEventProcessed(event.id, result);

      const duration = Date.now() - startTime;
      logger.info('Webhook event processed', {
        eventId: event.id,
        eventType: event.type,
        success: result.success,
        duration,
      });

      return result;
    } catch (error: any) {
      logger.error('Webhook event processing failed', {
        eventId: event.id,
        eventType: event.type,
        error: error.message,
      });

      return {
        success: false,
        eventId: event.id,
        eventType: event.type,
        processed: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Process payment_intent.succeeded event
   */
  async processPaymentIntentSucceeded(event: Stripe.Event): Promise<WebhookProcessingResult> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    logger.info('Processing payment_intent.succeeded', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      customerId: paymentIntent.customer,
    });

    try {
      // Extract metadata
      const metadata = paymentIntent.metadata || {};
      const customerDbId = metadata.customerDbId;

      if (!customerDbId) {
        throw new Error('customerDbId not found in payment intent metadata');
      }

      // Update customer record in database
      await db.updateCustomer(customerDbId, {
        payment_status: 'paid',
        payment_intent_id: paymentIntent.id,
        paid_at: new Date(),
      });

      // Update workflow state
      await db.updateWorkflowState(customerDbId, 'payment_confirmed');

      // Get customer details
      const customer = await db.getCustomer(customerDbId);

      // Send provisioning started email
      const emailTemplate = provisioningStartedTemplate({
        email: customer.email,
        name: customer.name,
        company: customer.company,
      });

      await resendClient.sendEmail({
        to: customer.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
        tags: [
          { name: 'event', value: 'provisioning_started' },
          { name: 'customer_id', value: customerDbId },
        ],
      });

      logger.info('Payment intent succeeded processed', {
        paymentIntentId: paymentIntent.id,
        customerDbId,
      });

      return {
        success: true,
        eventId: event.id,
        eventType: event.type,
        processed: true,
        timestamp: new Date(),
      };
    } catch (error: any) {
      logger.error('Failed to process payment_intent.succeeded', {
        error: error.message,
        paymentIntentId: paymentIntent.id,
      });
      throw error;
    }
  }

  /**
   * Process payment_intent.payment_failed event
   */
  async processPaymentIntentFailed(event: Stripe.Event): Promise<WebhookProcessingResult> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    logger.info('Processing payment_intent.payment_failed', {
      paymentIntentId: paymentIntent.id,
      customerId: paymentIntent.customer,
    });

    try {
      const metadata = paymentIntent.metadata || {};
      const customerDbId = metadata.customerDbId;

      if (customerDbId) {
        await db.updateCustomer(customerDbId, {
          payment_status: 'failed',
          payment_intent_id: paymentIntent.id,
        });

        await db.updateWorkflowState(customerDbId, 'payment_failed');
      }

      // TODO: Send payment failed notification email

      return {
        success: true,
        eventId: event.id,
        eventType: event.type,
        processed: true,
        timestamp: new Date(),
      };
    } catch (error: any) {
      logger.error('Failed to process payment_intent.payment_failed', {
        error: error.message,
        paymentIntentId: paymentIntent.id,
      });
      throw error;
    }
  }

  /**
   * Process customer.subscription.created event
   */
  async processSubscriptionCreated(event: Stripe.Event): Promise<WebhookProcessingResult> {
    const subscription = event.data.object as Stripe.Subscription;

    logger.info('Processing customer.subscription.created', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
    });

    try {
      const metadata = subscription.metadata || {};
      const customerDbId = metadata.customerDbId;

      if (customerDbId) {
        await db.updateCustomer(customerDbId, {
          subscription_id: subscription.id,
          subscription_status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000),
          current_period_end: new Date(subscription.current_period_end * 1000),
        });
      }

      return {
        success: true,
        eventId: event.id,
        eventType: event.type,
        processed: true,
        timestamp: new Date(),
      };
    } catch (error: any) {
      logger.error('Failed to process customer.subscription.created', {
        error: error.message,
        subscriptionId: subscription.id,
      });
      throw error;
    }
  }

  /**
   * Process customer.subscription.updated event
   */
  async processSubscriptionUpdated(event: Stripe.Event): Promise<WebhookProcessingResult> {
    const subscription = event.data.object as Stripe.Subscription;

    logger.info('Processing customer.subscription.updated', {
      subscriptionId: subscription.id,
      status: subscription.status,
    });

    try {
      const metadata = subscription.metadata || {};
      const customerDbId = metadata.customerDbId;

      if (customerDbId) {
        await db.updateCustomer(customerDbId, {
          subscription_status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000),
          current_period_end: new Date(subscription.current_period_end * 1000),
          cancel_at_period_end: subscription.cancel_at_period_end,
        });
      }

      return {
        success: true,
        eventId: event.id,
        eventType: event.type,
        processed: true,
        timestamp: new Date(),
      };
    } catch (error: any) {
      logger.error('Failed to process customer.subscription.updated', {
        error: error.message,
        subscriptionId: subscription.id,
      });
      throw error;
    }
  }

  /**
   * Process customer.subscription.deleted event
   */
  async processSubscriptionDeleted(event: Stripe.Event): Promise<WebhookProcessingResult> {
    const subscription = event.data.object as Stripe.Subscription;

    logger.info('Processing customer.subscription.deleted', {
      subscriptionId: subscription.id,
    });

    try {
      const metadata = subscription.metadata || {};
      const customerDbId = metadata.customerDbId;

      if (customerDbId) {
        await db.updateCustomer(customerDbId, {
          subscription_status: 'canceled',
          canceled_at: new Date(),
        });
      }

      return {
        success: true,
        eventId: event.id,
        eventType: event.type,
        processed: true,
        timestamp: new Date(),
      };
    } catch (error: any) {
      logger.error('Failed to process customer.subscription.deleted', {
        error: error.message,
        subscriptionId: subscription.id,
      });
      throw error;
    }
  }

  /**
   * Process invoice.payment_succeeded event
   */
  async processInvoicePaymentSucceeded(event: Stripe.Event): Promise<WebhookProcessingResult> {
    const invoice = event.data.object as Stripe.Invoice;

    logger.info('Processing invoice.payment_succeeded', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amountPaid: invoice.amount_paid,
    });

    try {
      // Log successful payment
      await db.logPayment({
        invoice_id: invoice.id,
        customer_id: invoice.customer as string,
        subscription_id: invoice.subscription as string,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency,
        paid_at: new Date(invoice.status_transitions.paid_at! * 1000),
      });

      return {
        success: true,
        eventId: event.id,
        eventType: event.type,
        processed: true,
        timestamp: new Date(),
      };
    } catch (error: any) {
      logger.error('Failed to process invoice.payment_succeeded', {
        error: error.message,
        invoiceId: invoice.id,
      });
      throw error;
    }
  }

  /**
   * Process invoice.payment_failed event
   */
  async processInvoicePaymentFailed(event: Stripe.Event): Promise<WebhookProcessingResult> {
    const invoice = event.data.object as Stripe.Invoice;

    logger.info('Processing invoice.payment_failed', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
    });

    // TODO: Send payment failed notification
    // TODO: Handle dunning logic

    return {
      success: true,
      eventId: event.id,
      eventType: event.type,
      processed: true,
      timestamp: new Date(),
    };
  }

  /**
   * Process checkout.session.completed event
   */
  async processCheckoutSessionCompleted(event: Stripe.Event): Promise<WebhookProcessingResult> {
    const session = event.data.object as Stripe.Checkout.Session;

    logger.info('Processing checkout.session.completed', {
      sessionId: session.id,
      customerId: session.customer,
    });

    // Similar to payment_intent.succeeded
    return this.processPaymentIntentSucceeded(event);
  }

  /**
   * Check if event has already been processed
   */
  private async isEventProcessed(eventId: string): Promise<boolean> {
    try {
      const result = await db.query(
        'SELECT id FROM webhook_events WHERE stripe_event_id = ? LIMIT 1',
        [eventId]
      );
      return result.length > 0;
    } catch (error) {
      logger.error('Failed to check event processing status', {
        eventId,
        error,
      });
      return false;
    }
  }

  /**
   * Log webhook event to database
   */
  private async logWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      await db.execute(
        `INSERT INTO webhook_events (stripe_event_id, event_type, event_data, created_at)
         VALUES (?, ?, ?, ?)`,
        [event.id, event.type, JSON.stringify(event.data), new Date()]
      );
    } catch (error) {
      logger.error('Failed to log webhook event', {
        eventId: event.id,
        error,
      });
    }
  }

  /**
   * Mark event as processed
   */
  private async markEventProcessed(
    eventId: string,
    result: WebhookProcessingResult
  ): Promise<void> {
    try {
      await db.execute(
        `UPDATE webhook_events
         SET processed = ?, success = ?, error = ?, processed_at = ?
         WHERE stripe_event_id = ?`,
        [result.processed, result.success, result.error || null, new Date(), eventId]
      );
    } catch (error) {
      logger.error('Failed to mark event as processed', {
        eventId,
        error,
      });
    }
  }
}

// Factory function to create webhook handler
export function createWebhookHandler(webhookSecret: string): StripeWebhookHandler {
  return new StripeWebhookHandler(webhookSecret);
}
