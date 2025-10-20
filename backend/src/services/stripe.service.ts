/**
 * Stripe Service
 *
 * Handles payment processing via Stripe:
 * - Payment link generation
 * - Customer creation in Stripe
 * - Subscription management
 * - Webhook event processing
 * - Billing record synchronization
 *
 * @module services/stripe
 */

import Stripe from 'stripe';
import Database from 'better-sqlite3';
import { config } from '../config/index.js';
import { ExternalServiceError, NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Payment link result
 */
export interface PaymentLinkResult {
  payment_link_url: string;
  stripe_payment_link_id: string;
  amount: number;
  currency: string;
}

/**
 * Stripe customer result
 */
export interface StripeCustomerResult {
  stripe_customer_id: string;
  email: string;
  name: string;
}

/**
 * Subscription result
 */
export interface SubscriptionResult {
  subscription_id: string;
  status: string;
  current_period_start: Date;
  current_period_end: Date;
  amount: number;
}

/**
 * Webhook event types we handle
 * (Currently unused - reserved for future webhook routing)
 */
// type WebhookEventType =
//   | 'payment_intent.succeeded'
//   | 'payment_intent.payment_failed'
//   | 'customer.subscription.created'
//   | 'customer.subscription.updated'
//   | 'customer.subscription.deleted'
//   | 'invoice.payment_succeeded'
//   | 'invoice.payment_failed';

/**
 * Stripe service class
 */
export class StripeService {
  private stripe: Stripe;

  constructor(private db: Database.Database) {
    this.stripe = new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Create payment link for customer
   *
   * Generates a Stripe Payment Link for one-time or subscription payment.
   *
   * @param customerId - Internal customer ID
   * @param amount - Amount in dollars
   * @param description - Payment description
   * @param metadata - Additional metadata
   * @returns Payment link details
   */
  async createPaymentLink(
    customerId: number,
    amount: number,
    description: string,
    metadata?: Record<string, string>
  ): Promise<PaymentLinkResult> {
    logger.info('Creating Stripe payment link', { customerId, amount });

    try {
      // Get customer
      const customer = await this.getCustomer(customerId);

      // Create or get Stripe customer
      let stripeCustomerId = await this.getStripeCustomerId(customerId);

      if (!stripeCustomerId) {
        const stripeCustomer = await this.stripe.customers.create({
          email: customer.email,
          name: customer.company_name,
          metadata: {
            internal_customer_id: customerId.toString(),
          },
        });

        stripeCustomerId = stripeCustomer.id;
        await this.saveStripeCustomerId(customerId, stripeCustomerId);
      }

      // Create price for the payment link
      const price = await this.stripe.prices.create({
        unit_amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        product_data: {
          name: description,
        },
        metadata: {
          customer_id: customerId.toString(),
          ...metadata,
        },
      });

      // Create payment link
      const paymentLink = await this.stripe.paymentLinks.create({
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        after_completion: {
          type: 'redirect',
          redirect: {
            url: `${config.API_BASE_URL}/payment/success?customer_id=${customerId}`,
          },
        },
        metadata: {
          customer_id: customerId.toString(),
          ...metadata,
        },
      });

      logger.info('Payment link created', {
        customerId,
        paymentLinkId: paymentLink.id,
        amount,
      });

      return {
        payment_link_url: paymentLink.url,
        stripe_payment_link_id: paymentLink.id,
        amount,
        currency: 'USD',
      };
    } catch (error) {
      logger.error('Failed to create payment link', {
        customerId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new ExternalServiceError('Stripe', 'Failed to create payment link');
    }
  }

  /**
   * Create Stripe customer
   *
   * Creates a customer in Stripe and saves the ID.
   */
  async createCustomer(customerData: {
    customer_id: number;
    email: string;
    name: string;
    phone?: string;
  }): Promise<StripeCustomerResult> {
    logger.info('Creating Stripe customer', { customerId: customerData.customer_id });

    try {
      const createParams: Stripe.CustomerCreateParams = {
        email: customerData.email,
        name: customerData.name,
        metadata: {
          internal_customer_id: customerData.customer_id.toString(),
        },
      };

      if (customerData.phone) {
        createParams.phone = customerData.phone;
      }

      const stripeCustomer = await this.stripe.customers.create(createParams);

      await this.saveStripeCustomerId(customerData.customer_id, stripeCustomer.id);

      logger.info('Stripe customer created', {
        customerId: customerData.customer_id,
        stripeCustomerId: stripeCustomer.id,
      });

      return {
        stripe_customer_id: stripeCustomer.id,
        email: stripeCustomer.email || customerData.email,
        name: stripeCustomer.name || customerData.name,
      };
    } catch (error) {
      logger.error('Failed to create Stripe customer', {
        customerId: customerData.customer_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new ExternalServiceError('Stripe', 'Failed to create Stripe customer');
    }
  }

  /**
   * Create subscription for customer
   *
   * Creates a recurring subscription in Stripe.
   */
  async createSubscription(
    customerId: number,
    priceId: string,
    trialDays?: number
  ): Promise<SubscriptionResult> {
    logger.info('Creating Stripe subscription', { customerId, priceId });

    try {
      const stripeCustomerId = await this.getStripeCustomerId(customerId);

      if (!stripeCustomerId) {
        throw new NotFoundError('Stripe customer not found. Create customer first.');
      }

      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: stripeCustomerId,
        items: [{ price: priceId }],
        metadata: {
          internal_customer_id: customerId.toString(),
        },
        ...(trialDays && { trial_period_days: trialDays }),
      };

      const subscription = await this.stripe.subscriptions.create(subscriptionParams);

      logger.info('Subscription created', {
        customerId,
        subscriptionId: subscription.id,
        status: subscription.status,
      });

      const firstItem = subscription.items.data[0];
      const unitAmount = firstItem?.price?.unit_amount || 0;

      return {
        subscription_id: subscription.id,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        amount: unitAmount / 100,
      };
    } catch (error) {
      logger.error('Failed to create subscription', {
        customerId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new ExternalServiceError('Stripe', 'Failed to create subscription');
    }
  }

  /**
   * Handle webhook event from Stripe
   *
   * Processes webhook events and updates billing records accordingly.
   *
   * @param rawBody - Raw request body (for signature verification)
   * @param signature - Stripe signature header
   * @returns Processing result
   */
  async handleWebhookEvent(rawBody: string, signature: string): Promise<void> {
    logger.info('Processing Stripe webhook event');

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        config.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      logger.error('Webhook signature verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new ExternalServiceError('Stripe', 'Invalid webhook signature');
    }

    logger.info('Webhook event received', { type: event.type, id: event.id });

    // Route to appropriate handler
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          logger.debug('Unhandled webhook event type', { type: event.type });
      }
    } catch (error) {
      logger.error('Error processing webhook event', {
        type: event.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // ============================================================================
  // WEBHOOK EVENT HANDLERS
  // ============================================================================

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    logger.info('Processing payment_intent.succeeded', { id: paymentIntent.id });

    const customerId = paymentIntent.metadata.customer_id;

    if (!customerId) {
      logger.warn('No customer_id in payment intent metadata', { id: paymentIntent.id });
      return;
    }

    // Update billing record
    await this.updateBillingRecordByStripePaymentIntent(
      paymentIntent.id,
      'paid',
      parseInt(customerId)
    );

    // Log activity
    await this.logActivity(parseInt(customerId), 'payment_succeeded', {
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
    });
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    logger.warn('Processing payment_intent.payment_failed', { id: paymentIntent.id });

    const customerId = paymentIntent.metadata.customer_id;

    if (!customerId) {
      logger.warn('No customer_id in payment intent metadata', { id: paymentIntent.id });
      return;
    }

    // Update billing record
    await this.updateBillingRecordByStripePaymentIntent(
      paymentIntent.id,
      'failed',
      parseInt(customerId)
    );

    // Log activity
    await this.logActivity(parseInt(customerId), 'payment_failed', {
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    logger.info('Processing subscription updated', { id: subscription.id });

    const customerId = subscription.metadata.internal_customer_id;

    if (!customerId) {
      logger.warn('No internal_customer_id in subscription metadata', { id: subscription.id });
      return;
    }

    // Log activity
    await this.logActivity(parseInt(customerId), 'subscription_updated', {
      subscription_id: subscription.id,
      status: subscription.status,
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    logger.warn('Processing subscription deleted', { id: subscription.id });

    const customerId = subscription.metadata.internal_customer_id;

    if (!customerId) {
      logger.warn('No internal_customer_id in subscription metadata', { id: subscription.id });
      return;
    }

    // Update customer status to suspended
    await this.updateCustomerStatus(parseInt(customerId), 'suspended');

    // Log activity
    await this.logActivity(parseInt(customerId), 'subscription_cancelled', {
      subscription_id: subscription.id,
    });
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    logger.info('Processing invoice.payment_succeeded', { id: invoice.id });

    const customerId = invoice.metadata?.customer_id;

    if (!customerId) {
      logger.warn('No customer_id in invoice metadata', { id: invoice.id });
      return;
    }

    // Update or create billing record
    await this.upsertBillingRecordFromInvoice(invoice, parseInt(customerId), 'paid');
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    logger.warn('Processing invoice.payment_failed', { id: invoice.id });

    const customerId = invoice.metadata?.customer_id;

    if (!customerId) {
      logger.warn('No customer_id in invoice metadata', { id: invoice.id });
      return;
    }

    // Update or create billing record
    await this.upsertBillingRecordFromInvoice(invoice, parseInt(customerId), 'failed');
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

  private async getStripeCustomerId(_customerId: number): Promise<string | null> {
    // TODO: Store stripe_customer_id in customers table or separate table
    // For now, query Stripe API
    logger.warn('TODO: Implement stripe_customer_id storage in database');
    return null;
  }

  private async saveStripeCustomerId(_customerId: number, _stripeCustomerId: string): Promise<void> {
    // TODO: Store in database
    logger.warn('TODO: Implement stripe_customer_id storage', {
      _customerId,
      _stripeCustomerId,
    });
  }

  private async updateBillingRecordByStripePaymentIntent(
    paymentIntentId: string,
    status: 'paid' | 'failed',
    customerId: number
  ): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE billing_records
      SET status = ?,
          stripe_payment_intent_id = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE customer_id = ?
        AND stripe_payment_intent_id IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `);

    stmt.run(status, paymentIntentId, customerId);
  }

  private async upsertBillingRecordFromInvoice(
    invoice: Stripe.Invoice,
    customerId: number,
    status: 'paid' | 'failed'
  ): Promise<void> {
    // Check if record exists
    const existing = this.db
      .prepare('SELECT id FROM billing_records WHERE stripe_invoice_id = ?')
      .get(invoice.id);

    if (existing) {
      // Update
      const stmt = this.db.prepare(`
        UPDATE billing_records
        SET status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE stripe_invoice_id = ?
      `);
      stmt.run(status, invoice.id);
    } else {
      // Insert
      const stmt = this.db.prepare(`
        INSERT INTO billing_records (
          customer_id, amount, currency, status,
          stripe_invoice_id, stripe_payment_intent_id,
          billing_period_start, billing_period_end
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        customerId,
        invoice.amount_paid / 100,
        invoice.currency,
        status,
        invoice.id,
        invoice.payment_intent as string | null,
        new Date(invoice.period_start * 1000).toISOString(),
        new Date(invoice.period_end * 1000).toISOString()
      );
    }
  }

  private async updateCustomerStatus(customerId: number, status: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE customers
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(status, customerId);
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
      'stripe',
      action,
      'payment',
      JSON.stringify(details)
    );
  }
}
