#!/bin/bash
#==============================================================================
# GitHub Actions Workflow Trigger
#==============================================================================
# Purpose: Trigger GitHub Actions workflows via API for automation
# Usage: ./github-action-trigger.sh ACTION CUSTOMER_ID [--wait]
# Requirements: GitHub Personal Access Token with workflow permissions
#==============================================================================

set -euo pipefail

#==============================================================================
# CONFIGURATION
#==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="$PROJECT_ROOT/002-clients/logs/github-actions.log"

# GitHub configuration
GITHUB_REPO="${GITHUB_REPO:-jeremylongshore/cost-plus-db}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
GITHUB_API_URL="https://api.github.com"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
fi

# Workflow IDs/names (must match .github/workflows/ files)
declare -A WORKFLOWS=(
    ["provision-database"]="provision-database.yml"
    ["run-backup"]="backup-database.yml"
    ["health-check"]="health-check.yml"
    ["security-scan"]="security-scan.yml"
    ["deploy-backend"]="deploy-backend.yml"
)

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

if [ $# -lt 2 ]; then
    cat <<USAGE
Usage: $0 ACTION CUSTOMER_ID [--wait]

Arguments:
  ACTION       - Workflow action to trigger
  CUSTOMER_ID  - Customer ID to pass to workflow
  --wait       - Wait for workflow completion (optional)

Available Actions:
  provision-database  - Provision new customer database
  run-backup          - Trigger database backup
  health-check        - Run system health check
  security-scan       - Run security vulnerability scan
  deploy-backend      - Deploy backend application

Environment Variables Required:
  GITHUB_TOKEN        - GitHub Personal Access Token
  GITHUB_REPO         - Repository (owner/name)

Example:
  $0 provision-database acme-corp-20251020
  $0 health-check all --wait
USAGE
    exit 1
fi

ACTION="$1"
CUSTOMER_ID="$2"
WAIT_FOR_COMPLETION=false

if [ $# -ge 3 ] && [ "$3" = "--wait" ]; then
    WAIT_FOR_COMPLETION=true
fi

# Validate action
if [ -z "${WORKFLOWS[$ACTION]}" ]; then
    echo "ERROR: Invalid action '$ACTION'"
    echo ""
    echo "Valid actions:"
    for action in "${!WORKFLOWS[@]}"; do
        echo "  - $action"
    done
    exit 1
fi

WORKFLOW_FILE="${WORKFLOWS[$ACTION]}"

log "INFO" "=========================================="
log "INFO" "Triggering GitHub Actions Workflow"
log "INFO" "=========================================="
log "INFO" "Action: $ACTION"
log "INFO" "Workflow: $WORKFLOW_FILE"
log "INFO" "Customer ID: $CUSTOMER_ID"
log "INFO" "Wait for completion: $WAIT_FOR_COMPLETION"
log "INFO" "=========================================="

#==============================================================================
# CHECK GITHUB TOKEN
#==============================================================================

if [ -z "$GITHUB_TOKEN" ]; then
    error_exit "GITHUB_TOKEN not set. Set it in .env or environment."
fi

#==============================================================================
# TRIGGER WORKFLOW
#==============================================================================

log "INFO" "Triggering workflow via GitHub API..."

# Prepare workflow dispatch payload
WORKFLOW_PAYLOAD=$(cat <<PAYLOADEOF
{
  "ref": "main",
  "inputs": {
    "customer_id": "$CUSTOMER_ID",
    "triggered_by": "script",
    "trigger_timestamp": "$(date -Iseconds)"
  }
}
PAYLOADEOF
)

# Trigger workflow
TRIGGER_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "$GITHUB_API_URL/repos/$GITHUB_REPO/actions/workflows/$WORKFLOW_FILE/dispatches" \
    -d "$WORKFLOW_PAYLOAD")

HTTP_STATUS=$(echo "$TRIGGER_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$TRIGGER_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" = "204" ]; then
    log "INFO" "Workflow triggered successfully"
else
    error_exit "Failed to trigger workflow (HTTP $HTTP_STATUS): $RESPONSE_BODY"
fi

#==============================================================================
# GET WORKFLOW RUN ID (if waiting)
#==============================================================================

if [ "$WAIT_FOR_COMPLETION" = true ]; then
    log "INFO" "Waiting for workflow to start..."

    # Wait a few seconds for workflow to be created
    sleep 5

    # Get latest workflow run
    RUNS_RESPONSE=$(curl -s \
        -H "Accept: application/vnd.github+json" \
        -H "Authorization: Bearer $GITHUB_TOKEN" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "$GITHUB_API_URL/repos/$GITHUB_REPO/actions/workflows/$WORKFLOW_FILE/runs?per_page=1")

    WORKFLOW_RUN_ID=$(echo "$RUNS_RESPONSE" | jq -r '.workflow_runs[0].id // empty' 2>/dev/null)

    if [ -z "$WORKFLOW_RUN_ID" ]; then
        log "WARN" "Could not retrieve workflow run ID"
        WAIT_FOR_COMPLETION=false
    else
        log "INFO" "Workflow run ID: $WORKFLOW_RUN_ID"
        WORKFLOW_URL=$(echo "$RUNS_RESPONSE" | jq -r '.workflow_runs[0].html_url // empty')
        log "INFO" "Workflow URL: $WORKFLOW_URL"
    fi
fi

#==============================================================================
# WAIT FOR WORKFLOW COMPLETION
#==============================================================================

if [ "$WAIT_FOR_COMPLETION" = true ]; then
    log "INFO" "Waiting for workflow to complete..."

    MAX_WAIT_SECONDS=600  # 10 minutes
    ELAPSED_SECONDS=0
    CHECK_INTERVAL=10

    while [ $ELAPSED_SECONDS -lt $MAX_WAIT_SECONDS ]; do
        # Get workflow run status
        RUN_STATUS_RESPONSE=$(curl -s \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer $GITHUB_TOKEN" \
            -H "X-GitHub-Api-Version: 2022-11-28" \
            "$GITHUB_API_URL/repos/$GITHUB_REPO/actions/runs/$WORKFLOW_RUN_ID")

        STATUS=$(echo "$RUN_STATUS_RESPONSE" | jq -r '.status // empty')
        CONCLUSION=$(echo "$RUN_STATUS_RESPONSE" | jq -r '.conclusion // empty')

        log "INFO" "Status: $STATUS, Conclusion: $CONCLUSION"

        # Check if workflow completed
        if [ "$STATUS" = "completed" ]; then
            log "INFO" "Workflow completed with conclusion: $CONCLUSION"

            if [ "$CONCLUSION" = "success" ]; then
                log "INFO" "✓ Workflow SUCCEEDED"

                # Output JSON
                cat <<JSONEOF
{
  "status": "success",
  "action": "$ACTION",
  "customer_id": "$CUSTOMER_ID",
  "workflow_run_id": "$WORKFLOW_RUN_ID",
  "workflow_url": "$WORKFLOW_URL",
  "conclusion": "$CONCLUSION",
  "elapsed_seconds": $ELAPSED_SECONDS,
  "triggered_at": "$(date -Iseconds)"
}
JSONEOF
                exit 0

            elif [ "$CONCLUSION" = "failure" ]; then
                log "ERROR" "✗ Workflow FAILED"

                # Get failure details
                FAILURE_MESSAGE=$(echo "$RUN_STATUS_RESPONSE" | jq -r '.message // "No error message"')

                # Output JSON
                cat <<JSONEOF
{
  "status": "failure",
  "action": "$ACTION",
  "customer_id": "$CUSTOMER_ID",
  "workflow_run_id": "$WORKFLOW_RUN_ID",
  "workflow_url": "$WORKFLOW_URL",
  "conclusion": "$CONCLUSION",
  "error": "$FAILURE_MESSAGE",
  "elapsed_seconds": $ELAPSED_SECONDS,
  "triggered_at": "$(date -Iseconds)"
}
JSONEOF
                exit 1

            else
                log "WARN" "Workflow completed with conclusion: $CONCLUSION"
                exit 1
            fi
        fi

        # Wait before next check
        sleep $CHECK_INTERVAL
        ELAPSED_SECONDS=$((ELAPSED_SECONDS + CHECK_INTERVAL))
    done

    # Timeout reached
    log "WARN" "Workflow did not complete within $MAX_WAIT_SECONDS seconds"

    cat <<JSONEOF
{
  "status": "timeout",
  "action": "$ACTION",
  "customer_id": "$CUSTOMER_ID",
  "workflow_run_id": "$WORKFLOW_RUN_ID",
  "workflow_url": "$WORKFLOW_URL",
  "last_status": "$STATUS",
  "elapsed_seconds": $ELAPSED_SECONDS,
  "triggered_at": "$(date -Iseconds)"
}
JSONEOF
    exit 1
fi

#==============================================================================
# COMPLETION (No Wait)
#==============================================================================

log "INFO" "=========================================="
log "INFO" "Workflow Triggered Successfully"
log "INFO" "=========================================="
log "INFO" "Action: $ACTION"
log "INFO" "Customer ID: $CUSTOMER_ID"
log "INFO" "Repository: $GITHUB_REPO"
log "INFO" "=========================================="

# Output JSON
cat <<JSONEOF
{
  "status": "triggered",
  "action": "$ACTION",
  "customer_id": "$CUSTOMER_ID",
  "workflow_file": "$WORKFLOW_FILE",
  "repository": "$GITHUB_REPO",
  "wait_for_completion": false,
  "triggered_at": "$(date -Iseconds)"
}
JSONEOF

exit 0
