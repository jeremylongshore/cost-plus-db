#!/bin/bash
#
# Failed Login Analyzer
# ======================
#
# Analyzes PostgreSQL logs for failed authentication attempts
# Provides statistics and identifies patterns
#
# Usage: ./analyze-failed-logins.sh [hours] [output_format]
#

set -euo pipefail

# Configuration
PG_LOG="/var/log/postgresql/postgresql-16-main.log"
HOURS=${1:-24}
OUTPUT_FORMAT=${2:-text}  # text, json, csv

# Color output (only for text format)
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verify log file exists
if [[ ! -f "$PG_LOG" ]]; then
    echo "Error: PostgreSQL log not found: $PG_LOG"
    exit 1
fi

# Create temporary working directory
WORK_DIR=$(mktemp -d)
trap "rm -rf $WORK_DIR" EXIT

# Extract failed login attempts from specified time period
CUTOFF_DATE=$(date -d "$HOURS hours ago" +'%Y-%m-%d')
grep "authentication failed" "$PG_LOG" 2>/dev/null | grep -E "$CUTOFF_DATE" > "$WORK_DIR/failed_logins.txt" || true

# Count total failures
TOTAL_FAILURES=$(wc -l < "$WORK_DIR/failed_logins.txt")

if [[ "$OUTPUT_FORMAT" == "text" ]]; then
    echo -e "${BLUE}=== Failed Login Analysis ===${NC}"
    echo "Report period: Last $HOURS hours"
    echo "Generated: $(date)"
    echo ""
    echo -e "${RED}Total Failed Attempts: $TOTAL_FAILURES${NC}"
    echo ""
fi

# If no failures, exit early
if [[ $TOTAL_FAILURES -eq 0 ]]; then
    if [[ "$OUTPUT_FORMAT" == "text" ]]; then
        echo -e "${GREEN}✓ No failed login attempts detected${NC}"
    elif [[ "$OUTPUT_FORMAT" == "json" ]]; then
        echo '{"total_failures": 0, "analysis_period_hours": '$HOURS', "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
    fi
    exit 0
fi

# Analyze by username
if [[ "$OUTPUT_FORMAT" == "text" ]]; then
    echo -e "${YELLOW}=== Top Failed Usernames ===${NC}"
fi

grep -oP 'user "\K[^"]+' "$WORK_DIR/failed_logins.txt" | sort | uniq -c | sort -rn > "$WORK_DIR/by_username.txt"

if [[ "$OUTPUT_FORMAT" == "text" ]]; then
    head -10 "$WORK_DIR/by_username.txt" | while read count username; do
        printf "%5d  %s\n" "$count" "$username"
    done
    echo ""
fi

# Analyze by IP address
if [[ "$OUTPUT_FORMAT" == "text" ]]; then
    echo -e "${YELLOW}=== Top Source IP Addresses ===${NC}"
fi

grep -oP 'host=\K[^ ]+' "$WORK_DIR/failed_logins.txt" | sort | uniq -c | sort -rn > "$WORK_DIR/by_ip.txt"

if [[ "$OUTPUT_FORMAT" == "text" ]]; then
    head -10 "$WORK_DIR/by_ip.txt" | while read count ip; do
        printf "%5d  %s" "$count" "$ip"

        # Try to get hostname (with timeout)
        if command -v timeout &> /dev/null; then
            HOSTNAME=$(timeout 2 host "$ip" 2>/dev/null | grep "pointer" | awk '{print $NF}' | sed 's/\.$//' || echo "")
            if [[ -n "$HOSTNAME" ]]; then
                printf " (%s)" "$HOSTNAME"
            fi
        fi
        echo ""
    done
    echo ""
fi

# Analyze by hour of day
if [[ "$OUTPUT_FORMAT" == "text" ]]; then
    echo -e "${YELLOW}=== Failed Attempts by Hour ===${NC}"
fi

grep -oP '^\d{4}-\d{2}-\d{2} \K\d{2}' "$WORK_DIR/failed_logins.txt" | sort | uniq -c | sort -k2 -n > "$WORK_DIR/by_hour.txt"

if [[ "$OUTPUT_FORMAT" == "text" ]]; then
    while read count hour; do
        printf "%02d:00  " "$hour"
        # Create simple ASCII bar chart
        BAR_LENGTH=$(( count * 50 / (TOTAL_FAILURES > 50 ? TOTAL_FAILURES : 50) ))
        printf "%${BAR_LENGTH}s" | tr ' ' '▓'
        printf " %d\n" "$count"
    done < "$WORK_DIR/by_hour.txt"
    echo ""
fi

# Identify potential attack patterns
if [[ "$OUTPUT_FORMAT" == "text" ]]; then
    echo -e "${YELLOW}=== Attack Pattern Analysis ===${NC}"
fi

# Check for brute force (single IP, multiple users)
awk '{print $NF}' "$WORK_DIR/by_ip.txt" | while read ip; do
    USER_COUNT=$(grep "host=$ip" "$WORK_DIR/failed_logins.txt" | grep -oP 'user "\K[^"]+' | sort -u | wc -l)
    ATTEMPT_COUNT=$(grep "host=$ip" "$WORK_DIR/failed_logins.txt" | wc -l)

    if [[ $ATTEMPT_COUNT -ge 20 ]] && [[ $USER_COUNT -ge 5 ]]; then
        if [[ "$OUTPUT_FORMAT" == "text" ]]; then
            echo -e "${RED}⚠ Brute Force Attack:${NC} $ip ($ATTEMPT_COUNT attempts, $USER_COUNT different users)"
        fi
    fi
done

# Check for credential stuffing (multiple IPs, single user)
awk '{print $NF}' "$WORK_DIR/by_username.txt" | head -5 | while read username; do
    IP_COUNT=$(grep "user \"$username\"" "$WORK_DIR/failed_logins.txt" | grep -oP 'host=\K[^ ]+' | sort -u | wc -l)
    ATTEMPT_COUNT=$(grep "user \"$username\"" "$WORK_DIR/failed_logins.txt" | wc -l)

    if [[ $ATTEMPT_COUNT -ge 10 ]] && [[ $IP_COUNT -ge 3 ]]; then
        if [[ "$OUTPUT_FORMAT" == "text" ]]; then
            echo -e "${RED}⚠ Credential Stuffing:${NC} User '$username' ($ATTEMPT_COUNT attempts from $IP_COUNT IPs)"
        fi
    fi
done

# Check for distributed attack
UNIQUE_IPS=$(wc -l < "$WORK_DIR/by_ip.txt")
if [[ $UNIQUE_IPS -ge 10 ]] && [[ $TOTAL_FAILURES -ge 50 ]]; then
    if [[ "$OUTPUT_FORMAT" == "text" ]]; then
        echo -e "${RED}⚠ Distributed Attack:${NC} $TOTAL_FAILURES attempts from $UNIQUE_IPS unique IPs"
    fi
fi

if [[ "$OUTPUT_FORMAT" == "text" ]]; then
    echo ""
fi

# Recommendations
if [[ "$OUTPUT_FORMAT" == "text" ]]; then
    echo -e "${YELLOW}=== Recommendations ===${NC}"

    if [[ $TOTAL_FAILURES -ge 100 ]]; then
        echo "• HIGH ALERT: Excessive failed login attempts detected"
        echo "• Review fail2ban configuration and ensure it's active"
        echo "• Consider stricter rate limiting or IP whitelisting"
    elif [[ $TOTAL_FAILURES -ge 50 ]]; then
        echo "• MODERATE ALERT: Significant failed login activity"
        echo "• Monitor for continued attempts"
        echo "• Verify fail2ban is blocking repeat offenders"
    else
        echo "• Normal activity level"
        echo "• Continue regular monitoring"
    fi

    # Check top offenders
    TOP_IP_COUNT=$(head -1 "$WORK_DIR/by_ip.txt" | awk '{print $1}')
    if [[ $TOP_IP_COUNT -ge 20 ]]; then
        TOP_IP=$(head -1 "$WORK_DIR/by_ip.txt" | awk '{print $NF}')
        echo "• Consider permanently blocking IP: $TOP_IP ($TOP_IP_COUNT attempts)"
        echo "  Command: sudo ufw deny from $TOP_IP"
    fi

    echo ""
    echo -e "${BLUE}=== Additional Analysis Commands ===${NC}"
    echo "# Review full log entries for specific IP:"
    TOP_IP=$(head -1 "$WORK_DIR/by_ip.txt" | awk '{print $NF}')
    echo "  grep '$TOP_IP' $PG_LOG | tail -20"
    echo ""
    echo "# Check fail2ban status:"
    echo "  sudo fail2ban-client status postgresql"
    echo ""
    echo "# Block IP manually:"
    echo "  sudo /home/admincostplus/projects/costplusdb/001-security/scripts/incident-response/block-ip.sh <IP> 'Brute force attack'"
fi

# JSON output
if [[ "$OUTPUT_FORMAT" == "json" ]]; then
    cat > "$WORK_DIR/report.json" << EOF
{
  "analysis_period_hours": $HOURS,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "total_failures": $TOTAL_FAILURES,
  "unique_usernames": $(wc -l < "$WORK_DIR/by_username.txt"),
  "unique_ips": $(wc -l < "$WORK_DIR/by_ip.txt"),
  "top_usernames": [
EOF

    head -5 "$WORK_DIR/by_username.txt" | awk '{print "    {\"username\": \""$NF"\", \"attempts\": "$1"}"}' | paste -sd ',' >> "$WORK_DIR/report.json"

    cat >> "$WORK_DIR/report.json" << EOF
  ],
  "top_ips": [
EOF

    head -5 "$WORK_DIR/by_ip.txt" | awk '{print "    {\"ip\": \""$NF"\", \"attempts\": "$1"}"}' | paste -sd ',' >> "$WORK_DIR/report.json"

    cat >> "$WORK_DIR/report.json" << EOF
  ]
}
EOF

    cat "$WORK_DIR/report.json"
fi

# CSV output
if [[ "$OUTPUT_FORMAT" == "csv" ]]; then
    echo "timestamp,username,ip,count"
    while read count username; do
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),$username,,$count"
    done < "$WORK_DIR/by_username.txt"
fi

exit 0
