/**
 * Webhook Controller
 *
 * Handles webhook events from external services (Stripe, GitHub).
 * Verifies signatures, processes events, and ensures idempotency.
 *
 * @module api/controllers/webhook
 */

import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import {
  validateStripeWebhook,
  validateGitHubWebhook,
  generateWebhookIdempotencyKey,
} from '../../validators/webhook.validator.js';
import { logger } from '../../utils/logger.js';
import { UnauthorizedError, ValidationError } from '../../utils/errors.js';
import { config } from '../../config/index.js';

/**
 * In-memory store for processed webhook IDs (idempotency)
 *
 * In production, this should be a Redis cache or database table
 * with TTL for automatic cleanup.
 */
const processedWebhooks = new Set<string>();

/**
 * Check if webhook was already processed (idempotency)
 */
function isWebhookProcessed(key: string): boolean {
  return processedWebhooks.has(key);
}

/**
 * Mark webhook as processed
 */
function markWebhookProcessed(key: string): void {
  processedWebhooks.add(key);

  // Auto-cleanup after 24 hours (prevent memory leak)
  setTimeout(() => {
    processedWebhooks.delete(key);
  }, 24 * 60 * 60 * 1000);
}

/**
 * Handle Stripe webhook events
 *
 * POST /api/webhooks/stripe
 *
 * Workflow:
 * 1. Verify Stripe signature
 * 2. Parse and validate event
 * 3. Check idempotency (prevent duplicate processing)
 * 4. Process event based on type
 * 5. Return 200 to acknowledge receipt
 *
 * @param req - Express request (with raw body)
 * @param res - Express response
 * @param next - Express next function
 */
export async function handleStripeWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      throw new UnauthorizedError('Missing Stripe signature');
    }

    // Initialize Stripe (if not already initialized)
    if (!config.STRIPE_SECRET_KEY) {
      logger.error('Stripe secret key not configured');
      throw new ValidationError('Stripe not configured');
    }

    const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body, // Raw body (not parsed JSON)
        signature,
        config.STRIPE_WEBHOOK_SECRET || ''
      );
    } catch (err: any) {
      logger.error('Stripe signature verification failed', { error: err.message });
      throw new UnauthorizedError('Invalid Stripe signature');
    }

    // Validate event structure
    const validatedEvent = validateStripeWebhook(event);

    logger.info('Stripe webhook received', {
      eventId: validatedEvent.id,
      eventType: validatedEvent.type,
      livemode: validatedEvent.livemode,
    });

    // Check idempotency
    const idempotencyKey = generateWebhookIdempotencyKey('stripe', validatedEvent.id);
    if (isWebhookProcessed(idempotencyKey)) {
      logger.warn('Duplicate Stripe webhook received', { eventId: validatedEvent.id });
      res.status(200).json({ success: true, message: 'Event already processed' });
      return;
    }

    // Mark as processed
    markWebhookProcessed(idempotencyKey);

    // Process event based on type
    await processStripeEvent(validatedEvent);

    logger.info('Stripe webhook processed successfully', { eventId: validatedEvent.id });

    // Acknowledge receipt
    res.status(200).json({
      success: true,
      message: 'Webhook received',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Process Stripe webhook event
 *
 * Routes event to appropriate handler based on event type.
 */
async function processStripeEvent(event: any): Promise<void> {
  switch (event.type) {
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object);
      break;

    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;

    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object);
      break;

    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object);
      break;

    default:
      logger.info('Unhandled Stripe event type', { type: event.type });
  }
}

/**
 * Handle invoice.paid event
 */
async function handleInvoicePaid(invoice: any): Promise<void> {
  logger.info('Invoice paid', { invoiceId: invoice.id, amount: invoice.amount_paid });

  // TODO: Update billing record in database
  // TODO: Activate/reactivate customer service if suspended
  // TODO: Send payment confirmation email
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice: any): Promise<void> {
  logger.warn('Invoice payment failed', { invoiceId: invoice.id });

  // TODO: Update billing record
  // TODO: Send payment failure notification
  // TODO: Suspend service after grace period
}

/**
 * Handle subscription.created event
 */
async function handleSubscriptionCreated(subscription: any): Promise<void> {
  logger.info('Subscription created', { subscriptionId: subscription.id });

  // TODO: Link subscription to customer
  // TODO: Store subscription details
}

/**
 * Handle subscription.updated event
 */
async function handleSubscriptionUpdated(subscription: any): Promise<void> {
  logger.info('Subscription updated', { subscriptionId: subscription.id });

  // TODO: Update subscription details
  // TODO: Handle tier changes
}

/**
 * Handle subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription: any): Promise<void> {
  logger.warn('Subscription deleted', { subscriptionId: subscription.id });

  // TODO: Mark customer as churned
  // TODO: Schedule database backup before deletion
  // TODO: Send cancellation confirmation
}

/**
 * Handle payment_intent.succeeded event
 */
async function handlePaymentIntentSucceeded(paymentIntent: any): Promise<void> {
  logger.info('Payment intent succeeded', {
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
  });

  // TODO: Record payment
}

/**
 * Handle payment_intent.payment_failed event
 */
async function handlePaymentIntentFailed(paymentIntent: any): Promise<void> {
  logger.warn('Payment intent failed', { paymentIntentId: paymentIntent.id });

  // TODO: Send payment failure notification
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutSessionCompleted(session: any): Promise<void> {
  logger.info('Checkout session completed', { sessionId: session.id });

  // TODO: Create or update customer subscription
  // TODO: Trigger provisioning workflow
}

/**
 * Handle GitHub webhook events
 *
 * POST /api/webhooks/github
 *
 * Workflow:
 * 1. Verify GitHub signature
 * 2. Parse and validate event
 * 3. Process event based on type
 * 4. Return 200 to acknowledge receipt
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export async function handleGitHubWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const eventType = req.headers['x-github-event'] as string;

    if (!signature) {
      throw new UnauthorizedError('Missing GitHub signature');
    }

    // TODO: Verify GitHub signature with HMAC
    // const isValid = verifyGitHubSignature(req.body, signature, config.GITHUB_WEBHOOK_SECRET);
    // if (!isValid) {
    //   throw new UnauthorizedError('Invalid GitHub signature');
    // }

    // Validate event structure
    const validatedEvent = validateGitHubWebhook(req.body);

    logger.info('GitHub webhook received', {
      eventType,
      repository: validatedEvent.repository.full_name,
      action: validatedEvent.action,
    });

    // Process event
    // TODO: Handle specific GitHub events (issues, PRs, releases, etc.)

    res.status(200).json({
      success: true,
      message: 'Webhook received',
    });
  } catch (error) {
    next(error);
  }
}
