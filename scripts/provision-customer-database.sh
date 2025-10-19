#!/bin/bash

# Customer Database Provisioning Script
# Usage: SUDO_PASS=<password> ./provision-customer-database.sh <customer_name>

set -e

if [ -z "$SUDO_PASS" ]; then
    echo "Error: SUDO_PASS environment variable not set"
    echo "Usage: SUDO_PASS=<password> $0 <customer_name>"
    exit 1
fi

if [ -z "$1" ]; then
    echo "Usage: SUDO_PASS=<password> $0 <customer_name>"
    echo "Example: SUDO_PASS=mypassword $0 acmecorp"
    exit 1
fi

CUSTOMER_NAME="$1"
DB_NAME="${CUSTOMER_NAME}_db"
DB_USER="${CUSTOMER_NAME}_user"
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
POSTGRES_PORT="5433"

echo "======================================"
echo "Customer Database Provisioning"
echo "======================================"
echo "Customer: $CUSTOMER_NAME"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "======================================"

# Create PostgreSQL user
echo "Creating PostgreSQL user..."
echo $SUDO_PASS | sudo -S -u postgres psql -p $POSTGRES_PORT <<EOF
-- Create user with secure password
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';

-- Set connection limit (adjust as needed)
ALTER USER $DB_USER CONNECTION LIMIT 20;

-- Disable superuser, createdb, createrole privileges
ALTER USER $DB_USER WITH NOSUPERUSER NOCREATEDB NOCREATEROLE;
EOF

# Create database
echo "Creating database..."
echo $SUDO_PASS | sudo -S -u postgres psql -p $POSTGRES_PORT <<EOF
-- Create database owned by customer user
CREATE DATABASE $DB_NAME OWNER $DB_USER;

-- Revoke all public access
REVOKE ALL ON DATABASE $DB_NAME FROM PUBLIC;

-- Grant only to customer user
GRANT CONNECT ON DATABASE $DB_NAME TO $DB_USER;
EOF

# Configure database-level permissions
echo "Configuring database permissions..."
echo $SUDO_PASS | sudo -S -u postgres psql -p $POSTGRES_PORT -d $DB_NAME <<EOF
-- Revoke all public schema access
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- Grant schema usage to customer user
GRANT USAGE ON SCHEMA public TO $DB_USER;
GRANT CREATE ON SCHEMA public TO $DB_USER;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO $DB_USER;
EOF

# Add pg_hba.conf entry for remote SSL connections
echo "Adding pg_hba.conf entry..."
PG_HBA_ENTRY="hostssl  $DB_NAME  $DB_USER  0.0.0.0/0  scram-sha-256"
echo "$PG_HBA_ENTRY" | echo $SUDO_PASS | sudo -S tee -a /etc/postgresql/16/main/pg_hba.conf > /dev/null

# Reload PostgreSQL to apply pg_hba.conf changes
echo "Reloading PostgreSQL configuration..."
echo $SUDO_PASS | sudo -S -u postgres psql -p $POSTGRES_PORT -c "SELECT pg_reload_conf();"

# Add user to pgBouncer (if installed)
if command -v pgbouncer &> /dev/null && [ -f /etc/pgbouncer/userlist.txt ]; then
    echo "Adding user to pgBouncer..."

    # Extract password hash from PostgreSQL
    PG_HASH=$(echo $SUDO_PASS | sudo -S -u postgres psql -p $POSTGRES_PORT -t -A -c \
      "SELECT passwd FROM pg_shadow WHERE usename = '$DB_USER'")

    # Add to pgBouncer userlist
    echo "\"$DB_USER\" \"$PG_HASH\"" | echo $SUDO_PASS | sudo -S tee -a /etc/pgbouncer/userlist.txt > /dev/null

    # Reload pgBouncer to pick up new user
    echo $SUDO_PASS | sudo -S systemctl reload pgbouncer

    echo "✅ User added to pgBouncer"
fi

# Save credentials securely
CRED_DIR="/root/customer-credentials"
CRED_FILE="$CRED_DIR/${CUSTOMER_NAME}.txt"
echo $SUDO_PASS | sudo -S mkdir -p $CRED_DIR
echo $SUDO_PASS | sudo -S chmod 700 $CRED_DIR

if command -v pgbouncer &> /dev/null && [ -f /etc/pgbouncer/userlist.txt ]; then
    # pgBouncer is installed
    echo $SUDO_PASS | sudo -S tee $CRED_FILE > /dev/null <<EOF
Customer: $CUSTOMER_NAME
Database: $DB_NAME
User: $DB_USER
Password: $DB_PASSWORD

Connection String (RECOMMENDED - via pgBouncer):
  postgresql://$DB_USER:$DB_PASSWORD@<server_ip>:6432/$DB_NAME?sslmode=require

Connection String (DIRECT - PostgreSQL):
  postgresql://$DB_USER:$DB_PASSWORD@<server_ip>:$POSTGRES_PORT/$DB_NAME?sslmode=require

Created: $(date)
EOF
else
    # pgBouncer not installed
    echo $SUDO_PASS | sudo -S tee $CRED_FILE > /dev/null <<EOF
Customer: $CUSTOMER_NAME
Database: $DB_NAME
User: $DB_USER
Password: $DB_PASSWORD
Port: $POSTGRES_PORT
Connection String (SSL required):
  postgresql://$DB_USER:$DB_PASSWORD@<server_ip>:$POSTGRES_PORT/$DB_NAME?sslmode=require

Created: $(date)
EOF
fi

echo $SUDO_PASS | sudo -S chmod 600 $CRED_FILE

echo "======================================"
echo "✅ Customer database provisioned!"
echo "======================================"
echo "Credentials saved to: $CRED_FILE"
echo ""
echo "Connection details:"
echo "  Host: <your_server_ip>"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: $DB_PASSWORD"
echo "  SSL: REQUIRED"
echo ""

if command -v pgbouncer &> /dev/null && [ -f /etc/pgbouncer/userlist.txt ]; then
    echo "Connection string (RECOMMENDED - via pgBouncer):"
    echo "  postgresql://$DB_USER:$DB_PASSWORD@<server_ip>:6432/$DB_NAME?sslmode=require"
    echo ""
    echo "Connection string (DIRECT - PostgreSQL):"
    echo "  postgresql://$DB_USER:$DB_PASSWORD@<server_ip>:$POSTGRES_PORT/$DB_NAME?sslmode=require"
else
    echo "Connection string:"
    echo "  postgresql://$DB_USER:$DB_PASSWORD@<server_ip>:$POSTGRES_PORT/$DB_NAME?sslmode=require"
fi

echo "======================================"
