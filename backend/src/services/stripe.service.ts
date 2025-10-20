/**
 * Stripe Service
 *
 * High-level service layer for Stripe operations.
 * Wraps the Stripe integration client and provides business logic.
 *
 * This service coordinates between:
 * - Stripe integration client (src/integrations/stripe/client.ts)
 * - Database operations
 * - Email notifications
 * - Activity logging
 *
 * @module services/stripe
 */

import Database from 'better-sqlite3';
import { stripeClient } from '../integrations/stripe/client.js';
import { config } from '../config/index.js';
import { ExternalServiceError, NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { PaymentLinkOptions, SubscriptionOptions } from '../integrations/stripe/types.js';

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
 * Stripe service class
 */
export class StripeService {
  constructor(private db: Database.Database) {}

  /**
   * Create payment link for customer
   *
   * Generates a Stripe Payment Link for one-time payment.
   * This method wraps the Stripe client and adds database integration.
   *
   * @param customerId - Internal customer ID
   * @returns Payment link details
   */
  async createPaymentLinkForCustomer(customerId: number): Promise<PaymentLinkResult> {
    logger.info('Creating payment link for customer', { customerId });

    try {
      // Get customer
      const customer = await this.getCustomer(customerId);

      // Create or get Stripe customer
      let stripeCustomerId = await this.getStripeCustomerId(customerId);

      if (!stripeCustomerId) {
        const stripeCustomer = await stripeClient.createCustomer({
          email: customer.email,
          name: customer.company_name,
          phone: customer.phone || undefined,
          metadata: {
            internal_customer_id: customerId.toString(),
            tier: customer.tier,
          },
        });

        stripeCustomerId = stripeCustomer.id;
        await this.saveStripeCustomerId(customerId, stripeCustomerId);
      }

      // Calculate amount based on tier
      // TODO: Get this from BillingService instead
      const tierPrices: Record<string, number> = {
        shared: 49,
        dedicated: 89,
        pro: 129,
        enterprise: 149,
      };
      const amount = tierPrices[customer.tier] || 49;

      // Create payment link using Stripe client
      const paymentLinkOptions: PaymentLinkOptions = {
        customerId: stripeCustomerId,
        amount,
        currency: 'usd',
        description: `CostPlusDB ${customer.tier} tier - Monthly subscription`,
        metadata: {
          customer_id: customerId.toString(),
          tier: customer.tier,
          type: 'monthly_subscription',
        },
        successUrl: `${config.API_BASE_URL}/payment/success?customer_id=${customerId}`,
      };

      const paymentLink = await stripeClient.createPaymentLink(paymentLinkOptions);

      // Log activity
      await this.logActivity(customerId, 'payment_link_created', {
        payment_link_id: paymentLink.id,
        amount,
      });

      logger.info('Payment link created successfully', {
        customerId,
        paymentLinkId: paymentLink.id,
      });

      return {
        payment_link_url: paymentLink.url,
        stripe_payment_link_id: paymentLink.id,
        amount,
        currency: 'USD',
      };
    } catch (error) {
      logger.error('Failed to create payment link for customer', {
        customerId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new ExternalServiceError('Stripe', 'Failed to create payment link');
    }
  }

  /**
   * Handle successful payment
   *
   * Called when a payment succeeds (via webhook or manual processing).
   * Updates billing records and customer status.
   *
   * @param paymentIntentId - Stripe payment intent ID
   */
  async handlePaymentSuccess(paymentIntentId: string): Promise<void> {
    logger.info('Handling payment success', { paymentIntentId });

    try {
      // Retrieve payment intent from Stripe
      const paymentIntent = await stripeClient.retrievePaymentIntent(paymentIntentId);

      // Extract customer ID from metadata
      const customerId = paymentIntent.metadata.customer_id;
      if (!customerId) {
        throw new Error('customer_id not found in payment intent metadata');
      }

      const customerIdNum = parseInt(customerId, 10);

      // Update billing record
      await this.updateBillingRecordByStripePaymentIntent(
        paymentIntentId,
        'paid',
        customerIdNum
      );

      // Update customer status to active if not already
      const customer = await this.getCustomer(customerIdNum);
      if (customer.status === 'provisioning' || customer.status === 'approved') {
        await this.updateCustomerStatus(customerIdNum, 'active');
      }

      // Log activity
      await this.logActivity(customerIdNum, 'payment_succeeded', {
        payment_intent_id: paymentIntentId,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
      });

      logger.info('Payment success handled', {
        paymentIntentId,
        customerId: customerIdNum,
        amount: paymentIntent.amount / 100,
      });
    } catch (error) {
      logger.error('Failed to handle payment success', {
        paymentIntentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Handle failed payment
   *
   * Called when a payment fails (via webhook or manual processing).
   * Updates billing records and may suspend customer.
   *
   * @param paymentIntentId - Stripe payment intent ID
   */
  async handlePaymentFailure(paymentIntentId: string): Promise<void> {
    logger.warn('Handling payment failure', { paymentIntentId });

    try {
      // Retrieve payment intent from Stripe
      const paymentIntent = await stripeClient.retrievePaymentIntent(paymentIntentId);

      // Extract customer ID from metadata
      const customerId = paymentIntent.metadata.customer_id;
      if (!customerId) {
        throw new Error('customer_id not found in payment intent metadata');
      }

      const customerIdNum = parseInt(customerId, 10);

      // Update billing record
      await this.updateBillingRecordByStripePaymentIntent(
        paymentIntentId,
        'failed',
        customerIdNum
      );

      // Log activity
      await this.logActivity(customerIdNum, 'payment_failed', {
        payment_intent_id: paymentIntentId,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        failure_message: paymentIntent.last_payment_error?.message,
      });

      // TODO: Implement dunning logic
      // TODO: Send payment failure notification email

      logger.warn('Payment failure handled', {
        paymentIntentId,
        customerId: customerIdNum,
      });
    } catch (error) {
      logger.error('Failed to handle payment failure', {
        paymentIntentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
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
      const customerOptions: any = {
        email: customerData.email,
        name: customerData.name,
        metadata: {
          internal_customer_id: customerData.customer_id.toString(),
        },
      };

      if (customerData.phone !== undefined) {
        customerOptions.phone = customerData.phone;
      }

      const stripeCustomer = await stripeClient.createCustomer(customerOptions);

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

      const subscriptionOptions: SubscriptionOptions = {
        customerId: stripeCustomerId,
        priceId,
        metadata: {
          internal_customer_id: customerId.toString(),
        },
      };

      if (trialDays !== undefined) {
        subscriptionOptions.trialPeriodDays = trialDays;
      }

      const subscription = await stripeClient.createSubscription(subscriptionOptions);

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
    // For now, return null (will create new customer each time)
    logger.debug('TODO: Implement stripe_customer_id storage in database');
    return null;
  }

  private async saveStripeCustomerId(_customerId: number, _stripeCustomerId: string): Promise<void> {
    // TODO: Store in database
    // This should add a column to customers table or create a separate stripe_customers table
    logger.debug('TODO: Implement stripe_customer_id storage', {
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
        AND (stripe_payment_intent_id IS NULL OR stripe_payment_intent_id = ?)
      ORDER BY created_at DESC
      LIMIT 1
    `);

    stmt.run(status, paymentIntentId, customerId, paymentIntentId);
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
