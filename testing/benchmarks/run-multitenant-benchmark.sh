#!/bin/bash
# Multi-tenant benchmark: 5 customers simultaneously on 1 PostgreSQL instance
# Date: 2025-10-25

RESULT_DIR="testing/benchmarks/benchmarking-project/baseline-results/2025-10-25"
mkdir -p "$RESULT_DIR"

echo "================================================"
echo "SHARED TIER MULTI-TENANT BENCHMARK"
echo "5 Customers on 1 PostgreSQL Instance"
echo "Start: $(date)"
echo "================================================"
echo

# Run all 5 databases simultaneously
pgbench -c 4 -j 2 -T 90 "host=localhost port=5433 user=admincostplus dbname=costplusdb_customer1" > "$RESULT_DIR/mt-customer1.txt" 2>&1 &
PID1=$!

pgbench -c 4 -j 2 -T 90 "host=localhost port=5433 user=admincostplus dbname=costplusdb_customer2" > "$RESULT_DIR/mt-customer2.txt" 2>&1 &
PID2=$!

pgbench -c 4 -j 2 -T 90 "host=localhost port=5433 user=admincostplus dbname=costplusdb_customer3" > "$RESULT_DIR/mt-customer3.txt" 2>&1 &
PID3=$!

pgbench -c 4 -j 2 -T 90 "host=localhost port=5433 user=admincostplus dbname=costplusdb_customer4" > "$RESULT_DIR/mt-customer4.txt" 2>&1 &
PID4=$!

pgbench -c 4 -j 2 -T 90 "host=localhost port=5433 user=admincostplus dbname=costplusdb_customer5" > "$RESULT_DIR/mt-customer5.txt" 2>&1 &
PID5=$!

echo "All 5 benchmarks started..."
echo "Customer1 PID: $PID1"
echo "Customer2 PID: $PID2"
echo "Customer3 PID: $PID3"
echo "Customer4 PID: $PID4"
echo "Customer5 PID: $PID5"
echo

# Wait for all to complete
wait $PID1 $PID2 $PID3 $PID4 $PID5

echo "================================================"
echo "ALL 5 BENCHMARKS COMPLETE!"
echo "End: $(date)"
echo "================================================"
echo

# Display results
for i in 1 2 3 4 5; do
  echo "=== Customer $i Results ==="
  grep -E "number of clients|tps =|latency average" "$RESULT_DIR/mt-customer$i.txt"
  echo
done
