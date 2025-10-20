# Resend Email Integration Guide

**Document Type:** DR-GUID (Daily Routine - Guide)
**Created:** 2025-10-20
**Owner:** Intent Solutions (CostPlusDB)
**Purpose:** Complete guide to integrating Resend email service

---

## Overview

Resend is a modern email API designed for developers. This guide covers setting up Resend for CostPlusDB to send transactional emails.

**Email Types:**
- Customer intake confirmations
- Database credentials delivery
- Billing invoices
- Support ticket updates
- System alerts

**Time Required:** 20-30 minutes
**Cost:** Free tier: 100 emails/day, 3,000 emails/month

---

## Part 1: Resend Account Setup

### Step 1: Create Resend Account

1. Visit https://resend.com/signup
2. Sign up with email or GitHub
3. Verify email address

### Step 2: Generate API Key

1. Go to https://resend.com/api-keys
2. Click "Create API Key"
3. Name: `CostPlusDB Production`
4. Permission: Full Access
5. Copy API key (shown once!)

**Save API key securely:**

```bash
# Local .env
RESEND_API_KEY="re_123456789_yourkey"

# Production .env (on VPS)
RESEND_API_KEY="re_PRODUCTION_KEY"
```

---

## Part 2: Domain Configuration

### Step 1: Add Domain to Resend

1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter: `intentsolutions.io` (or your domain)
4. Follow DNS setup instructions

### Step 2: Configure DNS Records

Add these DNS records to your domain registrar:

**SPF Record (TXT):**
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
```

**DKIM Record (TXT):**
```
Type: TXT
Name: resend._domainkey
Value: (provided by Resend)
```

**DMARC Record (TXT):**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:admin@intentsolutions.io
```

### Step 3: Verify Domain

1. Wait 5-10 minutes for DNS propagation
2. Click "Verify" in Resend dashboard
3. Status should change to "Verified"

**Verified Status:**
```
✅ SPF: Verified
✅ DKIM: Verified
✅ DMARC: Verified
```

---

## Part 3: Backend Integration

### Step 1: Install Resend SDK

```bash
cd backend
npm install resend
```

### Step 2: Create Email Service

Create `src/services/email.service.ts`:

```typescript
/**
 * Email Service - Resend Integration
 */
import { Resend } from 'resend';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class EmailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(config.RESEND_API_KEY);
  }

  /**
   * Send intake confirmation email
   */
  async sendIntakeConfirmation(to: string, customerName: string): Promise<void> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: config.RESEND_FROM_EMAIL,
        to: [to],
        subject: 'Thanks for contacting CostPlusDB!',
        html: this.getIntakeConfirmationTemplate(customerName),
      });

      if (error) {
        logger.error('Failed to send intake confirmation', { error, to });
        throw error;
      }

      logger.info('Intake confirmation sent', { emailId: data?.id, to });
    } catch (error) {
      logger.error('Email sending failed', { error });
      throw error;
    }
  }

  /**
   * Send database credentials
   */
  async sendDatabaseCredentials(
    to: string,
    companyName: string,
    credentials: {
      dbName: string;
      dbUser: string;
      dbPassword: string;
      host: string;
      connectionString: string;
    }
  ): Promise<void> {
    const { data, error } = await this.resend.emails.send({
      from: config.RESEND_FROM_EMAIL,
      to: [to],
      subject: `✅ Your CostPlusDB Database is Ready!`,
      html: this.getCredentialsTemplate(companyName, credentials),
    });

    if (error) {
      logger.error('Failed to send credentials', { error, to });
      throw error;
    }

    logger.info('Credentials email sent', { emailId: data?.id, to });
  }

  /**
   * Send internal admin notification
   */
  async sendAdminNotification(subject: string, message: string): Promise<void> {
    await this.resend.emails.send({
      from: config.RESEND_FROM_EMAIL,
      to: [config.RESEND_ADMIN_EMAIL],
      subject: `[CostPlusDB Admin] ${subject}`,
      html: `<p>${message}</p>`,
    });
  }

  // Email templates
  private getIntakeConfirmationTemplate(name: string): string {
    return `
      <h2>Thanks for reaching out, ${name}!</h2>
      <p>We received your inquiry and will respond within 4 business hours.</p>
      <p>In the meantime, feel free to:</p>
      <ul>
        <li><a href="https://costplusdb.dev/calculator.html">Browse our pricing</a></li>
        <li><a href="https://costplusdb.dev/transparency/">Read our transparency docs</a></li>
        <li><a href="https://costplusdb.dev/security.html">Review our security practices</a></li>
      </ul>
      <p>We're excited to potentially work with you!</p>
      <p>Best,<br>Jeremy Longshore<br>Founder, CostPlusDB</p>
    `;
  }

  private getCredentialsTemplate(
    company: string,
    creds: any
  ): string {
    return `
      <h2>Great news, ${company}!</h2>
      <p>Your PostgreSQL database has been provisioned and is ready to use.</p>

      <h3>Database Credentials</h3>
      <pre>
Database: ${creds.dbName}
User: ${creds.dbUser}
Password: ${creds.dbPassword}
Host: ${creds.host}
Port: 5432
SSL: Required
      </pre>

      <h3>Connection String</h3>
      <pre>${creds.connectionString}</pre>

      <h3>Test Your Connection</h3>
      <pre>psql "${creds.connectionString}"</pre>

      <p>Questions? Just reply to this email.</p>
      <p>Best,<br>Jeremy</p>
    `;
  }
}
```

### Step 3: Update Customer Service

Update `src/services/customer.service.ts`:

```typescript
import { EmailService } from './email.service.js';

export class CustomerService {
  constructor(
    private customersRepo: CustomersRepository,
    private emailService: EmailService // Add email service
  ) {}

  async processIntakeForm(formData: IntakeFormData): Promise<CustomerOnboarding> {
    // Create customer record
    const customer = await this.customersRepo.create({...});

    // Send confirmation email
    await this.emailService.sendIntakeConfirmation(
      customer.email,
      customer.contact_name || customer.company_name
    );

    // Send admin notification
    await this.emailService.sendAdminNotification(
      'New Customer Intake',
      `New customer: ${customer.company_name} (${customer.email})`
    );

    return {...};
  }
}
```

---

## Part 4: Email Templates

### Template Structure

Store templates in `src/templates/emails/`:

```
backend/src/templates/emails/
├── intake-confirmation.html
├── credentials-delivery.html
├── invoice.html
├── support-ticket.html
└── alert.html
```

### Example: Intake Confirmation Template

Create `src/templates/emails/intake-confirmation.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to CostPlusDB</title>
</head>
<body style="font-family: monospace; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="border-bottom: 2px solid #000;">CostPlusDB</h1>

  <h2>Hi {{NAME}},</h2>

  <p>Thanks for reaching out! We received your inquiry and will respond within 4 business hours.</p>

  <h3>What happens next?</h3>
  <ol>
    <li>We'll review your requirements</li>
    <li>Schedule a brief consultation (15 min)</li>
    <li>Provision your database within 24 hours</li>
  </ol>

  <h3>In the meantime:</h3>
  <ul>
    <li><a href="https://costplusdb.dev/calculator.html">Browse our pricing</a></li>
    <li><a href="https://costplusdb.dev/transparency/">Read our transparency docs</a></li>
  </ul>

  <hr style="margin: 30px 0; border: 1px solid #ddd;">

  <p>
    <strong>Jeremy Longshore</strong><br>
    Founder, CostPlusDB<br>
    <a href="mailto:jeremy@intentsolutions.io">jeremy@intentsolutions.io</a>
  </p>
</body>
</html>
```

### Load Templates Dynamically

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

function loadTemplate(name: string, variables: Record<string, string>): string {
  const templatePath = join(__dirname, '../templates/emails', `${name}.html`);
  let template = readFileSync(templatePath, 'utf-8');

  // Replace variables
  for (const [key, value] of Object.entries(variables)) {
    template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  return template;
}
```

---

## Part 5: Testing Emails

### Test Locally

```bash
# Start development server
npm run dev

# Test intake confirmation
curl -X POST http://localhost:3000/api/intake \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Company",
    "email": "test@example.com",
    "tier": "shared"
  }'

# Check logs for email sending confirmation
```

### Test with Resend CLI

```bash
# Install Resend CLI
npm install -g resend-cli

# Send test email
resend emails send \
  --from "costplusdb@intentsolutions.io" \
  --to "your-email@example.com" \
  --subject "Test Email" \
  --html "<p>This is a test</p>"
```

---

## Part 6: Monitoring and Troubleshooting

### View Email Logs

1. Go to https://resend.com/emails
2. View sent emails
3. Check delivery status
4. View bounce/complaint reports

### Common Issues

**Issue: Emails not sending**

```typescript
// Check API key is set
console.log('Resend API key:', config.RESEND_API_KEY.substring(0, 10) + '...');

// Check feature flag
console.log('Email notifications enabled:', config.ENABLE_EMAIL_NOTIFICATIONS);
```

**Issue: Emails going to spam**

- Verify domain (SPF, DKIM, DMARC)
- Warm up sending reputation gradually
- Avoid spam trigger words
- Include unsubscribe link

**Issue: Rate limit exceeded**

Free tier: 100 emails/day

```typescript
// Add retry logic
async sendWithRetry(emailFn: () => Promise<void>, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await emailFn();
      return;
    } catch (error) {
      if (error.message.includes('rate limit') && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      } else {
        throw error;
      }
    }
  }
}
```

---

## Part 7: Production Best Practices

### 1. Environment-Specific From Addresses

```bash
# Development
RESEND_FROM_EMAIL="dev@costplusdb.dev"

# Production
RESEND_FROM_EMAIL="costplusdb@intentsolutions.io"
```

### 2. Email Queue (for high volume)

```typescript
// Use background job queue
import { Queue } from 'bullmq';

const emailQueue = new Queue('emails');

await emailQueue.add('send-credentials', {
  to: customer.email,
  template: 'credentials',
  data: {...}
});
```

### 3. Track Email Events

```typescript
// Enable webhooks in Resend dashboard
// POST /api/webhooks/resend
app.post('/api/webhooks/resend', async (c) => {
  const event = await c.req.json();

  switch (event.type) {
    case 'email.delivered':
      // Update database
      break;
    case 'email.bounced':
      // Handle bounce
      break;
  }

  return c.text('OK');
});
```

---

## Cost Optimization

### Free Tier (3,000 emails/month)

Good for:
- Early stage (< 100 customers)
- Low email volume
- Testing

### Paid Plan ($20/month for 50,000 emails)

Upgrade when:
- Approaching free tier limit
- Need higher sending reputation
- Require email support

---

## Related Documentation

- **043-DR-GUID-local-development-setup.md** - Local setup
- **044-DR-GUID-production-deployment.md** - Production deployment
- **backend/docs/API.md** - API reference
- **024-DR-GUID-resend-custom-domain.md** - Custom domain setup

---

**Document Owner:** Jeremy Longshore (jeremy@intentsolutions.io)
**Last Updated:** 2025-10-20
**Review Frequency:** Quarterly
