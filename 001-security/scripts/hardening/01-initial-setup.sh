#!/bin/bash
#
# CostPlusDB System Hardening - Initial Setup
# ===========================================
#
# This script performs initial system hardening steps including:
# - User and group creation
# - Directory permission setup
# - Basic security configuration
# - Audit logging initialization
#
# Usage: sudo ./01-initial-setup.sh
#

set -euo pipefail

# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
   exit 1
fi

# Configuration
COSTPLUS_USER="costplusdb"
COSTPLUS_GROUP="costplusdb"
PROJECT_DIR="/home/admincostplus/projects/costplusdb"
SECURITY_DIR="${PROJECT_DIR}/001-security"

log "Starting CostPlusDB system hardening..."

# Step 1: Create costplusdb group
if getent group "$COSTPLUS_GROUP" > /dev/null 2>&1; then
    info "Group '$COSTPLUS_GROUP' already exists"
else
    log "Creating group: $COSTPLUS_GROUP"
    groupadd "$COSTPLUS_GROUP"
fi

# Step 2: Create costplusdb user (if not exists)
if id "$COSTPLUS_USER" > /dev/null 2>&1; then
    info "User '$COSTPLUS_USER' already exists"
else
    log "Creating user: $COSTPLUS_USER"
    useradd -r -g "$COSTPLUS_GROUP" -s /bin/bash -d /var/lib/costplusdb -m "$COSTPLUS_USER"
    warn "User '$COSTPLUS_USER' created. Set password with: passwd $COSTPLUS_USER"
fi

# Step 3: Add postgres user to costplusdb group
if id -nG postgres | grep -qw "$COSTPLUS_GROUP"; then
    info "User 'postgres' already in group '$COSTPLUS_GROUP'"
else
    log "Adding postgres user to $COSTPLUS_GROUP group"
    usermod -aG "$COSTPLUS_GROUP" postgres
fi

# Step 4: Add admincostplus to costplusdb group
if id -nG admincostplus | grep -qw "$COSTPLUS_GROUP"; then
    info "User 'admincostplus' already in group '$COSTPLUS_GROUP'"
else
    log "Adding admincostplus user to $COSTPLUS_GROUP group"
    usermod -aG "$COSTPLUS_GROUP" admincostplus
fi

# Step 5: Set up directory permissions
log "Setting up security directory permissions..."

# Ensure security directory exists
mkdir -p "$SECURITY_DIR"

# Set ownership and permissions
chown -R admincostplus:costplusdb "$SECURITY_DIR"
chmod 750 "$SECURITY_DIR"

# Secure sensitive directories
log "Securing sensitive directories..."

# Keys directory - highly restricted
if [[ -d "$SECURITY_DIR/keys" ]]; then
    chmod 700 "$SECURITY_DIR/keys"
    chown -R admincostplus:costplusdb "$SECURITY_DIR/keys"
fi

# Logs directory - group readable
if [[ -d "$SECURITY_DIR/logs" ]]; then
    chmod 750 "$SECURITY_DIR/logs"
    find "$SECURITY_DIR/logs" -type d -exec chmod 750 {} \;
    find "$SECURITY_DIR/logs" -type f -exec chmod 640 {} \;
fi

# Scripts directory - executable
if [[ -d "$SECURITY_DIR/scripts" ]]; then
    chmod 750 "$SECURITY_DIR/scripts"
    find "$SECURITY_DIR/scripts" -type f -name "*.sh" -exec chmod 750 {} \;
    find "$SECURITY_DIR/scripts" -type f -name "*.py" -exec chmod 750 {} \;
fi

# Config directory - readable
if [[ -d "$SECURITY_DIR/config" ]]; then
    chmod 750 "$SECURITY_DIR/config"
    find "$SECURITY_DIR/config" -type d -exec chmod 750 {} \;
    find "$SECURITY_DIR/config" -type f -exec chmod 640 {} \;
    # Make config scripts executable
    find "$SECURITY_DIR/config" -type f -name "*.sh" -exec chmod 750 {} \;
fi

# Step 6: Initialize audit logging
log "Initializing audit logging..."

AUDIT_LOG="$SECURITY_DIR/logs/audit/system-hardening.log"
mkdir -p "$(dirname "$AUDIT_LOG")"

cat >> "$AUDIT_LOG" << EOF
$(date +'%Y-%m-%d %H:%M:%S') - System Hardening Initiated
Executed by: $(whoami)
Hostname: $(hostname)
Actions performed:
- Created/verified group: $COSTPLUS_GROUP
- Created/verified user: $COSTPLUS_USER
- Configured directory permissions
- Added users to security group
---
EOF

# Step 7: Configure system security settings
log "Configuring system security settings..."

# Disable root login via SSH (if sshd_config exists)
if [[ -f /etc/ssh/sshd_config ]]; then
    if grep -q "^PermitRootLogin" /etc/ssh/sshd_config; then
        info "SSH root login already configured"
    else
        warn "Consider disabling root login: Add 'PermitRootLogin no' to /etc/ssh/sshd_config"
    fi
fi

# Step 8: Create security status file
STATUS_FILE="$SECURITY_DIR/.security-status"
cat > "$STATUS_FILE" << EOF
CostPlusDB Security Status
==========================
Last hardening run: $(date +'%Y-%m-%d %H:%M:%S')
Hardening version: 1.0.0
User: $COSTPLUS_USER
Group: $COSTPLUS_GROUP
Status: INITIALIZED

Completed Steps:
[x] User/group creation
[x] Directory permissions
[x] Audit logging
[ ] Firewall configuration (run config/firewall/ufw-rules.sh)
[ ] SSL certificates (run config/ssl/generate-cert.sh)
[ ] Fail2ban setup (copy config/fail2ban/jail.local to /etc/fail2ban/)
[ ] PostgreSQL hardening (apply config/postgresql/postgresql-security.conf)
EOF

log "Security status written to: $STATUS_FILE"

# Step 9: Display summary
echo ""
log "System hardening complete!"
echo ""
info "Summary:"
echo "  - Group created: $COSTPLUS_GROUP"
echo "  - User created: $COSTPLUS_USER"
echo "  - Security directory: $SECURITY_DIR"
echo "  - Audit log: $AUDIT_LOG"
echo ""
warn "Next steps:"
echo "  1. Run firewall configuration: sudo $SECURITY_DIR/config/firewall/ufw-rules.sh"
echo "  2. Generate SSL certificates: sudo $SECURITY_DIR/config/ssl/generate-cert.sh"
echo "  3. Install fail2ban config: sudo cp $SECURITY_DIR/config/fail2ban/jail.local /etc/fail2ban/"
echo "  4. Apply PostgreSQL security: Include postgresql-security.conf in postgresql.conf"
echo ""

exit 0
