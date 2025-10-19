# CostPlusDB Automation Stack Implementation Guide
## Professional Customer Operations Without Breaking the Bank

**Version:** 1.0
**Last Updated:** October 19, 2025
**Owner:** Jeremy Longshore (jeremy@intentsolutions.io)
**Status:** Implementation Ready

---

## Table of Contents

1. [Executive Overview](#executive-overview)
2. [Architecture Decision: Why This Stack?](#architecture-decision)
3. [Component 1: PDF Report Generator](#pdf-generator)
4. [Component 2: Resend Email Service](#resend-email)
5. [Component 3: Dual Notification System](#notification-system)
6. [Component 4: Vercel Cron Jobs](#vercel-cron)
7. [Complete Integration Example](#integration-example)
8. [Environment Variables Checklist](#environment-variables)
9. [Cost Analysis](#cost-analysis)
10. [Security Considerations](#security)
11. [Testing & Deployment](#testing)
12. [Maintenance & Monitoring](#maintenance)

---

## Executive Overview

### The Problem

CostPlusDB needs professional automation for:
- Monthly invoices with cost breakdowns
- Customer onboarding with database credentials
- Security alerts and incident notifications
- Backup verification reports
- Form submission handling from Netlify

### The Solution Stack

```
┌──────────────────────────────────────────────────────────────┐
│                    COSTPLUSDB AUTOMATION                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Vercel    │  │   Resend    │  │    Slack    │         │
│  │  Serverless │  │    Email    │  │   Webhooks  │         │
│  │  Functions  │  │     API     │  │             │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                  │
│         └────────────────┴────────────────┘                  │
│                          │                                    │
│         ┌────────────────┴────────────────┐                 │
│         │                                  │                 │
│  ┌──────▼──────┐              ┌───────────▼─────────┐      │
│  │  @react-pdf │              │   Claude API        │      │
│  │  /renderer  │              │   (AI Enhancement)  │      │
│  │  PDF Gen    │              │                     │      │
│  └─────────────┘              └─────────────────────┘      │
│                                                              │
│  Data Sources:                                              │
│  ├─ PostgreSQL on Contabo VPS                              │
│  ├─ Stripe Payment Data                                    │
│  └─ Netlify Forms                                          │
└──────────────────────────────────────────────────────────────┘
```

### Why This Stack?

| Component | Why This Choice | Cost |
|-----------|----------------|------|
| @react-pdf/renderer | Lightweight, React-based, no browser overhead | Free |
| Resend | Modern API, great DX, generous free tier | $0-20/mo |
| Slack Webhooks | Free, real-time awareness | Free |
| Vercel Cron | Native integration, reliable, serverless | Free (Hobby) |
| Claude API | AI-enhanced emails, personalization | ~$5-15/mo |

**Total Monthly Cost: $5-35** (well within bootstrap budget)

---

<a name="architecture-decision"></a>

## Architecture Decision: Why This Stack?

### PDF Generation: @react-pdf/renderer (Winner)

After evaluating Puppeteer, PDFKit, and @react-pdf/renderer:

#### Why @react-pdf/renderer Won

**Pros:**
- No browser overhead (unlike Puppeteer)
- React component syntax (easy to maintain)
- Lightweight and fast
- Perfect for structured documents (invoices, reports)
- Built on PDFKit under the hood
- Works seamlessly in Vercel serverless

**Cons:**
- React-only (not a problem for us)
- Limited CSS support vs full browser

#### Why NOT Puppeteer?

```
Puppeteer Problems:
├─ Requires headless Chrome binary (~170MB)
├─ Cold start latency (3-5 seconds)
├─ Memory intensive (300-500MB per instance)
├─ Overkill for invoices
└─ Expensive in serverless environments
```

**Verdict:** Puppeteer is excellent for complex HTML/CSS/JS rendering (dashboards, dynamic content), but for invoices and reports, @react-pdf/renderer is 10x more efficient.

#### Why NOT Plain PDFKit?

PDFKit is great but requires low-level canvas-style API calls. @react-pdf/renderer gives us PDFKit's performance with React's developer experience.

**Decision:** Use @react-pdf/renderer for all PDF generation.

---

<a name="pdf-generator"></a>

## Component 1: PDF Report Generator

### Installation

```bash
npm install @react-pdf/renderer
```

### Monthly Invoice Template (Production-Ready)

```typescript
// backend/src/pdf/InvoiceTemplate.tsx
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer';

// Register fonts for professional look
Font.register({
  family: 'Inter',
  fonts: [
    { src: '/fonts/Inter-Regular.ttf' },
    { src: '/fonts/Inter-Bold.ttf', fontWeight: 'bold' },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 10,
    padding: 40,
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  section: {
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  boldText: {
    fontWeight: 'bold',
  },
  costBreakdown: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    marginVertical: 10,
    borderRadius: 4,
  },
  totalRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#1a1a1a',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#666666',
  },
});

interface InvoiceLineItem {
  description: string;
  ourCost?: number;
  yourPrice: number;
  showCostBreakdown?: boolean;
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  customer: {
    name: string;
    email: string;
    company?: string;
  };
  lineItems: InvoiceLineItem[];
  comparisonProvider?: string;
  comparisonPrice?: number;
}

export const InvoiceTemplate: React.FC<{ data: InvoiceData }> = ({ data }) => {
  const subtotal = data.lineItems.reduce((sum, item) => sum + item.yourPrice, 0);
  const totalCost = data.lineItems.reduce(
    (sum, item) => sum + (item.ourCost || 0),
    0
  );
  const savingsVsComparison = data.comparisonPrice
    ? data.comparisonPrice - subtotal
    : 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>CostPlusDB</Text>
            <Text>Transparent PostgreSQL Hosting</Text>
            <Text>jeremy@intentsolutions.io</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text>#{data.invoiceNumber}</Text>
            <Text>Date: {data.invoiceDate}</Text>
            <Text>Due: {data.dueDate}</Text>
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.section}>
          <Text style={styles.boldText}>BILL TO:</Text>
          <Text>{data.customer.name}</Text>
          {data.customer.company && <Text>{data.customer.company}</Text>}
          <Text>{data.customer.email}</Text>
        </View>

        {/* Base Plan */}
        <View style={styles.section}>
          <Text style={[styles.boldText, { marginBottom: 10 }]}>
            BASE PLAN
          </Text>
          {data.lineItems
            .filter((item) => !item.showCostBreakdown)
            .map((item, index) => (
              <View key={index} style={styles.row}>
                <Text style={{ flex: 1 }}>{item.description}</Text>
                <Text>${item.yourPrice.toFixed(2)}</Text>
              </View>
            ))}
        </View>

        {/* Cost + 25% Items */}
        {data.lineItems.filter((item) => item.showCostBreakdown).length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.boldText, { marginBottom: 10 }]}>
              ADD-ONS (Cost + 25%)
            </Text>
            {data.lineItems
              .filter((item) => item.showCostBreakdown)
              .map((item, index) => (
                <View key={index} style={styles.costBreakdown}>
                  <Text style={styles.boldText}>{item.description}</Text>
                  <View style={[styles.row, { borderBottomWidth: 0 }]}>
                    <Text>Our cost:</Text>
                    <Text>${item.ourCost?.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.row, { borderBottomWidth: 0 }]}>
                    <Text>Your price (cost × 1.25):</Text>
                    <Text style={styles.boldText}>
                      ${item.yourPrice.toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        )}

        {/* Totals */}
        <View style={styles.totalRow}>
          <View style={styles.row}>
            <Text style={styles.boldText}>TOTAL THIS MONTH:</Text>
            <Text style={styles.boldText}>${subtotal.toFixed(2)}</Text>
          </View>

          {data.comparisonProvider && data.comparisonPrice && (
            <>
              <View style={styles.row}>
                <Text>Compare to {data.comparisonProvider}:</Text>
                <Text>${data.comparisonPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.boldText, { color: '#16a34a' }]}>
                  Your Monthly Savings:
                </Text>
                <Text style={[styles.boldText, { color: '#16a34a' }]}>
                  ${savingsVsComparison.toFixed(2)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Transparency Note */}
        <View style={[styles.section, { marginTop: 20 }]}>
          <Text style={{ fontSize: 9, color: '#666666' }}>
            Questions about our pricing? We're happy to explain any costs.
            {'\n'}support@intentsolutions.io
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            CostPlusDB - Transparent Database Hosting at Cost + 25%
          </Text>
          <Text>https://costplusdb.dev</Text>
        </View>
      </Page>
    </Document>
  );
};
```

### Vercel API Route for PDF Generation

```typescript
// pages/api/generate-invoice.ts
import { renderToStream } from '@react-pdf/renderer';
import { InvoiceTemplate } from '@/backend/src/pdf/InvoiceTemplate';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const invoiceData = req.body;

    // Validate required fields
    if (!invoiceData.customer || !invoiceData.lineItems) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate PDF stream
    const pdfStream = await renderToStream(
      <InvoiceTemplate data={invoiceData} />
    );

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${invoiceData.invoiceNumber}.pdf"`
    );

    // Pipe stream to response
    pdfStream.pipe(res);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
}
```

### Usage Example

```typescript
// backend/src/services/invoiceService.ts
import { InvoiceData } from '@/backend/src/pdf/InvoiceTemplate';

export async function generateMonthlyInvoice(
  customerId: string,
  month: string
): Promise<Buffer> {
  // Fetch customer data from PostgreSQL
  const customer = await db.query(
    'SELECT * FROM customers WHERE id = $1',
    [customerId]
  );

  // Fetch usage/charges for the month
  const charges = await db.query(
    'SELECT * FROM monthly_charges WHERE customer_id = $1 AND month = $2',
    [customerId, month]
  );

  const invoiceData: InvoiceData = {
    invoiceNumber: `INV-${Date.now()}`,
    invoiceDate: new Date().toLocaleDateString(),
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    customer: {
      name: customer.name,
      email: customer.email,
      company: customer.company,
    },
    lineItems: [
      {
        description: `${customer.tier} Tier`,
        yourPrice: customer.baseCost,
        showCostBreakdown: false,
      },
      // Add infrastructure upgrades
      ...(customer.infrastructureProvider !== 'contabo'
        ? [
            {
              description: `Infrastructure: ${customer.infrastructureProvider}`,
              ourCost: charges.infrastructureCost,
              yourPrice: charges.infrastructureCost * 1.25,
              showCostBreakdown: true,
            },
          ]
        : []),
      // Add storage overages
      ...(charges.extraStorage > 0
        ? [
            {
              description: `Extra Storage (+${charges.extraStorage}GB)`,
              ourCost: charges.storageCost,
              yourPrice: charges.storageCost * 1.25,
              showCostBreakdown: true,
            },
          ]
        : []),
    ],
    comparisonProvider: 'AWS RDS',
    comparisonPrice: calculateAWSEquivalent(customer),
  };

  // Generate PDF and return as Buffer
  const response = await fetch('/api/generate-invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoiceData),
  });

  return Buffer.from(await response.arrayBuffer());
}
```

### Other Report Templates

```typescript
// backend/src/pdf/SecurityAuditReport.tsx
// Similar structure for security audit reports
export const SecurityAuditReport: React.FC<{ data: AuditData }> = ({
  data,
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Security Audit Report</Text>
        <Text>Customer: {data.customerName}</Text>
        <Text>Date: {data.auditDate}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backup Verification</Text>
          <Text>Last Backup: {data.lastBackup}</Text>
          <Text>Status: {data.backupStatus}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Checks</Text>
          {data.securityChecks.map((check, i) => (
            <View key={i} style={styles.row}>
              <Text>{check.name}</Text>
              <Text>{check.status}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};
```

---

<a name="resend-email"></a>

## Component 2: Resend Email Service

### Why Resend?

- Modern API (better than SendGrid/Mailgun)
- Generous free tier (100 emails/day = 3,000/month)
- Excellent TypeScript SDK
- Built-in template support
- Email tracking (opens, clicks)
- Native Vercel integration

### Setup Guide

#### Step 1: Create Resend Account

1. Go to https://resend.com
2. Sign up with GitHub
3. Verify domain (costplusdb.dev)
4. Create API key

#### Step 2: Domain Verification

```bash
# Add these DNS records to your domain registrar:

# SPF Record
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all

# DKIM Record
Type: TXT
Name: resend._domainkey
Value: [provided by Resend dashboard]

# Return-Path
Type: CNAME
Name: resend
Value: feedback.resend.com
```

#### Step 3: Install Resend SDK

```bash
npm install resend
```

#### Step 4: Vercel Integration

```bash
# Install Resend integration from Vercel marketplace
# This automatically adds RESEND_API_KEY to environment variables
```

### Email Templates with AI Enhancement

```typescript
// backend/src/services/emailService.ts
import { Resend } from 'resend';
import Anthropic from '@anthropic-ai/sdk';

const resend = new Resend(process.env.RESEND_API_KEY);
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface EmailOptions {
  to: string;
  subject: string;
  templateType: 'welcome' | 'invoice' | 'alert' | 'maintenance';
  data: any;
  aiEnhance?: boolean;
}

export async function sendEmail(options: EmailOptions) {
  // Generate base email content
  const baseContent = generateEmailContent(options.templateType, options.data);

  // Optionally enhance with Claude AI
  let finalContent = baseContent;
  if (options.aiEnhance && !options.data.customerOptedOutAI) {
    finalContent = await enhanceEmailWithAI(baseContent, options);
  }

  // Send via Resend
  const result = await resend.emails.send({
    from: 'CostPlusDB <noreply@costplusdb.dev>',
    to: options.to,
    subject: options.subject,
    html: finalContent,
    attachments: options.data.attachments || [],
  });

  // Log for audit trail
  await logEmail({
    emailId: result.id,
    to: options.to,
    subject: options.subject,
    sentAt: new Date(),
    aiEnhanced: options.aiEnhance,
  });

  return result;
}

async function enhanceEmailWithAI(
  baseContent: string,
  options: EmailOptions
): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a helpful email assistant for CostPlusDB, a transparent PostgreSQL hosting service.

Improve this email to be more professional, friendly, and clear. Keep the same information but improve the tone and structure.

Customer context:
- Name: ${options.data.customerName}
- Tier: ${options.data.customerTier || 'Unknown'}
- With us since: ${options.data.customerSince || 'Recently'}

Original email:
${baseContent}

Return ONLY the improved HTML email content. Do not add explanations.`,
      },
    ],
  });

  return message.content[0].type === 'text' ? message.content[0].text : baseContent;
}

function generateEmailContent(
  templateType: string,
  data: any
): string {
  switch (templateType) {
    case 'welcome':
      return getWelcomeEmailTemplate(data);
    case 'invoice':
      return getInvoiceEmailTemplate(data);
    case 'alert':
      return getAlertEmailTemplate(data);
    case 'maintenance':
      return getMaintenanceEmailTemplate(data);
    default:
      return '';
  }
}
```

### Welcome Email Template (Customer Onboarding)

```typescript
// backend/src/templates/welcomeEmail.ts
export function getWelcomeEmailTemplate(data: {
  customerName: string;
  databaseName: string;
  hostname: string;
  port: number;
  username: string;
  password: string;
  sslRequired: boolean;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: #f8f8f8;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .credentials {
      background: #fff3cd;
      border: 2px solid #ffeb3b;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .code {
      background: #f4f4f4;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
      overflow-x: auto;
    }
    .warning {
      background: #ffebee;
      border-left: 4px solid #f44336;
      padding: 15px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Welcome to CostPlusDB!</h1>
    <p>Hi ${data.customerName},</p>
    <p>Your PostgreSQL database is ready. Below are your connection details.</p>
  </div>

  <div class="credentials">
    <h2>Database Connection Details</h2>
    <table style="width: 100%;">
      <tr><td><strong>Hostname:</strong></td><td>${data.hostname}</td></tr>
      <tr><td><strong>Port:</strong></td><td>${data.port}</td></tr>
      <tr><td><strong>Database:</strong></td><td>${data.databaseName}</td></tr>
      <tr><td><strong>Username:</strong></td><td>${data.username}</td></tr>
      <tr><td><strong>Password:</strong></td><td>${data.password}</td></tr>
      <tr><td><strong>SSL:</strong></td><td>${data.sslRequired ? 'Required' : 'Optional'}</td></tr>
    </table>
  </div>

  <h3>Connection String</h3>
  <div class="code">
postgresql://${data.username}:${data.password}@${data.hostname}:${data.port}/${data.databaseName}?sslmode=require
  </div>

  <h3>Quick Test (psql)</h3>
  <div class="code">
psql -h ${data.hostname} -p ${data.port} -U ${data.username} -d ${data.databaseName}
  </div>

  <div class="warning">
    <strong>Security Note:</strong>
    <ul>
      <li>Save these credentials in your password manager</li>
      <li>Do not commit credentials to git</li>
      <li>Use environment variables in your application</li>
      <li>You can rotate your password anytime via the dashboard</li>
    </ul>
  </div>

  <h3>What's Next?</h3>
  <ul>
    <li><strong>Test connection</strong> - Use the psql command above</li>
    <li><strong>Set up backups</strong> - Already done! We backup daily with 30-day retention</li>
    <li><strong>Monitor performance</strong> - Dashboard coming soon</li>
    <li><strong>Get support</strong> - Email jeremy@intentsolutions.io (4-hour response SLA)</li>
  </ul>

  <h3>Our Transparency Promise</h3>
  <p>Your monthly invoice will show exactly what we pay for infrastructure. No hidden fees, no surprises. Just cost + 25%.</p>

  <p>Questions? Reply to this email or reach out at <a href="mailto:support@intentsolutions.io">support@intentsolutions.io</a></p>

  <p>
    <strong>Jeremy Longshore</strong><br>
    Founder, CostPlusDB<br>
    jeremy@intentsolutions.io
  </p>

  <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e5e5;">
  <p style="font-size: 12px; color: #666;">
    CostPlusDB - Transparent PostgreSQL Hosting<br>
    <a href="https://costplusdb.dev">costplusdb.dev</a>
  </p>
</body>
</html>
  `;
}
```

### Invoice Email Template

```typescript
// backend/src/templates/invoiceEmail.ts
export function getInvoiceEmailTemplate(data: {
  customerName: string;
  invoiceNumber: string;
  totalAmount: number;
  dueDate: string;
  pdfAttached: boolean;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: #f8f8f8;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .invoice-summary {
      background: #e8f5e9;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      background: #1a1a1a;
      color: #ffffff;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 4px;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Your CostPlusDB Invoice</h1>
    <p>Hi ${data.customerName},</p>
    <p>Your monthly invoice is ready.</p>
  </div>

  <div class="invoice-summary">
    <table style="width: 100%;">
      <tr><td><strong>Invoice Number:</strong></td><td>${data.invoiceNumber}</td></tr>
      <tr><td><strong>Amount Due:</strong></td><td style="font-size: 24px;"><strong>$${data.totalAmount.toFixed(2)}</strong></td></tr>
      <tr><td><strong>Due Date:</strong></td><td>${data.dueDate}</td></tr>
    </table>
  </div>

  <p><strong>Your invoice is attached as a PDF.</strong></p>

  <p>As always, your invoice shows our exact infrastructure costs and our 25% markup. No hidden fees, no surprises.</p>

  <a href="https://billing.stripe.com/p/login/..." class="button">Pay Invoice</a>

  <h3>Questions About Your Bill?</h3>
  <p>We're happy to explain any line item. Just reply to this email.</p>

  <p>
    <strong>Jeremy Longshore</strong><br>
    Founder, CostPlusDB<br>
    jeremy@intentsolutions.io
  </p>
</body>
</html>
  `;
}
```

### Security Alert Email Template

```typescript
// backend/src/templates/alertEmail.ts
export function getAlertEmailTemplate(data: {
  customerName: string;
  alertType: 'security' | 'performance' | 'backup';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  actionRequired?: string;
}): string {
  const severityColors = {
    low: '#2196f3',
    medium: '#ff9800',
    high: '#f44336',
    critical: '#b71c1c',
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .alert {
      border-left: 4px solid ${severityColors[data.severity]};
      background: #f8f8f8;
      padding: 20px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>Database Alert: ${data.alertType.toUpperCase()}</h1>
  <p>Hi ${data.customerName},</p>

  <div class="alert">
    <h2 style="color: ${severityColors[data.severity]}; margin-top: 0;">
      ${data.severity.toUpperCase()} Severity
    </h2>
    <p>${data.message}</p>
    ${data.actionRequired ? `<p><strong>Action Required:</strong> ${data.actionRequired}</p>` : ''}
  </div>

  <p>We're monitoring the situation. You'll receive updates via email and Slack.</p>

  <p>Need immediate assistance? Email jeremy@intentsolutions.io</p>
</body>
</html>
  `;
}
```

---

<a name="notification-system"></a>

## Component 3: Dual Notification System

### Philosophy: Email for Documentation, Slack for Awareness

```
┌──────────────────────────────────────────────────────────────┐
│                   NOTIFICATION ROUTING LOGIC                  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  EMAIL (Resend) - For Documentation & Records                │
│  ├─ Customer database provisioned → Welcome email            │
│  ├─ Monthly invoice → Email with PDF attachment              │
│  ├─ Security incident → Detailed report                      │
│  └─ Backup failure → Technical details                       │
│                                                               │
│  SLACK (Webhook) - For Real-Time Awareness                   │
│  ├─ Netlify form submission → "New contact form"             │
│  ├─ Customer database provisioned → "New customer onboarded" │
│  ├─ Security alert → "Urgent: Security incident"             │
│  └─ Backup failure → "Action needed: Backup failed"          │
│                                                               │
│  BOTH (Email + Slack) - For Critical Items                   │
│  ├─ P0 incidents (database down)                             │
│  ├─ Security breaches                                        │
│  └─ Payment failures                                         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Slack Setup Guide

#### Step 1: Create Incoming Webhook

1. Go to https://api.slack.com/apps
2. Create New App → "From scratch"
3. Name: "CostPlusDB Notifications"
4. Choose your workspace
5. Navigate to "Incoming Webhooks"
6. Activate Incoming Webhooks
7. Click "Add New Webhook to Workspace"
8. Choose channel (e.g., #costplusdb-alerts)
9. Copy webhook URL

#### Step 2: Add to Vercel Environment Variables

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

### Slack Notification Service

```typescript
// backend/src/services/slackService.ts
interface SlackMessage {
  text: string; // Fallback text
  blocks?: any[]; // Rich formatting
}

export async function sendSlackNotification(
  type: 'info' | 'success' | 'warning' | 'error',
  title: string,
  message: string,
  fields?: { title: string; value: string; short?: boolean }[],
  actions?: { text: string; url: string }[]
) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not configured');
    return;
  }

  const emojiMap = {
    info: ':information_source:',
    success: ':white_check_mark:',
    warning: ':warning:',
    error: ':rotating_light:',
  };

  const colorMap = {
    info: '#2196f3',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
  };

  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emojiMap[type]} ${title}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: message,
      },
    },
  ];

  // Add fields if provided
  if (fields && fields.length > 0) {
    blocks.push({
      type: 'section',
      fields: fields.map((field) => ({
        type: 'mrkdwn',
        text: `*${field.title}*\n${field.value}`,
      })),
    });
  }

  // Add action buttons if provided
  if (actions && actions.length > 0) {
    blocks.push({
      type: 'actions',
      elements: actions.map((action) => ({
        type: 'button',
        text: {
          type: 'plain_text',
          text: action.text,
        },
        url: action.url,
      })),
    });
  }

  // Add timestamp
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `<!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|${new Date().toISOString()}>`,
      },
    ],
  });

  const payload: SlackMessage = {
    text: `${title}: ${message}`, // Fallback
    blocks,
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Slack notification failed:', response.statusText);
    }
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}
```

### Notification Routing Logic

```typescript
// backend/src/services/notificationService.ts
import { sendEmail } from './emailService';
import { sendSlackNotification } from './slackService';

interface NotificationOptions {
  event: NotificationEvent;
  data: any;
}

type NotificationEvent =
  | 'customer.provisioned'
  | 'invoice.generated'
  | 'form.submitted'
  | 'alert.security'
  | 'alert.backup'
  | 'alert.performance'
  | 'incident.critical';

export async function sendNotification(options: NotificationOptions) {
  const { event, data } = options;

  switch (event) {
    case 'customer.provisioned':
      // Email: Credentials to customer
      await sendEmail({
        to: data.customerEmail,
        subject: 'Welcome to CostPlusDB - Your Database is Ready',
        templateType: 'welcome',
        data: data,
        aiEnhance: true,
      });

      // Slack: Internal notification
      await sendSlackNotification(
        'success',
        'New Customer Onboarded',
        `Database provisioned for ${data.customerName}`,
        [
          { title: 'Customer', value: data.customerName },
          { title: 'Tier', value: data.tier },
          { title: 'Database', value: data.databaseName },
        ]
      );
      break;

    case 'invoice.generated':
      // Email: Invoice PDF to customer
      await sendEmail({
        to: data.customerEmail,
        subject: `Invoice ${data.invoiceNumber} - CostPlusDB`,
        templateType: 'invoice',
        data: data,
        aiEnhance: false, // Don't modify invoices
      });

      // Slack: Just a summary (not full details)
      await sendSlackNotification(
        'info',
        'Invoice Generated',
        `Monthly invoice sent to ${data.customerName}`,
        [
          { title: 'Amount', value: `$${data.totalAmount.toFixed(2)}` },
          { title: 'Due Date', value: data.dueDate },
        ]
      );
      break;

    case 'form.submitted':
      // Slack: Immediate notification (no email)
      await sendSlackNotification(
        'info',
        'New Contact Form Submission',
        `Form submitted by ${data.name}`,
        [
          { title: 'Name', value: data.name },
          { title: 'Email', value: data.email },
          { title: 'Message', value: data.message.substring(0, 100) + '...' },
        ],
        [
          {
            text: 'Reply via Email',
            url: `mailto:${data.email}?subject=Re: CostPlusDB Inquiry`,
          },
        ]
      );
      break;

    case 'alert.security':
      // Both: Email for records, Slack for immediate action
      await sendEmail({
        to: data.customerEmail,
        subject: `Security Alert - ${data.alertTitle}`,
        templateType: 'alert',
        data: data,
      });

      await sendSlackNotification(
        'error',
        'Security Alert',
        data.message,
        [
          { title: 'Customer', value: data.customerName },
          { title: 'Severity', value: data.severity },
          { title: 'Action Required', value: data.actionRequired || 'None' },
        ]
      );
      break;

    case 'alert.backup':
      // Email: Detailed report
      await sendEmail({
        to: 'jeremy@intentsolutions.io',
        subject: `Backup Alert - ${data.customerName}`,
        templateType: 'alert',
        data: data,
      });

      // Slack: Urgent notification
      await sendSlackNotification(
        'error',
        'Backup Failed',
        `Backup failed for ${data.customerName}`,
        [
          { title: 'Customer', value: data.customerName },
          { title: 'Last Successful Backup', value: data.lastSuccessfulBackup },
          { title: 'Error', value: data.errorMessage },
        ]
      );
      break;

    case 'incident.critical':
      // Both: Email AND Slack with highest priority
      await sendEmail({
        to: 'jeremy@intentsolutions.io',
        subject: `CRITICAL: ${data.incidentTitle}`,
        templateType: 'alert',
        data: { ...data, severity: 'critical' },
      });

      await sendSlackNotification(
        'error',
        'CRITICAL INCIDENT',
        `@channel ${data.message}`,
        [
          { title: 'Incident', value: data.incidentTitle },
          { title: 'Affected Customers', value: data.affectedCustomers },
          { title: 'Status', value: data.status },
        ]
      );
      break;
  }
}
```

### Netlify Form Webhook Integration

```typescript
// pages/api/netlify-form-handler.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendNotification } from '@/backend/src/services/notificationService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Netlify sends form submissions as POST with form data
    const { name, email, message, form_name } = req.body;

    // Send notification
    await sendNotification({
      event: 'form.submitted',
      data: {
        name,
        email,
        message,
        formName: form_name,
        submittedAt: new Date().toISOString(),
      },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Form handler error:', error);
    res.status(500).json({ error: 'Failed to process form' });
  }
}
```

---

<a name="vercel-cron"></a>

## Component 4: Vercel Cron Jobs

### Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/generate-monthly-invoices",
      "schedule": "0 0 1 * *"
    },
    {
      "path": "/api/cron/backup-verification",
      "schedule": "0 8 * * 1"
    },
    {
      "path": "/api/cron/security-log-summary",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/usage-reports",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

### Cron Schedule Syntax

```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of week (0-6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *

Examples:
- "0 0 1 * *"    → 1st of month at midnight (monthly invoices)
- "0 8 * * 1"    → Every Monday at 8am (weekly backup check)
- "0 9 * * *"    → Every day at 9am (daily summary)
- "*/15 * * * *" → Every 15 minutes (monitoring)
```

### Monthly Invoice Generation Cron

```typescript
// pages/api/cron/generate-monthly-invoices.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { generateMonthlyInvoice } from '@/backend/src/services/invoiceService';
import { sendNotification } from '@/backend/src/services/notificationService';
import { query } from '@/backend/src/db/postgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify this is actually a cron request from Vercel
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get all active customers
    const customers = await query(
      'SELECT id, name, email, tier, status FROM customers WHERE status = $1',
      ['active']
    );

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const results = {
      success: [] as string[],
      failed: [] as { customer: string; error: string }[],
    };

    // Generate invoice for each customer
    for (const customer of customers.rows) {
      try {
        // Generate PDF
        const invoicePdf = await generateMonthlyInvoice(
          customer.id,
          currentMonth
        );

        // Send email with PDF attachment
        await sendNotification({
          event: 'invoice.generated',
          data: {
            customerEmail: customer.email,
            customerName: customer.name,
            invoiceNumber: `${customer.id}-${currentMonth}`,
            totalAmount: await calculateTotalAmount(customer.id, currentMonth),
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            pdfBuffer: invoicePdf,
          },
        });

        results.success.push(customer.name);
      } catch (error) {
        console.error(`Failed to generate invoice for ${customer.name}:`, error);
        results.failed.push({
          customer: customer.name,
          error: error.message,
        });
      }
    }

    // Send summary to Slack
    await sendSlackNotification(
      results.failed.length === 0 ? 'success' : 'warning',
      'Monthly Invoices Generated',
      `Generated ${results.success.length} invoices`,
      [
        { title: 'Success', value: results.success.length.toString() },
        { title: 'Failed', value: results.failed.length.toString() },
      ]
    );

    res.status(200).json(results);
  } catch (error) {
    console.error('Invoice generation cron failed:', error);
    res.status(500).json({ error: error.message });
  }
}

async function calculateTotalAmount(
  customerId: string,
  month: string
): Promise<number> {
  const result = await query(
    'SELECT SUM(amount) as total FROM charges WHERE customer_id = $1 AND month = $2',
    [customerId, month]
  );
  return parseFloat(result.rows[0]?.total || '0');
}
```

### Weekly Backup Verification Cron

```typescript
// pages/api/cron/backup-verification.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendSlackNotification } from '@/backend/src/services/slackService';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify cron auth
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Query each VPS for backup status
    const vpsServers = process.env.VPS_SERVERS?.split(',') || [];
    const results = [];

    for (const vpsHost of vpsServers) {
      try {
        // SSH to VPS and check pgBackRest status
        const { stdout } = await execAsync(
          `ssh -i ~/.ssh/costplusdb_rsa root@${vpsHost} "pgbackrest info --stanza=main --output=json"`
        );

        const backupInfo = JSON.parse(stdout);
        const lastBackup = backupInfo[0]?.backup[0];

        if (!lastBackup) {
          throw new Error('No backups found');
        }

        const lastBackupTime = new Date(lastBackup.timestamp.stop * 1000);
        const hoursSinceBackup =
          (Date.now() - lastBackupTime.getTime()) / (1000 * 60 * 60);

        results.push({
          vps: vpsHost,
          status: hoursSinceBackup < 26 ? 'ok' : 'warning',
          lastBackup: lastBackupTime.toISOString(),
          hoursSince: hoursSinceBackup.toFixed(1),
        });
      } catch (error) {
        results.push({
          vps: vpsHost,
          status: 'error',
          error: error.message,
        });
      }
    }

    // Determine overall status
    const hasErrors = results.some((r) => r.status === 'error');
    const hasWarnings = results.some((r) => r.status === 'warning');
    const overallStatus = hasErrors ? 'error' : hasWarnings ? 'warning' : 'success';

    // Send to Slack
    await sendSlackNotification(
      overallStatus,
      'Weekly Backup Verification',
      `Checked ${results.length} VPS servers`,
      results.map((r) => ({
        title: r.vps,
        value: r.status === 'ok'
          ? `Last backup: ${r.hoursSince}h ago`
          : `Status: ${r.status.toUpperCase()}`,
      }))
    );

    res.status(200).json({ results });
  } catch (error) {
    console.error('Backup verification cron failed:', error);
    await sendSlackNotification(
      'error',
      'Backup Verification Failed',
      error.message
    );
    res.status(500).json({ error: error.message });
  }
}
```

### Daily Security Log Summary Cron

```typescript
// pages/api/cron/security-log-summary.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendSlackNotification } from '@/backend/src/services/slackService';
import { query } from '@/backend/src/db/postgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify cron auth
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Query security events from last 24 hours
    const securityEvents = await query(
      `SELECT event_type, COUNT(*) as count
       FROM security_logs
       WHERE timestamp > NOW() - INTERVAL '24 hours'
       GROUP BY event_type
       ORDER BY count DESC`
    );

    // Check for suspicious activity
    const suspiciousEvents = securityEvents.rows.filter(
      (event) => event.event_type.includes('failed') && event.count > 10
    );

    const status = suspiciousEvents.length > 0 ? 'warning' : 'info';

    // Send daily summary
    await sendSlackNotification(
      status,
      'Daily Security Log Summary',
      `Security events in last 24 hours`,
      securityEvents.rows.map((event) => ({
        title: event.event_type,
        value: event.count.toString(),
      }))
    );

    res.status(200).json({ events: securityEvents.rows });
  } catch (error) {
    console.error('Security log summary cron failed:', error);
    res.status(500).json({ error: error.message });
  }
}
```

### Connecting to PostgreSQL from Vercel

```typescript
// backend/src/db/postgres.ts
import { Pool } from 'pg';

// Create connection pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: {
    rejectUnauthorized: false, // Contabo self-signed certs
  },
  max: 20, // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Query helper with retry logic
export async function query(
  text: string,
  params?: any[],
  retries = 3
): Promise<any> {
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      const result = await pool.query(text, params);
      return result;
    } catch (error) {
      console.error(`Query attempt ${i + 1} failed:`, error);
      lastError = error;

      // Wait before retry (exponential backoff)
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }

  throw lastError;
}

// Connection health check
export async function healthCheck(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
```

---

<a name="integration-example"></a>

## Complete Integration Example: New Customer Onboarding

```typescript
// backend/src/workflows/customerOnboarding.ts
import { query } from '../db/postgres';
import { sendNotification } from '../services/notificationService';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface OnboardingData {
  customerName: string;
  customerEmail: string;
  tier: 'shared' | 'dedicated' | 'pro' | 'enterprise';
  company?: string;
}

export async function onboardNewCustomer(data: OnboardingData) {
  const startTime = Date.now();

  try {
    // Step 1: Create customer record in database
    const customerResult = await query(
      `INSERT INTO customers (name, email, tier, company, status, created_at)
       VALUES ($1, $2, $3, $4, 'active', NOW())
       RETURNING id`,
      [data.customerName, data.customerEmail, data.tier, data.company]
    );

    const customerId = customerResult.rows[0].id;

    // Step 2: Provision database on VPS
    const dbCredentials = await provisionDatabase(customerId, data.tier);

    // Step 3: Set up backups
    await setupBackups(customerId, dbCredentials.databaseName);

    // Step 4: Send welcome email with credentials
    await sendNotification({
      event: 'customer.provisioned',
      data: {
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        tier: data.tier,
        databaseName: dbCredentials.databaseName,
        hostname: dbCredentials.hostname,
        port: dbCredentials.port,
        username: dbCredentials.username,
        password: dbCredentials.password,
        sslRequired: true,
      },
    });

    // Step 5: Log completion
    await query(
      `INSERT INTO onboarding_logs (customer_id, status, duration_ms, completed_at)
       VALUES ($1, 'success', $2, NOW())`,
      [customerId, Date.now() - startTime]
    );

    return {
      success: true,
      customerId,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Customer onboarding failed:', error);

    // Send error notification
    await sendNotification({
      event: 'incident.critical',
      data: {
        incidentTitle: 'Customer Onboarding Failed',
        message: `Failed to onboard ${data.customerName}: ${error.message}`,
        affectedCustomers: data.customerName,
        status: 'investigating',
      },
    });

    throw error;
  }
}

async function provisionDatabase(
  customerId: string,
  tier: string
): Promise<{
  databaseName: string;
  username: string;
  password: string;
  hostname: string;
  port: number;
}> {
  // Determine which VPS to use based on tier
  const vpsHost =
    tier === 'shared'
      ? process.env.SHARED_VPS_HOST
      : process.env.DEDICATED_VPS_HOST;

  const databaseName = `customer_${customerId}`;
  const username = `user_${customerId}`;
  const password = generateSecurePassword();

  // SSH to VPS and create database
  await execAsync(
    `ssh -i ~/.ssh/costplusdb_rsa root@${vpsHost} "
      psql -U postgres -c 'CREATE DATABASE ${databaseName};'
      psql -U postgres -c 'CREATE USER ${username} WITH PASSWORD \\'${password}\\';'
      psql -U postgres -c 'GRANT ALL PRIVILEGES ON DATABASE ${databaseName} TO ${username};'
    "`
  );

  return {
    databaseName,
    username,
    password,
    hostname: vpsHost,
    port: 5432,
  };
}

async function setupBackups(customerId: string, databaseName: string) {
  // Configure pgBackRest for this database
  const vpsHost = process.env.VPS_HOST;

  await execAsync(
    `ssh -i ~/.ssh/costplusdb_rsa root@${vpsHost} "
      echo '[${databaseName}]' >> /etc/pgbackrest/pgbackrest.conf
      echo 'pg1-path=/var/lib/postgresql/16/main' >> /etc/pgbackrest/pgbackrest.conf
      pgbackrest --stanza=${databaseName} stanza-create
      pgbackrest --stanza=${databaseName} backup --type=full
    "`
  );
}

function generateSecurePassword(length: number = 32): string {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  return password;
}
```

---

<a name="environment-variables"></a>

## Environment Variables Checklist

```bash
# .env.local (for local development)
# .env.production (Vercel dashboard for production)

# ========================
# DATABASE (PostgreSQL)
# ========================
POSTGRES_HOST=your-vps-host.com
POSTGRES_PORT=5432
POSTGRES_DATABASE=costplusdb_main
POSTGRES_USER=admin
POSTGRES_PASSWORD=your-secure-password

# ========================
# RESEND (Email API)
# ========================
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
# Get from: https://resend.com/api-keys

# ========================
# CLAUDE AI (Email Enhancement)
# ========================
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
# Get from: https://console.anthropic.com/

# ========================
# SLACK (Webhooks)
# ========================
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
# Get from: https://api.slack.com/apps → Incoming Webhooks

# ========================
# VERCEL CRON (Security)
# ========================
CRON_SECRET=generate-random-secret-here
# Use: openssl rand -base64 32

# ========================
# VPS SSH (For automation)
# ========================
VPS_SERVERS=vps1.contabo.com,vps2.contabo.com
SHARED_VPS_HOST=vps1.contabo.com
DEDICATED_VPS_HOST=vps2.contabo.com

# ========================
# STRIPE (Payments)
# ========================
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
# Get from: https://dashboard.stripe.com/apikeys

# ========================
# FEATURE FLAGS
# ========================
AI_ENHANCE_EMAILS=true
SEND_SLACK_NOTIFICATIONS=true
```

### Setting Environment Variables in Vercel

```bash
# Via Vercel CLI
vercel env add RESEND_API_KEY production
vercel env add ANTHROPIC_API_KEY production
vercel env add SLACK_WEBHOOK_URL production

# Or via Vercel Dashboard:
# 1. Go to Project Settings → Environment Variables
# 2. Add each variable
# 3. Select environment (Production, Preview, Development)
# 4. Save
```

---

<a name="cost-analysis"></a>

## Cost Analysis

### Monthly Service Costs (Bootstrap Budget)

| Service | Free Tier | Estimated Usage | Cost |
|---------|-----------|-----------------|------|
| **Resend** | 100 emails/day (3,000/mo) | 500 emails/mo (invoices, alerts) | $0 |
| **Resend (Paid)** | After 3,000 emails | $20/mo for 50k emails | $0-20 |
| **Vercel Hobby** | Unlimited functions | 100 GB-hours | $0 |
| **Vercel Pro** | If needed for team | Pro plan | $20 |
| **Claude API** | Pay-per-use | ~500k tokens/mo | $5-15 |
| **Slack** | Free webhooks | Unlimited | $0 |
| **PostgreSQL** | Self-hosted on Contabo | Already paid | $0 |

**Total: $5-35/month** (well within $0-50 budget)

### Cost Optimization Tips

1. **Stay on Resend free tier** - 3,000 emails/mo is plenty for early stage
2. **Use AI sparingly** - Only enhance welcome emails, not invoices/alerts
3. **Cache frequently used data** - Reduce database queries
4. **Batch operations** - Generate all invoices in one cron run

### Scaling Projections

| Customers | Emails/Mo | Cron Jobs/Mo | Estimated Cost |
|-----------|-----------|--------------|----------------|
| 10 | 150 | 120 | $5 |
| 50 | 750 | 600 | $10 |
| 100 | 1,500 | 1,200 | $15 |
| 500 | 7,500 | 6,000 | $40 |
| 1,000 | 15,000 | 12,000 | $80 |

**Break-even:** 1 customer ($49/mo tier) covers all automation costs.

---

<a name="security"></a>

## Security Considerations

### 1. Never Log Sensitive Data

```typescript
// ❌ BAD - Logs customer password
console.log('Creating user:', { username, password });

// ✅ GOOD - Redact sensitive fields
console.log('Creating user:', { username, password: '[REDACTED]' });
```

### 2. Sanitize Data Before Sending to Slack

```typescript
// backend/src/services/slackService.ts
function sanitizeForSlack(data: any): any {
  const sensitiveFields = ['password', 'api_key', 'secret', 'token', 'ssn', 'credit_card'];

  const sanitized = { ...data };
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  return sanitized;
}
```

### 3. Encrypt Customer Credentials in Database

```typescript
// backend/src/utils/encryption.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### 4. Verify Cron Job Requests

```typescript
// All cron jobs should verify they're from Vercel
const authHeader = req.headers.authorization;
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### 5. Rate Limit API Endpoints

```typescript
// middleware/rateLimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
});

export async function rateLimitMiddleware(req: NextApiRequest) {
  const identifier = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const { success } = await ratelimit.limit(identifier as string);

  if (!success) {
    throw new Error('Rate limit exceeded');
  }
}
```

### 6. Audit Trail for All Actions

```sql
-- migrations/001_audit_logs.sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES customers(id),
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

---

<a name="testing"></a>

## Testing & Deployment

### Local Testing Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# 3. Run development server
npm run dev

# 4. Test individual functions
npm run test:invoice-generation
npm run test:email-sending
npm run test:slack-notifications
```

### Testing Email Templates (Without Sending)

```typescript
// scripts/test-email-template.ts
import { getWelcomeEmailTemplate } from '@/backend/src/templates/welcomeEmail';
import fs from 'fs';

const testData = {
  customerName: 'Test Customer',
  databaseName: 'test_db',
  hostname: 'test.costplusdb.dev',
  port: 5432,
  username: 'test_user',
  password: 'test_password_123',
  sslRequired: true,
};

const html = getWelcomeEmailTemplate(testData);

// Write to file for preview
fs.writeFileSync('test-email-output.html', html);
console.log('Email template saved to test-email-output.html');
console.log('Open in browser to preview');
```

### Testing Cron Jobs Locally

```bash
# Manually trigger cron endpoint with auth header
curl -X POST \
  http://localhost:3000/api/cron/generate-monthly-invoices \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### Vercel Deployment

```bash
# 1. Link to Vercel project
vercel link

# 2. Deploy to preview
vercel

# 3. Deploy to production
vercel --prod

# 4. Check cron jobs are registered
vercel crons ls
```

### Monitoring Cron Job Execution

```typescript
// pages/api/cron-status.ts
// Dashboard to check last cron run times
import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/backend/src/db/postgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const cronLogs = await query(
    `SELECT cron_job, last_run, status, duration_ms
     FROM cron_execution_logs
     ORDER BY last_run DESC
     LIMIT 50`
  );

  res.status(200).json({ logs: cronLogs.rows });
}
```

---

<a name="maintenance"></a>

## Maintenance & Monitoring

### Daily Checklist

- [ ] Check Slack for overnight alerts
- [ ] Review failed email deliveries (Resend dashboard)
- [ ] Check cron job execution logs (Vercel dashboard)
- [ ] Verify backup completion (Monday cron summary)

### Weekly Checklist

- [ ] Review all Slack notifications from past week
- [ ] Check email open rates (adjust templates if needed)
- [ ] Test one customer onboarding flow end-to-end
- [ ] Review API usage (Resend, Claude, Vercel)

### Monthly Checklist

- [ ] Audit email sending patterns (ensure under free tier)
- [ ] Review Claude API costs (optimize prompts if high)
- [ ] Test invoice PDF generation with real data
- [ ] Update email templates based on customer feedback

### Monitoring Dashboards

```typescript
// pages/api/monitoring/health.ts
// Overall system health endpoint
import type { NextApiRequest, NextApiResponse } from 'next';
import { healthCheck as dbHealthCheck } from '@/backend/src/db/postgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const checks = {
    database: await dbHealthCheck(),
    resend: await checkResend(),
    slack: await checkSlack(),
    vercelCrons: await checkVercelCrons(),
  };

  const allHealthy = Object.values(checks).every((status) => status === true);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
}

async function checkResend(): Promise<boolean> {
  try {
    // Test Resend API
    const response = await fetch('https://api.resend.com/emails', {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    return response.status === 200 || response.status === 401; // 401 means auth works
  } catch {
    return false;
  }
}

async function checkSlack(): Promise<boolean> {
  try {
    // Send test ping (silent)
    const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Health check (ignore)' }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function checkVercelCrons(): Promise<boolean> {
  // Check last cron execution was within expected window
  const lastCronRun = await query(
    'SELECT MAX(last_run) as last_run FROM cron_execution_logs'
  );
  const hoursSinceLastRun =
    (Date.now() - new Date(lastCronRun.rows[0].last_run).getTime()) / (1000 * 60 * 60);
  return hoursSinceLastRun < 25; // Daily cron should run within 25 hours
}
```

---

## Implementation Timeline

### Week 1: Foundation
- [ ] Set up Resend account and verify domain
- [ ] Create Slack workspace and webhook
- [ ] Install dependencies (@react-pdf/renderer, resend, @anthropic-ai/sdk)
- [ ] Configure environment variables in Vercel

### Week 2: Email System
- [ ] Build welcome email template
- [ ] Build invoice email template
- [ ] Build alert email template
- [ ] Test email sending locally
- [ ] Implement AI enhancement (optional)

### Week 3: PDF Generation
- [ ] Build invoice PDF template
- [ ] Build security audit report template
- [ ] Test PDF generation locally
- [ ] Deploy PDF API routes to Vercel

### Week 4: Notifications
- [ ] Implement Slack notification service
- [ ] Build notification routing logic
- [ ] Set up Netlify form webhook
- [ ] Test end-to-end notification flow

### Week 5: Cron Jobs
- [ ] Configure vercel.json for cron schedules
- [ ] Build monthly invoice generation cron
- [ ] Build weekly backup verification cron
- [ ] Build daily security summary cron
- [ ] Test cron jobs in production

### Week 6: Integration & Testing
- [ ] Build complete customer onboarding workflow
- [ ] End-to-end test with real customer
- [ ] Set up monitoring dashboard
- [ ] Create runbook for common issues

---

## Troubleshooting Guide

### Problem: Emails Not Sending

```bash
# Check Resend API key
curl https://api.resend.com/emails \
  -H "Authorization: Bearer ${RESEND_API_KEY}"

# Expected: 200 or 401 (confirms API key format is correct)

# Check Vercel environment variables
vercel env ls

# Check Resend dashboard for errors
# https://resend.com/emails
```

### Problem: Slack Notifications Not Appearing

```bash
# Test webhook directly
curl -X POST ${SLACK_WEBHOOK_URL} \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test from CLI"}'

# Expected: "ok" response
```

### Problem: Cron Jobs Not Running

```bash
# Check cron is registered
vercel crons ls

# Check recent cron executions
vercel logs --production | grep "cron"

# Manually trigger cron
curl -X POST https://costplusdb.dev/api/cron/test \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### Problem: PDF Generation Fails

```bash
# Check @react-pdf/renderer version
npm list @react-pdf/renderer

# Test locally
npm run test:pdf-generation

# Check Vercel function logs
vercel logs --production | grep "generate-invoice"
```

---

## Next Steps After Implementation

1. **Add customer dashboard** - Let customers view invoices, manage settings
2. **Implement Stripe webhooks** - Auto-reconcile payments with invoices
3. **Build usage analytics** - Track customer database size, queries/sec
4. **Add advanced monitoring** - Grafana dashboards for performance metrics
5. **Implement backup restoration UI** - Let customers restore backups themselves

---

## Support & Resources

### Documentation
- [Resend Docs](https://resend.com/docs)
- [@react-pdf/renderer Docs](https://react-pdf.org/)
- [Vercel Cron Jobs Docs](https://vercel.com/docs/cron-jobs)
- [Slack Block Kit Builder](https://app.slack.com/block-kit-builder)

### Owner Contact
- **Email:** jeremy@intentsolutions.io
- **Slack:** (Internal workspace)

---

**Version:** 1.0
**Last Updated:** October 19, 2025
**Status:** Ready for Implementation

This guide provides everything needed to implement professional automation for CostPlusDB on a bootstrap budget. Start with Week 1 foundation and work through systematically.
