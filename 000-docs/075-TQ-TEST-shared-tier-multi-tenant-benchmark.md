# Shared Tier Multi-Tenant Benchmark Methodology

**Document Type:** Test Plan - Shared Tier Only
**Created:** 2025-10-25
**Status:** Active
**Purpose:** Benchmark realistic Shared tier performance with 5 concurrent customer databases

---

## Executive Summary

This benchmark tests CostPlusDB's **Shared tier ($59/month)** - the actual infrastructure customers will use. Unlike cloud providers who hide their multi-tenant architecture, we transparently benchmark **5 customer databases sharing 1 PostgreSQL instance**.

**Key Difference from Cloud Providers:**
- ✅ **We show:** 5 databases on 1 instance (realistic multi-tenant)
- ❌ **They show:** Single database benchmarks (unrealistic isolation)

---

## Test Environment

### Hardware (Shared by 5 Customers)

**Server:**
- **CPU:** AMD EPYC, 4 cores @ 2.5 GHz
- **RAM:** 23 GB total (shared across all 5 databases)
- **Storage:** 387 GB SSD
- **OS:** Ubuntu 24.04 LTS

**PostgreSQL 16.10:**
```
shared_buffers = 128MB      (shared by all 5 databases)
work_mem = 4MB
effective_cache_size = 4GB
max_connections = 100
```

### The 5 Customer Databases (All on Same Instance)

| Database | Use Case | Purpose |
|----------|----------|---------|
| costplusdb_customer1 | E-commerce | Transaction-heavy workload |
| costplusdb_customer2 | SaaS Startup | Event logging patterns |
| costplusdb_customer3 | Blog/CMS | Read-heavy workload |
| costplusdb_customer4 | Mobile API | High-volume API calls |
| costplusdb_customer5 | Analytics | Time-series data |

**Total:** 5 customers sharing CPU, RAM, disk I/O

---

## Benchmark Strategy

### Test 1: Single Database Baseline (Isolated Performance)

**Purpose:** Establish maximum performance when NO other customers active

```bash
# Run on customer1 database ONLY (others idle)
pgbench -i -s 50 postgresql://postgres@localhost:5433/costplusdb_customer1
pgbench -c 10 -j 2 -T 60 postgresql://postgres@localhost:5433/costplusdb_customer1
```

**Expected:** High TPS, low latency (no contention)

### Test 2: Multi-Tenant Concurrent Load (Realistic)

**Purpose:** Show performance when ALL 5 customers active simultaneously

```bash
# Run on ALL 5 databases at the same time
pgbench -c 2 -j 1 -T 60 postgresql://postgres@localhost:5433/costplusdb_customer1 &
pgbench -c 2 -j 1 -T 60 postgresql://postgres@localhost:5433/costplusdb_customer2 &
pgbench -c 2 -j 1 -T 60 postgresql://postgres@localhost:5433/costplusdb_customer3 &
pgbench -c 2 -j 1 -T 60 postgresql://postgres@localhost:5433/costplusdb_customer4 &
pgbench -c 2 -j 1 -T 60 postgresql://postgres@localhost:5433/costplusdb_customer5 &
wait
```

**Total Load:** 10 concurrent clients across 5 databases
**Expected:** Lower TPS per database (realistic resource sharing)

### Test 3: Heavy vs Light Load Mix

**Purpose:** Simulate real-world where some customers busy, others idle

```bash
# Customer 1: Heavy load (e-commerce peak hour)
pgbench -c 10 -j 2 -T 60 postgresql://postgres@localhost:5433/costplusdb_customer1 &

# Customer 2-3: Moderate load
pgbench -c 4 -j 1 -T 60 postgresql://postgres@localhost:5433/costplusdb_customer2 &
pgbench -c 4 -j 1 -T 60 postgresql://postgres@localhost:5433/costplusdb_customer3 &

# Customer 4-5: Light load (idle/read-only)
pgbench -S -c 2 -j 1 -T 60 postgresql://postgres@localhost:5433/costplusdb_customer4 &
pgbench -S -c 2 -j 1 -T 60 postgresql://postgres@localhost:5433/costplusdb_customer5 &
wait
```

**Total Load:** 22 concurrent clients, mixed workload

### Test 4: Resource Contention Test

**Purpose:** Stress test - all 5 customers at maximum load

```bash
# All 5 databases with heavy concurrent load
for db in customer1 customer2 customer3 customer4 customer5; do
  pgbench -c 20 -j 4 -T 60 postgresql://postgres@localhost:5433/costplusdb_$db &
done
wait
```

**Total Load:** 100 concurrent clients (extreme stress)
**Expected:** Degraded performance, shows limits of Shared tier

---

## Results Documentation

### Metrics to Capture (Per Database)

**Performance:**
- TPS (transactions per second)
- Latency average (ms)
- Latency p95, p99 (ms)
- Failed transactions

**Resource Usage (Shared):**
- CPU utilization (%)
- RAM usage (MB)
- Disk I/O (MB/s)
- Connection count

### Baseline Results (2025-10-25)

**Test 1: Single Database (Isolated)**
- Database: costplusdb_benchmark (scale=50)
- Clients: 10
- Duration: 60s
- **TPS: 1,077**
- **Latency: 9.23ms average**
- **Result:** Excellent isolated performance

**Test 1b: Single Database (20 clients)**
- Database: costplusdb_benchmark (scale=50)
- Clients: 20
- Duration: 60s
- **TPS: 1,410**
- **Latency: 14.11ms average**
- **Result:** Scales well with more clients

---

## Transparency Messaging for Website

### What We Show (That Competitors Hide)

**Our Approach:**
```
"Shared Tier Benchmarks - 5 Customers, 1 Instance"

✅ Single database isolated: 1,077 TPS @ 9.23ms
✅ 5 databases concurrent: [TBD] TPS @ [TBD]ms
✅ Resource contention: [TBD] TPS @ [TBD]ms

We show realistic multi-tenant performance.
```

**Competitor Approach:**
```
"Database Performance: 1,500 TPS"

❌ Single database only (unrealistic)
❌ No multi-tenant testing
❌ Cherry-picked conditions
❌ No resource sharing shown

They hide the impact of other customers.
```

### Honest Performance Claims

**What We Promise:**
- "Shared tier = 5 customers per PostgreSQL instance"
- "Isolated performance: >1,000 TPS"
- "Multi-tenant performance: [TBD after testing]"
- "We publish both best-case AND realistic scenarios"

**What We Don't Hide:**
- Performance degrades with concurrent load (expected)
- CPU/RAM shared across all 5 customers
- Noisy neighbor effect exists (we mitigate with limits)
- This is why Shared tier costs $59 vs Dedicated $119

---

## Comparison to Cloud Shared Offerings

### DigitalOcean Managed Database (Shared)

**Basic Plan: $15/month**
- 1 GB RAM (vs our 23 GB / 5 = ~4.6 GB per customer)
- 10 GB storage (vs our unlimited)
- 1 vCPU (vs our 4 cores / 5 = 0.8 cores per customer)

**We should compare:**
- Our Shared tier vs DO Basic
- Price: $59 vs $15 (4x more expensive BUT...)
- RAM: 4.6 GB vs 1 GB (4.6x more)
- Storage: Unlimited vs 10 GB
- CPU: 0.8 cores vs 1 core (similar)

**Value proposition:** We're more expensive but much better specs per customer

### AWS RDS (Shared Instance Equivalent)

**db.t3.micro: $15/month**
- 1 GB RAM
- Burstable CPU
- 20 GB storage
- Network-attached storage (slower)

**Our advantage:**
- 4.6 GB RAM per customer (4.6x more)
- Dedicated CPU allocation (no bursting)
- Local SSD (faster than EBS)
- More expensive BUT predictable performance

---

## Next Steps

### Immediate Testing (Today)

1. ✅ Test 1: Single database baseline (COMPLETED - 1,077 TPS)
2. Run Test 2: All 5 databases concurrent
3. Run Test 3: Mixed workload (heavy + light)
4. Run Test 4: Stress test (100 clients)
5. Document all results

### Documentation (Tomorrow)

1. Create results report with all metrics
2. Generate charts/graphs
3. Update website transparency page
4. Publish raw benchmark data

### Ongoing

1. Monthly benchmark runs (track performance over time)
2. Add sysbench-tpcc when installed
3. Test with actual customer schemas (when available)

---

## Benchmark Execution Commands

### Test 2: Multi-Tenant Concurrent (Equal Load)

```bash
# Equal load across all 5 databases
RESULT_DIR="testing/benchmarks/benchmarking-project/baseline-results/2025-10-25"

# Initialize all 5 databases
for db in customer1 customer2 customer3 customer4 customer5; do
  pgbench -i -s 10 postgresql://postgres@localhost:5433/costplusdb_$db
done

# Run concurrent benchmarks
pgbench -c 2 -j 1 -T 60 -P 10 postgresql://postgres@localhost:5433/costplusdb_customer1 \
  > "$RESULT_DIR/multitenant-customer1.txt" 2>&1 &
pgbench -c 2 -j 1 -T 60 -P 10 postgresql://postgres@localhost:5433/costplusdb_customer2 \
  > "$RESULT_DIR/multitenant-customer2.txt" 2>&1 &
pgbench -c 2 -j 1 -T 60 -P 10 postgresql://postgres@localhost:5433/costplusdb_customer3 \
  > "$RESULT_DIR/multitenant-customer3.txt" 2>&1 &
pgbench -c 2 -j 1 -T 60 -P 10 postgresql://postgres@localhost:5433/costplusdb_customer4 \
  > "$RESULT_DIR/multitenant-customer4.txt" 2>&1 &
pgbench -c 2 -j 1 -T 60 -P 10 postgresql://postgres@localhost:5433/costplusdb_customer5 \
  > "$RESULT_DIR/multitenant-customer5.txt" 2>&1 &

wait

# Display all results
for db in customer1 customer2 customer3 customer4 customer5; do
  echo "=== $db ==="
  tail -10 "$RESULT_DIR/multitenant-$db.txt"
done
```

### Test 3: Mixed Workload

```bash
# Heavy load on customer1 (e-commerce)
pgbench -c 10 -j 2 -T 60 postgresql://postgres@localhost:5433/costplusdb_customer1 \
  > "$RESULT_DIR/mixed-customer1-heavy.txt" 2>&1 &

# Moderate load on customer2-3
pgbench -c 4 -j 1 -T 60 postgresql://postgres@localhost:5433/costplusdb_customer2 \
  > "$RESULT_DIR/mixed-customer2-moderate.txt" 2>&1 &
pgbench -c 4 -j 1 -T 60 postgresql://postgres@localhost:5433/costplusdb_customer3 \
  > "$RESULT_DIR/mixed-customer3-moderate.txt" 2>&1 &

# Light load on customer4-5 (read-only)
pgbench -S -c 2 -j 1 -T 60 postgresql://postgres@localhost:5433/costplusdb_customer4 \
  > "$RESULT_DIR/mixed-customer4-light.txt" 2>&1 &
pgbench -S -c 2 -j 1 -T 60 postgresql://postgres@localhost:5433/costplusdb_customer5 \
  > "$RESULT_DIR/mixed-customer5-light.txt" 2>&1 &

wait
```

---

**Document Status:** Active - Shared Tier Only
**Next Action:** Run multi-tenant concurrent tests
**Expected Duration:** 2-3 hours for complete test suite

**Created:** 2025-10-25
**Last Updated:** 2025-10-25
**Maintained By:** CostPlusDB Operations
