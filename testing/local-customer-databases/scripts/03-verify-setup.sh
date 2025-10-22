#!/bin/bash
#
# Verify Test Database Setup
# Checks that all 5 databases are created and populated with data
#

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verifying Test Database Setup${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Database configurations
declare -A DBS
DBS[1]="costplusdb_customer1"
DBS[2]="costplusdb_customer2"
DBS[3]="costplusdb_customer3"
DBS[4]="costplusdb_customer4"
DBS[5]="costplusdb_customer5"

declare -A NAMES
NAMES[1]="E-commerce Shop"
NAMES[2]="SaaS Startup"
NAMES[3]="Blog/CMS"
NAMES[4]="Mobile App API"
NAMES[5]="Analytics Platform"

declare -A MIN_ROWS
MIN_ROWS[1]=20000   # E-commerce: at least 20K rows
MIN_ROWS[2]=20000   # SaaS: at least 20K rows
MIN_ROWS[3]=15000   # CMS: at least 15K rows
MIN_ROWS[4]=50000   # Mobile: at least 50K rows
MIN_ROWS[5]=30000   # Analytics: at least 30K rows

ALL_PASS=true

# Check each database
for i in {1..5}; do
    DB_NAME="${DBS[$i]}"
    CUSTOMER_NAME="${NAMES[$i]}"
    MIN="${MIN_ROWS[$i]}"

    echo -e "${BLUE}[$i/5] ${CUSTOMER_NAME} (${DB_NAME})${NC}"

    # Check if database exists
    if ! psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        echo -e "  ${RED}✗ Database not found${NC}\n"
        ALL_PASS=false
        continue
    fi

    # Get table count
    TABLE_COUNT=$(psql -d "$DB_NAME" -t -c "
        SELECT COUNT(*)
        FROM information_schema.tables
        WHERE table_schema = 'public';
    " | tr -d ' ')

    # Get total row count
    TOTAL_ROWS=$(psql -d "$DB_NAME" -t -c "
        SELECT COALESCE(SUM(n_live_tup)::bigint, 0)
        FROM pg_stat_user_tables;
    " | tr -d ' ')

    # Get database size
    DB_SIZE=$(psql -d "$DB_NAME" -t -c "
        SELECT pg_size_pretty(pg_database_size('$DB_NAME'));
    " | tr -d ' ')

    # Check if meets minimum rows
    if [ "$TOTAL_ROWS" -ge "$MIN" ]; then
        ROW_STATUS="${GREEN}✓${NC}"
    else
        ROW_STATUS="${RED}✗${NC}"
        ALL_PASS=false
    fi

    echo -e "  Tables: ${GREEN}${TABLE_COUNT}${NC}"
    echo -e "  Rows: $ROW_STATUS ${TOTAL_ROWS} (min: ${MIN})"
    echo -e "  Size: ${GREEN}${DB_SIZE}${NC}"

    # List top 3 tables by row count
    echo -e "  Top tables:"
    psql -d "$DB_NAME" -t -c "
        SELECT '    ' || schemaname || '.' || relname || ': ' || n_live_tup || ' rows'
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
        LIMIT 3;
    "

    echo ""
done

# Final summary
echo -e "${BLUE}========================================${NC}"
if [ "$ALL_PASS" = true ]; then
    echo -e "${GREEN}All Databases Verified!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "\n${GREEN}✓ Ready for testing!${NC}\n"
    echo -e "${YELLOW}You can now:${NC}"
    echo -e "  • Test backup/restore with pgBackRest"
    echo -e "  • Set up Betterstack monitoring"
    echo -e "  • Run performance tests"
    echo -e "  • Practice incident response"
    echo -e "  • Validate your SOPs\n"
else
    echo -e "${RED}Some Databases Failed Verification${NC}"
    echo -e "${RED}========================================${NC}"
    echo -e "\n${YELLOW}Please check the output above for issues.${NC}\n"
    exit 1
fi
