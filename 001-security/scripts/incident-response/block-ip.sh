#!/bin/bash
#
# Emergency IP Blocking Script
# ============================
#
# Immediately blocks an IP address from accessing CostPlusDB services
# Uses UFW and fail2ban to block the IP at firewall and application level
#
# Usage: sudo ./block-ip.sh <ip_address> <reason>
#

set -euo pipefail

# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

alert() {
    echo -e "${RED}[ALERT]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
   exit 1
fi

# Check arguments
if [[ $# -lt 2 ]]; then
    error "Usage: $0 <ip_address> <reason>"
    error "Example: $0 192.168.1.100 'Brute force attack detected'"
    exit 1
fi

IP_ADDRESS="$1"
REASON="$2"
INCIDENT_ID="BLOCK-$(date +%Y%m%d-%H%M%S)"
SECURITY_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/security-events/ip-blocks.log"

# Validate IP address format
if ! [[ $IP_ADDRESS =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
    error "Invalid IP address format: $IP_ADDRESS"
    exit 1
fi

alert "EMERGENCY IP BLOCKING"
alert "IP Address: $IP_ADDRESS"
alert "Reason: $REASON"
alert "Incident ID: $INCIDENT_ID"
echo ""

# Create log directory
mkdir -p "$(dirname "$SECURITY_LOG")"

# Log the block action
cat >> "$SECURITY_LOG" << EOF
================================================================================
IP BLOCK: $INCIDENT_ID
Time: $(date +'%Y-%m-%d %H:%M:%S')
IP Address: $IP_ADDRESS
Reason: $REASON
Executed by: $(whoami)
================================================================================
EOF

# Step 1: Block with UFW
log "Step 1: Blocking IP in UFW firewall..."
if ufw status | grep -q "$IP_ADDRESS"; then
    warn "IP already blocked in UFW"
else
    ufw deny from "$IP_ADDRESS" comment "BLOCKED: $REASON"
    log "✓ IP blocked in UFW"
fi

# Step 2: Add to fail2ban PostgreSQL jail
log "Step 2: Banning IP in fail2ban (PostgreSQL jail)..."
if fail2ban-client status postgresql &>/dev/null; then
    fail2ban-client set postgresql banip "$IP_ADDRESS"
    log "✓ IP banned in PostgreSQL jail"
else
    warn "PostgreSQL jail not active"
fi

# Step 3: Add to fail2ban SSH jail
log "Step 3: Banning IP in fail2ban (SSH jail)..."
if fail2ban-client status sshd &>/dev/null; then
    fail2ban-client set sshd banip "$IP_ADDRESS"
    log "✓ IP banned in SSH jail"
else
    warn "SSH jail not active"
fi

# Step 4: Terminate existing PostgreSQL connections from this IP
log "Step 4: Terminating existing PostgreSQL connections from $IP_ADDRESS..."
TERMINATED=$(sudo -u postgres psql -p 5433 -t -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE client_addr = '$IP_ADDRESS'::inet;
" 2>/dev/null | grep -c "t" || echo "0")

if [[ $TERMINATED -gt 0 ]]; then
    log "✓ Terminated $TERMINATED connections"
else
    log "No active connections to terminate"
fi

# Step 5: Check for SSH connections
log "Step 5: Checking for SSH connections from $IP_ADDRESS..."
SSH_CONNS=$(ss -tn state established | grep -c "$IP_ADDRESS" || echo "0")
if [[ $SSH_CONNS -gt 0 ]]; then
    warn "$SSH_CONNS SSH connections detected from blocked IP"
    warn "Consider killing SSH sessions manually if suspicious"
fi

# Step 6: Create incident report
INCIDENT_REPORT="/home/admincostplus/projects/costplusdb/001-security/compliance/reports/${INCIDENT_ID}-report.md"
mkdir -p "$(dirname "$INCIDENT_REPORT")"

cat > "$INCIDENT_REPORT" << EOF
# IP Blocking Incident Report

**Incident ID:** $INCIDENT_ID
**Date/Time:** $(date +'%Y-%m-%d %H:%M:%S')
**Severity:** HIGH
**Status:** IP Blocked

## Incident Details

- **IP Address:** $IP_ADDRESS
- **Reason:** $REASON
- **Executed By:** $(whoami)
- **PostgreSQL Connections Terminated:** $TERMINATED
- **SSH Connections Detected:** $SSH_CONNS

## Actions Taken

1. Blocked IP in UFW firewall
2. Banned IP in fail2ban PostgreSQL jail
3. Banned IP in fail2ban SSH jail
4. Terminated existing PostgreSQL connections
5. Generated incident report

## Blocking Status

### UFW Status
\`\`\`
$(ufw status | grep "$IP_ADDRESS" || echo "Not found in UFW")
\`\`\`

### fail2ban PostgreSQL Jail
\`\`\`
$(fail2ban-client status postgresql 2>/dev/null | grep -A 5 "Banned IP" || echo "Jail not active")
\`\`\`

## Investigation

### Recent Activity from IP

Check PostgreSQL logs:
\`\`\`bash
sudo grep "$IP_ADDRESS" /var/log/postgresql/postgresql-16-main.log | tail -20
\`\`\`

Check auth logs:
\`\`\`bash
sudo grep "$IP_ADDRESS" /var/log/auth.log | tail -20
\`\`\`

### Whois Information
\`\`\`
$(whois "$IP_ADDRESS" 2>/dev/null | head -20 || echo "Whois lookup failed")
\`\`\`

## Next Steps

1. **Investigation:**
   - Review logs for activity from this IP
   - Determine attack vector
   - Check for data exfiltration

2. **Documentation:**
   - Update incident report with findings
   - Document attack patterns

3. **Remediation:**
   - Apply security patches if vulnerability found
   - Update firewall rules if needed
   - Consider permanent block

4. **Unblocking (if needed):**
   \`\`\`bash
   # UFW unblock
   sudo ufw delete deny from $IP_ADDRESS

   # fail2ban unblock
   sudo fail2ban-client set postgresql unbanip $IP_ADDRESS
   sudo fail2ban-client set sshd unbanip $IP_ADDRESS
   \`\`\`

## Contact

- **Security Team:** security@costplusdb.com
- **On-Call:** +1-XXX-XXX-XXXX

---
*This is an automated incident report. Update manually as investigation proceeds.*
EOF

# Log to audit trail
AUDIT_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/audit/ip-blocks.log"
mkdir -p "$(dirname "$AUDIT_LOG")"
cat >> "$AUDIT_LOG" << EOF
$(date +'%Y-%m-%d %H:%M:%S') - IP Blocked: $IP_ADDRESS
Incident ID: $INCIDENT_ID
Reason: $REASON
PostgreSQL connections terminated: $TERMINATED
Report: $INCIDENT_REPORT
---
EOF

# Display summary
echo ""
alert "IP BLOCKING COMPLETE"
echo ""
log "Incident ID: $INCIDENT_ID"
log "IP Address: $IP_ADDRESS (BLOCKED)"
log "UFW: Blocked"
log "fail2ban: Banned in all jails"
log "PostgreSQL connections: $TERMINATED terminated"
log "Incident report: $INCIDENT_REPORT"
echo ""
warn "Next steps:"
warn "1. Review incident report: $INCIDENT_REPORT"
warn "2. Check logs for activity: sudo grep '$IP_ADDRESS' /var/log/postgresql/*.log"
warn "3. Investigate attack pattern"
warn "4. Consider permanent block if malicious"
echo ""

exit 0
