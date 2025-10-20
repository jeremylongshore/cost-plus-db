# CostPlusDB Customer Database

**Location:** `/home/admincostplus/projects/costplusdb/002-clients/database/`
**Database Type:** SQLite 3 (Turso Cloud Compatible)
**Schema Version:** 1.0.0
**Documentation:** `/home/admincostplus/projects/costplusdb/000-docs/033-DR-ARCH-customer-database-schema.md`

---

## Directory Structure

```
database/
├── README.md           # This file
├── schema.sql          # Complete database schema (9 tables, 5 views, 7 triggers)
├── migrations/         # Schema migration files
└── seeds/              # Sample data for testing
```

---

## Quick Start

### 1. Create Database

```bash
# Using SQLite locally
sqlite3 costplusdb.db < schema.sql

# Using Turso CLI
turso db create costplusdb
turso db shell costplusdb < schema.sql
```

### 2. Verify Schema

```bash
# List all tables
sqlite3 costplusdb.db ".tables"

# Expected output:
# activity_log         invoices             support_messages
# billing             notes                support_tickets
# customer_workflow   schema_migrations    customers
# databases

# List all views
sqlite3 costplusdb.db ".schema --indent" | grep "CREATE VIEW"

# Expected output (5 views):
# v_active_customers
# v_customers_by_revenue
# v_open_support_tickets
# v_onboarding_pipeline
# v_mrr_summary
```

### 3. Test with Sample Data

```bash
# Insert test customer
sqlite3 costplusdb.db <<EOF
INSERT INTO customers (
    customer_id, company_name, contact_name, contact_email,
    tier, monthly_base_rate, status
) VALUES (
    'test-corp-20251020',
    'Test Corporation',
    'Jane Doe',
    'jane@test.com',
    'Dedicated',
    89.00,
    'prospect'
);
EOF

# Query active customers view
sqlite3 costplusdb.db "SELECT * FROM v_active_customers;"
```

---

## Database Tables

### Core Tables (9)

1. **customers** - Customer information and company details
2. **databases** - Provisioned PostgreSQL databases
3. **billing** - Billing cycles and payment status
4. **invoices** - Invoice history with line items
5. **support_tickets** - Customer support requests
6. **support_messages** - Conversation logs for tickets
7. **customer_workflow** - Onboarding pipeline tracking
8. **notes** - Internal customer notes
9. **activity_log** - Complete audit trail

### Utility Tables (1)

10. **schema_migrations** - Schema version tracking

---

## Database Views (5)

Pre-built queries for common operations:

1. **v_active_customers** - Active customers with billing and database info
2. **v_customers_by_revenue** - Customers sorted by monthly revenue
3. **v_open_support_tickets** - Open tickets with SLA tracking
4. **v_onboarding_pipeline** - Customers in onboarding process
5. **v_mrr_summary** - Monthly recurring revenue metrics

**Usage:**

```sql
-- Dashboard: Active customers
SELECT * FROM v_active_customers;

-- Revenue analysis: Top customers
SELECT * FROM v_customers_by_revenue LIMIT 10;

-- Support queue: Open tickets
SELECT * FROM v_open_support_tickets WHERE priority = 'high';

-- Sales pipeline: Onboarding status
SELECT * FROM v_onboarding_pipeline WHERE blocked = 0;

-- Financial report: MRR breakdown
SELECT * FROM v_mrr_summary;
```

---

## Triggers (7)

Automatic timestamp updates and audit logging:

1. **update_customers_timestamp** - Auto-update `customers.updated_at`
2. **update_databases_timestamp** - Auto-update `databases.updated_at`
3. **update_billing_timestamp** - Auto-update `billing.updated_at`
4. **update_invoices_timestamp** - Auto-update `invoices.updated_at`
5. **update_support_tickets_timestamp** - Auto-update `support_tickets.updated_at`
6. **update_workflow_timestamp** - Auto-update `customer_workflow.updated_at`
7. **update_notes_timestamp** - Auto-update `notes.updated_at`

**Benefits:**
- Never forget to update timestamps
- Ensures accurate change tracking
- Automatic audit trail

---

## Common Operations

### Add New Customer (Prospect)

```sql
INSERT INTO customers (
    customer_id, company_name, contact_name, contact_email, contact_phone,
    industry, company_size, tier, monthly_base_rate, status
) VALUES (
    'acme-corp-20251020',
    'Acme Corporation',
    'John Doe',
    'john@acme.com',
    '+1-555-0123',
    'SaaS',
    '11-50',
    'Dedicated',
    89.00,
    'prospect'
);

-- Create workflow tracking
INSERT INTO customer_workflow (customer_id, current_stage, form_submitted, form_submitted_at)
SELECT id, 'form_submitted', 1, CURRENT_TIMESTAMP
FROM customers WHERE customer_id = 'acme-corp-20251020';
```

### Provision Database

```sql
INSERT INTO databases (
    customer_id, database_name, database_user, database_password_hash,
    vps_hostname, vps_ip_address, allocated_ram_gb, allocated_storage_gb,
    max_connections, provision_status
)
SELECT
    id, 'acme_production', 'acme_user', 'HASH_HERE',
    'costplusdb-prod-01.example.com', '192.168.1.10', 8, 200,
    100, 'active'
FROM customers WHERE customer_id = 'acme-corp-20251020';
```

### Activate Customer

```sql
-- Update customer status
UPDATE customers
SET status = 'active', activated_at = CURRENT_TIMESTAMP
WHERE customer_id = 'acme-corp-20251020';

-- Create billing record
INSERT INTO billing (
    customer_id, billing_cycle, billing_day, next_billing_date,
    payment_method, base_tier_price, total_monthly_rate, payment_status
)
SELECT
    id, 'monthly', 20, DATE('now', '+1 month'),
    'stripe', 89.00, 89.00, 'current'
FROM customers WHERE customer_id = 'acme-corp-20251020';

-- Update workflow
UPDATE customer_workflow
SET go_live = 1, go_live_at = CURRENT_TIMESTAMP, current_stage = 'active'
WHERE customer_id = (SELECT id FROM customers WHERE customer_id = 'acme-corp-20251020');
```

### Create Support Ticket

```sql
INSERT INTO support_tickets (
    customer_id, ticket_number, subject, description,
    ticket_type, priority, status, sla_response_hours
)
SELECT
    id, 'TICKET-20251020-001',
    'Help with connection pooling',
    'We are experiencing connection pool exhaustion during peak hours.',
    'technical', 'high', 'open', 4
FROM customers WHERE customer_id = 'acme-corp-20251020';
```

### Generate Invoice

```sql
INSERT INTO invoices (
    customer_id, invoice_number, invoice_date, due_date,
    base_amount, total_amount, payment_status,
    line_items
)
SELECT
    c.id,
    'INV-202510-001',
    DATE('now'),
    DATE('now', '+30 days'),
    b.base_tier_price,
    b.total_monthly_rate,
    'pending',
    json_array(
        json_object(
            'description', 'Dedicated Tier',
            'our_cost', 12.00,
            'your_price', 89.00,
            'quantity', 1
        )
    )
FROM customers c
JOIN billing b ON c.id = b.customer_id
WHERE c.customer_id = 'acme-corp-20251020';
```

---

## Reporting Queries

### Revenue Report

```sql
-- Total MRR by tier
SELECT
    tier,
    COUNT(*) as customer_count,
    SUM(total_monthly_rate) as total_mrr,
    AVG(total_monthly_rate) as avg_revenue
FROM customers c
JOIN billing b ON c.id = b.customer_id
WHERE c.status = 'active' AND c.is_active = 1
GROUP BY tier
ORDER BY total_mrr DESC;
```

### Customer Lifetime Value

```sql
-- Top 10 customers by lifetime value
SELECT
    company_name,
    tier,
    total_monthly_rate,
    ROUND((JULIANDAY('now') - JULIANDAY(activated_at)) / 30.0, 1) as months_active,
    ROUND((JULIANDAY('now') - JULIANDAY(activated_at)) / 30.0 * total_monthly_rate, 2) as lifetime_value
FROM customers c
JOIN billing b ON c.id = b.customer_id
WHERE c.status = 'active' AND c.is_active = 1
ORDER BY lifetime_value DESC
LIMIT 10;
```

### Support Performance

```sql
-- SLA compliance by ticket type
SELECT
    ticket_type,
    COUNT(*) as total_tickets,
    AVG(response_time_minutes) as avg_response_minutes,
    ROUND(AVG(CASE WHEN sla_met = 1 THEN 1.0 ELSE 0.0 END) * 100, 1) as sla_met_percentage
FROM support_tickets
WHERE first_response_at IS NOT NULL
GROUP BY ticket_type
ORDER BY total_tickets DESC;
```

### Onboarding Funnel

```sql
-- Conversion rates by stage
SELECT
    SUM(form_submitted) as forms_submitted,
    SUM(consultation_completed) as consultations_completed,
    SUM(pricing_approved) as pricing_approved,
    SUM(payment_received) as payments_received,
    SUM(database_provisioned) as databases_provisioned,
    SUM(go_live) as went_live,
    ROUND(SUM(go_live) * 100.0 / SUM(form_submitted), 1) as conversion_rate
FROM customer_workflow w
JOIN customers c ON w.customer_id = c.id
WHERE c.created_at >= DATE('now', '-90 days');
```

---

## Migrations

### Creating a Migration

```bash
# Create new migration file
cat > migrations/002_add_referral_tracking.sql <<EOF
-- Migration: Add referral tracking
-- Version: 1.1.0
-- Date: 2025-10-21

-- Add referral columns to customers table
ALTER TABLE customers ADD COLUMN referred_by_customer_id INTEGER;
ALTER TABLE customers ADD COLUMN referral_credit_amount REAL DEFAULT 0;

-- Add foreign key (SQLite limitation: cannot add FK after table creation)
-- Recreate table if needed or use triggers

-- Update schema version
INSERT INTO schema_migrations (version, description, applied_by)
VALUES ('1.1.0', 'Add referral tracking', 'jeremy@intentsolutions.io');
EOF
```

### Applying a Migration

```bash
# Apply migration
sqlite3 costplusdb.db < migrations/002_add_referral_tracking.sql

# Verify migration applied
sqlite3 costplusdb.db "SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 1;"
```

---

## Seed Data

### Creating Test Data

```bash
# Create seed file
cat > seeds/001_test_customers.sql <<EOF
-- Test customer 1: Active Dedicated tier
INSERT INTO customers (
    customer_id, company_name, contact_name, contact_email,
    tier, monthly_base_rate, status, activated_at
) VALUES (
    'test-startup-20251001',
    'Test Startup Inc',
    'Alice Smith',
    'alice@teststartup.com',
    'Dedicated',
    89.00,
    'active',
    DATETIME('now', '-30 days')
);

-- Test customer 2: Prospect (in onboarding)
INSERT INTO customers (
    customer_id, company_name, contact_name, contact_email,
    tier, monthly_base_rate, status
) VALUES (
    'test-corp-20251015',
    'Test Corporation',
    'Bob Johnson',
    'bob@testcorp.com',
    'Pro',
    129.00,
    'prospect'
);

-- Add billing for active customer
INSERT INTO billing (
    customer_id, base_tier_price, total_monthly_rate,
    payment_method, payment_status, next_billing_date
)
SELECT
    id, 89.00, 89.00,
    'stripe', 'current', DATE('now', '+1 month')
FROM customers WHERE customer_id = 'test-startup-20251001';

-- Add workflow for prospect
INSERT INTO customer_workflow (
    customer_id, current_stage, form_submitted, form_submitted_at
)
SELECT
    id, 'form_submitted', 1, CURRENT_TIMESTAMP
FROM customers WHERE customer_id = 'test-corp-20251015';
EOF
```

### Loading Seed Data

```bash
# Load seed data
sqlite3 costplusdb.db < seeds/001_test_customers.sql

# Verify seed data loaded
sqlite3 costplusdb.db "SELECT customer_id, company_name, status FROM customers;"
```

---

## Backup and Restore

### Backup

```bash
# Full database backup
sqlite3 costplusdb.db ".backup costplusdb_backup_$(date +%Y%m%d).db"

# Or using dump (SQL format)
sqlite3 costplusdb.db ".dump" > costplusdb_backup_$(date +%Y%m%d).sql
```

### Restore

```bash
# Restore from backup file
cp costplusdb_backup_20251020.db costplusdb.db

# Restore from SQL dump
sqlite3 costplusdb_new.db < costplusdb_backup_20251020.sql
```

---

## Turso Deployment

### Deploy to Turso Cloud

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login to Turso
turso auth login

# Create database
turso db create costplusdb --location bos

# Apply schema
turso db shell costplusdb < schema.sql

# Get connection URL
turso db show costplusdb --url

# Create auth token
turso db tokens create costplusdb
```

### Connect from Application

```javascript
// JavaScript/Node.js example
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Query active customers
const result = await client.execute('SELECT * FROM v_active_customers');
console.log(result.rows);
```

---

## Security Best Practices

### Password Hashing

**NEVER store plaintext passwords!**

```python
# Example: Hash database password before storing
import argon2

ph = argon2.PasswordHasher()
password_hash = ph.hash('random_password_here')

# Store hash in database
db.execute(
    "INSERT INTO databases (database_password_hash, ...) VALUES (?, ...)",
    (password_hash, ...)
)
```

### Database Encryption

```bash
# Turso supports encryption at rest (automatic)
# For local SQLite, use SQLCipher

# Create encrypted database
sqlcipher costplusdb_encrypted.db
sqlite> PRAGMA key = 'your-encryption-key';
sqlite> .read schema.sql
```

### Access Control

```bash
# Limit file permissions
chmod 600 costplusdb.db

# Use environment variables for credentials
export TURSO_DATABASE_URL="libsql://..."
export TURSO_AUTH_TOKEN="..."
```

---

## Troubleshooting

### Foreign Keys Not Working

```sql
-- Enable foreign keys (required for SQLite)
PRAGMA foreign_keys = ON;

-- Verify foreign keys enabled
PRAGMA foreign_keys;
-- Should return: 1
```

### Unique Constraint Violation

```sql
-- Check for duplicate emails
SELECT contact_email, COUNT(*) as count
FROM customers
GROUP BY contact_email
HAVING count > 1;

-- Check for duplicate customer_ids
SELECT customer_id, COUNT(*) as count
FROM customers
GROUP BY customer_id
HAVING count > 1;
```

### Slow Queries

```sql
-- Enable query analyzer
EXPLAIN QUERY PLAN SELECT * FROM v_active_customers;

-- Check index usage
.schema customers

-- Rebuild indexes
REINDEX;
```

---

## Resources

- **Schema Documentation:** `/home/admincostplus/projects/costplusdb/000-docs/033-DR-ARCH-customer-database-schema.md`
- **SQLite Documentation:** https://www.sqlite.org/docs.html
- **Turso Documentation:** https://docs.turso.tech/
- **Turso CLI Reference:** https://docs.turso.tech/reference/turso-cli

---

## Support

For questions about this schema:
- Email: jeremy@intentsolutions.io
- Documentation: See `000-docs/033-DR-ARCH-customer-database-schema.md`
- Issues: Track in project management system

---

**Last Updated:** 2025-10-20
**Schema Version:** 1.0.0
**Maintained By:** CostPlusDB Team
