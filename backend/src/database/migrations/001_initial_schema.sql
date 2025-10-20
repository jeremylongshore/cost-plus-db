-- Migration: 001_initial_schema
-- Created: 2025-10-20
-- Description: Initial database schema with all core tables
--
-- This migration creates the foundational tables for CostPlusDB:
-- - customers: Customer accounts and contact information
-- - customer_databases: PostgreSQL databases provisioned for customers
-- - billing_records: Payment and invoice tracking
-- - support_tickets: Customer support ticket system
-- - activity_log: Audit trail for all actions
--
-- Note: This schema is designed for SQLite but compatible with PostgreSQL
-- for future migration when customer count exceeds 5,000.

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ============================================================================
-- CUSTOMERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL CHECK(tier IN ('shared', 'dedicated', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'prospect' CHECK(status IN ('prospect', 'consultation', 'approved', 'provisioning', 'active', 'suspended', 'churned')),
  contact_name TEXT,
  phone TEXT,
  website TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookups
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_tier ON customers(tier);

-- ============================================================================
-- CUSTOMER DATABASES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_databases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  database_name TEXT NOT NULL UNIQUE,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 5432,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  ssl_enabled BOOLEAN NOT NULL DEFAULT 1,
  connection_limit INTEGER NOT NULL DEFAULT 20,
  storage_gb INTEGER NOT NULL,
  backup_enabled BOOLEAN NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_customer_databases_customer_id ON customer_databases(customer_id);
CREATE INDEX idx_customer_databases_database_name ON customer_databases(database_name);

-- ============================================================================
-- BILLING RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS billing_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'failed', 'refunded')),
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  billing_period_start TEXT NOT NULL,
  billing_period_end TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_billing_customer_id ON billing_records(customer_id);
CREATE INDEX idx_billing_status ON billing_records(status);
CREATE INDEX idx_billing_stripe_invoice_id ON billing_records(stripe_invoice_id);

-- ============================================================================
-- SUPPORT TICKETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_support_customer_id ON support_tickets(customer_id);
CREATE INDEX idx_support_status ON support_tickets(status);
CREATE INDEX idx_support_priority ON support_tickets(priority);

-- ============================================================================
-- ACTIVITY LOG TABLE (Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id INTEGER,
  details TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_activity_customer_id ON activity_log(customer_id);
CREATE INDEX idx_activity_actor ON activity_log(actor);
CREATE INDEX idx_activity_created_at ON activity_log(created_at);

-- ============================================================================
-- SCHEMA MIGRATIONS TABLE
-- ============================================================================
-- This table is created by the migration runner, but we ensure it exists here
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Record this migration
INSERT INTO schema_migrations (version, description, applied_at)
VALUES (1, 'Initial schema with core tables', CURRENT_TIMESTAMP)
ON CONFLICT(version) DO NOTHING;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Customers updated_at trigger
CREATE TRIGGER IF NOT EXISTS trigger_customers_updated_at
AFTER UPDATE ON customers
BEGIN
  UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Customer databases updated_at trigger
CREATE TRIGGER IF NOT EXISTS trigger_customer_databases_updated_at
AFTER UPDATE ON customer_databases
BEGIN
  UPDATE customer_databases SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Billing records updated_at trigger
CREATE TRIGGER IF NOT EXISTS trigger_billing_records_updated_at
AFTER UPDATE ON billing_records
BEGIN
  UPDATE billing_records SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Support tickets updated_at trigger
CREATE TRIGGER IF NOT EXISTS trigger_support_tickets_updated_at
AFTER UPDATE ON support_tickets
BEGIN
  UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
