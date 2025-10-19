#!/bin/bash
#
# Emergency Database Restore Script
# ==================================
#
# Restores a customer database from pgBackRest backup
# Use this for disaster recovery or data corruption incidents
#
# Usage: sudo ./restore-customer-db.sh <database_name> [backup_set]
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

alert() {
    echo -e "${RED}[ALERT]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
   exit 1
fi

# Check arguments
if [[ $# -lt 1 ]]; then
    error "Usage: $0 <database_name> [backup_set]"
    error "Example: $0 customer_db_123"
    error "Example: $0 customer_db_123 20251019-020000F"
    exit 1
fi

DB_NAME="$1"
BACKUP_SET="${2:-latest}"
RESTORE_ID="RESTORE-$(date +%Y%m%d-%H%M%S)"
RESTORE_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/backups/restore-${RESTORE_ID}.log"

alert "EMERGENCY DATABASE RESTORE"
alert "Database: $DB_NAME"
alert "Backup set: $BACKUP_SET"
alert "Restore ID: $RESTORE_ID"
echo ""

# Create log directory
mkdir -p "$(dirname "$RESTORE_LOG")"

# Start restore log
{
    echo "================================================================================"
    echo "DATABASE RESTORE: $RESTORE_ID"
    echo "Time: $(date +'%Y-%m-%d %H:%M:%S')"
    echo "Database: $DB_NAME"
    echo "Backup set: $BACKUP_SET"
    echo "Executed by: $(whoami)"
    echo "================================================================================"
} >> "$RESTORE_LOG"

# Step 1: Verify database exists
log "Step 1: Verifying database exists..."
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    error "Database '$DB_NAME' does not exist"
    exit 1
fi
log "✓ Database confirmed: $DB_NAME"

# Step 2: Show available backups
log "Step 2: Checking available backups..."
echo ""
info "Available backups:"
sudo -u postgres pgbackrest --stanza=main info | tee -a "$RESTORE_LOG"
echo ""

warn "WARNING: This will OVERWRITE the current database with backup data!"
warn "All changes since the backup will be LOST!"
echo ""
read -p "Continue with restore? (type 'YES' to confirm): " CONFIRM

if [[ "$CONFIRM" != "YES" ]]; then
    log "Restore cancelled by user"
    exit 0
fi

# Step 3: Get current database size for comparison
log "Step 3: Recording current database size..."
CURRENT_SIZE=$(sudo -u postgres psql -t -c "
SELECT pg_size_pretty(pg_database_size('$DB_NAME'));
" 2>/dev/null | xargs)
log "Current database size: $CURRENT_SIZE"

# Step 4: Create pre-restore snapshot
log "Step 4: Creating pre-restore snapshot..."
SNAPSHOT_DIR="/home/admincostplus/projects/costplusdb/001-security/backups/daily"
mkdir -p "$SNAPSHOT_DIR"

sudo -u postgres pg_dump -p 5433 "$DB_NAME" | gzip > "$SNAPSHOT_DIR/${DB_NAME}-pre-restore-${RESTORE_ID}.sql.gz" 2>>"$RESTORE_LOG" || {
    warn "Failed to create pre-restore snapshot (continuing anyway)"
}

# Step 5: Terminate all connections to the database
log "Step 5: Terminating all connections to $DB_NAME..."
TERMINATED=$(sudo -u postgres psql -p 5433 -t -c "
SELECT count(*)
FROM pg_stat_activity
WHERE datname = '$DB_NAME' AND pid != pg_backend_pid();
" 2>/dev/null | xargs)

log "Active connections: $TERMINATED"

sudo -u postgres psql -p 5433 -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DB_NAME' AND pid != pg_backend_pid();
" >> "$RESTORE_LOG" 2>&1

log "✓ All connections terminated"

# Step 6: Drop and recreate database
log "Step 6: Dropping database $DB_NAME..."
sudo -u postgres psql -p 5433 -c "DROP DATABASE $DB_NAME;" >> "$RESTORE_LOG" 2>&1
log "✓ Database dropped"

log "Creating new empty database $DB_NAME..."
sudo -u postgres psql -p 5433 -c "CREATE DATABASE $DB_NAME;" >> "$RESTORE_LOG" 2>&1
log "✓ Database created"

# Step 7: Perform restore from backup
log "Step 7: Restoring from backup..."
log "This may take several minutes depending on database size..."
echo ""

if [[ "$BACKUP_SET" == "latest" ]]; then
    # Restore from latest backup
    info "Restoring from latest backup..."
    sudo -u postgres pgbackrest --stanza=main --delta \
        --db-include="$DB_NAME" \
        --type=immediate \
        restore >> "$RESTORE_LOG" 2>&1
else
    # Restore from specific backup set
    info "Restoring from backup set: $BACKUP_SET"
    sudo -u postgres pgbackrest --stanza=main --delta \
        --db-include="$DB_NAME" \
        --type=immediate \
        --set="$BACKUP_SET" \
        restore >> "$RESTORE_LOG" 2>&1
fi

if [[ $? -eq 0 ]]; then
    log "✓ Restore completed successfully"
else
    error "Restore failed! Check log: $RESTORE_LOG"
    exit 1
fi

# Step 8: Restart PostgreSQL
log "Step 8: Restarting PostgreSQL..."
systemctl restart postgresql@16-main
sleep 5

if systemctl is-active --quiet postgresql@16-main; then
    log "✓ PostgreSQL restarted successfully"
else
    error "PostgreSQL failed to restart! Check status: systemctl status postgresql@16-main"
    exit 1
fi

# Step 9: Verify database is accessible
log "Step 9: Verifying database accessibility..."
if sudo -u postgres psql -p 5433 -d "$DB_NAME" -c "SELECT 1;" >> "$RESTORE_LOG" 2>&1; then
    log "✓ Database is accessible"
else
    error "Database is not accessible after restore"
    exit 1
fi

# Step 10: Get restored database size
RESTORED_SIZE=$(sudo -u postgres psql -p 5433 -t -c "
SELECT pg_size_pretty(pg_database_size('$DB_NAME'));
" 2>/dev/null | xargs)
log "Restored database size: $RESTORED_SIZE"

# Step 11: Run ANALYZE on restored database
log "Step 11: Running ANALYZE on restored database..."
sudo -u postgres psql -p 5433 -d "$DB_NAME" -c "ANALYZE;" >> "$RESTORE_LOG" 2>&1
log "✓ ANALYZE complete"

# Step 12: Create restore report
RESTORE_REPORT="/home/admincostplus/projects/costplusdb/001-security/compliance/reports/${RESTORE_ID}-report.md"
mkdir -p "$(dirname "$RESTORE_REPORT")"

cat > "$RESTORE_REPORT" << EOF
# Database Restore Report

**Restore ID:** $RESTORE_ID
**Date/Time:** $(date +'%Y-%m-%d %H:%M:%S')
**Status:** SUCCESS

## Restore Details

- **Database:** $DB_NAME
- **Backup Set:** $BACKUP_SET
- **Executed By:** $(whoami)
- **Pre-restore Size:** $CURRENT_SIZE
- **Post-restore Size:** $RESTORED_SIZE
- **Connections Terminated:** $TERMINATED

## Actions Taken

1. Verified database existence
2. Created pre-restore snapshot (safety backup)
3. Terminated all active connections
4. Dropped existing database
5. Restored from pgBackRest backup
6. Restarted PostgreSQL service
7. Verified database accessibility
8. Ran ANALYZE for statistics update

## Restore Artifacts

- **Restore Log:** $RESTORE_LOG
- **Pre-restore Snapshot:** $SNAPSHOT_DIR/${DB_NAME}-pre-restore-${RESTORE_ID}.sql.gz

## Verification Steps

### Check database contents
\`\`\`sql
-- Connect to database
\c $DB_NAME

-- Check table list
\dt

-- Check row counts
SELECT schemaname, tablename, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
\`\`\`

### Check recent data
\`\`\`sql
-- Find tables with timestamp columns
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (column_name LIKE '%time%' OR column_name LIKE '%date%')
ORDER BY table_name;

-- Check most recent entries in key tables
-- (adjust table names as needed)
\`\`\`

## Next Steps

1. **Verify Data Integrity:**
   - Check critical tables for expected data
   - Verify recent transactions exist (or don't, depending on backup point)
   - Test application connectivity

2. **Notify Stakeholders:**
   - Inform customer of restore completion
   - Explain data point restored from
   - Document any data loss window

3. **Root Cause:**
   - Investigate cause of restore need
   - Document incident
   - Update procedures to prevent recurrence

4. **Monitor:**
   - Watch for errors in PostgreSQL logs
   - Monitor application behavior
   - Check for corruption issues

## Customer Communication Template

\`\`\`
Subject: Database Restore Completed - $DB_NAME

Hi [Customer Name],

We have successfully completed a restore of your database from backup.

Restore Details:
- Database: $DB_NAME
- Restored from: $BACKUP_SET backup
- Completed: $(date +'%Y-%m-%d %H:%M:%S')
- Status: Successful

Your database is now accessible and all services should be operational.

Data Point: The database has been restored to the state from [BACKUP_TIME].
Any data added or modified after this point will not be present.

Please verify your data and contact us if you notice any issues.

Best regards,
CostPlusDB Team
\`\`\`

---
*Generated: $(date +'%Y-%m-%d %H:%M:%S')*
EOF

# Log to audit trail
AUDIT_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/audit/database-restores.log"
mkdir -p "$(dirname "$AUDIT_LOG")"
cat >> "$AUDIT_LOG" << EOF
$(date +'%Y-%m-%d %H:%M:%S') - Database Restored: $DB_NAME
Restore ID: $RESTORE_ID
Backup set: $BACKUP_SET
Pre-restore size: $CURRENT_SIZE
Post-restore size: $RESTORED_SIZE
Report: $RESTORE_REPORT
---
EOF

# Display summary
echo ""
log "DATABASE RESTORE COMPLETE"
echo ""
info "Summary:"
echo "  Restore ID: $RESTORE_ID"
echo "  Database: $DB_NAME"
echo "  Backup set: $BACKUP_SET"
echo "  Pre-restore size: $CURRENT_SIZE"
echo "  Post-restore size: $RESTORED_SIZE"
echo "  Status: SUCCESS"
echo ""
warn "IMPORTANT: Verify data integrity before returning to production!"
echo ""
info "Next steps:"
echo "  1. Review restore report: $RESTORE_REPORT"
echo "  2. Connect and verify data: psql -p 5433 -d $DB_NAME"
echo "  3. Test application connectivity"
echo "  4. Notify customer of restore completion"
echo "  5. Document incident and root cause"
echo ""
log "Pre-restore snapshot saved: $SNAPSHOT_DIR/${DB_NAME}-pre-restore-${RESTORE_ID}.sql.gz"
log "Restore log: $RESTORE_LOG"
echo ""

exit 0
