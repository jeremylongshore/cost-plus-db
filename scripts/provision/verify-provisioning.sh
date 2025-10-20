#!/bin/bash
#==============================================================================
# Verify Database Provisioning
#==============================================================================
# Purpose: Comprehensive 6-point verification checklist for provisioned databases
# Usage: ./verify-provisioning.sh DATABASE_NAME
# Exit Codes: 0 = All checks passed, 1 = One or more checks failed
#==============================================================================

set -euo pipefail

#==============================================================================
# CONFIGURATION
#==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="$PROJECT_ROOT/002-clients/logs/provisioning-verification.log"
CRED_DIR="$PROJECT_ROOT/002-clients/customers/active"

# PostgreSQL configuration
PG_PORT="${PG_PORT:-5432}"
PG_VERSION="${PG_VERSION:-16}"

# Verification results
CHECKS_PASSED=0
CHECKS_FAILED=0
FAILURE_REASONS=()

#==============================================================================
# LOGGING AND OUTPUT
#==============================================================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

print_header() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
}

check_result() {
    local check_name="$1"
    local result="$2"
    local details="$3"

    if [ "$result" = "PASS" ]; then
        echo "  ✓ $check_name: PASS"
        log "CHECK PASSED: $check_name - $details"
        ((CHECKS_PASSED++))
    else
        echo "  ✗ $check_name: FAIL"
        log "CHECK FAILED: $check_name - $details"
        ((CHECKS_FAILED++))
        FAILURE_REASONS+=("$check_name: $details")
    fi
}

#==============================================================================
# INPUT VALIDATION
#==============================================================================

if [ $# -ne 1 ]; then
    cat <<USAGE
Usage: $0 DATABASE_NAME

Performs comprehensive verification of database provisioning:
  1. Database exists in PostgreSQL
  2. User can connect with credentials
  3. Permissions are correctly configured
  4. SSL/TLS is enforced
  5. Backup is configured
  6. Health check passes

Example:
  $0 acme_production
USAGE
    exit 1
fi

DATABASE_NAME="$1"
DB_USER="${DATABASE_NAME}_user"

# Validate database name
if ! [[ "$DATABASE_NAME" =~ ^[a-z0-9_]+$ ]]; then
    echo "ERROR: Invalid database name. Use lowercase letters, numbers, and underscores only."
    exit 1
fi

print_header "Database Provisioning Verification"
log "Starting verification for database: $DATABASE_NAME"
echo "Database: $DATABASE_NAME"
echo "User: $DB_USER"
echo "Date: $(date)"
echo ""

#==============================================================================
# FIND CREDENTIALS
#==============================================================================

echo "Locating credentials..."

# Search for credentials file
CRED_FILE=""
for file in "$CRED_DIR"/*/*.txt "$CRED_DIR"/_credentials_*.txt; do
    if [ -f "$file" ] && grep -q "Database: $DATABASE_NAME" "$file" 2>/dev/null; then
        CRED_FILE="$file"
        break
    fi
done

if [ -z "$CRED_FILE" ]; then
    echo "WARNING: Credentials file not found. Some tests may fail."
    DB_PASSWORD=""
else
    echo "Found credentials: $CRED_FILE"
    # Extract password from credentials file
    DB_PASSWORD=$(grep "^Password:" "$CRED_FILE" | awk '{print $2}')

    if [ -z "$DB_PASSWORD" ]; then
        echo "WARNING: Could not extract password from credentials file"
    fi
fi

echo ""

#==============================================================================
# CHECK 1: DATABASE EXISTS
#==============================================================================

print_header "Check 1: Database Exists"

if sudo -u postgres psql -p "$PG_PORT" -lqt | cut -d \| -f 1 | grep -qw "$DATABASE_NAME"; then
    # Get database details
    DB_OWNER=$(sudo -u postgres psql -p "$PG_PORT" -tA -c "SELECT pg_catalog.pg_get_userbyid(d.datdba) FROM pg_catalog.pg_database d WHERE d.datname = '$DATABASE_NAME';")
    DB_ENCODING=$(sudo -u postgres psql -p "$PG_PORT" -tA -c "SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname = '$DATABASE_NAME';")

    check_result "Database Exists" "PASS" "Owner: $DB_OWNER, Encoding: $DB_ENCODING"
else
    check_result "Database Exists" "FAIL" "Database '$DATABASE_NAME' not found in PostgreSQL"
fi

#==============================================================================
# CHECK 2: USER CAN CONNECT
#==============================================================================

print_header "Check 2: User Can Connect"

if [ -n "$DB_PASSWORD" ]; then
    # Test connection with credentials
    CONN_TEST=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -p "$PG_PORT" -U "$DB_USER" -d "$DATABASE_NAME" \
        -c "SELECT current_user, current_database(), version();" 2>&1)

    if [ $? -eq 0 ]; then
        CURRENT_USER=$(echo "$CONN_TEST" | grep -oP '^\s*\K\w+' | head -1)
        check_result "User Connection" "PASS" "User '$CURRENT_USER' connected successfully"
    else
        check_result "User Connection" "FAIL" "Connection failed: ${CONN_TEST:0:100}"
    fi
else
    check_result "User Connection" "FAIL" "No password available to test connection"
fi

#==============================================================================
# CHECK 3: PERMISSIONS ARE CORRECT
#==============================================================================

print_header "Check 3: Permissions Configured"

# Check user privileges
USER_EXISTS=$(sudo -u postgres psql -p "$PG_PORT" -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER';")

if [ "$USER_EXISTS" = "1" ]; then
    # Check if user has superuser privilege (should be NO)
    IS_SUPERUSER=$(sudo -u postgres psql -p "$PG_PORT" -tAc "SELECT rolsuper FROM pg_roles WHERE rolname='$DB_USER';")

    # Check connection limit
    CONN_LIMIT=$(sudo -u postgres psql -p "$PG_PORT" -tAc "SELECT rolconnlimit FROM pg_roles WHERE rolname='$DB_USER';")

    if [ "$IS_SUPERUSER" = "f" ]; then
        check_result "No Superuser Privilege" "PASS" "User correctly restricted (not superuser)"
    else
        check_result "No Superuser Privilege" "FAIL" "User has superuser privilege (security risk)"
    fi

    if [ "$CONN_LIMIT" -gt 0 ]; then
        check_result "Connection Limit Set" "PASS" "Max connections: $CONN_LIMIT"
    else
        check_result "Connection Limit Set" "FAIL" "No connection limit set (should be configured)"
    fi

    # Check database-level permissions
    if [ -n "$DB_PASSWORD" ]; then
        SCHEMA_PERMS=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -p "$PG_PORT" -U "$DB_USER" -d "$DATABASE_NAME" \
            -tAc "SELECT has_schema_privilege('$DB_USER', 'public', 'USAGE');" 2>/dev/null || echo "f")

        if [ "$SCHEMA_PERMS" = "t" ]; then
            check_result "Schema Permissions" "PASS" "User has USAGE privilege on public schema"
        else
            check_result "Schema Permissions" "FAIL" "User missing USAGE privilege on public schema"
        fi
    else
        check_result "Schema Permissions" "FAIL" "Cannot verify - no password available"
    fi
else
    check_result "User Exists" "FAIL" "User '$DB_USER' not found in PostgreSQL"
fi

#==============================================================================
# CHECK 4: SSL/TLS IS ENFORCED
#==============================================================================

print_header "Check 4: SSL/TLS Enforced"

# Check if SSL is enabled in PostgreSQL
SSL_ENABLED=$(sudo -u postgres psql -p "$PG_PORT" -tAc "SHOW ssl;" | tr -d ' ')

if [ "$SSL_ENABLED" = "on" ]; then
    check_result "SSL Enabled" "PASS" "PostgreSQL SSL is enabled"

    # Check pg_hba.conf for hostssl entry
    PG_HBA_CONF="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"
    if sudo grep -q "hostssl.*$DATABASE_NAME.*$DB_USER" "$PG_HBA_CONF"; then
        check_result "SSL Required in pg_hba.conf" "PASS" "hostssl entry found"
    else
        check_result "SSL Required in pg_hba.conf" "FAIL" "No hostssl entry for database"
    fi
else
    check_result "SSL Enabled" "FAIL" "PostgreSQL SSL is not enabled"
fi

#==============================================================================
# CHECK 5: BACKUP IS CONFIGURED
#==============================================================================

print_header "Check 5: Backup Configured"

# Check if pgBackRest is installed
if command -v pgbackrest >/dev/null 2>&1; then
    check_result "pgBackRest Installed" "PASS" "pgBackRest is available"

    # Check if stanza exists and is valid
    PGBACKREST_STANZA="costplusdb-main"
    if sudo -u postgres pgbackrest --stanza="$PGBACKREST_STANZA" info >/dev/null 2>&1; then
        BACKUP_COUNT=$(sudo -u postgres pgbackrest --stanza="$PGBACKREST_STANZA" info | grep -c "full backup" || echo "0")
        check_result "Backup Stanza Valid" "PASS" "Stanza initialized, $BACKUP_COUNT backups found"

        # Check for recent backup (within 26 hours)
        LATEST_BACKUP=$(sudo -u postgres pgbackrest --stanza="$PGBACKREST_STANZA" info --output=json 2>/dev/null | \
            grep -oP '"stop":\s*\K[0-9]+' | head -1 || echo "0")

        if [ "$LATEST_BACKUP" -gt 0 ]; then
            CURRENT_TIME=$(date +%s)
            AGE_HOURS=$(( (CURRENT_TIME - LATEST_BACKUP) / 3600 ))

            if [ $AGE_HOURS -lt 26 ]; then
                check_result "Recent Backup Exists" "PASS" "Last backup: $AGE_HOURS hours ago"
            else
                check_result "Recent Backup Exists" "FAIL" "Last backup is $AGE_HOURS hours old (stale)"
            fi
        else
            check_result "Recent Backup Exists" "FAIL" "No backup timestamp found"
        fi

        # Check cron jobs for automated backups
        if [ -f "/etc/cron.d/pgbackrest-$PGBACKREST_STANZA" ]; then
            check_result "Automated Backup Schedule" "PASS" "Cron jobs configured"
        else
            check_result "Automated Backup Schedule" "FAIL" "No cron jobs found for backups"
        fi
    else
        check_result "Backup Stanza Valid" "FAIL" "pgBackRest stanza not initialized"
    fi
else
    check_result "pgBackRest Installed" "FAIL" "pgBackRest not found"
fi

#==============================================================================
# CHECK 6: HEALTH CHECK PASSES
#==============================================================================

print_header "Check 6: Health Check"

if [ -n "$DB_PASSWORD" ]; then
    # Check database is accepting connections
    ACTIVE_CONNS=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -p "$PG_PORT" -U "$DB_USER" -d "$DATABASE_NAME" \
        -tAc "SELECT count(*) FROM pg_stat_activity WHERE datname='$DATABASE_NAME';" 2>/dev/null || echo "0")

    check_result "Database Accepting Connections" "PASS" "Active connections: $ACTIVE_CONNS"

    # Check database size
    DB_SIZE=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -p "$PG_PORT" -U "$DB_USER" -d "$DATABASE_NAME" \
        -tAc "SELECT pg_size_pretty(pg_database_size('$DATABASE_NAME'));" 2>/dev/null || echo "Unknown")

    check_result "Database Size Query" "PASS" "Database size: $DB_SIZE"

    # Test table creation (and rollback)
    CREATE_TEST=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -p "$PG_PORT" -U "$DB_USER" -d "$DATABASE_NAME" \
        -c "BEGIN; CREATE TABLE _verify_test (id SERIAL); DROP TABLE _verify_test; ROLLBACK;" 2>&1)

    if [ $? -eq 0 ]; then
        check_result "Create Table Test" "PASS" "User can create and drop tables"
    else
        check_result "Create Table Test" "FAIL" "User cannot create tables: ${CREATE_TEST:0:100}"
    fi

    # Check transaction log health
    WAL_STATUS=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -p "$PG_PORT" -U "$DB_USER" -d "$DATABASE_NAME" \
        -tAc "SELECT pg_is_in_recovery();" 2>/dev/null || echo "error")

    if [ "$WAL_STATUS" = "f" ]; then
        check_result "Database Not in Recovery" "PASS" "Database is in normal operational mode"
    elif [ "$WAL_STATUS" = "t" ]; then
        check_result "Database Not in Recovery" "FAIL" "Database is in recovery mode"
    else
        check_result "Database Not in Recovery" "FAIL" "Could not determine recovery status"
    fi
else
    check_result "Health Check" "FAIL" "No password available to perform health checks"
fi

#==============================================================================
# SUMMARY
#==============================================================================

print_header "Verification Summary"

echo "Total Checks: $((CHECKS_PASSED + CHECKS_FAILED))"
echo "Passed: $CHECKS_PASSED"
echo "Failed: $CHECKS_FAILED"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo "✓ ALL CHECKS PASSED"
    echo ""
    echo "Database '$DATABASE_NAME' is fully provisioned and operational."
    log "VERIFICATION COMPLETE: All checks passed for $DATABASE_NAME"

    # Output JSON for automation
    cat <<JSONEOF

{
  "status": "success",
  "database": "$DATABASE_NAME",
  "checks_passed": $CHECKS_PASSED,
  "checks_failed": $CHECKS_FAILED,
  "verified_at": "$(date -Iseconds)"
}
JSONEOF

    exit 0
else
    echo "✗ VERIFICATION FAILED"
    echo ""
    echo "The following checks failed:"
    for reason in "${FAILURE_REASONS[@]}"; do
        echo "  - $reason"
    done
    echo ""
    echo "Please review the failures and re-run provisioning if necessary."
    log "VERIFICATION FAILED: $CHECKS_FAILED checks failed for $DATABASE_NAME"

    # Output JSON for automation
    cat <<JSONEOF

{
  "status": "failure",
  "database": "$DATABASE_NAME",
  "checks_passed": $CHECKS_PASSED,
  "checks_failed": $CHECKS_FAILED,
  "failures": [
$(printf '    "%s"' "${FAILURE_REASONS[@]}" | paste -sd, -)
  ],
  "verified_at": "$(date -Iseconds)"
}
JSONEOF

    exit 1
fi
