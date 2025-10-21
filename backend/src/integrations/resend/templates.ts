/**
 * Resend Email Templates
 * Production-quality HTML email templates with inline CSS
 */

import type {
  EmailTemplate,
  CustomerEmailData,
  PricingEmailData,
  CredentialsEmailData,
  AdminNotificationData,
} from './types';

/**
 * Base email styles (inline CSS for email compatibility)
 */
const baseStyles = {
  body: 'font-family: monospace; background-color: #f5f5f5; margin: 0; padding: 20px;',
  container: 'max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 2px solid #000000; padding: 40px;',
  header: 'font-size: 24px; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #000000; padding-bottom: 10px;',
  paragraph: 'margin: 15px 0; line-height: 1.6;',
  button: 'display: inline-block; background-color: #000000; color: #ffffff; padding: 12px 30px; text-decoration: none; font-weight: bold; border: 2px solid #000000; margin: 20px 0;',
  code: 'background-color: #f0f0f0; border: 1px solid #cccccc; padding: 15px; font-family: monospace; margin: 15px 0; display: block; overflow-x: auto;',
  table: 'width: 100%; border-collapse: collapse; margin: 15px 0;',
  tableCell: 'border: 1px solid #000000; padding: 10px;',
  footer: 'margin-top: 40px; padding-top: 20px; border-top: 2px solid #000000; font-size: 12px; color: #666666;',
};

/**
 * Intake Confirmation Email
 */
export function intakeConfirmationTemplate(customer: CustomerEmailData): EmailTemplate {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="${baseStyles.body}">
  <div style="${baseStyles.container}">
    <div style="${baseStyles.header}">
      CostPlusDB - Intake Form Received
    </div>

    <p style="${baseStyles.paragraph}">Hello ${customer.name},</p>

    <p style="${baseStyles.paragraph}">
      Thank you for your interest in CostPlusDB! We've received your intake form and are excited to get you set up with a transparent, affordable managed PostgreSQL database.
    </p>

    <p style="${baseStyles.paragraph}">
      <strong>What happens next:</strong>
    </p>

    <ol style="line-height: 1.8;">
      <li>You'll receive a payment link within the next few hours</li>
      <li>Once payment is confirmed, we'll begin provisioning your database</li>
      <li>Your credentials will be delivered within 24 hours</li>
    </ol>

    <p style="${baseStyles.paragraph}">
      <strong>Your Details:</strong>
    </p>

    <div style="${baseStyles.code}">
Email: ${customer.email}<br>
Name: ${customer.name}<br>
${customer.company ? `Company: ${customer.company}<br>` : ''}
${customer.tier ? `Selected Tier: ${customer.tier}<br>` : ''}
    </div>

    <p style="${baseStyles.paragraph}">
      If you have any questions or need to make changes, simply reply to this email.
    </p>

    <div style="${baseStyles.footer}">
      <p>CostPlusDB - Transparent Database Hosting</p>
      <p>Cost + 15% Markup. No Hidden Fees.</p>
      <p><a href="https://costplusdb.com" style="color: #666666;">costplusdb.com</a></p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
CostPlusDB - Intake Form Received

Hello ${customer.name},

Thank you for your interest in CostPlusDB! We've received your intake form and are excited to get you set up with a transparent, affordable managed PostgreSQL database.

What happens next:
1. You'll receive a payment link within the next few hours
2. Once payment is confirmed, we'll begin provisioning your database
3. Your credentials will be delivered within 24 hours

Your Details:
- Email: ${customer.email}
- Name: ${customer.name}
${customer.company ? `- Company: ${customer.company}\n` : ''}${customer.tier ? `- Selected Tier: ${customer.tier}\n` : ''}

If you have any questions or need to make changes, simply reply to this email.

---
CostPlusDB - Transparent Database Hosting
Cost + 15% Markup. No Hidden Fees.
https://costplusdb.com
  `;

  return {
    subject: 'CostPlusDB - Intake Form Received',
    html,
    text,
  };
}

/**
 * Payment Request Email
 */
export function paymentRequestTemplate(
  customer: CustomerEmailData,
  paymentLink: string,
  pricing: PricingEmailData
): EmailTemplate {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="${baseStyles.body}">
  <div style="${baseStyles.container}">
    <div style="${baseStyles.header}">
      CostPlusDB - Payment Request
    </div>

    <p style="${baseStyles.paragraph}">Hello ${customer.name},</p>

    <p style="${baseStyles.paragraph}">
      Your ${pricing.tier} database is ready to be provisioned! Here's your pricing breakdown:
    </p>

    <table style="${baseStyles.table}">
      <tr>
        <td style="${baseStyles.tableCell}"><strong>Item</strong></td>
        <td style="${baseStyles.tableCell}" align="right"><strong>Amount</strong></td>
      </tr>
      <tr>
        <td style="${baseStyles.tableCell}">Setup Fee (one-time)</td>
        <td style="${baseStyles.tableCell}" align="right">$${pricing.setupFee.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="${baseStyles.tableCell}">Monthly Subscription</td>
        <td style="${baseStyles.tableCell}" align="right">$${pricing.monthlyPrice.toFixed(2)}/mo</td>
      </tr>
      <tr>
        <td style="${baseStyles.tableCell}"><strong>Total First Month</strong></td>
        <td style="${baseStyles.tableCell}" align="right"><strong>$${pricing.totalFirstMonth.toFixed(2)}</strong></td>
      </tr>
    </table>

    <p style="${baseStyles.paragraph}">
      <strong>Included Features:</strong>
    </p>

    <ul style="line-height: 1.8;">
      ${pricing.features.map((feature) => `<li>${feature}</li>`).join('')}
    </ul>

    <div style="text-align: center;">
      <a href="${paymentLink}" style="${baseStyles.button}">
        PAY NOW - $${pricing.totalFirstMonth.toFixed(2)}
      </a>
    </div>

    <p style="${baseStyles.paragraph}">
      <strong>What happens after payment:</strong>
    </p>

    <ol style="line-height: 1.8;">
      <li>We'll immediately begin provisioning your database</li>
      <li>You'll receive a confirmation email</li>
      <li>Your credentials will be delivered within 24 hours</li>
    </ol>

    <p style="${baseStyles.paragraph}">
      Questions? Reply to this email anytime.
    </p>

    <div style="${baseStyles.footer}">
      <p>CostPlusDB - Transparent Database Hosting</p>
      <p>Cost + 15% Markup. No Hidden Fees.</p>
      <p><a href="https://costplusdb.com" style="color: #666666;">costplusdb.com</a></p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
CostPlusDB - Payment Request

Hello ${customer.name},

Your ${pricing.tier} database is ready to be provisioned! Here's your pricing breakdown:

Setup Fee (one-time): $${pricing.setupFee.toFixed(2)}
Monthly Subscription: $${pricing.monthlyPrice.toFixed(2)}/mo
Total First Month: $${pricing.totalFirstMonth.toFixed(2)}

Included Features:
${pricing.features.map((f) => `- ${f}`).join('\n')}

Pay now: ${paymentLink}

What happens after payment:
1. We'll immediately begin provisioning your database
2. You'll receive a confirmation email
3. Your credentials will be delivered within 24 hours

Questions? Reply to this email anytime.

---
CostPlusDB - Transparent Database Hosting
Cost + 15% Markup. No Hidden Fees.
https://costplusdb.com
  `;

  return {
    subject: `CostPlusDB - Payment Request ($${pricing.totalFirstMonth.toFixed(2)})`,
    html,
    text,
  };
}

/**
 * Provisioning Started Email
 */
export function provisioningStartedTemplate(customer: CustomerEmailData): EmailTemplate {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="${baseStyles.body}">
  <div style="${baseStyles.container}">
    <div style="${baseStyles.header}">
      CostPlusDB - Database Provisioning Started
    </div>

    <p style="${baseStyles.paragraph}">Hello ${customer.name},</p>

    <p style="${baseStyles.paragraph}">
      Great news! Your payment has been confirmed and we've started provisioning your PostgreSQL database.
    </p>

    <p style="${baseStyles.paragraph}">
      <strong>What's happening now:</strong>
    </p>

    <ol style="line-height: 1.8;">
      <li>Spinning up your dedicated VPS instance</li>
      <li>Installing and configuring PostgreSQL 16</li>
      <li>Setting up SSL/TLS encryption</li>
      <li>Configuring automated backups with pgBackRest</li>
      <li>Hardening security settings</li>
      <li>Running verification tests</li>
    </ol>

    <p style="${baseStyles.paragraph}">
      You'll receive your connection credentials within the next 24 hours. In most cases, it's much faster!
    </p>

    <p style="${baseStyles.paragraph}">
      We'll send you another email as soon as your database is ready.
    </p>

    <div style="${baseStyles.footer}">
      <p>CostPlusDB - Transparent Database Hosting</p>
      <p>Cost + 15% Markup. No Hidden Fees.</p>
      <p><a href="https://costplusdb.com" style="color: #666666;">costplusdb.com</a></p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
CostPlusDB - Database Provisioning Started

Hello ${customer.name},

Great news! Your payment has been confirmed and we've started provisioning your PostgreSQL database.

What's happening now:
1. Spinning up your dedicated VPS instance
2. Installing and configuring PostgreSQL 16
3. Setting up SSL/TLS encryption
4. Configuring automated backups with pgBackRest
5. Hardening security settings
6. Running verification tests

You'll receive your connection credentials within the next 24 hours. In most cases, it's much faster!

We'll send you another email as soon as your database is ready.

---
CostPlusDB - Transparent Database Hosting
Cost + 15% Markup. No Hidden Fees.
https://costplusdb.com
  `;

  return {
    subject: 'CostPlusDB - Database Provisioning Started',
    html,
    text,
  };
}

/**
 * Credentials Delivered Email
 */
export function credentialsDeliveredTemplate(
  customer: CustomerEmailData,
  credentials: CredentialsEmailData
): EmailTemplate {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="${baseStyles.body}">
  <div style="${baseStyles.container}">
    <div style="${baseStyles.header}">
      CostPlusDB - Your Database is Ready!
    </div>

    <p style="${baseStyles.paragraph}">Hello ${customer.name},</p>

    <p style="${baseStyles.paragraph}">
      Your PostgreSQL database has been provisioned and is ready to use! Below are your connection credentials.
    </p>

    <p style="${baseStyles.paragraph}">
      <strong style="color: #cc0000;">⚠️ IMPORTANT: Keep these credentials secure. Store them in a password manager.</strong>
    </p>

    <div style="${baseStyles.code}">
<strong>Connection Details:</strong><br><br>
Host: ${credentials.host}<br>
Port: ${credentials.port}<br>
Database: ${credentials.database}<br>
Username: ${credentials.username}<br>
Password: ${credentials.password}<br>
SSL: ${credentials.sslRequired ? 'REQUIRED' : 'Optional'}<br><br>
<strong>Connection String:</strong><br>
${credentials.connectionString}
    </div>

    <p style="${baseStyles.paragraph}">
      <strong>Quick Start:</strong>
    </p>

    <pre style="${baseStyles.code}">
# Using psql
psql "${credentials.connectionString}"

# Using connection parameters
psql -h ${credentials.host} -p ${credentials.port} -U ${credentials.username} -d ${credentials.database}
    </pre>

    <p style="${baseStyles.paragraph}">
      <strong>What's already configured:</strong>
    </p>

    <ul style="line-height: 1.8;">
      <li>PostgreSQL 16 (latest stable version)</li>
      <li>SSL/TLS encryption enabled</li>
      <li>Automated daily backups to Wasabi S3</li>
      <li>Point-in-time recovery capability</li>
      <li>Monitoring and alerting</li>
      <li>Firewall protection</li>
    </ul>

    <p style="${baseStyles.paragraph}">
      Need help connecting or have questions? Reply to this email anytime.
    </p>

    <div style="${baseStyles.footer}">
      <p>CostPlusDB - Transparent Database Hosting</p>
      <p>Cost + 15% Markup. No Hidden Fees.</p>
      <p><a href="https://costplusdb.com" style="color: #666666;">costplusdb.com</a></p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
CostPlusDB - Your Database is Ready!

Hello ${customer.name},

Your PostgreSQL database has been provisioned and is ready to use! Below are your connection credentials.

⚠️ IMPORTANT: Keep these credentials secure. Store them in a password manager.

Connection Details:
- Host: ${credentials.host}
- Port: ${credentials.port}
- Database: ${credentials.database}
- Username: ${credentials.username}
- Password: ${credentials.password}
- SSL: ${credentials.sslRequired ? 'REQUIRED' : 'Optional'}

Connection String:
${credentials.connectionString}

Quick Start:

# Using psql
psql "${credentials.connectionString}"

# Using connection parameters
psql -h ${credentials.host} -p ${credentials.port} -U ${credentials.username} -d ${credentials.database}

What's already configured:
- PostgreSQL 16 (latest stable version)
- SSL/TLS encryption enabled
- Automated daily backups to Wasabi S3
- Point-in-time recovery capability
- Monitoring and alerting
- Firewall protection

Need help connecting or have questions? Reply to this email anytime.

---
CostPlusDB - Transparent Database Hosting
Cost + 15% Markup. No Hidden Fees.
https://costplusdb.com
  `;

  return {
    subject: 'CostPlusDB - Your Database is Ready!',
    html,
    text,
  };
}

/**
 * Welcome Email
 */
export function welcomeEmailTemplate(customer: CustomerEmailData): EmailTemplate {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="${baseStyles.body}">
  <div style="${baseStyles.container}">
    <div style="${baseStyles.header}">
      Welcome to CostPlusDB!
    </div>

    <p style="${baseStyles.paragraph}">Hello ${customer.name},</p>

    <p style="${baseStyles.paragraph}">
      Welcome to CostPlusDB! We're thrilled to have you as a customer.
    </p>

    <p style="${baseStyles.paragraph}">
      <strong>Your database is now live and ready to use.</strong> You should have already received your connection credentials in a separate email.
    </p>

    <p style="${baseStyles.paragraph}">
      <strong>What you can expect from us:</strong>
    </p>

    <ul style="line-height: 1.8;">
      <li><strong>Transparency:</strong> We publish our costs and markup openly</li>
      <li><strong>Daily backups:</strong> Automated with 30-day retention</li>
      <li><strong>99.9% uptime:</strong> Monitored 24/7 with automatic alerts</li>
      <li><strong>Fast support:</strong> Reply to any email for technical help</li>
      <li><strong>No surprises:</strong> Your monthly price is your monthly price</li>
    </ul>

    <p style="${baseStyles.paragraph}">
      <strong>Helpful Resources:</strong>
    </p>

    <ul style="line-height: 1.8;">
      <li><a href="https://costplusdb.com/docs" style="color: #000000;">Documentation & Guides</a></li>
      <li><a href="https://costplusdb.com/transparency" style="color: #000000;">Cost Transparency Page</a></li>
      <li><a href="https://costplusdb.com/support" style="color: #000000;">Support Center</a></li>
    </ul>

    <p style="${baseStyles.paragraph}">
      Have questions or need help? Just reply to this email. We're here to help!
    </p>

    <p style="${baseStyles.paragraph}">
      Thanks for choosing CostPlusDB.
    </p>

    <div style="${baseStyles.footer}">
      <p>CostPlusDB - Transparent Database Hosting</p>
      <p>Cost + 15% Markup. No Hidden Fees.</p>
      <p><a href="https://costplusdb.com" style="color: #666666;">costplusdb.com</a></p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Welcome to CostPlusDB!

Hello ${customer.name},

Welcome to CostPlusDB! We're thrilled to have you as a customer.

Your database is now live and ready to use. You should have already received your connection credentials in a separate email.

What you can expect from us:
- Transparency: We publish our costs and markup openly
- Daily backups: Automated with 30-day retention
- 99.9% uptime: Monitored 24/7 with automatic alerts
- Fast support: Reply to any email for technical help
- No surprises: Your monthly price is your monthly price

Helpful Resources:
- Documentation & Guides: https://costplusdb.com/docs
- Cost Transparency Page: https://costplusdb.com/transparency
- Support Center: https://costplusdb.com/support

Have questions or need help? Just reply to this email. We're here to help!

Thanks for choosing CostPlusDB.

---
CostPlusDB - Transparent Database Hosting
Cost + 15% Markup. No Hidden Fees.
https://costplusdb.com
  `;

  return {
    subject: 'Welcome to CostPlusDB!',
    html,
    text,
  };
}

/**
 * Admin Notification Email
 */
export function adminNotificationTemplate(data: AdminNotificationData): EmailTemplate {
  const typeLabels = {
    new_customer: 'New Customer Signup',
    payment_received: 'Payment Received',
    provisioning_complete: 'Provisioning Complete',
    error: 'System Error',
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="${baseStyles.body}">
  <div style="${baseStyles.container}">
    <div style="${baseStyles.header}">
      Admin Alert: ${typeLabels[data.type]}
    </div>

    <p style="${baseStyles.paragraph}">
      <strong>Type:</strong> ${typeLabels[data.type]}<br>
      <strong>Time:</strong> ${data.timestamp.toISOString()}<br>
      <strong>Customer:</strong> ${data.customerName} (${data.customerEmail})
    </p>

    <div style="${baseStyles.code}">
${JSON.stringify(data.details, null, 2)}
    </div>

    <div style="${baseStyles.footer}">
      <p>CostPlusDB Admin Notification</p>
      <p>${new Date().toISOString()}</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Admin Alert: ${typeLabels[data.type]}

Type: ${typeLabels[data.type]}
Time: ${data.timestamp.toISOString()}
Customer: ${data.customerName} (${data.customerEmail})

Details:
${JSON.stringify(data.details, null, 2)}

---
CostPlusDB Admin Notification
${new Date().toISOString()}
  `;

  return {
    subject: `[CostPlusDB Admin] ${typeLabels[data.type]} - ${data.customerName}`,
    html,
    text,
  };
}
