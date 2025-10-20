#!/bin/bash
#==============================================================================
# Backup Local SQLite Customer Database
#==============================================================================
# Purpose: Create compressed backups of local customer database
# Usage: ./backup-local-db.sh
# Schedule: Run daily via cron (recommended: 2 AM)
#==============================================================================

set -euo pipefail

#==============================================================================
# CONFIGURATION
#==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DB_PATH="$PROJECT_ROOT/002-clients/database/costplusdb.db"
BACKUP_DIR="$PROJECT_ROOT/002-clients/database/backups"
LOG_FILE="$PROJECT_ROOT/002-clients/logs/database-backup.log"

# Backup retention
KEEP_BACKUPS=30  # Keep last 30 backups

# Wasabi S3 configuration (optional)
WASABI_UPLOAD=false
WASABI_ENDPOINT="${WASABI_ENDPOINT:-s3.us-east-1.wasabisys.com}"
WASABI_BUCKET="${WASABI_BUCKET:-costplusdb-backups}"
WASABI_ACCESS_KEY="${WASABI_ACCESS_KEY:-}"
WASABI_SECRET_KEY="${WASABI_SECRET_KEY:-}"

# Check if Wasabi credentials are configured
if [ -n "$WASABI_ACCESS_KEY" ] && [ -n "$WASABI_SECRET_KEY" ]; then
    WASABI_UPLOAD=true
fi

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
# PREREQUISITES CHECK
#==============================================================================

log "INFO" "Starting database backup..."

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    error_exit "Database not found: $DB_PATH"
fi

# Check database is not locked
if ! sqlite3 "$DB_PATH" "PRAGMA integrity_check;" >/dev/null 2>&1; then
    error_exit "Database is locked or corrupted"
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

#==============================================================================
# CREATE BACKUP
#==============================================================================

TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
BACKUP_NAME="costplusdb-${TIMESTAMP}.db"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
COMPRESSED_BACKUP="${BACKUP_PATH}.gz"

log "INFO" "Creating backup: $BACKUP_NAME"

BACKUP_START=$(date +%s)

# Method 1: SQLite .backup command (preferred)
log "INFO" "Using SQLite backup command..."

sqlite3 "$DB_PATH" <<BACKUPEOF
.backup '$BACKUP_PATH'
BACKUPEOF

if [ $? -ne 0 ]; then
    error_exit "Failed to create SQLite backup"
fi

# Verify backup integrity
log "INFO" "Verifying backup integrity..."

if ! sqlite3 "$BACKUP_PATH" "PRAGMA integrity_check;" | grep -q "ok"; then
    rm -f "$BACKUP_PATH"
    error_exit "Backup integrity check failed"
fi

log "INFO" "Backup integrity verified"

# Get backup statistics
ORIGINAL_SIZE=$(stat -f%z "$DB_PATH" 2>/dev/null || stat -c%s "$DB_PATH")
BACKUP_SIZE=$(stat -f%z "$BACKUP_PATH" 2>/dev/null || stat -c%s "$BACKUP_PATH")

log "INFO" "Original database size: $(( ORIGINAL_SIZE / 1024 )) KB"
log "INFO" "Backup size: $(( BACKUP_SIZE / 1024 )) KB"

#==============================================================================
# COMPRESS BACKUP
#==============================================================================

log "INFO" "Compressing backup..."

gzip -9 "$BACKUP_PATH"

if [ ! -f "$COMPRESSED_BACKUP" ]; then
    error_exit "Failed to compress backup"
fi

COMPRESSED_SIZE=$(stat -f%z "$COMPRESSED_BACKUP" 2>/dev/null || stat -c%s "$COMPRESSED_BACKUP")
COMPRESSION_RATIO=$(( 100 - (COMPRESSED_SIZE * 100 / BACKUP_SIZE) ))

log "INFO" "Compressed size: $(( COMPRESSED_SIZE / 1024 )) KB (${COMPRESSION_RATIO}% reduction)"

BACKUP_END=$(date +%s)
BACKUP_DURATION=$((BACKUP_END - BACKUP_START))

log "INFO" "Backup completed in ${BACKUP_DURATION}s"

#==============================================================================
# UPLOAD TO WASABI S3 (Optional)
#==============================================================================

if [ "$WASABI_UPLOAD" = true ]; then
    log "INFO" "Uploading backup to Wasabi S3..."

    # Check if AWS CLI is installed
    if command -v aws >/dev/null 2>&1; then
        # Configure AWS CLI for Wasabi
        export AWS_ACCESS_KEY_ID="$WASABI_ACCESS_KEY"
        export AWS_SECRET_ACCESS_KEY="$WASABI_SECRET_KEY"

        # Upload to S3-compatible Wasabi
        aws s3 cp "$COMPRESSED_BACKUP" \
            "s3://${WASABI_BUCKET}/customer-db-backups/${BACKUP_NAME}.gz" \
            --endpoint-url="https://${WASABI_ENDPOINT}" \
            --region=us-east-1 \
            2>&1 | tee -a "$LOG_FILE"

        if [ $? -eq 0 ]; then
            log "INFO" "Backup uploaded to Wasabi successfully"
        else
            log "WARN" "Failed to upload backup to Wasabi (non-fatal)"
        fi
    else
        log "WARN" "AWS CLI not installed, skipping Wasabi upload"
    fi
elif [ -f "$PROJECT_ROOT/001-security/alerts/scripts/send-alert-email.sh" ]; then
    log "INFO" "Wasabi upload disabled (credentials not configured)"
fi

#==============================================================================
# CLEANUP OLD BACKUPS
#==============================================================================

log "INFO" "Cleaning up old backups (keeping last $KEEP_BACKUPS)..."

# Count existing backups
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/costplusdb-*.db.gz 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -gt "$KEEP_BACKUPS" ]; then
    BACKUPS_TO_DELETE=$((BACKUP_COUNT - KEEP_BACKUPS))
    log "INFO" "Deleting $BACKUPS_TO_DELETE old backup(s)..."

    # Delete oldest backups
    ls -1t "$BACKUP_DIR"/costplusdb-*.db.gz | tail -n "$BACKUPS_TO_DELETE" | xargs rm -f

    log "INFO" "Cleanup completed"
else
    log "INFO" "No cleanup needed ($BACKUP_COUNT backups, limit: $KEEP_BACKUPS)"
fi

#==============================================================================
# GENERATE BACKUP REPORT
#==============================================================================

FINAL_BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/costplusdb-*.db.gz 2>/dev/null | wc -l)

log "INFO" "=========================================="
log "INFO" "Backup Summary"
log "INFO" "=========================================="
log "INFO" "Backup file: $BACKUP_NAME.gz"
log "INFO" "Original size: $(( ORIGINAL_SIZE / 1024 )) KB"
log "INFO" "Compressed size: $(( COMPRESSED_SIZE / 1024 )) KB"
log "INFO" "Compression ratio: ${COMPRESSION_RATIO}%"
log "INFO" "Duration: ${BACKUP_DURATION}s"
log "INFO" "Total backups: $FINAL_BACKUP_COUNT"
log "INFO" "Wasabi upload: $WASABI_UPLOAD"
log "INFO" "=========================================="

#==============================================================================
# SEND EMAIL NOTIFICATION (Weekly Summary)
#==============================================================================

# Only send email on Sundays (weekly summary)
if [ "$(date +%u)" = "7" ]; then
    log "INFO" "Sending weekly backup summary email..."

    if [ -f "$PROJECT_ROOT/001-security/alerts/scripts/send-alert-email.sh" ]; then
        # Calculate total backup storage
        TOTAL_BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

        EMAIL_BODY="Weekly Database Backup Summary

Current Status: Success
Latest Backup: $BACKUP_NAME.gz
Backup Size: $(( COMPRESSED_SIZE / 1024 )) KB
Total Backups: $FINAL_BACKUP_COUNT
Total Storage: $TOTAL_BACKUP_SIZE
Retention Policy: $KEEP_BACKUPS backups

Backup Location: $BACKUP_DIR
Wasabi S3 Upload: $WASABI_UPLOAD

All database backups are functioning normally.
"

        "$PROJECT_ROOT/001-security/alerts/scripts/send-alert-email.sh" \
            "Weekly Database Backup Report" \
            "$EMAIL_BODY" || log "WARN" "Failed to send email notification"
    fi
fi

#==============================================================================
# OUTPUT JSON FOR AUTOMATION
#==============================================================================

cat <<JSONEOF
{
  "status": "success",
  "backup_file": "$BACKUP_NAME.gz",
  "backup_path": "$COMPRESSED_BACKUP",
  "original_size_bytes": $ORIGINAL_SIZE,
  "compressed_size_bytes": $COMPRESSED_SIZE,
  "compression_ratio_percent": $COMPRESSION_RATIO,
  "duration_seconds": $BACKUP_DURATION,
  "total_backups": $FINAL_BACKUP_COUNT,
  "wasabi_uploaded": $WASABI_UPLOAD,
  "created_at": "$(date -Iseconds)"
}
JSONEOF

exit 0
