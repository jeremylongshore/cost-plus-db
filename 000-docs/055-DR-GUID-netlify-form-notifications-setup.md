# Netlify Form Notifications Setup Guide

**Document ID:** 055-DR-GUID-netlify-form-notifications-setup
**Category:** Operations Guide
**Owner:** Jeremy Longshore
**Last Updated:** 2025-10-20
**Status:** Setup Instructions

---

## Purpose

Configure Netlify to send **email** and **Slack** notifications when someone submits the consultation request form on costplusdb.com.

**Current Form:** `consultation-request` form on `/calculator.html`

---

## Quick Start (5 Minutes)

### Step 1: Enable Netlify Form Notifications (Email)

**Option A: Via Netlify UI (Recommended - 2 minutes)**

1. Go to Netlify Dashboard: https://app.netlify.com
2. Select your site: **costplusdb** (or whatever you named it)
3. Go to: **Forms** → **Form notifications**
4. Click: **Add notification** → **Email notification**
5. Configure:
   - **Form name:** `consultation-request`
   - **Email to notify:** `jeremy@intentsolutions.io`
   - **Subject:** `New Consultation Request - CostPlusDB`
6. Click: **Save**

**Option B: Via netlify.toml (Already configured)**

The `netlify.toml` file is already configured with email notifications. Just deploy and it will work automatically.

---

### Step 2: Enable Slack Notifications (Optional - 5 minutes)

**Prerequisites:**
- Slack workspace (create free at slack.com if needed)
- Admin access to create incoming webhooks

**Setup Instructions:**

#### A. Create Slack Incoming Webhook

1. Go to: https://api.slack.com/apps
2. Click: **Create New App** → **From scratch**
3. App name: `CostPlusDB Notifications`
4. Workspace: Select your workspace
5. Click: **Create App**

6. In left sidebar, click: **Incoming Webhooks**
7. Toggle: **Activate Incoming Webhooks** to **ON**
8. Scroll down, click: **Add New Webhook to Workspace**
9. Choose channel (e.g., `#sales`, `#notifications`, `#general`)
10. Click: **Allow**

11. **Copy the webhook URL** (looks like):
   ```
   https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
   ```

#### B. Add Webhook to Netlify

**Method 1: Netlify UI (Recommended)**

1. Go to Netlify Dashboard → Your site
2. Navigate to: **Site settings** → **Build & deploy** → **Environment variables**
3. Click: **Add a variable**
4. Key: `SLACK_WEBHOOK_URL`
5. Value: (paste your webhook URL from step A.11)
6. Click: **Save**

**Method 2: Netlify Forms Settings**

1. Go to Netlify Dashboard → Your site
2. Navigate to: **Forms** → **Form notifications**
3. Click: **Add notification** → **Slack notification**
4. Configure:
   - **Form name:** `consultation-request`
   - **Slack webhook URL:** (paste your webhook URL)
5. Click: **Save**

---

## What Happens When Form is Submitted

### Email Notification

**To:** jeremy@intentsolutions.io
**Subject:** 🔔 New Consultation Request - CostPlusDB

**Email Content:**
```
New form submission: consultation-request

Name: John Doe
Email: john@example.com
Company: Acme Corp
Current Database: PostgreSQL 14 on Heroku, 50GB data, 1000 req/min
Tier of Interest: Dedicated - $89/mo (8GB RAM, 200GB storage)
Timeline: 1-2 weeks
Requirements: Need high availability, compliance with SOC 2

Submitted: 2025-10-20 14:30:00 UTC
IP Address: 192.168.1.1
User Agent: Mozilla/5.0...
```

### Slack Notification

**Channel:** #sales (or whatever you configured)

**Message Format:**
```
🔔 New Consultation Request - CostPlusDB

Name: John Doe
Email: john@example.com
Company: Acme Corp

Current Database: PostgreSQL 14 on Heroku, 50GB data, 1000 req/min
Tier: Dedicated - $89/mo
Timeline: 1-2 weeks

Requirements:
Need high availability, compliance with SOC 2

View in Netlify: [link to form submission]
```

---

## Customizing Notifications

### Custom Email Template

**Location:** Netlify Dashboard → Forms → Form notifications → Edit notification

**Custom subject line:**
```
[URGENT] New Customer: {name} - {company}
```

**Custom email template (HTML):**
```html
<h2>New Consultation Request</h2>

<table>
  <tr>
    <th>Name:</th>
    <td>{name}</td>
  </tr>
  <tr>
    <th>Email:</th>
    <td><a href="mailto:{email}">{email}</a></td>
  </tr>
  <tr>
    <th>Company:</th>
    <td>{company}</td>
  </tr>
  <tr>
    <th>Tier:</th>
    <td>{tier-interest}</td>
  </tr>
  <tr>
    <th>Timeline:</th>
    <td>{timeline}</td>
  </tr>
</table>

<h3>Current Database</h3>
<p>{current-db}</p>

<h3>Requirements</h3>
<p>{requirements}</p>

<hr>
<p><a href="https://app.netlify.com/sites/YOUR-SITE/forms">View in Netlify Dashboard</a></p>
```

### Custom Slack Message (Advanced)

**Option 1: Use Netlify's built-in Slack integration** (basic formatting)

**Option 2: Create Netlify Function for custom Slack formatting**

**Location:** `website/netlify/functions/slack-notify.js`

```javascript
// Netlify Function - Custom Slack notification
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const data = JSON.parse(event.body).payload;

  // Custom Slack message with rich formatting
  const slackMessage = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🔔 New Consultation Request'
        }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Name:*\n${data.name}` },
          { type: 'mrkdwn', text: `*Email:*\n${data.email}` },
          { type: 'mrkdwn', text: `*Company:*\n${data.company}` },
          { type: 'mrkdwn', text: `*Timeline:*\n${data.timeline}` }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Current Database:*\n${data['current-db']}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Requirements:*\n${data.requirements}`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View in Netlify' },
            url: 'https://app.netlify.com/sites/YOUR-SITE/forms'
          }
        ]
      }
    ]
  };

  // Send to Slack webhook
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(slackMessage)
  });

  return { statusCode: 200, body: 'OK' };
};
```

---

## Testing Notifications

### Test Email Notification

1. Go to: https://costplusdb.netlify.app/calculator.html (or localhost)
2. Fill out the consultation form:
   - Name: Test User
   - Email: test@example.com
   - Company: Test Company
   - Current Database: PostgreSQL 14, 10GB
   - Tier: Dedicated
   - Timeline: Just exploring
   - Requirements: This is a test submission
3. Click: **Request Consultation**
4. Check email: jeremy@intentsolutions.io (should arrive within 1 minute)

### Test Slack Notification

1. Submit test form (same as above)
2. Check Slack channel you configured (e.g., #sales)
3. Should see notification within 1 minute

### Troubleshooting

**Email not arriving:**
- ✅ Check spam/junk folder
- ✅ Verify email address in Netlify Dashboard → Forms → Form notifications
- ✅ Check Netlify Dashboard → Forms → Submissions (submission should be listed)
- ✅ Check Netlify Dashboard → Forms → Form notifications → Status (should be green)

**Slack not working:**
- ✅ Verify webhook URL is correct (starts with `https://hooks.slack.com/services/`)
- ✅ Test webhook URL directly:
  ```bash
  curl -X POST \
    -H 'Content-Type: application/json' \
    -d '{"text": "Test notification from CostPlusDB"}' \
    YOUR_WEBHOOK_URL
  ```
- ✅ Check Netlify Deploy logs for errors
- ✅ Ensure Incoming Webhooks are enabled in Slack app settings

---

## Multiple Notification Recipients

### Email Multiple People

**Option 1: Add multiple email notifications in Netlify UI**
1. Forms → Form notifications → Add notification (repeat for each email)
2. Email 1: jeremy@intentsolutions.io
3. Email 2: sales@costplusdb.com
4. Email 3: notifications@intentsolutions.io

**Option 2: Use email forwarding** (simpler)
1. Configure jeremy@intentsolutions.io to forward to team@costplusdb.com
2. team@costplusdb.com is a Google Group / email alias with multiple recipients

### Slack Multiple Channels

**Option 1: Add multiple Slack notifications**
1. Create webhooks for each channel (#sales, #notifications)
2. Add separate Slack notification for each webhook

**Option 2: Use Slack workflow automation**
1. Create Slack workflow that cross-posts from #sales to #notifications

---

## Advanced: Netlify Function for Custom Logic

If you want to process form submissions with custom logic (e.g., save to database, send to CRM), create a Netlify Function:

**Location:** `website/netlify/functions/form-handler.js`

```javascript
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  // Only handle POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Parse form data
  const params = new URLSearchParams(event.body);
  const formData = {
    name: params.get('name'),
    email: params.get('email'),
    company: params.get('company'),
    currentDb: params.get('current-db'),
    tierInterest: params.get('tier-interest'),
    timeline: params.get('timeline'),
    requirements: params.get('requirements'),
    submittedAt: new Date().toISOString()
  };

  // Save to database (example: Supabase)
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );

  await supabase.from('consultation_requests').insert([formData]);

  // Send Slack notification
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `New consultation request from ${formData.name} (${formData.email})`
    })
  });

  // Send email via Resend
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'costplusdb@intentsolutions.io',
      to: 'jeremy@intentsolutions.io',
      subject: 'New Consultation Request',
      html: `<h2>New request from ${formData.name}</h2>...`
    })
  });

  // Redirect to thank-you page
  return {
    statusCode: 303,
    headers: { Location: '/thank-you.html' },
    body: ''
  };
};
```

**Update form action:**
```html
<form name="consultation-request" method="POST" action="/.netlify/functions/form-handler">
```

---

## Security Considerations

### Rate Limiting

Netlify automatically rate limits form submissions (10/minute per IP). No additional configuration needed.

### Spam Protection

**Already implemented:**
- ✅ Honeypot field (`bot-field`) - catches simple bots
- ✅ Netlify's built-in spam filter

**Additional protection (optional):**

Add reCAPTCHA:
```html
<form name="consultation-request" method="POST" data-netlify="true" data-netlify-recaptcha="true">
  <!-- form fields -->
  <div data-netlify-recaptcha="true"></div>
  <button type="submit">Submit</button>
</form>
```

### GDPR Compliance

Form submissions are stored in Netlify for 30 days. If customer requests data deletion:

1. Go to Netlify Dashboard → Forms → Submissions
2. Find submission by email
3. Click: **Delete**

---

## Monitoring & Analytics

### View Form Submissions

**Netlify Dashboard:**
1. Go to: https://app.netlify.com
2. Select site: **costplusdb**
3. Navigate to: **Forms** → **Submissions**

**Data shown:**
- Submission date/time
- All form fields
- IP address
- User agent
- Spam status

**Export submissions:**
1. Forms → Submissions → **Download CSV**

---

## Cost

**Netlify Forms Pricing:**
- **Free tier:** 100 submissions/month (sufficient for early stage)
- **Pro tier ($19/mo):** 1,000 submissions/month
- **Business tier ($99/mo):** 10,000 submissions/month

**Current usage:**
- Estimated: 50 submissions/month (fits free tier)

**Slack Webhooks:** Free (unlimited)

---

## Checklist: Setup Complete

- [ ] Email notification configured in Netlify UI
- [ ] Test email sent and received
- [ ] Slack webhook created
- [ ] Slack webhook URL added to Netlify environment variables
- [ ] Slack notification configured in Netlify UI
- [ ] Test Slack notification sent and received
- [ ] Spam protection verified (honeypot field present)
- [ ] Form submissions visible in Netlify Dashboard
- [ ] Documentation complete

---

## Quick Reference

**Netlify Dashboard:**
- Forms: https://app.netlify.com/sites/YOUR-SITE/forms
- Environment variables: https://app.netlify.com/sites/YOUR-SITE/settings/env

**Slack Webhook:**
- Create: https://api.slack.com/apps
- Test: `curl -X POST -H 'Content-Type: application/json' -d '{"text":"Test"}' WEBHOOK_URL`

**Form name:** `consultation-request`
**Email recipient:** jeremy@intentsolutions.io
**Slack channel:** (configure based on your preference)

---

## Support

**Netlify Forms Docs:** https://docs.netlify.com/forms/setup/
**Slack Incoming Webhooks:** https://api.slack.com/messaging/webhooks

**Questions?** jeremy@intentsolutions.io

---

**Document Metadata:**
- **Version:** 1.0.0
- **Last Updated:** 2025-10-20
- **Author:** Claude Code Setup Assistant
- **Location:** `/000-docs/055-DR-GUID-netlify-form-notifications-setup.md`
