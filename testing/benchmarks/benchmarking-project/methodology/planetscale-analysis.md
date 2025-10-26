# PlanetScale PostgreSQL Benchmarking Methodology Analysis

**Source:** https://planetscale.com/blog/benchmarking-postgres
**Analyzed:** 2025-10-23
**Relevance:** Enterprise-grade benchmarking framework for CostPlusDB

## Overview

PlanetScale's benchmarking methodology provides a transparent, repeatable framework for comparing PostgreSQL performance across cloud providers. Their approach balances fairness, real-world applicability, and competitive analysis.

## Core Principles

### 1. Transparency & Reproducibility
- All instructions publicly documented
- Configurations left at platform defaults
- Open to vendor feedback (benchmarks@planetscale.com)
- No cherry-picking of favorable results

### 2. Fair Comparison Standards
- Competitor instances match or exceed PlanetScale specs
- Same region testing (network parity)
- Identical workload parameters
- No vendor-specific optimizations

### 3. Real-World Relevance
- Multiple workload types (not just synthetic benchmarks)
- Focus on OLTP patterns (typical database usage)
- Cache behavior testing (read-heavy scenarios)
- Latency percentiles (user experience metrics)

## Three Benchmark Types

### Benchmark 1: Latency Test
**Purpose:** Measure baseline responsiveness

**Method:** Repeated `SELECT 1;` queries from same-region instances

**Metrics:**
- Median latency
- 95th percentile latency
- 99th percentile latency

**What It Reveals:**
- Network overhead
- Connection pooling efficiency
- Database process scheduling
- Infrastructure baseline performance

**CostPlusDB Application:**
- Validate local vs remote database performance
- Measure impact of pgBouncer connection pooling
- Establish SLA baselines for customer response times

### Benchmark 2: TPC-C Workload
**Purpose:** Test transactional (OLTP) performance under realistic load

**Configuration:**
- 20 tables (warehouses, customers, orders, etc.)
- Scale factor 250 = ~500GB database
- Mixed read/write operations
- Concurrent thread testing

**Metrics:**
- Transactions per second (TPS)
- New order TPS (primary metric)
- 99th percentile latency
- Throughput under sustained load

**What It Reveals:**
- Write performance and durability
- Index efficiency
- Lock contention handling
- Multi-user concurrency capacity

**CostPlusDB Application:**
- Simulate customer database workloads
- Test capacity for multiple concurrent customers
- Validate hardware sizing for customer tiers
- Benchmark before/after PostgreSQL tuning

### Benchmark 3: OLTP Read-Only Workload
**Purpose:** Isolate read performance and caching efficiency

**Configuration:**
- sysbench OLTP read-only test
- 80%+ read operations
- Tests query cache effectiveness

**Metrics:**
- Queries per second (QPS)
- Read throughput
- Cache hit ratios
- Read latency distribution

**What It Reveals:**
- PostgreSQL shared_buffers efficiency
- OS page cache utilization
- Query plan optimization
- Disk I/O vs memory performance

**CostPlusDB Application:**
- Optimize PostgreSQL memory settings
- Validate SSD/NVMe upgrade benefits
- Test read replica performance
- Benchmark analytical workloads

## PlanetScale Test Environment

**Hardware Specs:**
- Instance: i8g M-320
- vCPUs: 4
- RAM: 32GB
- Storage: 937GB NVMe
- Configuration: Primary + 2 replicas across 3 AZs

**Database Configuration:**
- PostgreSQL defaults (no custom tuning)
- Ensures fair comparison across providers

## Key Metrics Tracked

### Latency Metrics
- **Median (p50):** Typical user experience
- **95th percentile (p95):** Good user experience threshold
- **99th percentile (p99):** Worst-case acceptable performance

### Throughput Metrics
- **TPS (Transactions/sec):** Overall system capacity
- **QPS (Queries/sec):** Read operation capacity
- **New Order TPS:** TPC-C primary benchmark metric

### Cost-Efficiency Metrics
- **Price-to-performance ratio:** Cost per TPS
- **Resource utilization:** CPU/memory efficiency under load

## Methodology Limitations (Acknowledged by PlanetScale)

"No single benchmark can capture the performance characteristics of all database workloads."

**Factors Not Fully Captured:**
- Application-specific query patterns
- Schema design impact
- Data distribution characteristics
- Backup/restore performance
- Replication lag behavior
- Point-in-time recovery speed

**Implication for CostPlusDB:**
We should supplement these benchmarks with:
- Customer-specific schema testing
- Backup/restore benchmarks (pgBackRest)
- Failover testing with replicas
- Real customer workload replay

## Adaptation for CostPlusDB Scale

### Scale Factor Adjustments

| PlanetScale | CostPlusDB Equivalent | Use Case |
|-------------|----------------------|----------|
| scale=250 (500GB) | scale=1 (2GB) | Quick validation |
| scale=250 (500GB) | scale=5 (10GB) | Customer simulation |
| scale=250 (500GB) | scale=25 (50GB) | Capacity planning |

### Thread Count Adjustments

| PlanetScale (4 vCPU) | CostPlusDB Recommended |
|---------------------|------------------------|
| 4-8 threads | Start with 4 threads |
| 16-32 threads (stress) | Test up to 16 threads |

### Time Duration Adjustments

| PlanetScale | CostPlusDB |
|-------------|------------|
| 300 seconds (5 min) | 300 seconds (keep same) |
| Prep time: Hours | Prep time: 10-60 minutes |

## Implementation Checklist

- [ ] Install sysbench 1.0.20+
- [ ] Clone Percona TPC-C scripts
- [ ] Create benchmark database (costplusdb_benchmark)
- [ ] Run latency test (baseline)
- [ ] Run TPC-C at scale=1 (validation)
- [ ] Run TPC-C at scale=5 (production baseline)
- [ ] Run OLTP read-only test
- [ ] Document baseline results
- [ ] Create monthly benchmark automation
- [ ] Integrate with monitoring (Prometheus/Grafana)

## References

- PlanetScale Blog: https://planetscale.com/blog/benchmarking-postgres
- TPC-C Instructions: https://planetscale.com/benchmarks/instructions/tpcc500g
- Percona TPC-C: https://github.com/Percona-Lab/sysbench-tpcc
- sysbench: https://github.com/akopytov/sysbench

---

**Last Updated:** 2025-10-23
**Next Review:** After Phase 1 implementation
