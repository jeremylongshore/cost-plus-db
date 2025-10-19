#!/bin/bash
#
# Backup System Security Hardening Script
# ========================================
#
# Secures the backup infrastructure including:
# - pgBackRest encryption verification
# - Backup file permissions
# - Backup retention policies
# - Restore testing automation
#
# Usage: sudo ./04-backup-hardening.sh
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
PGBACKREST_CONF="/etc/pgbackrest/pgbackrest.conf"
BACKUP_REPO="/var/lib/pgbackrest"
ENCRYPTION_KEY_DIR="/root/pgbackrest-keys"
BACKUP_LOG_DIR="/var/log/pgbackrest"

log "Starting backup system security hardening..."

# Step 1: Verify pgBackRest is installed
if ! command -v pgbackrest &> /dev/null; then
    error "pgBackRest is not installed"
    error "Install with: sudo apt install pgbackrest"
    exit 1
fi

log "pgBackRest version: $(pgbackrest version)"

# Step 2: Check pgBackRest configuration
if [[ ! -f "$PGBACKREST_CONF" ]]; then
    error "pgBackRest configuration not found: $PGBACKREST_CONF"
    error "Copy template from: $SECURITY_DIR/config/backup/pgbackrest.conf.template"
    exit 1
fi

log "pgBackRest configuration found: $PGBACKREST_CONF"

# Step 3: Verify encryption is enabled
log "Checking backup encryption..."
if grep -q "repo1-cipher-type=aes-256-cbc" "$PGBACKREST_CONF"; then
    log "✓ Backup encryption enabled (AES-256-CBC)"
else
    error "✗ Backup encryption NOT configured"
    error "Add to $PGBACKREST_CONF:"
    error "  repo1-cipher-type=aes-256-cbc"
    error "  repo1-cipher-pass=YOUR_PASSPHRASE"
    exit 1
fi

# Step 4: Verify encryption passphrase is stored securely
log "Checking encryption key storage..."
if [[ ! -d "$ENCRYPTION_KEY_DIR" ]]; then
    log "Creating encryption key directory: $ENCRYPTION_KEY_DIR"
    mkdir -p "$ENCRYPTION_KEY_DIR"
fi

# Set strict permissions on encryption key directory
chmod 700 "$ENCRYPTION_KEY_DIR"
chown root:root "$ENCRYPTION_KEY_DIR"
log "Encryption key directory permissions secured (700, root:root)"

# Check if passphrase file exists
PASSPHRASE_FILE="$ENCRYPTION_KEY_DIR/encryption-passphrase.txt"
if [[ -f "$PASSPHRASE_FILE" ]]; then
    chmod 600 "$PASSPHRASE_FILE"
    chown root:root "$PASSPHRASE_FILE"
    log "✓ Encryption passphrase file secured"
else
    warn "Encryption passphrase file not found: $PASSPHRASE_FILE"
    warn "IMPORTANT: Store your encryption passphrase securely!"
    warn "Without it, backups cannot be restored."
fi

# Step 5: Secure backup repository directory
log "Securing backup repository directory..."
if [[ -d "$BACKUP_REPO" ]]; then
    chown -R postgres:postgres "$BACKUP_REPO"
    chmod 750 "$BACKUP_REPO"
    log "✓ Backup repository permissions: 750 (postgres:postgres)"
else
    warn "Backup repository not found: $BACKUP_REPO"
    warn "It will be created on first backup"
fi

# Step 6: Secure pgBackRest configuration
log "Securing pgBackRest configuration file..."
chown postgres:postgres "$PGBACKREST_CONF"
chmod 640 "$PGBACKREST_CONF"
log "✓ Configuration file permissions: 640 (postgres:postgres)"

# Step 7: Ensure backup log directory exists and is secured
log "Securing backup log directory..."
mkdir -p "$BACKUP_LOG_DIR"
chown postgres:postgres "$BACKUP_LOG_DIR"
chmod 750 "$BACKUP_LOG_DIR"
log "✓ Backup log directory: $BACKUP_LOG_DIR (750, postgres:postgres)"

# Step 8: Test backup configuration
log "Testing backup configuration..."
if sudo -u postgres pgbackrest --stanza=main check 2>&1 | grep -q "completed successfully"; then
    log "✓ Backup configuration test passed"
else
    warn "Backup configuration test failed"
    warn "Run: sudo -u postgres pgbackrest --stanza=main check"
fi

# Step 9: Verify backup exists and is encrypted
log "Checking existing backups..."
if sudo -u postgres pgbackrest --stanza=main info > /tmp/pgbackrest_info.txt 2>&1; then
    if grep -q "cipher: aes-256-cbc" /tmp/pgbackrest_info.txt; then
        log "✓ Existing backups are encrypted"
        BACKUP_COUNT=$(grep -c "backup reference list:" /tmp/pgbackrest_info.txt || echo "0")
        log "Backup count: $BACKUP_COUNT"
    else
        warn "Existing backups are NOT encrypted"
        warn "Take a new encrypted backup: sudo -u postgres pgbackrest --stanza=main backup"
    fi
else
    info "No existing backups found (normal for new installation)"
fi
rm -f /tmp/pgbackrest_info.txt

# Step 10: Create backup verification script
log "Creating backup verification script..."
cat > "$SECURITY_DIR/scripts/maintenance/verify-backups.sh" << 'EOFSCRIPT'
#!/bin/bash
# Backup Verification Script
# Checks backup integrity and encryption status

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== pgBackRest Backup Status ==="
sudo -u postgres pgbackrest --stanza=main info

echo ""
echo "=== Backup Encryption Verification ==="
if sudo -u postgres pgbackrest --stanza=main info | grep -q "cipher: aes-256-cbc"; then
    echo -e "${GREEN}✓ Backups are encrypted (AES-256-CBC)${NC}"
else
    echo -e "${RED}✗ Backups are NOT encrypted${NC}"
    exit 1
fi

echo ""
echo "=== Backup Repository Disk Usage ==="
du -sh /var/lib/pgbackrest 2>/dev/null || echo "No local backups"

echo ""
echo "=== Recent Backup Logs ==="
ls -lth /var/log/pgbackrest/*.log 2>/dev/null | head -5 || echo "No backup logs found"

echo ""
echo "=== Last Backup Check Status ==="
sudo -u postgres pgbackrest --stanza=main check || echo "Backup check failed"
EOFSCRIPT

chmod +x "$SECURITY_DIR/scripts/maintenance/verify-backups.sh"
log "Backup verification script created"

# Step 11: Create automated restore test script
log "Creating automated restore test script..."
cat > "$SECURITY_DIR/scripts/maintenance/test-restore.sh" << 'EOFSCRIPT'
#!/bin/bash
# Automated Backup Restore Test
# Performs a test restore to verify backup integrity

set -euo pipefail

RESTORE_TEST_DIR="/tmp/pgbackrest-restore-test"
LOG_FILE="/var/log/pgbackrest/restore-test-$(date +%Y%m%d-%H%M%S).log"

echo "=== Starting Backup Restore Test ===" | tee -a "$LOG_FILE"
echo "Test directory: $RESTORE_TEST_DIR" | tee -a "$LOG_FILE"
echo "Log file: $LOG_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Clean up previous test
if [[ -d "$RESTORE_TEST_DIR" ]]; then
    echo "Cleaning up previous test directory..." | tee -a "$LOG_FILE"
    rm -rf "$RESTORE_TEST_DIR"
fi

# Create test directory
mkdir -p "$RESTORE_TEST_DIR"

# Perform restore test
echo "Performing restore test..." | tee -a "$LOG_FILE"
if sudo -u postgres pgbackrest --stanza=main --delta \
    --type=full \
    --pg1-path="$RESTORE_TEST_DIR" \
    restore >> "$LOG_FILE" 2>&1; then
    echo "✓ Restore test PASSED" | tee -a "$LOG_FILE"
    echo "Restored files:" | tee -a "$LOG_FILE"
    ls -lh "$RESTORE_TEST_DIR" | head -10 | tee -a "$LOG_FILE"
    RESULT=0
else
    echo "✗ Restore test FAILED" | tee -a "$LOG_FILE"
    echo "Check log file: $LOG_FILE"
    RESULT=1
fi

# Clean up test directory
echo "Cleaning up test directory..." | tee -a "$LOG_FILE"
rm -rf "$RESTORE_TEST_DIR"

echo "" | tee -a "$LOG_FILE"
echo "=== Restore Test Complete ===" | tee -a "$LOG_FILE"
exit $RESULT
EOFSCRIPT

chmod +x "$SECURITY_DIR/scripts/maintenance/test-restore.sh"
log "Restore test script created"

# Step 12: Create backup monitoring cron job
log "Creating backup monitoring cron job..."
CRON_FILE="/etc/cron.d/costplusdb-backup-monitor"
cat > "$CRON_FILE" << 'EOF'
# CostPlusDB Backup Monitoring
# Runs daily backup verification

# Daily backup at 2 AM
0 2 * * * postgres pgbackrest --stanza=main --type=incr backup >> /var/log/pgbackrest/cron-backup.log 2>&1

# Weekly backup verification at 3 AM on Sundays
0 3 * * 0 root /home/admincostplus/projects/costplusdb/001-security/scripts/maintenance/verify-backups.sh >> /home/admincostplus/projects/costplusdb/001-security/logs/backups/backup-verification.log 2>&1

# Monthly restore test at 4 AM on the 1st
0 4 1 * * root /home/admincostplus/projects/costplusdb/001-security/scripts/maintenance/test-restore.sh >> /home/admincostplus/projects/costplusdb/001-security/logs/backups/restore-tests.log 2>&1
EOF

chmod 644 "$CRON_FILE"
log "Backup monitoring cron jobs installed"

# Step 13: Create backup log directory structure
log "Creating backup log directory structure..."
mkdir -p "$SECURITY_DIR/logs/backups"
chown -R postgres:postgres "$SECURITY_DIR/logs/backups"
chmod 750 "$SECURITY_DIR/logs/backups"

# Step 14: Log hardening to audit trail
AUDIT_LOG="$SECURITY_DIR/logs/audit/backup-hardening.log"
mkdir -p "$(dirname "$AUDIT_LOG")"
cat >> "$AUDIT_LOG" << EOF
$(date +'%Y-%m-%d %H:%M:%S') - Backup System Security Hardening Applied
Executed by: $(whoami)
Actions performed:
- Verified pgBackRest encryption (AES-256-CBC)
- Secured encryption key directory ($ENCRYPTION_KEY_DIR)
- Secured backup repository ($BACKUP_REPO)
- Secured pgBackRest configuration ($PGBACKREST_CONF)
- Created backup verification script
- Created restore test script
- Installed backup monitoring cron jobs
- Configured backup log directories

Backup Status:
$(sudo -u postgres pgbackrest --stanza=main info 2>&1 || echo "No backups yet")
---
EOF

# Step 15: Display summary
echo ""
log "Backup system security hardening complete!"
echo ""
info "Security Summary:"
echo "  ✓ Backup encryption verified (AES-256-CBC)"
echo "  ✓ Encryption keys secured (700 permissions)"
echo "  ✓ Backup repository secured (750, postgres:postgres)"
echo "  ✓ Configuration file secured (640, postgres:postgres)"
echo "  ✓ Backup verification script created"
echo "  ✓ Restore test script created"
echo "  ✓ Automated monitoring cron jobs installed"
echo ""
warn "CRITICAL: Backup encryption passphrase"
echo "  Location: $PASSPHRASE_FILE"
echo "  MUST be stored in secure password manager"
echo "  Without it, backups CANNOT be restored"
echo ""
info "Next steps:"
echo "  1. Verify backups: $SECURITY_DIR/scripts/maintenance/verify-backups.sh"
echo "  2. Test restore: $SECURITY_DIR/scripts/maintenance/test-restore.sh"
echo "  3. Take first encrypted backup: sudo -u postgres pgbackrest --stanza=main --type=full backup"
echo "  4. Store encryption passphrase in password manager"
echo ""

exit 0
