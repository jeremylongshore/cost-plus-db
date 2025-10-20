/**
 * Stripe Integration Types
 * Type definitions for Stripe payment operations
 */

import type Stripe from 'stripe';

export interface PaymentLinkOptions {
  customerId?: string;
  amount: number;
  currency?: string;
  description: string;
  metadata?: Record<string, string>;
  successUrl?: string;
  cancelUrl?: string;
}

export interface SubscriptionOptions {
  customerId: string;
  priceId: string;
  metadata?: Record<string, string>;
  trialPeriodDays?: number;
  automaticTax?: boolean;
}

export interface CustomerOptions {
  email: string;
  name: string;
  phone?: string;
  metadata?: Record<string, string>;
  description?: string;
}

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  data: any;
  created: number;
  livemode: boolean;
}

export enum WebhookEventType {
  PAYMENT_INTENT_SUCCEEDED = 'payment_intent.succeeded',
  PAYMENT_INTENT_FAILED = 'payment_intent.payment_failed',
  SUBSCRIPTION_CREATED = 'customer.subscription.created',
  SUBSCRIPTION_UPDATED = 'customer.subscription.updated',
  SUBSCRIPTION_DELETED = 'customer.subscription.deleted',
  INVOICE_PAYMENT_SUCCEEDED = 'invoice.payment_succeeded',
  INVOICE_PAYMENT_FAILED = 'invoice.payment_failed',
  CHECKOUT_SESSION_COMPLETED = 'checkout.session.completed',
}

export interface PaymentIntentData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  customerId: string;
  customerEmail: string;
  metadata: Record<string, string>;
}

export interface SubscriptionData {
  id: string;
  customerId: string;
  status: string;
  priceId: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  metadata: Record<string, string>;
}

export interface InvoiceData {
  id: string;
  customerId: string;
  subscriptionId: string;
  amountDue: number;
  amountPaid: number;
  status: string;
  paid: boolean;
  metadata: Record<string, string>;
}

export interface StripeCustomerMetadata {
  customerDbId?: string;
  tier?: string;
  planName?: string;
  onboardingSource?: string;
}

export interface StripePaymentMetadata {
  customerDbId: string;
  customerId: string;
  tier: string;
  type: 'setup_fee' | 'monthly_subscription' | 'one_time';
}

export interface WebhookProcessingResult {
  success: boolean;
  eventId: string;
  eventType: string;
  processed: boolean;
  error?: string;
  timestamp: Date;
}

export interface StripeErrorDetails {
  type: string;
  code?: string;
  message: string;
  statusCode?: number;
  requestId?: string;
}

// Extended Stripe types with our custom metadata
export interface CostPlusStripeCustomer extends Stripe.Customer {
  metadata: StripeCustomerMetadata;
}

export interface CostPlusPaymentIntent extends Stripe.PaymentIntent {
  metadata: StripePaymentMetadata;
}

export interface CostPlusSubscription extends Stripe.Subscription {
  metadata: StripePaymentMetadata;
}
