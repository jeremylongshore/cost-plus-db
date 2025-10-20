-- Migration: 002_customer_workflow
-- Created: 2025-10-20
-- Description: Add customer_workflow table for 12-checkpoint onboarding journey
--
-- This migration creates the customer_workflow table to track the complete
-- customer journey from form submission through three-month milestone.

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ============================================================================
-- CUSTOMER WORKFLOW TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_workflow (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL UNIQUE,
  current_stage TEXT NOT NULL DEFAULT 'form_submitted',

  -- 12 Checkpoint timestamps
  form_submitted TEXT,
  consultation_scheduled TEXT,
  consultation_completed TEXT,
  payment_link_sent TEXT,
  payment_received TEXT,
  provisioning_started TEXT,
  database_created TEXT,
  backups_configured TEXT,
  credentials_sent TEXT,
  onboarding_completed TEXT,
  first_month_milestone TEXT,
  three_month_milestone TEXT,

  -- Blocker tracking
  is_blocked BOOLEAN NOT NULL DEFAULT 0,
  blocker_type TEXT,
  blocker_reason TEXT,
  blocker_set_at TEXT,

  -- Metadata
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_workflow_customer_id ON customer_workflow(customer_id);
CREATE INDEX idx_workflow_current_stage ON customer_workflow(current_stage);
CREATE INDEX idx_workflow_is_blocked ON customer_workflow(is_blocked);

-- Updated_at trigger
CREATE TRIGGER IF NOT EXISTS trigger_customer_workflow_updated_at
AFTER UPDATE ON customer_workflow
BEGIN
  UPDATE customer_workflow SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Record this migration
INSERT INTO schema_migrations (version, description, applied_at)
VALUES (2, 'Add customer_workflow table for onboarding checkpoints', CURRENT_TIMESTAMP)
ON CONFLICT(version) DO NOTHING;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
