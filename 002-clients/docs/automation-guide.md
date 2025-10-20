# Automation Guide

Complete guide to automating CostPlusDB customer management workflows.

## Overview

The CostPlusDB customer management system includes several automation scripts that handle:
- Form submission processing
- Database provisioning
- Credential generation
- Email notifications
- Cloud synchronization

This guide explains how each automation works and how to configure them.

---

## Automation Scripts

### 1. Form Processing: `process-intake-form.js`

**Purpose:** Process customer intake form submissions and create customer records

**Location:** `scripts/process-intake-form.js`

**Workflow:**
```
1. Read form submission JSON
2. Validate required fields
3. Generate customer ID
4. Create customer record in database
5. Create workflow record
6. Move form data to customer folder
7. Send confirmation email
8. Update form submission status
9. Log activity
```

**Usage:**
```bash
cd scripts
node process-intake-form.js ../forms/form-submissions/latest.json
```

**Automation (cron):**
```bash
# Process new forms every 15 minutes
*/15 * * * * cd /path/to/002-clients/scripts && node process-intake-form.js --auto >> ../logs/form-processing.log 2>&1
```

**Configuration:**
```javascript
// Environment variables (.env)
RESEND_API_KEY=re_xxxxx
FORM_SUBMISSION_DIR=/path/to/forms/form-submissions
CUSTOMER_DIR=/path/to/customers
DATABASE_PATH=/path/to/database/costplusdb.db
```

**Error Handling:**
- Invalid email: Skip submission, log error
- Duplicate customer: Update existing record
- Database error: Retry 3 times, then alert admin

---

### 2. Database Provisioning: `provision-database.sh`

**Purpose:** Provision PostgreSQL database for paying customers

**Location:** `scripts/provision-database.sh`

**Workflow:**
```
1. Validate customer ID and tier
2. Select appropriate VPS
3. SSH to VPS, create database and user
4. Configure database parameters
5. Set up SSL/TLS
6. Configure pgBackRest backups
7. Set up monitoring
8. Update firewall rules
9. Create database record
10. Generate credentials
11. Log provisioning activity
```

**Usage:**
```bash
cd scripts
./provision-database.sh <customer-id> <tier>

# Example
./provision-database.sh CUST-20251020-001 shared
```

**Parameters:**
- `customer-id`: Customer ID from database
- `tier`: shared | dedicated | pro | enterprise

**Requirements:**
- SSH access to VPS infrastructure
- PostgreSQL superuser credentials
- Wasabi S3 credentials (for backups)
- Monitoring system access

**Error Handling:**
- VPS unavailable: Try alternate VPS
- Database creation fails: Rollback, alert admin
- Backup config fails: Continue provisioning, alert admin
- Monitoring setup fails: Continue provisioning, log warning

---

### 3. Credential Generation: `generate-credentials.sh`

**Purpose:** Generate secure database credentials and connection strings

**Location:** `scripts/generate-credentials.sh`

**Workflow:**
```
1. Generate strong random password (32 characters)
2. Create credentials JSON file
3. Generate connection strings (PostgreSQL, JDBC, etc.)
4. Optionally encrypt credentials file
5. Save to customer folder
6. Log credential generation
```

**Usage:**
```bash
cd scripts
./generate-credentials.sh <customer-id> <database-name> <host> <port> <username>
```

**Output:**
```json
{
  "customer_id": "CUST-20251020-001",
  "database": {
    "host": "db1.costplusdb.com",
    "port": 5432,
    "database": "costplus_cust_20251020_001",
    "username": "costplus_cust_20251020_001_user",
    "password": "generated-secure-password-32-chars",
    "sslmode": "require"
  },
  "connection_strings": {
    "postgresql": "postgresql://...",
    "psql": "psql 'host=...'",
    "jdbc": "jdbc:postgresql://..."
  }
}
```

**Security:**
- Password: 32 characters, alphanumeric + special characters
- Credentials file: Stored in gitignored directory
- Optional GPG encryption for credentials at rest

---

### 4. Setup Email: `send-setup-email.sh`

**Purpose:** Send database credentials and setup instructions to customer

**Location:** `scripts/send-setup-email.sh`

**Workflow:**
```
1. Load customer data from database
2. Load credentials from customer folder
3. Render email template with customer data
4. Send via Resend API
5. Log email sent
6. Update customer workflow
```

**Usage:**
```bash
cd scripts
./send-setup-email.sh <customer-id>

# Force resend
./send-setup-email.sh <customer-id> --force
```

**Email Template:** `templates/setup-confirmation.md`

**Email Contents:**
- Welcome message
- Database connection details
- Connection examples (psql, pgAdmin, application)
- SSL certificate download link
- Getting started guide
- Support contact information

**Requirements:**
- Resend API key
- Email template configured
- Customer has valid email address

---

### 5. Turso Sync: `sync-to-turso.sh`

**Purpose:** Sync local SQLite database to Turso cloud

**Location:** `scripts/sync-to-turso.sh`

**Workflow:**
```
1. Dump local SQLite database
2. Push to Turso cloud database
3. Verify sync completed
4. Clean up temporary files
5. Log sync activity
```

**Usage:**
```bash
cd scripts
./sync-to-turso.sh
```

**Automation (cron):**
```bash
# Sync to Turso daily at 3 AM
0 3 * * * cd /path/to/002-clients/scripts && ./sync-to-turso.sh >> ../logs/turso-sync.log 2>&1
```

**Requirements:**
- Turso CLI installed
- Turso authentication configured
- TURSO_DATABASE_URL in .env

---

## Webhook Handlers

### Stripe Payment Webhook

**Purpose:** Handle Stripe payment events and trigger provisioning

**Endpoint:** `/webhooks/stripe` (backend service)

**Events Handled:**
- `payment_intent.succeeded` - Payment successful, activate customer
- `payment_intent.failed` - Payment failed, notify admin
- `invoice.paid` - Monthly invoice paid
- `invoice.payment_failed` - Payment failed, suspend customer

**Workflow (payment succeeded):**
```
1. Receive webhook from Stripe
2. Validate webhook signature
3. Extract customer_id from metadata
4. Update customer status: prospect → active
5. Move customer folder: prospects/ → active/
6. Trigger provisioning workflow
7. Send confirmation email
```

**Configuration:**
```bash
# .env
STRIPE_API_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### Netlify Form Webhook

**Purpose:** Receive form submissions from website

**Endpoint:** `/webhooks/netlify-form` (backend service)

**Workflow:**
```
1. Receive form submission from Netlify
2. Validate submission data
3. Save to forms/form-submissions/
4. Trigger form processing (async)
5. Send confirmation email to customer
```

**Configuration:**
```bash
# Netlify dashboard: Settings → Build & deploy → Notifications
# Add outgoing webhook: https://yourdomain.com/webhooks/netlify-form
```

---

## Scheduled Jobs (Cron)

### Daily Tasks

**1. Process form submissions**
```bash
# Every 15 minutes
*/15 * * * * cd /path/to/002-clients/scripts && node process-intake-form.js --auto
```

**2. Sync to Turso cloud**
```bash
# Daily at 3 AM
0 3 * * * cd /path/to/002-clients/scripts && ./sync-to-turso.sh
```

**3. Backup local database**
```bash
# Daily at 2 AM
0 2 * * * cd /path/to/002-clients && sqlite3 database/costplusdb.db .dump | gzip > backups/costplusdb-$(date +%Y%m%d).sql.gz
```

**4. Clean up old logs**
```bash
# Weekly (Sunday at midnight)
0 0 * * 0 find /path/to/002-clients/logs -name "*.log" -mtime +30 -delete
```

**5. Send billing reminders**
```bash
# Daily at 9 AM
0 9 * * * cd /path/to/002-clients/scripts && node send-billing-reminders.js
```

### Weekly Tasks

**1. Customer usage reports**
```bash
# Monday at 8 AM
0 8 * * 1 cd /path/to/002-clients/scripts && node generate-usage-reports.js
```

**2. Database health checks**
```bash
# Sunday at 1 AM
0 1 * * 0 cd /path/to/002-clients/scripts && ./check-database-health.sh
```

### Monthly Tasks

**1. Generate invoices**
```bash
# 1st of month at 6 AM
0 6 1 * * cd /path/to/002-clients/scripts && node generate-invoices.js
```

**2. Archive old form submissions**
```bash
# 1st of month at 4 AM
0 4 1 * * cd /path/to/002-clients/scripts && ./archive-old-forms.sh
```

---

## Error Handling & Alerts

### Log Files

All scripts log to `logs/` directory:
- `form-processing.log` - Form submission processing
- `provisioning-{customer-id}.log` - Database provisioning
- `email-{customer-id}.log` - Email delivery
- `turso-sync.log` - Turso synchronization
- `cron.log` - Cron job execution

### Alert Conditions

**Critical alerts (immediate notification):**
- Database provisioning fails
- Payment processing error
- Backup failure
- Customer-facing service down

**Warning alerts (daily digest):**
- Form submission validation errors
- Email delivery failures (non-critical)
- Sync delays
- High resource usage

### Alert Delivery

**Email alerts:**
```bash
# Configure in .env
ALERT_EMAIL=admin@costplusdb.com
RESEND_API_KEY=re_xxxxx
```

**Slack alerts (optional):**
```bash
# Configure in .env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

**Example alert script:**
```bash
#!/bin/bash
# scripts/send-alert.sh

ALERT_TYPE=$1  # critical | warning
MESSAGE=$2

if [ "$ALERT_TYPE" == "critical" ]; then
    # Send email via Resend
    curl -X POST https://api.resend.com/emails \
        -H "Authorization: Bearer $RESEND_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"from\": \"alerts@costplusdb.com\",
            \"to\": \"$ALERT_EMAIL\",
            \"subject\": \"[CRITICAL] CostPlusDB Alert\",
            \"text\": \"$MESSAGE\"
        }"

    # Also send to Slack if configured
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST $SLACK_WEBHOOK_URL \
            -H "Content-Type: application/json" \
            -d "{\"text\": \":rotating_light: CRITICAL: $MESSAGE\"}"
    fi
fi
```

---

## Testing Automation

### Test Form Processing

```bash
# Create test form submission
cat > forms/form-submissions/test-$(date +%s).json <<EOF
{
  "email": "test@example.com",
  "name": "Test Customer",
  "company": "Test Corp",
  "tier": "shared",
  "phone": "+1-555-0100",
  "submitted_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# Process test submission
cd scripts
node process-intake-form.js ../forms/form-submissions/test-*.json

# Verify in database
sqlite3 ../database/costplusdb.db "SELECT * FROM customers WHERE contact_email='test@example.com';"
```

### Test Provisioning (Dry Run)

```bash
# Add --dry-run flag to provisioning script
cd scripts
./provision-database.sh TEST-20251020-999 shared --dry-run

# Check logs
tail -f ../logs/provisioning-TEST-20251020-999.log
```

### Test Email Delivery

```bash
# Send test email
cd scripts
./send-setup-email.sh TEST-20251020-999 --test

# Check Resend dashboard for delivery status
```

---

## Monitoring & Debugging

### View Automation Status

```bash
# Check cron jobs
crontab -l

# View recent cron execution
tail -f /var/log/syslog | grep CRON

# Check running processes
ps aux | grep -E "process-intake-form|provision-database"
```

### Debug Script Issues

```bash
# Run script with verbose logging
cd scripts
bash -x ./provision-database.sh <customer-id> <tier>

# Check script exit codes
echo $?  # 0 = success, non-zero = error
```

### Database Debugging

```bash
# Check customer workflow status
sqlite3 database/costplusdb.db "SELECT * FROM customer_workflow WHERE current_stage != 'active';"

# View recent activity
sqlite3 database/costplusdb.db "SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 20;"

# Find failed provisioning
sqlite3 database/costplusdb.db "SELECT * FROM databases WHERE provision_status != 'active';"
```

---

## Best Practices

### Script Development

1. **Always validate inputs**
   - Check required parameters
   - Validate email addresses, customer IDs
   - Sanitize user input

2. **Implement idempotency**
   - Scripts should be safe to run multiple times
   - Check if operation already completed
   - Use database transactions

3. **Comprehensive logging**
   - Log all important actions
   - Include timestamps
   - Log both successes and failures

4. **Error handling**
   - Catch and handle errors gracefully
   - Provide helpful error messages
   - Implement retry logic for transient failures

5. **Testing**
   - Test with sample data first
   - Implement dry-run modes
   - Validate outputs before committing

### Security

1. **Credentials management**
   - Never hardcode credentials
   - Use environment variables
   - Rotate credentials regularly

2. **API keys**
   - Store in .env (gitignored)
   - Limit scope/permissions
   - Monitor usage

3. **File permissions**
   - Restrict script execution to authorized users
   - Secure customer data directories
   - Encrypt sensitive files

---

## Troubleshooting

### Form Processing Not Working

**Check:**
- Form submission files exist in `forms/form-submissions/`
- Database is accessible
- Script has correct permissions
- Resend API key is valid

**Debug:**
```bash
node scripts/process-intake-form.js --debug
```

### Provisioning Hangs

**Check:**
- VPS is reachable via SSH
- PostgreSQL service is running
- Sufficient disk space on VPS

**Debug:**
```bash
# Test SSH connectivity
ssh vps-admin@<vps-host> "echo connected"

# Check VPS resources
ssh vps-admin@<vps-host> "df -h; free -h"
```

### Emails Not Sending

**Check:**
- Resend API key is correct
- Email template exists
- Customer has valid email address

**Debug:**
```bash
# Test Resend API
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"test@costplusdb.com","to":"you@example.com","subject":"Test","text":"Test"}'
```

---

## Reference

- **Cron Reference**: https://crontab.guru
- **Resend API**: https://resend.com/docs
- **Stripe Webhooks**: https://stripe.com/docs/webhooks
- **Turso CLI**: https://docs.turso.tech/reference/turso-cli

---

**Last Updated**: 2025-10-20
