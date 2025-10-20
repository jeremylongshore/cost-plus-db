-- Migration 001: Initial Schema
-- Created: 2025-10-20
-- Description: Creates initial database structure for CostPlusDB customer management

-- This migration is identical to schema.sql for the initial setup
-- Future migrations will build on this foundation

-- Migration is applied by running schema.sql
-- This file serves as a reference point for the initial state

-- Version tracking
INSERT OR IGNORE INTO schema_version (version, description)
VALUES (1, 'Initial schema - customers, databases, form_submissions, activity_log tables');

-- Migration complete
SELECT 'Migration 001 applied: Initial schema' as status;
