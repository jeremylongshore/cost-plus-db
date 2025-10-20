#!/bin/bash
# Send security alert via email
# For now, logs to file until email is configured

SUBJECT="$1"
MESSAGE="$2"
TO_EMAIL="jeremy@intentsolutions.io"
FROM_EMAIL="alerts@costplusdb.dev"
ALERT_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/alerts/email-alerts.log"
PENDING_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/alerts/pending-emails.log"

# Log alert
echo "[$(date)] ALERT SENT: $SUBJECT - $MESSAGE" >> "$ALERT_LOG"

# Create email message (for when email is configured)
cat >> "$PENDING_LOG" <<EMAILEND

================================================================================
TO: $TO_EMAIL
FROM: $FROM_EMAIL
SUBJECT: [CostPlusDB Security Alert] $SUBJECT
DATE: $(date)
================================================================================

$MESSAGE

---
Automated alert from CostPlusDB Security Monitoring System
Server: $(hostname)
IP: $(hostname -I | awk '{print $1}')

For security issues, contact: jeremy@intentsolutions.io
================================================================================

EMAILEND

# TODO: Configure actual email sending
# Options:
# 1. Mailgun API
# 2. SendGrid API
# 3. AWS SES
# 4. Local sendmail/postfix
#
# Example with mailgun (when configured):
# curl -s --user "api:YOUR_API_KEY" \
#   https://api.mailgun.net/v3/YOUR_DOMAIN/messages \
#   -F from="$FROM_EMAIL" \
#   -F to="$TO_EMAIL" \
#   -F subject="[CostPlusDB] $SUBJECT" \
#   -F text="$MESSAGE"

echo "[$(date)] Alert logged - Email sending not yet configured" >> "$ALERT_LOG"
