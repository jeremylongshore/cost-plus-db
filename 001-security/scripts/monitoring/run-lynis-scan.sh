#!/bin/bash
# Run Lynis security scan monthly
# Runs on 1st of each month at 3 AM

OUTPUT_DIR="/home/admincostplus/projects/costplusdb/001-security/scans/vulnerability-scans"
OUTPUT_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/scans/lynis-monthly.log"
SCAN_FILE="$OUTPUT_DIR/$(date +%Y-%m-%d)-lynis-scan.txt"

echo "[$(date)] Starting monthly Lynis security scan" >> "$OUTPUT_LOG"

mkdir -p "$OUTPUT_DIR"

# Check if Lynis is installed
if ! command -v lynis &> /dev/null; then
    echo "[$(date)] ERROR: Lynis not installed. Installing..." >> "$OUTPUT_LOG"
    echo "TheCitadel2003" | sudo -S apt-get update && echo "TheCitadel2003" | sudo -S apt-get install -y lynis >> "$OUTPUT_LOG" 2>&1
fi

# Run Lynis scan
echo "TheCitadel2003" | sudo -S lynis audit system --quick > "$SCAN_FILE" 2>&1

# Extract hardening index
HARDENING_INDEX=$(grep "Hardening index" "$SCAN_FILE" | awk '{print $4}')

echo "[$(date)] Lynis scan complete - Hardening index: $HARDENING_INDEX - Report: $SCAN_FILE" >> "$OUTPUT_LOG"

# Alert if hardening index drops below 70
if [ -n "$HARDENING_INDEX" ] && [ "$HARDENING_INDEX" -lt 70 ]; then
    /home/admincostplus/projects/costplusdb/001-security/alerts/scripts/send-alert-email.sh "Security Hardening Alert" "Lynis hardening index dropped to $HARDENING_INDEX (threshold: 70). Review scan results: $SCAN_FILE"
fi
