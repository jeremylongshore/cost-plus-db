/**
 * Stripe Payment Client
 * Handles customer creation, payment links, and subscriptions
 */

import Stripe from 'stripe';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import type {
  CustomerOptions,
  PaymentLinkOptions,
  SubscriptionOptions,
  StripeErrorDetails,
} from './types';

export class StripeClient {
  private stripe: Stripe;

  constructor() {
    if (!config.STRIPE_SECRET_KEY) {
      throw new Error('Stripe secret key is not configured');
    }

    this.stripe = new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      typescript: true,
    });

    logger.info('Stripe client initialized', {
      apiVersion: '2023-10-16',
      keyPrefix: config.STRIPE_SECRET_KEY.substring(0, 12) + '...',
    });
  }

  /**
   * Create a Stripe customer
   */
  async createCustomer(options: CustomerOptions): Promise<Stripe.Customer> {
    try {
      logger.info('Creating Stripe customer', {
        email: options.email,
        name: options.name,
      });

      const createOptions: Stripe.CustomerCreateParams = {
        email: options.email,
        name: options.name,
        metadata: options.metadata || {},
      };

      if (options.phone !== undefined) createOptions.phone = options.phone;
      if (options.description !== undefined) createOptions.description = options.description;

      const customer = await this.stripe.customers.create(createOptions);

      logger.info('Stripe customer created', {
        customerId: customer.id,
        email: customer.email,
      });

      return customer;
    } catch (error) {
      const errorDetails = this.parseStripeError(error);
      logger.error('Failed to create Stripe customer', {
        error: errorDetails,
        email: options.email,
      });
      throw error;
    }
  }

  /**
   * Create a payment link for one-time payment
   */
  async createPaymentLink(options: PaymentLinkOptions): Promise<Stripe.PaymentLink> {
    try {
      logger.info('Creating Stripe payment link', {
        amount: options.amount,
        description: options.description,
      });

      // Create a price for the payment link
      const price = await this.stripe.prices.create({
        unit_amount: Math.round(options.amount * 100), // Convert to cents
        currency: options.currency || 'usd',
        product_data: {
          name: options.description,
        },
      });

      // Create the payment link
      const paymentLink = await this.stripe.paymentLinks.create({
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        metadata: options.metadata || {},
        after_completion: {
          type: 'redirect',
          redirect: {
            url: options.successUrl || 'https://costplusdb.com/thank-you',
          },
        },
      });

      logger.info('Stripe payment link created', {
        paymentLinkId: paymentLink.id,
        url: paymentLink.url,
        amount: options.amount,
      });

      return paymentLink;
    } catch (error) {
      const errorDetails = this.parseStripeError(error);
      logger.error('Failed to create payment link', {
        error: errorDetails,
        amount: options.amount,
      });
      throw error;
    }
  }

  /**
   * Create a subscription for recurring payments
   */
  async createSubscription(options: SubscriptionOptions): Promise<Stripe.Subscription> {
    try {
      logger.info('Creating Stripe subscription', {
        customerId: options.customerId,
        priceId: options.priceId,
      });

      const subscriptionOptions: Stripe.SubscriptionCreateParams = {
        customer: options.customerId,
        items: [
          {
            price: options.priceId,
          },
        ],
        metadata: options.metadata || {},
      };

      if (options.trialPeriodDays !== undefined) {
        subscriptionOptions.trial_period_days = options.trialPeriodDays;
      }

      if (options.automaticTax) {
        subscriptionOptions.automatic_tax = { enabled: true };
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionOptions);

      logger.info('Stripe subscription created', {
        subscriptionId: subscription.id,
        customerId: options.customerId,
        status: subscription.status,
      });

      return subscription;
    } catch (error) {
      const errorDetails = this.parseStripeError(error);
      logger.error('Failed to create subscription', {
        error: errorDetails,
        customerId: options.customerId,
      });
      throw error;
    }
  }

  /**
   * Retrieve a payment intent
   */
  async retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    try {
      logger.info('Retrieving payment intent', { paymentIntentId: id });

      const paymentIntent = await this.stripe.paymentIntents.retrieve(id);

      logger.info('Payment intent retrieved', {
        paymentIntentId: id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
      });

      return paymentIntent;
    } catch (error) {
      const errorDetails = this.parseStripeError(error);
      logger.error('Failed to retrieve payment intent', {
        error: errorDetails,
        paymentIntentId: id,
      });
      throw error;
    }
  }

  /**
   * Retrieve a customer
   */
  async retrieveCustomer(id: string): Promise<Stripe.Customer> {
    try {
      logger.info('Retrieving Stripe customer', { customerId: id });

      const customer = await this.stripe.customers.retrieve(id);

      if (customer.deleted) {
        throw new Error('Customer has been deleted');
      }

      logger.info('Stripe customer retrieved', {
        customerId: id,
        email: customer.email,
      });

      return customer;
    } catch (error) {
      const errorDetails = this.parseStripeError(error);
      logger.error('Failed to retrieve customer', {
        error: errorDetails,
        customerId: id,
      });
      throw error;
    }
  }

  /**
   * Retrieve a subscription
   */
  async retrieveSubscription(id: string): Promise<Stripe.Subscription> {
    try {
      logger.info('Retrieving subscription', { subscriptionId: id });

      const subscription = await this.stripe.subscriptions.retrieve(id);

      logger.info('Subscription retrieved', {
        subscriptionId: id,
        status: subscription.status,
      });

      return subscription;
    } catch (error) {
      const errorDetails = this.parseStripeError(error);
      logger.error('Failed to retrieve subscription', {
        error: errorDetails,
        subscriptionId: id,
      });
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(id: string, atPeriodEnd: boolean = true): Promise<Stripe.Subscription> {
    try {
      logger.info('Canceling subscription', {
        subscriptionId: id,
        atPeriodEnd,
      });

      const subscription = atPeriodEnd
        ? await this.stripe.subscriptions.update(id, {
            cancel_at_period_end: true,
          })
        : await this.stripe.subscriptions.cancel(id);

      logger.info('Subscription canceled', {
        subscriptionId: id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });

      return subscription;
    } catch (error) {
      const errorDetails = this.parseStripeError(error);
      logger.error('Failed to cancel subscription', {
        error: errorDetails,
        subscriptionId: id,
      });
      throw error;
    }
  }

  /**
   * Parse Stripe errors into a consistent format
   */
  private parseStripeError(error: any): StripeErrorDetails {
    if (error instanceof Stripe.errors.StripeError) {
      const errorDetails: StripeErrorDetails = {
        type: error.type,
        message: error.message,
      };

      if (error.code !== undefined) errorDetails.code = error.code;
      if (error.statusCode !== undefined) errorDetails.statusCode = error.statusCode;
      if (error.requestId !== undefined) errorDetails.requestId = error.requestId;

      return errorDetails;
    }

    return {
      type: 'unknown',
      message: error.message || 'Unknown error',
    };
  }

  /**
   * Get the raw Stripe instance for advanced operations
   */
  getStripeInstance(): Stripe {
    return this.stripe;
  }
}

// Singleton instance
export const stripeClient = new StripeClient();
