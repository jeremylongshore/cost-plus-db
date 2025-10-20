/**
 * Services Module Exports
 *
 * Central export point for all service layer classes.
 * Services contain business logic and orchestrate operations
 * across repositories and external services.
 *
 * @module services
 */

// Service exports
export { CustomerService } from './customer.service.js';
export { ProvisioningService } from './provisioning.service.js';
export { BillingService } from './billing.service.js';
export { EmailService } from './email.service.js';
export { StripeService } from './stripe.service.js';
export { DatabaseService } from './database.service.js';
export { WorkflowService } from './workflow.service.js';

// Type exports from services
export type {
  IntakeFormData,
  CustomerOnboarding,
} from './customer.service.js';

export type {
  ProvisioningConfig,
  DatabaseProvisioningResult,
} from './provisioning.service.js';

export type {
  PricingBreakdown,
  Invoice,
  AddonConfig,
} from './billing.service.js';

export type {
  PaymentLinkResult,
  StripeCustomerResult,
  SubscriptionResult,
} from './stripe.service.js';

export type {
  HealthStatus,
  PoolStats,
  QueryResult,
  Metrics,
} from './database.service.js';

export type {
  WorkflowCheckpoint,
  WorkflowStatus,
  BlockerType,
} from './workflow.service.js';
