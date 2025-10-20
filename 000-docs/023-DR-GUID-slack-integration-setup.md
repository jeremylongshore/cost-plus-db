# CostPlusDB - Slack Integration Setup Guide

**Purpose:** Set up Slack notifications for database alerts and support
**Cost:** +$29/month (optional add-on)
**Setup Time:** 10-15 minutes

---

## What You Get

With Slack integration enabled, you'll receive:

✅ **Real-time database alerts** in your Slack workspace
✅ **Faster support responses** via Slack DM or channel
✅ **Backup completion notifications**
✅ **Maintenance window notifications**
✅ **Security event alerts**

---

## Two Integration Options

### Option 1: Incoming Webhooks (Recommended)
**Best for:** Automated alerts only
**Pros:** Simple setup, no permissions needed
**Cons:** One-way only (we send alerts to you)

### Option 2: Slack Connect (Premium)
**Best for:** Two-way support conversations
**Pros:** Full chat support, shared channels
**Cons:** Requires Slack paid plan

---

## Option 1: Incoming Webhooks Setup

### Step 1: Create Slack Webhook

1. **Go to:** https://api.slack.com/apps
2. **Click:** "Create New App"
3. **Choose:** "From scratch"
4. **App Name:** "CostPlusDB Alerts"
5. **Workspace:** Select your workspace
6. **Click:** "Create App"

### Step 2: Enable Incoming Webhooks

1. In your new app, click **"Incoming Webhooks"** in the sidebar
2. Toggle **"Activate Incoming Webhooks"** to **On**
3. Scroll down and click **"Add New Webhook to Workspace"**
4. **Select channel** where you want alerts (e.g., `#database-alerts`)
5. Click **"Allow"**

### Step 3: Copy Webhook URL

You'll see a webhook URL like:
```
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

**⚠️ Keep this URL secret - it allows posting to your Slack!**

### Step 4: Send URL to CostPlusDB

**Email to:** jeremy@intentsolutions.io
**Subject:** "Slack Webhook Setup - {YOUR_COMPANY}"

**Email body:**
```
Customer: {Your Company Name}
Customer ID: {Your Customer ID}
Slack Webhook URL: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
Channel: #{channel-name}

Please enable Slack alerts for:
[ ] Database downtime
[ ] Backup failures
[ ] Disk space warnings
[ ] Security events
[ ] All of the above

Preferred alert level:
[ ] Critical only (P0)
[ ] Critical + Urgent (P0 + P1)
[ ] All alerts (P0 + P1 + P2)
```

### Step 5: Test & Confirm

We'll send a test message to verify the webhook works. You should see:

```
🧪 CostPlusDB Alert Test
This is a test message to confirm Slack integration is working.

Customer: Your Company Name
Database: your_database_name
Status: All systems operational

If you receive this, Slack alerts are configured correctly!
```

---

## Option 2: Slack Connect Setup

### What is Slack Connect?

Slack Connect creates a shared channel between your workspace and ours, allowing:
- Two-way conversation
- File sharing
- Faster support responses
- Screen sharing for troubleshooting

**Requirements:**
- Your Slack workspace must be on a paid plan (Standard, Plus, or Enterprise)
- Slack Connect must be enabled in your workspace settings

### Step 1: Request Slack Connect Channel

**Email to:** jeremy@intentsolutions.io
**Subject:** "Slack Connect Request - {YOUR_COMPANY}"

**Email body:**
```
Customer: {Your Company Name}
Customer ID: {Your Customer ID}
Slack Workspace: {yourcompany.slack.com}
Admin Email: {slack-admin@yourcompany.com}

I would like to set up a Slack Connect channel for CostPlusDB support.

Our workspace is on a [Standard / Plus / Enterprise] plan.
Slack Connect is [enabled / disabled] in our workspace.
```

### Step 2: Accept Invitation

We'll send you a Slack Connect invitation to the email address you provided.

1. Check your email for "Slack Connect invitation from CostPlusDB"
2. Click "Accept Invitation"
3. Choose which channel in your workspace to connect (or create new)
4. Approve the connection

### Step 3: Test Connection

Once connected, you'll see a new channel like:

```
#costplusdb-support-{yourcompany}
```

We'll send a welcome message to confirm the connection is working.

---

## Alert Types & Examples

### Database Downtime Alert

```
🚨 CRITICAL: Database Unreachable

Customer: Acme Corp
Database: acme_production
Status: DOWN
Duration: 2 minutes
Detected: 2025-10-19 14:35:00 CT

We are investigating and will update shortly.

Actions taken:
- Operator alerted via SMS
- Investigating connectivity
- Checking server status

Contact: jeremy@intentsolutions.io
```

### Backup Failure Alert

```
⚠️ WARNING: Backup Failed

Customer: Acme Corp
Database: acme_production
Backup: Daily scheduled backup
Failed at: 2025-10-19 01:05:00 CT

Reason: Disk space low (92% used)

Actions:
- Investigating disk usage
- Previous backup still available (2025-10-18)
- No data loss

We will resolve and retry backup within 2 hours.
```

### Disk Space Warning

```
📊 WARNING: Disk Space High

Customer: Acme Corp
Database: acme_production
Disk Usage: 87% (threshold: 85%)

Current: 43.5 GB / 50 GB
Available: 6.5 GB

Recommendation: Consider upgrading to Pro tier (100GB)
or cleaning up old data.

No immediate action required - monitoring closely.
```

### Security Event Alert

```
🔒 SECURITY: IP Banned

Customer: Acme Corp
Database: acme_production
Event: Failed login threshold exceeded

IP Address: 203.0.113.42
Failed Attempts: 7
Action: IP banned for 1 hour

This may be:
- Incorrect credentials in your app
- Brute force attack attempt

If this is your IP, please verify credentials.
Contact us to unban: jeremy@intentsolutions.io
```

### Backup Success (Optional)

```
✅ Backup Complete

Customer: Acme Corp
Database: acme_production
Backup Size: 2.3 GB
Duration: 4m 32s
Completed: 2025-10-19 01:04:32 CT

Local: ✅ Stored
Cloud: ✅ Uploaded to Wasabi S3
Encrypted: ✅ AES-256-CBC

Available for restore: Next 30 days
```

---

## Alert Configuration Options

You can customize which alerts you receive:

### Alert Levels

**Critical Only (P0):**
- Database downtime
- Security breaches
- Data corruption

**Critical + Urgent (P0 + P1):**
- Everything above, plus:
- Backup failures
- Disk space critical (>90%)
- Memory critical (>95%)

**All Alerts (P0 + P1 + P2):**
- Everything above, plus:
- Disk space warnings (>85%)
- Memory warnings (>90%)
- SSL certificate expiry warnings
- Monthly security scan results
- Daily backup success confirmations

### Quiet Hours (Optional)

Set hours when you don't want non-critical alerts:

```
Monday-Friday: 6 PM - 8 AM CT
Weekends: All day Saturday-Sunday
```

**Note:** Critical alerts (P0) are ALWAYS sent immediately.

---

## Slack Channel Recommendations

### Option A: Dedicated Alerts Channel
```
#database-alerts
```
**Pros:**
- Dedicated space for database notifications
- Won't clutter other channels
- Easy to search history

**Cons:**
- Might miss alerts if not actively monitoring

### Option B: Existing Operations Channel
```
#ops
#infrastructure
#monitoring
```
**Pros:**
- Integrated with other infrastructure alerts
- Ops team already monitors this channel

**Cons:**
- May get lost in other noise

### Option C: Direct Messages
```
@yourusername (DM)
```
**Pros:**
- Guaranteed to see alerts
- No channel clutter

**Cons:**
- Only one person gets alerts
- No team visibility

**Recommendation:** Start with `#database-alerts` and add DMs for critical only.

---

## Support via Slack

### Response Times

With Slack integration enabled:

| Priority | Response Time | Availability |
|----------|---------------|--------------|
| P0 (Critical) | 15 minutes | 24/7 |
| P1 (Urgent) | 1 hour | Business hours |
| P2 (General) | 4 hours | Business hours |

**Business Hours:** Monday-Friday, 9 AM - 5 PM CT

### How to Request Support

**In Slack Connect channel:**
```
Hey @CostPlusDB team, we're seeing slow query performance.
Can you help investigate?

Database: acme_production
Issue: SELECT queries taking 5+ seconds
Started: ~2 hours ago
```

**Tag urgency if critical:**
```
🚨 URGENT: Database connection errors

We can't connect to database. Getting "connection refused" errors.
This is blocking production.

Priority: P0
```

### What We Can Help With

✅ **Immediate help via Slack:**
- Database connectivity issues
- Performance troubleshooting
- Query optimization
- Connection configuration
- Backup/restore requests
- Security questions

❌ **Requires email/screenshare:**
- Billing questions (send to email)
- Complex migrations (may need call)
- Application-level debugging (your app code)

---

## Cost & Billing

**Slack Integration Fee:** +$29/month

**Included:**
- Unlimited alerts
- Slack support during business hours
- Shared Slack Connect channel (if using Option 2)
- Priority response times

**Added to your invoice:**
```
CostPlusDB Shared Plan:    $49.00
Slack Integration:         $29.00
--------------------------------
Total:                     $78.00/month
```

**To enable:** Email jeremy@intentsolutions.io with "Enable Slack Integration"

**To cancel:** Email jeremy@intentsolutions.io with "Cancel Slack Integration" (takes effect next billing cycle)

---

## Troubleshooting

### Webhook not working

**Check:**
1. Webhook URL is correct (starts with `https://hooks.slack.com/`)
2. Channel still exists and app has permission
3. Webhook wasn't revoked in Slack app settings

**Test webhook manually:**
```bash
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test message from CostPlusDB"}'
```

### Not receiving alerts

**Check:**
1. Alert preferences (are you subscribed to that alert level?)
2. Quiet hours settings
3. Slack notification settings (are you muted?)
4. Check webhook logs in Slack app settings

**Contact us:** jeremy@intentsolutions.io with "Slack alerts not working"

### Too many alerts

**Reduce noise:**
1. Switch to "Critical Only" alert level
2. Enable quiet hours
3. Disable backup success notifications
4. Use thread replies instead of new messages (we can configure)

---

## Security Considerations

### Webhook URL Security

**⚠️ Your webhook URL is sensitive - anyone with it can post to your Slack.**

**Best practices:**
1. ✅ Store webhook URL securely (don't commit to git)
2. ✅ Limit who has access to the URL
3. ✅ Rotate webhook if it's exposed (revoke old, create new)
4. ❌ Don't share webhook in public forums/repos
5. ❌ Don't post webhook in Slack channels

### Slack Connect Security

**Data shared in Slack Connect:**
- Database name (but NOT credentials)
- Server performance metrics
- Error messages
- Alert history

**NOT shared:**
- Database passwords
- Connection strings
- Customer data
- Other customers' information

---

## FAQ

**Q: Can I have multiple webhooks (different channels for different alerts)?**
A: Yes! Email us and we can route different alert types to different channels.

**Q: Can I integrate with Microsoft Teams instead?**
A: Not yet, but it's on our roadmap. Email jeremy@intentsolutions.io to be notified when available.

**Q: What if I want to disable alerts temporarily?**
A: Email us with date range and we'll pause alerts. Or set quiet hours in your preferences.

**Q: Can I get alerts via SMS too?**
A: SMS is only for critical (P0) alerts and costs +$15/month. Email to enable.

**Q: Do I need Slack integration to get email alerts?**
A: No! Email alerts are included free in all plans. Slack is an optional upgrade.

**Q: Can I try Slack integration free for a month?**
A: Yes! First month free for new customers. Email to request trial.

---

## Getting Started

**Ready to set up Slack integration?**

1. **Choose your option:**
   - Option 1: Incoming Webhooks (simple, one-way alerts)
   - Option 2: Slack Connect (full support channel)

2. **Follow setup steps above**

3. **Email us with your webhook URL or Slack Connect request**

4. **We'll configure and send a test message**

5. **Start receiving alerts in Slack!**

**Questions?** Email jeremy@intentsolutions.io

---

**Last Updated:** 2025-10-19
**Contact:** jeremy@intentsolutions.io
