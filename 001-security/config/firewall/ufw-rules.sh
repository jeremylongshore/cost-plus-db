#!/bin/bash
#
# UFW Firewall Configuration for CostPlusDB
# Implements secure firewall rules with rate limiting and logging
#
# Usage: sudo ./ufw-rules.sh
#

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
   exit 1
fi

log "Starting UFW firewall configuration for CostPlusDB..."

# Reset UFW to default state
log "Resetting UFW to default state..."
ufw --force reset

# Set default policies
log "Setting default policies (deny incoming, allow outgoing)..."
ufw default deny incoming
ufw default allow outgoing

# Allow SSH with rate limiting (critical - allow before enabling UFW)
log "Configuring SSH access (port 22) with rate limiting..."
ufw limit 22/tcp comment 'SSH with rate limiting'

# Allow PostgreSQL (custom port 5433)
log "Allowing PostgreSQL connections (port 5433)..."
ufw allow 5433/tcp comment 'PostgreSQL database'

# Allow pgBouncer (port 6432)
log "Allowing pgBouncer connections (port 6432)..."
ufw allow 6432/tcp comment 'pgBouncer connection pooler'

# Allow HTTP/HTTPS (if running web services on same server)
# Uncomment if needed:
# log "Allowing HTTP/HTTPS..."
# ufw allow 80/tcp comment 'HTTP'
# ufw allow 443/tcp comment 'HTTPS'

# Enable logging
log "Enabling UFW logging (level: medium)..."
ufw logging medium

# Enable UFW
log "Enabling UFW firewall..."
ufw --force enable

# Display status
log "Firewall configuration complete. Current status:"
echo ""
ufw status verbose

# Log firewall configuration to security audit log
AUDIT_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/audit/firewall-changes.log"
mkdir -p "$(dirname "$AUDIT_LOG")"
echo "$(date +'%Y-%m-%d %H:%M:%S') - UFW firewall configured by $(whoami)" >> "$AUDIT_LOG"
ufw status numbered >> "$AUDIT_LOG"
echo "---" >> "$AUDIT_LOG"

log "Firewall rules have been applied and logged to $AUDIT_LOG"
warn "IMPORTANT: Ensure SSH access (port 22) is working before disconnecting!"

exit 0
