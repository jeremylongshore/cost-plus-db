# Stripe Payment Integration Guide

**Document Type:** DR-GUID (Daily Routine - Guide)
**Created:** 2025-10-20
**Owner:** Intent Solutions (CostPlusDB)
**Purpose:** Complete guide to integrating Stripe for payments and billing

---

## Overview

This guide covers setting up Stripe for CostPlusDB to handle subscription payments, invoicing, and billing automation.

**What Stripe Handles:**
- Monthly recurring payments
- Invoice generation
- Payment method management
- Failed payment retry logic
- Subscription lifecycle
- Webhook notifications

**Time Required:** 45-60 minutes
**Cost:** 2.9% + $0.30 per transaction

---

## Part 1: Stripe Account Setup

### Step 1: Create Stripe Account

1. Visit https://dashboard.stripe.com/register
2. Create account with business email
3. Complete business verification
4. Activate account

### Step 2: Enable Test Mode

1. Toggle to "Test mode" in dashboard
2. Use test keys for development
3. Use test cards for testing

### Step 3: Get API Keys

**Test Keys (Development):**

```
Publishable key: pk_test_...
Secret key: sk_test_...
```

**Live Keys (Production):**

```
Publishable key: pk_live_...
Secret key: sk_live_...
```

**Save keys to .env:**

```bash
# Development
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Production
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
```

---

## Part 2: Product and Price Setup

### Step 1: Create Products

1. Go to https://dashboard.stripe.com/products
2. Click "Add product"
3. Create 4 products:

**Shared Tier:**
- Name: CostPlusDB Shared
- Description: Shared PostgreSQL database
- Pricing: $49/month recurring

**Dedicated Tier:**
- Name: CostPlusDB Dedicated
- Description: Dedicated VPS with PostgreSQL
- Pricing: $89/month recurring

**Pro Tier:**
- Name: CostPlusDB Pro
- Description: High-performance dedicated database
- Pricing: $129/month recurring

**Enterprise Tier:**
- Name: CostPlusDB Enterprise
- Description: Enterprise-grade database with premium support
- Pricing: $149/month recurring

### Step 2: Note Price IDs

Save these price IDs for backend configuration:

```bash
# In .env or config file
STRIPE_PRICE_SHARED="price_..."
STRIPE_PRICE_DEDICATED="price_..."
STRIPE_PRICE_PRO="price_..."
STRIPE_PRICE_ENTERPRISE="price_..."
```

---

## Part 3: Backend Integration

### Step 1: Install Stripe SDK

```bash
cd backend
npm install stripe
```

### Step 2: Create Stripe Service

Create `src/services/stripe.service.ts`:

```typescript
/**
 * Stripe Service - Payment Integration
 */
import Stripe from 'stripe';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Create payment link for customer
   */
  async createPaymentLink(
    tier: 'shared' | 'dedicated' | 'pro' | 'enterprise',
    customerEmail: string,
    customerId: number
  ): Promise<string> {
    try {
      const priceId = this.getPriceId(tier);

      const paymentLink = await this.stripe.paymentLinks.create({
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        after_completion: {
          type: 'redirect',
          redirect: {
            url: 'https://costplusdb.dev/thank-you',
          },
        },
        metadata: {
          customer_id: customerId.toString(),
          tier: tier,
        },
        customer_creation: 'always',
        invoice_creation: {
          enabled: true,
        },
      });

      logger.info('Payment link created', { customerId, tier, url: paymentLink.url });
      return paymentLink.url;
    } catch (error) {
      logger.error('Failed to create payment link', { error, customerId, tier });
      throw error;
    }
  }

  /**
   * Create customer in Stripe
   */
  async createCustomer(email: string, name: string): Promise<Stripe.Customer> {
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: {
        source: 'costplusdb',
      },
    });

    logger.info('Stripe customer created', { stripeId: customer.id, email });
    return customer;
  }

  /**
   * Create subscription
   */
  async createSubscription(
    customerId: string,
    priceId: string
  ): Promise<Stripe.Subscription> {
    const subscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    return subscription;
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(
    payload: string,
    signature: string
  ): Promise<Stripe.Event> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        config.STRIPE_WEBHOOK_SECRET
      );

      logger.info('Webhook received', { type: event.type, id: event.id });
      return event;
    } catch (error) {
      logger.error('Webhook signature verification failed', { error });
      throw error;
    }
  }

  /**
   * Get invoice details
   */
  async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    return await this.stripe.invoices.retrieve(invoiceId);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.cancel(subscriptionId);
  }

  // Helper methods
  private getPriceId(tier: string): string {
    const priceMap = {
      shared: process.env.STRIPE_PRICE_SHARED!,
      dedicated: process.env.STRIPE_PRICE_DEDICATED!,
      pro: process.env.STRIPE_PRICE_PRO!,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE!,
    };

    return priceMap[tier as keyof typeof priceMap];
  }
}
```

### Step 3: Create Webhook Handler

Create `src/api/routes/webhooks.routes.ts`:

```typescript
/**
 * Stripe Webhook Routes
 */
import { Router, Request, Response } from 'express';
import { StripeService } from '../../services/stripe.service.js';
import { CustomersRepository } from '../../database/repositories/customers.repository.js';
import { logger } from '../../utils/logger.js';

const router = Router();
const stripeService = new StripeService();
const customersRepo = new CustomersRepository();

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string;

    try {
      // Verify webhook signature
      const event = await stripeService.handleWebhook(req.body, signature);

      // Handle different event types
      switch (event.type) {
        case 'invoice.payment_succeeded':
          await handlePaymentSucceeded(event.data.object as any);
          break;

        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object as any);
          break;

        case 'customer.subscription.created':
          await handleSubscriptionCreated(event.data.object as any);
          break;

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as any);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as any);
          break;

        default:
          logger.info('Unhandled webhook event', { type: event.type });
      }

      res.json({ received: true });
    } catch (error) {
      logger.error('Webhook processing failed', { error });
      res.status(400).json({ error: 'Webhook error' });
    }
  }
);

// Event handlers
async function handlePaymentSucceeded(invoice: any) {
  logger.info('Payment succeeded', { invoiceId: invoice.id });

  // Update customer status to active
  const customerId = invoice.metadata?.customer_id;
  if (customerId) {
    await customersRepo.updateStatus(parseInt(customerId), 'active');
  }

  // TODO: Send receipt email
}

async function handlePaymentFailed(invoice: any) {
  logger.error('Payment failed', { invoiceId: invoice.id });

  // Update customer status to suspended
  const customerId = invoice.metadata?.customer_id;
  if (customerId) {
    await customersRepo.updateStatus(parseInt(customerId), 'suspended');
  }

  // TODO: Send payment failed notification
}

async function handleSubscriptionCreated(subscription: any) {
  logger.info('Subscription created', { subscriptionId: subscription.id });
  // TODO: Record subscription in database
}

async function handleSubscriptionUpdated(subscription: any) {
  logger.info('Subscription updated', { subscriptionId: subscription.id });
  // TODO: Update subscription details
}

async function handleSubscriptionDeleted(subscription: any) {
  logger.info('Subscription deleted', { subscriptionId: subscription.id });
  // TODO: Handle cancellation
}

export default router;
```

---

## Part 4: Webhook Configuration

### Step 1: Create Webhook Endpoint in Stripe

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL: `https://api.costplusdb.dev/api/webhooks/stripe`
4. Description: CostPlusDB Production Webhooks

### Step 2: Select Events to Send

Select these events:
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### Step 3: Copy Webhook Secret

```bash
# Save to .env
STRIPE_WEBHOOK_SECRET="whsec_..."
```

---

## Part 5: Testing Webhooks Locally

### Step 1: Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_amd64.tar.gz
tar -xvf stripe_linux_amd64.tar.gz
sudo mv stripe /usr/local/bin/

# Verify installation
stripe --version
```

### Step 2: Login to Stripe

```bash
stripe login
# Opens browser for authentication
```

### Step 3: Forward Webhooks to Local Server

```bash
# Terminal 1: Start backend server
npm run dev

# Terminal 2: Forward webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Output will show webhook signing secret:
# Ready! Your webhook signing secret is whsec_... (^C to quit)
```

### Step 4: Trigger Test Events

```bash
# Terminal 3: Trigger test events
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.created

# Check Terminal 1 for webhook processing logs
```

---

## Part 6: Testing Payments

### Test Credit Cards

Use these test cards in test mode:

**Successful Payment:**
```
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
```

**Payment Requires Authentication (3D Secure):**
```
Card: 4000 0025 0000 3155
```

**Payment Fails:**
```
Card: 4000 0000 0000 9995
```

### Test Subscription Flow

```bash
# 1. Create payment link
curl -X POST http://localhost:3000/api/customers/1/payment-link

# 2. Visit payment link URL
# 3. Enter test card details
# 4. Complete payment
# 5. Webhook should trigger and update customer status
```

---

## Part 7: Invoice Management

### Generate Invoice

```typescript
async generateInvoice(customerId: string, amount: number) {
  const invoice = await this.stripe.invoices.create({
    customer: customerId,
    collection_method: 'charge_automatically',
    auto_advance: true,
  });

  // Add line item
  await this.stripe.invoiceItems.create({
    customer: customerId,
    invoice: invoice.id,
    amount: amount * 100, // Convert to cents
    currency: 'usd',
    description: 'CostPlusDB Monthly Subscription',
  });

  // Finalize and send
  await this.stripe.invoices.finalizeInvoice(invoice.id);

  return invoice;
}
```

### Download Invoice PDF

```typescript
async downloadInvoicePdf(invoiceId: string): Promise<string> {
  const invoice = await this.stripe.invoices.retrieve(invoiceId);
  return invoice.invoice_pdf!; // URL to PDF
}
```

---

## Part 8: Monitoring and Troubleshooting

### View Payments in Dashboard

1. Go to https://dashboard.stripe.com/payments
2. Filter by status: Successful, Failed, Refunded
3. View payment details
4. Issue refunds if needed

### Common Issues

**Issue: Webhook signature verification failed**

```typescript
// Ensure you're using raw body parser
app.post('/webhooks/stripe',
  express.raw({ type: 'application/json' }), // Important!
  async (req, res) => {
    // Webhook handler
  }
);
```

**Issue: Payment failed**

Check:
- Card has sufficient funds
- Card is not expired
- 3D Secure authentication completed
- Stripe account is active

**Issue: Subscription not created**

Verify:
- Price ID is correct
- Customer exists in Stripe
- Payment method is attached

---

## Part 9: Production Checklist

Before going live:

- [ ] Activate Stripe account
- [ ] Switch to live API keys
- [ ] Update webhook endpoint to production URL
- [ ] Test live payments with real card
- [ ] Configure email receipts
- [ ] Set up tax collection (if applicable)
- [ ] Review pricing and products
- [ ] Enable fraud prevention (Radar)

---

## Security Best Practices

### 1. Never Log Sensitive Data

```typescript
// Wrong
logger.info('Payment', { card: cardNumber });

// Correct
logger.info('Payment', { last4: card.last4, brand: card.brand });
```

### 2. Verify Webhook Signatures

Always verify webhook signatures to prevent replay attacks.

### 3. Use Environment Variables

Never hardcode API keys in source code.

### 4. PCI Compliance

- Never store card numbers
- Use Stripe Elements for card input
- Let Stripe handle PCI compliance

---

## Cost Optimization

**Stripe Fees:**
- 2.9% + $0.30 per successful transaction
- No monthly fees
- No setup fees

**For $49/month subscription:**
- Stripe fee: $1.72 per month
- Net revenue: $47.28

**Tips to Reduce Fees:**
- Use ACH transfers for larger amounts (0.8%, max $5)
- Negotiate rates at higher volume (contact Stripe)

---

## Related Documentation

- **043-DR-GUID-local-development-setup.md** - Local setup
- **044-DR-GUID-production-deployment.md** - Production deployment
- **backend/docs/API.md** - API reference

---

**Document Owner:** Jeremy Longshore (jeremy@intentsolutions.io)
**Last Updated:** 2025-10-20
**Review Frequency:** Quarterly
