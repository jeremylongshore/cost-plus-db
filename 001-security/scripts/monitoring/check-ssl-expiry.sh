#!/bin/bash
# Check PostgreSQL SSL certificate expiration
# Runs every 6 hours via cron

CERT_FILE="/var/lib/postgresql/18/main/ssl/server.crt"
ALERT_SCRIPT="/home/admincostplus/projects/costplusdb/001-security/alerts/scripts/send-alert-email.sh"
OUTPUT_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/alerts/ssl-expiry-checks.log"
DAYS_WARNING=30

if [ ! -f "$CERT_FILE" ]; then
    echo "[$(date)] ERROR: Certificate file not found: $CERT_FILE" >> "$OUTPUT_LOG"
    exit 1
fi

# Get expiration date
EXPIRY_DATE=$(echo "TheCitadel2003" | sudo -S openssl x509 -in "$CERT_FILE" -noout -enddate 2>/dev/null | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

if [ "$DAYS_UNTIL_EXPIRY" -lt "$DAYS_WARNING" ]; then
    echo "[$(date)] ALERT: SSL certificate expires in $DAYS_UNTIL_EXPIRY days" >> "$OUTPUT_LOG"
    $ALERT_SCRIPT "SSL Certificate Expiry Warning" "PostgreSQL SSL certificate expires in $DAYS_UNTIL_EXPIRY days (expiry: $EXPIRY_DATE). Renew immediately."
else
    echo "[$(date)] SSL certificate valid for $DAYS_UNTIL_EXPIRY more days (expires: $EXPIRY_DATE)" >> "$OUTPUT_LOG"
fi
