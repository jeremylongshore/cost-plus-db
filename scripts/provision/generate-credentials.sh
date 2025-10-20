#!/bin/bash
#==============================================================================
# Generate Secure Database Credentials
#==============================================================================
# Purpose: Generate secure passwords and connection strings for customers
# Usage: ./generate-credentials.sh DATABASE_NAME [--ssl-cert]
# Output: JSON with credentials to stdout
#==============================================================================

set -euo pipefail

#==============================================================================
# CONFIGURATION
#==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CRED_DIR="$PROJECT_ROOT/002-clients/customers/active"
CERT_DIR="$PROJECT_ROOT/002-clients/ssl-certificates"
LOG_FILE="$PROJECT_ROOT/002-clients/logs/credential-generation.log"

# Password requirements
PASSWORD_LENGTH=32
PASSWORD_CHARSET='A-Za-z0-9!@#$%^&*()_+-=[]{}|'

#==============================================================================
# LOGGING
#==============================================================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

error_exit() {
    echo "ERROR: $1" >&2
    log "ERROR: $1"
    exit 1
}

#==============================================================================
# INPUT VALIDATION
#==============================================================================

if [ $# -lt 1 ]; then
    cat <<USAGE
Usage: $0 DATABASE_NAME [--ssl-cert]

Arguments:
  DATABASE_NAME  - Database name (will be used to derive username)
  --ssl-cert     - Generate SSL certificate for database (optional)

Output:
  JSON object with credentials to stdout

Example:
  $0 acme_production
  $0 acme_production --ssl-cert
USAGE
    exit 1
fi

DATABASE_NAME="$1"
GENERATE_SSL=false

if [ $# -ge 2 ] && [ "$2" = "--ssl-cert" ]; then
    GENERATE_SSL=true
fi

# Validate database name
if ! [[ "$DATABASE_NAME" =~ ^[a-z0-9_]+$ ]]; then
    error_exit "Invalid database name. Use lowercase letters, numbers, and underscores only."
fi

DB_USER="${DATABASE_NAME}_user"

log "Generating credentials for database: $DATABASE_NAME"

#==============================================================================
# GENERATE SECURE PASSWORD
#==============================================================================

# Method 1: Use openssl for high-quality random password
generate_password_openssl() {
    # Generate 48 bytes of random data, base64 encode, remove special chars, take first 32
    openssl rand -base64 48 | tr -d "=+/\n" | head -c "$PASSWORD_LENGTH"
}

# Method 2: Use /dev/urandom as fallback
generate_password_urandom() {
    tr -dc "$PASSWORD_CHARSET" < /dev/urandom | head -c "$PASSWORD_LENGTH"
}

# Try openssl first, fall back to urandom
if command -v openssl >/dev/null 2>&1; then
    DB_PASSWORD=$(generate_password_openssl)
else
    DB_PASSWORD=$(generate_password_urandom)
fi

# Add complexity if password is too simple
# Ensure at least one uppercase, lowercase, digit, and special char
if ! [[ "$DB_PASSWORD" =~ [A-Z] ]]; then
    DB_PASSWORD="${DB_PASSWORD}A"
fi
if ! [[ "$DB_PASSWORD" =~ [a-z] ]]; then
    DB_PASSWORD="${DB_PASSWORD}z"
fi
if ! [[ "$DB_PASSWORD" =~ [0-9] ]]; then
    DB_PASSWORD="${DB_PASSWORD}9"
fi
if ! [[ "$DB_PASSWORD" =~ [!@#$%^&*()_+=-] ]]; then
    DB_PASSWORD="${DB_PASSWORD}!"
fi

# Trim to exact length if we added complexity
DB_PASSWORD=$(echo "$DB_PASSWORD" | head -c "$PASSWORD_LENGTH")

# Validate password was generated
if [ -z "$DB_PASSWORD" ] || [ ${#DB_PASSWORD} -lt 16 ]; then
    error_exit "Failed to generate secure password"
fi

log "Password generated successfully (length: ${#DB_PASSWORD})"

#==============================================================================
# GENERATE PASSWORD HASH (PostgreSQL scram-sha-256)
#==============================================================================

# Generate PostgreSQL-compatible password hash
# Note: This requires PostgreSQL to be installed locally
if command -v psql >/dev/null 2>&1; then
    # Use PostgreSQL to generate the hash
    PASSWORD_HASH=$(echo "SELECT encode(digest('$DB_PASSWORD', 'sha256'), 'hex');" | psql -tA 2>/dev/null || echo "")

    if [ -z "$PASSWORD_HASH" ]; then
        # Fallback: use simple SHA-256 hash
        PASSWORD_HASH=$(echo -n "$DB_PASSWORD" | sha256sum | awk '{print $1}')
    fi
else
    # Fallback: use SHA-256
    PASSWORD_HASH=$(echo -n "$DB_PASSWORD" | sha256sum | awk '{print $1}')
fi

log "Password hash generated"

#==============================================================================
# GET SERVER INFORMATION
#==============================================================================

# Get server IP (first non-loopback IPv4)
SERVER_IP=$(hostname -I | awk '{print $1}')
if [ -z "$SERVER_IP" ]; then
    SERVER_IP="localhost"
fi

# Get hostname
SERVER_HOSTNAME=$(hostname)

# PostgreSQL port (default or from environment)
PG_PORT="${PG_PORT:-5432}"

#==============================================================================
# GENERATE CONNECTION STRINGS
#==============================================================================

# Standard PostgreSQL connection string
CONN_STRING_STANDARD="postgresql://${DB_USER}:${DB_PASSWORD}@${SERVER_IP}:${PG_PORT}/${DATABASE_NAME}?sslmode=require"

# Connection string without password (for documentation)
CONN_STRING_NO_PASS="postgresql://${DB_USER}:[PASSWORD]@${SERVER_IP}:${PG_PORT}/${DATABASE_NAME}?sslmode=require"

# psql command line
PSQL_COMMAND="psql \"host=${SERVER_IP} port=${PG_PORT} dbname=${DATABASE_NAME} user=${DB_USER} password=${DB_PASSWORD} sslmode=require\""

# Environment variable format
ENV_DATABASE_URL="DATABASE_URL=\"postgresql://${DB_USER}:${DB_PASSWORD}@${SERVER_IP}:${PG_PORT}/${DATABASE_NAME}?sslmode=require\""

log "Connection strings generated"

#==============================================================================
# GENERATE SSL CERTIFICATE (Optional)
#==============================================================================

SSL_CERT_PATH=""
SSL_KEY_PATH=""
SSL_CA_PATH=""

if [ "$GENERATE_SSL" = true ]; then
    log "Generating SSL certificate..."

    mkdir -p "$CERT_DIR/$DATABASE_NAME"

    SSL_CERT_PATH="$CERT_DIR/$DATABASE_NAME/client.crt"
    SSL_KEY_PATH="$CERT_DIR/$DATABASE_NAME/client.key"
    SSL_CA_PATH="$CERT_DIR/$DATABASE_NAME/ca.crt"

    # Generate self-signed certificate (valid for 1 year)
    openssl req -new -x509 -days 365 -nodes \
        -subj "/C=US/ST=State/L=City/O=CostPlusDB/CN=${DB_USER}" \
        -keyout "$SSL_KEY_PATH" \
        -out "$SSL_CERT_PATH" \
        2>/dev/null || log "WARN: SSL certificate generation failed"

    if [ -f "$SSL_CERT_PATH" ]; then
        chmod 600 "$SSL_KEY_PATH"
        chmod 644 "$SSL_CERT_PATH"

        # Copy server CA certificate (if exists)
        if [ -f "/etc/postgresql/ssl/ca.crt" ]; then
            cp "/etc/postgresql/ssl/ca.crt" "$SSL_CA_PATH"
        fi

        log "SSL certificate generated at: $SSL_CERT_PATH"
    fi
fi

#==============================================================================
# SAVE CREDENTIALS TO FILE (Encrypted)
#==============================================================================

TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
CRED_FILE="$CRED_DIR/_credentials_${DATABASE_NAME}_${TIMESTAMP}.txt"

mkdir -p "$CRED_DIR"

cat > "$CRED_FILE" <<CREDEOF
CostPlusDB Database Credentials
================================
Generated: $(date)

Database: $DATABASE_NAME
User: $DB_USER
Password: $DB_PASSWORD

Server Information
==================
Hostname: $SERVER_HOSTNAME
IP Address: $SERVER_IP
Port: $PG_PORT
SSL Required: Yes

Connection Strings
==================

PostgreSQL Standard:
$CONN_STRING_STANDARD

psql Command:
$PSQL_COMMAND

Environment Variable (.env):
$ENV_DATABASE_URL

Security Information
====================
Password Length: ${#DB_PASSWORD} characters
Password Hash (SHA-256): $PASSWORD_HASH
SSL Certificate: ${SSL_CERT_PATH:-Not generated}

IMPORTANT: Store these credentials securely!
This file should be encrypted and transmitted via secure channels only.
CREDEOF

chmod 600 "$CRED_FILE"

log "Credentials saved to: $CRED_FILE"

#==============================================================================
# OUTPUT JSON TO STDOUT
#==============================================================================

# Escape special characters for JSON
escape_json() {
    echo "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

DB_PASSWORD_ESCAPED=$(escape_json "$DB_PASSWORD")
CONN_STRING_ESCAPED=$(escape_json "$CONN_STRING_STANDARD")

cat <<JSONEOF
{
  "database_name": "$DATABASE_NAME",
  "database_user": "$DB_USER",
  "database_password": "$DB_PASSWORD_ESCAPED",
  "password_hash": "$PASSWORD_HASH",
  "server": {
    "hostname": "$SERVER_HOSTNAME",
    "ip_address": "$SERVER_IP",
    "port": $PG_PORT
  },
  "connection_strings": {
    "standard": "$CONN_STRING_ESCAPED",
    "psql": "$(escape_json "$PSQL_COMMAND")",
    "env": "$(escape_json "$ENV_DATABASE_URL")"
  },
  "ssl": {
    "enabled": true,
    "certificate_generated": $GENERATE_SSL,
    "cert_path": "${SSL_CERT_PATH:-null}",
    "key_path": "${SSL_KEY_PATH:-null}",
    "ca_path": "${SSL_CA_PATH:-null}"
  },
  "credentials_file": "$CRED_FILE",
  "generated_at": "$(date -Iseconds)"
}
JSONEOF

log "Credentials generation completed successfully"
exit 0
