# Security Implementation Guide
## Step-by-Step: Fix Critical Gaps Before First Customer

**Purpose:** Complete the 5 critical customer security items identified in security audit
**Timeline:** 2-3 days total
**Difficulty:** Intermediate
**Prerequisites:** You must have a VPS already set up with Ubuntu 24.04

---

## Critical Item #1: PostgreSQL SSL/TLS Enforcement

**Time Required:** 1-2 hours
**Impact:** Encrypts all customer database connections

### Step 1.1: Generate SSL Certificates

You have two options: self-signed (quick) or Let's Encrypt (production-ready).

#### Option A: Self-Signed Certificate (Quick Start)

```bash
# SSH into your VPS
ssh -i ~/.ssh/costplusdb_ed25519 -p 2222 admin@<VPS_IP>

# Switch to postgres user
sudo su - postgres

# Create SSL directory
mkdir -p /var/lib/postgresql/16/main/ssl
cd /var/lib/postgresql/16/main/ssl

# Generate private key (no passphrase for automated startup)
openssl genrsa -out server.key 2048

# Generate certificate signing request
openssl req -new -key server.key -out server.csr
# When prompted:
# - Country: US
# - State: Your state
# - City: Your city
# - Organization: CostPlusDB
# - Common Name: db.costplusdb.dev (or your domain)
# - Email: jeremy@intentsolutions.io
# - Challenge password: (leave blank)

# Generate self-signed certificate (valid 365 days)
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt

# Set proper permissions (CRITICAL!)
chmod 600 server.key
chmod 644 server.crt
chown postgres:postgres server.key server.crt

# Exit postgres user
exit
```

#### Option B: Let's Encrypt (Production - if you have a domain)

```bash
# Install certbot
sudo apt install certbot

# Get certificate (requires port 80 open temporarily)
sudo certbot certonly --standalone -d db.costplusdb.dev

# Copy to PostgreSQL directory
sudo cp /etc/letsencrypt/live/db.costplusdb.dev/fullchain.pem /var/lib/postgresql/16/main/ssl/server.crt
sudo cp /etc/letsencrypt/live/db.costplusdb.dev/privkey.pem /var/lib/postgresql/16/main/ssl/server.key

# Set permissions
sudo chown postgres:postgres /var/lib/postgresql/16/main/ssl/server.*
sudo chmod 600 /var/lib/postgresql/16/main/ssl/server.key
sudo chmod 644 /var/lib/postgresql/16/main/ssl/server.crt
```

### Step 1.2: Configure PostgreSQL for SSL

```bash
# Backup current config
sudo cp /etc/postgresql/16/main/postgresql.conf /etc/postgresql/16/main/postgresql.conf.backup

# Edit PostgreSQL config
sudo vim /etc/postgresql/16/main/postgresql.conf

# Find and modify these lines (or add them):
ssl = on
ssl_cert_file = '/var/lib/postgresql/16/main/ssl/server.crt'
ssl_key_file = '/var/lib/postgresql/16/main/ssl/server.key'
ssl_min_protocol_version = 'TLSv1.2'
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
ssl_prefer_server_ciphers = on

# Also set password encryption to scram-sha-256
password_encryption = scram-sha-256

# Enable connection logging
log_connections = on
log_disconnections = on
log_line_prefix = '%m [%p] %u@%d from %h '
```

### Step 1.3: Configure pg_hba.conf to Require SSL

```bash
# Backup current config
sudo cp /etc/postgresql/16/main/pg_hba.conf /etc/postgresql/16/main/pg_hba.conf.backup

# Edit pg_hba.conf
sudo vim /etc/postgresql/16/main/pg_hba.conf

# REPLACE the entire file with this:
```

```
# PostgreSQL Client Authentication Configuration
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local connections (for admin tasks)
local   all             postgres                                peer
local   all             all                                     peer

# IPv4 remote connections - REQUIRE SSL
hostssl all             all             0.0.0.0/0               scram-sha-256

# IPv6 remote connections - REQUIRE SSL
hostssl all             all             ::/0                    scram-sha-256

# REJECT non-SSL connections (important!)
hostnossl all           all             0.0.0.0/0               reject
hostnossl all           all             ::/0                    reject
```

### Step 1.4: Restart PostgreSQL

```bash
# Restart PostgreSQL
sudo systemctl restart postgresql

# Check if it started successfully
sudo systemctl status postgresql

# If it failed, check logs:
sudo journalctl -u postgresql -n 50

# Common issues:
# - Wrong file permissions on server.key (must be 600)
# - Wrong owner on SSL files (must be postgres:postgres)
# - Invalid certificate
```

### Step 1.5: Test SSL Connection

```bash
# From your laptop (NOT on the VPS):
# Install PostgreSQL client if needed
# Ubuntu/Debian: sudo apt install postgresql-client
# Mac: brew install postgresql

# Test SSL connection (this should work)
psql "host=<VPS_IP> port=5432 dbname=postgres user=postgres sslmode=require"

# This should FAIL (no SSL)
psql "host=<VPS_IP> port=5432 dbname=postgres user=postgres sslmode=disable"
# Expected error: "FATAL: no pg_hba.conf entry for host"

# Check SSL is active
psql "host=<VPS_IP> port=5432 dbname=postgres user=postgres sslmode=require" -c "SHOW ssl;"
# Should show: on
```

**✅ Checkpoint:** SSL connections work, non-SSL connections rejected

---

## Critical Item #2: fail2ban for PostgreSQL

**Time Required:** 30 minutes
**Impact:** Blocks brute-force password attacks on customer databases

### Step 2.1: Create PostgreSQL Filter

```bash
# SSH into VPS
ssh -i ~/.ssh/costplusdb_ed25519 -p 2222 admin@<VPS_IP>

# Create filter for PostgreSQL
sudo vim /etc/fail2ban/filter.d/postgresql.conf
```

Add this content:

```ini
[Definition]

# Fail2Ban filter for PostgreSQL authentication failures

failregex = ^.*FATAL:.*authentication failed for user.*$
            ^.*FATAL:.*password authentication failed for user.*$
            ^.*FATAL:.*no pg_hba\.conf entry for host.*$
            ^.*FATAL:.*database .* does not exist.*$

ignoreregex =
```

### Step 2.2: Create PostgreSQL Jail

```bash
# Create jail configuration
sudo vim /etc/fail2ban/jail.d/postgresql.local
```

Add this content:

```ini
[postgresql]
enabled  = true
port     = 5432
filter   = postgresql
logpath  = /var/log/postgresql/postgresql-16-main.log
maxretry = 5
findtime = 600
bantime  = 3600
action   = ufw
```

**Explanation:**
- `maxretry = 5`: Allow 5 failed attempts
- `findtime = 600`: Within 10 minutes (600 seconds)
- `bantime = 3600`: Ban for 1 hour (3600 seconds)
- `action = ufw`: Use UFW to block the IP

### Step 2.3: Enable PostgreSQL Logging

```bash
# Edit PostgreSQL config to ensure logging is enabled
sudo vim /etc/postgresql/16/main/postgresql.conf

# Find/add these lines:
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'all'  # Log all SQL statements (optional, verbose)
log_min_error_statement = error

# Create log directory if it doesn't exist
sudo mkdir -p /var/log/postgresql
sudo chown postgres:postgres /var/log/postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Step 2.4: Restart fail2ban

```bash
# Restart fail2ban
sudo systemctl restart fail2ban

# Check status
sudo fail2ban-client status

# Should show both sshd and postgresql jails:
# |- Number of jail:      2
# `- Jail list:   postgresql, sshd

# Check PostgreSQL jail specifically
sudo fail2ban-client status postgresql
```

### Step 2.5: Test fail2ban

```bash
# From your laptop, intentionally fail 6 times:
for i in {1..6}; do
  psql "host=<VPS_IP> port=5432 dbname=test user=fakeuser password=wrong sslmode=require" 2>/dev/null
  sleep 1
done

# Check if your IP was banned
sudo fail2ban-client status postgresql

# Should show:
# |- Currently banned: 1
# `- Banned IP list:   <YOUR_IP>

# Unban yourself
sudo fail2ban-client set postgresql unbanip <YOUR_IP>
```

**✅ Checkpoint:** fail2ban blocks IPs after 5 failed PostgreSQL login attempts

---

## Critical Item #3: Per-Customer Database Isolation

**Time Required:** 1 hour
**Impact:** Prevents customers from accessing each other's data

### Step 3.1: Create Customer Provisioning Script

```bash
# On your VPS
cd /opt/costplusdb/scripts

# Create provisioning script
vim provision-customer-database.sh
```

Add this content:

```bash
#!/bin/bash
set -e  # Exit on any error

# Customer Database Provisioning Script
# Usage: ./provision-customer-database.sh <customer_id> <customer_email>

CUSTOMER_ID="$1"
CUSTOMER_EMAIL="$2"

if [ -z "$CUSTOMER_ID" ] || [ -z "$CUSTOMER_EMAIL" ]; then
    echo "Usage: $0 <customer_id> <customer_email>"
    echo "Example: $0 cust001 customer@example.com"
    exit 1
fi

echo "================================================"
echo "Provisioning database for Customer: $CUSTOMER_ID"
echo "================================================"

# Generate secure random password (20 chars)
DB_PASSWORD=$(openssl rand -base64 20 | tr -d "=+/" | cut -c1-20)

# Database and user names
DB_NAME="costplusdb_${CUSTOMER_ID}"
DB_USER="user_${CUSTOMER_ID}"

echo "Step 1: Creating database..."
sudo -u postgres psql <<EOF
-- Create database
CREATE DATABASE ${DB_NAME}
    WITH OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- Revoke all public access
REVOKE ALL ON DATABASE ${DB_NAME} FROM PUBLIC;
EOF

echo "Step 2: Creating user with scram-sha-256 password..."
sudo -u postgres psql <<EOF
-- Create user with strong password
CREATE USER ${DB_USER} WITH
    LOGIN
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOINHERIT
    NOREPLICATION
    CONNECTION LIMIT 50
    PASSWORD '${DB_PASSWORD}';

-- Grant connect only to their database
GRANT CONNECT ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF

echo "Step 3: Setting up schema permissions..."
sudo -u postgres psql -d ${DB_NAME} <<EOF
-- Revoke default public schema access
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE ${DB_NAME} FROM PUBLIC;

-- Grant schema access to customer user
GRANT USAGE ON SCHEMA public TO ${DB_USER};

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${DB_USER};

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO ${DB_USER};

-- Set search path
ALTER USER ${DB_USER} SET search_path = public;
EOF

echo "Step 4: Creating metadata tracking..."
sudo -u postgres psql -d postgres <<EOF
-- Create provisioning log table (if doesn't exist)
CREATE TABLE IF NOT EXISTS costplusdb_customers (
    customer_id VARCHAR(50) PRIMARY KEY,
    database_name VARCHAR(100),
    database_user VARCHAR(100),
    customer_email VARCHAR(255),
    provisioned_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active'
);

-- Insert customer record
INSERT INTO costplusdb_customers (customer_id, database_name, database_user, customer_email)
VALUES ('${CUSTOMER_ID}', '${DB_NAME}', '${DB_USER}', '${CUSTOMER_EMAIL}');
EOF

echo "Step 5: Testing connection..."
PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U ${DB_USER} -d ${DB_NAME} -c "SELECT current_database(), current_user;" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Connection test PASSED"
else
    echo "❌ Connection test FAILED"
    exit 1
fi

echo ""
echo "================================================"
echo "✅ Database provisioning complete!"
echo "================================================"
echo ""
echo "Customer ID:       ${CUSTOMER_ID}"
echo "Database Name:     ${DB_NAME}"
echo "Database User:     ${DB_USER}"
echo "Database Password: ${DB_PASSWORD}"
echo "Customer Email:    ${CUSTOMER_EMAIL}"
echo ""
echo "Connection String:"
echo "postgresql://${DB_USER}:${DB_PASSWORD}@<your-server>:5432/${DB_NAME}?sslmode=require"
echo ""
echo "⚠️  SAVE THE PASSWORD - It's only shown once!"
echo ""

# Save credentials to encrypted file
CREDS_FILE="/opt/costplusdb/configs/customer-${CUSTOMER_ID}-credentials.txt"
cat > ${CREDS_FILE} <<EOF
Customer ID: ${CUSTOMER_ID}
Email: ${CUSTOMER_EMAIL}
Database: ${DB_NAME}
User: ${DB_USER}
Password: ${DB_PASSWORD}
Provisioned: $(date)

Connection String:
postgresql://${DB_USER}:${DB_PASSWORD}@<your-server>:5432/${DB_NAME}?sslmode=require
EOF

chmod 600 ${CREDS_FILE}
echo "Credentials saved to: ${CREDS_FILE}"
```

Make it executable:

```bash
chmod +x provision-customer-database.sh
```

### Step 3.2: Test Customer Provisioning

```bash
# Provision a test customer
./provision-customer-database.sh test001 test@example.com

# Should output credentials and connection string

# Test connection (use password from output)
psql "postgresql://user_test001:<password>@localhost:5432/costplusdb_test001?sslmode=require"

# Verify isolation - try to access another database
psql "postgresql://user_test001:<password>@localhost:5432/postgres?sslmode=require"
# Should FAIL with: "FATAL: no pg_hba.conf entry"
```

### Step 3.3: Create Deprovisioning Script

```bash
cd /opt/costplusdb/scripts
vim deprovision-customer-database.sh
```

Add this content:

```bash
#!/bin/bash
set -e

CUSTOMER_ID="$1"

if [ -z "$CUSTOMER_ID" ]; then
    echo "Usage: $0 <customer_id>"
    exit 1
fi

DB_NAME="costplusdb_${CUSTOMER_ID}"
DB_USER="user_${CUSTOMER_ID}"

echo "⚠️  WARNING: About to delete database and user for: $CUSTOMER_ID"
read -p "Are you sure? (type YES to confirm): " confirm

if [ "$confirm" != "YES" ]; then
    echo "Aborted."
    exit 1
fi

echo "Terminating active connections..."
sudo -u postgres psql <<EOF
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${DB_NAME}';
EOF

echo "Dropping database..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${DB_NAME};"

echo "Dropping user..."
sudo -u postgres psql -c "DROP USER IF EXISTS ${DB_USER};"

echo "Updating customer status..."
sudo -u postgres psql -d postgres <<EOF
UPDATE costplusdb_customers
SET status = 'deleted', deleted_at = NOW()
WHERE customer_id = '${CUSTOMER_ID}';
EOF

echo "Archiving credentials..."
mv /opt/costplusdb/configs/customer-${CUSTOMER_ID}-credentials.txt \
   /opt/costplusdb/configs/archive/customer-${CUSTOMER_ID}-deleted-$(date +%Y%m%d).txt

echo "✅ Customer ${CUSTOMER_ID} deprovisioned"
```

Make it executable:

```bash
chmod +x deprovision-customer-database.sh
mkdir -p /opt/costplusdb/configs/archive
```

**✅ Checkpoint:** Can provision isolated customer databases, customers cannot access each other

---

## Critical Item #4: Backup Encryption

**Time Required:** 1 hour
**Impact:** Protects backup data at rest in Wasabi S3

### Step 4.1: Install pgBackRest

```bash
# Install pgBackRest
sudo apt install pgbackrest

# Check version
pgbackrest version
```

### Step 4.2: Configure pgBackRest with Encryption

```bash
# Create pgBackRest config directory
sudo mkdir -p /etc/pgbackrest
sudo mkdir -p /var/log/pgbackrest
sudo chown postgres:postgres /var/log/pgbackrest

# Generate encryption passphrase (SAVE THIS SECURELY!)
BACKUP_PASSPHRASE=$(openssl rand -base64 32)
echo "Backup Encryption Passphrase: ${BACKUP_PASSPHRASE}"
echo "⚠️  SAVE THIS TO YOUR PASSWORD MANAGER NOW!"

# Create pgBackRest configuration
sudo vim /etc/pgbackrest/pgbackrest.conf
```

Add this content (replace placeholders):

```ini
[global]
# Repository configuration
repo1-type=s3
repo1-s3-bucket=costplusdb-backups
repo1-s3-endpoint=s3.wasabisys.com
repo1-s3-region=us-east-1
repo1-s3-key=<YOUR_WASABI_ACCESS_KEY>
repo1-s3-key-secret=<YOUR_WASABI_SECRET_KEY>

# Encryption (CRITICAL!)
repo1-cipher-type=aes-256-cbc
repo1-cipher-pass=<PASTE_BACKUP_PASSPHRASE_HERE>

# Retention policy
repo1-retention-full=4
repo1-retention-diff=4

# Logging
log-level-console=info
log-level-file=debug

# PostgreSQL
[costplusdb]
pg1-path=/var/lib/postgresql/16/main
pg1-port=5432
pg1-socket-path=/var/run/postgresql
```

Set permissions:

```bash
sudo chmod 640 /etc/pgbackrest/pgbackrest.conf
sudo chown postgres:postgres /etc/pgbackrest/pgbackrest.conf
```

### Step 4.3: Configure PostgreSQL for pgBackRest

```bash
sudo vim /etc/postgresql/16/main/postgresql.conf

# Add these lines:
archive_mode = on
archive_command = 'pgbackrest --stanza=costplusdb archive-push %p'
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

### Step 4.4: Initialize pgBackRest

```bash
# Create stanza
sudo -u postgres pgbackrest --stanza=costplusdb --log-level-console=info stanza-create

# Run first full backup
sudo -u postgres pgbackrest --stanza=costplusdb --type=full backup

# Check backup info
sudo -u postgres pgbackrest --stanza=costplusdb info
```

### Step 4.5: Test Backup Restoration

```bash
# Create a test database
sudo -u postgres psql -c "CREATE DATABASE backup_test;"
sudo -u postgres psql -d backup_test -c "CREATE TABLE test (id INT, data TEXT);"
sudo -u postgres psql -d backup_test -c "INSERT INTO test VALUES (1, 'test data');"

# Stop PostgreSQL
sudo systemctl stop postgresql

# Restore from backup
sudo -u postgres pgbackrest --stanza=costplusdb --delta restore

# Start PostgreSQL
sudo systemctl start postgresql

# Verify data
sudo -u postgres psql -d backup_test -c "SELECT * FROM test;"
# Should show: 1 | test data

# Clean up test
sudo -u postgres psql -c "DROP DATABASE backup_test;"
```

### Step 4.6: Schedule Automated Backups

```bash
# Create cron job for daily backups
sudo -u postgres crontab -e

# Add these lines:
# Full backup every Sunday at 2 AM
0 2 * * 0 pgbackrest --stanza=costplusdb --type=full backup

# Incremental backup every other day at 2 AM
0 2 * * 1-6 pgbackrest --stanza=costplusdb --type=incr backup
```

**✅ Checkpoint:** Backups are encrypted and automatically run daily

---

## Critical Item #5: Incident Response SOPs

**Time Required:** 2 hours
**Impact:** Prepared response plan for security incidents

### Step 5.1: Create Incident Response Contact List

```bash
vim /opt/costplusdb/configs/incident-contacts.md
```

Add:

```markdown
# Incident Response Contact List

## Primary Responder
- Name: Jeremy Longshore
- Email: jeremy@intentsolutions.io
- Phone: [YOUR PHONE]
- Role: Operator/On-call

## Customer Communication
- Email: jeremy@intentsolutions.io
- Status Page: (future - Statuspage.io or similar)

## Third-Party Support
- VPS Provider (Contabo): support@contabo.com
- Wasabi Support: support@wasabi.com
- fail2ban/Security: (community forums)

## Legal/Compliance (if needed)
- Legal Counsel: [TBD]
- Law Enforcement: [local police non-emergency]

## Escalation Path
1. Detect incident (automated alert or manual discovery)
2. Jeremy investigates (30 min max)
3. If data breach: Email all affected customers within 1 hour
4. If requires expertise: Post to PostgreSQL forums / hire consultant
5. If law enforcement needed: Contact local police
```

### Step 5.2: Create Security Incident Response SOP

```bash
vim /opt/costplusdb/000-docs/008-DR-SOPS-incident-response-complete.md
```

Add comprehensive incident response procedures (I'll create this next).

### Step 5.3: Create Customer Breach Notification Templates

```bash
mkdir -p /opt/costplusdb/templates
vim /opt/costplusdb/templates/customer-breach-notification.txt
```

Add:

```
Subject: URGENT: Security Incident Notification - CostPlusDB

Dear [CUSTOMER_NAME],

I'm writing to inform you of a security incident that may have affected your database hosted with CostPlusDB.

WHAT HAPPENED:
[Brief description of incident]
Incident detected: [DATE/TIME]
Incident contained: [DATE/TIME]

WHAT DATA WAS AFFECTED:
[Specify: customer data, credentials, backups, etc.]

WHAT WE'VE DONE:
1. [Action taken to contain]
2. [Action taken to investigate]
3. [Action taken to prevent recurrence]

WHAT YOU SHOULD DO:
1. Rotate your database password immediately
2. Review your application logs for suspicious activity
3. [Other specific actions]

WHAT WE'RE DOING NEXT:
- [Ongoing investigation steps]
- [Preventive measures]
- I will send you a full post-mortem within 48 hours

I take full responsibility for this incident. Your trust is my top priority, and I'm committed to preventing this from happening again.

You can contact me directly:
Email: jeremy@intentsolutions.io
Phone: [YOUR PHONE]

I'm available 24/7 to answer any questions.

Sincerely,
Jeremy Longshore
CostPlusDB
```

### Step 5.4: Create Incident Response Checklist

```bash
vim /opt/costplusdb/templates/incident-response-checklist.md
```

Add:

```markdown
# Security Incident Response Checklist

## Phase 1: Detection & Triage (First 15 minutes)
- [ ] Incident detected (how: alert, customer report, manual discovery)
- [ ] Document: Date/time of detection
- [ ] Document: Initial observations
- [ ] Classify severity:
  - [ ] P0: Data breach / database down / customer data at risk
  - [ ] P1: Suspicious activity / attempted breach / degraded service
  - [ ] P2: Security concern / potential vulnerability
- [ ] If P0: Start timer for 1-hour customer notification deadline

## Phase 2: Containment (First 30 minutes)
- [ ] If compromised: Isolate affected systems (firewall block, shutdown service)
- [ ] If credentials leaked: Rotate all passwords immediately
- [ ] If database compromised: Take snapshot before any changes
- [ ] Document all actions taken

## Phase 3: Investigation (First 1 hour)
- [ ] Review logs: /var/log/postgresql/, /var/log/auth.log, fail2ban
- [ ] Check active connections: `sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"`
- [ ] Check for unauthorized users: `sudo -u postgres psql -c "\du"`
- [ ] Check fail2ban bans: `sudo fail2ban-client status`
- [ ] Identify: What happened, how, when, what data affected
- [ ] Document findings

## Phase 4: Customer Notification (Within 1 hour for P0)
- [ ] Identify affected customers
- [ ] Send breach notification email (use template)
- [ ] Include: What happened, what data, what actions to take
- [ ] CC: Save copy to /opt/costplusdb/logs/incidents/

## Phase 5: Remediation (Within 24 hours)
- [ ] Fix vulnerability that caused incident
- [ ] Restore service if down
- [ ] Verify no backdoors/persistence mechanisms
- [ ] Run security audit: `sudo lynis audit system`
- [ ] Update security documentation

## Phase 6: Post-Mortem (Within 48 hours)
- [ ] Write detailed incident report
- [ ] Send to affected customers
- [ ] Publish on transparency page (if appropriate)
- [ ] Update incident response procedures

## Phase 7: Prevention (Within 1 week)
- [ ] Implement additional security controls
- [ ] Add monitoring/alerts for this type of incident
- [ ] Update SOPs
- [ ] Schedule security review
```

**✅ Checkpoint:** Incident response procedures documented and ready to execute

---

## Final Verification Checklist

After completing all 5 items, run this checklist:

```bash
# SSH into VPS
ssh -i ~/.ssh/costplusdb_ed25519 -p 2222 admin@<VPS_IP>

# 1. Verify PostgreSQL SSL is enforced
sudo -u postgres psql -c "SHOW ssl;"  # Should show: on

# 2. Verify fail2ban is monitoring PostgreSQL
sudo fail2ban-client status postgresql  # Should show active jail

# 3. Provision a test customer
cd /opt/costplusdb/scripts
./provision-customer-database.sh test002 test2@example.com

# 4. Verify backup encryption is configured
sudo -u postgres pgbackrest --stanza=costplusdb info  # Should show encrypted backups

# 5. Verify incident response docs exist
ls -la /opt/costplusdb/templates/
# Should show:
# - customer-breach-notification.txt
# - incident-response-checklist.md
```

## You're Ready When...

✅ PostgreSQL only accepts SSL connections
✅ fail2ban blocks failed PostgreSQL login attempts
✅ Customer provisioning script creates isolated databases
✅ Backups are encrypted with AES-256
✅ Incident response procedures documented
✅ Customer breach notification template ready
✅ All scripts tested with dummy data

**DO NOT onboard real customers until all checkboxes above are ✅**

---

## Quick Reference Commands

```bash
# Check PostgreSQL SSL status
sudo -u postgres psql -c "SHOW ssl;"

# Check fail2ban status
sudo fail2ban-client status postgresql

# Provision new customer
/opt/costplusdb/scripts/provision-customer-database.sh <customer_id> <email>

# Manual backup
sudo -u postgres pgbackrest --stanza=costplusdb --type=full backup

# View backup status
sudo -u postgres pgbackrest --stanza=costplusdb info

# Check active database connections
sudo -u postgres psql -c "SELECT usename, datname, client_addr FROM pg_stat_activity;"

# Emergency: Block all PostgreSQL connections
sudo ufw deny 5432

# Emergency: Kill all customer connections
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname != 'postgres';"
```

---

**Created:** October 19, 2025
**Owner:** Jeremy Longshore
**Next Review:** After first customer onboarded

**Questions?** jeremy@intentsolutions.io
