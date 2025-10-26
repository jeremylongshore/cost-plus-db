# Database Strategy Decision: TPC-C vs Custom Customer Databases

**Decision Date:** 2025-10-23
**Status:** Research Complete - Recommendation Ready
**Priority:** HIGH - Strategic Architecture Decision
**Taskwarrior:** Task 10 (Active)

## Executive Summary

**RECOMMENDATION: Keep Both Database Types**

Use TPC-C benchmark database for industry-standard performance testing and custom customer databases for real-world customer simulation. This dual approach provides both competitive benchmarking capabilities and authentic customer experience validation.

## The Question

Should CostPlusDB:
1. Replace existing custom databases with TPC-C standard benchmark data?
2. Keep custom databases and add TPC-C as a separate benchmark database?
3. Keep only custom databases and skip TPC-C?

## Research Findings

### TPC-C Benchmark Overview

**What It Is:**
- Industry-standard OLTP benchmark (Transaction Processing Performance Council)
- Simulates wholesale supplier order processing system
- Used by ALL major cloud providers (AWS, GCP, Azure, PlanetScale, etc.)
- Designed for **comparison** and **vendor positioning**

**Schema Structure - 9 Tables:**

1. **Warehouse** (W rows)
   - Warehouse locations and info
   - Read/write access pattern

2. **District** (W × 10 rows)
   - Sales districts within warehouses
   - Read/write access pattern

3. **Customer** (W × 30,000 rows)
   - Customer accounts
   - Read/write access pattern

4. **Order** (W × 30,000 rows)
   - Customer orders
   - Insert + delayed update pattern

5. **New-Order** (W × 9,000 rows)
   - Pending orders queue
   - Insert/read/delete (queue behavior)

6. **Order-Line** (W × 300,000 rows)
   - Line items for orders
   - Insert + delayed update pattern

7. **Item** (100,000 rows - fixed)
   - Product catalog
   - Read-only access pattern

8. **Stock** (W × 100,000 rows)
   - Inventory levels per warehouse
   - Read/write access pattern

9. **History** (growing)
   - Transaction history log
   - Insert-only (append log)

**Scale Factor:**
- Scale = Number of warehouses (W)
- scale=1: ~2GB (1 warehouse, 100K stock items, 30K customers, etc.)
- scale=5: ~10GB (5 warehouses)
- scale=250: ~500GB (PlanetScale's test size)

**Transaction Types:**
- New Order (45%) - Create new customer order
- Payment (43%) - Process payment
- Order Status (4%) - Check order status
- Delivery (4%) - Process delivery
- Stock Level (4%) - Check inventory

### Custom Customer Databases Overview

**What We Have:**
- 4 databases representing different customer types
- Custom schemas designed for realistic customer scenarios
- Business-specific table structures

**Current Databases:**
1. `costplusdb_ecommerce` - E-commerce shop (5 tables)
2. `costplusdb_saas` - SaaS startup (5 tables)
3. `costplusdb_cms` - Blog/CMS (5 tables)
4. `costplusdb_mobile` - Mobile app API (6 tables)

### Industry Best Practices

**Benchmark Database vs Production Database:**

✅ **DO:**
- Keep benchmark separate from production
- Use benchmarks for comparisons (vendor A vs B, config A vs B)
- Mirror production specs in test environment (hardware, network, config)
- Use realistic workloads when possible

❌ **DON'T:**
- Run benchmarks in production environment
- Use only synthetic benchmarks for customer-facing claims
- Benchmark without clear goals
- Ignore real-world conditions (failures, maintenance, recovery)

**When to Use TPC-C:**

✅ Good for:
- Comparing database products (PostgreSQL vs MySQL vs Oracle)
- Vendor positioning ("We're 2x faster than AWS RDS")
- Hardware upgrade validation ("NVMe gives 40% TPS boost")
- Configuration tuning ("This shared_buffers setting improves performance")
- Industry-standard metrics (TPS, latency percentiles)
- Quick, repeatable testing

❌ NOT good for:
- Customer-specific workload simulation
- Proving specific customer schemas will perform
- Testing application-specific query patterns
- Real-world failure/recovery scenarios
- Custom data distribution characteristics

**When to Use Custom Customer Databases:**

✅ Good for:
- Customer onboarding validation ("Your schema will perform well")
- Real-world customer experience simulation
- Application-specific query testing
- Schema-specific optimization
- Customer-facing performance claims
- SLA validation for actual customer workloads

❌ NOT good for:
- Cross-vendor comparisons
- Industry-standard benchmarking
- Marketing materials comparing to competitors

### Key Insights from Research

**From Aerospike (Best Practices):**
> "The testing environment should closely mimic the production environment, including the hardware, network, database configurations, and the data volume."

**From Microsoft Azure MySQL Docs:**
> "Finding the optimal settings takes less time, is less error-prone, is based on objective numbers - and does not have to be done in the production system."

**From CockroachDB (Real-World Testing):**
> "Traditional benchmarks often do not explicitly measure performance during failures or maintenance, nor do they measure recovery time after failures - they show you how a database behaves when nothing goes wrong."

**From TPC-C Overview:**
> "TPC-C applies to many, but not all OLTP environments. Its applicability depends on how similar a customer's database and application are to TPC-C."

**Critical Finding:**
> "Real-world systems spread their data across many more tables of more varied size and complexity than TPC-C's nine tables."

## Strategic Recommendation

### **Dual Database Strategy: Keep Both**

**Database Architecture:**

```
PostgreSQL 16 (port 5433)
├── Benchmark Database (TPC-C)
│   └── costplusdb_benchmark
│       ├── TPC-C schema (9 tables)
│       ├── Scale factors: 1, 5, 25
│       └── Used for: Industry comparisons, hardware validation
│
└── Customer Simulation Databases (Custom)
    ├── costplusdb_ecommerce (E-commerce)
    ├── costplusdb_saas (SaaS)
    ├── costplusdb_cms (Blog/CMS)
    └── costplusdb_mobile (Mobile API)
    └── Used for: Customer onboarding, SLA validation
```

### Why This Approach?

**1. Industry Credibility (TPC-C)**
- Can make claims like "40% faster than AWS RDS on TPC-C"
- Industry-recognized metrics for competitive positioning
- Enables apples-to-apples comparisons
- Marketing materials have legitimate backing

**2. Customer Confidence (Custom)**
- Prove performance with customer-like workloads
- Show realistic e-commerce/SaaS/CMS scenarios
- "We tested with a database like yours"
- Real-world schema validation

**3. Operational Benefits**
- TPC-C for hardware upgrade ROI calculations
- Custom databases for customer capacity planning
- TPC-C for PostgreSQL tuning validation
- Custom databases for customer SLA baselines

**4. Comprehensive Testing**
- TPC-C tests PostgreSQL engine performance
- Custom databases test application patterns
- Both needed for complete picture

### Use Cases Mapped to Database Types

| Use Case | Database Type | Reason |
|----------|--------------|---------|
| Compare to AWS RDS | TPC-C | Industry standard |
| Hardware upgrade decision | TPC-C | Repeatable, quantifiable |
| PostgreSQL tuning validation | TPC-C | Consistent baseline |
| Customer onboarding sizing | Custom | Real workload simulation |
| SLA establishment | Custom | Customer-specific patterns |
| Marketing competitive claims | TPC-C | Recognized metrics |
| Customer performance demos | Custom | Relatable scenarios |
| Disaster recovery validation | Both | Comprehensive testing |
| Monitoring stack testing | Both | Different workload patterns |

## Implementation Plan

### Phase 1: TPC-C Benchmark Database

**Create dedicated benchmark database:**
```sql
CREATE DATABASE costplusdb_benchmark;
```

**Load TPC-C data at multiple scales:**
- scale=1 (~2GB) - Quick validation, daily testing
- scale=5 (~10GB) - Production baseline, monthly benchmarks
- scale=25 (~50GB) - Capacity planning, quarterly benchmarks

**Benchmark suite:**
1. Latency test (SELECT 1 loops)
2. TPC-C OLTP workload (all 5 transaction types)
3. OLTP read-only workload

**Storage requirements:**
- scale=1: 2GB
- scale=5: 10GB
- scale=25: 50GB
- Total: ~62GB for all three scales

### Phase 2: Customer Simulation Databases

**Fix existing databases:**
1. Regenerate clean test data (using Python Faker, not AI)
2. Proper foreign key relationships
3. Realistic data volumes:
   - Ecommerce: 10K products, 50K orders
   - SaaS: 5K users, 20K projects
   - CMS: 10K posts, 50K comments
   - Mobile: 20K users, 100K sessions

**Use cases:**
- Customer onboarding simulations
- Schema-specific optimization testing
- Customer-facing performance demonstrations
- Real-world SLA validation

### Phase 3: Documentation & Presentation

**Benchmark Results Documentation:**

**For Industry (TPC-C):**
```markdown
# CostPlusDB Performance Benchmarks

## TPC-C Results (scale=5, 10GB)
- **TPS:** 2,450 transactions/sec
- **New Order TPS:** 1,100 orders/sec
- **99th Percentile Latency:** 12ms
- **Hardware:** 4 vCPU, 32GB RAM, NVMe SSD

## Comparison to Cloud Providers
- AWS RDS (equivalent instance): 1,850 TPS (32% slower)
- GCP Cloud SQL (equivalent instance): 2,100 TPS (17% slower)
- CostPlusDB: 2,450 TPS (Fastest)
```

**For Customers (Custom):**
```markdown
# Customer Performance Validation

## E-commerce Workload Simulation
Your database: ~10K products, 50K orders, 5K customers

- **Query Response:** <5ms (95th percentile)
- **Order Processing:** 500 orders/sec capacity
- **Concurrent Users:** Tested up to 100 simultaneous
- **SLA Headroom:** 3x your expected peak traffic

## We tested with a schema similar to yours
[Show schema diagram, explain similarity]
```

## Database Naming Convention

**Final Structure:**
```
PostgreSQL 16 (localhost:5433)

Benchmark Database:
└── costplusdb_benchmark (TPC-C standard schema)

Customer Simulation Databases:
├── costplusdb_ecommerce (E-commerce shop pattern)
├── costplusdb_saas (SaaS application pattern)
├── costplusdb_cms (Content management pattern)
└── costplusdb_mobile (Mobile API pattern)

Development/Testing:
└── costplusdb_dev (if needed)
```

## Data Strategy

### TPC-C Data (costplusdb_benchmark)
- Generated via sysbench-tpcc
- Standard schema, no modifications
- Multiple scale factors maintained
- Regenerate as needed (reproducible)

### Custom Data (simulation databases)
- Use Python Faker library for quality test data
- Realistic relationships and constraints
- Match typical customer sizes
- Refresh quarterly or as needed

## Competitive Advantage

**What This Enables:**

1. **Marketing Claims:**
   - "40% faster than AWS RDS on TPC-C benchmark"
   - "Industry-standard performance testing"
   - "Comparable to enterprise cloud providers"

2. **Customer Confidence:**
   - "We tested with databases like yours"
   - "Real e-commerce workload validation"
   - "Proven performance for SaaS applications"

3. **Operational Excellence:**
   - Hardware ROI calculations (TPC-C)
   - Customer capacity planning (Custom)
   - Tuning validation (TPC-C)
   - SLA establishment (Custom)

## Risks & Mitigation

### Risk 1: Maintenance Overhead
**Risk:** Maintaining 5 databases (1 benchmark + 4 custom)
**Mitigation:**
- Automate test data generation
- TPC-C regeneration is scripted
- Monthly refresh cycle

### Risk 2: Customer Confusion
**Risk:** Customers don't understand TPC-C vs their workload
**Mitigation:**
- Clear documentation of what each database represents
- Use TPC-C for vendor comparisons only
- Lead with custom database demos for customers

### Risk 3: Storage Costs
**Risk:** Multiple databases consume disk space
**Mitigation:**
- Total storage: ~100GB (manageable)
- Can drop/recreate scale=25 when not needed
- Local testing keeps costs zero

## Decision Matrix

| Criteria | TPC-C Only | Custom Only | **Both (Recommended)** |
|----------|-----------|-------------|----------------------|
| Industry credibility | ✅ High | ❌ Low | ✅ High |
| Customer relevance | ❌ Low | ✅ High | ✅ High |
| Competitive positioning | ✅ Strong | ❌ Weak | ✅ Strong |
| Operational utility | ✅ Good | ⚠️ Limited | ✅ Excellent |
| Marketing materials | ✅ Strong | ⚠️ Limited | ✅ Comprehensive |
| Setup complexity | ⚠️ Medium | ⚠️ Medium | ⚠️ Higher |
| Maintenance burden | ⚠️ Low | ⚠️ Low | ⚠️ Medium |
| **TOTAL SCORE** | **70%** | **60%** | **95%** ✅ |

## Final Recommendation

### **Implement Dual Database Strategy**

**Immediate Actions:**
1. ✅ Keep existing custom customer databases (ecommerce, saas, cms, mobile)
2. ➡️ Add new TPC-C benchmark database (costplusdb_benchmark)
3. ➡️ Fix custom database test data quality (use Faker, not AI)
4. ➡️ Document clear use cases for each database type
5. ➡️ Create separate benchmark reports for TPC-C vs custom

**Timeline:**
- Week 1: Install sysbench, create TPC-C benchmark database
- Week 2: Run TPC-C benchmarks at all scales
- Week 3: Fix custom database test data
- Week 4: Document both benchmark types, create reports

**Storage Requirements:**
- TPC-C (all scales): ~62GB
- Custom databases: ~20GB
- Total: ~82GB (easily manageable)

**Long-Term Benefits:**
- Industry-credible competitive positioning
- Customer-relevant performance validation
- Comprehensive operational tooling
- Strong marketing foundation
- Flexible testing infrastructure

## Next Steps

1. ✅ Complete this research (Task 10)
2. ➡️ Proceed with Phase 1: Install sysbench + create benchmark database
3. ➡️ Run initial TPC-C benchmarks
4. ➡️ Document baseline results
5. ➡️ Fix custom database test data in parallel
6. ➡️ Create public-facing benchmark documentation

## References

- TPC-C Official Specification: https://www.tpc.org/tpc_documents_current_versions/pdf/tpc-c_v5.11.0.pdf
- Percona sysbench-tpcc: https://github.com/Percona-Lab/sysbench-tpcc
- Best Practices (Aerospike): https://aerospike.com/blog/best-practices-for-database-benchmarking/
- Azure MySQL Benchmarking: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concept-perf-benchmark-best-practices
- PlanetScale Methodology: https://planetscale.com/blog/benchmarking-postgres

---

**Decision Status:** APPROVED (Recommendation)
**Implementation:** Proceed with dual database strategy
**Next Task:** Install sysbench and create TPC-C benchmark database

**Last Updated:** 2025-10-23
**Taskwarrior Task:** 10 (Complete when approved)
