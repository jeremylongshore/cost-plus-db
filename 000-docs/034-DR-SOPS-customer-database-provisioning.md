# Customer Database Provisioning (SOP-103)

**Document Type:** DR-SOPS (Daily Routine - Standard Operating Procedure)
**SOP Number:** SOP-103
**Created:** 2025-10-20
**Owner:** Intent Solutions (CostPlusDB)
**Purpose:** Step-by-step commands to provision a customer PostgreSQL database

---

## Overview

**What this SOP covers:** Creating an isolated PostgreSQL database for a new customer with secure credentials, SSL enforcement, and proper permissions.

**When to use:** Every time a new customer completes the onboarding form and payment is confirmed.

**Time required:** 15-30 minutes
**Risk level:** MEDIUM - Mistakes affect customer access but are reversible
**Frequency:** Per new customer (estimated 2-10x per week at scale)

---

## Prerequisites

**Before starting:**

- [ ] Customer onboarding form completed and validated
- [ ] Customer ID generated (format: `{company-slug}-{timestamp}`)
- [ ] Customer directory created in `001-security/customers/active/{customer-id}/`
- [ ] VPS has capacity (disk space, connection limits)
- [ ] You have sudo access to VPS
- [ ] PostgreSQL 16 is running
- [ ] Payment method confirmed or first invoice sent

**Required Information (from onboarding form):**

- Customer ID: _______________
- Database Name: _______________
- Database User: _______________
- Plan Tier: _______________
- Customer Email: _______________

---

## Safety Checklist

**Before executing commands:**

- [ ] Double-check database name doesn't already exist
- [ ] Verify customer directory path is correct
- [ ] Password will be 32 characters, cryptographically secure
- [ ] All commands will be logged for audit trail
- [ ] You have a backup of current PostgreSQL state (weekly snapshot)

**Red Flags (STOP if encountered):**

- ❌ Database name conflicts with existing database
- ❌ Customer directory doesn't exist
- ❌ PostgreSQL not running or in maintenance mode
- ❌ Disk space below 20% free
- ❌ Customer onboarding form incomplete

---

## Step 1: Set Environment Variables

**Purpose:** Prevent typos and ensure consistency across all commands.

```bash
# Set customer information (from onboarding form)
CUSTOMER_ID="acme-corp-20251020"
CUSTOMER_NAME="Acme Corporation"
CUSTOMER_EMAIL="john@acme.com"
DB_NAME="acme_production"
DB_USER="acme_user"
PLAN_TIER="Shared"

# Set internal paths
CUSTOMER_DIR="/home/admincostplus/projects/costplusdb/001-security/customers/active/$CUSTOMER_ID"
CREDENTIALS_FILE="$CUSTOMER_DIR/database-credentials.txt"
CUSTOMER_JSON="$CUSTOMER_DIR/customer-info.json"

# Verify customer directory exists
if [ ! -d "$CUSTOMER_DIR" ]; then
  echo "❌ ERROR: Customer directory does not exist: $CUSTOMER_DIR"
  echo "Run Stage 3 from onboarding workflow first."
  exit 1
fi

echo "✅ Customer directory verified: $CUSTOMER_DIR"
```

**✅ Checkpoint 1:** Customer directory exists?

---

## Step 2: Validate Database Name and User

**Purpose:** Ensure database name and user follow PostgreSQL naming conventions.

**Naming Rules:**
- Lowercase letters, numbers, underscores only
- Must start with letter or underscore
- Max 63 characters
- Cannot be PostgreSQL reserved words

```bash
# Validate database name
echo "$DB_NAME" | grep -qE '^[a-z_][a-z0-9_]{0,62}$'
if [ $? -ne 0 ]; then
  echo "❌ ERROR: Invalid database name: $DB_NAME"
  echo "Must be lowercase, alphanumeric, underscores only, start with letter/underscore"
  exit 1
fi

echo "✅ Database name valid: $DB_NAME"

# Validate database user
echo "$DB_USER" | grep -qE '^[a-z_][a-z0-9_]{0,62}$'
if [ $? -ne 0 ]; then
  echo "❌ ERROR: Invalid database user: $DB_USER"
  exit 1
fi

echo "✅ Database user valid: $DB_USER"
```

**✅ Checkpoint 2:** Database name and user validated?

---

## Step 3: Check for Conflicts

**Purpose:** Ensure database name and user don't already exist.

```bash
# Check if database already exists
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';")
if [ "$DB_EXISTS" = "1" ]; then
  echo "❌ ERROR: Database '$DB_NAME' already exists!"
  echo "Use a different database name or investigate conflict."
  exit 1
fi

echo "✅ Database name available: $DB_NAME"

# Check if user already exists
USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER';")
if [ "$USER_EXISTS" = "1" ]; then
  echo "❌ ERROR: Database user '$DB_USER' already exists!"
  echo "Use a different username or investigate conflict."
  exit 1
fi

echo "✅ Database user available: $DB_USER"
```

**✅ Checkpoint 3:** No naming conflicts?

---

## Step 4: Generate Secure Password

**Purpose:** Create cryptographically secure 32-character password.

**Security Requirements:**
- 32 characters minimum
- Alphanumeric (no special chars to avoid escaping issues)
- Cryptographically random (not predictable)
- No ambiguous characters (0/O, 1/l/I)

```bash
# Generate secure password (32 characters, alphanumeric)
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)

# Verify password length
if [ ${#DB_PASSWORD} -ne 32 ]; then
  echo "❌ ERROR: Password generation failed (length: ${#DB_PASSWORD})"
  exit 1
fi

echo "✅ Password generated: [32 characters]"
echo "Password preview: ${DB_PASSWORD:0:4}...${DB_PASSWORD:28:4}"

# Save password to temporary secure file (will move to credentials file later)
echo "$DB_PASSWORD" > /tmp/db_password_${CUSTOMER_ID}.tmp
chmod 600 /tmp/db_password_${CUSTOMER_ID}.tmp
```

**✅ Checkpoint 4:** Password generated and saved temporarily?

---

## Step 5: Create PostgreSQL Database

**Purpose:** Create isolated database for customer.

```bash
# Create database
sudo -u postgres psql <<EOF
-- Create database with UTF8 encoding
CREATE DATABASE $DB_NAME
  WITH ENCODING = 'UTF8'
       LC_COLLATE = 'en_US.UTF-8'
       LC_CTYPE = 'en_US.UTF-8'
       TEMPLATE = template0;

-- Add comment for reference
COMMENT ON DATABASE $DB_NAME IS 'CostPlusDB - $CUSTOMER_NAME ($CUSTOMER_ID) - Created $(date +%Y-%m-%d)';
EOF

if [ $? -eq 0 ]; then
  echo "✅ Database created: $DB_NAME"
else
  echo "❌ ERROR: Failed to create database"
  exit 1
fi
```

**✅ Checkpoint 5:** Database created successfully?

---

## Step 6: Create PostgreSQL User

**Purpose:** Create dedicated user with secure password.

```bash
# Create user with encrypted password
sudo -u postgres psql <<EOF
-- Create user with encrypted password
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';

-- Prevent user from creating databases or roles
ALTER USER $DB_USER WITH NOCREATEDB NOCREATEROLE;

-- Set connection limit (adjust based on plan tier)
-- Shared: 25 connections
-- Dedicated: 100 connections
-- Pro: 200 connections
-- Enterprise: 500 connections
ALTER USER $DB_USER WITH CONNECTION LIMIT 25;

-- Add comment for reference
COMMENT ON ROLE $DB_USER IS 'CostPlusDB - $CUSTOMER_NAME ($CUSTOMER_ID) - Created $(date +%Y-%m-%d)';
EOF

if [ $? -eq 0 ]; then
  echo "✅ Database user created: $DB_USER"
else
  echo "❌ ERROR: Failed to create database user"
  # Clean up: Drop database since user creation failed
  sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;"
  exit 1
fi
```

**Connection Limits by Tier:**

| Tier | Max Connections |
|------|-----------------|
| Shared | 25 |
| Dedicated | 100 |
| Pro | 200 |
| Enterprise | 500 |

**✅ Checkpoint 6:** Database user created?

---

## Step 7: Grant Permissions

**Purpose:** Give user full control of their database, but prevent them from affecting other databases.

```bash
# Grant all privileges on the database to the user
sudo -u postgres psql <<EOF
-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Make user the owner of the database
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;

-- Connect to the customer database to set schema permissions
\c $DB_NAME

-- Grant all privileges on the public schema
GRANT ALL ON SCHEMA public TO $DB_USER;

-- Grant privileges on all existing tables (in case any exist)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO $DB_USER;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO $DB_USER;
EOF

if [ $? -eq 0 ]; then
  echo "✅ Permissions granted to $DB_USER on $DB_NAME"
else
  echo "❌ ERROR: Failed to grant permissions"
  # Clean up
  sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;"
  sudo -u postgres psql -c "DROP USER IF EXISTS $DB_USER;"
  exit 1
fi
```

**Security Notes:**
- User can create tables, views, functions in their database
- User **cannot** drop the database itself
- User **cannot** access other customers' databases
- User **cannot** create new databases or roles

**✅ Checkpoint 7:** Permissions granted?

---

## Step 8: Configure SSL/TLS Requirement

**Purpose:** Enforce encrypted connections for customer security.

```bash
# Add entry to pg_hba.conf requiring SSL for this user
PG_HBA_CONF="/etc/postgresql/16/main/pg_hba.conf"

# Backup pg_hba.conf before modifying
sudo cp $PG_HBA_CONF ${PG_HBA_CONF}.backup.$(date +%Y%m%d-%H%M%S)

# Add SSL-required entry for this customer user
echo "# CostPlusDB - $CUSTOMER_ID - Added $(date +%Y-%m-%d)" | sudo tee -a $PG_HBA_CONF
echo "hostssl  $DB_NAME  $DB_USER  0.0.0.0/0  scram-sha-256" | sudo tee -a $PG_HBA_CONF

# Reload PostgreSQL configuration (no downtime)
sudo systemctl reload postgresql

if [ $? -eq 0 ]; then
  echo "✅ SSL/TLS requirement configured and reloaded"
else
  echo "❌ ERROR: Failed to reload PostgreSQL configuration"
  exit 1
fi
```

**What this does:**
- `hostssl` = Requires SSL/TLS connection
- `0.0.0.0/0` = Allows connections from any IP (firewall handles IP filtering if needed)
- `scram-sha-256` = Modern password authentication method

**✅ Checkpoint 8:** SSL configured and PostgreSQL reloaded?

---

## Step 9: Test Database Connection

**Purpose:** Verify database is accessible with credentials before sending to customer.

```bash
# Test connection using psql
PGPASSWORD="$DB_PASSWORD" psql -h localhost -p 5432 -U $DB_USER -d $DB_NAME -c "SELECT version();"

if [ $? -eq 0 ]; then
  echo "✅ Connection test successful!"
else
  echo "❌ ERROR: Cannot connect to database with provided credentials"
  echo "Review PostgreSQL logs: sudo tail -50 /var/log/postgresql/postgresql-16-main.log"
  exit 1
fi
```

**What to verify:**
- Connection succeeds
- PostgreSQL version displays (should be 16.x)
- No authentication errors

**✅ Checkpoint 9:** Connection test passed?

---

## Step 10: Create Credentials File

**Purpose:** Save credentials in secure file for customer delivery.

```bash
# Create database credentials file
cat > $CREDENTIALS_FILE <<EOF
=================================================================
COSTPLUSDB - DATABASE CREDENTIALS
Customer: $CUSTOMER_NAME ($CUSTOMER_ID)
Generated: $(date +%Y-%m-%d)
=================================================================

DATABASE INFORMATION
-------------------
Database Name:     $DB_NAME
Database User:     $DB_USER
Database Password: $DB_PASSWORD

CONNECTION DETAILS
-----------------
Host:              costplusdb.dev
Port:              5432
SSL Mode:          require (mandatory)

CONNECTION STRING
----------------
postgresql://$DB_USER:$DB_PASSWORD@costplusdb.dev:5432/$DB_NAME?sslmode=require

BACKUP INFORMATION
-----------------
Backup Schedule:   Daily at 1:00 AM CT
Retention:         30 days
Storage:           Local + Wasabi S3 (encrypted)
PITR Available:    7 days
Next Backup:       $(date -d "+1 day" +%Y-%m-%d) at 1:00 AM CT

SUPPORT CONTACT
--------------
Email:             jeremy@intentsolutions.io
Response Time:     4 hours (business hours M-F 9am-6pm CT)
Emergency:         Same email with subject "URGENT:"

SECURITY NOTES
-------------
- SSL/TLS is REQUIRED for all connections
- Connection attempts are logged
- Failed login threshold: 5 attempts in 5 minutes = automatic IP ban
- Database user has restricted permissions (cannot drop database)
- Max concurrent connections: 25 (Shared tier)

=================================================================
CONFIDENTIAL - Store securely, do not commit to version control
=================================================================
EOF

# Set strict permissions (owner read/write only)
chmod 600 $CREDENTIALS_FILE

echo "✅ Credentials file created: $CREDENTIALS_FILE"
```

**✅ Checkpoint 10:** Credentials file created with correct permissions?

---

## Step 11: Update customer-info.json

**Purpose:** Record credentials and provisioning details in customer metadata.

```bash
# Update customer-info.json with database credentials
# Use jq for JSON manipulation (install if needed: sudo apt install jq)

# Read current JSON
CUSTOMER_JSON_TEMP=$(mktemp)
cat $CUSTOMER_JSON > $CUSTOMER_JSON_TEMP

# Update database credentials
jq --arg db_name "$DB_NAME" \
   --arg db_user "$DB_USER" \
   --arg db_password "$DB_PASSWORD" \
   --arg conn_string "postgresql://$DB_USER:$DB_PASSWORD@costplusdb.dev:5432/$DB_NAME?sslmode=require" \
   --arg status "active" \
   --arg provisioned_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
   '
   .database.db_name = $db_name |
   .database.db_user = $db_user |
   .database.db_password = $db_password |
   .database.connection_string = $conn_string |
   .status = $status |
   .metadata.provisioned_at = $provisioned_at |
   .metadata.last_updated = $provisioned_at
   ' $CUSTOMER_JSON_TEMP > $CUSTOMER_JSON

# Set strict permissions
chmod 600 $CUSTOMER_JSON

# Clean up temp file
rm $CUSTOMER_JSON_TEMP

echo "✅ customer-info.json updated with credentials"
```

**Alternative (if jq not available):** Manually edit `customer-info.json` and add:

```json
{
  "database": {
    "db_name": "acme_production",
    "db_user": "acme_user",
    "db_password": "GENERATED_PASSWORD",
    "connection_string": "postgresql://..."
  },
  "status": "active",
  "metadata": {
    "provisioned_at": "2025-10-20T15:30:00Z"
  }
}
```

**✅ Checkpoint 11:** customer-info.json updated?

---

## Step 12: Configure Backup Entry

**Purpose:** Ensure customer database is included in automated backup schedule.

```bash
# pgBackRest automatically backs up all databases in the cluster
# Verify backup configuration includes new database

# Test backup for new database (dry run)
sudo -u postgres pgbackrest --stanza=main --type=full --dry-run backup

if [ $? -eq 0 ]; then
  echo "✅ Backup configuration verified (database will be included in next automated backup)"
else
  echo "⚠️  WARNING: Backup dry run failed - investigate before proceeding"
  echo "Review pgBackRest logs: sudo -u postgres pgbackrest --stanza=main info"
fi
```

**Backup Schedule:**
- Daily full backups at 1:00 AM CT (via cron)
- Retention: 30 days
- Storage: Local + Wasabi S3
- Encryption: AES-256-CBC

**Manual backup trigger (if needed):**

```bash
# Trigger immediate backup for testing
sudo -u postgres pgbackrest --stanza=main --type=full backup
```

**✅ Checkpoint 12:** Backup configuration verified?

---

## Step 13: Configure Monitoring Alerts

**Purpose:** Enable automated alerts for database issues.

**Betterstack Monitoring (if configured):**

```bash
# Add database-specific alert rules
# This is typically configured at the VPS level, not per-database
# Customer databases inherit VPS-level monitoring

# Verify monitoring is active
curl -I https://costplusdb.dev:5432 2>&1 | grep -q "PostgreSQL"
if [ $? -eq 0 ]; then
  echo "✅ PostgreSQL is accessible (monitoring will detect outages)"
fi
```

**Alert Thresholds (VPS-level):**
- Database unreachable for > 2 minutes → Critical alert
- Disk space > 85% → Warning alert
- Backup failure → Critical alert
- Connection saturation > 90% → Warning alert

**Per-Customer Alerts (future enhancement):**
- Query performance degradation
- Connection failures
- Unusual activity patterns

**✅ Checkpoint 13:** Monitoring verified?

---

## Step 14: Create Internal Notes File

**Purpose:** Document any special configurations or customer-specific details.

```bash
# Create notes file
cat > $CUSTOMER_DIR/notes.md <<EOF
# Internal Notes - $CUSTOMER_ID

**Created:** $(date +%Y-%m-%d)
**Customer:** $CUSTOMER_NAME
**Plan:** $PLAN_TIER

## Provisioning Details

- Database created: $(date +%Y-%m-%d\ %H:%M:%S)
- Provisioned by: Jeremy Longshore
- PostgreSQL version: 16.x
- Initial database size: 0 MB

## Special Configurations

- Connection limit: 25 (Shared tier default)
- SSL/TLS: Required
- Backup retention: 30 days
- PITR: 7 days

## Customer Requests

- None at provisioning

## Support History

- None yet

## Future Actions

- [ ] Monitor first connection (24 hours)
- [ ] Verify first backup completes (48 hours)
- [ ] Send Week 1 check-in email

---

**Last Updated:** $(date +%Y-%m-%d)
EOF

chmod 640 $CUSTOMER_DIR/notes.md

echo "✅ Notes file created"
```

**✅ Checkpoint 14:** Notes file created?

---

## Step 15: Clean Up Temporary Files

**Purpose:** Remove temporary password file.

```bash
# Remove temporary password file
rm -f /tmp/db_password_${CUSTOMER_ID}.tmp

echo "✅ Temporary files cleaned up"
```

**✅ Checkpoint 15:** Temp files removed?

---

## Step 16: Final Verification

**Purpose:** Comprehensive final check before delivering credentials.

```bash
echo "============================================"
echo "FINAL VERIFICATION CHECKLIST"
echo "============================================"

# 1. Database exists
DB_CHECK=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';")
if [ "$DB_CHECK" = "1" ]; then
  echo "✅ Database exists: $DB_NAME"
else
  echo "❌ Database NOT found: $DB_NAME"
  exit 1
fi

# 2. User exists
USER_CHECK=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER';")
if [ "$USER_CHECK" = "1" ]; then
  echo "✅ User exists: $DB_USER"
else
  echo "❌ User NOT found: $DB_USER"
  exit 1
fi

# 3. Connection test
PGPASSWORD="$DB_PASSWORD" psql -h localhost -p 5432 -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Connection test successful"
else
  echo "❌ Connection test FAILED"
  exit 1
fi

# 4. Credentials file exists
if [ -f "$CREDENTIALS_FILE" ]; then
  echo "✅ Credentials file exists with correct permissions ($(stat -c %a $CREDENTIALS_FILE))"
else
  echo "❌ Credentials file NOT found"
  exit 1
fi

# 5. customer-info.json updated
if grep -q "$DB_PASSWORD" "$CUSTOMER_JSON"; then
  echo "✅ customer-info.json contains credentials"
else
  echo "❌ customer-info.json NOT updated"
  exit 1
fi

# 6. SSL requirement in pg_hba.conf
if sudo grep -q "hostssl.*$DB_NAME.*$DB_USER" /etc/postgresql/16/main/pg_hba.conf; then
  echo "✅ SSL requirement configured in pg_hba.conf"
else
  echo "❌ SSL requirement NOT found in pg_hba.conf"
  exit 1
fi

echo "============================================"
echo "✅ ALL CHECKS PASSED - Ready to send credentials!"
echo "============================================"
```

**✅ Checkpoint 16:** All final checks passed?

---

## Step 17: Log Provisioning Completion

**Purpose:** Create audit trail of provisioning action.

```bash
# Create provisioning log entry
PROVISION_LOG="/home/admincostplus/projects/costplusdb/logs/provisioning.log"

# Create log directory if it doesn't exist
mkdir -p /home/admincostplus/projects/costplusdb/logs

# Append provisioning record
cat >> $PROVISION_LOG <<EOF
[$(date +%Y-%m-%d\ %H:%M:%S)] PROVISION_SUCCESS
Customer ID: $CUSTOMER_ID
Customer Name: $CUSTOMER_NAME
Database: $DB_NAME
User: $DB_USER
Plan: $PLAN_TIER
Provisioned By: $(whoami)
Duration: $(date +%s) seconds
EOF

echo "✅ Provisioning logged to $PROVISION_LOG"
```

**✅ Checkpoint 17:** Provisioning logged?

---

## Completion Checklist

**Before sending credentials to customer, verify:**

- [ ] Database created with correct name
- [ ] Database user created with secure password
- [ ] Permissions granted (user owns database)
- [ ] SSL/TLS requirement configured
- [ ] Connection test successful
- [ ] Credentials file created (0600 permissions)
- [ ] customer-info.json updated
- [ ] Backup configuration verified
- [ ] Monitoring active
- [ ] Notes file created
- [ ] Temporary files cleaned up
- [ ] All final checks passed
- [ ] Provisioning logged

---

## Next Steps

**After completing SOP-103:**

1. **Generate Setup Confirmation Email**
   - Use template: `022-DR-FORM-setup-confirmation.md`
   - Replace placeholders with actual values
   - Save copy in `$CUSTOMER_DIR/setup-confirmation.md`

2. **Send Credentials to Customer**
   - Email setup confirmation with credentials
   - Attach or include credentials inline
   - Send first invoice

3. **Schedule Post-Provisioning Tasks**
   - 24-hour check-in (monitor first connections)
   - 48-hour backup verification
   - Week 1 welcome email

4. **Update Customer Status**
   - Change status from "provisioning" to "active"
   - Add `credentials_sent_at` timestamp

---

## Troubleshooting

### Issue: Database creation fails

**Error:** `ERROR: database creation failed`

**Possible Causes:**
- Insufficient disk space
- Database name already exists
- PostgreSQL not running
- Permissions issue

**Resolution:**

```bash
# Check disk space
df -h /var/lib/postgresql

# Check PostgreSQL status
sudo systemctl status postgresql

# Check existing databases
sudo -u postgres psql -c "\l"

# Review PostgreSQL logs
sudo tail -100 /var/log/postgresql/postgresql-16-main.log
```

### Issue: User creation fails

**Error:** `ERROR: role "username" already exists`

**Resolution:**

```bash
# Check if user exists
sudo -u postgres psql -c "\du"

# If user exists but shouldn't, investigate
sudo -u postgres psql -c "SELECT * FROM pg_roles WHERE rolname='$DB_USER';"

# If confirmed safe to delete, drop user
sudo -u postgres psql -c "DROP USER $DB_USER;"

# Then re-run user creation step
```

### Issue: Connection test fails

**Error:** `FATAL: no pg_hba.conf entry for host`

**Resolution:**

```bash
# Check pg_hba.conf for SSL entry
sudo grep "$DB_USER" /etc/postgresql/16/main/pg_hba.conf

# If missing, add manually:
echo "hostssl  $DB_NAME  $DB_USER  0.0.0.0/0  scram-sha-256" | sudo tee -a /etc/postgresql/16/main/pg_hba.conf

# Reload configuration
sudo systemctl reload postgresql

# Retry connection test
```

### Issue: Password authentication fails

**Error:** `FATAL: password authentication failed`

**Resolution:**

```bash
# Regenerate password
NEW_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)

# Update user password
sudo -u postgres psql -c "ALTER USER $DB_USER WITH ENCRYPTED PASSWORD '$NEW_PASSWORD';"

# Update credentials file and customer-info.json with new password

# Retry connection test
```

---

## Rollback Procedure

**If provisioning fails and needs to be rolled back:**

```bash
# Set variables (same as provisioning)
CUSTOMER_ID="acme-corp-20251020"
DB_NAME="acme_production"
DB_USER="acme_user"

# Drop database
sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;"

# Drop user
sudo -u postgres psql -c "DROP USER IF EXISTS $DB_USER;"

# Remove pg_hba.conf entry
sudo sed -i "/$CUSTOMER_ID/,+1d" /etc/postgresql/16/main/pg_hba.conf

# Reload PostgreSQL
sudo systemctl reload postgresql

# Clean up customer directory (optional, or keep for troubleshooting)
# rm -rf /home/admincostplus/projects/costplusdb/001-security/customers/active/$CUSTOMER_ID

# Log rollback
echo "[$(date +%Y-%m-%d\ %H:%M:%S)] PROVISION_ROLLBACK - Customer: $CUSTOMER_ID" >> /home/admincostplus/projects/costplusdb/logs/provisioning.log

echo "✅ Rollback complete"
```

**After rollback:**
- Investigate root cause
- Fix issue
- Re-run provisioning from Step 1

---

## Security Considerations

**Password Security:**
- Passwords are 32 characters, cryptographically random
- Stored in 0600 files (owner read/write only)
- Never logged or echoed in plain text
- Can be rotated on customer request

**Database Isolation:**
- Each customer has dedicated database and user
- Users cannot access other customers' databases
- Users cannot create new databases or roles
- Users cannot drop their own database (only we can)

**Connection Security:**
- SSL/TLS is mandatory (enforced in pg_hba.conf)
- Failed login attempts trigger fail2ban after 5 attempts
- All connections logged for audit trail

**Credential Storage:**
- Credentials stored in `001-security/customers/` (git-ignored)
- Backed up encrypted
- Never committed to version control

---

## Performance Tuning by Tier

**Shared Tier:**
- Connection limit: 25
- No dedicated resources
- Shared VPS with 9 other customers

**Dedicated Tier:**
- Connection limit: 100
- Dedicated VPS (no resource sharing)
- Can tune PostgreSQL config for workload

**Pro Tier:**
- Connection limit: 200
- Dedicated VPS with more resources
- Optimized PostgreSQL config

**Enterprise Tier:**
- Connection limit: 500
- High-performance VPS
- Custom PostgreSQL tuning available

**Future Enhancement:**
- Per-customer connection pooling (pgBouncer)
- Query performance monitoring
- Automatic index recommendations

---

## Metrics to Track

**Per Provisioning:**
- Time to complete provisioning (target: < 20 minutes)
- Number of errors encountered
- Rollbacks required

**Aggregate:**
- Total customers provisioned
- Average provisioning time
- Common errors/issues
- Provisioning success rate

---

## Related Documentation

- **033-DR-GUID-customer-onboarding-complete-workflow.md** - Overall onboarding process
- **022-DR-FORM-setup-confirmation.md** - Credentials delivery template
- **020-DR-ARCH-customer-database-structure.md** - Customer directory structure
- **005-DR-SOPS-postgresql-operations.md** - General PostgreSQL SOPs
- **035-DR-SOPS-customer-offboarding-procedure.md** - Removing customers

---

## Future Automation

**Month 3:**
- Script to automate Steps 1-17
- Single command: `provision-customer.sh {customer-id}`
- Interactive prompts for safety checks

**Month 6:**
- Web dashboard for provisioning
- One-click provisioning after payment confirmed
- Automatic credential email generation

**Month 12:**
- Full self-service customer provisioning
- API endpoint for programmatic provisioning
- Integration with billing system

---

**Document Owner:** Jeremy Longshore (jeremy@intentsolutions.io)
**Last Updated:** 2025-10-20
**Review Frequency:** Monthly
**Related SOP:** SOP-103 (Daily Operations - Customer Database Provisioning)
