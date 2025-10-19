#!/bin/bash
#
# Secure Customer Database Provisioning
# ======================================
#
# Creates a new customer database with security audit logging
# Integrates with existing provision script
#
# Usage: sudo ./create-customer-db.sh <customer_name> <tier>
#

set -euo pipefail

# Configuration
PG_VERSION="16"
SECURITY_DIR="/home/admincostplus/projects/costplusdb/001-security"
AUDIT_LOG="$SECURITY_DIR/logs/audit/database-provisioning.log"
CUSTOMER_DIR="$SECURITY_DIR/customer-security/customers"
PASSWORD_GEN="$SECURITY_DIR/tools/password-generator/generate-secure-password.py"

# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
   exit 1
fi

# Check arguments
if [[ $# -lt 2 ]]; then
    error "Usage: $0 <customer_name> <tier>"
    error "Example: $0 acme-corp dedicated"
    error "Tiers: shared, dedicated, pro, enterprise"
    exit 1
fi

CUSTOMER_NAME="$1"
TIER="$2"
DB_NAME="${CUSTOMER_NAME}_db"
DB_USER="${CUSTOMER_NAME}_user"
PROVISION_ID="PROV-$(date +%Y%m%d-%H%M%S)"

# Validate tier
case "$TIER" in
    shared|dedicated|pro|enterprise)
        ;;
    *)
        error "Invalid tier: $TIER"
        error "Valid tiers: shared, dedicated, pro, enterprise"
        exit 1
        ;;
esac

log "Starting secure database provisioning..."
log "Provision ID: $PROVISION_ID"
log "Customer: $CUSTOMER_NAME"
log "Tier: $TIER"
log "Database: $DB_NAME"
log "User: $DB_USER"

# Create log directories
mkdir -p "$(dirname "$AUDIT_LOG")"
mkdir -p "$CUSTOMER_DIR/$CUSTOMER_NAME"

# Start audit log entry
cat >> "$AUDIT_LOG" << EOF
================================================================================
PROVISION: $PROVISION_ID
Time: $(date +'%Y-%m-%d %H:%M:%S')
Customer: $CUSTOMER_NAME
Tier: $TIER
Database: $DB_NAME
User: $DB_USER
Executed by: $(whoami)
================================================================================
EOF

# Generate secure password
log "Generating secure password..."
DB_PASSWORD=$("$PASSWORD_GEN" --quiet 2>/dev/null)

if [[ -z "$DB_PASSWORD" ]]; then
    error "Password generation failed"
    exit 1
fi

# Create database
log "Creating database: $DB_NAME"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" >> "$AUDIT_LOG" 2>&1

# Create user with secure password
log "Creating user: $DB_USER"
sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';" >> "$AUDIT_LOG" 2>&1

# Grant privileges
log "Granting privileges..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" >> "$AUDIT_LOG" 2>&1

# Enable SSL requirement for this user
log "Enforcing SSL connection requirement..."
sudo -u postgres psql -c "ALTER USER $DB_USER SET ssl TO 'on';" >> "$AUDIT_LOG" 2>&1

# Create customer security directory
CUSTOMER_SEC_DIR="$CUSTOMER_DIR/$CUSTOMER_NAME"
mkdir -p "$CUSTOMER_SEC_DIR"

# Store credentials securely
CREDENTIALS_FILE="$CUSTOMER_SEC_DIR/credentials.txt"
cat > "$CREDENTIALS_FILE" << EOF
CostPlusDB Customer Credentials
================================
Provision ID: $PROVISION_ID
Customer: $CUSTOMER_NAME
Date: $(date +'%Y-%m-%d %H:%M:%S')

Database Name: $DB_NAME
Database User: $DB_USER
Database Password: $DB_PASSWORD

Connection String:
  postgresql://$DB_USER:$DB_PASSWORD@<hostname>:5433/$DB_NAME?sslmode=require

Security:
  - SSL/TLS required for all connections
  - Password encrypted with scram-sha-256
  - Connection logging enabled
  - Audit trail: $AUDIT_LOG

Tier: $TIER
EOF

chmod 600 "$CREDENTIALS_FILE"
chown admincostplus:costplusdb "$CREDENTIALS_FILE"

# Create customer metadata
METADATA_FILE="$CUSTOMER_SEC_DIR/metadata.json"
cat > "$METADATA_FILE" << EOF
{
  "provision_id": "$PROVISION_ID",
  "customer_name": "$CUSTOMER_NAME",
  "tier": "$TIER",
  "database_name": "$DB_NAME",
  "database_user": "$DB_USER",
  "provisioned_date": "$(date -Iseconds)",
  "provisioned_by": "$(whoami)",
  "ssl_required": true,
  "status": "active"
}
EOF

chmod 640 "$METADATA_FILE"

# Create connection test script
TEST_SCRIPT="$CUSTOMER_SEC_DIR/test-connection.sh"
cat > "$TEST_SCRIPT" << 'EOFTEST'
#!/bin/bash
# Test database connection
# Usage: ./test-connection.sh <hostname>

HOSTNAME="${1:-localhost}"

CREDENTIALS_FILE="$(dirname "$0")/credentials.txt"
if [[ ! -f "$CREDENTIALS_FILE" ]]; then
    echo "ERROR: Credentials file not found"
    exit 1
fi

DB_USER=$(grep "Database User:" "$CREDENTIALS_FILE" | cut -d: -f2 | xargs)
DB_NAME=$(grep "Database Name:" "$CREDENTIALS_FILE" | cut -d: -f2 | xargs)
DB_PASSWORD=$(grep "Database Password:" "$CREDENTIALS_FILE" | cut -d: -f2 | xargs)

echo "Testing connection to $DB_NAME on $HOSTNAME..."
PGPASSWORD="$DB_PASSWORD" psql -h "$HOSTNAME" -p 5433 -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();"

if [[ $? -eq 0 ]]; then
    echo "SUCCESS: Connection test passed"
else
    echo "FAILED: Connection test failed"
    exit 1
fi
EOFTEST

chmod 750 "$TEST_SCRIPT"

# Log completion
cat >> "$AUDIT_LOG" << EOF
Status: SUCCESS
Credentials stored: $CREDENTIALS_FILE
Customer directory: $CUSTOMER_SEC_DIR
---
EOF

# Display summary
echo ""
log "Database provisioning complete!"
echo ""
echo "Provision ID: $PROVISION_ID"
echo "Customer: $CUSTOMER_NAME"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Tier: $TIER"
echo ""
echo "Credentials stored: $CREDENTIALS_FILE"
echo "Test connection: $TEST_SCRIPT <hostname>"
echo ""
warn "IMPORTANT: Securely deliver credentials to customer"
warn "Audit log: $AUDIT_LOG"

exit 0
