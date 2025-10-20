# Resend Email Setup Guide

**Status:** Ready to configure
**Service:** Resend.com
**Purpose:** Send security alert emails

---

## Quick Setup (5 Minutes)

### Step 1: Get Resend API Key

1. Go to https://resend.com/api-keys
2. Log in with your account (jeremy@intentsolutions.io)
3. Click "Create API Key"
4. Name it: "CostPlusDB Security Alerts"
5. Copy the API key (starts with `re_`)

### Step 2: Add Your Domain (If Not Done)

1. Go to https://resend.com/domains
2. Add domain: `costplusdb.dev`
3. Add DNS records they provide (TXT, MX, CNAME)
4. Wait for verification (~5 minutes)

**OR use Resend's test domain:**
- From: `onboarding@resend.dev` (works immediately, no DNS needed)

### Step 3: Configure API Key

Edit the credentials file:

```bash
nano /home/admincostplus/projects/costplusdb/001-security/keys/api-tokens/resend-api-key
```

Replace with your actual values:

```bash
RESEND_API_KEY=re_YOUR_ACTUAL_API_KEY_HERE
RESEND_FROM_EMAIL=alerts@costplusdb.dev
RESEND_TO_EMAIL=jeremy@intentsolutions.io
```

**If using test domain (no DNS setup needed):**
```bash
RESEND_API_KEY=re_YOUR_ACTUAL_API_KEY_HERE
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_TO_EMAIL=jeremy@intentsolutions.io
```

Save and exit (Ctrl+X, Y, Enter)

### Step 4: Test Email Sending

```bash
/home/admincostplus/projects/costplusdb/001-security/alerts/scripts/send-alert-email.sh \
  "Test Alert" \
  "This is a test email from CostPlusDB security monitoring system. If you receive this, email alerts are working correctly!"
```

Check the log:
```bash
tail -5 /home/admincostplus/projects/costplusdb/001-security/logs/alerts/email-alerts.log
```

You should see:
```
✅ Email sent successfully via Resend: Test Alert
```

And you should receive an email at jeremy@intentsolutions.io!

---

## What Emails Will Be Sent?

Security alerts will be sent automatically for:

- **Failed Login Threshold** - More than 5 failed PostgreSQL logins in 5 minutes
- **Disk Space Alert** - Disk usage above 85%
- **Memory Alert** - Memory usage above 90%
- **SSL Certificate Expiry** - Certificate expires in less than 30 days
- **Suspicious Queries** - Dangerous SQL patterns detected
- **Lynis Hardening Alert** - Security score drops below 70

All emails include:
- Alert subject
- Detailed message
- Server hostname and IP
- Timestamp
- Contact information

---

## Troubleshooting

### "API key not configured" - Still logging to pending

**Fix:** Make sure you replaced `YOUR_RESEND_API_KEY` with your actual API key

### "HTTP 401" - Unauthorized

**Fix:** API key is invalid. Double-check you copied it correctly from Resend dashboard

### "HTTP 403" - Forbidden / Domain not verified

**Fix:** Either:
1. Wait for domain verification to complete (check Resend dashboard)
2. OR use `onboarding@resend.dev` as FROM email (no verification needed)

### "HTTP 422" - Validation error

**Fix:** Check that email addresses are valid format

### Email not received

**Check:**
1. Spam folder
2. Resend dashboard logs: https://resend.com/emails
3. Alert log for response details:
   ```bash
   tail -20 /home/admincostplus/projects/costplusdb/001-security/logs/alerts/email-alerts.log
   ```

---

## Monthly Costs

**Resend Pricing:**
- Free tier: 3,000 emails/month
- Pro tier: $20/month for 50,000 emails

**Expected usage:**
- Monitoring checks: ~500/month (logged, not emailed)
- Actual alerts: ~5-20/month (only problems trigger emails)

**Cost:** FREE (well under 3,000 emails/month)

---

## Security

**API Key Storage:**
- File: `001-security/keys/api-tokens/resend-api-key`
- Permissions: 0600 (owner read/write only)
- Git: Ignored (never committed)

**Backup API Key:**
- [ ] Save to 1Password vault
- [ ] Store in secure location

---

## Alternative: Use Test Domain (No DNS Setup)

If you don't want to set up DNS for `costplusdb.dev` yet:

```bash
# In resend-api-key file
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Pros:**
- Works immediately
- No DNS configuration needed
- Same functionality

**Cons:**
- Emails come from `onboarding@resend.dev` instead of `alerts@costplusdb.dev`
- Slightly less professional looking

---

## DNS Records for costplusdb.dev (Optional)

If you want emails from `alerts@costplusdb.dev`:

**Add to Netlify DNS (or your DNS provider):**

```
Type: TXT
Name: costplusdb.dev
Value: [Resend will provide - check dashboard]

Type: MX
Name: costplusdb.dev
Priority: 10
Value: feedback-smtp.us-east-1.amazonses.com

Type: TXT
Name: resend._domainkey.costplusdb.dev
Value: [DKIM key from Resend dashboard]
```

Get exact values from: https://resend.com/domains

---

## Test Commands

**Test with API key configured:**
```bash
./001-security/alerts/scripts/send-alert-email.sh "Test Alert" "Test message"
```

**Test resource monitoring (includes email alert if threshold exceeded):**
```bash
./001-security/scripts/monitoring/check-resource-usage.sh
```

**Check alert log:**
```bash
tail -f /home/admincostplus/projects/costplusdb/001-security/logs/alerts/email-alerts.log
```

---

**Ready to configure? Just need your Resend API key!**
