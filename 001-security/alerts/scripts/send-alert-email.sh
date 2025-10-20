#!/bin/bash
# Send security alert via email using Resend API
# Configured: 2025-10-19

SUBJECT="$1"
MESSAGE="$2"
ALERT_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/alerts/email-alerts.log"
PENDING_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/alerts/pending-emails.log"
RESEND_CONFIG="/home/admincostplus/projects/costplusdb/001-security/keys/api-tokens/resend-api-key"

# Load Resend credentials
if [ -f "$RESEND_CONFIG" ]; then
    source "$RESEND_CONFIG"
else
    echo "[$(date)] ERROR: Resend config not found: $RESEND_CONFIG" >> "$ALERT_LOG"
    exit 1
fi

# Validate API key is configured
if [ "$RESEND_API_KEY" == "YOUR_RESEND_API_KEY" ] || [ -z "$RESEND_API_KEY" ]; then
    echo "[$(date)] WARNING: Resend API key not configured - logging only" >> "$ALERT_LOG"

    # Log to pending emails
    cat >> "$PENDING_LOG" <<EMAILEND

================================================================================
TO: $RESEND_TO_EMAIL
FROM: $RESEND_FROM_EMAIL
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
    echo "[$(date)] Alert logged to pending (API key not configured)" >> "$ALERT_LOG"
    exit 0
fi

# Build email HTML body (compact, no newlines for JSON)
EMAIL_HTML="<h2>CostPlusDB Security Alert</h2><p><strong>Subject:</strong> $SUBJECT</p><hr><p>$MESSAGE</p><hr><p><small>Automated alert from CostPlusDB Security Monitoring System<br>Server: $(hostname)<br>IP: $(hostname -I | awk '{print $1}')<br>Timestamp: $(date)<br><br>For security issues, contact: jeremy@intentsolutions.io</small></p>"

# Escape quotes in HTML for JSON
EMAIL_HTML_ESCAPED=$(echo "$EMAIL_HTML" | sed 's/"/\\"/g')

# Send via Resend API with inline JSON
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"from\":\"$RESEND_FROM_EMAIL\",\"to\":[\"$RESEND_TO_EMAIL\"],\"subject\":\"[CostPlusDB] $SUBJECT\",\"html\":\"$EMAIL_HTML_ESCAPED\"}")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" == "200" ]; then
    echo "[$(date)] ✅ Email sent successfully via Resend: $SUBJECT" >> "$ALERT_LOG"
    echo "[$(date)] Response: $RESPONSE_BODY" >> "$ALERT_LOG"
else
    echo "[$(date)] ❌ Email send FAILED (HTTP $HTTP_STATUS): $SUBJECT" >> "$ALERT_LOG"
    echo "[$(date)] Error response: $RESPONSE_BODY" >> "$ALERT_LOG"

    # Fallback: log to pending emails
    cat >> "$PENDING_LOG" <<EMAILEND

================================================================================
FAILED TO SEND (HTTP $HTTP_STATUS)
TO: $RESEND_TO_EMAIL
FROM: $RESEND_FROM_EMAIL
SUBJECT: [CostPlusDB Security Alert] $SUBJECT
DATE: $(date)
ERROR: $RESPONSE_BODY
================================================================================

$MESSAGE

================================================================================

EMAILEND
fi
