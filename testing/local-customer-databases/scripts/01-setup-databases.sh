#!/bin/bash
#
# Setup 5 Local PostgreSQL Test Databases
# Creates databases and imports schemas for CostPlusDB Shared tier testing
#

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}CostPlusDB Test Database Setup${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
SCHEMAS_DIR="$PROJECT_ROOT/schemas"

# Database names
DATABASES=(
    "costplusdb_customer1"
    "costplusdb_customer2"
    "costplusdb_customer3"
    "costplusdb_customer4"
    "costplusdb_customer5"
)

# Schema files
SCHEMA_FILES=(
    "customer1-ecommerce.sql"
    "customer2-saas.sql"
    "customer3-cms.sql"
    "customer4-mobile.sql"
    "customer5-analytics.sql"
)

# Database descriptions
DESCRIPTIONS=(
    "E-commerce Shop"
    "SaaS Startup"
    "Blog/CMS"
    "Mobile App API"
    "Analytics Platform"
)

# Check if PostgreSQL is running
echo -e "${YELLOW}Checking PostgreSQL status...${NC}"
if ! pg_isready -q; then
    echo -e "${YELLOW}PostgreSQL is not running. Starting it...${NC}"
    # Try to start PostgreSQL (command varies by system)
    if command -v brew &> /dev/null; then
        brew services start postgresql@16 || brew services start postgresql
    elif command -v systemctl &> /dev/null; then
        sudo systemctl start postgresql
    else
        echo "Please start PostgreSQL manually and rerun this script."
        exit 1
    fi
    sleep 2
fi

echo -e "${GREEN}✓ PostgreSQL is running${NC}\n"

# Create databases and import schemas
for i in "${!DATABASES[@]}"; do
    DB_NAME="${DATABASES[$i]}"
    SCHEMA_FILE="${SCHEMA_FILES[$i]}"
    DESCRIPTION="${DESCRIPTIONS[$i]}"

    echo -e "${BLUE}[$((i+1))/5] ${DESCRIPTION} (${DB_NAME})${NC}"

    # Drop database if it exists
    if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        echo "  Dropping existing database..."
        dropdb "$DB_NAME"
    fi

    # Create database
    echo "  Creating database..."
    createdb "$DB_NAME"

    # Import schema
    echo "  Importing schema from ${SCHEMA_FILE}..."
    psql -d "$DB_NAME" -f "$SCHEMAS_DIR/$SCHEMA_FILE" -q

    # Verify schema
    TABLE_COUNT=$(psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    echo -e "  ${GREEN}✓ Database created with ${TABLE_COUNT} tables${NC}\n"
done

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Generate test data:"
echo -e "   ${BLUE}cd vertex-ai && python generate-test-data.py${NC}"
echo -e "2. Import generated data:"
echo -e "   ${BLUE}./scripts/02-import-data.sh${NC}"
echo -e "3. Verify setup:"
echo -e "   ${BLUE}./scripts/03-verify-setup.sh${NC}\n"
