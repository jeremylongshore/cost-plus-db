# Local Customer Database Testing Setup

## Overview

This directory contains scripts and configurations for setting up 5 local PostgreSQL databases representing real Shared tier ($59/mo) customers with different use cases.

**Goal:** Prove CostPlusDB operations work with realistic data before acquiring real customers.

## The 5 Test Databases

All databases simulate **Shared tier** customers with different workload patterns:

| Database | Use Case | Schema Focus | Data Volume |
|----------|----------|--------------|-------------|
| `costplusdb_customer1` | E-commerce Shop | Products, Orders, Customers | 10K products, 50K orders |
| `costplusdb_customer2` | SaaS Startup | Users, Subscriptions, Events | 5K users, 100K events |
| `costplusdb_customer3` | Blog/CMS | Posts, Comments, Media | 20K posts, 100K comments |
| `costplusdb_customer4` | Mobile App API | Users, Sessions, Logs | 10K users, 500K API calls |
| `costplusdb_customer5` | Analytics Platform | Events, Metrics, Reports | 250K events |

## Directory Structure

```
testing/local-customer-databases/
├── README.md                    # This file
├── scripts/
│   ├── 01-setup-databases.sh   # Creates 5 local PostgreSQL databases
│   ├── 02-import-data.sh       # Imports generated SQL data
│   └── 03-verify-setup.sh      # Verifies all databases are ready
├── schemas/
│   ├── customer1-ecommerce.sql      # Schema definitions
│   ├── customer2-saas.sql
│   ├── customer3-cms.sql
│   ├── customer4-mobile.sql
│   └── customer5-analytics.sql
├── vertex-ai/
│   ├── generate-test-data.py   # Vertex AI script to generate data
│   └── requirements.txt        # Python dependencies
└── sql-output/
    └── (Generated SQL files go here)
```

## Quick Start

### Prerequisites

- PostgreSQL 16 installed locally
- Python 3.8+
- Google Cloud account with Vertex AI enabled
- `gcloud` CLI configured

### Step 1: Setup Local Databases

```bash
cd testing/local-customer-databases
./scripts/01-setup-databases.sh
```

This creates 5 empty databases with schemas.

### Step 2: Generate Test Data with Vertex AI

```bash
cd vertex-ai
pip install -r requirements.txt
python generate-test-data.py
```

This uses **your free Vertex AI quota** to generate realistic data for all 5 databases. Output goes to `sql-output/`.

### Step 3: Import Generated Data

```bash
./scripts/02-import-data.sh
```

Imports all Vertex AI-generated data into the 5 local databases.

### Step 4: Verify Setup

```bash
./scripts/03-verify-setup.sh
```

Checks all databases have data and are ready for testing.

## What You Can Test

Once setup is complete, you can:

- ✅ **Backup/Restore:** Practice pgBackRest procedures
- ✅ **Monitoring:** Set up Betterstack alerts
- ✅ **Performance:** Run queries, check resource usage
- ✅ **Migrations:** Practice customer onboarding
- ✅ **Incidents:** Simulate failures and recovery
- ✅ **Documentation:** Validate your SOPs work

## Cost

- **Local PostgreSQL:** Free (uses your machine)
- **Vertex AI data generation:** Free (within quota)
- **Total:** $0

## Next Steps

After validating Shared tier works:
1. Test with Dedicated tier specs (separate databases)
2. Test with Pro tier (larger datasets)
3. Test with Enterprise tier (HA, replicas)

---

**Last Updated:** 2025-10-21
