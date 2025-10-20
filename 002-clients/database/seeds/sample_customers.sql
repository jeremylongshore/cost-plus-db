-- Sample Customer Data for Testing
-- DO NOT USE IN PRODUCTION
-- This file contains fake data for development and testing only

-- Clear existing test data (optional, uncomment if needed)
-- DELETE FROM activity_log WHERE customer_id LIKE 'TEST-%';
-- DELETE FROM databases WHERE customer_id LIKE 'TEST-%';
-- DELETE FROM customers WHERE customer_id LIKE 'TEST-%';

-- ============================================================================
-- SAMPLE CUSTOMERS
-- ============================================================================

-- Test Customer 1: Active Shared Tier
INSERT INTO customers (
    customer_id, email, company_name, contact_name, phone,
    tier, status, database_name, database_status,
    monthly_price, billing_cycle_day,
    storage_gb, connection_limit, backup_retention_days,
    vps_location,
    created_at, activated_at,
    notes
) VALUES (
    'TEST-20251001-001',
    'john.doe@acmestartup.com',
    'Acme Startup Inc',
    'John Doe',
    '+1-555-0101',
    'shared',
    'active',
    'acme_startup_prod',
    'active',
    49.00,
    1,
    10,
    25,
    30,
    'contabo-us-west',
    '2025-10-01 10:00:00',
    '2025-10-01 14:30:00',
    'First test customer - shared tier'
);

-- Test Customer 2: Active Dedicated Tier
INSERT INTO customers (
    customer_id, email, company_name, contact_name, phone,
    tier, status, database_name, database_status,
    monthly_price, billing_cycle_day,
    storage_gb, connection_limit, backup_retention_days,
    vps_location,
    created_at, activated_at,
    notes
) VALUES (
    'TEST-20251002-002',
    'sarah.chen@techcorp.io',
    'TechCorp Solutions',
    'Sarah Chen',
    '+1-555-0202',
    'dedicated',
    'active',
    'techcorp_main',
    'active',
    89.00,
    15,
    50,
    100,
    90,
    'contabo-europe',
    '2025-10-02 09:15:00',
    '2025-10-02 16:00:00',
    'Migrated from AWS RDS - dedicated tier'
);

-- Test Customer 3: Prospect (Not Yet Paid)
INSERT INTO customers (
    customer_id, email, company_name, contact_name, phone,
    tier, status,
    monthly_price,
    storage_gb, connection_limit,
    created_at,
    notes
) VALUES (
    'TEST-20251015-003',
    'mike.wilson@cloudservices.com',
    'Cloud Services LLC',
    'Mike Wilson',
    '+1-555-0303',
    'pro',
    'prospect',
    129.00,
    100,
    200,
    '2025-10-15 11:30:00',
    'Interested in Pro tier - awaiting payment'
);

-- Test Customer 4: Active Pro Tier
INSERT INTO customers (
    customer_id, email, company_name, contact_name, phone,
    tier, status, database_name, database_status,
    monthly_price, billing_cycle_day,
    storage_gb, connection_limit, backup_retention_days,
    vps_location,
    created_at, activated_at,
    notes
) VALUES (
    'TEST-20251010-004',
    'lisa.brown@dataanalytics.co',
    'Data Analytics Co',
    'Lisa Brown',
    '+1-555-0404',
    'pro',
    'active',
    'dataanalytics_warehouse',
    'active',
    129.00,
    10,
    100,
    200,
    90,
    'contabo-asia',
    '2025-10-10 13:45:00',
    '2025-10-10 17:20:00',
    'Heavy analytics workload - Pro tier'
);

-- Test Customer 5: Suspended Account
INSERT INTO customers (
    customer_id, email, company_name, contact_name, phone,
    tier, status, database_name, database_status,
    monthly_price, billing_cycle_day,
    storage_gb, connection_limit, backup_retention_days,
    vps_location,
    created_at, activated_at, suspended_at,
    notes
) VALUES (
    'TEST-20250801-005',
    'payment.failed@example.com',
    'Example Corp',
    'Jane Smith',
    '+1-555-0505',
    'shared',
    'suspended',
    'example_corp_db',
    'suspended',
    49.00,
    1,
    10,
    25,
    30,
    'contabo-us-east',
    '2025-08-01 08:00:00',
    '2025-08-01 12:00:00',
    '2025-10-18 09:00:00',
    'Suspended due to failed payment - 3rd attempt'
);

-- ============================================================================
-- SAMPLE DATABASES
-- ============================================================================

INSERT INTO databases (
    customer_id, database_name, host, port, username, ssl_enabled,
    status, provisioned_at, vps_id,
    backup_enabled, backup_location, last_backup_at,
    storage_used_mb, last_connection_at
) VALUES
(
    'TEST-20251001-001',
    'acme_startup_prod',
    'db1.costplusdb.com',
    5432,
    'acme_user',
    1,
    'active',
    '2025-10-01 14:30:00',
    'vps-usw-001',
    1,
    's3://wasabi-backups/acme_startup_prod',
    '2025-10-20 02:00:00',
    2048,
    '2025-10-20 08:15:00'
),
(
    'TEST-20251002-002',
    'techcorp_main',
    'db2.costplusdb.com',
    5432,
    'techcorp_admin',
    1,
    'active',
    '2025-10-02 16:00:00',
    'vps-eu-001',
    1,
    's3://wasabi-backups/techcorp_main',
    '2025-10-20 01:00:00',
    15360,
    '2025-10-20 09:30:00'
),
(
    'TEST-20251010-004',
    'dataanalytics_warehouse',
    'db3.costplusdb.com',
    5432,
    'dataanalytics_rw',
    1,
    'active',
    '2025-10-10 17:20:00',
    'vps-asia-001',
    1,
    's3://wasabi-backups/dataanalytics_warehouse',
    '2025-10-20 00:30:00',
    40960,
    '2025-10-20 07:45:00'
),
(
    'TEST-20250801-005',
    'example_corp_db',
    'db1.costplusdb.com',
    5432,
    'example_user',
    1,
    'suspended',
    '2025-08-01 12:00:00',
    'vps-use-001',
    1,
    's3://wasabi-backups/example_corp_db',
    '2025-10-18 02:00:00',
    512,
    '2025-10-17 14:22:00'
);

-- ============================================================================
-- SAMPLE FORM SUBMISSIONS
-- ============================================================================

INSERT INTO form_submissions (
    submission_id, form_type, email, name, company, phone,
    form_data, status, processed_at, converted_to_customer_id,
    ip_address, user_agent,
    submitted_at
) VALUES
(
    'FORM-20251015-001',
    'customer-intake',
    'mike.wilson@cloudservices.com',
    'Mike Wilson',
    'Cloud Services LLC',
    '+1-555-0303',
    '{"tier":"pro","storage":"100GB","use_case":"SaaS application backend","monthly_queries":"high"}',
    'converted',
    '2025-10-15 11:35:00',
    'TEST-20251015-003',
    '203.0.113.45',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    '2025-10-15 11:30:00'
),
(
    'FORM-20251018-002',
    'customer-intake',
    'alex.rodriguez@newstartup.io',
    'Alex Rodriguez',
    'New Startup Inc',
    '+1-555-0606',
    '{"tier":"shared","storage":"10GB","use_case":"MVP development","monthly_queries":"low"}',
    'pending',
    NULL,
    NULL,
    '198.51.100.89',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    '2025-10-18 15:20:00'
);

-- ============================================================================
-- SAMPLE ACTIVITY LOG
-- ============================================================================

INSERT INTO activity_log (customer_id, action, description, actor, metadata) VALUES
('TEST-20251001-001', 'customer_created', 'Customer record created', 'system', NULL),
('TEST-20251001-001', 'status_changed', 'Status changed from prospect to active', 'system', '{"old_status":"prospect","new_status":"active"}'),
('TEST-20251001-001', 'database_provisioned', 'PostgreSQL database provisioned', 'provision-script', '{"database":"acme_startup_prod","vps":"vps-usw-001"}'),
('TEST-20251001-001', 'credentials_sent', 'Setup confirmation email sent', 'send-setup-email', NULL),

('TEST-20251002-002', 'customer_created', 'Customer record created', 'system', NULL),
('TEST-20251002-002', 'status_changed', 'Status changed from prospect to active', 'system', '{"old_status":"prospect","new_status":"active"}'),
('TEST-20251002-002', 'database_provisioned', 'PostgreSQL database provisioned', 'provision-script', '{"database":"techcorp_main","vps":"vps-eu-001"}'),

('TEST-20251015-003', 'customer_created', 'Customer record created from form submission', 'process-intake-form', '{"form_id":"FORM-20251015-001"}'),

('TEST-20250801-005', 'customer_created', 'Customer record created', 'system', NULL),
('TEST-20250801-005', 'status_changed', 'Status changed from prospect to active', 'system', '{"old_status":"prospect","new_status":"active"}'),
('TEST-20250801-005', 'payment_failed', 'Payment attempt failed', 'stripe-webhook', '{"attempt":3,"reason":"insufficient_funds"}'),
('TEST-20250801-005', 'status_changed', 'Status changed from active to suspended', 'admin', '{"reason":"payment_failure","old_status":"active","new_status":"suspended"}');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify sample data loaded correctly
SELECT 'Sample data loaded successfully' as status;

SELECT
    (SELECT COUNT(*) FROM customers WHERE customer_id LIKE 'TEST-%') as test_customers,
    (SELECT COUNT(*) FROM databases WHERE customer_id LIKE 'TEST-%') as test_databases,
    (SELECT COUNT(*) FROM form_submissions) as form_submissions,
    (SELECT COUNT(*) FROM activity_log WHERE customer_id LIKE 'TEST-%') as activity_entries;

-- Show active customers
SELECT customer_id, email, company_name, tier, status FROM customers WHERE status = 'active';
