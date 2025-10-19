#!/bin/bash
#
# Emergency Database Isolation Script
# ====================================
#
# Immediately isolates a customer database in case of security incident
# - Terminates all active connections
# - Changes database password
# - Revokes connection permissions
# - Creates incident report
#
# Usage: sudo ./isolate-customer-db.sh <database_name> <reason>
#

set -euo pipefail

# Configuration
PG_VERSION="16"
PG_BIN="/usr/lib/postgresql/${PG_VERSION}/bin"
INCIDENT_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/security-events/incidents.log"
AUDIT_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/audit/database-isolation.log"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
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

alert() {
    echo -e "${RED}[ALERT]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
   exit 1
fi

# Check arguments
if [[ $# -lt 2 ]]; then
    error "Usage: $0 <database_name> <reason>"
    error "Example: $0 customer_db_123 'Suspected unauthorized access'"
    exit 1
fi

DB_NAME="$1"
REASON="$2"
DB_USER="${DB_NAME}_user"
INCIDENT_ID="INC-$(date +%Y%m%d-%H%M%S)"

alert "EMERGENCY DATABASE ISOLATION"
alert "Database: $DB_NAME"
alert "Reason: $REASON"
alert "Incident ID: $INCIDENT_ID"
echo ""
warn "This action will immediately disconnect all users from the database."
read -p "Continue? (type 'YES' to confirm): " CONFIRM

if [[ "$CONFIRM" != "YES" ]]; then
    log "Operation cancelled by user"
    exit 0
fi

# Create log directories
mkdir -p "$(dirname "$INCIDENT_LOG")"
mkdir -p "$(dirname "$AUDIT_LOG")"

# Start incident log
cat >> "$INCIDENT_LOG" << EOF
================================================================================
INCIDENT: $INCIDENT_ID
Time: $(date +'%Y-%m-%d %H:%M:%S')
Database: $DB_NAME
User: $DB_USER
Reason: $REASON
Executed by: $(whoami)
================================================================================
EOF

log "Step 1: Checking if database exists..."
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    error "Database '$DB_NAME' does not exist"
    exit 1
fi
log "Database confirmed: $DB_NAME"

# Get connection count before isolation
CONN_COUNT=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='$DB_NAME' AND pid != pg_backend_pid();" 2>/dev/null | xargs)
log "Active connections before isolation: $CONN_COUNT"

log "Step 2: Terminating all active connections..."
sudo -u postgres psql -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DB_NAME'
  AND pid != pg_backend_pid();
" >> "$INCIDENT_LOG" 2>&1

log "Step 3: Revoking connection permissions..."
sudo -u postgres psql -c "
REVOKE CONNECT ON DATABASE $DB_NAME FROM PUBLIC;
REVOKE CONNECT ON DATABASE $DB_NAME FROM $DB_USER;
" >> "$INCIDENT_LOG" 2>&1

log "Step 4: Changing database user password..."
NEW_PASSWORD=$(openssl rand -base64 32)
sudo -u postgres psql -c "
ALTER USER $DB_USER WITH PASSWORD '$NEW_PASSWORD';
" >> "$INCIDENT_LOG" 2>&1

# Store new password securely
PASSWORD_FILE="/home/admincostplus/projects/costplusdb/001-security/keys/api-tokens/${DB_NAME}-emergency-password.txt"
mkdir -p "$(dirname "$PASSWORD_FILE")"
echo "$NEW_PASSWORD" > "$PASSWORD_FILE"
chmod 600 "$PASSWORD_FILE"
chown admincostplus:costplusdb "$PASSWORD_FILE"

log "Step 5: Disabling database user login..."
sudo -u postgres psql -c "
ALTER USER $DB_USER WITH NOLOGIN;
" >> "$INCIDENT_LOG" 2>&1

log "Step 6: Creating database snapshot for investigation..."
SNAPSHOT_DIR="/home/admincostplus/projects/costplusdb/001-security/scans/penetration-tests"
mkdir -p "$SNAPSHOT_DIR"

# Get database stats
sudo -u postgres psql -d "$DB_NAME" -c "
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
" > "$SNAPSHOT_DIR/${INCIDENT_ID}-${DB_NAME}-stats.txt" 2>&1

# Get recent activity (if available)
sudo -u postgres psql -c "
SELECT
    usename,
    application_name,
    client_addr,
    backend_start,
    state,
    query
FROM pg_stat_activity
WHERE datname = '$DB_NAME'
ORDER BY backend_start DESC
LIMIT 50;
" > "$SNAPSHOT_DIR/${INCIDENT_ID}-${DB_NAME}-recent-activity.txt" 2>&1

log "Step 7: Creating incident report..."
INCIDENT_REPORT="/home/admincostplus/projects/costplusdb/001-security/compliance/reports/${INCIDENT_ID}-report.md"
mkdir -p "$(dirname "$INCIDENT_REPORT")"

cat > "$INCIDENT_REPORT" << EOF
# Security Incident Report

**Incident ID:** $INCIDENT_ID
**Date/Time:** $(date +'%Y-%m-%d %H:%M:%S')
**Severity:** HIGH
**Status:** Database Isolated

## Incident Details

- **Database:** $DB_NAME
- **Database User:** $DB_USER
- **Reason:** $REASON
- **Executed By:** $(whoami)
- **Active Connections (before isolation):** $CONN_COUNT

## Actions Taken

1. Terminated all active database connections
2. Revoked CONNECT privileges from database and user
3. Changed database user password (stored securely)
4. Disabled user login capability
5. Created database snapshot for investigation
6. Generated incident report

## Investigation Artifacts

- Database statistics: $SNAPSHOT_DIR/${INCIDENT_ID}-${DB_NAME}-stats.txt
- Recent activity log: $SNAPSHOT_DIR/${INCIDENT_ID}-${DB_NAME}-recent-activity.txt
- New password location: $PASSWORD_FILE (restricted access)

## Next Steps

1. **Immediate:**
   - Review database logs for suspicious activity
   - Analyze recent queries and connections
   - Notify customer (if appropriate)

2. **Investigation:**
   - Examine database contents for unauthorized changes
   - Review access logs and authentication attempts
   - Check for data exfiltration

3. **Remediation:**
   - Determine root cause
   - Apply security patches if needed
   - Restore database access once verified safe

4. **Follow-up:**
   - Update security procedures
   - Document lessons learned
   - Update customer notification if needed

## Contact

- **Security Team:** security@costplusdb.com
- **On-Call:** +1-XXX-XXX-XXXX

---
*This is an automated incident report. Update manually as investigation proceeds.*
EOF

# Log to audit trail
cat >> "$AUDIT_LOG" << EOF
$(date +'%Y-%m-%d %H:%M:%S') - Database Isolated: $DB_NAME
Incident ID: $INCIDENT_ID
Reason: $REASON
Actions: Connections terminated, permissions revoked, password changed, login disabled
Report: $INCIDENT_REPORT
---
EOF

# Display summary
echo ""
alert "DATABASE ISOLATION COMPLETE"
echo ""
log "Incident ID: $INCIDENT_ID"
log "Database: $DB_NAME (ISOLATED)"
log "Status: All connections terminated, access revoked"
log "New password stored: $PASSWORD_FILE"
log "Incident report: $INCIDENT_REPORT"
echo ""
warn "CRITICAL NEXT STEPS:"
warn "1. Review incident report: $INCIDENT_REPORT"
warn "2. Analyze database snapshot in: $SNAPSHOT_DIR"
warn "3. Investigate PostgreSQL logs: /var/log/postgresql/"
warn "4. Contact customer if appropriate"
warn "5. Document findings in incident report"
echo ""

exit 0
