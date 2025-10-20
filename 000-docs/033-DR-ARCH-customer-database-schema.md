# Customer Database Schema Design

**Document Type:** Architecture Decision Record
**Created:** 2025-10-20
**Version:** 1.0.0
**Status:** Implementation Ready
**Database:** SQLite 3 (Turso Cloud Compatible)
**Schema Location:** `/home/admincostplus/projects/costplusdb/002-clients/database/schema.sql`

---

## Executive Summary

This document describes the comprehensive SQLite database schema designed for CostPlusDB customer relationship management. The schema supports the complete customer lifecycle from prospect to active customer, including billing, support tickets, database provisioning, and detailed workflow tracking.

The schema is designed to be Turso Cloud compatible and follows SQLite best practices while maintaining enterprise-grade data integrity through foreign keys, constraints, and automatic triggers.

---

## Database Overview

### Technology Stack

- **Database Engine:** SQLite 3
- **Cloud Platform:** Turso (edge-deployed SQLite)
- **Schema Version:** 1.0.0
- **Tables:** 9 core tables + 1 schema migration table
- **Views:** 5 materialized queries for common operations
- **Triggers:** 7 automatic timestamp and audit triggers

### Key Design Principles

1. **Data Integrity:** Foreign key constraints ensure referential integrity
2. **Audit Trail:** Complete activity log for compliance and debugging
3. **Soft Deletes:** `is_active` flags prevent accidental data loss
4. **Timestamp Tracking:** Automatic `created_at` and `updated_at` on all tables
5. **Flexible Storage:** JSON fields for semi-structured data (line items, metadata)
6. **Performance:** Strategic indexes on all query-critical columns
7. **Security:** Password hashing required, never plaintext storage

---

## Schema Architecture

### Entity Relationship Diagram (Conceptual)

```
┌─────────────┐
│  CUSTOMERS  │ (Central table - all customers start here)
└──────┬──────┘
       │
       ├─────────────┬──────────────┬─────────────┬──────────────┬─────────────┐
       │             │              │             │              │             │
       ▼             ▼              ▼             ▼              ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│DATABASES │  │ BILLING  │  │ INVOICES │  │ SUPPORT  │  │ WORKFLOW │  │  NOTES   │
└──────────┘  └──────────┘  └──────────┘  │ TICKETS  │  └──────────┘  └──────────┘
                                          └────┬─────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │   SUPPORT    │
                                        │   MESSAGES   │
                                        └──────────────┘

                              ┌─────────────┐
                              │ ACTIVITY_LOG│ (Connects to all tables)
                              └─────────────┘
```

---

## Table Definitions

### 1. CUSTOMERS (Core Table)

**Purpose:** Central customer information and company details

**Key Fields:**
- `customer_id` - Unique identifier (format: `company-slug-YYYYMMDD`)
- `tier` - Service tier: Shared, Dedicated, Pro, Enterprise
- `status` - Lifecycle status: prospect → consultation → approved → provisioning → active → suspended → churned
- `is_active` - Soft delete flag (1 = active, 0 = deleted)

**Business Logic:**
- Primary contact information for billing and communication
- Technical details from onboarding form (current provider, DB size, migration timeline)
- Business requirements (compliance needs, SLA requirements)
- Add-on selections (HA, replicas, VPN, compliance package, custom monitoring)
- Infrastructure preferences (provider, region)
- Communication preferences (email, Slack, timezone)

**Important Constraints:**
- `contact_email` must be UNIQUE (one email = one customer account)
- `tier` CHECK constraint ensures only valid tier names
- `status` CHECK constraint enforces valid lifecycle states

**Indexes:**
- `customer_id` - Primary lookup
- `contact_email` - Login/authentication queries
- `status` - Dashboard filtering (active vs prospect)
- `tier` - Revenue analysis by tier
- `created_at` - Chronological sorting

---

### 2. DATABASES (Provisioning Table)

**Purpose:** Track provisioned PostgreSQL databases for each customer

**Key Fields:**
- `database_name` - Actual PostgreSQL database name (UNIQUE)
- `database_password_hash` - CRITICAL: Never store plaintext passwords!
- `vps_hostname` - Server where database is hosted
- `provision_status` - pending → provisioning → active → maintenance → suspended → deprovisioned

**Resource Tracking:**
- Allocated RAM, storage, CPU cores
- Max connections
- Current size and connection count
- Health status (healthy, warning, critical, unknown)

**Backup Configuration:**
- Backup schedule (daily-1am, hourly, etc.)
- Retention days (default 30)
- Point-in-time recovery (PITR) enabled/disabled
- PITR retention (default 7 days)

**Security Note:**
The `database_password_hash` field should NEVER contain plaintext passwords. Use bcrypt, Argon2, or similar hashing algorithm before storage.

**Indexes:**
- `customer_id` - Find all databases for a customer
- `database_name` - Connection string lookups
- `vps_hostname` - Server-level queries
- `provision_status` - Operational dashboards
- `health_status` - Alerting queries

---

### 3. BILLING (Financial Table)

**Purpose:** Track customer billing cycles and payment status

**Key Fields:**
- `billing_cycle` - monthly, annual, custom
- `next_billing_date` - When to generate next invoice
- `payment_method` - stripe, bank_transfer, paypal, invoice
- `payment_status` - current, past_due, suspended, cancelled

**Price Breakdown:**
- `base_tier_price` - Base tier cost ($49, $89, $129, $149)
- `infrastructure_addon_price` - Hetzner, DigitalOcean, AWS, GCP upgrades
- `feature_addons_price` - HA, replicas, VPN, compliance
- `extra_storage_price` - Storage beyond standard allocation
- `total_monthly_rate` - Grand total (shown on invoice)

**Stripe Integration:**
- `stripe_customer_id` - Links to Stripe customer
- `stripe_subscription_id` - Links to Stripe subscription

**Discounts:**
- `discount_percent` - Percentage discount (0-100%)
- `discount_amount` - Fixed dollar discount
- `account_credit` - Customer credit balance

**Design Decision:**
We store both percentage AND amount discounts to support flexible pricing (early adopter discounts, referral credits, etc.)

---

### 4. INVOICES (Transaction History)

**Purpose:** Complete invoice history with line-item detail

**Key Fields:**
- `invoice_number` - UNIQUE identifier (format: `INV-YYYYMM-001`)
- `invoice_date` - When invoice was generated
- `due_date` - When payment is due
- `payment_status` - pending → paid (or partial, overdue, cancelled, refunded)

**Amount Breakdown:**
- `base_amount` - Tier cost
- `addons_amount` - All add-ons combined
- `discounts_amount` - Total discounts applied
- `tax_amount` - Sales tax (if applicable)
- `total_amount` - Final amount due

**Transparency Feature:**
- `line_items` - JSON array with format:
  ```json
  [
    {
      "description": "Enterprise Tier",
      "our_cost": 30.00,
      "your_price": 149.00,
      "quantity": 1
    },
    {
      "description": "High Availability Add-on",
      "our_cost": 79.00,
      "your_price": 99.00,
      "quantity": 1
    }
  ]
  ```

This JSON structure supports CostPlusDB's transparency model by showing customers exactly what we pay vs what they pay.

**Stripe Integration:**
- `stripe_invoice_id` - Links to Stripe invoice
- `stripe_payment_intent_id` - Links to Stripe payment

**File Management:**
- `invoice_pdf_path` - Path to generated PDF invoice
- `invoice_sent` - Boolean flag (has customer received it?)

---

### 5. SUPPORT_TICKETS (Customer Service)

**Purpose:** Track all customer interactions and support requests

**Key Fields:**
- `ticket_number` - UNIQUE identifier (format: `TICKET-YYYYMMDD-001`)
- `ticket_type` - onboarding, technical, billing, incident, feature_request, general
- `priority` - low, normal, high, critical
- `status` - open → in_progress → waiting_customer → waiting_internal → resolved → closed

**SLA Tracking:**
- `sla_response_hours` - Expected response time (based on tier)
  - Shared/Dedicated: 4 hours (M-F 9am-6pm ET)
  - Pro: 2 hours (M-F 9am-6pm ET)
  - Enterprise: 1 hour (24/7)
- `first_response_at` - Timestamp of first response
- `response_time_minutes` - Calculated after first response
- `sla_met` - Boolean (did we meet SLA?)

**Communication Channels:**
- `customer_email` - Email thread ID
- `slack_thread_url` - For Enterprise customers with Slack Connect

**Assignment:**
- `assigned_to` - Email of support person handling ticket

**Design Decision:**
We calculate `response_time_minutes` automatically and store `sla_met` as a boolean for easy reporting and analytics on support performance.

---

### 6. SUPPORT_MESSAGES (Conversation Log)

**Purpose:** Individual messages within support tickets (threaded conversation)

**Key Fields:**
- `ticket_id` - Foreign key to support_tickets
- `sender_type` - customer, support, system
- `message_text` - Message content
- `is_internal` - Boolean (internal notes vs customer-visible)

**Attachments:**
- `has_attachments` - Boolean flag
- `attachment_paths` - JSON array of file paths

**Design Decision:**
Separating messages from tickets allows for:
1. Full conversation history
2. Internal notes that customers can't see
3. Easier email/Slack integration (each message = one email/Slack post)
4. Better analytics (response time, message count per ticket)

---

### 7. CUSTOMER_WORKFLOW (Onboarding Pipeline)

**Purpose:** Track customer onboarding and lifecycle workflow status

**Workflow Stages (in order):**
1. `form_submitted` - Customer completed intake form
2. `consultation_scheduled` - Call/meeting scheduled
3. `consultation_completed` - Discovery call finished
4. `pricing_approved` - Customer accepted pricing quote
5. `payment_received` - First payment processed
6. `database_provisioning_started` - Database creation begun
7. `database_provisioned` - Database is live
8. `credentials_sent` - Connection details sent to customer
9. `customer_confirmed_access` - Customer verified they can connect
10. `migration_started` - Data migration from old provider begun
11. `migration_completed` - Migration finished
12. `go_live` - Customer switched production traffic to CostPlusDB

**Each stage has:**
- Boolean flag (0/1)
- Timestamp field (when completed)

**Additional Fields:**
- `current_stage` - Text summary of where customer is in pipeline
- `blocked` - Boolean (is onboarding stuck?)
- `blocker_reason` - Text description of blocker
- `workflow_notes` - General notes about onboarding

**Constraint:**
- UNIQUE constraint on `customer_id` ensures one workflow per customer

**Design Decision:**
This granular tracking allows for:
1. Dashboard view of onboarding pipeline
2. Identification of bottlenecks (which stage takes longest?)
3. Automated reminders when workflow stalls
4. Customer success metrics (time to activation)

---

### 8. NOTES (Internal Communication)

**Purpose:** General notes and internal communications about customers

**Key Fields:**
- `note_type` - general, technical, billing, sales, incident, meeting
- `subject` - Short summary
- `note_text` - Full note content
- `created_by` - Email of person creating note

**Follow-up Tracking:**
- `is_follow_up` - Boolean (does this need follow-up?)
- `follow_up_date` - When to follow up

**Flags:**
- `is_important` - Boolean (urgent/important note?)

**Design Decision:**
Notes are separate from support tickets because:
1. Not all customer interactions are "support tickets"
2. Internal sales/technical discussions need a home
3. Meeting notes, call summaries, incident postmortems
4. Follow-up reminders for account management

---

### 9. ACTIVITY_LOG (Audit Trail)

**Purpose:** Complete audit trail of all system actions

**Key Fields:**
- `customer_id` - Can be NULL (for system-level events)
- `entity_type` - customer, database, billing, support_ticket, etc.
- `entity_id` - ID of the entity that changed
- `action_type` - created, updated, deleted, status_changed, etc.
- `action_description` - Human-readable description

**Change Tracking:**
- `old_values` - JSON of fields before change
- `new_values` - JSON of fields after change

**Actor Tracking:**
- `performed_by` - Email or system identifier
- `ip_address` - For security auditing
- `user_agent` - Browser/client info

**Example Log Entries:**
```json
// Customer status change
{
  "entity_type": "customer",
  "entity_id": 123,
  "action_type": "status_changed",
  "old_values": {"status": "prospect"},
  "new_values": {"status": "active"},
  "performed_by": "jeremy@intentsolutions.io"
}

// Database provisioned
{
  "entity_type": "database",
  "entity_id": 456,
  "action_type": "created",
  "new_values": {"database_name": "acme_production", "provision_status": "active"},
  "performed_by": "system"
}
```

**Design Decision:**
Activity log is critical for:
1. Security auditing (who changed what?)
2. Debugging (what happened before the error?)
3. Compliance (GDPR/HIPAA audit trail)
4. Customer transparency (show customers their account history)

---

## Database Views

Views provide pre-built queries for common operations.

### v_active_customers

**Purpose:** Dashboard overview of active paying customers

**Returns:**
- Customer details (name, email, tier)
- Billing info (monthly rate, payment status, next billing date)
- Database info (name, provision status, health status)
- Timestamps (created, activated)

**Use Case:** Main dashboard, revenue reporting

---

### v_customers_by_revenue

**Purpose:** Customers sorted by monthly revenue (highest first)

**Returns:**
- Monthly rate
- Days active
- Lifetime value (calculated: `days_active / 30 * monthly_rate`)

**Use Case:** Identify top customers, prioritize support

---

### v_open_support_tickets

**Purpose:** All open support tickets with SLA tracking

**Returns:**
- Ticket details (number, subject, type, priority)
- Customer info (name, email, tier)
- SLA tracking (response hours, first response time)
- Hours open (calculated if not yet responded)

**Use Case:** Support dashboard, SLA compliance monitoring

---

### v_onboarding_pipeline

**Purpose:** Customers currently in onboarding process

**Returns:**
- Customer details
- Current workflow stage
- Blocked status and reason
- Days in pipeline (calculated)

**Use Case:** Sales/onboarding dashboard, identify stuck deals

---

### v_mrr_summary

**Purpose:** Monthly Recurring Revenue (MRR) metrics

**Returns:**
- Total active customers
- Total MRR across all customers
- Average revenue per customer
- MRR breakdown by tier (Shared, Dedicated, Pro, Enterprise)

**Use Case:** Financial reporting, investor updates, business metrics

---

## Triggers

Triggers automatically maintain data consistency and audit trails.

### 1. Timestamp Update Triggers

**Tables:** customers, databases, billing, invoices, support_tickets, customer_workflow, notes

**Function:** Automatically set `updated_at = CURRENT_TIMESTAMP` on any UPDATE

**Example:**
```sql
CREATE TRIGGER update_customers_timestamp
AFTER UPDATE ON customers
FOR EACH ROW
BEGIN
    UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

**Benefit:** Never forget to update timestamps, ensures accurate change tracking

---

## Indexes Strategy

Indexes are created on columns frequently used in WHERE, JOIN, and ORDER BY clauses.

### Primary Indexes (Unique)
- `customers.customer_id`
- `customers.contact_email`
- `databases.database_name`
- `invoices.invoice_number`
- `support_tickets.ticket_number`

### Foreign Key Indexes
- All `customer_id` columns
- `support_messages.ticket_id`

### Query Optimization Indexes
- `customers.status` - Dashboard filtering
- `customers.tier` - Revenue analysis
- `databases.provision_status` - Operational queries
- `databases.health_status` - Alerting queries
- `invoices.payment_status` - Billing reports
- `invoices.due_date` - Overdue invoice detection
- `support_tickets.priority` - Support queue sorting
- `activity_log.created_at` - Audit trail queries

**Design Decision:**
We balance query performance with write performance. Every index speeds up reads but slows down writes. The indexes chosen cover 95% of expected queries.

---

## Data Integrity Constraints

### Foreign Keys

All child tables have foreign key constraints to maintain referential integrity:

```sql
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
```

**CASCADE behavior:**
- When a customer is deleted, all related records (databases, billing, invoices, tickets, workflow, notes) are automatically deleted
- Activity log uses `ON DELETE SET NULL` to preserve audit history even after customer deletion

### CHECK Constraints

Enforce valid values for enumerated fields:

```sql
tier CHECK(tier IN ('Shared', 'Dedicated', 'Pro', 'Enterprise'))
status CHECK(status IN ('prospect', 'consultation', 'approved', 'provisioning', 'active', 'suspended', 'churned'))
```

### UNIQUE Constraints

Prevent duplicates:
- `customer_id` - One unique ID per customer
- `contact_email` - One email = one account
- `database_name` - Database names must be unique
- `invoice_number` - Invoice numbers must be unique
- `ticket_number` - Ticket numbers must be unique

### NOT NULL Constraints

Required fields cannot be NULL:
- All `customer_id` fields
- All `*_name` fields (contact_name, company_name)
- All `*_email` fields
- All `tier`, `status` fields

---

## Security Considerations

### Password Storage

**CRITICAL:** The `databases.database_password_hash` field must NEVER contain plaintext passwords.

**Recommended approach:**
1. Generate strong random password (32+ characters)
2. Hash with Argon2id, bcrypt, or scrypt
3. Store hash in database
4. Send plaintext password to customer ONCE via encrypted channel
5. Never store plaintext anywhere after that

**Example (pseudocode):**
```python
import secrets
import argon2

# Generate password
password = secrets.token_urlsafe(32)

# Hash password
hasher = argon2.PasswordHasher()
password_hash = hasher.hash(password)

# Store hash in database
db.execute(
    "INSERT INTO databases (database_password_hash, ...) VALUES (?, ...)",
    (password_hash, ...)
)

# Send password to customer via email (one time only)
send_email(customer_email, f"Your database password: {password}")
```

### Sensitive Data

Fields containing sensitive information:
- `databases.database_password_hash` - Hashed passwords
- `customers.contact_email` - PII
- `customers.contact_phone` - PII
- `billing.stripe_customer_id` - Payment info
- `billing.stripe_subscription_id` - Payment info

**Recommendations:**
1. Encrypt database file at rest (Turso supports this)
2. Use SSL/TLS for all database connections
3. Limit database access to authorized personnel only
4. Log all database access in `activity_log`
5. Regular security audits

### GDPR Compliance

The schema supports GDPR compliance through:
1. **Right to Access:** All customer data in one place (customers table + related tables)
2. **Right to Deletion:** Soft delete via `is_active` flag, hard delete via CASCADE
3. **Audit Trail:** `activity_log` tracks all data access and changes
4. **Data Minimization:** Only collect necessary information
5. **Consent Tracking:** Can add `gdpr_consent` field to customers table if needed

---

## Migration Strategy

### Schema Versioning

The `schema_migrations` table tracks all schema changes:

```sql
CREATE TABLE schema_migrations (
    version TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applied_by TEXT DEFAULT 'system'
);
```

**Migration Files:**
Store in `/home/admincostplus/projects/costplusdb/002-clients/database/migrations/`

**Naming Convention:**
- `001_initial_schema.sql` - Version 1.0.0
- `002_add_referral_tracking.sql` - Version 1.1.0
- `003_add_enterprise_features.sql` - Version 1.2.0

**Migration Process:**
```bash
# Apply migration
sqlite3 costplusdb.db < migrations/002_add_referral_tracking.sql

# Record in schema_migrations
sqlite3 costplusdb.db "INSERT INTO schema_migrations (version, description, applied_by)
VALUES ('1.1.0', 'Add referral tracking fields', 'jeremy@intentsolutions.io');"
```

### Backwards Compatibility

All migrations should be backwards compatible:
- Add columns with DEFAULT values
- Never drop columns (deprecate instead)
- Use ALTER TABLE, not DROP TABLE
- Test migrations on copy of production database first

---

## Performance Optimization

### Expected Query Load

**Read-heavy operations:**
- Customer dashboard (v_active_customers view)
- Billing reports (invoices table)
- Support ticket queue (v_open_support_tickets view)

**Write-heavy operations:**
- Activity log (every action logged)
- Support messages (conversation threads)

### Optimization Strategies

1. **Indexes:** Strategic indexes on query-critical columns (already implemented)
2. **Views:** Pre-computed queries for common operations (already implemented)
3. **Connection Pooling:** Use Turso's built-in connection pooling
4. **Pagination:** Limit results for large datasets (add LIMIT/OFFSET to queries)
5. **Caching:** Cache frequently-accessed data (dashboard metrics) in application layer

### Turso-Specific Optimizations

1. **Edge Replication:** Turso replicates database to edge locations for low-latency reads
2. **Embedded Replicas:** For high-traffic queries, use embedded replicas
3. **Batch Writes:** Group multiple writes into transactions for better performance

**Example transaction:**
```sql
BEGIN TRANSACTION;
INSERT INTO customers (...) VALUES (...);
INSERT INTO customer_workflow (...) VALUES (...);
INSERT INTO billing (...) VALUES (...);
COMMIT;
```

---

## Sample Queries

### 1. Get all active customers with database health

```sql
SELECT
    c.company_name,
    c.contact_email,
    c.tier,
    b.total_monthly_rate,
    d.database_name,
    d.health_status,
    d.last_health_check
FROM customers c
JOIN billing b ON c.id = b.customer_id
LEFT JOIN databases d ON c.id = d.customer_id
WHERE c.status = 'active' AND c.is_active = 1
ORDER BY b.total_monthly_rate DESC;
```

### 2. Find overdue invoices

```sql
SELECT
    i.invoice_number,
    c.company_name,
    c.contact_email,
    i.total_amount,
    i.due_date,
    JULIANDAY('now') - JULIANDAY(i.due_date) as days_overdue
FROM invoices i
JOIN customers c ON i.customer_id = c.id
WHERE i.payment_status IN ('pending', 'overdue')
  AND i.due_date < DATE('now')
ORDER BY i.due_date ASC;
```

### 3. Customer lifetime value

```sql
SELECT
    c.company_name,
    c.tier,
    b.total_monthly_rate,
    JULIANDAY('now') - JULIANDAY(c.activated_at) as days_active,
    ROUND((JULIANDAY('now') - JULIANDAY(c.activated_at)) / 30.0, 1) as months_active,
    ROUND((JULIANDAY('now') - JULIANDAY(c.activated_at)) / 30.0 * b.total_monthly_rate, 2) as lifetime_value
FROM customers c
JOIN billing b ON c.id = b.customer_id
WHERE c.is_active = 1 AND c.status = 'active'
ORDER BY lifetime_value DESC;
```

### 4. Support ticket response time analysis

```sql
SELECT
    ticket_type,
    priority,
    COUNT(*) as ticket_count,
    AVG(response_time_minutes) as avg_response_minutes,
    AVG(CASE WHEN sla_met = 1 THEN 1.0 ELSE 0.0 END) * 100 as sla_met_percentage
FROM support_tickets
WHERE first_response_at IS NOT NULL
GROUP BY ticket_type, priority
ORDER BY priority DESC, ticket_type;
```

### 5. Monthly revenue breakdown

```sql
SELECT
    strftime('%Y-%m', c.activated_at) as month,
    COUNT(*) as new_customers,
    SUM(b.total_monthly_rate) as new_mrr
FROM customers c
JOIN billing b ON c.id = b.customer_id
WHERE c.activated_at IS NOT NULL
GROUP BY month
ORDER BY month DESC;
```

---

## Future Enhancements

### Phase 2 Features (Month 6+)

1. **Payment History Table**
   - Track individual Stripe payments (not just invoices)
   - Support refunds, chargebacks, failed payments

2. **Customer Referrals Table**
   - Track referral source
   - Referral rewards/credits
   - Referral conversion rate

3. **Usage Metrics Table**
   - Track database connection count over time
   - Storage growth over time
   - Query performance metrics

4. **Notification Preferences Table**
   - Customer-specific notification settings
   - Email vs Slack preferences per notification type
   - Quiet hours, timezone preferences

5. **API Keys Table**
   - For customers who want programmatic access
   - API key generation, rotation, revocation

### Phase 3 Features (Month 12+)

1. **Multi-Database Support**
   - Some customers may need multiple databases
   - Add database count to billing

2. **Team Members Table**
   - Multiple users per customer account
   - Role-based access control (admin, developer, billing)

3. **Compliance Documents Table**
   - Store BAAs, DPAs, SOC 2 reports
   - Track document versions, signatures

4. **Scheduled Maintenance Table**
   - Track planned maintenance windows
   - Customer notification preferences

---

## Testing Strategy

### Unit Tests

Test each table's constraints and triggers:

```python
def test_customer_unique_email():
    """Test that duplicate emails are rejected"""
    db.execute("INSERT INTO customers (customer_id, contact_email, ...) VALUES ('test-1', 'john@example.com', ...)")
    with pytest.raises(IntegrityError):
        db.execute("INSERT INTO customers (customer_id, contact_email, ...) VALUES ('test-2', 'john@example.com', ...)")

def test_customer_status_constraint():
    """Test that invalid status values are rejected"""
    with pytest.raises(IntegrityError):
        db.execute("INSERT INTO customers (status, ...) VALUES ('invalid_status', ...)")

def test_billing_cascade_delete():
    """Test that deleting customer deletes billing records"""
    customer_id = create_test_customer()
    create_test_billing(customer_id)
    db.execute("DELETE FROM customers WHERE id = ?", (customer_id,))
    assert db.execute("SELECT COUNT(*) FROM billing WHERE customer_id = ?", (customer_id,)).fetchone()[0] == 0
```

### Integration Tests

Test complete workflows:

```python
def test_customer_onboarding_workflow():
    """Test complete customer onboarding from prospect to active"""
    # 1. Create prospect
    customer = create_customer(status='prospect')

    # 2. Create workflow
    workflow = create_workflow(customer.id)
    assert workflow.current_stage == 'form_submitted'

    # 3. Update to consultation
    update_workflow(workflow.id, stage='consultation_scheduled')

    # 4. Create billing
    billing = create_billing(customer.id)

    # 5. Provision database
    database = provision_database(customer.id)

    # 6. Activate customer
    activate_customer(customer.id)

    # 7. Verify customer is active
    customer = get_customer(customer.id)
    assert customer.status == 'active'
    assert database.provision_status == 'active'
    assert billing.payment_status == 'current'
```

---

## Deployment Checklist

### Initial Deployment

- [ ] Create Turso database instance
- [ ] Apply schema.sql
- [ ] Verify all tables created
- [ ] Verify all indexes created
- [ ] Verify all triggers created
- [ ] Verify all views created
- [ ] Test foreign key constraints
- [ ] Test CHECK constraints
- [ ] Test UNIQUE constraints
- [ ] Load seed data (if any)
- [ ] Run integration tests
- [ ] Configure backups
- [ ] Set up monitoring

### Production Deployment

- [ ] Backup existing database
- [ ] Apply migrations in transaction
- [ ] Verify schema_migrations table updated
- [ ] Run smoke tests
- [ ] Monitor for errors
- [ ] Rollback plan ready

---

## Maintenance

### Regular Tasks

**Daily:**
- Monitor `activity_log` for anomalies
- Check for failed database provisioning
- Review open support tickets

**Weekly:**
- Review `v_mrr_summary` for revenue trends
- Check for overdue invoices
- Audit `customer_workflow` for stuck onboarding

**Monthly:**
- Archive old activity log entries (>90 days)
- Review and optimize slow queries
- Backup database and test restore

**Quarterly:**
- Security audit of database access
- Review and update indexes based on query performance
- Customer data cleanup (churned customers >1 year)

---

## Conclusion

This schema provides a solid foundation for CostPlusDB customer management. It supports the complete customer lifecycle, maintains data integrity, provides audit trails, and enables transparency in billing.

The design is intentionally comprehensive to avoid frequent schema changes as the business grows. All tables include extensibility through JSON fields for semi-structured data.

**Next Steps:**
1. Deploy schema to Turso instance
2. Build application layer (API endpoints)
3. Create admin dashboard
4. Integrate with Stripe
5. Build customer portal

---

**Document History:**
- 2025-10-20: Initial version 1.0.0 - Complete schema design (9 tables, 5 views, 7 triggers)
