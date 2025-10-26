# CostPlusDB Public Benchmark Execution Plan

**Document Type:** Test Plan - Public Transparency Report
**Created:** 2025-10-25
**Status:** Ready for Execution
**Purpose:** Industry-standard performance benchmarking for public website posting

---

## Executive Summary

This document defines CostPlusDB's **transparent, reproducible benchmark methodology** following industry standards used by AWS RDS, Google Cloud SQL, and PlanetScale. All results will be published on costplusdb.dev for customer transparency.

**Benchmark Strategy:** Dual-benchmark approach (pgbench + sysbench-tpcc)
**Comparison Targets:** AWS RDS, Google Cloud SQL, DigitalOcean, PlanetScale
**Publication:** All results, configurations, and methodology published publicly

---

## Test Environment Specifications

### Hardware Configuration

**Server:**
- **CPU:** AMD EPYC Processor (x86_64)
- **Cores:** (vCPU count TBD)
- **RAM:** 23 GB
- **Storage:** 387 GB (144 GB used, 243 GB free)
- **Storage Type:** (SSD/NVMe TBD)
- **Network:** Localhost testing (eliminates network latency)

**Operating System:**
- **OS:** Ubuntu 24.04 LTS
- **Kernel:** Linux 6.8.0-86-generic

### PostgreSQL Configuration

**Version:** PostgreSQL 16.10 (Ubuntu 16.10-1.pgdg24.04+1)

**Key Settings:**
```
shared_buffers = 128MB
work_mem = 4MB
effective_cache_size = 4GB
max_connections = 100
```

**Configuration Philosophy:** Default PostgreSQL configuration (no custom tuning)
- **Why?** Fair comparison with cloud providers who use defaults
- **Matches:** PlanetScale methodology (no cherry-picked optimizations)

### Benchmark Tools

**Tool 1: pgbench**
- Version: 16.10 (built-in with PostgreSQL)
- Workload: TPC-B-like (banking transactions)
- Standard: PostgreSQL official benchmarking tool

**Tool 2: sysbench-tpcc**
- Version: Latest from Percona Lab
- Workload: TPC-C-like (e-commerce/supply chain)
- Standard: Cloud provider industry standard
- Repository: https://github.com/Percona-Lab/sysbench-tpcc

**Tool 3: Custom Latency Test**
- Simple SELECT 1 queries (1000 iterations)
- Methodology: PlanetScale latency testing
- Measures: Connection overhead and baseline responsiveness

---

## Benchmark Test Matrix

### Test Suite 1: pgbench (PostgreSQL Official)

#### Test 1A: TPC-B Default Workload (Shared Tier)
```bash
# Initialize (scale=50 ≈ 750MB)
pgbench -i -s 50 postgresql://postgres@localhost:5433/costplusdb_benchmark

# Test: 10 clients, 60 seconds
pgbench -c 10 -j 2 -T 60 postgresql://postgres@localhost:5433/costplusdb_benchmark

# Test: 20 clients, 60 seconds
pgbench -c 20 -j 4 -T 60 postgresql://postgres@localhost:5433/costplusdb_benchmark
```

**Expected Metrics:**
- TPS (transactions per second)
- Latency average (ms)
- Latency p95, p99 (ms)

**Target:** >500 TPS, <20ms average latency

#### Test 1B: TPC-B Default Workload (Dedicated Tier)
```bash
# Initialize (scale=100 ≈ 1.5GB)
pgbench -i -s 100 postgresql://postgres@localhost:5433/costplusdb_benchmark

# Test: 10 clients, 300 seconds
pgbench -c 10 -j 2 -T 300 postgresql://postgres@localhost:5433/costplusdb_benchmark

# Test: 50 clients, 300 seconds
pgbench -c 50 -j 4 -T 300 postgresql://postgres@localhost:5433/costplusdb_benchmark
```

**Expected Metrics:**
- TPS (transactions per second)
- Latency average, p95, p99 (ms)
- Sustained performance over 5 minutes

**Target:** >1000 TPS, <10ms average latency

#### Test 1C: SELECT-Only Workload (Read-Heavy)
```bash
# Test: Read-only workload, 50 clients
pgbench -S -c 50 -j 4 -T 60 postgresql://postgres@localhost:5433/costplusdb_benchmark
```

**Expected Metrics:**
- Read TPS (queries per second)
- Read latency (ms)
- Cache hit ratio

**Purpose:** Measure read performance for caching efficiency

#### Test 1D: Simple-Update Workload (Write-Heavy)
```bash
# Test: Write-heavy workload, 50 clients
pgbench -N -c 50 -j 4 -T 60 postgresql://postgres@localhost:5433/costplusdb_benchmark
```

**Expected Metrics:**
- Write TPS
- Write latency (ms)
- Disk I/O performance

**Purpose:** Measure write performance and disk throughput

### Test Suite 2: sysbench-tpcc (Cloud Industry Standard)

**Note:** Requires sysbench installation (`sudo apt-get install sysbench`)

#### Test 2A: TPC-C Small Scale (Validation)
```bash
cd testing/benchmarks/sysbench-tpcc

# Prepare: scale=1 ≈ 2GB database
./tpcc.lua --pgsql-host=localhost --pgsql-port=5433 \
  --pgsql-user=postgres --pgsql-db=costplusdb_benchmark \
  --threads=4 --tables=10 --scale=1 --time=300 \
  --report-interval=10 --db-driver=pgsql prepare

# Run: 4 threads, 5 minutes
./tpcc.lua --pgsql-host=localhost --pgsql-port=5433 \
  --pgsql-user=postgres --pgsql-db=costplusdb_benchmark \
  --threads=4 --tables=10 --scale=1 --time=300 \
  --report-interval=10 --db-driver=pgsql run
```

**Expected Metrics:**
- New Order TPS (primary TPC-C metric)
- Total TPS (all 5 transaction types)
- 99th percentile latency (ms)
- Errors/deadlocks

**Target:** >100 New Order TPS, <100ms p99 latency

#### Test 2B: TPC-C Medium Scale (Production Baseline)
```bash
# Prepare: scale=5 ≈ 10GB database
./tpcc.lua --pgsql-host=localhost --pgsql-port=5433 \
  --pgsql-user=postgres --pgsql-db=costplusdb_benchmark \
  --threads=8 --tables=10 --scale=5 --time=600 \
  --report-interval=10 --db-driver=pgsql run

# Run: 8 threads, 10 minutes
./tpcc.lua --pgsql-host=localhost --pgsql-port=5433 \
  --pgsql-user=postgres --pgsql-db=costplusdb_benchmark \
  --threads=8 --tables=10 --scale=5 --time=600 \
  --report-interval=10 --db-driver=pgsql run
```

**Expected Metrics:**
- New Order TPS
- Total TPS
- 99th percentile latency
- Sustained performance over 10 minutes

**Target:** >500 New Order TPS, <100ms p99 latency

### Test Suite 3: Latency Testing (PlanetScale Methodology)

```bash
# Create latency test script
cat > /tmp/latency_test.sh << 'EOF'
#!/bin/bash
for i in {1..1000}; do
  /usr/bin/time -f "%e" psql postgresql://postgres@localhost:5433/postgres \
    -c "SELECT 1;" -t > /dev/null 2>> /tmp/latency_results.txt
done
EOF

chmod +x /tmp/latency_test.sh
/tmp/latency_test.sh

# Analyze results (calculate p50, p95, p99)
sort -n /tmp/latency_results.txt | awk '
  {times[NR] = $1}
  END {
    print "Median (p50):", times[int(NR*0.5)]
    print "p95:", times[int(NR*0.95)]
    print "p99:", times[int(NR*0.99)]
  }
'
```

**Expected Metrics:**
- Median latency (p50)
- 95th percentile latency (p95)
- 99th percentile latency (p99)

**Target:** <5ms median, <10ms p95, <20ms p99

---

## Execution Schedule & Timeline

### Phase 1: Environment Preparation (30 minutes)
- [ ] Install sysbench: `sudo apt-get install sysbench`
- [ ] Verify PostgreSQL connection
- [ ] Clear/reset costplusdb_benchmark database
- [ ] Document exact hardware specs (CPU cores, disk type)
- [ ] Record PostgreSQL configuration

### Phase 2: pgbench Baseline Tests (2 hours)
- [ ] Test 1A: Shared tier (scale=50, 10 clients, 20 clients)
- [ ] Test 1B: Dedicated tier (scale=100, 10 clients, 50 clients)
- [ ] Test 1C: SELECT-only workload
- [ ] Test 1D: Simple-update workload
- [ ] Record all results in structured format

### Phase 3: sysbench-tpcc Tests (4 hours)
- [ ] Test 2A: Small scale (scale=1, 4 threads)
- [ ] Test 2B: Medium scale (scale=5, 8 threads)
- [ ] Record all results
- [ ] Compare to published PlanetScale/AWS results

### Phase 4: Latency Tests (15 minutes)
- [ ] Run 1000-iteration latency test
- [ ] Calculate percentiles (p50, p95, p99)
- [ ] Compare to cloud provider baselines

### Phase 5: Results Documentation (2 hours)
- [ ] Compile all results into single report
- [ ] Create comparison tables vs AWS/GCP/PlanetScale
- [ ] Calculate cost-per-TPS for pricing transparency
- [ ] Generate charts/graphs for website

**Total Estimated Time:** 8-9 hours

---

## Cloud Provider Comparison Methodology

### Comparison Targets

**AWS RDS PostgreSQL:**
- Instance: db.t3.medium (2 vCPU, 4GB RAM) - $60/month
- Instance: db.t3.large (2 vCPU, 8GB RAM) - $120/month
- Published benchmarks: (TBD - research AWS RDS performance data)

**Google Cloud SQL PostgreSQL:**
- Instance: db-n1-standard-2 (2 vCPU, 7.5GB RAM) - $100/month
- Published benchmarks: (TBD - research GCP performance data)

**DigitalOcean Managed PostgreSQL:**
- Instance: Basic (2GB RAM) - $15/month
- Instance: Professional (8GB RAM) - $120/month
- Published benchmarks: (TBD - research DO performance data)

**PlanetScale (MySQL, for reference):**
- Instance: i8g M-320 (4 vCPU, 32GB RAM)
- Benchmark: TPC-C scale=250 (500GB)
- Results: Published at planetscale.com/blog/benchmarking-postgres

### Comparison Metrics

**Performance Metrics:**
- TPS (transactions per second)
- New Order TPS (TPC-C)
- Latency (p50, p95, p99)
- Read throughput (QPS)

**Cost-Efficiency Metrics:**
- Cost per TPS ($/month ÷ TPS)
- Performance per dollar
- Total cost of ownership (3-year)

**Transparency Metrics:**
- Configuration published? (Yes/No)
- Benchmark methodology published? (Yes/No)
- Raw results published? (Yes/No)

---

## Results Publication Format

### Website Transparency Page Structure

```
costplusdb.dev/benchmarks/
├── index.html                  # Overview and summary
├── methodology.html            # Complete methodology
├── results-pgbench.html        # pgbench results
├── results-sysbench-tpcc.html  # TPC-C results
├── comparison-aws.html         # vs AWS RDS
├── comparison-gcp.html         # vs Google Cloud SQL
└── raw-data/                   # Downloadable CSV/JSON
    ├── pgbench-raw.csv
    ├── tpcc-raw.csv
    └── environment-spec.json
```

### Required Data Points (for each benchmark)

**Environment:**
- Date/time of test
- PostgreSQL version
- Hardware specs (CPU, RAM, disk)
- OS version
- PostgreSQL configuration (all relevant settings)

**Results:**
- All metrics (TPS, latency, throughput)
- Percentiles (p50, p95, p99, p999)
- Error rates
- Resource utilization (CPU%, RAM%, disk I/O)

**Comparison:**
- Equivalent cloud provider instance
- Performance delta (% faster/slower)
- Cost delta ($/month savings)
- Cost-per-TPS comparison

---

## Quality Assurance Checklist

### Before Running Benchmarks

- [ ] PostgreSQL restarted (clean state)
- [ ] OS page cache cleared: `sync; echo 3 > /proc/sys/vm/drop_caches` (requires sudo)
- [ ] No other heavy processes running
- [ ] Sufficient disk space (>100GB free)
- [ ] All monitoring tools ready

### During Benchmarks

- [ ] Monitor CPU utilization (should be <80%)
- [ ] Monitor RAM usage (no swapping)
- [ ] Monitor disk I/O
- [ ] Watch for errors in PostgreSQL logs
- [ ] Record resource utilization

### After Benchmarks

- [ ] Verify results are within expected ranges
- [ ] Check for anomalies (spikes, errors)
- [ ] Run each test 3 times for consistency
- [ ] Document any issues encountered
- [ ] Save all raw output

---

## Result Interpretation Guidelines

### Good Performance Indicators

**pgbench:**
- TPS > 1000 for Dedicated tier
- Latency average < 10ms
- Low latency standard deviation (<5ms)
- Consistent performance across runs

**sysbench-tpcc:**
- New Order TPS > 500 for Dedicated tier
- 99th percentile latency < 100ms
- Zero errors/deadlocks
- Stable performance over 10+ minute runs

**Latency Test:**
- Median < 5ms
- p95 < 10ms
- p99 < 20ms

### Performance Red Flags

- TPS drops >10% between runs (inconsistent)
- Latency spikes (high standard deviation)
- Errors or deadlocks during benchmarks
- CPU or disk at 100% utilization
- Memory swapping

### When to Re-run Tests

- Results differ >15% from expected
- Errors occurred during benchmark
- System resources were constrained
- PostgreSQL logs show issues

---

## Competitive Positioning Strategy

### CostPlusDB Transparency Advantage

**What We Publish:**
- ✅ Complete hardware specifications
- ✅ Exact PostgreSQL configuration (all settings)
- ✅ Full benchmark methodology (reproducible)
- ✅ Raw benchmark results (CSV/JSON downloads)
- ✅ Comparison methodology (apples-to-apples)
- ✅ Cost breakdowns (infrastructure cost + margin)

**What Competitors Hide:**
- ❌ Exact hardware specs (vague "compute units")
- ❌ Database configuration (optimized for benchmarks?)
- ❌ Benchmark methodology (cherry-picked results?)
- ❌ Raw data (only aggregate numbers)
- ❌ Infrastructure costs (hidden markup)

### Messaging for Website

**Headline:** "Transparent Performance Benchmarks"

**Key Points:**
- "We publish everything competitors hide"
- "Industry-standard benchmarks (pgbench + TPC-C)"
- "Default configurations (no cherry-picked tuning)"
- "Reproducible methodology (run it yourself)"
- "Cost-per-performance transparency"

**Call-to-Action:**
- Download raw benchmark data
- Compare to your current provider
- Run benchmarks on your workload
- See our infrastructure costs

---

## Post-Benchmark Actions

### Documentation

1. Create comprehensive results report (000-docs/075-TQ-TEST-benchmark-results-YYYY-MM-DD.md)
2. Update website transparency page
3. Create comparison charts/graphs
4. Publish raw data (CSV/JSON)

### Marketing

1. Write blog post: "Our Benchmark Results vs AWS/GCP"
2. Social media posts with key findings
3. Update pricing calculator with performance data
4. Email existing customers with results

### Operations

1. Establish monthly benchmark schedule
2. Set up performance monitoring/alerting
3. Create automated benchmark scripts
4. Document baseline for future comparisons

---

## Appendix A: Benchmark Commands Reference

### Complete pgbench Test Sequence

```bash
# Shared Tier (scale=50)
pgbench -i -s 50 postgresql://postgres@localhost:5433/costplusdb_benchmark
pgbench -c 10 -j 2 -T 60 -P 10 postgresql://postgres@localhost:5433/costplusdb_benchmark
pgbench -c 20 -j 4 -T 60 -P 10 postgresql://postgres@localhost:5433/costplusdb_benchmark

# Dedicated Tier (scale=100)
pgbench -i -s 100 postgresql://postgres@localhost:5433/costplusdb_benchmark
pgbench -c 10 -j 2 -T 300 -P 30 postgresql://postgres@localhost:5433/costplusdb_benchmark
pgbench -c 50 -j 4 -T 300 -P 30 postgresql://postgres@localhost:5433/costplusdb_benchmark

# Read-only test
pgbench -S -c 50 -j 4 -T 60 -P 10 postgresql://postgres@localhost:5433/costplusdb_benchmark

# Write-only test
pgbench -N -c 50 -j 4 -T 60 -P 10 postgresql://postgres@localhost:5433/costplusdb_benchmark
```

### Complete sysbench-tpcc Test Sequence

```bash
cd testing/benchmarks/sysbench-tpcc

# Small scale (scale=1)
./tpcc.lua --pgsql-host=localhost --pgsql-port=5433 --pgsql-user=postgres \
  --pgsql-db=costplusdb_benchmark --threads=4 --tables=10 --scale=1 \
  --time=300 --report-interval=10 --db-driver=pgsql prepare

./tpcc.lua --pgsql-host=localhost --pgsql-port=5433 --pgsql-user=postgres \
  --pgsql-db=costplusdb_benchmark --threads=4 --tables=10 --scale=1 \
  --time=300 --report-interval=10 --db-driver=pgsql run

# Medium scale (scale=5)
./tpcc.lua --pgsql-host=localhost --pgsql-port=5433 --pgsql-user=postgres \
  --pgsql-db=costplusdb_benchmark --threads=8 --tables=10 --scale=5 \
  --time=600 --report-interval=10 --db-driver=pgsql prepare

./tpcc.lua --pgsql-host=localhost --pgsql-port=5433 --pgsql-user=postgres \
  --pgsql-db=costplusdb_benchmark --threads=8 --tables=10 --scale=5 \
  --time=600 --report-interval=10 --db-driver=pgsql run

# Cleanup
./tpcc.lua --pgsql-host=localhost --pgsql-port=5433 --pgsql-user=postgres \
  --pgsql-db=costplusdb_benchmark --tables=10 --scale=5 \
  --db-driver=pgsql cleanup
```

---

## Appendix B: Cloud Provider Research Links

**AWS RDS PostgreSQL:**
- https://aws.amazon.com/rds/postgresql/
- https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html
- Search: "AWS RDS PostgreSQL benchmark results"

**Google Cloud SQL:**
- https://cloud.google.com/sql/postgresql
- https://cloud.google.com/sql/docs/postgres/benchmarks
- Search: "Google Cloud SQL PostgreSQL performance"

**PlanetScale:**
- https://planetscale.com/blog/benchmarking-postgres
- https://planetscale.com/benchmarks/instructions/tpcc500g

**Industry Benchmarks:**
- TPC-C Official: https://www.tpc.org/tpcc/
- PostgreSQL Wiki: https://wiki.postgresql.org/wiki/Performance_Optimization

---

**Document Status:** Ready for Execution
**Prerequisites:** sysbench installation required
**Estimated Duration:** 8-9 hours for complete test suite
**Next Action:** Install sysbench and begin Phase 1

**Created:** 2025-10-25
**Last Updated:** 2025-10-25
**Maintained By:** CostPlusDB Operations
