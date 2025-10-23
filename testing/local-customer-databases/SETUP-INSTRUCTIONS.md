# CostPlusDB Test Databases Setup Instructions

## Status
- ✅ SQL data generated: 7.6MB across 5 databases
- ✅ PostgreSQL 18 installed and running on port 5433
- ⏳ Ready to create local test databases

## Quick Setup

### Step 1: Configure PostgreSQL Authentication

PostgreSQL is running but requires password authentication. You have two options:

**Option A: Use peer authentication (easiest for local testing)**

Edit `/etc/postgresql/18/main/pg_hba.conf` and change:
```
# From:
local   all             all                                     peer

# To:
local   all             all                                     trust
```

Then restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

**Option B: Set a password for your user**

```bash
sudo -u postgres psql -p 5433
CREATE USER admincostplus WITH SUPERUSER PASSWORD 'your_password';
\q
```

### Step 2: Run the Setup Script

```bash
cd /home/admincostplus/projects/costplusdb/testing/local-customer-databases
./setup-databases.sh
```

This will:
1. Create 4 PostgreSQL databases:
   - `costplusdb_customer1` - E-commerce Shop (768KB)
   - `costplusdb_customer2` - SaaS Startup (2.5MB)
   - `costplusdb_customer3` - Blog/CMS (1.8MB)
   - `costplusdb_customer4` - Mobile App API (1.9MB)

2. Import all generated SQL data into each database

3. Verify data was loaded correctly

### Step 3: Connect to Test Databases

```bash
# E-commerce database
psql -h localhost -p 5433 -U admincostplus costplusdb_customer1

# SaaS database
psql -h localhost -p 5433 -U admincostplus costplusdb_customer2

# Blog/CMS database
psql -h localhost -p 5433 -U admincostplus costplusdb_customer3

# Mobile App database
psql -h localhost -p 5433 -U admincostplus costplusdb_customer4
```

## Database Contents

### Customer 1 - E-commerce Shop (768KB)
- `products` - 500 rows
- `customers` - 300 rows
- `orders` - 1,000 rows
- `order_items` - 2,000 rows
- `addresses` - 400 rows

### Customer 2 - SaaS Startup (2.5MB)
- `users` - 300 rows
- `subscriptions` - 300 rows
- `projects` - 200 rows
- `tasks` - 800 rows
- `events` - 3,000 rows

### Customer 3 - Blog/CMS (1.8MB)
- `authors` - 50 rows
- `categories` - 30 rows
- `posts` - 500 rows
- `comments` - 2,000 rows
- `media` - 400 rows

### Customer 4 - Mobile App API (1.9MB)
- `app_users` - 300 rows
- `sessions` - 1,000 rows
- `api_logs` - 2,000 rows
- `push_notifications` - 500 rows
- `user_content` - 400 rows
- `interactions` - 1,000 rows

## Testing Use Cases

Once databases are set up, you can test:
- **Backup procedures** - pgBackRest full/incremental backups
- **Point-in-time recovery** - WAL archiving and restore
- **Query performance** - pg_stat_statements analysis
- **Monitoring** - Connection counts, slow queries, resource usage
- **Security** - SSL connections, user permissions, firewall rules
- **Migration** - pg_dump/restore procedures
- **Replication** - Streaming replication setup (future)

## Next Steps

After local databases are verified:
1. Test pgBackRest backup/restore with realistic data
2. Configure monitoring stack (Betterstack, Prometheus, Grafana)
3. Run disaster recovery drills from SOPs
4. Validate customer onboarding workflow
5. Test incident response procedures

## Customer 5 (Analytics Platform)

Customer 5 data generation stopped at 95% complete (hit API quota safety limit). Missing:
- Last batch of `funnel_conversions` (100 rows)

Can be completed tomorrow or manually generated if needed for testing.
