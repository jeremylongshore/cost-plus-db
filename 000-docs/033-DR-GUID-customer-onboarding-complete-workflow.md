# Customer Onboarding Complete Workflow

**Document Type:** DR-GUID (Daily Routine - Guide)
**Created:** 2025-10-20
**Owner:** Intent Solutions (CostPlusDB)
**Purpose:** End-to-end customer onboarding workflow from initial contact to live database

---

## Overview

This guide documents the complete customer onboarding journey from the moment a prospect submits a consultation request through to successful database provisioning and credential delivery.

**Timeline:** 24-48 hours from form submission to live database
**Stakeholders:** Solo founder (Jeremy), customer
**Success Metric:** Customer can connect to database within 1 hour of receiving credentials

---

## Workflow Stages

```
┌─────────────────────────────────────────────────────────────┐
│ CUSTOMER ONBOARDING WORKFLOW                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Stage 1: Initial Contact (0-4 hours)                      │
│  ├─ Customer submits consultation form                     │
│  ├─ Auto-confirmation email sent                           │
│  └─ Jeremy reviews inquiry                                 │
│                                                             │
│  Stage 2: Qualification & Form Submission (4-24 hours)     │
│  ├─ Jeremy sends onboarding form                           │
│  ├─ Customer completes detailed requirements               │
│  └─ Customer returns completed form                        │
│                                                             │
│  Stage 3: Provisioning Preparation (0-2 hours)             │
│  ├─ Review completed onboarding form                       │
│  ├─ Validate plan selection                                │
│  ├─ Verify payment method                                  │
│  └─ Create customer directory structure                    │
│                                                             │
│  Stage 4: Database Provisioning (15-30 minutes)            │
│  ├─ Generate secure credentials                            │
│  ├─ Create PostgreSQL database and user                    │
│  ├─ Configure SSL/TLS requirements                         │
│  ├─ Set up backup schedule                                 │
│  ├─ Enable monitoring                                      │
│  └─ Test database connectivity                             │
│                                                             │
│  Stage 5: Credential Delivery (15 minutes)                 │
│  ├─ Generate setup confirmation email                      │
│  ├─ Send credentials and connection details                │
│  ├─ Customer tests connection                              │
│  └─ First invoice sent                                     │
│                                                             │
│  Stage 6: Post-Launch Support (24-48 hours)                │
│  ├─ Monitor first connections                              │
│  ├─ Respond to any issues                                  │
│  ├─ Verify backup completion                               │
│  └─ Customer marked as "active"                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Stage 1: Initial Contact (0-4 hours)

### Customer Action: Submits Consultation Form

**Location:** https://costplusdb.dev/index.html (Netlify form)

**Form Fields:**
- Name
- Email
- Company (optional)
- Message/inquiry
- How they heard about us

### Automated System Response

**Netlify Form Submission:**
1. Form data received by Netlify
2. Auto-confirmation email sent to customer (configured in Netlify)
3. Notification email sent to `jeremy@intentsolutions.io`

**Auto-Confirmation Email Template:**

```
Subject: Thanks for contacting CostPlusDB!

Hi {NAME},

Thanks for reaching out! We received your inquiry and will respond within 4 business hours.

In the meantime, feel free to:
- Browse our pricing: https://costplusdb.dev/calculator.html
- Read our transparency docs: https://costplusdb.dev/transparency/
- Review our security practices: https://costplusdb.dev/security.html

We're excited to potentially work with you!

Best,
Jeremy Longshore
Founder, CostPlusDB
jeremy@intentsolutions.io
```

### Jeremy's Action: Review Inquiry

**Within 4 business hours:**

1. Read inquiry email from Netlify
2. Check if it's a good fit:
   - ✅ Needs managed PostgreSQL
   - ✅ Budget aligns with pricing ($49-$149/month)
   - ✅ Not requiring features we don't offer yet (e.g., SOC 2, HIPAA)
   - ❌ Spam or irrelevant

3. Create prospect directory:

```bash
# Create prospect directory
PROSPECT_EMAIL="john-acme-com"
mkdir -p /home/admincostplus/projects/costplusdb/001-security/customers/prospects/$PROSPECT_EMAIL

# Save initial inquiry
cat > /home/admincostplus/projects/costplusdb/001-security/customers/prospects/$PROSPECT_EMAIL/initial-inquiry.md <<EOF
# Initial Inquiry

**Date:** $(date +%Y-%m-%d)
**From:** john@acme.com
**Company:** Acme Corp

## Message
Interested in Shared tier for production SaaS app. Looking to migrate from Heroku Postgres.

## How They Heard About Us
Hacker News

## Initial Assessment
- Good fit for Shared tier
- Migration assistance may be needed
- Follow up with onboarding form
EOF
```

4. Respond to customer within 4 hours

---

## Stage 2: Qualification & Form Submission (4-24 hours)

### Jeremy Sends Onboarding Form

**Email Template:**

```
Subject: CostPlusDB - Let's Get Started!

Hi {NAME},

Great to hear from you! I'd love to help you get set up with a transparent, affordable PostgreSQL database.

To get started, please fill out this onboarding form so I can understand your requirements:

[Attach: 021-DR-FORM-customer-onboarding-intake.md]

The form takes about 5-10 minutes to complete. Once I receive it, I can provision your database within 24 hours.

A few quick notes:
- All tiers include daily backups and 24/7 monitoring
- SSL/TLS is required for all connections
- You can change tiers anytime (prorated billing)

Questions? Just reply to this email.

Looking forward to working with you!

Best,
Jeremy Longshore
Founder, CostPlusDB
jeremy@intentsolutions.io
```

**Attachments:**
- `/home/admincostplus/projects/costplusdb/000-docs/021-DR-FORM-customer-onboarding-intake.md`

### Customer Completes Onboarding Form

**Expected turnaround:** 1-48 hours

**Customer fills out:**
- Company information
- Database requirements (name, user, size)
- Plan selection (Shared, Dedicated, Pro, Enterprise)
- Technical requirements (PostgreSQL version, extensions)
- Backup preferences
- Communication preferences
- Billing information
- Terms acceptance

**Customer returns form via email:**
- Subject: "CostPlusDB Onboarding - [Company Name]"
- Attachment: Completed `onboarding-{company}-{date}.md`

### Jeremy Reviews Completed Form

**Validation checklist:**

- [ ] Company information complete
- [ ] Valid email address
- [ ] Database name is valid (lowercase, alphanumeric, underscores only)
- [ ] Plan selection is clear
- [ ] Payment method specified
- [ ] Terms accepted and signed
- [ ] No conflicting requirements (e.g., HIPAA on Shared tier)

**If issues found:**
- Email customer with clarifying questions
- Wait for response before provisioning

**If all valid:**
- Proceed to Stage 3: Provisioning Preparation

---

## Stage 3: Provisioning Preparation (0-2 hours)

### Generate Customer ID

**Format:** `{company-slug}-{timestamp}`

**Example:**

```bash
# Generate customer ID
COMPANY_SLUG="acme-corp"
TIMESTAMP=$(date +%Y%m%d)
CUSTOMER_ID="${COMPANY_SLUG}-${TIMESTAMP}"

echo "Customer ID: $CUSTOMER_ID"
# Output: acme-corp-20251020
```

### Create Customer Directory Structure

**Location:** `/home/admincostplus/projects/costplusdb/001-security/customers/active/`

**Commands:**

```bash
# Set variables from onboarding form
CUSTOMER_ID="acme-corp-20251020"
CUSTOMER_DIR="/home/admincostplus/projects/costplusdb/001-security/customers/active/$CUSTOMER_ID"

# Create directory structure
mkdir -p $CUSTOMER_DIR/{invoices,support-tickets,backup-logs}

# Set permissions
chmod 750 $CUSTOMER_DIR
chmod 750 $CUSTOMER_DIR/{invoices,support-tickets,backup-logs}

# Move onboarding form from prospects to active customer
mv /home/admincostplus/projects/costplusdb/001-security/customers/prospects/john-acme-com/onboarding-form.md \
   $CUSTOMER_DIR/onboarding-form.md

# Set file permissions
chmod 640 $CUSTOMER_DIR/onboarding-form.md
```

### Create customer-info.json

**Purpose:** Central metadata file for customer

**Template:**

```bash
cat > $CUSTOMER_DIR/customer-info.json <<'EOF'
{
  "customer_id": "acme-corp-20251020",
  "status": "provisioning",
  "company": {
    "name": "Acme Corporation",
    "contact_name": "John Doe",
    "email": "john@acme.com",
    "website": "https://acme.com",
    "phone": "+1-555-0123"
  },
  "database": {
    "db_name": "acme_production",
    "db_user": "acme_user",
    "db_password": "",
    "connection_string": ""
  },
  "plan": {
    "tier": "Shared",
    "price_monthly": 49,
    "features": ["Daily backups", "Email support", "SSL/TLS"]
  },
  "billing": {
    "start_date": "2025-10-20",
    "billing_cycle": "monthly",
    "payment_method": "Stripe",
    "next_invoice_date": "2025-11-20"
  },
  "communication": {
    "preferred_channel": "email",
    "slack_webhook_url": null,
    "timezone": "America/Chicago"
  },
  "metadata": {
    "created_at": "2025-10-20T14:30:00Z",
    "created_by": "jeremy@intentsolutions.io",
    "last_updated": "2025-10-20T14:30:00Z",
    "tags": ["startup", "saas", "production"]
  }
}
EOF

# Set strict permissions (contains sensitive info after provisioning)
chmod 600 $CUSTOMER_DIR/customer-info.json
```

### Verify VPS Capacity

**Before provisioning, check:**

```bash
# Check disk space
df -h /var/lib/postgresql
# Must have at least customer's storage limit + 20% buffer

# Check current customer count on VPS (if Shared tier)
ls -1 /home/admincostplus/projects/costplusdb/001-security/customers/active/ | wc -l
# Shared tier: Max 10 customers per VPS

# Check PostgreSQL connection limits
sudo -u postgres psql -c "SHOW max_connections;"
# Ensure capacity for new customer
```

**If capacity issues:**
- Provision new VPS (follow SOP-001, SOP-002)
- Update customer routing
- Document in notes

---

## Stage 4: Database Provisioning (15-30 minutes)

**Reference:** `034-DR-SOPS-customer-database-provisioning.md` (detailed SOP)

**High-Level Steps:**

1. Generate secure database credentials
2. Create PostgreSQL database
3. Create PostgreSQL user with restricted permissions
4. Configure SSL/TLS requirements
5. Set up dedicated backup schedule entry
6. Configure monitoring alerts
7. Test database connectivity
8. Update customer-info.json with credentials

**Commands Summary:**

```bash
# See 034-DR-SOPS-customer-database-provisioning.md for exact commands

# 1. Generate password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)

# 2. Create database and user
sudo -u postgres psql <<EOF
CREATE DATABASE acme_production;
CREATE USER acme_user WITH ENCRYPTED PASSWORD '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON DATABASE acme_production TO acme_user;
ALTER DATABASE acme_production OWNER TO acme_user;
EOF

# 3. Configure pg_hba.conf for SSL
# 4. Test connection
# 5. Update customer-info.json
# 6. Create database-credentials.txt
```

**Provisioning Time:** 15-30 minutes

**Checkpoints:**

- [ ] Database created successfully
- [ ] User created with secure password
- [ ] SSL/TLS requirement enforced
- [ ] Connection test successful
- [ ] Credentials saved securely
- [ ] Backup schedule configured
- [ ] Monitoring alerts enabled

---

## Stage 5: Credential Delivery (15 minutes)

### Generate Setup Confirmation Email

**Reference:** `022-DR-FORM-setup-confirmation.md`

**Process:**

```bash
# Copy template
cp /home/admincostplus/projects/costplusdb/000-docs/022-DR-FORM-setup-confirmation.md \
   $CUSTOMER_DIR/setup-confirmation.md

# Replace placeholders with actual values
# {COMPANY_NAME} → Acme Corporation
# {DATABASE_NAME} → acme_production
# {DATABASE_USER} → acme_user
# {DATABASE_PASSWORD} → [generated password]
# {PLAN_TIER} → Shared
# {PLAN_PRICE} → 49
# etc.

# Use sed or manual editing
sed -i "s/{COMPANY_NAME}/Acme Corporation/g" $CUSTOMER_DIR/setup-confirmation.md
sed -i "s/{DATABASE_NAME}/acme_production/g" $CUSTOMER_DIR/setup-confirmation.md
# ... (all replacements)

chmod 640 $CUSTOMER_DIR/setup-confirmation.md
```

### Send Credentials Email

**Email Template:**

```
Subject: ✅ Your CostPlusDB Database is Ready!

Hi {CONTACT_NAME},

Great news! Your PostgreSQL database has been provisioned and is ready to use.

See attached setup confirmation for:
- Database credentials (store securely!)
- Connection string (copy-paste ready)
- Test instructions
- Backup details
- Support information

**Quick Start:**

Database: {DATABASE_NAME}
User: {DATABASE_USER}
Host: costplusdb.dev
Port: 5432
SSL: Required

Connection String:
postgresql://{DATABASE_USER}:{DATABASE_PASSWORD}@costplusdb.dev:5432/{DATABASE_NAME}?sslmode=require

**Test Your Connection:**
psql "postgresql://{DATABASE_USER}:{DATABASE_PASSWORD}@costplusdb.dev:5432/{DATABASE_NAME}?sslmode=require"

**Next Steps:**
1. Test connection (5 minutes)
2. Import data if migrating (optional)
3. Update your app config

Questions? Just reply to this email. I'm here to help!

Best,
Jeremy Longshore
Founder, CostPlusDB
jeremy@intentsolutions.io

---
Attached: Database Setup Confirmation (contains credentials)
```

**Attachments:**
- `setup-confirmation.md` (with credentials filled in)

### Send First Invoice

**Reference:** Monthly invoice template (create as needed)

**Email Template:**

```
Subject: CostPlusDB Invoice - {CUSTOMER_ID} - {MONTH} {YEAR}

Hi {CONTACT_NAME},

Attached is your first invoice for CostPlusDB.

**Invoice Summary:**
- {PLAN_TIER} Plan: ${PLAN_PRICE}
- Total Due: ${TOTAL_AMOUNT}
- Due Date: {PAYMENT_DUE_DATE}

Payment method on file: {PAYMENT_METHOD}

Questions about your invoice? Just reply.

Thank you for your business!

Best,
Jeremy Longshore
```

### Update Customer Status

```bash
# Update customer-info.json status
# Change from "provisioning" to "active"

# Add provisioning completion date
# metadata.provisioned_at: "2025-10-20T15:45:00Z"
# metadata.credentials_sent_at: "2025-10-20T15:50:00Z"
```

---

## Stage 6: Post-Launch Support (24-48 hours)

### Monitor First Connections

**Checkpoints at:**
- 1 hour after sending credentials
- 4 hours after sending credentials
- 24 hours after sending credentials

**Commands:**

```bash
# Check PostgreSQL logs for connection attempts
sudo grep "acme_user" /var/log/postgresql/postgresql-16-main.log | tail -20

# Look for:
# - ✅ "connection authorized" (successful connection)
# - ❌ "authentication failed" (wrong password)
# - ❌ "no pg_hba.conf entry" (SSL issue)

# Check connection count
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE usename = 'acme_user';"
```

### Proactive Customer Check-In

**Email Template (24 hours after credential delivery):**

```
Subject: Quick Check-In - How's Your Database Setup?

Hi {CONTACT_NAME},

Just wanted to check in and see how your database setup is going!

✅ Have you been able to connect successfully?
✅ Any issues or questions?
✅ Need help with data migration?

I'm seeing [X connections | no connections yet] from your database user in the logs. Let me know if you need any assistance getting connected.

Always here to help!

Best,
Jeremy
```

### Common First-Day Issues

**Issue 1: Cannot connect**

**Checklist:**
- [ ] Customer using correct hostname (`costplusdb.dev`)
- [ ] SSL mode is set to `require`
- [ ] No typos in password (suggest copy-paste)
- [ ] Firewall allows outbound port 5432
- [ ] PostgreSQL client version supports SSL/TLS

**Issue 2: Password authentication failed**

**Resolution:**
- Regenerate password
- Send new connection string
- Test internally first

**Issue 3: SSL connection error**

**Resolution:**
- Verify `sslmode=require` in connection string
- Check pg_hba.conf has `hostssl` entry
- Update PostgreSQL client libraries

### Verify First Backup

**48 hours after provisioning:**

```bash
# Check backup logs for customer database
CUSTOMER_DB="acme_production"
sudo -u postgres pgbackrest info --stanza=main | grep -A 5 "$CUSTOMER_DB"

# Verify backup succeeded
# Look for recent backup timestamp (within 24 hours)

# If backup failed:
# - Review pgBackRest logs
# - Manually trigger backup test
# - Notify customer if issue persists
```

### Mark Customer as Fully Active

**After successful verification:**

```bash
# Add note to customer-info.json
# metadata.first_connection_at: "2025-10-20T16:30:00Z"
# metadata.first_backup_verified_at: "2025-10-21T02:15:00Z"
# status: "active"

# Move to active monitoring schedule (daily health checks)
```

---

## Onboarding Timelines

### Best Case Scenario

| Stage | Duration | Elapsed Time |
|-------|----------|--------------|
| Initial Contact Response | 1 hour | 1 hour |
| Customer Completes Form | 2 hours | 3 hours |
| Provisioning Preparation | 30 minutes | 3.5 hours |
| Database Provisioning | 20 minutes | 3 hours 50 min |
| Credential Delivery | 10 minutes | 4 hours |
| **Total: Form to Live DB** | **1 hour** | **4 hours total** |

### Typical Scenario

| Stage | Duration | Elapsed Time |
|-------|----------|--------------|
| Initial Contact Response | 4 hours | 4 hours |
| Customer Completes Form | 24 hours | 28 hours |
| Provisioning Preparation | 1 hour | 29 hours |
| Database Provisioning | 30 minutes | 29.5 hours |
| Credential Delivery | 15 minutes | 29 hours 45 min |
| **Total: Form to Live DB** | **1 hour 45 min** | **~30 hours total** |

### Worst Case Scenario (Clarifications Needed)

| Stage | Duration | Elapsed Time |
|-------|----------|--------------|
| Initial Contact Response | 4 hours | 4 hours |
| Customer Completes Form | 48 hours | 52 hours |
| Clarification Round | 12 hours | 64 hours |
| Provisioning Preparation | 2 hours | 66 hours |
| Database Provisioning | 45 minutes | 66 hours 45 min |
| Credential Delivery | 15 minutes | 67 hours |
| **Total: Form to Live DB** | **3 hours** | **~67 hours total** |

---

## Email Templates Quick Reference

### 1. Initial Response (after consultation form)

**File:** `templates/email-initial-response.md`
**Trigger:** Consultation form submission
**Timeline:** Within 4 business hours

### 2. Onboarding Form Send

**File:** `templates/email-onboarding-form-send.md`
**Trigger:** After qualifying prospect
**Attachment:** `021-DR-FORM-customer-onboarding-intake.md`

### 3. Setup Confirmation

**File:** `022-DR-FORM-setup-confirmation.md`
**Trigger:** After database provisioning complete
**Contains:** Credentials, connection string, first invoice

### 4. 24-Hour Check-In

**File:** `templates/email-24hr-checkin.md`
**Trigger:** 24 hours after sending credentials
**Purpose:** Proactive support, ensure successful connection

### 5. Week 1 Welcome

**File:** `templates/email-week1-welcome.md`
**Trigger:** 7 days after provisioning
**Purpose:** Resources, best practices, feedback request

---

## Troubleshooting & Edge Cases

### Customer Wants to Change Plan Before Provisioning

**Resolution:**
1. Update onboarding form with new tier
2. Update customer-info.json with new pricing
3. Provision with new specifications
4. No need to re-send onboarding form

### Customer Provides Invalid Database Name

**Invalid characters:** Uppercase, spaces, special characters (except underscore)

**Resolution:**
1. Email customer with suggested alternatives
2. Wait for confirmation
3. Proceed with approved name

### Customer Requests Immediate Setup (< 4 hours)

**Assessment:**
- If during business hours and bandwidth available: Accommodate
- If outside business hours: Politely explain 24-hour standard SLA
- Enterprise tier: Prioritize (1-hour response SLA)

### Payment Method Not Set Up

**Resolution:**
1. Provision database as normal
2. Send invoice with payment instructions
3. Grace period: 7 days to set up payment
4. If no payment after 7 days: Suspend database (email warning at day 5)

### Customer Goes Silent After Form Submission

**Timeline:**
- Day 3: Follow-up email ("Just checking in, ready to provision!")
- Day 7: Second follow-up ("Still interested? Let me know!")
- Day 14: Final follow-up ("Happy to help when you're ready")
- Day 30: Move to prospects/inactive

---

## Checklists

### Daily Onboarding Checklist (Jeremy's Morning Routine)

**Time:** 9:00 AM daily

```bash
# Check for new consultation forms (Netlify notifications)
# Check email for completed onboarding forms
# Review any customers in "provisioning" status
# Follow up on customers who haven't connected yet (24-hour mark)
```

### Per-Customer Provisioning Checklist

- [ ] Onboarding form received and validated
- [ ] Customer ID generated
- [ ] Customer directory created
- [ ] customer-info.json created
- [ ] Database provisioned (see SOP-103)
- [ ] Credentials generated and saved
- [ ] Setup confirmation sent
- [ ] First invoice sent
- [ ] Customer status set to "active"
- [ ] 24-hour check-in scheduled
- [ ] Backup verification scheduled (48 hours)

---

## Metrics to Track

**Onboarding Performance:**
- Average time from form submission to database live
- Percentage of customers connecting within 1 hour of receiving credentials
- Percentage requiring clarification/support before going live
- Common issues encountered (track for improvements)

**Customer Success:**
- First connection success rate
- Time to first connection
- Number of support tickets in first 7 days
- Customer satisfaction (feedback in Week 1 email)

---

## Related Documentation

- **021-DR-FORM-customer-onboarding-intake.md** - Customer intake form
- **022-DR-FORM-setup-confirmation.md** - Setup confirmation template
- **034-DR-SOPS-customer-database-provisioning.md** - Database provisioning SOP
- **020-DR-ARCH-customer-database-structure.md** - Customer directory structure
- **035-DR-SOPS-customer-offboarding-procedure.md** - Offboarding procedures
- **038-PM-TASK-customer-onboarding-checklist.md** - Task checklist format

---

## Future Improvements

**Month 3:**
- Automate customer directory creation (script)
- Automate setup confirmation generation (script)
- Create onboarding dashboard (track status)

**Month 6:**
- Self-service onboarding portal
- Automatic database provisioning (after payment confirmed)
- Slack bot for onboarding status notifications

**Month 12:**
- Multi-database support per customer
- Automated data migration tools
- Onboarding analytics dashboard

---

**Document Owner:** Jeremy Longshore (jeremy@intentsolutions.io)
**Last Updated:** 2025-10-20
**Review Frequency:** Monthly
