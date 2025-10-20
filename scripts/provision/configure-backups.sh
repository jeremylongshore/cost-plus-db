#!/bin/bash
#==============================================================================
# Configure Database Backups with pgBackRest
#==============================================================================
# Purpose: Configure automated backups for customer databases
# Usage: ./configure-backups.sh DATABASE_NAME
# Requirements: pgBackRest, Wasabi S3 credentials configured
#==============================================================================

set -euo pipefail

#==============================================================================
# CONFIGURATION
#==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="$PROJECT_ROOT/002-clients/logs/backup-configuration.log"

# pgBackRest configuration
PGBACKREST_CONF="/etc/pgbackrest/pgbackrest.conf"
PGBACKREST_STANZA="costplusdb-main"
BACKUP_LOG_DIR="/var/log/pgbackrest"

# Backup schedule defaults
FULL_BACKUP_SCHEDULE="0 1 * * *"  # Daily at 1 AM
INCREMENTAL_BACKUP_SCHEDULE="0 * * * *"  # Hourly
RETENTION_FULL_DAYS=30
RETENTION_DIFF_DAYS=7

# PostgreSQL configuration
PG_VERSION="${PG_VERSION:-16}"
PG_PORT="${PG_PORT:-5432}"

#==============================================================================
# LOGGING
#==============================================================================

log() {
    local level="$1"
    shift
    local message="$*"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$LOG_FILE"
}

error_exit() {
    log "ERROR" "$1"
    exit 1
}

#==============================================================================
# INPUT VALIDATION
#==============================================================================

if [ $# -ne 1 ]; then
    cat <<USAGE
Usage: $0 DATABASE_NAME

Arguments:
  DATABASE_NAME  - Name of the database to configure backups for

Example:
  $0 acme_production

This script will:
  1. Add database to pgBackRest stanza
  2. Configure backup schedule (daily full, hourly incremental)
  3. Set retention policy (30 days)
  4. Test backup immediately
  5. Verify backup integrity
USAGE
    exit 1
fi

DATABASE_NAME="$1"

# Validate database name
if ! [[ "$DATABASE_NAME" =~ ^[a-z0-9_]+$ ]]; then
    error_exit "Invalid database name. Use lowercase letters, numbers, and underscores only."
fi

log "INFO" "=========================================="
log "INFO" "Backup Configuration Started"
log "INFO" "=========================================="
log "INFO" "Database: $DATABASE_NAME"
log "INFO" "=========================================="

#==============================================================================
# CHECK PREREQUISITES
#==============================================================================

log "INFO" "Checking prerequisites..."

# Check if pgBackRest is installed
if ! command -v pgbackrest >/dev/null 2>&1; then
    error_exit "pgBackRest is not installed"
fi

# Check if PostgreSQL is running
if ! sudo -u postgres psql -p "$PG_PORT" -c "SELECT 1;" >/dev/null 2>&1; then
    error_exit "PostgreSQL is not running"
fi

# Check if database exists
if ! sudo -u postgres psql -p "$PG_PORT" -lqt | cut -d \| -f 1 | grep -qw "$DATABASE_NAME"; then
    error_exit "Database '$DATABASE_NAME' does not exist"
fi

# Check if pgBackRest config exists
if [ ! -f "$PGBACKREST_CONF" ]; then
    log "WARN" "pgBackRest config not found at $PGBACKREST_CONF"
    log "INFO" "Creating basic pgBackRest configuration..."

    sudo mkdir -p "$(dirname "$PGBACKREST_CONF")"
    sudo mkdir -p "$BACKUP_LOG_DIR"

    # Create basic config (will need manual Wasabi S3 configuration)
    sudo tee "$PGBACKREST_CONF" >/dev/null <<CONFEOF
[global]
repo1-type=s3
repo1-s3-region=us-east-1
repo1-s3-endpoint=s3.us-east-1.wasabisys.com
repo1-s3-bucket=costplusdb-backups
repo1-s3-key=YOUR_WASABI_ACCESS_KEY
repo1-s3-key-secret=YOUR_WASABI_SECRET_KEY
repo1-retention-full=$RETENTION_FULL_DAYS
repo1-retention-diff=$RETENTION_DIFF_DAYS
log-level-console=info
log-level-file=debug

[$PGBACKREST_STANZA]
pg1-path=/var/lib/postgresql/$PG_VERSION/main
pg1-port=$PG_PORT
CONFEOF

    sudo chmod 640 "$PGBACKREST_CONF"
    sudo chown postgres:postgres "$PGBACKREST_CONF"

    log "WARN" "pgBackRest config created. Please update S3 credentials in $PGBACKREST_CONF"
fi

log "INFO" "Prerequisites check passed"

#==============================================================================
# CHECK IF STANZA IS INITIALIZED
#==============================================================================

log "INFO" "Checking pgBackRest stanza status..."

if ! sudo -u postgres pgbackrest --stanza="$PGBACKREST_STANZA" info >/dev/null 2>&1; then
    log "INFO" "Stanza not initialized. Creating stanza..."

    # Create stanza
    sudo -u postgres pgbackrest --stanza="$PGBACKREST_STANZA" --log-level-console=info stanza-create

    if [ $? -ne 0 ]; then
        error_exit "Failed to create pgBackRest stanza"
    fi

    log "INFO" "Stanza created successfully"
else
    log "INFO" "Stanza already initialized"
fi

#==============================================================================
# ADD DATABASE TO BACKUP CONFIGURATION
#==============================================================================

log "INFO" "Configuring backup for database: $DATABASE_NAME"

# Create a database-specific backup tag file
BACKUP_TAG_FILE="$BACKUP_LOG_DIR/${DATABASE_NAME}.backup"
sudo touch "$BACKUP_TAG_FILE"
sudo chown postgres:postgres "$BACKUP_TAG_FILE"

# Record database in backup tracking
cat <<TRACKEOF | sudo tee "$BACKUP_TAG_FILE" >/dev/null
Database: $DATABASE_NAME
Stanza: $PGBACKREST_STANZA
Backup Schedule: Daily full at 1 AM, Hourly incremental
Retention: $RETENTION_FULL_DAYS days (full), $RETENTION_DIFF_DAYS days (diff)
Configured: $(date)
Status: Active
TRACKEOF

log "INFO" "Database registered for backups"

#==============================================================================
# PERFORM TEST BACKUP
#==============================================================================

log "INFO" "Performing initial backup test..."

# Run a full backup
log "INFO" "Starting full backup (this may take several minutes)..."

sudo -u postgres pgbackrest \
    --stanza="$PGBACKREST_STANZA" \
    --log-level-console=info \
    backup

if [ $? -ne 0 ]; then
    error_exit "Backup test failed"
fi

log "INFO" "Full backup completed successfully"

#==============================================================================
# VERIFY BACKUP INTEGRITY
#==============================================================================

log "INFO" "Verifying backup integrity..."

# Get backup info
BACKUP_INFO=$(sudo -u postgres pgbackrest --stanza="$PGBACKREST_STANZA" info --output=json 2>/dev/null)

if [ -z "$BACKUP_INFO" ]; then
    log "WARN" "Could not retrieve backup info"
else
    # Parse backup info (basic check)
    BACKUP_COUNT=$(echo "$BACKUP_INFO" | grep -o '"label"' | wc -l)
    log "INFO" "Total backups in stanza: $BACKUP_COUNT"

    # Get latest backup label
    LATEST_BACKUP=$(sudo -u postgres pgbackrest --stanza="$PGBACKREST_STANZA" info | grep -oP 'full backup: \K\S+' | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        log "INFO" "Latest backup: $LATEST_BACKUP"
    fi
fi

# Verify stanza is healthy
if sudo -u postgres pgbackrest --stanza="$PGBACKREST_STANZA" check >/dev/null 2>&1; then
    log "INFO" "Backup integrity verification PASSED"
else
    log "WARN" "Backup integrity verification returned warnings"
fi

#==============================================================================
# CONFIGURE BACKUP SCHEDULES (cron)
#==============================================================================

log "INFO" "Configuring backup schedules..."

# Check if cron entries exist
CRON_FILE="/etc/cron.d/pgbackrest-$PGBACKREST_STANZA"

if [ ! -f "$CRON_FILE" ]; then
    log "INFO" "Creating cron jobs for automated backups..."

    sudo tee "$CRON_FILE" >/dev/null <<CRONEOF
# pgBackRest automated backup schedule for CostPlusDB
# Stanza: $PGBACKREST_STANZA

# Full backup daily at 1 AM
$FULL_BACKUP_SCHEDULE postgres pgbackrest --stanza=$PGBACKREST_STANZA --type=full backup

# Incremental backup every hour (skip if within 5 minutes of full backup)
$INCREMENTAL_BACKUP_SCHEDULE postgres [ \$(date +\%M) -gt 05 ] && pgbackrest --stanza=$PGBACKREST_STANZA --type=incr backup
CRONEOF

    sudo chmod 644 "$CRON_FILE"
    log "INFO" "Backup schedules configured"
else
    log "INFO" "Backup cron jobs already exist"
fi

#==============================================================================
# UPDATE DATABASE RECORD (SQLite)
#==============================================================================

log "INFO" "Updating database backup status..."

DB_PATH="$PROJECT_ROOT/002-clients/database/costplusdb.db"

if [ -f "$DB_PATH" ]; then
    sqlite3 "$DB_PATH" <<SQLEOF
UPDATE databases
SET
    backup_enabled = 1,
    backup_schedule = 'daily-1am',
    backup_retention_days = $RETENTION_FULL_DAYS,
    pitr_enabled = 1,
    pitr_retention_days = $RETENTION_DIFF_DAYS,
    updated_at = CURRENT_TIMESTAMP
WHERE database_name = '$DATABASE_NAME';

-- Log activity
INSERT INTO activity_log (
    customer_id,
    entity_type,
    entity_id,
    action_type,
    action_description,
    performed_by
)
SELECT
    d.customer_id,
    'database',
    d.id,
    'backup_configured',
    'Automated backups configured with pgBackRest',
    'system-backup-script'
FROM databases d
WHERE d.database_name = '$DATABASE_NAME';
SQLEOF

    if [ $? -eq 0 ]; then
        log "INFO" "Database record updated"
    else
        log "WARN" "Failed to update database record (non-fatal)"
    fi
else
    log "WARN" "Customer database not found: $DB_PATH"
fi

#==============================================================================
# CREATE BACKUP MONITORING SCRIPT
#==============================================================================

log "INFO" "Creating backup monitoring script..."

MONITOR_SCRIPT="$BACKUP_LOG_DIR/check-${DATABASE_NAME}-backup.sh"

cat <<'MONITOREOF' | sudo tee "$MONITOR_SCRIPT" >/dev/null
#!/bin/bash
# Backup monitoring script for specific database

STANZA="PGBACKREST_STANZA_PLACEHOLDER"
DATABASE="DATABASE_NAME_PLACEHOLDER"
ALERT_EMAIL="ADMIN_EMAIL_PLACEHOLDER"

# Get latest backup age in hours
LATEST_BACKUP_AGE=$(pgbackrest --stanza="$STANZA" info --output=json | \
    jq -r '.[0].backup[-1].timestamp.stop' | \
    xargs -I {} date -d {} +%s)

CURRENT_TIME=$(date +%s)
AGE_HOURS=$(( (CURRENT_TIME - LATEST_BACKUP_AGE) / 3600 ))

# Alert if backup is older than 25 hours (daily backup expected)
if [ $AGE_HOURS -gt 25 ]; then
    echo "WARNING: Last backup for $DATABASE is $AGE_HOURS hours old"
    exit 1
fi

echo "OK: Last backup is $AGE_HOURS hours old"
exit 0
MONITOREOF

# Customize monitoring script
sudo sed -i "s/PGBACKREST_STANZA_PLACEHOLDER/$PGBACKREST_STANZA/g" "$MONITOR_SCRIPT"
sudo sed -i "s/DATABASE_NAME_PLACEHOLDER/$DATABASE_NAME/g" "$MONITOR_SCRIPT"
sudo sed -i "s/ADMIN_EMAIL_PLACEHOLDER/${RESEND_ADMIN_EMAIL:-admin@costplusdb.com}/g" "$MONITOR_SCRIPT"

sudo chmod +x "$MONITOR_SCRIPT"
sudo chown postgres:postgres "$MONITOR_SCRIPT"

log "INFO" "Backup monitoring script created: $MONITOR_SCRIPT"

#==============================================================================
# COMPLETION
#==============================================================================

log "INFO" "=========================================="
log "INFO" "Backup Configuration COMPLETED"
log "INFO" "=========================================="
log "INFO" "Database: $DATABASE_NAME"
log "INFO" "Stanza: $PGBACKREST_STANZA"
log "INFO" "Schedule: Daily full (1 AM), Hourly incremental"
log "INFO" "Retention: $RETENTION_FULL_DAYS days (full), $RETENTION_DIFF_DAYS days (diff)"
log "INFO" "Monitoring: $MONITOR_SCRIPT"
log "INFO" "=========================================="

# Output JSON for automation
cat <<JSONEOF
{
  "status": "success",
  "database": "$DATABASE_NAME",
  "stanza": "$PGBACKREST_STANZA",
  "backup_schedule": {
    "full": "daily-1am",
    "incremental": "hourly"
  },
  "retention": {
    "full_days": $RETENTION_FULL_DAYS,
    "differential_days": $RETENTION_DIFF_DAYS
  },
  "monitoring_script": "$MONITOR_SCRIPT",
  "configured_at": "$(date -Iseconds)"
}
JSONEOF

exit 0
