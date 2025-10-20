# Customer Database & Filing Structure

**Created:** 2025-10-19
**Purpose:** Organizational system for customer data, credentials, and documentation
**Status:** Implementation Ready

---

## Directory Structure

```
001-security/customers/
├── README.md                           # This file
├── active/                             # Currently paying customers
│   ├── {customer-id}/                  # One directory per customer
│   │   ├── customer-info.json          # Customer metadata
│   │   ├── database-credentials.txt    # DB connection details (0600)
│   │   ├── onboarding-form.md          # Completed intake form
│   │   ├── setup-confirmation.md       # Setup completion details sent to customer
│   │   ├── invoices/                   # Monthly invoices
│   │   ├── support-tickets/            # Support correspondence
│   │   ├── backup-logs/                # Customer-specific backup logs
│   │   └── notes.md                    # Internal notes (problems, special requests)
│   └── ...
├── inactive/                           # Churned or paused customers
│   └── {customer-id}/                  # Same structure as active/
├── prospects/                          # Leads who haven't signed up yet
│   └── {prospect-email}/
│       ├── initial-inquiry.md
│       └── notes.md
└── templates/                          # Form templates
    ├── onboarding-form-template.md
    ├── setup-confirmation-template.md
    └── monthly-invoice-template.md
```

---

## Customer ID Format

**Format:** `{company-slug}-{timestamp}`

**Examples:**
- `acme-corp-20251019`
- `startup-io-20251020`
- `johns-app-20251021`

**Rules:**
- Lowercase only
- Hyphens for spaces
- Add timestamp to prevent duplicates
- Keep it short (company name or app name)

---

## customer-info.json Schema

```json
{
  "customer_id": "acme-corp-20251019",
  "status": "active",
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
    "db_password": "GENERATED_PASSWORD_HERE",
    "connection_string": "postgresql://acme_user:PASSWORD@costplusdb.dev:5432/acme_production?sslmode=require"
  },
  "plan": {
    "tier": "Shared",
    "price_monthly": 49,
    "features": ["5GB storage", "Daily backups", "Email support"]
  },
  "billing": {
    "start_date": "2025-10-19",
    "billing_cycle": "monthly",
    "payment_method": "Stripe",
    "next_invoice_date": "2025-11-19"
  },
  "communication": {
    "preferred_channel": "email",
    "slack_webhook_url": null,
    "timezone": "America/Chicago"
  },
  "metadata": {
    "created_at": "2025-10-19T14:30:00Z",
    "created_by": "jeremy@intentsolutions.io",
    "last_updated": "2025-10-19T14:30:00Z",
    "tags": ["startup", "saas", "production"]
  }
}
```

---

## Database Credentials File Format

**File:** `database-credentials.txt`
**Permissions:** `0600` (owner read/write only)

```
=================================================================
COSTPLUSDB - DATABASE CREDENTIALS
Customer: Acme Corporation (acme-corp-20251019)
Generated: 2025-10-19
=================================================================

DATABASE INFORMATION
-------------------
Database Name:     acme_production
Database User:     acme_user
Database Password: [GENERATED_32_CHAR_PASSWORD]

CONNECTION DETAILS
-----------------
Host:              costplusdb.dev
Port:              5432
SSL Mode:          require (mandatory)

CONNECTION STRING
----------------
postgresql://acme_user:[PASSWORD]@costplusdb.dev:5432/acme_production?sslmode=require

BACKUP INFORMATION
-----------------
Backup Schedule:   Daily at 1:00 AM CT
Retention:         30 days
Storage:           Local + Wasabi S3 (encrypted)
PITR Available:    7 days

SUPPORT CONTACT
--------------
Email:             jeremy@intentsolutions.io
Response Time:     30 minutes (business hours)
Emergency:         Same email with subject "URGENT:"

SECURITY NOTES
-------------
- SSL/TLS is REQUIRED for all connections
- Connection attempts are logged
- Failed login threshold: 5 attempts in 5 minutes = automatic IP ban
- Database user has restricted permissions (cannot drop database)

=================================================================
CONFIDENTIAL - Store securely, do not commit to version control
=================================================================
```

---

## File Permissions

**Critical files (contain passwords/secrets):**
- `database-credentials.txt` - `0600`
- `customer-info.json` - `0600`

**Regular files:**
- `onboarding-form.md` - `0640`
- `setup-confirmation.md` - `0640`
- `notes.md` - `0640`
- `invoices/*.md` - `0640`

**Directories:**
- `001-security/customers/` - `0750`
- `001-security/customers/active/` - `0750`
- `001-security/customers/active/{customer-id}/` - `0750`

---

## Backup Strategy for Customer Data

**What gets backed up:**
- All files in `001-security/customers/`
- Encrypted before storage
- Included in daily security config backups

**Backup schedule:**
- Daily at 2:05 AM (via `backup-security-configs.sh`)
- 30-day retention
- Stored in: `/home/admincostplus/projects/costplusdb/001-security/backups/daily/`

**Recovery:**
- Customer data can be restored from any of the past 30 days
- Encryption key required (stored in `001-security/keys/backup-encryption/master.key`)

---

## Customer Lifecycle Workflow

### 1. Prospect Inquiry
```bash
# Create prospect directory
mkdir -p 001-security/customers/prospects/john-acme-com
echo "Date: 2025-10-19
From: john@acme.com
Message: Interested in Shared tier for production SaaS app
" > 001-security/customers/prospects/john-acme-com/initial-inquiry.md
```

### 2. Customer Onboarding (They fill out form)
- Send `templates/onboarding-form-template.md`
- They return completed form
- Save as `prospects/{email}/onboarding-form.md`

### 3. Provisioning (We set up their database)
```bash
# Move to active customers
CUSTOMER_ID="acme-corp-20251019"
mkdir -p 001-security/customers/active/$CUSTOMER_ID/{invoices,support-tickets,backup-logs}

# Create customer-info.json
# Generate database credentials
# Provision PostgreSQL database and user
# Create SSL-enabled connection string
```

### 4. Setup Confirmation (We send back)
- Fill out `templates/setup-confirmation-template.md`
- Send to customer with credentials
- Save copy in `active/{customer-id}/setup-confirmation.md`

### 5. Active Customer Management
- Monthly invoices in `invoices/`
- Support tickets in `support-tickets/`
- Internal notes in `notes.md`

### 6. Churn/Pause
```bash
# Move to inactive
mv 001-security/customers/active/$CUSTOMER_ID 001-security/customers/inactive/

# Update customer-info.json status to "inactive"
# Add cancellation_date to metadata
# Schedule database deletion (30-day grace period)
```

---

## Security Considerations

1. **Never commit to git:**
   - All files in `001-security/customers/` are git-ignored
   - Contains customer PII and credentials

2. **Access logging:**
   - All access to customer directories should be logged
   - Use `audit/` logs to track who accessed what

3. **Encryption:**
   - Customer data directories backed up encrypted
   - Database credentials stored in 0600 files

4. **Retention:**
   - Active customers: Indefinite retention
   - Inactive customers: 1 year retention, then archive
   - Prospects: 90 days, then delete if no conversion

---

## Search & Organization

**Find customer by email:**
```bash
grep -r "email.*john@acme.com" 001-security/customers/
```

**List all active customers:**
```bash
ls -1 001-security/customers/active/
```

**Find customer by database name:**
```bash
grep -r "db_name.*acme" 001-security/customers/active/*/customer-info.json
```

**Total active customers:**
```bash
ls -1 001-security/customers/active/ | wc -l
```

---

## Migration Path

**Current state:** No customers yet (launch phase)

**First customer setup:**
1. Create directory structure: `001-security/customers/`
2. Copy form templates from `000-docs/` to `templates/`
3. Set permissions correctly (0750 directories, 0600 sensitive files)
4. Add to `.gitignore`: `001-security/customers/`
5. Test workflow with first customer

**Scaling:**
- As customer count grows, consider adding subdirectories by month/year
- Example: `active/2025-10/`, `active/2025-11/`
- Or alphabetical: `active/a-e/`, `active/f-j/`

---

**Next Steps:**
1. Create form templates (onboarding, setup confirmation)
2. Create customer directory structure
3. Add `.gitignore` entry
4. Document provisioning script workflow
