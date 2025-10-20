/**
 * Test Fixtures - Customer Data
 *
 * Sample data for testing customer-related functionality.
 * Provides consistent test data across all test suites.
 *
 * @module tests/fixtures/customers
 */

import { Customer, CustomerStatus, PricingTier } from '../../src/database/schema.js';
import { IntakeFormData } from '../../src/services/customer.service.js';

/**
 * Sample customer records
 */
export const sampleCustomers: Partial<Customer>[] = [
  {
    id: 1,
    company_name: 'Acme Corporation',
    email: 'admin@acme.com',
    tier: 'dedicated',
    status: 'active',
    contact_name: 'John Doe',
    phone: '+1-555-0100',
    website: 'https://acme.com',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
  },
  {
    id: 2,
    company_name: 'TechStart Inc',
    email: 'founder@techstart.io',
    tier: 'shared',
    status: 'prospect',
    contact_name: 'Jane Smith',
    phone: '+1-555-0200',
    website: 'https://techstart.io',
    created_at: '2024-01-02T10:00:00Z',
    updated_at: '2024-01-02T10:00:00Z',
  },
  {
    id: 3,
    company_name: 'Enterprise Solutions LLC',
    email: 'it@enterprise.com',
    tier: 'enterprise',
    status: 'consultation',
    contact_name: 'Bob Johnson',
    phone: '+1-555-0300',
    website: 'https://enterprise.com',
    created_at: '2024-01-03T10:00:00Z',
    updated_at: '2024-01-03T10:00:00Z',
  },
  {
    id: 4,
    company_name: 'ProDev Studios',
    email: 'team@prodev.io',
    tier: 'pro',
    status: 'provisioning',
    contact_name: 'Alice Brown',
    phone: '+1-555-0400',
    website: 'https://prodev.io',
    created_at: '2024-01-04T10:00:00Z',
    updated_at: '2024-01-04T10:00:00Z',
  },
  {
    id: 5,
    company_name: 'Suspended Co',
    email: 'billing@suspended.com',
    tier: 'dedicated',
    status: 'suspended',
    contact_name: 'Charlie Wilson',
    phone: '+1-555-0500',
    website: 'https://suspended.com',
    created_at: '2024-01-05T10:00:00Z',
    updated_at: '2024-01-05T10:00:00Z',
  },
];

/**
 * Sample intake form submissions
 */
export const sampleIntakeForms: IntakeFormData[] = [
  {
    company_name: 'NewStartup Inc',
    email: 'hello@newstartup.com',
    tier: 'shared',
    status: 'prospect',
    contact_name: 'Emma Davis',
    phone: '+1-555-0600',
    website: 'https://newstartup.com',
    business_description: 'SaaS platform for project management',
    expected_traffic: '1000 users/month initially',
    compliance_requirements: 'None',
  },
  {
    company_name: 'FinTech Corp',
    email: 'security@fintech.com',
    tier: 'enterprise',
    status: 'prospect',
    contact_name: 'Michael Chen',
    phone: '+1-555-0700',
    website: 'https://fintech.com',
    business_description: 'Financial services platform',
    expected_traffic: '50,000 transactions/day',
    compliance_requirements: 'PCI DSS, SOC 2',
  },
  {
    company_name: 'HealthTech Solutions',
    email: 'admin@healthtech.com',
    tier: 'pro',
    status: 'prospect',
    contact_name: 'Sarah Williams',
    phone: '+1-555-0800',
    website: 'https://healthtech.com',
    business_description: 'Healthcare analytics platform',
    expected_traffic: '5,000 users/month',
    compliance_requirements: 'HIPAA',
  },
];

/**
 * Sample Stripe webhook events
 */
export const sampleStripeEvents = {
  paymentIntentSucceeded: {
    id: 'evt_test_payment_succeeded',
    object: 'event',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test_12345',
        object: 'payment_intent',
        amount: 8900,
        currency: 'usd',
        status: 'succeeded',
        metadata: {
          customer_id: '1',
          tier: 'dedicated',
        },
      },
    },
    created: Math.floor(Date.now() / 1000),
  },
  paymentIntentFailed: {
    id: 'evt_test_payment_failed',
    object: 'event',
    type: 'payment_intent.payment_failed',
    data: {
      object: {
        id: 'pi_test_67890',
        object: 'payment_intent',
        amount: 4900,
        currency: 'usd',
        status: 'requires_payment_method',
        last_payment_error: {
          code: 'card_declined',
          message: 'Your card was declined',
        },
        metadata: {
          customer_id: '2',
          tier: 'shared',
        },
      },
    },
    created: Math.floor(Date.now() / 1000),
  },
  subscriptionCreated: {
    id: 'evt_test_subscription_created',
    object: 'event',
    type: 'customer.subscription.created',
    data: {
      object: {
        id: 'sub_test_12345',
        object: 'subscription',
        status: 'active',
        items: {
          data: [
            {
              price: {
                id: 'price_dedicated',
                unit_amount: 8900,
              },
            },
          ],
        },
        metadata: {
          customer_id: '3',
        },
      },
    },
    created: Math.floor(Date.now() / 1000),
  },
  subscriptionDeleted: {
    id: 'evt_test_subscription_deleted',
    object: 'event',
    type: 'customer.subscription.deleted',
    data: {
      object: {
        id: 'sub_test_67890',
        object: 'subscription',
        status: 'canceled',
        metadata: {
          customer_id: '5',
        },
      },
    },
    created: Math.floor(Date.now() / 1000),
  },
};

/**
 * Sample database credentials
 */
export const sampleDatabaseCredentials = {
  host: 'db01.costplusdb.com',
  port: 5432,
  database_name: 'acme_production',
  username: 'acme_user',
  password: 'secure_random_password_123',
  ssl_enabled: true,
  connection_string:
    'postgresql://acme_user:secure_random_password_123@db01.costplusdb.com:5432/acme_production?sslmode=require',
};

/**
 * Sample billing records
 */
export const sampleBillingRecords = [
  {
    id: 1,
    customer_id: 1,
    amount: 8900,
    currency: 'usd',
    status: 'paid',
    stripe_invoice_id: 'in_test_12345',
    stripe_payment_intent_id: 'pi_test_12345',
    billing_period_start: '2024-01-01T00:00:00Z',
    billing_period_end: '2024-02-01T00:00:00Z',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
  },
  {
    id: 2,
    customer_id: 2,
    amount: 4900,
    currency: 'usd',
    status: 'pending',
    stripe_invoice_id: 'in_test_67890',
    stripe_payment_intent_id: null,
    billing_period_start: '2024-01-01T00:00:00Z',
    billing_period_end: '2024-02-01T00:00:00Z',
    created_at: '2024-01-02T10:00:00Z',
    updated_at: '2024-01-02T10:00:00Z',
  },
];

/**
 * Pricing tier configurations for testing
 */
export const pricingTiers = {
  shared: {
    name: 'Shared',
    base_price: 4900, // $49.00 in cents
    our_cost: 1500,
    storage_gb: 10,
    connection_limit: 50,
    backup_included: true,
  },
  dedicated: {
    name: 'Dedicated',
    base_price: 8900, // $89.00 in cents
    our_cost: 3000,
    storage_gb: 50,
    connection_limit: 200,
    backup_included: true,
  },
  pro: {
    name: 'Pro',
    base_price: 12900, // $129.00 in cents
    our_cost: 5000,
    storage_gb: 100,
    connection_limit: 500,
    backup_included: true,
  },
  enterprise: {
    name: 'Enterprise',
    base_price: 14900, // $149.00 in cents
    our_cost: 6000,
    storage_gb: 200,
    connection_limit: 1000,
    backup_included: true,
  },
};

/**
 * Add-on pricing for testing
 */
export const addonPricing = {
  ha: {
    name: 'High Availability',
    price: 9900, // $99.00 in cents
    our_cost: 4000,
  },
  replicas: {
    name: 'Read Replicas',
    price_per_replica: 1500, // $15.00 per replica in cents
    our_cost_per_replica: 500,
  },
  vpn: {
    name: 'VPN Access',
    price: 1500, // $15.00 in cents
    our_cost: 300,
  },
  compliance: {
    name: 'Compliance Package',
    price: 10000, // $100.00 in cents
    our_cost: 2000,
  },
};

/**
 * Helper function to create a customer with specific status
 */
export function createCustomerWithStatus(status: CustomerStatus): Partial<Customer> {
  return {
    company_name: `Test Company ${status}`,
    email: `test-${status}@example.com`,
    tier: 'dedicated',
    status,
    contact_name: 'Test User',
    phone: '+1-555-9999',
    website: 'https://test.com',
  };
}

/**
 * Helper function to create intake form with specific tier
 */
export function createIntakeFormWithTier(tier: PricingTier): IntakeFormData {
  return {
    company_name: `Test Company ${tier}`,
    email: `test-${tier}@example.com`,
    tier,
    status: 'prospect',
    contact_name: 'Test User',
    phone: '+1-555-9999',
    website: 'https://test.com',
    business_description: 'Test business',
    expected_traffic: '1000 users/month',
    compliance_requirements: 'None',
  };
}

/**
 * Helper function to create invalid intake forms for validation testing
 */
export const invalidIntakeForms = {
  missingEmail: {
    company_name: 'Test Company',
    tier: 'shared',
    status: 'prospect',
    contact_name: 'Test User',
  },
  invalidEmail: {
    company_name: 'Test Company',
    email: 'not-an-email',
    tier: 'shared',
    status: 'prospect',
  },
  missingCompanyName: {
    email: 'test@example.com',
    tier: 'shared',
    status: 'prospect',
  },
  invalidTier: {
    company_name: 'Test Company',
    email: 'test@example.com',
    tier: 'invalid-tier',
    status: 'prospect',
  },
};
