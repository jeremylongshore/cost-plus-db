#!/bin/bash
# Check for failed PostgreSQL authentication attempts
# Runs every 5 minutes via cron

THRESHOLD=5
LOG_FILE="/var/log/postgresql/postgresql-16-main.log"
ALERT_SCRIPT="/home/admincostplus/projects/costplusdb/001-security/alerts/scripts/send-alert-email.sh"
OUTPUT_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/security-events/failed-auth.log"

# Check if PostgreSQL log exists
if [ ! -f "$LOG_FILE" ]; then
    echo "[$(date)] ERROR: PostgreSQL log file not found: $LOG_FILE" >> "$OUTPUT_LOG"
    exit 1
fi

# Count failed attempts in last 5 minutes
FAILED_COUNT=$(echo "TheCitadel2003" | sudo -S grep "FATAL.*password authentication failed" "$LOG_FILE" 2>/dev/null | grep "$(date '+%Y-%m-%d %H:%M' --date='5 minutes ago')" | wc -l)

echo "[$(date)] Checked failed logins: $FAILED_COUNT attempts in last 5 minutes" >> "$OUTPUT_LOG"

if [ "$FAILED_COUNT" -gt "$THRESHOLD" ]; then
    echo "[$(date)] ALERT: $FAILED_COUNT failed login attempts (threshold: $THRESHOLD)" >> "$OUTPUT_LOG"
    $ALERT_SCRIPT "Failed Login Alert" "Detected $FAILED_COUNT failed PostgreSQL login attempts in last 5 minutes. Investigate immediately."
fi
