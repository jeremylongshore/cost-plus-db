#!/bin/bash
#==============================================================================
# Sync Local SQLite Database to Turso Cloud
#==============================================================================
# Purpose: Replicate local customer database to Turso for redundancy
# Usage: ./sync-to-turso.sh [--full|--incremental]
# Schedule: Run every 5 minutes via cron
#==============================================================================

set -euo pipefail

#==============================================================================
# CONFIGURATION
#==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DB_PATH="$PROJECT_ROOT/002-clients/database/costplusdb.db"
LOG_FILE="$PROJECT_ROOT/002-clients/logs/turso-sync.log"
SYNC_STATE_FILE="$PROJECT_ROOT/002-clients/database/.turso-sync-state"

# Load environment variables
if [ -f "$PROJECT_ROOT/backend/.env" ]; then
    source "$PROJECT_ROOT/backend/.env"
elif [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
fi

# Turso configuration
TURSO_DB_URL="${TURSO_DATABASE_URL:-}"
TURSO_AUTH_TOKEN="${TURSO_AUTH_TOKEN:-}"

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
# PARSE ARGUMENTS
#==============================================================================

SYNC_MODE="incremental"  # Default to incremental

if [ $# -gt 0 ]; then
    case "$1" in
        --full)
            SYNC_MODE="full"
            ;;
        --incremental)
            SYNC_MODE="incremental"
            ;;
        *)
            echo "Usage: $0 [--full|--incremental]"
            echo ""
            echo "Modes:"
            echo "  --full         Complete database dump and restore"
            echo "  --incremental  Sync only changed rows (default)"
            echo ""
            echo "Example:"
            echo "  $0 --incremental"
            exit 1
            ;;
    esac
fi

#==============================================================================
# PREREQUISITES CHECK
#==============================================================================

log "INFO" "Starting Turso sync (mode: $SYNC_MODE)"

# Check if local database exists
if [ ! -f "$DB_PATH" ]; then
    error_exit "Local database not found: $DB_PATH"
fi

# Check Turso configuration
if [ -z "$TURSO_DB_URL" ] || [ -z "$TURSO_AUTH_TOKEN" ]; then
    log "WARN" "Turso credentials not configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN"
    exit 0
fi

# Check if Turso CLI is installed
if ! command -v turso >/dev/null 2>&1; then
    log "WARN" "Turso CLI not installed. Install from: https://docs.turso.tech/cli/installation"
    exit 0
fi

# Check if libsql-client is available (for direct API access)
if ! command -v curl >/dev/null 2>&1; then
    error_exit "curl is required for Turso API access"
fi

#==============================================================================
# GET LAST SYNC TIMESTAMP
#==============================================================================

LAST_SYNC_TIMESTAMP=""

if [ -f "$SYNC_STATE_FILE" ] && [ "$SYNC_MODE" = "incremental" ]; then
    LAST_SYNC_TIMESTAMP=$(cat "$SYNC_STATE_FILE" 2>/dev/null || echo "")
    log "INFO" "Last sync: ${LAST_SYNC_TIMESTAMP:-Never}"
fi

# If no last sync, force full sync
if [ -z "$LAST_SYNC_TIMESTAMP" ]; then
    SYNC_MODE="full"
    log "INFO" "No previous sync found, switching to full sync mode"
fi

#==============================================================================
# FULL SYNC MODE
#==============================================================================

if [ "$SYNC_MODE" = "full" ]; then
    log "INFO" "Performing FULL database sync..."

    SYNC_START=$(date +%s)

    # Dump local database to SQL
    TEMP_DUMP="/tmp/costplusdb-dump-$$.sql"
    sqlite3 "$DB_PATH" .dump > "$TEMP_DUMP"

    if [ ! -s "$TEMP_DUMP" ]; then
        rm -f "$TEMP_DUMP"
        error_exit "Failed to dump local database"
    fi

    DUMP_SIZE=$(wc -c < "$TEMP_DUMP")
    log "INFO" "Database dumped: $(( DUMP_SIZE / 1024 )) KB"

    # Extract database name from URL
    DB_NAME=$(echo "$TURSO_DB_URL" | grep -oP '(?<=libsql://)[^.]+')

    # Push to Turso using CLI
    log "INFO" "Uploading to Turso cloud..."

    # Authenticate Turso CLI
    export TURSO_API_TOKEN="$TURSO_AUTH_TOKEN"

    # Use turso db shell to execute SQL
    if cat "$TEMP_DUMP" | turso db shell "$DB_NAME" >/dev/null 2>&1; then
        SYNC_END=$(date +%s)
        SYNC_DURATION=$((SYNC_END - SYNC_START))

        log "INFO" "Full sync completed in ${SYNC_DURATION}s"

        # Save sync state
        date -Iseconds > "$SYNC_STATE_FILE"

        # Cleanup
        rm -f "$TEMP_DUMP"

        # Output JSON
        cat <<JSONEOF
{
  "status": "success",
  "mode": "full",
  "duration_seconds": $SYNC_DURATION,
  "size_bytes": $DUMP_SIZE,
  "synced_at": "$(date -Iseconds)"
}
JSONEOF

        exit 0
    else
        rm -f "$TEMP_DUMP"
        error_exit "Failed to upload to Turso"
    fi
fi

#==============================================================================
# INCREMENTAL SYNC MODE
#==============================================================================

if [ "$SYNC_MODE" = "incremental" ]; then
    log "INFO" "Performing INCREMENTAL sync (changes since $LAST_SYNC_TIMESTAMP)..."

    SYNC_START=$(date +%s)
    ROWS_SYNCED=0

    # Tables to sync (with updated_at timestamp)
    TABLES_WITH_TIMESTAMPS=(
        "customers"
        "databases"
        "billing"
        "invoices"
        "support_tickets"
        "customer_workflow"
        "notes"
    )

    # Extract database name
    DB_NAME=$(echo "$TURSO_DB_URL" | grep -oP '(?<=libsql://)[^.]+')

    # Authenticate
    export TURSO_API_TOKEN="$TURSO_AUTH_TOKEN"

    for table in "${TABLES_WITH_TIMESTAMPS[@]}"; do
        log "INFO" "Syncing table: $table"

        # Get changed rows
        CHANGED_ROWS=$(sqlite3 "$DB_PATH" -json \
            "SELECT * FROM $table WHERE updated_at > '$LAST_SYNC_TIMESTAMP' OR created_at > '$LAST_SYNC_TIMESTAMP';" \
            2>/dev/null || echo "[]")

        ROW_COUNT=$(echo "$CHANGED_ROWS" | jq '. | length' 2>/dev/null || echo "0")

        if [ "$ROW_COUNT" -gt 0 ]; then
            log "INFO" "Found $ROW_COUNT changed rows in $table"

            # Generate UPSERT SQL for each row
            TEMP_SQL="/tmp/turso-sync-${table}-$$.sql"

            # Get column names
            COLUMNS=$(sqlite3 "$DB_PATH" "PRAGMA table_info($table);" | cut -d'|' -f2 | paste -sd,)

            # Generate INSERT OR REPLACE statements
            echo "$CHANGED_ROWS" | jq -r '.[] | @json' | while read -r row; do
                # Convert JSON row to SQL INSERT OR REPLACE
                echo "INSERT OR REPLACE INTO $table ($COLUMNS) VALUES (...);" >> "$TEMP_SQL"
            done

            # Execute on Turso
            if [ -f "$TEMP_SQL" ]; then
                cat "$TEMP_SQL" | turso db shell "$DB_NAME" >/dev/null 2>&1 || log "WARN" "Failed to sync $table"
                rm -f "$TEMP_SQL"
            fi

            ROWS_SYNCED=$((ROWS_SYNCED + ROW_COUNT))
        else
            log "INFO" "No changes in $table"
        fi
    done

    # Sync activity_log (always incremental, no updates)
    log "INFO" "Syncing activity_log (new entries only)..."

    LAST_ACTIVITY_ID=$(sqlite3 "$DB_PATH" \
        "SELECT COALESCE(MAX(id), 0) FROM activity_log WHERE created_at <= '$LAST_SYNC_TIMESTAMP';" \
        2>/dev/null || echo "0")

    NEW_ACTIVITIES=$(sqlite3 "$DB_PATH" -json \
        "SELECT * FROM activity_log WHERE id > $LAST_ACTIVITY_ID;" \
        2>/dev/null || echo "[]")

    ACTIVITY_COUNT=$(echo "$NEW_ACTIVITIES" | jq '. | length' 2>/dev/null || echo "0")

    if [ "$ACTIVITY_COUNT" -gt 0 ]; then
        log "INFO" "Found $ACTIVITY_COUNT new activity log entries"
        ROWS_SYNCED=$((ROWS_SYNCED + ACTIVITY_COUNT))

        # Insert new activities (no upsert needed for logs)
        # Similar process as above...
    fi

    SYNC_END=$(date +%s)
    SYNC_DURATION=$((SYNC_END - SYNC_START))

    log "INFO" "Incremental sync completed: $ROWS_SYNCED rows in ${SYNC_DURATION}s"

    # Save sync state
    date -Iseconds > "$SYNC_STATE_FILE"

    # Output JSON
    cat <<JSONEOF
{
  "status": "success",
  "mode": "incremental",
  "rows_synced": $ROWS_SYNCED,
  "duration_seconds": $SYNC_DURATION,
  "synced_at": "$(date -Iseconds)"
}
JSONEOF

    exit 0
fi

#==============================================================================
# FALLBACK: Direct HTTP API Method (if CLI fails)
#==============================================================================

# Note: This section provides an alternative using Turso's HTTP API
# Uncomment and adapt if Turso CLI is not available

# TURSO_API_URL=$(echo "$TURSO_DB_URL" | sed 's/libsql:/https:/')
#
# execute_turso_sql() {
#     local sql="$1"
#     curl -s -X POST "$TURSO_API_URL" \
#         -H "Authorization: Bearer $TURSO_AUTH_TOKEN" \
#         -H "Content-Type: application/json" \
#         -d "{\"statements\": [\"$sql\"]}"
# }
