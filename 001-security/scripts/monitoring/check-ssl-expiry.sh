#!/bin/bash
#
# SSL Certificate Expiry Checker
# ===============================
#
# Checks PostgreSQL SSL certificate expiry and sends alerts
# if certificate will expire within threshold days
#
# Usage: ./check-ssl-expiry.sh [threshold_days]
# Default threshold: 30 days
#

set -euo pipefail

# Configuration
SSL_CERT="/var/lib/postgresql/16/main/ssl/server.crt"
ALERT_THRESHOLD=${1:-30}  # Alert if expires within N days
ALERT_EMAIL="admin@costplusdb.com"
SECURITY_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/security-events/ssl-expiry-checks.log"

# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if certificate exists
if [[ ! -f "$SSL_CERT" ]]; then
    echo -e "${RED}ERROR:${NC} SSL certificate not found: $SSL_CERT"
    exit 1
fi

# Get certificate expiry date
EXPIRY_DATE=$(openssl x509 -in "$SSL_CERT" -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

# Get certificate details
CERT_SUBJECT=$(openssl x509 -in "$SSL_CERT" -noout -subject | cut -d= -f2-)
CERT_FINGERPRINT=$(openssl x509 -in "$SSL_CERT" -noout -fingerprint | cut -d= -f2)

# Log check
mkdir -p "$(dirname "$SECURITY_LOG")"
echo "$(date +'%Y-%m-%d %H:%M:%S') - SSL expiry check: $DAYS_UNTIL_EXPIRY days remaining" >> "$SECURITY_LOG"

# Display status
echo "=== SSL Certificate Status ==="
echo "Certificate: $SSL_CERT"
echo "Subject: $CERT_SUBJECT"
echo "Fingerprint: $CERT_FINGERPRINT"
echo "Expires: $EXPIRY_DATE"
echo "Days until expiry: $DAYS_UNTIL_EXPIRY"
echo ""

# Check if certificate is expired
if [[ $DAYS_UNTIL_EXPIRY -lt 0 ]]; then
    echo -e "${RED}CRITICAL: SSL certificate has EXPIRED!${NC}"
    echo "Certificate expired $((-DAYS_UNTIL_EXPIRY)) days ago"

    # Send alert email
    if command -v mail &> /dev/null; then
        echo "SSL certificate has EXPIRED on $EXPIRY_DATE" | mail -s "CRITICAL: PostgreSQL SSL Certificate Expired" "$ALERT_EMAIL"
    fi

    exit 2

# Check if certificate is expiring soon
elif [[ $DAYS_UNTIL_EXPIRY -lt $ALERT_THRESHOLD ]]; then
    echo -e "${YELLOW}WARNING: SSL certificate expires in $DAYS_UNTIL_EXPIRY days!${NC}"
    echo "Alert threshold: $ALERT_THRESHOLD days"

    # Send warning email
    if command -v mail &> /dev/null; then
        cat << EOF | mail -s "WARNING: PostgreSQL SSL Certificate Expiring Soon" "$ALERT_EMAIL"
SSL Certificate Expiry Warning
==============================

The PostgreSQL SSL certificate will expire soon.

Certificate: $SSL_CERT
Subject: $CERT_SUBJECT
Expires: $EXPIRY_DATE
Days remaining: $DAYS_UNTIL_EXPIRY
Alert threshold: $ALERT_THRESHOLD days

Action Required:
Generate new SSL certificate before expiry to avoid service disruption.

Renewal command:
sudo /home/admincostplus/projects/costplusdb/001-security/config/ssl/generate-cert.sh

After generating new certificate, restart PostgreSQL:
sudo systemctl restart postgresql@16-main
EOF
    fi

    exit 1

# Certificate is valid
else
    echo -e "${GREEN}OK: SSL certificate is valid${NC}"
    echo "Certificate expires in $DAYS_UNTIL_EXPIRY days (threshold: $ALERT_THRESHOLD days)"
    exit 0
fi
