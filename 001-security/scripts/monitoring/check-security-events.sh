#!/bin/bash
# CostPlusDB Security Monitoring Script - Security Events Detection
#
# IMPORTANT: This script requires sudo NOPASSWD configuration
# Add to /etc/sudoers.d/costplusdb-monitoring:
#
#   admincostplus ALL=(ALL) NOPASSWD: /usr/bin/fail2ban-client
#   admincostplus ALL=(ALL) NOPASSWD: /usr/bin/grep /var/log/postgresql/*
#
# See 001-security/config/sudoers-setup.md for complete setup instructions

OUTPUT_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/security-events/hourly-check.log"
ALERT_SCRIPT="/home/admincostplus/projects/costplusdb/001-security/alerts/scripts/send-alert-email.sh"

echo "[$(date)] Starting hourly security event check" >> "$OUTPUT_LOG"

# Check fail2ban status
BANNED_IPS=$(sudo fail2ban-client status postgresql 2>/dev/null | grep "Currently banned" | awk '{print $4}')
if [ "$BANNED_IPS" -gt 0 ]; then
    echo "[$(date)] WARNING: $BANNED_IPS IPs currently banned by fail2ban" >> "$OUTPUT_LOG"
fi

# Check for suspicious PostgreSQL queries (examples)
SUSPICIOUS_COUNT=$(sudo grep -i "DROP DATABASE\|DROP TABLE\|DELETE FROM.*WHERE 1=1" /var/log/postgresql/postgresql-16-main.log 2>/dev/null | wc -l)
if [ "$SUSPICIOUS_COUNT" -gt 0 ]; then
    echo "[$(date)] ALERT: $SUSPICIOUS_COUNT suspicious queries detected" >> "$OUTPUT_LOG"
    $ALERT_SCRIPT "Suspicious Query Alert" "Detected $SUSPICIOUS_COUNT potentially dangerous SQL queries. Review logs immediately."
fi

# Check system auth log for SSH attempts
SSH_FAILURES=$(grep "Failed password" /var/log/auth.log 2>/dev/null | grep "$(date '+%b %d')" | wc -l)
echo "[$(date)] SSH failed attempts today: $SSH_FAILURES" >> "$OUTPUT_LOG"

echo "[$(date)] Security event check complete - Banned IPs: $BANNED_IPS, Suspicious queries: $SUSPICIOUS_COUNT, SSH failures today: $SSH_FAILURES" >> "$OUTPUT_LOG"
