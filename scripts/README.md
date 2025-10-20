# CostPlusDB Automation Scripts

Complete automation suite for CostPlusDB managed PostgreSQL service provisioning, backup, sync, and webhook handling.

## Overview

This directory contains 8 production-ready automation scripts organized into three categories:

- **Provisioning Scripts** (4) - Customer database provisioning and verification
- **Sync Scripts** (2) - Database backup and cloud synchronization
- **Webhook Handlers** (2) - Payment processing and GitHub Actions integration

All scripts are:
- ✓ Idempotent (safe to run multiple times)
- ✓ Error-handled with comprehensive logging
- ✓ Email-alerting on failures (via Resend)
- ✓ JSON output for automation pipelines
- ✓ Proper exit codes (0 = success, 1+ = failure)

---

## Provisioning Scripts (`provision/`)

### 1. provision-customer-database.sh

**Purpose:** Complete automated PostgreSQL database provisioning for new customers.

**Usage:**
```bash
./provision/provision-customer-database.sh CUSTOMER_ID DATABASE_NAME TIER
```

**Example:**
```bash
./provision/provision-customer-database.sh acme-corp-20251020 acme_production Dedicated
```

**What it does:**
1. Validates inputs and checks prerequisites
2. Generates secure 32-character password
3. Creates PostgreSQL user with connection limits
4. Creates isolated PostgreSQL database with SSL
5. Configures granular permissions (no superuser)
6. Adds pg_hba.conf entry requiring SSL
7. Sets up pgBackRest backups
8. Tests database connection
9. Updates SQLite customer database
10. Sends provisioning email notification
11. Outputs JSON with credentials

**Key Features:**
- Automatic rollback on failure
- Connection limits based on tier (Shared: 20, Dedicated: 50, Pro: 100, Enterprise: 200)
- SSL/TLS enforced for all connections
- Comprehensive logging to `002-clients/logs/provisioning.log`
- Credentials saved to `002-clients/customers/active/{CUSTOMER_ID}/credentials.txt`

**Exit Codes:**
- `0` - Success
- `1` - Validation error, PostgreSQL error, or provisioning failure

---

### 2. generate-credentials.sh

**Purpose:** Generate secure database credentials with high-entropy passwords.

**Usage:**
```bash
./provision/generate-credentials.sh DATABASE_NAME [--ssl-cert]
```

**Example:**
```bash
./provision/generate-credentials.sh acme_production
./provision/generate-credentials.sh acme_production --ssl-cert
```

**What it does:**
1. Generates 32-character password with mixed case, digits, and symbols
2. Creates PostgreSQL-compatible password hash
3. Generates multiple connection string formats (standard, psql, .env)
4. Optionally generates SSL client certificates
5. Saves credentials to encrypted file
6. Outputs JSON with all credential details

**Key Features:**
- Uses OpenSSL for cryptographically secure random generation
- Ensures password complexity (uppercase, lowercase, digit, special char)
- Multiple connection string formats for flexibility
- Self-signed SSL certificate generation (1-year validity)
- Credentials stored in `002-clients/customers/active/_credentials_{DATABASE_NAME}_{TIMESTAMP}.txt`

**Output JSON Fields:**
```json
{
  "database_name": "acme_production",
  "database_user": "acme_production_user",
  "database_password": "secure_password_here",
  "password_hash": "sha256_hash",
  "server": { "hostname": "...", "ip_address": "...", "port": 5432 },
  "connection_strings": { "standard": "...", "psql": "...", "env": "..." },
  "ssl": { "enabled": true, "certificate_generated": true },
  "credentials_file": "...",
  "generated_at": "2025-10-20T10:45:00Z"
}
```

---

### 3. configure-backups.sh

**Purpose:** Configure automated backups with pgBackRest and Wasabi S3.

**Usage:**
```bash
./provision/configure-backups.sh DATABASE_NAME
```

**Example:**
```bash
./provision/configure-backups.sh acme_production
```

**What it does:**
1. Validates database exists in PostgreSQL
2. Checks/creates pgBackRest stanza
3. Configures backup schedule (daily full, hourly incremental)
4. Sets retention policy (30 days full, 7 days differential)
5. Performs immediate test backup
6. Verifies backup integrity
7. Creates cron jobs for automation
8. Creates monitoring script for backup health
9. Updates SQLite database with backup status

**Backup Schedule:**
- **Full Backup:** Daily at 1 AM
- **Incremental Backup:** Every hour (except during full backup)
- **Retention:** 30 days (full), 7 days (differential)

**Key Features:**
- Automatic stanza creation if not initialized
- Immediate backup verification
- Backup monitoring script created at `/var/log/pgbackrest/check-{DATABASE_NAME}-backup.sh`
- Cron jobs configured in `/etc/cron.d/pgbackrest-costplusdb-main`
- Logs to `002-clients/logs/backup-configuration.log`

**Exit Codes:**
- `0` - Success
- `1` - pgBackRest not installed, database not found, or backup failed

---

### 4. verify-provisioning.sh

**Purpose:** Comprehensive 6-point verification checklist for provisioned databases.

**Usage:**
```bash
./provision/verify-provisioning.sh DATABASE_NAME
```

**Example:**
```bash
./provision/verify-provisioning.sh acme_production
```

**6-Point Verification Checklist:**

1. **Database Exists**
   - ✓ Database present in PostgreSQL
   - ✓ Correct owner and encoding

2. **User Can Connect**
   - ✓ Connection successful with credentials
   - ✓ Current user matches expected

3. **Permissions Configured**
   - ✓ User is NOT superuser (security)
   - ✓ Connection limit set
   - ✓ Schema permissions granted

4. **SSL/TLS Enforced**
   - ✓ SSL enabled in PostgreSQL
   - ✓ hostssl entry in pg_hba.conf

5. **Backup Configured**
   - ✓ pgBackRest installed and stanza valid
   - ✓ Recent backup exists (< 26 hours old)
   - ✓ Automated backup cron jobs configured

6. **Health Check Passes**
   - ✓ Database accepting connections
   - ✓ Database size query works
   - ✓ Table creation/deletion test succeeds
   - ✓ Database not in recovery mode

**Output:**
```
==========================================
Verification Summary
==========================================
Total Checks: 15
Passed: 15
Failed: 0

✓ ALL CHECKS PASSED

Database 'acme_production' is fully provisioned and operational.
```

**Exit Codes:**
- `0` - All checks passed
- `1` - One or more checks failed

**Logs:** `002-clients/logs/provisioning-verification.log`

---

## Sync Scripts (`sync/`)

### 5. sync-to-turso.sh

**Purpose:** Replicate local SQLite customer database to Turso cloud for redundancy.

**Usage:**
```bash
./sync/sync-to-turso.sh [--full|--incremental]
```

**Example:**
```bash
./sync/sync-to-turso.sh --incremental  # Default: sync only changes
./sync/sync-to-turso.sh --full         # Complete database dump
```

**Sync Modes:**

**Incremental Sync (Default):**
- Syncs only rows changed since last sync (based on `updated_at` timestamp)
- Fast and efficient for regular synchronization
- Tracks last sync timestamp in `.turso-sync-state`

**Full Sync:**
- Complete database dump and restore
- Used for initial sync or recovery
- Slower but ensures complete consistency

**Tables Synced:**
- `customers`, `databases`, `billing`, `invoices`
- `support_tickets`, `customer_workflow`, `notes`
- `activity_log` (insert-only, no updates)

**Key Features:**
- Automatic mode selection (full if no previous sync)
- Turso CLI integration
- Row count and duration tracking
- Sync state persistence
- Graceful handling if Turso not configured

**Scheduling:**
Add to crontab for automated sync every 5 minutes:
```bash
*/5 * * * * /home/admincostplus/projects/costplusdb/scripts/sync/sync-to-turso.sh --incremental >> /home/admincostplus/projects/costplusdb/002-clients/logs/turso-sync.log 2>&1
```

**Environment Variables Required:**
```bash
TURSO_DATABASE_URL="libsql://your-database.turso.io"
TURSO_AUTH_TOKEN="your_auth_token_here"
```

**Exit Codes:**
- `0` - Sync successful or Turso not configured
- `1` - Sync failed

---

### 6. backup-local-db.sh

**Purpose:** Create compressed backups of local SQLite customer database.

**Usage:**
```bash
./sync/backup-local-db.sh
```

**What it does:**
1. Validates database integrity (`PRAGMA integrity_check`)
2. Creates SQLite backup using `.backup` command
3. Verifies backup integrity
4. Compresses backup with gzip (level 9)
5. Optionally uploads to Wasabi S3
6. Deletes old backups (keeps last 30)
7. Sends weekly email summary (Sundays)

**Backup Details:**
- **Location:** `002-clients/database/backups/`
- **Format:** `costplusdb-YYYYMMDD-HHMMSS.db.gz`
- **Compression:** gzip level 9 (typically 70-90% reduction)
- **Retention:** Last 30 backups
- **Logs:** `002-clients/logs/database-backup.log`

**Wasabi S3 Upload (Optional):**
If configured, backups are uploaded to:
```
s3://costplusdb-backups/customer-db-backups/costplusdb-YYYYMMDD-HHMMSS.db.gz
```

**Environment Variables (Optional):**
```bash
WASABI_ENDPOINT="s3.us-east-1.wasabisys.com"
WASABI_BUCKET="costplusdb-backups"
WASABI_ACCESS_KEY="your_access_key"
WASABI_SECRET_KEY="your_secret_key"
```

**Scheduling:**
Add to crontab for daily backups at 2 AM:
```bash
0 2 * * * /home/admincostplus/projects/costplusdb/scripts/sync/backup-local-db.sh >> /home/admincostplus/projects/costplusdb/002-clients/logs/database-backup.log 2>&1
```

**Exit Codes:**
- `0` - Backup successful
- `1` - Database not found, locked, or backup failed

---

## Webhook Handlers (`webhooks/`)

### 7. stripe-payment-success.sh

**Purpose:** Process successful Stripe payments and trigger database provisioning.

**Usage:**
```bash
./webhooks/stripe-payment-success.sh CUSTOMER_ID PAYMENT_INTENT_ID
```

**Example:**
```bash
./webhooks/stripe-payment-success.sh acme-corp-20251020 pi_3MtwBwLkdIwHu7ix28a3tqPa
```

**Integration:**
This script is called by the backend webhook handler when Stripe sends a `payment_intent.succeeded` event.

**What it does:**
1. Validates customer exists in database
2. Retrieves customer details (company name, email, tier)
3. Updates customer status to 'provisioning'
4. Updates workflow checkpoint (payment_received = 1)
5. Logs payment in activity_log
6. Sends "provisioning started" email to customer
7. Triggers database provisioning script in background
8. Sends admin notification email
9. Outputs JSON response

**Email Notifications:**
- **Customer Email:** "Payment Received - Database Provisioning Started"
- **Admin Email:** "New Customer Payment: {Company Name}"

**Database Updates:**
- Customer status: `provisioning`
- Workflow stage: `payment_received`
- Activity log entry with payment intent ID

**Background Provisioning:**
Launches `provision-customer-database.sh` in background with nohup:
```bash
nohup ./provision/provision-customer-database.sh CUSTOMER_ID DATABASE_NAME TIER >> logs/provisioning.log 2>&1 &
```

**Key Features:**
- Non-blocking (returns immediately, provisioning runs in background)
- Comprehensive logging to `002-clients/logs/stripe-webhooks.log`
- Error alerts sent via email
- JSON output for webhook response

**Exit Codes:**
- `0` - Payment processed and provisioning started
- `1` - Customer not found or database error

---

### 8. github-action-trigger.sh

**Purpose:** Trigger GitHub Actions workflows via API for CI/CD automation.

**Usage:**
```bash
./webhooks/github-action-trigger.sh ACTION CUSTOMER_ID [--wait]
```

**Example:**
```bash
./webhooks/github-action-trigger.sh provision-database acme-corp-20251020
./webhooks/github-action-trigger.sh health-check all --wait
```

**Available Actions:**
- `provision-database` - Provision new customer database
- `run-backup` - Trigger database backup
- `health-check` - Run system health check
- `security-scan` - Run security vulnerability scan
- `deploy-backend` - Deploy backend application

**Modes:**

**Trigger Only (Default):**
- Triggers workflow and returns immediately
- Use for fire-and-forget automation

**Wait Mode (`--wait`):**
- Triggers workflow and waits for completion
- Polls status every 10 seconds
- Timeout after 10 minutes
- Returns workflow conclusion (success/failure)

**What it does:**
1. Validates action and GitHub token
2. Sends workflow dispatch to GitHub API
3. Optionally waits for workflow completion
4. Retrieves workflow run ID and URL
5. Polls workflow status until completion
6. Returns JSON with results

**Environment Variables Required:**
```bash
GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxx"  # Personal Access Token
GITHUB_REPO="jeremylongshore/cost-plus-db"
```

**GitHub Token Permissions:**
- `actions:write` - Trigger workflows
- `actions:read` - Read workflow status

**Output JSON:**
```json
{
  "status": "success",
  "action": "provision-database",
  "customer_id": "acme-corp-20251020",
  "workflow_run_id": "123456789",
  "workflow_url": "https://github.com/...",
  "conclusion": "success",
  "elapsed_seconds": 45,
  "triggered_at": "2025-10-20T10:45:00Z"
}
```

**Key Features:**
- GitHub API v3 integration
- Workflow status polling with timeout
- Detailed logging to `002-clients/logs/github-actions.log`
- Supports all GitHub Actions workflows in repository

**Exit Codes:**
- `0` - Workflow triggered successfully (or completed with success if --wait)
- `1` - GitHub API error, workflow failed, or timeout

---

## Environment Variables

All scripts use environment variables for sensitive configuration. Create a `.env` file in the project root or `backend/.env`:

```bash
# PostgreSQL Configuration
PG_PORT=5432
PG_VERSION=16

# Resend Email (for alerts)
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxx"
RESEND_FROM_EMAIL="costplusdb@intentsolutions.io"
RESEND_ADMIN_EMAIL="jeremy@intentsolutions.io"

# Turso Cloud Database (optional)
TURSO_DATABASE_URL="libsql://your-database.turso.io"
TURSO_AUTH_TOKEN="your_auth_token_here"

# Wasabi S3 (optional)
WASABI_ENDPOINT="s3.us-east-1.wasabisys.com"
WASABI_BUCKET="costplusdb-backups"
WASABI_ACCESS_KEY="your_access_key"
WASABI_SECRET_KEY="your_secret_key"

# Stripe (webhooks)
STRIPE_SECRET_KEY="sk_live_xxxxxxxxxxxxxxxxxxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxxxxxxxxxx"

# GitHub Actions (optional)
GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxx"
GITHUB_REPO="jeremylongshore/cost-plus-db"
```

---

## Logging

All scripts log to `002-clients/logs/`:

| Script | Log File |
|--------|----------|
| provision-customer-database.sh | `provisioning.log` |
| generate-credentials.sh | `credential-generation.log` |
| configure-backups.sh | `backup-configuration.log` |
| verify-provisioning.sh | `provisioning-verification.log` |
| sync-to-turso.sh | `turso-sync.log` |
| backup-local-db.sh | `database-backup.log` |
| stripe-payment-success.sh | `stripe-webhooks.log` |
| github-action-trigger.sh | `github-actions.log` |

**Log Format:**
```
[2025-10-20 10:45:30] [INFO] Database provisioning started for acme-corp-20251020
[2025-10-20 10:45:35] [INFO] PostgreSQL user created (max connections: 50)
[2025-10-20 10:45:40] [INFO] Database provisioning completed successfully
```

---

## Cron Schedule (Recommended)

Add these entries to automate operations:

```bash
# Turso cloud sync every 5 minutes
*/5 * * * * /home/admincostplus/projects/costplusdb/scripts/sync/sync-to-turso.sh --incremental >> /home/admincostplus/projects/costplusdb/002-clients/logs/turso-sync.log 2>&1

# Daily local database backup at 2 AM
0 2 * * * /home/admincostplus/projects/costplusdb/scripts/sync/backup-local-db.sh >> /home/admincostplus/projects/costplusdb/002-clients/logs/database-backup.log 2>&1

# Weekly full Turso sync on Sundays at 3 AM
0 3 * * 0 /home/admincostplus/projects/costplusdb/scripts/sync/sync-to-turso.sh --full >> /home/admincostplus/projects/costplusdb/002-clients/logs/turso-sync.log 2>&1
```

---

## Error Handling

All scripts implement comprehensive error handling:

1. **Input Validation:** Validates all arguments before execution
2. **Prerequisites Check:** Verifies dependencies and environment
3. **Error Traps:** Catches errors with `set -euo pipefail` and `trap`
4. **Rollback on Failure:** Provisioning script cleans up on errors
5. **Email Alerts:** Sends admin notifications on failures
6. **Exit Codes:** Proper codes for automation (0 = success, 1+ = failure)
7. **Logging:** Comprehensive logs with timestamps and levels

---

## Security Considerations

1. **Credentials:**
   - All passwords are 32+ characters with high entropy
   - Credentials stored in chmod 600 files
   - Never logged or exposed in process listings

2. **SSL/TLS:**
   - All database connections require SSL (`sslmode=require`)
   - hostssl enforced in pg_hba.conf

3. **Permissions:**
   - Database users are NOT superusers
   - Connection limits enforced per tier
   - Isolated database access (no cross-customer visibility)

4. **Secrets Management:**
   - Environment variables for sensitive data
   - No hardcoded passwords in scripts
   - `.env` files excluded from git (.gitignore)

---

## Testing

Test each script individually:

```bash
# 1. Generate credentials (test mode)
./provision/generate-credentials.sh test_db

# 2. Verify all scripts are executable
ls -lh provision/*.sh sync/*.sh webhooks/*.sh

# 3. Check logs directory exists
mkdir -p ../002-clients/logs

# 4. Validate environment variables
source ../.env && echo "RESEND_API_KEY is set"

# 5. Dry run provisioning (requires PostgreSQL)
# ./provision/provision-customer-database.sh test-customer-$(date +%s) test_db_$(date +%s) Shared
```

---

## Integration with Backend

The backend (Node.js/TypeScript) integrates with these scripts:

```typescript
// Example: Trigger provisioning after Stripe payment
import { exec } from 'child_process';

const triggerProvisioning = (customerId: string, paymentIntentId: string) => {
  const scriptPath = path.join(__dirname, '../../scripts/webhooks/stripe-payment-success.sh');

  exec(`${scriptPath} ${customerId} ${paymentIntentId}`, (error, stdout, stderr) => {
    if (error) {
      console.error('Provisioning trigger failed:', error);
      return;
    }

    const result = JSON.parse(stdout);
    console.log('Provisioning started:', result);
  });
};
```

---

## Troubleshooting

### Script Won't Execute
```bash
# Ensure executable permissions
chmod +x scripts/**/*.sh
```

### PostgreSQL Connection Failed
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"
```

### Email Alerts Not Sending
```bash
# Verify Resend configuration
source .env
echo "API Key: ${RESEND_API_KEY:0:10}..."
./001-security/alerts/scripts/send-alert-email.sh "Test" "Test message"
```

### Turso Sync Fails
```bash
# Check Turso CLI is installed
turso --version

# Verify credentials
turso auth login
turso db list
```

### Backup Fails
```bash
# Check pgBackRest configuration
sudo -u postgres pgbackrest --stanza=costplusdb-main info
sudo -u postgres pgbackrest --stanza=costplusdb-main check
```

---

## Contributing

When modifying scripts:

1. Maintain idempotency (safe to run multiple times)
2. Add comprehensive error handling
3. Update logging and JSON output
4. Test with various input scenarios
5. Update this README with changes

---

## License

Internal use only for CostPlusDB operations. Not for redistribution.

---

**Last Updated:** 2025-10-20
**Version:** 1.0.0
**Author:** CostPlusDB DevOps Team
