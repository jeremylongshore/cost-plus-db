#!/bin/bash
# Monitor disk space, CPU, and memory usage
# Runs every 15 minutes via cron

DISK_THRESHOLD=85
MEM_THRESHOLD=90
ALERT_SCRIPT="/home/admincostplus/projects/costplusdb/001-security/alerts/scripts/send-alert-email.sh"
OUTPUT_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/security-events/resource-usage.log"

# Check disk usage
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
    echo "[$(date)] ALERT: Disk usage at ${DISK_USAGE}%" >> "$OUTPUT_LOG"
    $ALERT_SCRIPT "Disk Space Alert" "Disk usage at ${DISK_USAGE}% (threshold: ${DISK_THRESHOLD}%)"
fi

# Check memory usage
MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ "$MEM_USAGE" -gt "$MEM_THRESHOLD" ]; then
    echo "[$(date)] ALERT: Memory usage at ${MEM_USAGE}%" >> "$OUTPUT_LOG"
    $ALERT_SCRIPT "Memory Alert" "Memory usage at ${MEM_USAGE}% (threshold: ${MEM_THRESHOLD}%)"
fi

# Check pgbackrest repo disk usage
BACKUP_DISK=$(df -h /var/lib/pgbackrest | awk 'NR==2 {print $5}' | sed 's/%//')

echo "[$(date)] Resource check - Disk: ${DISK_USAGE}%, Memory: ${MEM_USAGE}%, Backup disk: ${BACKUP_DISK}%" >> "$OUTPUT_LOG"
