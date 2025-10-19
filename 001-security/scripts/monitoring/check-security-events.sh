#!/bin/bash
#
# Security Events Monitor
# =======================
#
# Monitors and reports security-related events:
# - Failed authentication attempts
# - Unauthorized access attempts
# - Suspicious query patterns
# - fail2ban activity
# - Unusual connection patterns
#
# Usage: ./check-security-events.sh [hours]
# Default: Check last 24 hours
#

set -euo pipefail

# Configuration
PG_PORT="5433"
HOURS=${1:-24}
PG_LOG="/var/log/postgresql/postgresql-16-main.log"
FAIL2BAN_LOG="/var/log/fail2ban.log"
AUTH_LOG="/var/log/auth.log"
SECURITY_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/security-events/daily-security-report.log"

# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

mkdir -p "$(dirname "$SECURITY_LOG")"

echo "=== Security Events Monitor ==="
echo "Report period: Last $HOURS hours"
echo "Generated: $(date)"
echo ""

# Event 1: Failed PostgreSQL authentication attempts
echo "=== Failed PostgreSQL Authentication Attempts ==="
if [[ -f "$PG_LOG" ]]; then
    FAILED_AUTH=$(grep "authentication failed" "$PG_LOG" 2>/dev/null | \
        grep -E "$(date -d "$HOURS hours ago" +'%Y-%m-%d')" | wc -l || echo "0")

    if [[ $FAILED_AUTH -gt 0 ]]; then
        echo -e "${YELLOW}WARNING: $FAILED_AUTH failed authentication attempts${NC}"
        echo ""
        echo "Top failed usernames:"
        grep "authentication failed" "$PG_LOG" 2>/dev/null | \
            grep -E "$(date -d "$HOURS hours ago" +'%Y-%m-%d')" | \
            grep -oP 'user "\\K[^"]+' | sort | uniq -c | sort -rn | head -5
        echo ""
        echo "Top source IPs:"
        grep "authentication failed" "$PG_LOG" 2>/dev/null | \
            grep -E "$(date -d "$HOURS hours ago" +'%Y-%m-%d')" | \
            grep -oP 'host=\\K[^ ]+' | sort | uniq -c | sort -rn | head -5
    else
        echo -e "${GREEN}OK: No failed authentication attempts${NC}"
    fi
else
    echo "PostgreSQL log not found: $PG_LOG"
fi
echo ""

# Event 2: Unauthorized access attempts (no pg_hba.conf entry)
echo "=== Unauthorized Access Attempts ==="
if [[ -f "$PG_LOG" ]]; then
    UNAUTHORIZED=$(grep "no pg_hba.conf entry" "$PG_LOG" 2>/dev/null | \
        grep -E "$(date -d "$HOURS hours ago" +'%Y-%m-%d')" | wc -l || echo "0")

    if [[ $UNAUTHORIZED -gt 0 ]]; then
        echo -e "${RED}ALERT: $UNAUTHORIZED unauthorized access attempts${NC}"
        echo ""
        echo "Recent attempts:"
        grep "no pg_hba.conf entry" "$PG_LOG" 2>/dev/null | \
            grep -E "$(date -d "$HOURS hours ago" +'%Y-%m-%d')" | tail -10
    else
        echo -e "${GREEN}OK: No unauthorized access attempts${NC}"
    fi
else
    echo "PostgreSQL log not found: $PG_LOG"
fi
echo ""

# Event 3: fail2ban activity
echo "=== fail2ban Ban Activity ==="
if [[ -f "$FAIL2BAN_LOG" ]]; then
    BANS=$(grep "Ban " "$FAIL2BAN_LOG" 2>/dev/null | \
        grep -E "$(date -d "$HOURS hours ago" +'%Y-%m-%d')" | wc -l || echo "0")

    if [[ $BANS -gt 0 ]]; then
        echo -e "${YELLOW}$BANS IP addresses banned${NC}"
        echo ""
        echo "Recent bans:"
        grep "Ban " "$FAIL2BAN_LOG" 2>/dev/null | \
            grep -E "$(date -d "$HOURS hours ago" +'%Y-%m-%d')" | tail -10
        echo ""
        echo "Currently banned IPs:"
        fail2ban-client status postgresql 2>/dev/null | grep "Banned IP" || echo "None"
    else
        echo -e "${GREEN}OK: No IPs banned${NC}"
    fi
else
    echo "fail2ban log not found: $FAIL2BAN_LOG"
fi
echo ""

# Event 4: SSH failed login attempts
echo "=== SSH Failed Login Attempts ==="
if [[ -f "$AUTH_LOG" ]]; then
    SSH_FAILED=$(grep "Failed password" "$AUTH_LOG" 2>/dev/null | \
        grep -E "$(date -d "$HOURS hours ago" +'%b %d')" | wc -l || echo "0")

    if [[ $SSH_FAILED -gt 0 ]]; then
        echo -e "${YELLOW}WARNING: $SSH_FAILED SSH failed login attempts${NC}"
        echo ""
        echo "Top attempted usernames:"
        grep "Failed password" "$AUTH_LOG" 2>/dev/null | \
            grep -E "$(date -d "$HOURS hours ago" +'%b %d')" | \
            awk '{print $(NF-5)}' | sort | uniq -c | sort -rn | head -5
    else
        echo -e "${GREEN}OK: No SSH failed login attempts${NC}"
    fi
else
    echo "Auth log not found: $AUTH_LOG"
fi
echo ""

# Event 5: Suspicious query patterns
echo "=== Suspicious Query Patterns ==="
if [[ -f "$PG_LOG" ]]; then
    # Look for SQL injection attempts
    INJECTION_ATTEMPTS=$(grep -iE "(UNION SELECT|';--|1=1|DROP TABLE|<script>)" "$PG_LOG" 2>/dev/null | \
        grep -E "$(date -d "$HOURS hours ago" +'%Y-%m-%d')" | wc -l || echo "0")

    if [[ $INJECTION_ATTEMPTS -gt 0 ]]; then
        echo -e "${RED}ALERT: $INJECTION_ATTEMPTS potential SQL injection attempts${NC}"
        echo ""
        echo "Recent suspicious queries:"
        grep -iE "(UNION SELECT|';--|1=1|DROP TABLE|<script>)" "$PG_LOG" 2>/dev/null | \
            grep -E "$(date -d "$HOURS hours ago" +'%Y-%m-%d')" | tail -5
    else
        echo -e "${GREEN}OK: No suspicious query patterns detected${NC}"
    fi
else
    echo "PostgreSQL log not found: $PG_LOG"
fi
echo ""

# Event 6: Unusual connection patterns
echo "=== Current Connection Analysis ==="
UNIQUE_IPS=$(sudo -u postgres psql -p $PG_PORT -t -A -c "
SELECT count(DISTINCT client_addr)
FROM pg_stat_activity
WHERE client_addr IS NOT NULL;
" 2>/dev/null || echo "0")

echo "Unique client IPs connected: $UNIQUE_IPS"

if [[ $UNIQUE_IPS -gt 10 ]]; then
    echo -e "${YELLOW}WARNING: High number of unique IPs${NC}"
    echo ""
    echo "Connection breakdown by IP:"
    sudo -u postgres psql -p $PG_PORT -c "
SELECT
    client_addr,
    count(*) as connections,
    array_agg(DISTINCT usename) as users,
    array_agg(DISTINCT datname) as databases
FROM pg_stat_activity
WHERE client_addr IS NOT NULL
GROUP BY client_addr
ORDER BY count(*) DESC
LIMIT 10;
" 2>/dev/null
else
    echo -e "${GREEN}OK: Normal connection pattern${NC}"
fi
echo ""

# Event 7: Recent SSL connection failures
echo "=== SSL Connection Issues ==="
if [[ -f "$PG_LOG" ]]; then
    SSL_ERRORS=$(grep -iE "(SSL error|certificate|no SSL connection)" "$PG_LOG" 2>/dev/null | \
        grep -E "$(date -d "$HOURS hours ago" +'%Y-%m-%d')" | wc -l || echo "0")

    if [[ $SSL_ERRORS -gt 0 ]]; then
        echo -e "${YELLOW}WARNING: $SSL_ERRORS SSL-related errors${NC}"
        echo ""
        echo "Recent SSL errors:"
        grep -iE "(SSL error|certificate|no SSL connection)" "$PG_LOG" 2>/dev/null | \
            grep -E "$(date -d "$HOURS hours ago" +'%Y-%m-%d')" | tail -5
    else
        echo -e "${GREEN}OK: No SSL connection issues${NC}"
    fi
else
    echo "PostgreSQL log not found: $PG_LOG"
fi
echo ""

# Event 8: Database role changes
echo "=== Recent Role/Permission Changes ==="
if [[ -f "$PG_LOG" ]]; then
    ROLE_CHANGES=$(grep -iE "(CREATE ROLE|DROP ROLE|ALTER ROLE|GRANT|REVOKE)" "$PG_LOG" 2>/dev/null | \
        grep -E "$(date -d "$HOURS hours ago" +'%Y-%m-%d')" | wc -l || echo "0")

    if [[ $ROLE_CHANGES -gt 0 ]]; then
        echo -e "${BLUE}INFO: $ROLE_CHANGES role/permission changes${NC}"
        echo ""
        echo "Recent changes:"
        grep -iE "(CREATE ROLE|DROP ROLE|ALTER ROLE|GRANT|REVOKE)" "$PG_LOG" 2>/dev/null | \
            grep -E "$(date -d "$HOURS hours ago" +'%Y-%m-%d')" | tail -10
    else
        echo -e "${GREEN}OK: No role/permission changes${NC}"
    fi
else
    echo "PostgreSQL log not found: $PG_LOG"
fi
echo ""

# Event 9: Database structure changes (DDL)
echo "=== Recent DDL Operations ==="
if [[ -f "$PG_LOG" ]]; then
    DDL_OPS=$(grep -iE "(CREATE TABLE|DROP TABLE|ALTER TABLE|CREATE INDEX|DROP INDEX)" "$PG_LOG" 2>/dev/null | \
        grep -E "$(date -d "$HOURS hours ago" +'%Y-%m-%d')" | wc -l || echo "0")

    if [[ $DDL_OPS -gt 0 ]]; then
        echo -e "${BLUE}INFO: $DDL_OPS DDL operations performed${NC}"
        echo ""
        echo "Recent DDL:"
        grep -iE "(CREATE TABLE|DROP TABLE|ALTER TABLE|CREATE INDEX|DROP INDEX)" "$PG_LOG" 2>/dev/null | \
            grep -E "$(date -d "$HOURS hours ago" +'%Y-%m-%d')" | tail -10
    else
        echo -e "${GREEN}OK: No DDL operations${NC}"
    fi
else
    echo "PostgreSQL log not found: $PG_LOG"
fi
echo ""

# Summary
echo "=== Security Event Summary ==="
TOTAL_EVENTS=$(( FAILED_AUTH + UNAUTHORIZED + BANS + SSH_FAILED + INJECTION_ATTEMPTS + SSL_ERRORS ))

if [[ $TOTAL_EVENTS -eq 0 ]]; then
    echo -e "${GREEN}✓ No security events detected${NC}"
    echo "System appears to be operating normally"
elif [[ $TOTAL_EVENTS -lt 10 ]]; then
    echo -e "${YELLOW}⚠ $TOTAL_EVENTS security events detected${NC}"
    echo "Events are within normal range, monitor regularly"
else
    echo -e "${RED}✗ $TOTAL_EVENTS security events detected${NC}"
    echo "High number of security events - investigate immediately"
fi

# Log summary
echo "$(date +'%Y-%m-%d %H:%M:%S') - Security scan: $TOTAL_EVENTS events ($FAILED_AUTH auth failures, $UNAUTHORIZED unauthorized, $BANS bans)" >> "$SECURITY_LOG"

echo ""
echo "=== Security Event Monitoring Complete ==="
echo "Log file: $SECURITY_LOG"
