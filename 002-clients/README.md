# CostPlusDB Customer Management System

This directory contains the complete customer lifecycle management infrastructure for CostPlusDB, including intake forms, customer database, automation scripts, and onboarding workflows.

## Purpose

The `002-clients/` directory manages the entire customer journey:

1. **Lead Capture** - Web forms collect customer information
2. **Database Storage** - SQLite/Turso database stores customer records
3. **Provisioning** - Automated scripts provision PostgreSQL databases
4. **Communication** - Email templates for customer touchpoints
5. **Record Keeping** - Organized customer data by status

## Directory Structure

```
002-clients/
├── README.md                          # This file
├── .gitignore                         # Protects sensitive customer data
│
├── database/                          # Customer database (SQLite/Turso)
│   ├── schema.sql                     # Database schema definition
│   ├── migrations/                    # Schema version control
│   ├── seeds/                         # Test data for development
│   └── costplusdb.db                  # Local SQLite database (gitignored)
│
├── forms/                             # Customer intake forms
│   ├── customer-intake-form.html      # Web-based intake form
│   ├── customer-intake-form.md        # Form documentation
│   └── form-submissions/              # Raw form data (gitignored)
│
├── scripts/                           # Automation scripts
│   ├── process-intake-form.js         # Process form → database
│   ├── provision-database.sh          # Provision customer database
│   ├── generate-credentials.sh        # Generate secure credentials
│   ├── send-setup-email.sh            # Send setup confirmation
│   └── sync-to-turso.sh               # Sync local → Turso cloud
│
├── templates/                         # Email and document templates
│   ├── consultation-confirmation.md   # After form submission
│   ├── payment-request.md             # Stripe payment link
│   ├── provisioning-notification.md   # Database being provisioned
│   ├── setup-confirmation.md          # Credentials delivered
│   └── welcome-email.md               # Welcome message
│
├── customers/                         # Customer data files (gitignored)
│   ├── active/                        # Active paying customers
│   ├── prospects/                     # Leads not yet customers
│   ├── suspended/                     # Suspended accounts
│   └── archived/                      # Past customers
│
├── logs/                              # Processing logs (gitignored)
│
└── docs/                              # Documentation
    ├── onboarding-workflow.md         # Complete workflow guide
    ├── database-provisioning.md       # Provisioning procedures
    ├── turso-setup.md                 # Turso configuration
    └── automation-guide.md            # Automation documentation
```

## Customer Data Flow

### 1. Lead Capture (Prospect)
```
Customer fills out form → Data stored in forms/form-submissions/
                       → Email confirmation sent
                       → Record created in database (status: prospect)
                       → Customer folder: customers/prospects/
```

### 2. Payment & Activation
```
Payment received → Status updated to: active
                 → Customer folder moved to: customers/active/
                 → Provisioning workflow triggered
```

### 3. Database Provisioning
```
provision-database.sh → Creates PostgreSQL database on VPS
                      → Configures backups (pgBackRest + Wasabi)
                      → Generates credentials
                      → Sends setup confirmation email
                      → Updates database record (status: provisioned)
```

### 4. Ongoing Management
```
Active customers → Regular backups, monitoring, billing
Suspended accounts → customers/suspended/ (non-payment, violations)
Past customers → customers/archived/ (cancelled, migrated away)
```

## Security Considerations

### What's Protected (Gitignored)

**CRITICAL**: The following data is **NEVER** committed to git:

- `customers/*/` - All customer data folders (except .gitkeep)
- `database/*.db` - Local SQLite database files
- `forms/form-submissions/` - Raw form submission data
- `logs/` - Processing and automation logs
- `*.key`, `*.pem` - Any credential files
- `*-credentials.json` - Generated credential files

### What's Committed to Git

**Safe to commit** (no sensitive data):

- `README.md` - This overview
- `.gitignore` - Protection rules
- `database/schema.sql` - Database schema (no data)
- `database/migrations/` - Schema migrations
- `database/seeds/` - Sample test data only
- `forms/*.html` - Form templates
- `scripts/` - Automation scripts (no credentials)
- `templates/` - Email templates
- `docs/` - Documentation
- `.gitkeep` - Directory placeholders

## Quick Start Guide

### Initial Setup

1. **Install dependencies:**
   ```bash
   # SQLite (for local database)
   sudo apt-get install sqlite3

   # Turso CLI (for cloud sync)
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

2. **Initialize database:**
   ```bash
   cd database
   sqlite3 costplusdb.db < schema.sql
   ```

3. **Configure Turso (optional):**
   ```bash
   # See docs/turso-setup.md
   turso auth login
   turso db create costplusdb
   ```

### Processing a New Customer

1. **Customer submits form:**
   - Form data saved to `forms/form-submissions/`
   - Confirmation email sent automatically

2. **Process intake form:**
   ```bash
   cd scripts
   node process-intake-form.js ../forms/form-submissions/latest.json
   ```

3. **After payment received:**
   ```bash
   ./provision-database.sh <customer-id> <tier>
   ```

4. **Send credentials:**
   ```bash
   ./send-setup-email.sh <customer-id>
   ```

### Database Operations

**View all customers:**
```bash
sqlite3 database/costplusdb.db "SELECT * FROM customers;"
```

**Add test data:**
```bash
sqlite3 database/costplusdb.db < database/seeds/sample_customers.sql
```

**Sync to Turso cloud:**
```bash
scripts/sync-to-turso.sh
```

## Documentation

Detailed guides are in the `docs/` subdirectory:

- **onboarding-workflow.md** - Complete customer onboarding process
- **database-provisioning.md** - How to provision PostgreSQL databases
- **turso-setup.md** - Configure Turso cloud database
- **automation-guide.md** - How automation scripts work together

## Integration Points

### External Services

- **Netlify Forms** - Captures form submissions from website
- **Turso** - Cloud-hosted SQLite database (optional)
- **Resend** - Email delivery service
- **Stripe** - Payment processing
- **VPS (Contabo)** - PostgreSQL database hosting

### Internal References

- **000-docs/005-DR-SOPS-postgresql-operations.md** - PostgreSQL setup procedures
- **001-security/** - Security monitoring and alerting infrastructure
- **website/calculator.html** - Pricing calculator (references tiers)

## Workflow States

### Customer Status Values

- `prospect` - Initial form submission, not yet paid
- `active` - Paid, database provisioned, active service
- `suspended` - Temporarily suspended (payment issues, violations)
- `archived` - Service ended (cancelled, migrated, etc.)

### Database Status Values

- `pending` - Payment received, waiting for provisioning
- `provisioning` - Database being created
- `active` - Database live and operational
- `suspended` - Database access disabled
- `archived` - Database backed up and removed

## Maintenance

### Regular Tasks

- **Daily**: Check form submissions, process new customers
- **Weekly**: Review customer database, clean up logs
- **Monthly**: Archive old form submissions, backup customer data

### Monitoring

- Check `logs/` for processing errors
- Monitor database size: `du -h database/costplusdb.db`
- Review suspended accounts regularly

## Support

For questions or issues:

1. Check `docs/` for detailed documentation
2. Review `000-docs/` for business procedures
3. Consult `001-security/` for security-related issues
4. See main `README.md` for project overview

---

**Last Updated**: 2025-10-20
**Maintained By**: CostPlusDB Operations Team
