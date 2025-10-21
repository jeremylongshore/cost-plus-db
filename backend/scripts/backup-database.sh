#!/bin/bash
#
# Database Backup Script
#
# Creates timestamped backups of SQLite database and uploads to cloud storage
# Should be run via cron job daily
#
# Usage: ./backup-database.sh
#

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DATABASE_PATH="$PROJECT_ROOT/../002-clients/database/costplusdb.db"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="costplusdb_backup_${TIMESTAMP}.db"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"

# Wasabi S3 Configuration (optional - requires s3cmd or aws-cli)
WASABI_BUCKET="s3://your-backup-bucket/costplusdb"
ENABLE_CLOUD_BACKUP="${ENABLE_CLOUD_BACKUP:-false}"

# Logging
LOG_FILE="$PROJECT_ROOT/logs/backup.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========================================="
log "Database Backup Started"
log "========================================="

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DATABASE_PATH" ]; then
    log "ERROR: Database not found at $DATABASE_PATH"
    exit 1
fi

log "Database found: $DATABASE_PATH"
log "Creating backup: $BACKUP_FILE"

# Create SQLite backup (WAL-safe)
sqlite3 "$DATABASE_PATH" ".backup '$BACKUP_PATH'"

if [ $? -eq 0 ]; then
    log "✅ Local backup created successfully"

    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    log "Backup size: $BACKUP_SIZE"
else
    log "❌ ERROR: Backup failed"
    exit 1
fi

# Compress backup
log "Compressing backup..."
gzip "$BACKUP_PATH"
COMPRESSED_PATH="${BACKUP_PATH}.gz"

if [ $? -eq 0 ]; then
    COMPRESSED_SIZE=$(du -h "$COMPRESSED_PATH" | cut -f1)
    log "✅ Backup compressed: $COMPRESSED_SIZE"
else
    log "⚠️  WARNING: Compression failed, keeping uncompressed backup"
    COMPRESSED_PATH="$BACKUP_PATH"
fi

# Upload to cloud storage (optional)
if [ "$ENABLE_CLOUD_BACKUP" = "true" ]; then
    log "Uploading to cloud storage..."

    # Check if s3cmd is installed
    if command -v s3cmd &> /dev/null; then
        s3cmd put "$COMPRESSED_PATH" "$WASABI_BUCKET/" --host=s3.wasabisys.com --host-bucket='%(bucket)s.s3.wasabisys.com'

        if [ $? -eq 0 ]; then
            log "✅ Cloud backup uploaded successfully"
        else
            log "❌ ERROR: Cloud upload failed"
        fi
    else
        log "⚠️  WARNING: s3cmd not installed, skipping cloud backup"
        log "   Install with: pip install s3cmd"
    fi
fi

# Cleanup old backups (keep last 30 days)
log "Cleaning up old backups (keeping last 30 days)..."
find "$BACKUP_DIR" -name "costplusdb_backup_*.db.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "costplusdb_backup_*.db" -mtime +30 -delete

REMAINING_BACKUPS=$(find "$BACKUP_DIR" -name "costplusdb_backup_*" | wc -l)
log "Remaining backups: $REMAINING_BACKUPS"

log "========================================="
log "Database Backup Completed"
log "========================================="

exit 0
