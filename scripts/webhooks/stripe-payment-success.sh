#!/bin/bash
#==============================================================================
# Stripe Payment Success Webhook Handler
#==============================================================================
# Purpose: Handle successful payment events from Stripe
# Usage: ./stripe-payment-success.sh CUSTOMER_ID PAYMENT_INTENT_ID
# Triggered by: Backend webhook handler when Stripe sends payment.succeeded
#==============================================================================

set -euo pipefail

#==============================================================================
# CONFIGURATION
#==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DB_PATH="$PROJECT_ROOT/002-clients/database/costplusdb.db"
LOG_FILE="$PROJECT_ROOT/002-clients/logs/stripe-webhooks.log"
PROVISION_SCRIPT="$PROJECT_ROOT/scripts/provision/provision-customer-database.sh"

# Load environment variables
if [ -f "$PROJECT_ROOT/backend/.env" ]; then
    source "$PROJECT_ROOT/backend/.env"
elif [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
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

    # Send alert email
    if [ -f "$PROJECT_ROOT/001-security/alerts/scripts/send-alert-email.sh" ]; then
        "$PROJECT_ROOT/001-security/alerts/scripts/send-alert-email.sh" \
            "Payment Webhook Error: $CUSTOMER_ID" \
            "Failed to process payment for customer $CUSTOMER_ID. Error: $1"
    fi

    exit 1
}

#==============================================================================
# INPUT VALIDATION
#==============================================================================

if [ $# -ne 2 ]; then
    cat <<USAGE
Usage: $0 CUSTOMER_ID PAYMENT_INTENT_ID

Arguments:
  CUSTOMER_ID        - CostPlusDB customer ID (e.g., acme-corp-20251020)
  PAYMENT_INTENT_ID  - Stripe payment intent ID (e.g., pi_xxxxxxxxxxxxx)

This script is typically called by the backend webhook handler.

Example:
  $0 acme-corp-20251020 pi_3MtwBwLkdIwHu7ix28a3tqPa
USAGE
    exit 1
fi

CUSTOMER_ID="$1"
PAYMENT_INTENT_ID="$2"

log "INFO" "=========================================="
log "INFO" "Processing Stripe Payment Success"
log "INFO" "=========================================="
log "INFO" "Customer ID: $CUSTOMER_ID"
log "INFO" "Payment Intent: $PAYMENT_INTENT_ID"
log "INFO" "=========================================="

#==============================================================================
# VALIDATE DATABASE
#==============================================================================

if [ ! -f "$DB_PATH" ]; then
    error_exit "Customer database not found: $DB_PATH"
fi

#==============================================================================
# GET CUSTOMER INFORMATION
#==============================================================================

log "INFO" "Retrieving customer information from database..."

# Get customer details
CUSTOMER_INFO=$(sqlite3 "$DB_PATH" -json \
    "SELECT id, customer_id, company_name, contact_email, tier, status FROM customers WHERE customer_id='$CUSTOMER_ID';" \
    2>/dev/null || echo "[]")

CUSTOMER_INTERNAL_ID=$(echo "$CUSTOMER_INFO" | jq -r '.[0].id // empty' 2>/dev/null)

if [ -z "$CUSTOMER_INTERNAL_ID" ]; then
    error_exit "Customer not found: $CUSTOMER_ID"
fi

COMPANY_NAME=$(echo "$CUSTOMER_INFO" | jq -r '.[0].company_name' 2>/dev/null)
CONTACT_EMAIL=$(echo "$CUSTOMER_INFO" | jq -r '.[0].contact_email' 2>/dev/null)
TIER=$(echo "$CUSTOMER_INFO" | jq -r '.[0].tier' 2>/dev/null)
CURRENT_STATUS=$(echo "$CUSTOMER_INFO" | jq -r '.[0].status' 2>/dev/null)

log "INFO" "Customer found: $COMPANY_NAME ($CONTACT_EMAIL)"
log "INFO" "Tier: $TIER"
log "INFO" "Current status: $CURRENT_STATUS"

#==============================================================================
# UPDATE CUSTOMER STATUS
#==============================================================================

log "INFO" "Updating customer status to 'provisioning'..."

sqlite3 "$DB_PATH" <<SQLEOF
-- Update customer status
UPDATE customers
SET status = 'provisioning',
    updated_at = CURRENT_TIMESTAMP
WHERE id = $CUSTOMER_INTERNAL_ID;

-- Update workflow
UPDATE customer_workflow
SET payment_received = 1,
    payment_received_at = CURRENT_TIMESTAMP,
    current_stage = 'payment_received',
    updated_at = CURRENT_TIMESTAMP
WHERE customer_id = $CUSTOMER_INTERNAL_ID;

-- Log payment
INSERT INTO activity_log (
    customer_id,
    entity_type,
    entity_id,
    action_type,
    action_description,
    performed_by,
    new_values
)
VALUES (
    $CUSTOMER_INTERNAL_ID,
    'payment',
    NULL,
    'payment_received',
    'Stripe payment successful',
    'system-stripe-webhook',
    '{"payment_intent_id": "$PAYMENT_INTENT_ID", "tier": "$TIER"}'
);
SQLEOF

if [ $? -ne 0 ]; then
    error_exit "Failed to update customer database"
fi

log "INFO" "Customer status updated successfully"

#==============================================================================
# SEND PROVISIONING STARTED EMAIL
#==============================================================================

log "INFO" "Sending provisioning notification email..."

if [ -f "$PROJECT_ROOT/001-security/alerts/scripts/send-alert-email.sh" ]; then
    EMAIL_BODY="Payment received and verified for $COMPANY_NAME!

Customer ID: $CUSTOMER_ID
Payment Intent: $PAYMENT_INTENT_ID
Tier: $TIER

Database provisioning has been initiated. You will receive your database credentials shortly (typically within 5-10 minutes).

What happens next:
1. PostgreSQL database creation
2. User account setup with secure credentials
3. SSL/TLS configuration
4. Automated backup setup
5. Credentials delivery via secure email

If you have any questions, please contact us at ${RESEND_ADMIN_EMAIL:-support@costplusdb.com}

Thank you for choosing CostPlusDB!
"

    "$PROJECT_ROOT/001-security/alerts/scripts/send-alert-email.sh" \
        "Payment Received - Database Provisioning Started" \
        "$EMAIL_BODY" || log "WARN" "Failed to send customer email"
fi

#==============================================================================
# TRIGGER DATABASE PROVISIONING
#==============================================================================

log "INFO" "Triggering database provisioning..."

# Generate database name from customer ID
DATABASE_NAME=$(echo "$CUSTOMER_ID" | sed 's/-/_/g' | tr '[:upper:]' '[:lower:]')

if [ -f "$PROVISION_SCRIPT" ]; then
    log "INFO" "Executing provisioning script: $PROVISION_SCRIPT"
    log "INFO" "Database name: $DATABASE_NAME"

    # Run provisioning in background
    nohup "$PROVISION_SCRIPT" "$CUSTOMER_ID" "$DATABASE_NAME" "$TIER" \
        >> "$LOG_FILE" 2>&1 &

    PROVISION_PID=$!

    log "INFO" "Provisioning started (PID: $PROVISION_PID)"

    # Wait a moment to check if provisioning started successfully
    sleep 2

    if ps -p "$PROVISION_PID" >/dev/null 2>&1; then
        log "INFO" "Provisioning process is running"
    else
        log "WARN" "Provisioning process may have failed (check logs)"
    fi

    # Update workflow to indicate provisioning started
    sqlite3 "$DB_PATH" <<SQLEOF
UPDATE customer_workflow
SET database_provisioning_started = 1,
    database_provisioning_started_at = CURRENT_TIMESTAMP,
    current_stage = 'provisioning',
    updated_at = CURRENT_TIMESTAMP
WHERE customer_id = $CUSTOMER_INTERNAL_ID;

INSERT INTO activity_log (
    customer_id,
    entity_type,
    action_type,
    action_description,
    performed_by
)
VALUES (
    $CUSTOMER_INTERNAL_ID,
    'database',
    'provisioning_started',
    'Database provisioning initiated after payment',
    'system-stripe-webhook'
);
SQLEOF

else
    error_exit "Provisioning script not found: $PROVISION_SCRIPT"
fi

#==============================================================================
# LOG PAYMENT DETAILS
#==============================================================================

log "INFO" "Logging payment details..."

# Record payment in notes
sqlite3 "$DB_PATH" <<SQLEOF
INSERT INTO notes (
    customer_id,
    note_type,
    subject,
    note_text,
    created_by
)
VALUES (
    $CUSTOMER_INTERNAL_ID,
    'billing',
    'Payment Received',
    'Stripe payment successful. Payment Intent: $PAYMENT_INTENT_ID. Tier: $TIER. Provisioning initiated automatically.',
    'system-stripe-webhook'
);
SQLEOF

#==============================================================================
# SEND ADMIN NOTIFICATION
#==============================================================================

log "INFO" "Sending admin notification..."

if [ -f "$PROJECT_ROOT/001-security/alerts/scripts/send-alert-email.sh" ]; then
    ADMIN_EMAIL_BODY="New payment processed successfully!

Customer: $COMPANY_NAME
Customer ID: $CUSTOMER_ID
Email: $CONTACT_EMAIL
Tier: $TIER
Payment Intent: $PAYMENT_INTENT_ID

Database provisioning has been initiated automatically.
Database name: $DATABASE_NAME

Monitor provisioning progress:
- Check logs: $LOG_FILE
- Customer status: provisioning
"

    "$PROJECT_ROOT/001-security/alerts/scripts/send-alert-email.sh" \
        "New Customer Payment: $COMPANY_NAME" \
        "$ADMIN_EMAIL_BODY" || log "WARN" "Failed to send admin notification"
fi

#==============================================================================
# COMPLETION
#==============================================================================

log "INFO" "=========================================="
log "INFO" "Payment Processing COMPLETED"
log "INFO" "=========================================="
log "INFO" "Customer: $COMPANY_NAME"
log "INFO" "Payment Intent: $PAYMENT_INTENT_ID"
log "INFO" "Status: provisioning"
log "INFO" "Database: $DATABASE_NAME"
log "INFO" "=========================================="

# Output JSON for webhook response
cat <<JSONEOF
{
  "status": "success",
  "customer_id": "$CUSTOMER_ID",
  "company_name": "$COMPANY_NAME",
  "payment_intent_id": "$PAYMENT_INTENT_ID",
  "tier": "$TIER",
  "database_name": "$DATABASE_NAME",
  "provisioning_started": true,
  "processed_at": "$(date -Iseconds)"
}
JSONEOF

exit 0
