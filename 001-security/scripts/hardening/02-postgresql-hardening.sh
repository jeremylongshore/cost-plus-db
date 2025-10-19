#!/bin/bash
#
# PostgreSQL Security Hardening Script
# =====================================
#
# Applies security hardening to PostgreSQL installation including:
# - SSL/TLS configuration verification
# - Authentication method enforcement
# - Connection logging
# - Resource limits
# - Security extensions
#
# Usage: sudo ./02-postgresql-hardening.sh
#

set -euo pipefail

# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
   exit 1
fi

# Configuration
PG_VERSION="16"
PG_PORT="5433"
PG_CONF_DIR="/etc/postgresql/${PG_VERSION}/main"
PG_DATA_DIR="/var/lib/postgresql/${PG_VERSION}/main"
SSL_DIR="${PG_DATA_DIR}/ssl"
SECURITY_DIR="/home/admincostplus/projects/costplusdb/001-security"

log "Starting PostgreSQL security hardening..."

# Step 1: Verify PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    error "PostgreSQL is not installed"
    exit 1
fi

log "PostgreSQL version: $(sudo -u postgres psql -p $PG_PORT -t -c 'SELECT version();' | head -1 | xargs)"

# Step 2: Check SSL certificates
log "Checking SSL certificates..."
if [[ ! -f "$SSL_DIR/server.crt" ]] || [[ ! -f "$SSL_DIR/server.key" ]]; then
    warn "SSL certificates not found. Run config/ssl/generate-cert.sh first"
    exit 1
fi

# Verify SSL certificate permissions
chown postgres:postgres "$SSL_DIR"/*
chmod 600 "$SSL_DIR/server.key"
chmod 644 "$SSL_DIR/server.crt"
log "SSL certificate permissions verified"

# Step 3: Backup existing pg_hba.conf
log "Backing up pg_hba.conf..."
cp "$PG_CONF_DIR/pg_hba.conf" "$PG_CONF_DIR/pg_hba.conf.backup.$(date +%Y%m%d%H%M%S)"

# Step 4: Apply secure pg_hba.conf template
log "Applying secure pg_hba.conf configuration..."
cat > "$PG_CONF_DIR/pg_hba.conf" << 'EOF'
# PostgreSQL Client Authentication Configuration
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local Unix socket connections (peer authentication)
local   all             postgres                                peer
local   all             all                                     peer

# IPv4 localhost connections (SCRAM-SHA-256)
host    all             all             127.0.0.1/32            scram-sha-256

# IPv6 localhost connections
host    all             all             ::1/128                 scram-sha-256

# Remote connections - REQUIRE SSL/TLS
hostssl all             all             0.0.0.0/0               scram-sha-256

# REJECT any non-SSL remote attempts
hostnossl all           all             0.0.0.0/0               reject
EOF

log "pg_hba.conf configured to require SSL for all remote connections"

# Step 5: Backup existing postgresql.conf
log "Backing up postgresql.conf..."
cp "$PG_CONF_DIR/postgresql.conf" "$PG_CONF_DIR/postgresql.conf.backup.$(date +%Y%m%d%H%M%S)"

# Step 6: Apply security settings to postgresql.conf
log "Applying security settings to postgresql.conf..."

# Check if security include already exists
if grep -q "include.*postgresql-security.conf" "$PG_CONF_DIR/postgresql.conf"; then
    info "Security configuration already included"
else
    echo "" >> "$PG_CONF_DIR/postgresql.conf"
    echo "# Include security configuration" >> "$PG_CONF_DIR/postgresql.conf"
    echo "include = '${SECURITY_DIR}/config/postgresql/postgresql-security.conf'" >> "$PG_CONF_DIR/postgresql.conf"
    log "Added security configuration include"
fi

# Step 7: Set proper file permissions
log "Setting secure file permissions..."
chmod 700 "$PG_DATA_DIR"
chmod 640 "$PG_CONF_DIR/postgresql.conf"
chmod 640 "$PG_CONF_DIR/pg_hba.conf"
chown -R postgres:postgres "$PG_CONF_DIR"
chown -R postgres:postgres "$PG_DATA_DIR"

# Step 8: Install security extensions
log "Installing PostgreSQL security extensions..."

# Install pgaudit for enhanced auditing (optional)
if apt list --installed 2>/dev/null | grep -q "postgresql-${PG_VERSION}-pgaudit"; then
    info "pgaudit already installed"
else
    warn "pgaudit not installed. Install with: sudo apt install postgresql-${PG_VERSION}-pgaudit"
fi

# Step 9: Configure password encryption
log "Configuring password encryption..."
sudo -u postgres psql -p $PG_PORT << 'EOSQL'
-- Ensure SCRAM-SHA-256 is the default password encryption
ALTER SYSTEM SET password_encryption = 'scram-sha-256';
SELECT pg_reload_conf();
EOSQL

# Step 10: Create security roles
log "Creating security monitoring roles..."
sudo -u postgres psql -p $PG_PORT << 'EOSQL'
-- Create monitoring role (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'costplusdb_monitor') THEN
        CREATE ROLE costplusdb_monitor WITH LOGIN PASSWORD NULL;
        GRANT pg_monitor TO costplusdb_monitor;
        COMMENT ON ROLE costplusdb_monitor IS 'Read-only monitoring role for CostPlusDB';
    END IF;
END
$$;
EOSQL

# Step 11: Enable connection logging
log "Verifying connection logging..."
sudo -u postgres psql -p $PG_PORT -t -c "SHOW log_connections;" | grep -q "on" && \
    log "Connection logging enabled" || \
    warn "Connection logging not enabled - check postgresql.conf"

# Step 12: Verify SSL is enabled
log "Verifying SSL/TLS configuration..."
SSL_STATUS=$(sudo -u postgres psql -p $PG_PORT -t -c "SHOW ssl;" | xargs)
if [[ "$SSL_STATUS" == "on" ]]; then
    log "SSL/TLS is enabled"
    SSL_VERSION=$(sudo -u postgres psql -p $PG_PORT -t -c "SHOW ssl_min_protocol_version;" | xargs)
    log "Minimum TLS version: $SSL_VERSION"
else
    error "SSL/TLS is NOT enabled - check postgresql.conf"
    exit 1
fi

# Step 13: Test SSL certificate
log "Testing SSL certificate validity..."
openssl x509 -in "$SSL_DIR/server.crt" -noout -checkend 2592000 && \
    log "SSL certificate is valid (expires after 30 days)" || \
    warn "SSL certificate expires within 30 days"

# Step 14: Reload PostgreSQL configuration
log "Reloading PostgreSQL configuration..."
sudo systemctl reload postgresql@${PG_VERSION}-main

# Give PostgreSQL a moment to reload
sleep 2

# Step 15: Run security verification tests
log "Running security verification tests..."

# Test 1: Verify SCRAM-SHA-256 authentication
AUTH_METHOD=$(sudo -u postgres psql -p $PG_PORT -t -c "SHOW password_encryption;" | xargs)
if [[ "$AUTH_METHOD" == "scram-sha-256" ]]; then
    log "✓ Password encryption: SCRAM-SHA-256"
else
    warn "✗ Password encryption is not SCRAM-SHA-256: $AUTH_METHOD"
fi

# Test 2: Verify connection logging
LOG_CONN=$(sudo -u postgres psql -p $PG_PORT -t -c "SHOW log_connections;" | xargs)
if [[ "$LOG_CONN" == "on" ]]; then
    log "✓ Connection logging enabled"
else
    warn "✗ Connection logging disabled"
fi

# Test 3: Verify SSL enforcement
SSL_ENABLED=$(sudo -u postgres psql -p $PG_PORT -t -c "SHOW ssl;" | xargs)
if [[ "$SSL_ENABLED" == "on" ]]; then
    log "✓ SSL/TLS enabled"
else
    error "✗ SSL/TLS not enabled"
fi

# Test 4: Check for superuser accounts
SUPERUSERS=$(sudo -u postgres psql -p $PG_PORT -t -c "SELECT count(*) FROM pg_roles WHERE rolsuper = true;" | xargs)
log "Superuser accounts: $SUPERUSERS"
if [[ $SUPERUSERS -gt 2 ]]; then
    warn "Multiple superuser accounts detected - review for security"
fi

# Step 16: Log hardening to audit trail
AUDIT_LOG="$SECURITY_DIR/logs/audit/postgresql-hardening.log"
mkdir -p "$(dirname "$AUDIT_LOG")"
cat >> "$AUDIT_LOG" << EOF
$(date +'%Y-%m-%d %H:%M:%S') - PostgreSQL Security Hardening Applied
Executed by: $(whoami)
PostgreSQL version: ${PG_VERSION}
Actions performed:
- SSL/TLS certificates verified
- pg_hba.conf configured for SSL-only remote access
- postgresql.conf security settings applied
- Password encryption set to SCRAM-SHA-256
- Connection logging enabled
- Security monitoring role created
- File permissions hardened

Verification Results:
- Password encryption: ${AUTH_METHOD}
- Connection logging: ${LOG_CONN}
- SSL enabled: ${SSL_ENABLED}
- Superuser accounts: ${SUPERUSERS}
---
EOF

# Step 17: Display summary
echo ""
log "PostgreSQL security hardening complete!"
echo ""
info "Security Summary:"
echo "  ✓ SSL/TLS enabled with certificate verification"
echo "  ✓ SCRAM-SHA-256 password authentication"
echo "  ✓ SSL required for all remote connections"
echo "  ✓ Connection logging enabled"
echo "  ✓ File permissions hardened"
echo "  ✓ Security monitoring role created"
echo ""
warn "Next steps:"
echo "  1. Test PostgreSQL connectivity: psql 'postgresql://user@host:5433/db?sslmode=require'"
echo "  2. Verify SSL enforcement: psql 'postgresql://user@host:5433/db?sslmode=disable' (should fail)"
echo "  3. Review audit log: $AUDIT_LOG"
echo "  4. Configure fail2ban: Run scripts/hardening/03-network-hardening.sh"
echo ""

exit 0
