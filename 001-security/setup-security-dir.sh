#!/bin/bash
#
# CostPlusDB Security Directory Setup Script
# ===========================================
#
# Initializes and configures the complete security directory structure
# Sets up permissions, creates necessary files, and prepares the environment
#
# Usage: sudo ./setup-security-dir.sh
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
PROJECT_DIR="/home/admincostplus/projects/costplusdb"
SECURITY_DIR="$PROJECT_DIR/001-security"
SECURITY_USER="admincostplus"
SECURITY_GROUP="costplusdb"

log "Starting CostPlusDB security directory setup..."
echo ""

# Step 1: Create security group if not exists
if ! getent group "$SECURITY_GROUP" > /dev/null 2>&1; then
    log "Creating security group: $SECURITY_GROUP"
    groupadd "$SECURITY_GROUP"
else
    info "Security group already exists: $SECURITY_GROUP"
fi

# Step 2: Add users to security group
log "Adding users to security group..."
usermod -aG "$SECURITY_GROUP" "$SECURITY_USER" 2>/dev/null || warn "User $SECURITY_USER not found"
usermod -aG "$SECURITY_GROUP" postgres 2>/dev/null || warn "User postgres not found"

# Step 3: Verify directory structure
log "Verifying directory structure..."
cd "$SECURITY_DIR"

REQUIRED_DIRS=(
    "alerts/rules"
    "alerts/scripts"
    "alerts/templates/email-templates"
    "alerts/templates/slack-templates"
    "audits"
    "backups/daily"
    "backups/weekly"
    "backups/monthly"
    "compliance/agreements"
    "compliance/checklists"
    "compliance/policies"
    "compliance/reports"
    "config/backup"
    "config/fail2ban/filter.d"
    "config/firewall"
    "config/pgbouncer"
    "config/postgresql"
    "config/ssl"
    "customer-security/customers"
    "customer-security/templates"
    "documentation/architecture"
    "documentation/external"
    "documentation/procedures"
    "documentation/training"
    "implementation"
    "keys/api-tokens"
    "keys/backup-encryption"
    "keys/ssl-ca"
    "logs/access"
    "logs/alerts"
    "logs/audit"
    "logs/backups"
    "logs/security-events"
    "procedures"
    "runbooks"
    "scans/penetration-tests"
    "scans/port-scans"
    "scans/ssl-scans"
    "scans/vulnerability-scans"
    "scripts/compliance"
    "scripts/hardening"
    "scripts/incident-response"
    "scripts/maintenance"
    "scripts/monitoring"
    "scripts/provisioning"
    "tools/encryption"
    "tools/log-analyzers"
    "tools/password-generator"
    "tools/validators"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [[ ! -d "$SECURITY_DIR/$dir" ]]; then
        mkdir -p "$SECURITY_DIR/$dir"
        log "Created directory: $dir"
    fi
done

# Step 4: Create .gitkeep files in empty log directories
log "Creating .gitkeep files for empty directories..."
find "$SECURITY_DIR/logs" -type d -empty -exec touch {}/.gitkeep \;
find "$SECURITY_DIR/backups" -type d -empty -exec touch {}/.gitkeep \;
find "$SECURITY_DIR/scans" -type d -empty -exec touch {}/.gitkeep \;

# Step 5: Set ownership and permissions
log "Setting ownership and permissions..."

# Root directory
chown -R "$SECURITY_USER:$SECURITY_GROUP" "$SECURITY_DIR"
chmod 750 "$SECURITY_DIR"

# Keys directory - highly restricted
chmod 700 "$SECURITY_DIR/keys"
find "$SECURITY_DIR/keys" -type d -exec chmod 700 {} \;
find "$SECURITY_DIR/keys" -type f -exec chmod 600 {} \;

# Logs directory - group readable
find "$SECURITY_DIR/logs" -type d -exec chmod 750 {} \;
find "$SECURITY_DIR/logs" -type f -exec chmod 640 {} \; 2>/dev/null || true

# Scripts directory - executable
find "$SECURITY_DIR/scripts" -type d -exec chmod 750 {} \;
find "$SECURITY_DIR/scripts" -type f -name "*.sh" -exec chmod 750 {} \;
find "$SECURITY_DIR/scripts" -type f -name "*.py" -exec chmod 750 {} \;

# Tools directory - executable
find "$SECURITY_DIR/tools" -type d -exec chmod 750 {} \;
find "$SECURITY_DIR/tools" -type f -name "*.sh" -exec chmod 750 {} \;
find "$SECURITY_DIR/tools" -type f -name "*.py" -exec chmod 750 {} \;

# Config directory - readable
find "$SECURITY_DIR/config" -type d -exec chmod 750 {} \;
find "$SECURITY_DIR/config" -type f -exec chmod 640 {} \;
find "$SECURITY_DIR/config" -type f -name "*.sh" -exec chmod 750 {} \;

# Alert scripts - executable
find "$SECURITY_DIR/alerts/scripts" -type f -name "*.sh" -exec chmod 750 {} \;

# Documentation - readable
find "$SECURITY_DIR/documentation" -type d -exec chmod 750 {} \;
find "$SECURITY_DIR/documentation" -type f -exec chmod 640 {} \;

# Runbooks - readable
find "$SECURITY_DIR/runbooks" -type d -exec chmod 750 {} \;
find "$SECURITY_DIR/runbooks" -type f -exec chmod 640 {} \;

# Step 6: Create initial audit log
log "Creating initial audit log..."
AUDIT_LOG="$SECURITY_DIR/logs/audit/setup.log"
mkdir -p "$(dirname "$AUDIT_LOG")"
cat > "$AUDIT_LOG" << EOF
$(date +'%Y-%m-%d %H:%M:%S') - Security Directory Setup
Executed by: $(whoami)
Security directory: $SECURITY_DIR
Security group: $SECURITY_GROUP
Actions performed:
- Verified directory structure
- Set ownership to $SECURITY_USER:$SECURITY_GROUP
- Configured permissions (directories: 750, files: 640, scripts: 750)
- Created audit log
---
EOF

# Step 7: Verify critical files exist
log "Verifying critical files..."

CRITICAL_FILES=(
    "README.md"
    "config/firewall/ufw-rules.sh"
    "config/ssl/generate-cert.sh"
    "config/fail2ban/jail.local"
    "config/postgresql/postgresql-security.conf"
    "scripts/hardening/01-initial-setup.sh"
    "scripts/monitoring/check-failed-logins.sh"
    "scripts/incident-response/isolate-customer-db.sh"
    "tools/password-generator/generate-secure-password.py"
)

MISSING_FILES=()
for file in "${CRITICAL_FILES[@]}"; do
    if [[ ! -f "$SECURITY_DIR/$file" ]]; then
        MISSING_FILES+=("$file")
        warn "Missing critical file: $file"
    fi
done

if [[ ${#MISSING_FILES[@]} -eq 0 ]]; then
    log "✓ All critical files present"
else
    error "Missing ${#MISSING_FILES[@]} critical files"
    for file in "${MISSING_FILES[@]}"; do
        echo "  - $file"
    done
fi

# Step 8: Create security status file
log "Creating security status file..."
STATUS_FILE="$SECURITY_DIR/.security-status"
cat > "$STATUS_FILE" << EOF
CostPlusDB Security Directory Status
====================================
Last setup: $(date +'%Y-%m-%d %H:%M:%S')
Setup version: 1.0.0
Security directory: $SECURITY_DIR
Owner: $SECURITY_USER:$SECURITY_GROUP

Directory Structure: COMPLETE
File Permissions: SET
Critical Files: ${#MISSING_FILES[@]} missing

Next Steps:
1. Review and customize configuration templates
2. Run hardening scripts
3. Configure monitoring
4. Test incident response procedures

Run validation:
  sudo $SECURITY_DIR/tools/validators/validate-security-setup.sh
EOF

# Step 9: Create quick reference guide
log "Creating quick reference guide..."
cat > "$SECURITY_DIR/QUICK-START.md" << 'EOF'
# CostPlusDB Security Directory Quick Start

## Directory Structure

```
001-security/
├── alerts/          Alert rules and templates
├── config/          Configuration templates
├── scripts/         Operational scripts
│   ├── hardening/   System hardening scripts
│   ├── monitoring/  Security monitoring
│   └── incident-response/ Emergency response
├── tools/           Security utilities
├── runbooks/        Incident response procedures
├── documentation/   Security documentation
└── logs/           Security logs and audit trails
```

## Quick Commands

### Setup and Hardening
```bash
# 1. Initial system setup
sudo ./scripts/hardening/01-initial-setup.sh

# 2. PostgreSQL hardening
sudo ./scripts/hardening/02-postgresql-hardening.sh

# 3. Network hardening (firewall + fail2ban)
sudo ./scripts/hardening/03-network-hardening.sh

# 4. Backup system hardening
sudo ./scripts/hardening/04-backup-hardening.sh
```

### Daily Operations
```bash
# Check security events
./scripts/monitoring/check-security-events.sh 24

# Monitor failed logins
./scripts/monitoring/check-failed-logins.sh

# Check SSL certificate expiry
./scripts/monitoring/check-ssl-expiry.sh

# Analyze resource usage
./scripts/monitoring/check-resource-usage.sh
```

### Emergency Response
```bash
# Isolate compromised database
sudo ./scripts/incident-response/isolate-customer-db.sh <db_name> "reason"

# Block malicious IP
sudo ./scripts/incident-response/block-ip.sh <ip_address> "reason"

# Emergency database restore
sudo ./scripts/incident-response/restore-customer-db.sh <db_name>
```

### Security Tools
```bash
# Generate secure password
./tools/password-generator/generate-secure-password.py 32

# Validate PostgreSQL configuration
sudo ./tools/validators/validate-postgresql-config.sh

# Analyze failed login attempts
./tools/log-analyzers/analyze-failed-logins.sh 24 text
```

## Configuration Files

### Firewall (UFW)
```bash
sudo ./config/firewall/ufw-rules.sh
```

### SSL Certificates
```bash
sudo ./config/ssl/generate-cert.sh
```

### fail2ban
```bash
sudo cp config/fail2ban/jail.local /etc/fail2ban/jail.local
sudo cp config/fail2ban/filter.d/postgresql.conf /etc/fail2ban/filter.d/
sudo systemctl restart fail2ban
```

### PostgreSQL Security
Add to `/etc/postgresql/16/main/postgresql.conf`:
```
include = '/home/admincostplus/projects/costplusdb/001-security/config/postgresql/postgresql-security.conf'
```

## Documentation

- **Runbooks:** `runbooks/` - Incident response procedures
- **Policies:** `compliance/policies/` - Security policies
- **Audit Reports:** `audits/` - Security audit documentation

## Logging

All security events logged to:
- `/001-security/logs/security-events/` - Security incidents
- `/001-security/logs/audit/` - Audit trail
- `/001-security/logs/alerts/` - Alert history

## Getting Help

- Security documentation: `documentation/`
- Runbook index: `runbooks/`
- Main README: `README.md`
EOF

# Step 10: Display summary
echo ""
log "Security directory setup complete!"
echo ""
info "Summary:"
echo "  Directory: $SECURITY_DIR"
echo "  Owner: $SECURITY_USER:$SECURITY_GROUP"
echo "  Directories created: ${#REQUIRED_DIRS[@]}"
echo "  Permissions configured: ✓"
echo "  Critical files missing: ${#MISSING_FILES[@]}"
echo ""
warn "Next steps:"
echo "  1. Review security status: cat $STATUS_FILE"
echo "  2. Read quick start guide: cat $SECURITY_DIR/QUICK-START.md"
echo "  3. Customize configuration templates in config/"
echo "  4. Run hardening scripts in sequence"
echo "  5. Test monitoring and incident response procedures"
echo ""
info "Documentation:"
echo "  Quick start: $SECURITY_DIR/QUICK-START.md"
echo "  Main README: $SECURITY_DIR/README.md"
echo "  Audit log: $AUDIT_LOG"
echo ""

exit 0
