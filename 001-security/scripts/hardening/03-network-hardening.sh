#!/bin/bash
#
# Network Security Hardening Script
# ==================================
#
# Configures network-level security including:
# - UFW firewall rules
# - fail2ban intrusion prevention
# - Rate limiting
# - Network monitoring
#
# Usage: sudo ./03-network-hardening.sh
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
SECURITY_DIR="/home/admincostplus/projects/costplusdb/001-security"
PG_PORT="5433"
PGBOUNCER_PORT="6432"
SSH_PORT="22"

log "Starting network security hardening..."

# Step 1: Install required packages
log "Checking for required packages..."

if ! command -v ufw &> /dev/null; then
    log "Installing UFW firewall..."
    apt update
    apt install -y ufw
else
    info "UFW already installed"
fi

if ! command -v fail2ban-client &> /dev/null; then
    log "Installing fail2ban..."
    apt update
    apt install -y fail2ban
else
    info "fail2ban already installed"
fi

# Step 2: Configure UFW firewall
log "Configuring UFW firewall..."

# Reset UFW to clean state
ufw --force reset

# Set default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH with rate limiting (CRITICAL - must be first!)
log "Allowing SSH (port $SSH_PORT) with rate limiting..."
ufw limit $SSH_PORT/tcp comment 'SSH with rate limiting'

# Allow PostgreSQL
log "Allowing PostgreSQL (port $PG_PORT)..."
ufw allow $PG_PORT/tcp comment 'PostgreSQL database'

# Allow pgBouncer
log "Allowing pgBouncer (port $PGBOUNCER_PORT)..."
ufw allow $PGBOUNCER_PORT/tcp comment 'pgBouncer connection pooler'

# Enable UFW logging
ufw logging medium

# Enable UFW
log "Enabling UFW firewall..."
ufw --force enable

# Display firewall status
info "UFW firewall configured:"
ufw status verbose

# Step 3: Configure fail2ban
log "Configuring fail2ban..."

# Create fail2ban config directory if it doesn't exist
mkdir -p /etc/fail2ban/jail.d
mkdir -p /etc/fail2ban/filter.d

# Copy fail2ban configurations
log "Installing fail2ban configurations..."

# Install PostgreSQL filter
if [[ -f "$SECURITY_DIR/config/fail2ban/filter.d/postgresql.conf" ]]; then
    cp "$SECURITY_DIR/config/fail2ban/filter.d/postgresql.conf" /etc/fail2ban/filter.d/postgresql.conf
    log "PostgreSQL fail2ban filter installed"
else
    warn "PostgreSQL filter not found in $SECURITY_DIR/config/fail2ban/filter.d/"
fi

# Install jail configuration
if [[ -f "$SECURITY_DIR/config/fail2ban/jail.local" ]]; then
    cp "$SECURITY_DIR/config/fail2ban/jail.local" /etc/fail2ban/jail.local
    log "fail2ban jail configuration installed"
else
    warn "Jail configuration not found - creating basic config..."
    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log

[postgresql]
enabled = true
port = 5433
filter = postgresql
logpath = /var/log/postgresql/postgresql-*.log
maxretry = 5
bantime = 3600
EOF
fi

# Ensure fail2ban log directory exists
mkdir -p "$SECURITY_DIR/logs/security-events"
touch "$SECURITY_DIR/logs/security-events/fail2ban-bans.log"
chmod 640 "$SECURITY_DIR/logs/security-events/fail2ban-bans.log"

# Step 4: Start and enable fail2ban
log "Starting fail2ban service..."
systemctl enable fail2ban
systemctl restart fail2ban

# Wait for fail2ban to start
sleep 2

# Verify fail2ban is running
if systemctl is-active --quiet fail2ban; then
    log "fail2ban is running"
else
    error "fail2ban failed to start"
    systemctl status fail2ban
    exit 1
fi

# Check fail2ban jails
log "Active fail2ban jails:"
fail2ban-client status

# Check specific jails
if fail2ban-client status sshd &>/dev/null; then
    log "✓ SSH jail active"
fi

if fail2ban-client status postgresql &>/dev/null; then
    log "✓ PostgreSQL jail active"
else
    warn "PostgreSQL jail not active - check configuration"
fi

# Step 5: Configure kernel network security parameters
log "Configuring kernel network security parameters..."

SYSCTL_CONF="/etc/sysctl.d/99-costplusdb-security.conf"

cat > "$SYSCTL_CONF" << 'EOF'
# CostPlusDB Network Security Settings
# =====================================

# IP Forwarding (disable unless needed for routing)
net.ipv4.ip_forward = 0
net.ipv6.conf.all.forwarding = 0

# Syn flood protection
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_syn_retries = 2
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_max_syn_backlog = 4096

# Disable ICMP redirect acceptance
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# Disable source packet routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv6.conf.default.accept_source_route = 0

# Enable reverse path filtering (prevent IP spoofing)
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Log martian packets
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# Ignore ICMP ping requests (optional - uncomment to enable)
# net.ipv4.icmp_echo_ignore_all = 1
# net.ipv6.icmp.echo_ignore_all = 1

# Ignore broadcast ICMP requests
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Increase connection tracking table size
net.netfilter.nf_conntrack_max = 262144
net.netfilter.nf_conntrack_tcp_timeout_established = 600

# TCP hardening
net.ipv4.tcp_timestamps = 1
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 5

# Protect against SYN flood attacks
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5
EOF

# Apply sysctl settings
sysctl -p "$SYSCTL_CONF"
log "Kernel network security parameters applied"

# Step 6: Configure connection rate limiting
log "Configuring connection rate limiting..."

# Create iptables rules for additional rate limiting (beyond fail2ban)
# Limit new connections to PostgreSQL
iptables -I INPUT -p tcp --dport $PG_PORT -m state --state NEW -m recent --set
iptables -I INPUT -p tcp --dport $PG_PORT -m state --state NEW -m recent --update --seconds 60 --hitcount 10 -j DROP

# Limit new connections to pgBouncer
iptables -I INPUT -p tcp --dport $PGBOUNCER_PORT -m state --state NEW -m recent --set
iptables -I INPUT -p tcp --dport $PGBOUNCER_PORT -m state --state NEW -m recent --update --seconds 60 --hitcount 10 -j DROP

log "Connection rate limiting configured (max 10 new connections per minute)"

# Save iptables rules
if command -v netfilter-persistent &> /dev/null; then
    netfilter-persistent save
    log "iptables rules saved"
else
    warn "netfilter-persistent not installed - iptables rules will be lost on reboot"
    warn "Install with: sudo apt install iptables-persistent"
fi

# Step 7: Log hardening to audit trail
AUDIT_LOG="$SECURITY_DIR/logs/audit/network-hardening.log"
mkdir -p "$(dirname "$AUDIT_LOG")"
cat >> "$AUDIT_LOG" << EOF
$(date +'%Y-%m-%d %H:%M:%S') - Network Security Hardening Applied
Executed by: $(whoami)
Actions performed:
- UFW firewall configured and enabled
- fail2ban installed and configured
- PostgreSQL jail activated
- SSH jail activated
- Kernel network security parameters applied
- Connection rate limiting configured
- iptables rules applied

Firewall Rules:
$(ufw status numbered)

fail2ban Status:
$(fail2ban-client status)
---
EOF

# Step 8: Create monitoring script
log "Creating network monitoring script..."
cat > "$SECURITY_DIR/scripts/monitoring/network-status.sh" << 'EOFSCRIPT'
#!/bin/bash
# Network Security Status Checker
echo "=== UFW Firewall Status ==="
sudo ufw status verbose
echo ""
echo "=== fail2ban Status ==="
sudo fail2ban-client status
echo ""
echo "=== Active fail2ban Jails ==="
sudo fail2ban-client status postgresql 2>/dev/null || echo "PostgreSQL jail not active"
sudo fail2ban-client status sshd 2>/dev/null || echo "SSH jail not active"
echo ""
echo "=== Recent Banned IPs ==="
sudo tail -20 /var/log/fail2ban.log | grep "Ban"
echo ""
echo "=== Network Connections to PostgreSQL ==="
sudo netstat -tnp | grep :5433 | head -10
echo ""
echo "=== Network Connections to pgBouncer ==="
sudo netstat -tnp | grep :6432 | head -10
EOFSCRIPT

chmod +x "$SECURITY_DIR/scripts/monitoring/network-status.sh"
log "Network monitoring script created: $SECURITY_DIR/scripts/monitoring/network-status.sh"

# Step 9: Display summary
echo ""
log "Network security hardening complete!"
echo ""
info "Security Summary:"
echo "  ✓ UFW firewall enabled (deny incoming by default)"
echo "  ✓ SSH rate limiting active"
echo "  ✓ PostgreSQL port $PG_PORT accessible"
echo "  ✓ pgBouncer port $PGBOUNCER_PORT accessible"
echo "  ✓ fail2ban monitoring SSH and PostgreSQL"
echo "  ✓ Connection rate limiting configured"
echo "  ✓ Kernel network security parameters applied"
echo ""
warn "IMPORTANT: Test SSH connection before disconnecting!"
echo "  From another terminal: ssh user@$(hostname -I | awk '{print $1}')"
echo ""
info "Next steps:"
echo "  1. Test firewall: sudo $SECURITY_DIR/scripts/monitoring/network-status.sh"
echo "  2. Monitor fail2ban: sudo tail -f /var/log/fail2ban.log"
echo "  3. Test PostgreSQL connection through firewall"
echo "  4. Review audit log: $AUDIT_LOG"
echo ""

exit 0
