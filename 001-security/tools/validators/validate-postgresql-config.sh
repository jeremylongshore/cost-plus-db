#!/bin/bash
#
# PostgreSQL Configuration Validator
# ===================================
#
# Validates PostgreSQL configuration against CostPlusDB security standards
#
# Usage: sudo ./validate-postgresql-config.sh
#

set -euo pipefail

# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PG_VERSION="16"
PG_PORT="5433"
PG_CONF="/etc/postgresql/${PG_VERSION}/main/postgresql.conf"
PG_HBA="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"
SSL_CERT="/var/lib/postgresql/${PG_VERSION}/main/ssl/server.crt"
SSL_KEY="/var/lib/postgresql/${PG_VERSION}/main/ssl/server.key"

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

check() {
    local name="$1"
    local status="$2"
    local message="$3"

    case "$status" in
        PASS)
            echo -e "${GREEN}✓ PASS${NC} $name: $message"
            ((PASS_COUNT++))
            ;;
        WARN)
            echo -e "${YELLOW}⚠ WARN${NC} $name: $message"
            ((WARN_COUNT++))
            ;;
        FAIL)
            echo -e "${RED}✗ FAIL${NC} $name: $message"
            ((FAIL_COUNT++))
            ;;
    esac
}

echo "=== PostgreSQL Security Configuration Validator ==="
echo "Run time: $(date)"
echo "PostgreSQL version: $PG_VERSION"
echo ""

# Check 1: PostgreSQL is running
echo "=== Service Status ==="
if systemctl is-active --quiet postgresql@${PG_VERSION}-main; then
    check "PostgreSQL Service" "PASS" "Service is running"
else
    check "PostgreSQL Service" "FAIL" "Service is NOT running"
fi
echo ""

# Check 2: SSL Configuration
echo "=== SSL/TLS Configuration ==="

if [[ -f "$SSL_CERT" ]] && [[ -f "$SSL_KEY" ]]; then
    check "SSL Certificates" "PASS" "Certificates exist"

    # Check certificate expiry
    DAYS_UNTIL_EXPIRY=$(( ($(date -d "$(openssl x509 -in "$SSL_CERT" -noout -enddate | cut -d= -f2)" +%s) - $(date +%s)) / 86400 ))
    if [[ $DAYS_UNTIL_EXPIRY -lt 0 ]]; then
        check "SSL Certificate Expiry" "FAIL" "Certificate EXPIRED"
    elif [[ $DAYS_UNTIL_EXPIRY -lt 30 ]]; then
        check "SSL Certificate Expiry" "WARN" "Expires in $DAYS_UNTIL_EXPIRY days"
    else
        check "SSL Certificate Expiry" "PASS" "Valid for $DAYS_UNTIL_EXPIRY days"
    fi

    # Check certificate permissions
    CERT_PERMS=$(stat -c %a "$SSL_CERT")
    KEY_PERMS=$(stat -c %a "$SSL_KEY")
    if [[ "$KEY_PERMS" == "600" ]]; then
        check "SSL Key Permissions" "PASS" "Correct (600)"
    else
        check "SSL Key Permissions" "FAIL" "Incorrect ($KEY_PERMS, should be 600)"
    fi
else
    check "SSL Certificates" "FAIL" "Certificates NOT found"
fi

# Check SSL enabled in postgresql.conf
SSL_ENABLED=$(sudo -u postgres psql -p $PG_PORT -t -c "SHOW ssl;" 2>/dev/null | xargs || echo "off")
if [[ "$SSL_ENABLED" == "on" ]]; then
    check "SSL Enabled" "PASS" "SSL is ON"
else
    check "SSL Enabled" "FAIL" "SSL is OFF"
fi

# Check minimum TLS version
TLS_VERSION=$(sudo -u postgres psql -p $PG_PORT -t -c "SHOW ssl_min_protocol_version;" 2>/dev/null | xargs || echo "unknown")
if [[ "$TLS_VERSION" == "TLSv1.2" ]] || [[ "$TLS_VERSION" == "TLSv1.3" ]]; then
    check "TLS Version" "PASS" "Minimum TLS version: $TLS_VERSION"
elif [[ "$TLS_VERSION" == "TLSv1.1" ]]; then
    check "TLS Version" "WARN" "TLS 1.1 is deprecated, use TLS 1.2+"
else
    check "TLS Version" "FAIL" "Insecure or unknown TLS version: $TLS_VERSION"
fi
echo ""

# Check 3: Authentication
echo "=== Authentication Configuration ==="

# Check password encryption
PASS_ENCRYPT=$(sudo -u postgres psql -p $PG_PORT -t -c "SHOW password_encryption;" 2>/dev/null | xargs || echo "unknown")
if [[ "$PASS_ENCRYPT" == "scram-sha-256" ]]; then
    check "Password Encryption" "PASS" "Using SCRAM-SHA-256"
elif [[ "$PASS_ENCRYPT" == "md5" ]]; then
    check "Password Encryption" "WARN" "MD5 is deprecated, use SCRAM-SHA-256"
else
    check "Password Encryption" "FAIL" "Unknown or insecure method: $PASS_ENCRYPT"
fi

# Check pg_hba.conf for SSL enforcement
if grep -q "^hostssl.*all.*all.*0.0.0.0/0.*scram-sha-256" "$PG_HBA"; then
    check "SSL Enforcement (remote)" "PASS" "SSL required for remote connections"
else
    check "SSL Enforcement (remote)" "WARN" "SSL may not be enforced for all remote connections"
fi

if grep -q "^hostnossl.*all.*all.*0.0.0.0/0.*reject" "$PG_HBA"; then
    check "Non-SSL Rejection" "PASS" "Non-SSL connections are rejected"
else
    check "Non-SSL Rejection" "WARN" "Non-SSL connections may be allowed"
fi
echo ""

# Check 4: Logging Configuration
echo "=== Logging Configuration ==="

LOG_CONN=$(sudo -u postgres psql -p $PG_PORT -t -c "SHOW log_connections;" 2>/dev/null | xargs || echo "off")
if [[ "$LOG_CONN" == "on" ]]; then
    check "Connection Logging" "PASS" "Enabled"
else
    check "Connection Logging" "FAIL" "Disabled (should be enabled)"
fi

LOG_DISCONN=$(sudo -u postgres psql -p $PG_PORT -t -c "SHOW log_disconnections;" 2>/dev/null | xargs || echo "off")
if [[ "$LOG_DISCONN" == "on" ]]; then
    check "Disconnection Logging" "PASS" "Enabled"
else
    check "Disconnection Logging" "WARN" "Disabled (recommended to enable)"
fi

LOG_STMT=$(sudo -u postgres psql -p $PG_PORT -t -c "SHOW log_statement;" 2>/dev/null | xargs || echo "none")
if [[ "$LOG_STMT" == "ddl" ]] || [[ "$LOG_STMT" == "all" ]]; then
    check "Statement Logging" "PASS" "DDL statements logged"
elif [[ "$LOG_STMT" == "none" ]]; then
    check "Statement Logging" "WARN" "No statements logged (recommend 'ddl')"
fi
echo ""

# Check 5: Resource Limits
echo "=== Resource Limits ==="

MAX_CONN=$(sudo -u postgres psql -p $PG_PORT -t -c "SHOW max_connections;" 2>/dev/null | xargs || echo "0")
if [[ $MAX_CONN -le 100 ]]; then
    check "Max Connections" "PASS" "Reasonable limit: $MAX_CONN"
elif [[ $MAX_CONN -le 200 ]]; then
    check "Max Connections" "WARN" "High connection limit: $MAX_CONN"
else
    check "Max Connections" "FAIL" "Excessive connection limit: $MAX_CONN"
fi

IDLE_TIMEOUT=$(sudo -u postgres psql -p $PG_PORT -t -c "SHOW idle_in_transaction_session_timeout;" 2>/dev/null | xargs || echo "0")
IDLE_TIMEOUT_MS=${IDLE_TIMEOUT%ms}
if [[ $IDLE_TIMEOUT_MS -gt 0 ]] && [[ $IDLE_TIMEOUT_MS -le 600000 ]]; then
    check "Idle Transaction Timeout" "PASS" "Set to $IDLE_TIMEOUT"
else
    check "Idle Transaction Timeout" "WARN" "Not set or too high (recommend 10 minutes)"
fi
echo ""

# Check 6: File Permissions
echo "=== File Permissions ==="

PG_DATA_PERMS=$(stat -c %a /var/lib/postgresql/${PG_VERSION}/main 2>/dev/null || echo "000")
if [[ "$PG_DATA_PERMS" == "700" ]]; then
    check "Data Directory Permissions" "PASS" "Correct (700)"
else
    check "Data Directory Permissions" "FAIL" "Incorrect ($PG_DATA_PERMS, should be 700)"
fi

CONF_PERMS=$(stat -c %a "$PG_CONF" 2>/dev/null || echo "000")
if [[ "$CONF_PERMS" == "640" ]]; then
    check "postgresql.conf Permissions" "PASS" "Correct (640)"
else
    check "postgresql.conf Permissions" "WARN" "Permissions: $CONF_PERMS (recommend 640)"
fi

HBA_PERMS=$(stat -c %a "$PG_HBA" 2>/dev/null || echo "000")
if [[ "$HBA_PERMS" == "640" ]]; then
    check "pg_hba.conf Permissions" "PASS" "Correct (640)"
else
    check "pg_hba.conf Permissions" "WARN" "Permissions: $HBA_PERMS (recommend 640)"
fi
echo ""

# Check 7: Security Settings
echo "=== Security Settings ==="

# Check for superuser accounts
SUPERUSER_COUNT=$(sudo -u postgres psql -p $PG_PORT -t -c "SELECT count(*) FROM pg_roles WHERE rolsuper = true;" 2>/dev/null | xargs || echo "0")
if [[ $SUPERUSER_COUNT -le 2 ]]; then
    check "Superuser Accounts" "PASS" "$SUPERUSER_COUNT superuser account(s)"
else
    check "Superuser Accounts" "WARN" "$SUPERUSER_COUNT superuser accounts (review for necessity)"
fi

# Check listen addresses
LISTEN_ADDR=$(sudo -u postgres psql -p $PG_PORT -t -c "SHOW listen_addresses;" 2>/dev/null | xargs || echo "localhost")
if [[ "$LISTEN_ADDR" == "*" ]]; then
    check "Listen Addresses" "PASS" "Listening on all interfaces (with firewall protection)"
elif [[ "$LISTEN_ADDR" == "localhost" ]]; then
    check "Listen Addresses" "WARN" "Only listening on localhost (customers cannot connect)"
fi

# Check port number
ACTUAL_PORT=$(sudo -u postgres psql -p $PG_PORT -t -c "SHOW port;" 2>/dev/null | xargs || echo "5432")
if [[ "$ACTUAL_PORT" == "5433" ]]; then
    check "Port Number" "PASS" "Using non-default port: $ACTUAL_PORT"
else
    check "Port Number" "WARN" "Using default port 5432 (recommend non-default)"
fi
echo ""

# Summary
echo "=== Validation Summary ==="
echo -e "${GREEN}Passed:${NC}  $PASS_COUNT"
echo -e "${YELLOW}Warnings:${NC} $WARN_COUNT"
echo -e "${RED}Failed:${NC}   $FAIL_COUNT"
echo ""

TOTAL_CHECKS=$((PASS_COUNT + WARN_COUNT + FAIL_COUNT))
if [[ $TOTAL_CHECKS -gt 0 ]]; then
    SCORE=$(( 100 * PASS_COUNT / TOTAL_CHECKS ))
    echo "Security Score: $SCORE%"

    if [[ $SCORE -ge 90 ]]; then
        echo -e "${GREEN}✓ EXCELLENT${NC} - Configuration meets security standards"
        exit 0
    elif [[ $SCORE -ge 70 ]]; then
        echo -e "${YELLOW}⚠ GOOD${NC} - Some improvements recommended"
        exit 0
    else
        echo -e "${RED}✗ NEEDS IMPROVEMENT${NC} - Address failed checks immediately"
        exit 1
    fi
fi
