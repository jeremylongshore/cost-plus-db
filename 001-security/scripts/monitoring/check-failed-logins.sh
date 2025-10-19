#!/bin/bash
#
# PostgreSQL Failed Login Monitor
# ================================
#
# Monitors PostgreSQL logs for failed authentication attempts
# Sends alerts if threshold is exceeded
#
# Usage: ./check-failed-logins.sh [threshold]
#

set -euo pipefail

# Configuration
THRESHOLD="${1:-10}"  # Default: 10 failed logins
TIME_WINDOW=3600      # Check last 1 hour
PG_LOG_DIR="/var/log/postgresql"
ALERT_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/alerts/failed-login-alerts.log"
SECURITY_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/security-events/failed-logins.log"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

alert() {
    echo -e "${RED}[ALERT]${NC} $1"
}

# Create log directories
mkdir -p "$(dirname "$ALERT_LOG")"
mkdir -p "$(dirname "$SECURITY_LOG")"

log "Checking PostgreSQL failed login attempts..."
log "Threshold: $THRESHOLD failed attempts in last hour"

# Find most recent PostgreSQL log file
RECENT_LOG=$(find "$PG_LOG_DIR" -name "postgresql-*.log" -type f -mmin -60 | sort -r | head -n 1)

if [[ -z "$RECENT_LOG" ]]; then
    warn "No recent PostgreSQL log files found in $PG_LOG_DIR"
    exit 0
fi

log "Analyzing log file: $RECENT_LOG"

# Count failed authentication attempts
FAILED_COUNT=0
if [[ -f "$RECENT_LOG" ]]; then
    FAILED_COUNT=$(grep -c "FATAL.*password authentication failed" "$RECENT_LOG" 2>/dev/null || echo "0")
fi

log "Failed login attempts found: $FAILED_COUNT"

# Extract failed login details
if [[ $FAILED_COUNT -gt 0 ]]; then
    log "Failed login details:"
    grep "FATAL.*password authentication failed" "$RECENT_LOG" | while read -r line; do
        # Extract IP and user from log line
        IP=$(echo "$line" | grep -oP '\d+\.\d+\.\d+\.\d+' || echo "unknown")
        USER=$(echo "$line" | grep -oP 'user=\K\S+' || echo "unknown")
        TIMESTAMP=$(echo "$line" | awk '{print $1, $2}')

        # Log to security events
        echo "$(date +'%Y-%m-%d %H:%M:%S') - Failed login: user=$USER ip=$IP time=$TIMESTAMP" >> "$SECURITY_LOG"
        echo "  [$TIMESTAMP] User: $USER, IP: $IP"
    done
fi

# Check if threshold exceeded
if [[ $FAILED_COUNT -ge $THRESHOLD ]]; then
    alert "THRESHOLD EXCEEDED: $FAILED_COUNT failed login attempts (threshold: $THRESHOLD)"

    # Log alert
    cat >> "$ALERT_LOG" << EOF
$(date +'%Y-%m-%d %H:%M:%S') - ALERT: Failed login threshold exceeded
Failed attempts: $FAILED_COUNT
Threshold: $THRESHOLD
Log file: $RECENT_LOG
Action: Review security logs and consider blocking IPs
---
EOF

    # Send email alert (if configured)
    if command -v mail &> /dev/null; then
        {
            echo "Subject: [CostPlusDB ALERT] Failed Login Threshold Exceeded"
            echo ""
            echo "Failed login attempts: $FAILED_COUNT"
            echo "Threshold: $THRESHOLD"
            echo "Time: $(date)"
            echo ""
            echo "Recent failed attempts:"
            grep "FATAL.*password authentication failed" "$RECENT_LOG" | tail -n 20
        } | mail -s "[CostPlusDB ALERT] Failed Login Threshold Exceeded" admin@costplusdb.com 2>/dev/null || warn "Email notification failed (mail not configured)"
    fi

    # Return non-zero to indicate alert condition
    exit 1
else
    log "OK: Failed login count ($FAILED_COUNT) is below threshold ($THRESHOLD)"
    exit 0
fi
