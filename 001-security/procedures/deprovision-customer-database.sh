#!/bin/bash

# Customer Database Deprovisioning Script
# Usage: ./deprovision-customer-database.sh <customer_name>

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <customer_name>"
    echo "Example: $0 acmecorp"
    exit 1
fi

CUSTOMER_NAME="$1"
DB_NAME="${CUSTOMER_NAME}_db"
DB_USER="${CUSTOMER_NAME}_user"
POSTGRES_PORT="5433"

echo "======================================"
echo "Customer Database Deprovisioning"
echo "======================================"
echo "Customer: $CUSTOMER_NAME"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "======================================"
echo ""
echo "⚠️  WARNING: This will permanently delete:"
echo "  - Database: $DB_NAME"
echo "  - User: $DB_USER"
echo "  - All data in the database"
echo ""
read -p "Are you sure? Type 'yes' to confirm: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Deprovisioning cancelled."
    exit 0
fi

# Terminate active connections to database
echo "Terminating active connections..."
sudo -u postgres psql -p $POSTGRES_PORT <<EOF
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
EOF

# Drop database
echo "Dropping database..."
sudo -u postgres psql -p $POSTGRES_PORT -c "DROP DATABASE IF EXISTS $DB_NAME;"

# Drop user
echo "Dropping user..."
sudo -u postgres psql -p $POSTGRES_PORT -c "DROP USER IF EXISTS $DB_USER;"

# Remove pg_hba.conf entry
echo "Removing pg_hba.conf entry..."
sudo sed -i "/hostssl.*$DB_NAME.*$DB_USER/d" /etc/postgresql/18/main/pg_hba.conf

# Reload PostgreSQL
echo "Reloading PostgreSQL configuration..."
sudo -u postgres psql -p $POSTGRES_PORT -c "SELECT pg_reload_conf();"

# Archive credentials file
CRED_FILE="/root/customer-credentials/${CUSTOMER_NAME}.txt"
if [ -f "$CRED_FILE" ]; then
    echo "Archiving credentials..."
    sudo mv "$CRED_FILE" "/root/customer-credentials/archived_${CUSTOMER_NAME}_$(date +%Y%m%d_%H%M%S).txt"
fi

echo "======================================"
echo "✅ Customer database deprovisioned!"
echo "======================================"
