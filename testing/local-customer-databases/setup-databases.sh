#!/bin/bash

# Setup script for CostPlusDB test databases
# Creates 4 local PostgreSQL databases and imports generated test data

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_OUTPUT="${SCRIPT_DIR}/sql-output"
PG_PORT=5433
PG_USER="${USER}"

echo "============================================================"
echo "CostPlusDB Test Database Setup"
echo "============================================================"
echo ""
echo "Creating 4 local PostgreSQL databases with test data..."
echo "Port: ${PG_PORT}"
echo "User: ${PG_USER}"
echo ""

# Function to create database and import data
setup_database() {
    local db_name=$1
    local customer_dir=$2
    local description=$3

    echo "------------------------------------------------------------"
    echo "Setting up: ${db_name} (${description})"
    echo "------------------------------------------------------------"

    # Drop database if exists (ignore errors)
    psql -h localhost -p ${PG_PORT} -U ${PG_USER} postgres -c "DROP DATABASE IF EXISTS ${db_name};" 2>/dev/null || true

    # Create database
    echo "Creating database: ${db_name}"
    psql -h localhost -p ${PG_PORT} -U ${PG_USER} postgres -c "CREATE DATABASE ${db_name};"

    # Import all SQL files for this database
    echo "Importing data from ${customer_dir}..."
    for sql_file in "${SQL_OUTPUT}/${customer_dir}"/*.sql; do
        if [ -f "$sql_file" ]; then
            table_name=$(basename "$sql_file" .sql)
            echo "  - Loading ${table_name}..."
            psql -h localhost -p ${PG_PORT} -U ${PG_USER} ${db_name} -f "$sql_file" -q
        fi
    done

    # Get row counts
    echo "Verifying data..."
    psql -h localhost -p ${PG_PORT} -U ${PG_USER} ${db_name} -c "
        SELECT schemaname, tablename,
               pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    "

    echo "✓ ${db_name} setup complete!"
    echo ""
}

# Setup all databases
setup_database "costplusdb_customer1" "customer1" "E-commerce Shop"
setup_database "costplusdb_customer2" "customer2" "SaaS Startup"
setup_database "costplusdb_customer3" "customer3" "Blog/CMS"
setup_database "costplusdb_customer4" "customer4" "Mobile App API"

echo "============================================================"
echo "Setup Complete!"
echo "============================================================"
echo ""
echo "4 databases created:"
echo "  - costplusdb_customer1 (E-commerce Shop)"
echo "  - costplusdb_customer2 (SaaS Startup)"
echo "  - costplusdb_customer3 (Blog/CMS)"
echo "  - costplusdb_customer4 (Mobile App API)"
echo ""
echo "Connect to a database:"
echo "  psql -h localhost -p ${PG_PORT} -U ${PG_USER} costplusdb_customer1"
echo ""
echo "Total data: ~7.0MB across 4 databases"
echo ""
