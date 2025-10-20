/**
 * Webhook Validator
 *
 * Zod schemas for validating webhook events from external services
 * including Stripe payment webhooks and GitHub repository webhooks.
 *
 * @module validators/webhook
 */

import { z } from 'zod';

/**
 * Stripe webhook event types we handle
 */
const stripeEventTypeEnum = z.enum([
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.payment_action_required',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.refunded',
  'checkout.session.completed',
]);

/**
 * Stripe webhook base event schema
 */
export const stripeWebhookEventSchema = z.object({
  id: z.string(),
  object: z.literal('event'),
  api_version: z.string().nullable().optional(),
  created: z.number().int().positive(),
  type: stripeEventTypeEnum,
  livemode: z.boolean(),
  data: z.object({
    object: z.record(z.any()), // Flexible object for event data
  }),
  request: z
    .object({
      id: z.string().nullable(),
      idempotency_key: z.string().nullable(),
    })
    .nullable()
    .optional(),
});

/**
 * Stripe invoice object schema
 */
export const stripeInvoiceSchema = z.object({
  id: z.string(),
  object: z.literal('invoice'),
  customer: z.string(),
  subscription: z.string().nullable().optional(),
  amount_due: z.number().int(),
  amount_paid: z.number().int(),
  amount_remaining: z.number().int(),
  currency: z.string(),
  status: z.enum([
    'draft',
    'open',
    'paid',
    'uncollectible',
    'void',
  ]),
  hosted_invoice_url: z.string().url().nullable().optional(),
  invoice_pdf: z.string().url().nullable().optional(),
  metadata: z.record(z.string()).optional(),
});

/**
 * Stripe subscription object schema
 */
export const stripeSubscriptionSchema = z.object({
  id: z.string(),
  object: z.literal('subscription'),
  customer: z.string(),
  status: z.enum([
    'active',
    'past_due',
    'unpaid',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'trialing',
  ]),
  current_period_start: z.number().int(),
  current_period_end: z.number().int(),
  cancel_at_period_end: z.boolean(),
  metadata: z.record(z.string()).optional(),
});

/**
 * Stripe payment intent object schema
 */
export const stripePaymentIntentSchema = z.object({
  id: z.string(),
  object: z.literal('payment_intent'),
  customer: z.string().nullable().optional(),
  amount: z.number().int().positive(),
  currency: z.string(),
  status: z.enum([
    'requires_payment_method',
    'requires_confirmation',
    'requires_action',
    'processing',
    'requires_capture',
    'canceled',
    'succeeded',
  ]),
  metadata: z.record(z.string()).optional(),
});

/**
 * Stripe checkout session schema
 */
export const stripeCheckoutSessionSchema = z.object({
  id: z.string(),
  object: z.literal('checkout.session'),
  customer: z.string().nullable().optional(),
  customer_email: z.string().email().nullable().optional(),
  amount_total: z.number().int().nullable().optional(),
  currency: z.string().nullable().optional(),
  payment_status: z.enum(['paid', 'unpaid', 'no_payment_required']),
  status: z.enum(['open', 'complete', 'expired']),
  metadata: z.record(z.string()).optional(),
});

/**
 * GitHub webhook event types we handle
 * (currently not used but kept for future validation)
 */
// const githubEventTypeEnum = z.enum([
//   'issues',
//   'pull_request',
//   'push',
//   'release',
//   'workflow_run',
// ]);

/**
 * GitHub webhook event schema
 */
export const githubWebhookEventSchema = z.object({
  action: z.string().optional(),
  repository: z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    private: z.boolean(),
  }),
  sender: z.object({
    login: z.string(),
    id: z.number(),
    type: z.string(),
  }),
  // Event-specific data varies, keep flexible
  issue: z.record(z.any()).optional(),
  pull_request: z.record(z.any()).optional(),
  ref: z.string().optional(),
  commits: z.array(z.any()).optional(),
  workflow_run: z.record(z.any()).optional(),
});

/**
 * Webhook signature validation schema
 */
export const webhookSignatureSchema = z.object({
  signature: z.string().min(1, 'Signature is required'),
  timestamp: z.coerce.number().int().positive(),
  body: z.string().min(1, 'Body is required'),
});

/**
 * Type inference
 */
export type StripeWebhookEvent = z.infer<typeof stripeWebhookEventSchema>;
export type StripeInvoice = z.infer<typeof stripeInvoiceSchema>;
export type StripeSubscription = z.infer<typeof stripeSubscriptionSchema>;
export type StripePaymentIntent = z.infer<typeof stripePaymentIntentSchema>;
export type StripeCheckoutSession = z.infer<typeof stripeCheckoutSessionSchema>;
export type GitHubWebhookEvent = z.infer<typeof githubWebhookEventSchema>;
export type WebhookSignature = z.infer<typeof webhookSignatureSchema>;

/**
 * Validate Stripe webhook event
 */
export function validateStripeWebhook(data: unknown): StripeWebhookEvent {
  return stripeWebhookEventSchema.parse(data);
}

/**
 * Validate GitHub webhook event
 */
export function validateGitHubWebhook(data: unknown): GitHubWebhookEvent {
  return githubWebhookEventSchema.parse(data);
}

/**
 * Validate webhook signature
 */
export function validateWebhookSignature(data: unknown): WebhookSignature {
  return webhookSignatureSchema.parse(data);
}

/**
 * Check if webhook event is duplicate (for idempotency)
 *
 * Webhooks may be retried by the provider, so we need to track
 * processed event IDs to avoid duplicate processing.
 */
export function generateWebhookIdempotencyKey(
  provider: 'stripe' | 'github',
  eventId: string
): string {
  return `${provider}:${eventId}`;
}
