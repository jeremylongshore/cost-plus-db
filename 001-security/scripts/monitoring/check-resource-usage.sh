#!/bin/bash
#
# PostgreSQL Resource Usage Monitor
# ==================================
#
# Monitors PostgreSQL resource usage and detects anomalies
# - Long-running queries
# - Excessive connections per user
# - High CPU/memory usage
# - Disk space usage
#
# Usage: ./check-resource-usage.sh
#

set -euo pipefail

# Configuration
PG_PORT="5433"
LONG_QUERY_THRESHOLD=600  # 10 minutes in seconds
MAX_CONN_PER_USER=15
DISK_ALERT_THRESHOLD=80   # Alert if disk usage > 80%
ALERT_EMAIL="admin@costplusdb.com"
SECURITY_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/security-events/resource-alerts.log"

# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

mkdir -p "$(dirname "$SECURITY_LOG")"

echo "=== PostgreSQL Resource Usage Monitor ==="
echo "Run time: $(date)"
echo ""

# Check 1: Long-running queries
echo "=== Long-Running Queries (> ${LONG_QUERY_THRESHOLD}s) ==="
LONG_QUERIES=$(sudo -u postgres psql -p $PG_PORT -t -A -c "
SELECT count(*)
FROM pg_stat_activity
WHERE state = 'active'
  AND query_start < NOW() - INTERVAL '${LONG_QUERY_THRESHOLD} seconds'
  AND usename != 'postgres'
  AND query NOT LIKE '%pg_stat_activity%';
" 2>/dev/null || echo "0")

if [[ "$LONG_QUERIES" -gt 0 ]]; then
    echo -e "${YELLOW}WARNING: $LONG_QUERIES long-running queries detected${NC}"
    sudo -u postgres psql -p $PG_PORT -c "
SELECT
    pid,
    usename,
    datname,
    EXTRACT(EPOCH FROM (NOW() - query_start))::int AS runtime_seconds,
    LEFT(query, 100) AS query_preview
FROM pg_stat_activity
WHERE state = 'active'
  AND query_start < NOW() - INTERVAL '${LONG_QUERY_THRESHOLD} seconds'
  AND usename != 'postgres'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY query_start;
" 2>/dev/null

    # Log alert
    echo "$(date +'%Y-%m-%d %H:%M:%S') - WARNING: $LONG_QUERIES long-running queries" >> "$SECURITY_LOG"
else
    echo -e "${GREEN}OK: No long-running queries${NC}"
fi
echo ""

# Check 2: Excessive connections per user
echo "=== Connections Per User (Alert if > ${MAX_CONN_PER_USER}) ==="
EXCESSIVE_CONN=$(sudo -u postgres psql -p $PG_PORT -t -A -c "
SELECT usename, count(*) as conn_count
FROM pg_stat_activity
WHERE usename IS NOT NULL
GROUP BY usename
HAVING count(*) > ${MAX_CONN_PER_USER};
" 2>/dev/null)

if [[ -n "$EXCESSIVE_CONN" ]]; then
    echo -e "${YELLOW}WARNING: Users with excessive connections:${NC}"
    echo "$EXCESSIVE_CONN" | while IFS='|' read -r user count; do
        echo "  $user: $count connections"
    done

    # Log alert
    echo "$(date +'%Y-%m-%d %H:%M:%S') - WARNING: Excessive connections detected" >> "$SECURITY_LOG"
else
    echo -e "${GREEN}OK: No users with excessive connections${NC}"
fi
echo ""

# Check 3: Total active connections
echo "=== Total Active Connections ==="
TOTAL_CONN=$(sudo -u postgres psql -p $PG_PORT -t -A -c "
SELECT count(*) FROM pg_stat_activity WHERE datname IS NOT NULL;
" 2>/dev/null || echo "0")

MAX_CONN=$(sudo -u postgres psql -p $PG_PORT -t -A -c "
SHOW max_connections;
" 2>/dev/null | xargs || echo "100")

CONN_PERCENT=$(( 100 * TOTAL_CONN / MAX_CONN ))

echo "Active connections: $TOTAL_CONN / $MAX_CONN ($CONN_PERCENT%)"
if [[ $CONN_PERCENT -gt 80 ]]; then
    echo -e "${RED}CRITICAL: Connection usage above 80%${NC}"
    echo "$(date +'%Y-%m-%d %H:%M:%S') - CRITICAL: $CONN_PERCENT% connection usage" >> "$SECURITY_LOG"
elif [[ $CONN_PERCENT -gt 60 ]]; then
    echo -e "${YELLOW}WARNING: Connection usage above 60%${NC}"
else
    echo -e "${GREEN}OK: Connection usage normal${NC}"
fi
echo ""

# Check 4: Idle transactions
echo "=== Idle Transactions (> 5 minutes) ==="
IDLE_TRANS=$(sudo -u postgres psql -p $PG_PORT -t -A -c "
SELECT count(*)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND state_change < NOW() - INTERVAL '5 minutes';
" 2>/dev/null || echo "0")

if [[ "$IDLE_TRANS" -gt 0 ]]; then
    echo -e "${YELLOW}WARNING: $IDLE_TRANS idle transactions detected${NC}"
    sudo -u postgres psql -p $PG_PORT -c "
SELECT
    pid,
    usename,
    datname,
    EXTRACT(EPOCH FROM (NOW() - state_change))::int AS idle_seconds,
    state
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND state_change < NOW() - INTERVAL '5 minutes'
ORDER BY state_change;
" 2>/dev/null

    echo "$(date +'%Y-%m-%d %H:%M:%S') - WARNING: $IDLE_TRANS idle transactions" >> "$SECURITY_LOG"
else
    echo -e "${GREEN}OK: No long-idle transactions${NC}"
fi
echo ""

# Check 5: Database sizes
echo "=== Database Sizes ==="
sudo -u postgres psql -p $PG_PORT -c "
SELECT
    datname,
    pg_size_pretty(pg_database_size(datname)) AS size,
    (pg_database_size(datname)::float / (SELECT sum(pg_database_size(datname)) FROM pg_database WHERE datname NOT IN ('template0', 'template1'))::float * 100)::numeric(5,2) AS percent
FROM pg_database
WHERE datname NOT IN ('template0', 'template1', 'postgres')
ORDER BY pg_database_size(datname) DESC;
" 2>/dev/null || echo "Unable to query database sizes"
echo ""

# Check 6: Disk space usage
echo "=== Disk Space Usage ==="
DISK_USAGE=$(df -h /var/lib/postgresql 2>/dev/null | tail -1)
DISK_PERCENT=$(echo "$DISK_USAGE" | awk '{print $5}' | sed 's/%//')

echo "$DISK_USAGE"
if [[ $DISK_PERCENT -gt $DISK_ALERT_THRESHOLD ]]; then
    echo -e "${RED}CRITICAL: Disk usage above ${DISK_ALERT_THRESHOLD}%${NC}"
    echo "$(date +'%Y-%m-%d %H:%M:%S') - CRITICAL: $DISK_PERCENT% disk usage" >> "$SECURITY_LOG"

    if command -v mail &> /dev/null; then
        echo "Disk usage at $DISK_PERCENT% on PostgreSQL data directory" | \
            mail -s "CRITICAL: PostgreSQL Disk Space Alert" "$ALERT_EMAIL"
    fi
elif [[ $DISK_PERCENT -gt 70 ]]; then
    echo -e "${YELLOW}WARNING: Disk usage above 70%${NC}"
else
    echo -e "${GREEN}OK: Disk space sufficient${NC}"
fi
echo ""

# Check 7: Backup disk space
echo "=== Backup Repository Disk Usage ==="
if [[ -d /var/lib/pgbackrest ]]; then
    du -sh /var/lib/pgbackrest
    BACKUP_DISK=$(df -h /var/lib/pgbackrest 2>/dev/null | tail -1)
    echo "$BACKUP_DISK"
else
    echo "Backup repository not found"
fi
echo ""

# Check 8: Table bloat (top 5 largest tables)
echo "=== Largest Tables (Top 5) ==="
sudo -u postgres psql -p $PG_PORT -c "
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 5;
" 2>/dev/null || echo "Unable to query table sizes"
echo ""

# Check 9: Failed login attempts (last hour)
echo "=== Failed Login Attempts (Last Hour) ==="
FAILED_LOGINS=$(sudo grep "authentication failed" /var/log/postgresql/postgresql-16-main.log 2>/dev/null | \
    grep "$(date +'%Y-%m-%d %H')" | wc -l || echo "0")

if [[ $FAILED_LOGINS -gt 10 ]]; then
    echo -e "${RED}CRITICAL: $FAILED_LOGINS failed login attempts in last hour${NC}"
    echo "$(date +'%Y-%m-%d %H:%M:%S') - CRITICAL: $FAILED_LOGINS failed logins" >> "$SECURITY_LOG"
elif [[ $FAILED_LOGINS -gt 5 ]]; then
    echo -e "${YELLOW}WARNING: $FAILED_LOGINS failed login attempts${NC}"
else
    echo -e "${GREEN}OK: $FAILED_LOGINS failed login attempts${NC}"
fi
echo ""

# Check 10: PostgreSQL service status
echo "=== PostgreSQL Service Status ==="
if systemctl is-active --quiet postgresql@16-main; then
    echo -e "${GREEN}OK: PostgreSQL service is running${NC}"
else
    echo -e "${RED}CRITICAL: PostgreSQL service is NOT running${NC}"
    echo "$(date +'%Y-%m-%d %H:%M:%S') - CRITICAL: PostgreSQL service down" >> "$SECURITY_LOG"
fi
echo ""

echo "=== Resource Monitoring Complete ==="
echo "Log file: $SECURITY_LOG"
