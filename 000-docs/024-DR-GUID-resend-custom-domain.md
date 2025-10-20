# Resend Custom Domain Setup Guide

**Purpose:** Configure info@costplusdb.dev for sending email alerts
**Time:** 15-20 minutes (most of it waiting for DNS propagation)

---

## Why Custom Domain?

**Current:** Emails from `onboarding@resend.dev` (looks generic)
**After setup:** Emails from `info@costplusdb.dev` (professional, branded)

**Benefits:**
- Professional branding
- Better email deliverability
- No "sent via resend.dev" footer
- Custom domain reputation

---

## Step 1: Add Domain to Resend

1. **Go to:** https://resend.com/domains
2. **Click:** "Add Domain"
3. **Enter:** `costplusdb.dev` (without the @ or info part)
4. **Click:** "Add Domain"

---

## Step 2: Add DNS Records

Resend will show you DNS records to add. You'll need to add these to your domain registrar (wherever you bought costplusdb.dev).

**You'll need to add 3 types of records:**

### SPF Record (TXT)
```
Type: TXT
Name: @ (or leave blank)
Value: v=spf1 include:resend.io ~all
TTL: 3600
```

### DKIM Records (3x CNAME)
```
Type: CNAME
Name: resend._domainkey
Value: resend._domainkey.resend.com
TTL: 3600

Type: CNAME
Name: resend2._domainkey
Value: resend2._domainkey.resend.com
TTL: 3600

Type: CNAME
Name: resend3._domainkey
Value: resend3._domainkey.resend.com
TTL: 3600
```

### DMARC Record (TXT)
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; pct=100; rua=mailto:jeremy@intentsolutions.io
TTL: 3600
```

---

## Step 3: Where to Add DNS Records

### If using Netlify DNS:
1. Go to: https://app.netlify.com/sites/YOUR_SITE/settings/domain
2. Click "DNS settings"
3. Add each record as shown above

### If using Cloudflare:
1. Go to: https://dash.cloudflare.com
2. Select `costplusdb.dev`
3. Click "DNS" tab
4. Click "Add record" for each record above

### If using GoDaddy:
1. Go to: https://dcc.godaddy.com/domains
2. Click `costplusdb.dev`
3. Click "DNS" → "Manage DNS"
4. Add each record

### If using Namecheap:
1. Go to: https://ap.www.namecheap.com/domains/list
2. Click "Manage" next to `costplusdb.dev`
3. Click "Advanced DNS"
4. Add each record

---

## Step 4: Verify DNS Records

**Wait 5-15 minutes for DNS propagation**, then:

1. **Check DNS propagation:**
   ```bash
   dig TXT costplusdb.dev
   dig CNAME resend._domainkey.costplusdb.dev
   ```

2. **In Resend dashboard:**
   - Go to: https://resend.com/domains
   - Click "Verify" next to `costplusdb.dev`
   - Should show "Verified" with green checkmark

**If verification fails:**
- Wait longer (DNS can take up to 24 hours)
- Double-check record values match exactly
- Check for typos in DNS records

---

## Step 5: Update CostPlusDB Alert Script

Once domain is verified, update the email configuration:

```bash
nano 001-security/keys/api-tokens/resend-api-key
```

**Change:**
```bash
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**To:**
```bash
RESEND_FROM_EMAIL=info@costplusdb.dev
```

**Save and test:**
```bash
./001-security/alerts/scripts/send-alert-email.sh "Test Custom Domain" "Testing email from info@costplusdb.dev"
```

---

## Troubleshooting

### "Domain not verified"
- Wait longer (can take 24 hours)
- Check DNS records are exact matches
- Use `dig` to verify records are live

### "SPF record conflict"
- If you have existing SPF record, merge them:
- Example: `v=spf1 include:resend.io include:otherprovider.com ~all`

### Emails go to spam
- Make sure DKIM, SPF, and DMARC all verify
- Send a few test emails to warm up domain
- Check spam score: https://www.mail-tester.com

---

## What's Created

After setup, you can send from:
- `info@costplusdb.dev` (alerts)
- `alerts@costplusdb.dev` (security alerts)
- `billing@costplusdb.dev` (invoices)
- Any other @costplusdb.dev email

**Note:** These are send-only addresses (can't receive replies unless you set up email hosting separately).

---

**Questions?** Email jeremy@intentsolutions.io
