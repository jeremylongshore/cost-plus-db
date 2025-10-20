# Turso Cloud Setup & Configuration

**Document Type:** DR-GUID (Daily Routine - Guide)
**Created:** 2025-10-20
**Owner:** Intent Solutions (CostPlusDB)
**Purpose:** Step-by-step setup of Turso cloud for SQLite database replication and remote access

---

## Overview

**What is Turso?**
Turso is a distributed SQLite database platform built on libSQL (a SQLite fork). It provides edge replication, remote access via HTTPS API, and seamless sync from local SQLite databases.

**Why Use Turso for CostPlusDB?**
- **Remote Access:** Query customer data without SSH into VPS
- **Redundancy:** Automatic cloud backup of customer metadata
- **Edge Performance:** Fast reads from global edge locations
- **API Access:** Build dashboards, mobile apps, analytics tools
- **SQLite Compatible:** No schema changes, same SQL syntax

**When to Implement:** Month 6+ (after SQLite database is established)

---

## Prerequisites

**Before starting Turso setup:**

- [ ] Local SQLite database created (`001-security/databases/customers.db`)
- [ ] Customer data migrated to SQLite (see 036-DR-ARCH)
- [ ] Email account for Turso signup
- [ ] Credit card for Turso paid plan (optional, has generous free tier)

**Required Information:**

- Turso account email: _______________
- Database name: `costplusdb-customers`
- Primary region: `us-east-1` (or closest to VPS)
- Sync frequency: Every 5 minutes

---

## Turso Pricing Overview

**Free Tier (Starter):**
- 3 databases
- 10 GB total storage
- 1 billion row reads/month
- 1 location (no edge replication)

**Scaler Plan ($29/month):**
- Unlimited databases
- 50 GB storage (additional $0.50/GB)
- 1 billion+ row reads
- Multiple edge locations
- Dedicated support

**Recommendation for CostPlusDB:**
- Start with **Free Tier** (sufficient for < 1,000 customers)
- Upgrade to **Scaler** when:
  - Need edge replication (global customers)
  - Exceed 3 databases
  - Want priority support

---

## Part 1: Turso Account Setup

### Step 1: Install Turso CLI

**On VPS:**

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Add to PATH (if not automatically added)
echo 'export PATH="$HOME/.turso:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify installation
turso --version
# Should show: turso version x.x.x
```

**✅ Checkpoint 1:** Turso CLI installed?

### Step 2: Create Turso Account

```bash
# Sign up for Turso (opens browser for authentication)
turso auth signup

# Or if you already have an account
turso auth login

# Verify authentication
turso auth whoami
# Should show your email
```

**What this does:**
- Creates Turso account (or logs in)
- Stores authentication token locally in `~/.turso/`
- Token allows CLI to manage your databases

**✅ Checkpoint 2:** Authenticated with Turso?

### Step 3: Verify Account Details

```bash
# Check your Turso account info
turso account show

# Output shows:
# - Email
# - Plan (Starter, Scaler, etc.)
# - Database count
# - Storage usage
```

---

## Part 2: Create Turso Database

### Step 4: Create Primary Database

```bash
# Create database in primary region
turso db create costplusdb-customers --location iad

# Flags:
# --location iad = US East (Washington, DC)
# Other options: lax (LA), fra (Frankfurt), syd (Sydney)

# Verify database created
turso db list
# Should show: costplusdb-customers
```

**Available Regions:**

| Code | Location | Use Case |
|------|----------|----------|
| iad | US East (Virginia) | Primary for US customers |
| lax | US West (California) | West coast customers |
| fra | Frankfurt, Germany | EU customers |
| lhr | London, UK | UK customers |
| syd | Sydney, Australia | APAC customers |
| sin | Singapore | Asia customers |

**✅ Checkpoint 4:** Database created in primary region?

### Step 5: Get Database URL

```bash
# Get connection URL for database
turso db show costplusdb-customers

# Output includes:
# - Database URL: libsql://costplusdb-customers-[org].turso.io
# - Primary location: iad
# - Regions: (shows all replicas)
# - Schema: (shows tables if any)
```

**Save the database URL:**

```bash
# Store in environment variable for scripts
echo 'export TURSO_DB_URL="libsql://costplusdb-customers-[org].turso.io"' >> ~/.bashrc
source ~/.bashrc
```

**✅ Checkpoint 5:** Database URL saved?

---

## Part 3: Authentication & API Tokens

### Step 6: Create Database Token

**Purpose:** API token for programmatic access (required for sync scripts)

```bash
# Create token for database access
turso db tokens create costplusdb-customers

# Output: eyJhbGc... (long JWT token)
# COPY THIS TOKEN - it's shown only once
```

**Token Types:**

| Type | Permissions | Use Case |
|------|-------------|----------|
| Read/Write | Full access | Sync scripts, automation |
| Read-Only | Query only | Dashboards, analytics |

**Store token securely:**

```bash
# Create token storage directory
mkdir -p /home/admincostplus/projects/costplusdb/001-security/keys/turso
chmod 700 /home/admincostplus/projects/costplusdb/001-security/keys/turso

# Save write token
echo "eyJhbGc..." > /home/admincostplus/projects/costplusdb/001-security/keys/turso/auth-token.txt
chmod 600 /home/admincostplus/projects/costplusdb/001-security/keys/turso/auth-token.txt

# Add to environment for scripts
echo 'export TURSO_AUTH_TOKEN="$(cat /home/admincostplus/projects/costplusdb/001-security/keys/turso/auth-token.txt)"' >> ~/.bashrc
source ~/.bashrc
```

**✅ Checkpoint 6:** Auth token created and saved?

### Step 7: Create Read-Only Token (Optional)

**Purpose:** Limited token for analytics/dashboards (cannot write)

```bash
# Currently Turso doesn't have built-in read-only tokens
# Implement application-level read-only logic instead
# Or use separate database for read-only replica
```

---

## Part 4: Database Schema Setup

### Step 8: Push Local Schema to Turso

**Purpose:** Create tables in Turso database to match local SQLite schema

**Option 1: Manual Schema Creation**

```bash
# Get local schema
sqlite3 /home/admincostplus/projects/costplusdb/001-security/databases/customers.db .schema > schema.sql

# Connect to Turso database
turso db shell costplusdb-customers

# Paste schema and execute (creates all tables)
# Type .exit when done
```

**Option 2: Automated Schema Sync**

```bash
# Dump schema from local SQLite
sqlite3 /home/admincostplus/projects/costplusdb/001-security/databases/customers.db .schema > /tmp/schema.sql

# Apply schema to Turso
turso db shell costplusdb-customers < /tmp/schema.sql

# Clean up
rm /tmp/schema.sql
```

**✅ Checkpoint 8:** Schema created in Turso database?

### Step 9: Verify Schema

```bash
# Connect to Turso shell
turso db shell costplusdb-customers

# List tables
.tables

# Should show:
# customers  databases  invoices  support_tickets  events_log

# Check table structure
.schema customers

# Verify matches local schema
.exit
```

---

## Part 5: Data Sync Configuration

### Step 10: Create Sync Script

**Purpose:** Automated sync from local SQLite to Turso every 5 minutes

**Create sync script:**

```bash
# Create scripts directory
mkdir -p /home/admincostplus/projects/costplusdb/scripts/turso-sync
chmod 750 /home/admincostplus/projects/costplusdb/scripts/turso-sync

# Create sync script
cat > /home/admincostplus/projects/costplusdb/scripts/turso-sync/sync-to-turso.sh <<'EOF'
#!/bin/bash

# Turso Sync Script
# Syncs local SQLite database to Turso cloud

set -euo pipefail

# Configuration
LOCAL_DB="/home/admincostplus/projects/costplusdb/001-security/databases/customers.db"
TURSO_DB_NAME="costplusdb-customers"
TURSO_DB_URL="${TURSO_DB_URL}"
TURSO_AUTH_TOKEN="${TURSO_AUTH_TOKEN}"
LOG_FILE="/home/admincostplus/projects/costplusdb/logs/turso-sync.log"

# Ensure log directory exists
mkdir -p /home/admincostplus/projects/costplusdb/logs

# Log function
log() {
    echo "[$(date +%Y-%m-%d\ %H:%M:%S)] $1" | tee -a "$LOG_FILE"
}

log "Starting Turso sync..."

# Check if local database exists
if [ ! -f "$LOCAL_DB" ]; then
    log "ERROR: Local database not found: $LOCAL_DB"
    exit 1
fi

# Export local database to SQL dump
DUMP_FILE="/tmp/customers-dump-$(date +%Y%m%d-%H%M%S).sql"
sqlite3 "$LOCAL_DB" .dump > "$DUMP_FILE"

if [ $? -ne 0 ]; then
    log "ERROR: Failed to dump local database"
    exit 1
fi

log "Local database dumped to: $DUMP_FILE"

# Clear Turso database (truncate all tables)
log "Clearing Turso database..."
turso db shell "$TURSO_DB_NAME" <<SQL
DELETE FROM events_log;
DELETE FROM support_tickets;
DELETE FROM invoices;
DELETE FROM databases;
DELETE FROM customers;
SQL

# Import dump into Turso
log "Importing data to Turso..."
turso db shell "$TURSO_DB_NAME" < "$DUMP_FILE"

if [ $? -eq 0 ]; then
    log "✅ Sync successful"
else
    log "❌ Sync failed"
    rm "$DUMP_FILE"
    exit 1
fi

# Clean up dump file
rm "$DUMP_FILE"
log "Cleaned up temporary dump file"

# Verify row counts match
LOCAL_COUNT=$(sqlite3 "$LOCAL_DB" "SELECT COUNT(*) FROM customers;")
TURSO_COUNT=$(turso db shell "$TURSO_DB_NAME" "SELECT COUNT(*) FROM customers;" | tail -1)

log "Local customers: $LOCAL_COUNT"
log "Turso customers: $TURSO_COUNT"

if [ "$LOCAL_COUNT" -eq "$TURSO_COUNT" ]; then
    log "✅ Row counts match - sync verified"
else
    log "⚠️  WARNING: Row counts do not match!"
fi

log "Sync complete."
EOF

# Make executable
chmod 750 /home/admincostplus/projects/costplusdb/scripts/turso-sync/sync-to-turso.sh
```

**✅ Checkpoint 10:** Sync script created?

### Step 11: Test Manual Sync

```bash
# Run sync script manually
/home/admincostplus/projects/costplusdb/scripts/turso-sync/sync-to-turso.sh

# Check log output
tail -20 /home/admincostplus/projects/costplusdb/logs/turso-sync.log

# Verify data in Turso
turso db shell costplusdb-customers "SELECT COUNT(*) FROM customers;"
```

**Expected Output:**
```
[2025-10-20 15:30:45] Starting Turso sync...
[2025-10-20 15:30:46] Local database dumped to: /tmp/customers-dump-20251020-153046.sql
[2025-10-20 15:30:47] Clearing Turso database...
[2025-10-20 15:30:48] Importing data to Turso...
[2025-10-20 15:30:49] ✅ Sync successful
[2025-10-20 15:30:49] Cleaned up temporary dump file
[2025-10-20 15:30:50] Local customers: 5
[2025-10-20 15:30:50] Turso customers: 5
[2025-10-20 15:30:50] ✅ Row counts match - sync verified
[2025-10-20 15:30:50] Sync complete.
```

**✅ Checkpoint 11:** Manual sync successful?

### Step 12: Schedule Automated Sync

**Purpose:** Run sync every 5 minutes via cron

```bash
# Add cron job
crontab -e

# Add line (syncs every 5 minutes)
*/5 * * * * /home/admincostplus/projects/costplusdb/scripts/turso-sync/sync-to-turso.sh >> /home/admincostplus/projects/costplusdb/logs/turso-sync.log 2>&1

# Verify cron job added
crontab -l | grep turso
```

**Alternative Sync Frequencies:**

| Frequency | Cron Expression | Use Case |
|-----------|----------------|----------|
| Every 5 min | `*/5 * * * *` | Real-time customer data |
| Every 15 min | `*/15 * * * *` | Balanced performance |
| Every hour | `0 * * * *` | Low priority sync |
| Daily (1 AM) | `0 1 * * *` | Backup only |

**✅ Checkpoint 12:** Cron job scheduled?

---

## Part 6: Edge Replication Setup (Optional)

### Step 13: Add Edge Locations

**Purpose:** Replicate database to multiple regions for faster global access

**Requires:** Turso Scaler plan ($29/month)

```bash
# Add replica in EU (Frankfurt)
turso db replicas create costplusdb-customers --location fra

# Add replica in Asia (Singapore)
turso db replicas create costplusdb-customers --location sin

# List all replicas
turso db show costplusdb-customers

# Output shows:
# - Primary: iad (US East)
# - Replicas: fra, sin
```

**How Edge Replication Works:**
- Writes go to primary location (iad)
- Reads can be served from nearest edge location
- Automatic synchronization (eventual consistency)
- Typical replication lag: < 1 second

**✅ Checkpoint 13:** Edge replicas created (if using Scaler plan)?

---

## Part 7: API Access & Integration

### Step 14: Test API Access

**Purpose:** Verify remote database access via HTTPS API

**Install libSQL client library (Python example):**

```bash
# Install Python libSQL client
pip3 install libsql-client

# Test connection
python3 <<EOF
from libsql_client import create_client

# Connect to Turso database
client = create_client(
    url="${TURSO_DB_URL}",
    auth_token="${TURSO_AUTH_TOKEN}"
)

# Execute query
result = client.execute("SELECT COUNT(*) FROM customers;")
print(f"Total customers: {result.rows[0][0]}")

client.close()
EOF
```

**Expected Output:**
```
Total customers: 5
```

**✅ Checkpoint 14:** API access working?

### Step 15: Create Dashboard Query Script

**Purpose:** Example script to query Turso for customer stats

```bash
# Create dashboard script
cat > /home/admincostplus/projects/costplusdb/scripts/turso-sync/customer-stats.py <<'EOF'
#!/usr/bin/env python3

from libsql_client import create_client
import os

# Configuration
TURSO_DB_URL = os.environ.get("TURSO_DB_URL")
TURSO_AUTH_TOKEN = os.environ.get("TURSO_AUTH_TOKEN")

# Connect to Turso
client = create_client(url=TURSO_DB_URL, auth_token=TURSO_AUTH_TOKEN)

# Query customer statistics
print("=== CUSTOMER STATISTICS ===\n")

# Total customers by status
result = client.execute("""
    SELECT status, COUNT(*) as count
    FROM customers
    GROUP BY status
    ORDER BY count DESC;
""")
print("Customers by Status:")
for row in result.rows:
    print(f"  {row[0]}: {row[1]}")

# Total MRR
result = client.execute("""
    SELECT SUM(price_monthly) as mrr
    FROM customers
    WHERE status = 'active';
""")
mrr = result.rows[0][0] or 0
print(f"\nMonthly Recurring Revenue: ${mrr:,.2f}")

# Customers by plan tier
result = client.execute("""
    SELECT plan_tier, COUNT(*) as count
    FROM customers
    WHERE status = 'active'
    GROUP BY plan_tier
    ORDER BY count DESC;
""")
print("\nActive Customers by Tier:")
for row in result.rows:
    print(f"  {row[0]}: {row[1]}")

# Upcoming invoices (next 7 days)
result = client.execute("""
    SELECT COUNT(*) as count
    FROM customers
    WHERE status = 'active'
    AND next_invoice_date BETWEEN DATE('now') AND DATE('now', '+7 days');
""")
upcoming = result.rows[0][0]
print(f"\nUpcoming Invoices (next 7 days): {upcoming}")

client.close()
EOF

chmod 750 /home/admincostplus/projects/costplusdb/scripts/turso-sync/customer-stats.py
```

**Run dashboard:**

```bash
python3 /home/admincostplus/projects/costplusdb/scripts/turso-sync/customer-stats.py
```

**Expected Output:**
```
=== CUSTOMER STATISTICS ===

Customers by Status:
  active: 5
  prospect: 2

Monthly Recurring Revenue: $395.00

Active Customers by Tier:
  Shared: 3
  Dedicated: 2

Upcoming Invoices (next 7 days): 1
```

---

## Part 8: Monitoring & Maintenance

### Step 16: Monitor Sync Health

**Check sync logs:**

```bash
# View recent sync logs
tail -50 /home/admincostplus/projects/costplusdb/logs/turso-sync.log

# Check for errors
grep "ERROR\|WARNING" /home/admincostplus/projects/costplusdb/logs/turso-sync.log | tail -20

# Count successful syncs today
grep "Sync complete" /home/admincostplus/projects/costplusdb/logs/turso-sync.log | grep "$(date +%Y-%m-%d)" | wc -l
# Should be ~288 (every 5 minutes = 12/hour × 24 hours)
```

**Set up sync failure alerts:**

```bash
# Create alert script
cat > /home/admincostplus/projects/costplusdb/scripts/turso-sync/check-sync-health.sh <<'EOF'
#!/bin/bash

LOG_FILE="/home/admincostplus/projects/costplusdb/logs/turso-sync.log"

# Check if last sync was successful
LAST_SYNC=$(tail -20 "$LOG_FILE" | grep "Sync complete" | tail -1)

if [ -z "$LAST_SYNC" ]; then
    echo "⚠️  WARNING: No recent successful sync found!"
    # Send email alert (configure mail command)
    # echo "Turso sync failed - check logs" | mail -s "ALERT: Turso Sync Failed" jeremy@intentsolutions.io
    exit 1
fi

echo "✅ Turso sync healthy"
EOF

chmod 750 /home/admincostplus/projects/costplusdb/scripts/turso-sync/check-sync-health.sh

# Run daily via cron (8 AM)
# 0 8 * * * /home/admincostplus/projects/costplusdb/scripts/turso-sync/check-sync-health.sh
```

### Step 17: Monitor Turso Usage

```bash
# Check Turso account usage
turso account show

# Output shows:
# - Database count
# - Storage usage
# - Read/write volume
# - Billing status

# Check specific database size
turso db show costplusdb-customers

# Output shows:
# - Database size
# - Row count (approximate)
# - Regions
```

**Set up usage alerts:**
- Log into Turso dashboard: https://turso.tech/app
- Go to Billing → Usage
- Configure email alerts for 80% quota usage

---

## Troubleshooting

### Issue: Sync script fails with authentication error

**Error:** `Unauthorized: invalid token`

**Resolution:**

```bash
# Regenerate auth token
turso db tokens create costplusdb-customers

# Update stored token
echo "NEW_TOKEN" > /home/admincostplus/projects/costplusdb/001-security/keys/turso/auth-token.txt

# Update environment variable
source ~/.bashrc

# Retry sync
```

### Issue: Row counts don't match after sync

**Error:** `WARNING: Row counts do not match!`

**Resolution:**

```bash
# Check local database for corruption
sqlite3 /home/admincostplus/projects/costplusdb/001-security/databases/customers.db "PRAGMA integrity_check;"

# If OK, manually compare data
sqlite3 /home/admincostplus/projects/costplusdb/001-security/databases/customers.db "SELECT * FROM customers ORDER BY id;"
turso db shell costplusdb-customers "SELECT * FROM customers ORDER BY id;"

# Re-run full sync
/home/admincostplus/projects/costplusdb/scripts/turso-sync/sync-to-turso.sh
```

### Issue: Turso database connection timeout

**Error:** `Connection timeout`

**Resolution:**

```bash
# Check VPS internet connectivity
ping -c 3 turso.io

# Check DNS resolution
nslookup costplusdb-customers-[org].turso.io

# Check firewall (allow outbound HTTPS)
sudo ufw status

# Test with curl
curl -I https://costplusdb-customers-[org].turso.io
```

---

## Security Best Practices

**Token Security:**
- Store tokens in `001-security/keys/turso/` with 0600 permissions
- Never commit tokens to git
- Rotate tokens every 90 days
- Use separate read-only tokens for dashboards

**Data Privacy:**
- Customer PII is synced to Turso (encrypted in transit via HTTPS)
- Turso stores data encrypted at rest (AES-256)
- Comply with GDPR (EU customers) - Turso has EU data centers

**Access Control:**
- Limit who has access to Turso account credentials
- Use separate Turso organization for production vs staging
- Enable 2FA on Turso account

---

## Backup Strategy

**Turso as Backup:**
- Turso serves as real-time backup of customer metadata
- In case of VPS failure, customer data is recoverable from Turso

**Local Backups Still Required:**
- Daily encrypted backups to Wasabi S3 (primary backup)
- Turso is secondary/redundant backup

**Recovery Scenarios:**

**Scenario 1: VPS Lost, Restore from Turso**

```bash
# On new VPS, install Turso CLI
# Authenticate
turso auth login

# Export Turso database to SQL
turso db shell costplusdb-customers .dump > customers-restore.sql

# Import into local SQLite
sqlite3 /home/admincostplus/projects/costplusdb/001-security/databases/customers.db < customers-restore.sql

# Verify data
sqlite3 /home/admincostplus/projects/costplusdb/001-security/databases/customers.db "SELECT COUNT(*) FROM customers;"
```

**Scenario 2: Turso Data Corruption, Restore from Local**

```bash
# Stop sync cron job temporarily
# crontab -e (comment out turso sync line)

# Clear Turso database
turso db shell costplusdb-customers <<SQL
DELETE FROM events_log;
DELETE FROM support_tickets;
DELETE FROM invoices;
DELETE FROM databases;
DELETE FROM customers;
SQL

# Re-run full sync from local
/home/admincostplus/projects/costplusdb/scripts/turso-sync/sync-to-turso.sh

# Re-enable cron job
```

---

## Cost Estimation

### Free Tier (Starter)

**Limits:**
- 3 databases (costplusdb-customers = 1 database)
- 10 GB storage (sufficient for 10,000+ customers)
- 1 billion row reads/month (very generous)
- 1 primary location (no edge replication)

**Sufficient Until:** ~1,000 customers or need for edge replication

### Scaler Plan ($29/month)

**Includes:**
- Unlimited databases
- 50 GB storage ($0.50/GB additional)
- 1 billion+ row reads
- Multiple edge locations
- Priority support

**Upgrade When:**
- Need edge replication (global customers)
- Exceed free tier storage (> 10 GB)
- Want faster support response

**Estimated Monthly Cost at Scale:**

| Customers | DB Size | Plan | Cost |
|-----------|---------|------|------|
| 1-1,000 | < 10 GB | Free | $0 |
| 1,000-5,000 | 10-50 GB | Scaler | $29 |
| 5,000-10,000 | 50-100 GB | Scaler | $54 ($29 + $25 storage) |

---

## Related Documentation

- **036-DR-ARCH-customer-data-management-system.md** - Overall architecture
- **020-DR-ARCH-customer-database-structure.md** - File directory structure
- **033-DR-GUID-customer-onboarding-complete-workflow.md** - Onboarding workflow

---

## Future Enhancements

**Month 6:**
- Set up Turso sync (this guide)
- Build CLI dashboard using Turso API

**Month 9:**
- Create web-based dashboard (read-only access to Turso)
- Implement analytics and reporting

**Month 12:**
- Build mobile app for customer management (iOS/Android accessing Turso)
- Automated alerts based on Turso data queries

---

**Document Owner:** Jeremy Longshore (jeremy@intentsolutions.io)
**Last Updated:** 2025-10-20
**Review Frequency:** Quarterly
**Turso Docs:** https://docs.turso.tech/
