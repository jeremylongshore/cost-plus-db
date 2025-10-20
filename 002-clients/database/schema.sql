-- =====================================================
-- CostPlusDB Customer Management Database Schema
-- =====================================================
-- Version: 1.0.0
-- Database: SQLite 3 (Turso Cloud Compatible)
-- Created: 2025-10-20
-- Purpose: Comprehensive customer relationship management
--          for CostPlusDB managed PostgreSQL service
-- =====================================================

-- Enable foreign key constraints (critical for SQLite)
PRAGMA foreign_keys = ON;

-- =====================================================
-- SCHEMA VERSION TRACKING
-- =====================================================
-- Track database schema migrations and versions

CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applied_by TEXT DEFAULT 'system'
);

-- Insert initial schema version
INSERT INTO schema_migrations (version, description, applied_by)
VALUES ('1.0.0', 'Initial schema creation', 'setup')
ON CONFLICT(version) DO NOTHING;

-- =====================================================
-- TABLE 1: CUSTOMERS
-- =====================================================
-- Core customer information and company details

CREATE TABLE IF NOT EXISTS customers (
    -- Primary identification
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL UNIQUE, -- Format: company-slug-YYYYMMDD

    -- Company information
    company_name TEXT NOT NULL,
    company_website TEXT,
    industry TEXT,
    company_size TEXT CHECK(company_size IN ('1-10', '11-50', '51-200', '201-500', '500+')),

    -- Primary contact information
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL UNIQUE,
    contact_phone TEXT,

    -- Address (optional, for invoicing)
    billing_address_line1 TEXT,
    billing_address_line2 TEXT,
    billing_city TEXT,
    billing_state TEXT,
    billing_postal_code TEXT,
    billing_country TEXT DEFAULT 'US',

    -- Technical details (from onboarding)
    current_provider TEXT, -- AWS RDS, Heroku, DigitalOcean, etc.
    current_db_size_gb INTEGER,
    current_db_version TEXT, -- PostgreSQL version they're using
    migration_timeline TEXT, -- Immediate, 1-3 months, 3-6 months, etc.

    -- Business requirements
    compliance_needs TEXT, -- HIPAA, SOC2, GDPR, PCI-DSS (comma-separated)
    sla_requirements TEXT, -- 99.9%, 99.95%, 99.99%
    specific_features TEXT, -- JSON or comma-separated list of special needs

    -- Selected tier and add-ons
    tier TEXT NOT NULL CHECK(tier IN ('Shared', 'Dedicated', 'Pro', 'Enterprise')),
    monthly_base_rate REAL NOT NULL, -- Base tier price

    -- Add-ons (boolean flags)
    addon_high_availability INTEGER DEFAULT 0 CHECK(addon_high_availability IN (0, 1)),
    addon_read_replicas INTEGER DEFAULT 0, -- Number of replicas
    addon_vpn_access INTEGER DEFAULT 0 CHECK(addon_vpn_access IN (0, 1)),
    addon_compliance_package INTEGER DEFAULT 0 CHECK(addon_compliance_package IN (0, 1)),
    addon_custom_monitoring INTEGER DEFAULT 0 CHECK(addon_custom_monitoring IN (0, 1)),

    -- Infrastructure preferences
    infrastructure_provider TEXT DEFAULT 'Contabo' CHECK(
        infrastructure_provider IN ('Contabo', 'Hetzner', 'DigitalOcean', 'AWS', 'GCP')
    ),
    infrastructure_region TEXT, -- us-east-1, eu-central-1, etc.

    -- Communication preferences
    preferred_contact_method TEXT DEFAULT 'email' CHECK(
        preferred_contact_method IN ('email', 'slack', 'phone')
    ),
    slack_webhook_url TEXT,
    slack_channel_id TEXT, -- For Enterprise tier
    timezone TEXT DEFAULT 'America/Chicago',

    -- Customer status and lifecycle
    status TEXT NOT NULL DEFAULT 'prospect' CHECK(
        status IN ('prospect', 'consultation', 'approved', 'provisioning', 'active', 'suspended', 'churned')
    ),
    is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)), -- Soft delete flag

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP, -- When they became an active paying customer
    churned_at TIMESTAMP, -- When they cancelled

    -- Metadata
    referral_source TEXT, -- How they found us
    notes TEXT -- Internal notes
);

-- Indexes for customers table
CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(contact_email);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_tier ON customers(tier);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_created ON customers(created_at);

-- =====================================================
-- TABLE 2: DATABASES
-- =====================================================
-- Track provisioned PostgreSQL databases for customers

CREATE TABLE IF NOT EXISTS databases (
    -- Primary identification
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,

    -- Database details
    database_name TEXT NOT NULL UNIQUE, -- Actual PostgreSQL database name
    database_user TEXT NOT NULL, -- PostgreSQL username
    database_password_hash TEXT NOT NULL, -- NEVER store plaintext! Use hashing

    -- Server information
    vps_hostname TEXT NOT NULL, -- e.g., costplusdb-prod-01.example.com
    vps_ip_address TEXT,
    port INTEGER DEFAULT 5432,
    ssl_enabled INTEGER DEFAULT 1 CHECK(ssl_enabled IN (0, 1)),

    -- Resource allocation
    allocated_ram_gb INTEGER,
    allocated_storage_gb INTEGER,
    allocated_cpu_cores INTEGER,
    max_connections INTEGER DEFAULT 100,

    -- Connection details
    connection_string TEXT, -- Full connection string (without password)
    public_accessible INTEGER DEFAULT 0 CHECK(public_accessible IN (0, 1)),
    whitelisted_ips TEXT, -- Comma-separated list of allowed IPs

    -- Provisioning status
    provision_status TEXT NOT NULL DEFAULT 'pending' CHECK(
        provision_status IN ('pending', 'provisioning', 'active', 'maintenance', 'suspended', 'deprovisioned')
    ),
    provisioned_at TIMESTAMP,
    deprovisioned_at TIMESTAMP,

    -- Backup configuration
    backup_enabled INTEGER DEFAULT 1 CHECK(backup_enabled IN (0, 1)),
    backup_schedule TEXT DEFAULT 'daily-1am', -- daily-1am, hourly, etc.
    backup_retention_days INTEGER DEFAULT 30,
    pitr_enabled INTEGER DEFAULT 1 CHECK(pitr_enabled IN (0, 1)), -- Point-in-time recovery
    pitr_retention_days INTEGER DEFAULT 7,

    -- Performance metrics (updated periodically)
    current_size_gb REAL,
    current_connections INTEGER,
    last_health_check TIMESTAMP,
    health_status TEXT CHECK(health_status IN ('healthy', 'warning', 'critical', 'unknown')),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraint
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Indexes for databases table
CREATE INDEX IF NOT EXISTS idx_databases_customer_id ON databases(customer_id);
CREATE INDEX IF NOT EXISTS idx_databases_name ON databases(database_name);
CREATE INDEX IF NOT EXISTS idx_databases_hostname ON databases(vps_hostname);
CREATE INDEX IF NOT EXISTS idx_databases_status ON databases(provision_status);
CREATE INDEX IF NOT EXISTS idx_databases_health ON databases(health_status);

-- =====================================================
-- TABLE 3: BILLING
-- =====================================================
-- Track billing, invoices, and payment history

CREATE TABLE IF NOT EXISTS billing (
    -- Primary identification
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,

    -- Billing cycle information
    billing_cycle TEXT DEFAULT 'monthly' CHECK(billing_cycle IN ('monthly', 'annual', 'custom')),
    billing_day INTEGER DEFAULT 1 CHECK(billing_day BETWEEN 1 AND 28), -- Day of month
    next_billing_date DATE,

    -- Payment method
    payment_method TEXT CHECK(payment_method IN ('stripe', 'bank_transfer', 'paypal', 'invoice')),
    stripe_customer_id TEXT, -- Stripe customer ID
    stripe_subscription_id TEXT, -- Stripe subscription ID
    payment_status TEXT DEFAULT 'current' CHECK(
        payment_status IN ('current', 'past_due', 'suspended', 'cancelled')
    ),

    -- Pricing calculation
    base_tier_price REAL NOT NULL,
    infrastructure_addon_price REAL DEFAULT 0,
    feature_addons_price REAL DEFAULT 0, -- HA, replicas, VPN, compliance, etc.
    extra_storage_price REAL DEFAULT 0,
    other_charges REAL DEFAULT 0,
    total_monthly_rate REAL NOT NULL,

    -- Discounts and credits
    discount_percent REAL DEFAULT 0 CHECK(discount_percent BETWEEN 0 AND 100),
    discount_amount REAL DEFAULT 0,
    account_credit REAL DEFAULT 0, -- Positive balance = customer credit

    -- Invoice tracking
    last_invoice_date DATE,
    last_invoice_amount REAL,
    last_payment_date DATE,
    last_payment_amount REAL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraint
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Indexes for billing table
CREATE INDEX IF NOT EXISTS idx_billing_customer_id ON billing(customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_next_date ON billing(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_billing_status ON billing(payment_status);
CREATE INDEX IF NOT EXISTS idx_billing_stripe_customer ON billing(stripe_customer_id);

-- =====================================================
-- TABLE 4: INVOICES
-- =====================================================
-- Detailed invoice history (one record per invoice)

CREATE TABLE IF NOT EXISTS invoices (
    -- Primary identification
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,

    -- Invoice details
    invoice_number TEXT NOT NULL UNIQUE, -- Format: INV-YYYYMM-001
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,

    -- Amount breakdown
    base_amount REAL NOT NULL,
    addons_amount REAL DEFAULT 0,
    discounts_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    total_amount REAL NOT NULL,

    -- Line items (stored as JSON for flexibility)
    line_items TEXT, -- JSON array of {description, our_cost, your_price, quantity}

    -- Payment tracking
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(
        payment_status IN ('pending', 'paid', 'partial', 'overdue', 'cancelled', 'refunded')
    ),
    paid_date DATE,
    paid_amount REAL DEFAULT 0,

    -- Payment method used
    payment_method TEXT,
    stripe_invoice_id TEXT,
    stripe_payment_intent_id TEXT,

    -- Invoice file
    invoice_pdf_path TEXT, -- Path to generated PDF invoice
    invoice_sent INTEGER DEFAULT 0 CHECK(invoice_sent IN (0, 1)),
    invoice_sent_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraint
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Indexes for invoices table
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- =====================================================
-- TABLE 5: SUPPORT_TICKETS
-- =====================================================
-- Track all customer interactions and support requests

CREATE TABLE IF NOT EXISTS support_tickets (
    -- Primary identification
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    ticket_number TEXT NOT NULL UNIQUE, -- Format: TICKET-YYYYMMDD-001

    -- Ticket details
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    ticket_type TEXT NOT NULL CHECK(
        ticket_type IN ('onboarding', 'technical', 'billing', 'incident', 'feature_request', 'general')
    ),
    priority TEXT DEFAULT 'normal' CHECK(
        priority IN ('low', 'normal', 'high', 'critical')
    ),

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'open' CHECK(
        status IN ('open', 'in_progress', 'waiting_customer', 'waiting_internal', 'resolved', 'closed')
    ),

    -- Assignment
    assigned_to TEXT, -- Email of person handling ticket

    -- Communication
    customer_email TEXT, -- Email thread ID if applicable
    slack_thread_url TEXT, -- Slack thread for Enterprise customers

    -- Resolution
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,

    -- SLA tracking
    sla_response_hours INTEGER, -- Expected response time based on tier
    first_response_at TIMESTAMP,
    response_time_minutes INTEGER, -- Calculated after first response
    sla_met INTEGER CHECK(sla_met IN (0, 1)), -- Did we meet SLA?

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraint
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Indexes for support_tickets table
CREATE INDEX IF NOT EXISTS idx_support_customer_id ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_number ON support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_support_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_type ON support_tickets(ticket_type);
CREATE INDEX IF NOT EXISTS idx_support_created ON support_tickets(created_at);

-- =====================================================
-- TABLE 6: SUPPORT_MESSAGES
-- =====================================================
-- Individual messages within support tickets (conversation log)

CREATE TABLE IF NOT EXISTS support_messages (
    -- Primary identification
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,

    -- Message details
    sender_type TEXT NOT NULL CHECK(sender_type IN ('customer', 'support', 'system')),
    sender_name TEXT,
    sender_email TEXT,

    -- Message content
    message_text TEXT NOT NULL,
    is_internal INTEGER DEFAULT 0 CHECK(is_internal IN (0, 1)), -- Internal notes vs customer-visible

    -- Attachments
    has_attachments INTEGER DEFAULT 0 CHECK(has_attachments IN (0, 1)),
    attachment_paths TEXT, -- JSON array of file paths

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraint
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
);

-- Indexes for support_messages table
CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON support_messages(created_at);

-- =====================================================
-- TABLE 7: CUSTOMER_WORKFLOW
-- =====================================================
-- Track customer onboarding and lifecycle workflow status

CREATE TABLE IF NOT EXISTS customer_workflow (
    -- Primary identification
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,

    -- Workflow checkpoints (0 = not completed, 1 = completed)
    form_submitted INTEGER DEFAULT 0 CHECK(form_submitted IN (0, 1)),
    form_submitted_at TIMESTAMP,

    consultation_scheduled INTEGER DEFAULT 0 CHECK(consultation_scheduled IN (0, 1)),
    consultation_scheduled_at TIMESTAMP,
    consultation_date TIMESTAMP,

    consultation_completed INTEGER DEFAULT 0 CHECK(consultation_completed IN (0, 1)),
    consultation_completed_at TIMESTAMP,
    consultation_notes TEXT,

    pricing_approved INTEGER DEFAULT 0 CHECK(pricing_approved IN (0, 1)),
    pricing_approved_at TIMESTAMP,

    payment_received INTEGER DEFAULT 0 CHECK(payment_received IN (0, 1)),
    payment_received_at TIMESTAMP,

    database_provisioning_started INTEGER DEFAULT 0 CHECK(database_provisioning_started IN (0, 1)),
    database_provisioning_started_at TIMESTAMP,

    database_provisioned INTEGER DEFAULT 0 CHECK(database_provisioned IN (0, 1)),
    database_provisioned_at TIMESTAMP,

    credentials_sent INTEGER DEFAULT 0 CHECK(credentials_sent IN (0, 1)),
    credentials_sent_at TIMESTAMP,

    customer_confirmed_access INTEGER DEFAULT 0 CHECK(customer_confirmed_access IN (0, 1)),
    customer_confirmed_access_at TIMESTAMP,

    migration_started INTEGER DEFAULT 0 CHECK(migration_started IN (0, 1)),
    migration_started_at TIMESTAMP,

    migration_completed INTEGER DEFAULT 0 CHECK(migration_completed IN (0, 1)),
    migration_completed_at TIMESTAMP,

    go_live INTEGER DEFAULT 0 CHECK(go_live IN (0, 1)),
    go_live_at TIMESTAMP,

    -- Current stage summary
    current_stage TEXT CHECK(
        current_stage IN (
            'form_submitted',
            'consultation_scheduled',
            'consultation_completed',
            'pricing_approved',
            'payment_received',
            'provisioning',
            'credentials_sent',
            'migration',
            'active'
        )
    ),

    -- Blockers and notes
    blocked INTEGER DEFAULT 0 CHECK(blocked IN (0, 1)),
    blocker_reason TEXT,
    workflow_notes TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraint
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,

    -- Ensure one workflow per customer
    UNIQUE(customer_id)
);

-- Indexes for customer_workflow table
CREATE INDEX IF NOT EXISTS idx_workflow_customer_id ON customer_workflow(customer_id);
CREATE INDEX IF NOT EXISTS idx_workflow_stage ON customer_workflow(current_stage);
CREATE INDEX IF NOT EXISTS idx_workflow_blocked ON customer_workflow(blocked);

-- =====================================================
-- TABLE 8: NOTES
-- =====================================================
-- General notes and internal communications about customers

CREATE TABLE IF NOT EXISTS notes (
    -- Primary identification
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,

    -- Note details
    note_type TEXT CHECK(
        note_type IN ('general', 'technical', 'billing', 'sales', 'incident', 'meeting')
    ),
    subject TEXT,
    note_text TEXT NOT NULL,

    -- Author
    created_by TEXT NOT NULL, -- Email of person creating note

    -- Flags
    is_important INTEGER DEFAULT 0 CHECK(is_important IN (0, 1)),
    is_follow_up INTEGER DEFAULT 0 CHECK(is_follow_up IN (0, 1)),
    follow_up_date DATE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraint
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Indexes for notes table
CREATE INDEX IF NOT EXISTS idx_notes_customer_id ON notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(note_type);
CREATE INDEX IF NOT EXISTS idx_notes_important ON notes(is_important);
CREATE INDEX IF NOT EXISTS idx_notes_follow_up ON notes(is_follow_up, follow_up_date);
CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at);

-- =====================================================
-- TABLE 9: ACTIVITY_LOG
-- =====================================================
-- Audit trail of all important actions in the system

CREATE TABLE IF NOT EXISTS activity_log (
    -- Primary identification
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Related entity
    customer_id INTEGER, -- Can be NULL for system-level events
    entity_type TEXT, -- customer, database, billing, support_ticket, etc.
    entity_id INTEGER,

    -- Action details
    action_type TEXT NOT NULL, -- created, updated, deleted, status_changed, etc.
    action_description TEXT NOT NULL,

    -- Before/after states (stored as JSON)
    old_values TEXT, -- JSON of changed fields before
    new_values TEXT, -- JSON of changed fields after

    -- Actor
    performed_by TEXT NOT NULL, -- Email or system identifier

    -- Context
    ip_address TEXT,
    user_agent TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraint (optional, can be NULL)
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- Indexes for activity_log table
CREATE INDEX IF NOT EXISTS idx_activity_customer_id ON activity_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_performed_by ON activity_log(performed_by);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- =====================================================

-- Trigger for customers table
CREATE TRIGGER IF NOT EXISTS update_customers_timestamp
AFTER UPDATE ON customers
FOR EACH ROW
BEGIN
    UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger for databases table
CREATE TRIGGER IF NOT EXISTS update_databases_timestamp
AFTER UPDATE ON databases
FOR EACH ROW
BEGIN
    UPDATE databases SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger for billing table
CREATE TRIGGER IF NOT EXISTS update_billing_timestamp
AFTER UPDATE ON billing
FOR EACH ROW
BEGIN
    UPDATE billing SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger for invoices table
CREATE TRIGGER IF NOT EXISTS update_invoices_timestamp
AFTER UPDATE ON invoices
FOR EACH ROW
BEGIN
    UPDATE invoices SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger for support_tickets table
CREATE TRIGGER IF NOT EXISTS update_support_tickets_timestamp
AFTER UPDATE ON support_tickets
FOR EACH ROW
BEGIN
    UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger for customer_workflow table
CREATE TRIGGER IF NOT EXISTS update_workflow_timestamp
AFTER UPDATE ON customer_workflow
FOR EACH ROW
BEGIN
    UPDATE customer_workflow SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger for notes table
CREATE TRIGGER IF NOT EXISTS update_notes_timestamp
AFTER UPDATE ON notes
FOR EACH ROW
BEGIN
    UPDATE notes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Active customers with current billing information
CREATE VIEW IF NOT EXISTS v_active_customers AS
SELECT
    c.id,
    c.customer_id,
    c.company_name,
    c.contact_email,
    c.tier,
    c.status,
    c.infrastructure_provider,
    b.total_monthly_rate,
    b.payment_status,
    b.next_billing_date,
    d.database_name,
    d.provision_status,
    d.health_status,
    c.created_at,
    c.activated_at
FROM customers c
LEFT JOIN billing b ON c.id = b.customer_id
LEFT JOIN databases d ON c.id = d.customer_id
WHERE c.is_active = 1 AND c.status = 'active';

-- Customers by revenue (highest paying first)
CREATE VIEW IF NOT EXISTS v_customers_by_revenue AS
SELECT
    c.id,
    c.customer_id,
    c.company_name,
    c.tier,
    b.total_monthly_rate,
    c.created_at,
    JULIANDAY('now') - JULIANDAY(c.activated_at) as days_active,
    ROUND((JULIANDAY('now') - JULIANDAY(c.activated_at)) / 30.0 * b.total_monthly_rate, 2) as lifetime_value
FROM customers c
JOIN billing b ON c.id = b.customer_id
WHERE c.is_active = 1 AND c.status = 'active'
ORDER BY b.total_monthly_rate DESC;

-- Open support tickets summary
CREATE VIEW IF NOT EXISTS v_open_support_tickets AS
SELECT
    st.id,
    st.ticket_number,
    st.subject,
    st.ticket_type,
    st.priority,
    st.status,
    st.assigned_to,
    c.company_name,
    c.contact_email,
    c.tier,
    st.created_at,
    st.sla_response_hours,
    st.first_response_at,
    CASE
        WHEN st.first_response_at IS NULL
        THEN ROUND((JULIANDAY('now') - JULIANDAY(st.created_at)) * 24, 1)
        ELSE NULL
    END as hours_open
FROM support_tickets st
JOIN customers c ON st.customer_id = c.id
WHERE st.status IN ('open', 'in_progress', 'waiting_customer', 'waiting_internal')
ORDER BY st.priority DESC, st.created_at ASC;

-- Customers in onboarding pipeline
CREATE VIEW IF NOT EXISTS v_onboarding_pipeline AS
SELECT
    c.id,
    c.customer_id,
    c.company_name,
    c.contact_email,
    c.tier,
    c.status,
    w.current_stage,
    w.blocked,
    w.blocker_reason,
    c.created_at,
    JULIANDAY('now') - JULIANDAY(c.created_at) as days_in_pipeline
FROM customers c
JOIN customer_workflow w ON c.id = w.customer_id
WHERE c.status IN ('prospect', 'consultation', 'approved', 'provisioning')
ORDER BY c.created_at ASC;

-- Monthly recurring revenue (MRR) summary
CREATE VIEW IF NOT EXISTS v_mrr_summary AS
SELECT
    COUNT(DISTINCT c.id) as active_customers,
    SUM(b.total_monthly_rate) as total_mrr,
    AVG(b.total_monthly_rate) as avg_revenue_per_customer,
    SUM(CASE WHEN c.tier = 'Shared' THEN b.total_monthly_rate ELSE 0 END) as shared_mrr,
    SUM(CASE WHEN c.tier = 'Dedicated' THEN b.total_monthly_rate ELSE 0 END) as dedicated_mrr,
    SUM(CASE WHEN c.tier = 'Pro' THEN b.total_monthly_rate ELSE 0 END) as pro_mrr,
    SUM(CASE WHEN c.tier = 'Enterprise' THEN b.total_monthly_rate ELSE 0 END) as enterprise_mrr
FROM customers c
JOIN billing b ON c.id = b.customer_id
WHERE c.is_active = 1 AND c.status = 'active';

-- =====================================================
-- SAMPLE DATA INSERTION EXAMPLES
-- =====================================================

-- Example 1: New customer (prospect stage)
/*
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
*/

-- Example 2: Create workflow for new customer
/*
INSERT INTO customer_workflow (customer_id, current_stage, form_submitted, form_submitted_at)
SELECT id, 'form_submitted', 1, CURRENT_TIMESTAMP
FROM customers WHERE customer_id = 'acme-corp-20251020';
*/

-- Example 3: Provision database for customer
/*
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
*/

-- Example 4: Create billing record
/*
INSERT INTO billing (
    customer_id, billing_cycle, billing_day, next_billing_date,
    payment_method, base_tier_price, total_monthly_rate, payment_status
)
SELECT
    id, 'monthly', 20, DATE('now', '+1 month'),
    'stripe', 89.00, 89.00, 'current'
FROM customers WHERE customer_id = 'acme-corp-20251020';
*/

-- Example 5: Create support ticket
/*
INSERT INTO support_tickets (
    customer_id, ticket_number, subject, description, ticket_type, priority, status
)
SELECT
    id, 'TICKET-20251020-001',
    'Help with connection pooling',
    'We are experiencing connection pool exhaustion during peak hours.',
    'technical', 'high', 'open'
FROM customers WHERE customer_id = 'acme-corp-20251020';
*/

-- =====================================================
-- SAMPLE QUERIES
-- =====================================================

-- Query 1: Get all active customers with database health
/*
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
*/

-- Query 2: Find overdue invoices
/*
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
*/

-- Query 3: Customer lifetime value
/*
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
*/

-- Query 4: Support ticket response time analysis
/*
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
*/

-- Query 5: Monthly revenue breakdown
/*
SELECT
    strftime('%Y-%m', c.activated_at) as month,
    COUNT(*) as new_customers,
    SUM(b.total_monthly_rate) as new_mrr
FROM customers c
JOIN billing b ON c.id = b.customer_id
WHERE c.activated_at IS NOT NULL
GROUP BY month
ORDER BY month DESC;
*/

-- =====================================================
-- END OF SCHEMA
-- =====================================================
