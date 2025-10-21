-- =====================================================
-- Migration: Create Admin Users Table
-- =====================================================
-- Version: 001
-- Created: 2025-10-20
-- Purpose: Add admin_users table for Passport.js authentication
-- Phase: Phase 2 - Authentication Implementation
-- =====================================================

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
    -- Primary identification
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Authentication credentials
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, -- Argon2id hash

    -- Profile information
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('admin', 'super_admin')),

    -- Account status
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),

    -- Security tracking
    last_login_at TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP, -- Account lockout (after 5 failed attempts)

    -- Audit trail
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'system',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT DEFAULT 'system',

    -- Password management
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    require_password_change INTEGER DEFAULT 0 CHECK(require_password_change IN (0, 1))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_admin_users_timestamp
AFTER UPDATE ON admin_users
FOR EACH ROW
BEGIN
    UPDATE admin_users
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- Record migration
INSERT INTO schema_migrations (version, description, applied_by)
VALUES ('001', 'Create admin_users table for Passport.js authentication', 'Phase 2 - Authentication')
ON CONFLICT(version) DO NOTHING;
