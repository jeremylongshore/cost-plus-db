# PostgreSQL Benchmarking Standards for CostPlusDB

**Document Type:** Test Plan
**Created:** 2025-10-25
**Last Updated:** 2025-10-25
**Status:** Active - Dual Benchmark Strategy

## Overview

This document defines the **dual-benchmark strategy** for CostPlusDB, combining industry-standard PostgreSQL benchmarking tools to provide comprehensive, credible performance metrics.

**Strategy:** Use BOTH pgbench (PostgreSQL official) AND sysbench-tpcc (industry cloud standard)

**Purpose:**
- Establish baseline performance metrics for all customer tiers
- Validate hardware sizing and PostgreSQL configuration
- Support transparent pricing with performance data
- Enable competitive comparisons with cloud providers
- Prove infrastructure readiness before customer onboarding

---

## Industry-Standard Benchmarks

### 1. pgbench (PostgreSQL Official Standard)

**Source:** Built into PostgreSQL (official PostgreSQL project)
**Documentation:** https://www.postgresql.org/docs/current/pgbench.html
**Status:** The standard PostgreSQL-specific benchmarking tool

**Why pgbench:**
- Included with every PostgreSQL installation
- Official PostgreSQL community tool
- Results comparable across all PostgreSQL deployments
- Trusted by PostgreSQL community for version comparisons
- Simple, reproducible, well-documented

**Default Workload:** TPC-B-like transaction processing
- 5 SQL commands per transaction (SELECT, UPDATE, INSERT)
- Tests: Banking/financial transaction patterns
- Tables: pgbench_accounts, pgbench_branches, pgbench_tellers, pgbench_history

**Key Metrics:**
- TPS (Transactions Per Second)
- Latency (average, median, p95, p99)
- Connection scalability (1, 10, 50, 100 clients)

### 2. sysbench-tpcc (Industry Cloud Standard)

**Source:** Percona Lab / Open Source
**Repository:** https://github.com/Percona-Lab/sysbench-tpcc
**Status:** Industry-standard for cloud provider benchmarking

**Why sysbench-tpcc:**
- Used by AWS, PlanetScale, and major cloud providers
- TPC-C-like workload (OLTP industry standard)
- More complex than pgbench (closer to real-world)
- Cross-database comparison capability
- Widely published benchmark results for comparison

**Workload:** TPC-C-like transaction processing
- 20 tables (warehouses, customers, orders, inventory)
- 5 transaction types (New Order, Payment, Order Status, Delivery, Stock Level)
- Tests: E-commerce/supply chain patterns
- Configurable scale factor (determines database size)

**Key Metrics:**
- New Order TPS (primary TPC-C metric)
- Total TPS across all transaction types
- 99th percentile latency
- Throughput under sustained load

### 3. TPC Official Standards (Reference Only)

**Organization:** Transaction Processing Performance Council (TPC)
**Website:** https://www.tpc.org
**Standards:** TPC-C, TPC-H, TPC-E

**Note:** Official TPC benchmarks are complex and require audited results. We use "TPC-C-like" and "TPC-B-like" workloads (pgbench and sysbench-tpcc) which follow the spirit but not the letter of TPC specifications.

**Why we don't run official TPC:**
- Requires expensive auditing process
- Complex implementation requirements
- Small-scale operators typically use "TPC-like" benchmarks
- Our approach (pgbench + sysbench-tpcc) provides credible comparisons

---

## CostPlusDB Dual-Benchmark Strategy

### Benchmark 1: pgbench (PostgreSQL Community Standard)

**Use Case:** PostgreSQL-specific performance validation

**Test Scenarios:**

#### 1a. pgbench Default TPC-B-like Workload
```bash
# Initialize test database (scale factor 100 = ~1.5GB)
pgbench -i -s 100 -h localhost -p 5433 -U postgres costplusdb_benchmark

# Run benchmark (10 clients, 60 seconds)
pgbench -c 10 -j 2 -T 60 -h localhost -p 5433 -U postgres costplusdb_benchmark

# Run benchmark (50 clients, 300 seconds) - sustained load
pgbench -c 50 -j 4 -T 300 -h localhost -p 5433 -U postgres costplusdb_benchmark
```

**Metrics to Record:**
- TPS (transactions per second)
- Latency average (ms)
- Latency stddev
- Initial connection time

#### 1b. pgbench SELECT-Only Workload
```bash
# Test read-heavy workload
pgbench -S -c 10 -j 2 -T 60 -h localhost -p 5433 -U postgres costplusdb_benchmark
```

**Metrics to Record:**
- Read TPS
- Read latency (average, p95, p99)

#### 1c. pgbench Custom Workload (Simple Update)
```bash
# Test write-heavy workload
pgbench -N -c 10 -j 2 -T 60 -h localhost -p 5433 -U postgres costplusdb_benchmark
```

**Metrics to Record:**
- Write TPS
- Write latency

**Scale Factors for Customer Tiers:**

| Tier | pgbench Scale | Database Size | Test Duration |
|------|---------------|---------------|---------------|
| Shared (2GB RAM) | scale=50 | ~750MB | 60 seconds |
| Dedicated (8GB RAM) | scale=100 | ~1.5GB | 300 seconds |
| Pro (16GB RAM) | scale=200 | ~3GB | 300 seconds |
| Enterprise (32GB RAM) | scale=400 | ~6GB | 600 seconds |

### Benchmark 2: sysbench-tpcc (Cloud Industry Standard)

**Use Case:** Industry-wide performance comparisons (vs AWS, PlanetScale, etc.)

**Test Scenarios:**

#### 2a. sysbench-tpcc Small Scale (Validation)
```bash
# Prepare TPC-C data (scale=1, ~2GB)
cd testing/benchmarks/sysbench-tpcc
./tpcc.lua --pgsql-host=localhost --pgsql-port=5433 --pgsql-user=postgres \
  --pgsql-db=costplusdb_benchmark --threads=4 --tables=10 --scale=1 \
  --time=300 --report-interval=10 --db-driver=pgsql prepare

# Run TPC-C benchmark
./tpcc.lua --pgsql-host=localhost --pgsql-port=5433 --pgsql-user=postgres \
  --pgsql-db=costplusdb_benchmark --threads=4 --tables=10 --scale=1 \
  --time=300 --report-interval=10 --db-driver=pgsql run
```

**Metrics to Record:**
- New Order TPS
- Total TPS
- 99th percentile latency
- Errors/warnings

#### 2b. sysbench-tpcc Medium Scale (Production Baseline)
```bash
# Prepare TPC-C data (scale=5, ~10GB)
./tpcc.lua --pgsql-host=localhost --pgsql-port=5433 --pgsql-user=postgres \
  --pgsql-db=costplusdb_benchmark --threads=8 --tables=10 --scale=5 \
  --time=600 --report-interval=10 --db-driver=pgsql prepare

# Run benchmark
./tpcc.lua --pgsql-host=localhost --pgsql-port=5433 --pgsql-user=postgres \
  --pgsql-db=costplusdb_benchmark --threads=8 --tables=10 --scale=5 \
  --time=600 --report-interval=10 --db-driver=pgsql run
```

**Scale Factors for Customer Tiers:**

| Tier | TPC-C Scale | Database Size | Threads | Duration |
|------|-------------|---------------|---------|----------|
| Shared (2GB RAM) | scale=1 | ~2GB | 4 | 300s |
| Dedicated (8GB RAM) | scale=5 | ~10GB | 8 | 600s |
| Pro (16GB RAM) | scale=10 | ~20GB | 16 | 600s |
| Enterprise (32GB RAM) | scale=25 | ~50GB | 32 | 600s |

### Benchmark 3: Latency Test (PlanetScale Methodology)

**Use Case:** Baseline network/connection overhead

```bash
# Simple latency test (1000 iterations)
for i in {1..1000}; do
  psql -h localhost -p 5433 -U postgres -d costplusdb_benchmark \
    -c "SELECT 1;" -t > /dev/null
done
```

**Metrics to Record:**
- Median latency (p50)
- 95th percentile latency (p95)
- 99th percentile latency (p99)

---

## Benchmark Execution Schedule

### Initial Baseline (One-Time)

**Goal:** Establish performance baselines before first customer

**Tasks:**
1. Run pgbench TPC-B-like (3 scenarios: default, SELECT-only, simple-update)
2. Run sysbench-tpcc (scale=1, scale=5)
3. Run latency test
4. Document all results in `testing/benchmarks/benchmarking-project/baseline-results/`
5. Create performance baseline report

**Timeline:** 1 day (preparation + execution + documentation)

### Monthly Performance Validation

**Goal:** Track performance over time, detect degradation

**Tasks:**
1. Run pgbench default workload (60 seconds)
2. Run sysbench-tpcc scale=5 (600 seconds)
3. Compare to baseline
4. Alert if >10% performance degradation
5. Document results

**Timeline:** 2 hours/month

### Before Major Changes

**Goal:** Validate performance impact of infrastructure changes

**When to Run:**
- PostgreSQL version upgrade
- Hardware changes (CPU, RAM, storage)
- PostgreSQL configuration tuning
- Kernel/OS updates
- Customer tier capacity expansion

**Tasks:**
1. Run full benchmark suite (before change)
2. Make infrastructure change
3. Run full benchmark suite (after change)
4. Document performance delta
5. Rollback if >10% degradation without explanation

---

## Benchmark Result Documentation

### Required Data Points

For every benchmark run, record:

**Environment:**
- PostgreSQL version
- Server hardware (CPU, RAM, storage type)
- OS version
- PostgreSQL configuration (shared_buffers, work_mem, etc.)
- Date/time of test

**pgbench Results:**
- Scale factor
- Number of clients
- TPS (transactions per second)
- Latency average (ms)
- Latency stddev (ms)
- Initial connection time (ms)

**sysbench-tpcc Results:**
- Scale factor
- Number of threads
- New Order TPS
- Total TPS
- 99th percentile latency (ms)
- Errors/warnings

**Comparison:**
- Baseline date (for comparison)
- Performance delta (% change)
- Notes on configuration changes

### Storage Location

```
testing/benchmarks/benchmarking-project/baseline-results/
├── YYYY-MM-DD-pgbench-baseline.txt
├── YYYY-MM-DD-sysbench-tpcc-baseline.txt
├── YYYY-MM-DD-latency-test.txt
└── YYYY-MM-DD-performance-report.md
```

---

## Interpretation Guidelines

### pgbench Results

**Good Performance Indicators:**
- TPS > 1000 for Shared tier (scale=50)
- TPS > 2000 for Dedicated tier (scale=100)
- Latency average < 10ms
- Latency stddev < 5ms

**Performance Issues:**
- TPS drops >10% compared to baseline
- Latency average > 50ms
- High latency stddev (>10ms) indicates inconsistent performance

### sysbench-tpcc Results

**Good Performance Indicators:**
- New Order TPS > 100 for Shared tier (scale=1)
- New Order TPS > 500 for Dedicated tier (scale=5)
- 99th percentile latency < 100ms
- No errors during benchmark run

**Performance Issues:**
- TPS drops >10% compared to baseline
- 99th percentile latency > 500ms
- Errors or deadlocks during benchmark

### When to Investigate

**Red Flags:**
- Performance degradation >10% without configuration changes
- High latency stddev (inconsistent performance)
- Errors or warnings during benchmark execution
- CPU/disk utilization >80% during benchmark

---

## Integration with SOPs

### Customer Onboarding

**Before provisioning customer database:**
1. Run pgbench at customer's expected scale
2. Validate TPS meets SLA requirements
3. Document baseline in customer record

**Reference:** `000-docs/004-DR-SOPS-customer-provisioning.md`

### Performance SLA Baselines

**Shared Tier SLA:**
- Minimum TPS: 500 (pgbench scale=50)
- Maximum latency average: 20ms
- Based on: pgbench default workload

**Dedicated Tier SLA:**
- Minimum TPS: 1000 (pgbench scale=100)
- Maximum latency average: 10ms
- Based on: pgbench default workload

**Reference:** `000-docs/002-PP-PLAN-pricing-structure.md`

---

## Tools Installation

### pgbench

**Already installed with PostgreSQL 16:**
```bash
# Verify installation
pgbench --version
```

### sysbench-tpcc

**Already cloned:**
```bash
cd testing/benchmarks/sysbench-tpcc
ls -la tpcc.lua
```

**Dependencies:**
- sysbench 1.0.20+ (needs installation)
- PostgreSQL client libraries

**Installation (if needed):**
```bash
# Ubuntu/Debian
sudo apt-get install sysbench

# Verify
sysbench --version
```

---

## Benchmark Best Practices

### 1. Consistent Environment

**Always benchmark:**
- On same hardware
- With same PostgreSQL configuration
- At same time of day (avoid variable system load)
- With same PostgreSQL version

### 2. Warm-Up Period

**Before recording results:**
- Run benchmark for 30 seconds (warm-up)
- Discard warm-up results
- Run actual benchmark for measurement

### 3. Multiple Runs

**For critical benchmarks:**
- Run 3 times
- Record all results
- Report median TPS
- Note variance between runs

### 4. Clean State

**Between benchmark runs:**
- Restart PostgreSQL
- Clear OS page cache: `sync; echo 3 > /proc/sys/vm/drop_caches`
- Wait 60 seconds before next run

### 5. Monitor System Resources

**During benchmarks:**
- Monitor CPU utilization
- Monitor disk I/O
- Monitor RAM usage
- Check for swap activity

---

## References

**PostgreSQL Official:**
- pgbench documentation: https://www.postgresql.org/docs/current/pgbench.html

**Industry Standards:**
- TPC Council: https://www.tpc.org
- TPC-C Specification: https://www.tpc.org/tpc_documents_current_versions/current_specifications5.asp

**Cloud Provider Benchmarks:**
- PlanetScale Methodology: https://planetscale.com/blog/benchmarking-postgres
- PlanetScale TPC-C 500GB: https://planetscale.com/benchmarks/instructions/tpcc500g

**Tools:**
- sysbench: https://github.com/akopytov/sysbench
- sysbench-tpcc: https://github.com/Percona-Lab/sysbench-tpcc

**Related CostPlusDB Documentation:**
- `testing/benchmarks/benchmarking-project/README.md` - Benchmarking project overview
- `testing/benchmarks/benchmarking-project/methodology/planetscale-analysis.md` - PlanetScale methodology analysis
- `testing/benchmarks/sysbench-tpcc/README.md` - sysbench-tpcc usage

---

**Document Status:** Active
**Next Review:** After initial baseline benchmarks completed
**Maintained By:** CostPlusDB Operations

**Last Updated:** 2025-10-25
