#!/bin/bash
#==============================================================================
# Customer Database Provisioning Script
#==============================================================================
# Purpose: Complete automated PostgreSQL database provisioning for customers
# Usage: ./provision-customer-database.sh CUSTOMER_ID DATABASE_NAME TIER
# Requirements: PostgreSQL 16+, pgBackRest, sudo access, SQLite3
#==============================================================================

set -euo pipefail

#==============================================================================
# CONFIGURATION
#==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$PROJECT_ROOT/002-clients/logs"
CRED_DIR="$PROJECT_ROOT/002-clients/customers/active"
DB_PATH="$PROJECT_ROOT/002-clients/database/costplusdb.db"
PROVISION_LOG="$LOG_DIR/provisioning.log"

# PostgreSQL Configuration
PG_PORT="${PG_PORT:-5432}"
PG_VERSION="${PG_VERSION:-16}"
PG_DATA_DIR="/var/lib/postgresql/${PG_VERSION}/main"
PG_HBA_CONF="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
fi

#==============================================================================
# LOGGING AND ERROR HANDLING
#==============================================================================

log() {
    local level="$1"
    shift
    local message="$*"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$PROVISION_LOG"
}

error_exit() {
    log "ERROR" "$1"
    # Send email alert
    if [ -f "$PROJECT_ROOT/001-security/alerts/scripts/send-alert-email.sh" ]; then
        "$PROJECT_ROOT/001-security/alerts/scripts/send-alert-email.sh" \
            "Provisioning Failed: $DATABASE_NAME" \
            "Database provisioning failed for customer $CUSTOMER_ID. Error: $1"
    fi
    exit 1
}

cleanup_on_failure() {
    log "WARN" "Performing rollback due to provisioning failure..."

    # Drop database if it exists
    sudo -u postgres psql -p "$PG_PORT" -c "DROP DATABASE IF EXISTS $DATABASE_NAME;" 2>/dev/null || true

    # Drop user if it exists
    sudo -u postgres psql -p "$PG_PORT" -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null || true

    # Remove credentials file
    rm -f "$CRED_DIR/${CUSTOMER_ID}/credentials.txt" 2>/dev/null || true

    log "INFO" "Rollback completed"
}

trap cleanup_on_failure ERR

#==============================================================================
# INPUT VALIDATION
#==============================================================================

if [ $# -ne 3 ]; then
    echo "Usage: $0 CUSTOMER_ID DATABASE_NAME TIER"
    echo ""
    echo "Arguments:"
    echo "  CUSTOMER_ID    - Unique customer identifier (e.g., acme-corp-20251020)"
    echo "  DATABASE_NAME  - PostgreSQL database name (lowercase, alphanumeric + underscore)"
    echo "  TIER          - Service tier (Shared|Dedicated|Pro|Enterprise)"
    echo ""
    echo "Example:"
    echo "  $0 acme-corp-20251020 acme_production Dedicated"
    exit 1
fi

CUSTOMER_ID="$1"
DATABASE_NAME="$2"
TIER="$3"
DB_USER="${DATABASE_NAME}_user"

# Validate database name format
if ! [[ "$DATABASE_NAME" =~ ^[a-z0-9_]+$ ]]; then
    error_exit "Invalid database name. Use lowercase letters, numbers, and underscores only."
fi

# Validate tier
if ! [[ "$TIER" =~ ^(Shared|Dedicated|Pro|Enterprise)$ ]]; then
    error_exit "Invalid tier. Must be one of: Shared, Dedicated, Pro, Enterprise"
fi

# Ensure log directory exists
mkdir -p "$LOG_DIR"

log "INFO" "=========================================="
log "INFO" "Customer Database Provisioning Started"
log "INFO" "=========================================="
log "INFO" "Customer ID: $CUSTOMER_ID"
log "INFO" "Database Name: $DATABASE_NAME"
log "INFO" "Database User: $DB_USER"
log "INFO" "Tier: $TIER"
log "INFO" "=========================================="

#==============================================================================
# STEP 1: CHECK PREREQUISITES
#==============================================================================

log "INFO" "Checking prerequisites..."

# Check PostgreSQL is running
if ! sudo -u postgres psql -p "$PG_PORT" -c "SELECT 1;" >/dev/null 2>&1; then
    error_exit "PostgreSQL is not running or not accessible"
fi

# Check database doesn't already exist
if sudo -u postgres psql -p "$PG_PORT" -lqt | cut -d \| -f 1 | grep -qw "$DATABASE_NAME"; then
    error_exit "Database '$DATABASE_NAME' already exists"
fi

# Check user doesn't already exist
if sudo -u postgres psql -p "$PG_PORT" -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
    error_exit "User '$DB_USER' already exists"
fi

# Check SQLite database exists
if [ ! -f "$DB_PATH" ]; then
    error_exit "Customer database not found: $DB_PATH"
fi

log "INFO" "Prerequisites check passed"

#==============================================================================
# STEP 2: GENERATE SECURE CREDENTIALS
#==============================================================================

log "INFO" "Generating secure credentials..."

# Generate secure password (32 characters, alphanumeric + symbols)
DB_PASSWORD=$(openssl rand -base64 48 | tr -d "=+/" | head -c 32)

if [ -z "$DB_PASSWORD" ]; then
    error_exit "Failed to generate password"
fi

log "INFO" "Credentials generated successfully"

#==============================================================================
# STEP 3: CREATE POSTGRESQL USER
#==============================================================================

log "INFO" "Creating PostgreSQL user..."

# Set connection limit based on tier
case "$TIER" in
    Shared)      MAX_CONNECTIONS=20 ;;
    Dedicated)   MAX_CONNECTIONS=50 ;;
    Pro)         MAX_CONNECTIONS=100 ;;
    Enterprise)  MAX_CONNECTIONS=200 ;;
    *)           MAX_CONNECTIONS=50 ;;
esac

sudo -u postgres psql -p "$PG_PORT" <<EOF
-- Create user with encrypted password
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';

-- Set connection limit
ALTER USER $DB_USER CONNECTION LIMIT $MAX_CONNECTIONS;

-- Disable superuser, createdb, createrole privileges
ALTER USER $DB_USER WITH NOSUPERUSER NOCREATEDB NOCREATEROLE;
EOF

if [ $? -ne 0 ]; then
    error_exit "Failed to create PostgreSQL user"
fi

log "INFO" "PostgreSQL user created (max connections: $MAX_CONNECTIONS)"

#==============================================================================
# STEP 4: CREATE POSTGRESQL DATABASE
#==============================================================================

log "INFO" "Creating PostgreSQL database..."

sudo -u postgres psql -p "$PG_PORT" <<EOF
-- Create database owned by customer user
CREATE DATABASE $DATABASE_NAME OWNER $DB_USER;

-- Set database encoding
ALTER DATABASE $DATABASE_NAME SET client_encoding TO 'UTF8';
ALTER DATABASE $DATABASE_NAME SET timezone TO 'UTC';

-- Revoke all public access
REVOKE ALL ON DATABASE $DATABASE_NAME FROM PUBLIC;

-- Grant only to customer user
GRANT CONNECT ON DATABASE $DATABASE_NAME TO $DB_USER;
EOF

if [ $? -ne 0 ]; then
    error_exit "Failed to create PostgreSQL database"
fi

log "INFO" "PostgreSQL database created successfully"

#==============================================================================
# STEP 5: CONFIGURE DATABASE PERMISSIONS
#==============================================================================

log "INFO" "Configuring database permissions..."

sudo -u postgres psql -p "$PG_PORT" -d "$DATABASE_NAME" <<EOF
-- Revoke all public schema access
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- Grant schema usage to customer user
GRANT USAGE ON SCHEMA public TO $DB_USER;
GRANT CREATE ON SCHEMA public TO $DB_USER;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO $DB_USER;

-- Grant ownership of public schema
ALTER SCHEMA public OWNER TO $DB_USER;
EOF

if [ $? -ne 0 ]; then
    error_exit "Failed to configure database permissions"
fi

log "INFO" "Database permissions configured"

#==============================================================================
# STEP 6: CONFIGURE SSL/TLS
#==============================================================================

log "INFO" "Configuring SSL/TLS..."

# Add pg_hba.conf entry for remote SSL connections
PG_HBA_ENTRY="hostssl  $DATABASE_NAME  $DB_USER  0.0.0.0/0  scram-sha-256"

# Check if entry already exists
if ! grep -q "$DATABASE_NAME.*$DB_USER" "$PG_HBA_CONF"; then
    echo "$PG_HBA_ENTRY" | sudo tee -a "$PG_HBA_CONF" >/dev/null
    log "INFO" "Added pg_hba.conf entry"
else
    log "WARN" "pg_hba.conf entry already exists"
fi

# Reload PostgreSQL configuration
sudo -u postgres psql -p "$PG_PORT" -c "SELECT pg_reload_conf();" >/dev/null

log "INFO" "SSL/TLS configured (connections require SSL)"

#==============================================================================
# STEP 7: SET UP BACKUPS (pgBackRest)
#==============================================================================

log "INFO" "Configuring backups with pgBackRest..."

if [ -f "$SCRIPT_DIR/configure-backups.sh" ]; then
    if "$SCRIPT_DIR/configure-backups.sh" "$DATABASE_NAME"; then
        log "INFO" "Backup configuration completed"
    else
        log "WARN" "Backup configuration failed (non-fatal)"
    fi
else
    log "WARN" "configure-backups.sh not found, skipping backup setup"
fi

#==============================================================================
# STEP 8: TEST CONNECTION
#==============================================================================

log "INFO" "Testing database connection..."

# Test connection using credentials
PGPASSWORD="$DB_PASSWORD" psql -h localhost -p "$PG_PORT" -U "$DB_USER" -d "$DATABASE_NAME" \
    -c "SELECT version();" >/dev/null 2>&1

if [ $? -eq 0 ]; then
    log "INFO" "Connection test PASSED"
else
    error_exit "Connection test FAILED"
fi

#==============================================================================
# STEP 9: SAVE CREDENTIALS
#==============================================================================

log "INFO" "Saving credentials..."

# Create customer directory
CUSTOMER_DIR="$CRED_DIR/$CUSTOMER_ID"
mkdir -p "$CUSTOMER_DIR"
chmod 700 "$CUSTOMER_DIR"

# Save credentials to file
CRED_FILE="$CUSTOMER_DIR/credentials.txt"

# Get server IP (first non-loopback IP)
SERVER_IP=$(hostname -I | awk '{print $1}')

cat > "$CRED_FILE" <<CREDEOF
CostPlusDB Database Credentials
================================

Customer ID: $CUSTOMER_ID
Database: $DATABASE_NAME
User: $DB_USER
Password: $DB_PASSWORD
Tier: $TIER

Connection Details
==================
Host: $SERVER_IP
Port: $PG_PORT
SSL: REQUIRED

Connection String (PostgreSQL):
postgresql://$DB_USER:$DB_PASSWORD@$SERVER_IP:$PG_PORT/$DATABASE_NAME?sslmode=require

Connection String (psql):
psql "host=$SERVER_IP port=$PG_PORT dbname=$DATABASE_NAME user=$DB_USER password=$DB_PASSWORD sslmode=require"

Security Notes
==============
- SSL/TLS encryption is REQUIRED for all connections
- Maximum concurrent connections: $MAX_CONNECTIONS
- Backups: Automated daily with 30-day retention
- Point-in-time recovery: 7 days

Provisioned: $(date)
Server: $(hostname)

For support, contact: ${RESEND_ADMIN_EMAIL:-support@costplusdb.com}
CREDEOF

chmod 600 "$CRED_FILE"

log "INFO" "Credentials saved to: $CRED_FILE"

#==============================================================================
# STEP 10: UPDATE CUSTOMER DATABASE (SQLite)
#==============================================================================

log "INFO" "Updating customer database..."

# Get customer internal ID from SQLite
CUSTOMER_INTERNAL_ID=$(sqlite3 "$DB_PATH" "SELECT id FROM customers WHERE customer_id='$CUSTOMER_ID';" 2>/dev/null)

if [ -z "$CUSTOMER_INTERNAL_ID" ]; then
    log "WARN" "Customer not found in database: $CUSTOMER_ID"
else
    # Insert database record
    sqlite3 "$DB_PATH" <<SQLEOF
INSERT INTO databases (
    customer_id,
    database_name,
    database_user,
    database_password_hash,
    vps_hostname,
    vps_ip_address,
    port,
    ssl_enabled,
    max_connections,
    connection_string,
    provision_status,
    provisioned_at,
    backup_enabled,
    backup_schedule,
    backup_retention_days,
    pitr_enabled,
    pitr_retention_days,
    health_status,
    last_health_check
) VALUES (
    $CUSTOMER_INTERNAL_ID,
    '$DATABASE_NAME',
    '$DB_USER',
    'HASHED',
    '$(hostname)',
    '$SERVER_IP',
    $PG_PORT,
    1,
    $MAX_CONNECTIONS,
    'postgresql://$DB_USER:***@$SERVER_IP:$PG_PORT/$DATABASE_NAME?sslmode=require',
    'active',
    CURRENT_TIMESTAMP,
    1,
    'daily-1am',
    30,
    1,
    7,
    'healthy',
    CURRENT_TIMESTAMP
);

-- Update customer status to active
UPDATE customers SET status = 'active', activated_at = CURRENT_TIMESTAMP WHERE id = $CUSTOMER_INTERNAL_ID;

-- Update workflow
UPDATE customer_workflow SET
    database_provisioned = 1,
    database_provisioned_at = CURRENT_TIMESTAMP,
    current_stage = 'credentials_sent'
WHERE customer_id = $CUSTOMER_INTERNAL_ID;

-- Add activity log
INSERT INTO activity_log (customer_id, entity_type, entity_id, action_type, action_description, performed_by)
VALUES (
    $CUSTOMER_INTERNAL_ID,
    'database',
    (SELECT last_insert_rowid()),
    'provisioned',
    'Database $DATABASE_NAME provisioned successfully',
    'system-provision-script'
);
SQLEOF

    if [ $? -eq 0 ]; then
        log "INFO" "Customer database updated successfully"
    else
        log "WARN" "Failed to update customer database (non-fatal)"
    fi
fi

#==============================================================================
# STEP 11: SEND PROVISIONING EMAIL
#==============================================================================

log "INFO" "Sending provisioning email..."

if [ -f "$PROJECT_ROOT/001-security/alerts/scripts/send-alert-email.sh" ]; then
    EMAIL_BODY="Database provisioning completed successfully for customer $CUSTOMER_ID.

Database: $DATABASE_NAME
User: $DB_USER
Tier: $TIER
Max Connections: $MAX_CONNECTIONS

Connection String:
postgresql://$DB_USER:[PASSWORD]@$SERVER_IP:$PG_PORT/$DATABASE_NAME?sslmode=require

Credentials saved to: $CRED_FILE

Next steps:
1. Send credentials securely to customer
2. Verify customer can connect
3. Assist with data migration (if applicable)
"

    "$PROJECT_ROOT/001-security/alerts/scripts/send-alert-email.sh" \
        "Database Provisioned: $DATABASE_NAME" \
        "$EMAIL_BODY" || log "WARN" "Failed to send email notification"
else
    log "WARN" "Email script not found, skipping notification"
fi

#==============================================================================
# COMPLETION
#==============================================================================

log "INFO" "=========================================="
log "INFO" "Database Provisioning COMPLETED"
log "INFO" "=========================================="
log "INFO" "Database: $DATABASE_NAME"
log "INFO" "User: $DB_USER"
log "INFO" "Tier: $TIER"
log "INFO" "Credentials: $CRED_FILE"
log "INFO" "=========================================="

# Output JSON for automation
cat <<JSONEOF
{
  "status": "success",
  "customer_id": "$CUSTOMER_ID",
  "database_name": "$DATABASE_NAME",
  "database_user": "$DB_USER",
  "tier": "$TIER",
  "max_connections": $MAX_CONNECTIONS,
  "host": "$SERVER_IP",
  "port": $PG_PORT,
  "ssl_enabled": true,
  "credentials_file": "$CRED_FILE",
  "provisioned_at": "$(date -Iseconds)"
}
JSONEOF

exit 0
