# Database Provisioning Guide

Technical guide for provisioning PostgreSQL databases for CostPlusDB customers.

## Overview

This guide covers the complete process of creating and configuring a PostgreSQL database instance for a customer, from VPS selection through backup configuration and monitoring setup.

## Prerequisites

### Required Access
- SSH access to VPS infrastructure
- PostgreSQL superuser access
- Wasabi S3 credentials for backups
- Customer database credentials

### Required Information
- Customer ID (e.g., `CUST-20251020-001`)
- Selected tier (shared, dedicated, pro, enterprise)
- Customer location preference (optional)

---

## Provisioning Workflow

### Step 1: VPS Selection

**Determine appropriate VPS based on tier:**

```bash
# Shared tier: Use shared VPS pool
# Dedicated tier: Dedicated VPS or dedicated resources
# Pro tier: Dedicated VPS with enhanced resources
# Enterprise tier: Dedicated VPS cluster with high availability

# Check VPS capacity
ssh vps-admin@<vps-host> "df -h; free -h; systemctl status postgresql"
```

**VPS selection criteria:**
- Geographic location (closest to customer)
- Available capacity (CPU, memory, disk)
- Current customer count (for shared tier)
- Network performance

### Step 2: Database Creation

**Connect to selected VPS:**
```bash
ssh vps-admin@<vps-host>
sudo -u postgres psql
```

**Create database and user:**
```sql
-- Generate database name from customer ID
-- Example: CUST-20251020-001 → costplus_cust_20251020_001

-- Create database
CREATE DATABASE costplus_cust_20251020_001
    WITH ENCODING='UTF8'
         LC_COLLATE='en_US.UTF-8'
         LC_CTYPE='en_US.UTF-8'
         TEMPLATE=template0;

-- Create user with strong password
CREATE USER costplus_cust_20251020_001_user WITH ENCRYPTED PASSWORD '<generated-password>';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE costplus_cust_20251020_001 TO costplus_cust_20251020_001_user;

-- Grant schema privileges
\c costplus_cust_20251020_001
GRANT ALL ON SCHEMA public TO costplus_cust_20251020_001_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO costplus_cust_20251020_001_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO costplus_cust_20251020_001_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO costplus_cust_20251020_001_user;
```

### Step 3: Database Configuration

**Configure database parameters based on tier:**

```sql
-- Connect to customer database
\c costplus_cust_20251020_001

-- Shared Tier Configuration
ALTER DATABASE costplus_cust_20251020_001 SET shared_buffers = '256MB';
ALTER DATABASE costplus_cust_20251020_001 SET max_connections = 25;
ALTER DATABASE costplus_cust_20251020_001 SET work_mem = '4MB';
ALTER DATABASE costplus_cust_20251020_001 SET maintenance_work_mem = '64MB';

-- Dedicated Tier Configuration
ALTER DATABASE costplus_cust_20251020_001 SET shared_buffers = '1GB';
ALTER DATABASE costplus_cust_20251020_001 SET max_connections = 100;
ALTER DATABASE costplus_cust_20251020_001 SET work_mem = '16MB';
ALTER DATABASE costplus_cust_20251020_001 SET maintenance_work_mem = '256MB';
ALTER DATABASE costplus_cust_20251020_001 SET effective_cache_size = '3GB';

-- Pro Tier Configuration
ALTER DATABASE costplus_cust_20251020_001 SET shared_buffers = '2GB';
ALTER DATABASE costplus_cust_20251020_001 SET max_connections = 200;
ALTER DATABASE costplus_cust_20251020_001 SET work_mem = '32MB';
ALTER DATABASE costplus_cust_20251020_001 SET maintenance_work_mem = '512MB';
ALTER DATABASE costplus_cust_20251020_001 SET effective_cache_size = '6GB';

-- Enterprise Tier Configuration (High Availability)
ALTER DATABASE costplus_cust_20251020_001 SET shared_buffers = '4GB';
ALTER DATABASE costplus_cust_20251020_001 SET max_connections = 500;
ALTER DATABASE costplus_cust_20251020_001 SET work_mem = '64MB';
ALTER DATABASE costplus_cust_20251020_001 SET maintenance_work_mem = '1GB';
ALTER DATABASE costplus_cust_20251020_001 SET effective_cache_size = '12GB';

-- Common optimizations for all tiers
ALTER DATABASE costplus_cust_20251020_001 SET random_page_cost = 1.1;
ALTER DATABASE costplus_cust_20251020_001 SET effective_io_concurrency = 200;
ALTER DATABASE costplus_cust_20251020_001 SET checkpoint_completion_target = 0.9;
```

### Step 4: SSL/TLS Configuration

**Enable SSL for database connections:**

```bash
# PostgreSQL server already configured with SSL (see SOPs)
# Verify SSL is enabled
psql -U postgres -c "SHOW ssl;"

# Configure pg_hba.conf to require SSL for customer
sudo nano /etc/postgresql/16/main/pg_hba.conf

# Add line (replace with customer database and user):
hostssl costplus_cust_20251020_001 costplus_cust_20251020_001_user 0.0.0.0/0 scram-sha-256

# Reload PostgreSQL
sudo systemctl reload postgresql
```

**Test SSL connection:**
```bash
psql "host=<vps-ip> port=5432 dbname=costplus_cust_20251020_001 user=costplus_cust_20251020_001_user sslmode=require" -c "SELECT version();"
```

### Step 5: Backup Configuration (pgBackRest)

**Create pgBackRest stanza for customer database:**

```bash
# Create stanza configuration
sudo nano /etc/pgbackrest.conf

# Add stanza (append to file):
[costplus_cust_20251020_001]
pg1-path=/var/lib/postgresql/16/main
pg1-database=costplus_cust_20251020_001

# Shared tier: Daily full backup
repo1-retention-full=7

# Dedicated tier: Weekly full, daily differential
repo1-retention-full=4
repo1-retention-diff=7

# Pro tier: Weekly full, daily differential, hourly incremental
repo1-retention-full=4
repo1-retention-diff=7
repo1-retention-incr=7

# Enterprise tier: Daily full, hourly incremental
repo1-retention-full=30
repo1-retention-incr=7

# Create stanza
sudo -u postgres pgbackrest --stanza=costplus_cust_20251020_001 stanza-create

# Verify stanza
sudo -u postgres pgbackrest --stanza=costplus_cust_20251020_001 check

# Run initial full backup
sudo -u postgres pgbackrest --stanza=costplus_cust_20251020_001 --type=full backup
```

**Configure backup schedule (cron):**

```bash
# Edit postgres user crontab
sudo -u postgres crontab -e

# Shared tier: Daily full backup at 2 AM
0 2 * * * pgbackrest --stanza=costplus_cust_20251020_001 --type=full backup

# Dedicated tier: Weekly full (Sunday), daily differential
0 2 * * 0 pgbackrest --stanza=costplus_cust_20251020_001 --type=full backup
0 2 * * 1-6 pgbackrest --stanza=costplus_cust_20251020_001 --type=diff backup

# Pro tier: Weekly full, daily diff, hourly incremental
0 2 * * 0 pgbackrest --stanza=costplus_cust_20251020_001 --type=full backup
0 2 * * 1-6 pgbackrest --stanza=costplus_cust_20251020_001 --type=diff backup
0 */1 * * * pgbackrest --stanza=costplus_cust_20251020_001 --type=incr backup

# Enterprise tier: Daily full, hourly incremental
0 2 * * * pgbackrest --stanza=costplus_cust_20251020_001 --type=full backup
0 */1 * * * pgbackrest --stanza=costplus_cust_20251020_001 --type=incr backup
```

### Step 6: Monitoring Setup

**Add database to monitoring system:**

```bash
# Add to monitoring configuration
cat >> /etc/prometheus/postgresql_exporter.yml <<EOF
- job_name: 'costplus_cust_20251020_001'
  static_configs:
    - targets: ['localhost:9187']
      labels:
        database: 'costplus_cust_20251020_001'
        customer_id: 'CUST-20251020-001'
        tier: 'shared'
EOF

# Restart monitoring
sudo systemctl restart prometheus
```

**Configure alerting thresholds:**

```yaml
# /etc/prometheus/alerts/costplus_cust_20251020_001.yml
groups:
  - name: costplus_cust_20251020_001
    interval: 30s
    rules:
      # Connection limit (80% of max)
      - alert: ConnectionLimitHigh
        expr: pg_stat_database_numbackends{database="costplus_cust_20251020_001"} > 20
        for: 5m
        annotations:
          summary: "Connection limit high for CUST-20251020-001"

      # Storage (80% of allocated)
      - alert: StorageHigh
        expr: pg_database_size_bytes{database="costplus_cust_20251020_001"} > 8589934592
        for: 15m
        annotations:
          summary: "Storage usage high for CUST-20251020-001"

      # Backup failure
      - alert: BackupFailed
        expr: time() - pgbackrest_last_full_backup_timestamp{stanza="costplus_cust_20251020_001"} > 172800
        annotations:
          summary: "Backup failed for CUST-20251020-001"
```

### Step 7: Firewall Configuration

**Configure firewall to allow customer connections:**

```bash
# UFW is already configured for PostgreSQL (see SOPs)
# Customer connects via public IP with SSL/TLS

# Optionally restrict to customer IP range (if provided)
sudo ufw allow from <customer-ip-range> to any port 5432

# Reload firewall
sudo ufw reload
```

### Step 8: Record Database in Customer Management System

**Update database records:**

```bash
cd /path/to/002-clients

# Add database record
sqlite3 database/costplusdb.db <<EOF
INSERT INTO databases (
    customer_id,
    database_name,
    host,
    port,
    username,
    ssl_enabled,
    status,
    provisioned_at,
    vps_id,
    backup_enabled,
    backup_location,
    storage_used_mb
) VALUES (
    'CUST-20251020-001',
    'costplus_cust_20251020_001',
    '<vps-public-ip>',
    5432,
    'costplus_cust_20251020_001_user',
    1,
    'active',
    datetime('now'),
    'vps-usw-001',
    1,
    's3://costplusdb-backups/costplus_cust_20251020_001',
    0
);
EOF

# Log activity
sqlite3 database/costplusdb.db <<EOF
INSERT INTO activity_log (customer_id, action, description, actor, metadata)
VALUES (
    'CUST-20251020-001',
    'database_provisioned',
    'PostgreSQL database provisioned and configured',
    'provision-script',
    '{"database":"costplus_cust_20251020_001","vps":"vps-usw-001","tier":"shared"}'
);
EOF
```

### Step 9: Generate Credentials

**Create credentials file:**

```bash
cd customers/active/CUST-20251020-001

# Generate credentials JSON
cat > credentials.json <<EOF
{
  "customer_id": "CUST-20251020-001",
  "database": {
    "host": "<vps-public-ip>",
    "port": 5432,
    "database": "costplus_cust_20251020_001",
    "username": "costplus_cust_20251020_001_user",
    "password": "<generated-password>",
    "sslmode": "require"
  },
  "connection_strings": {
    "postgresql": "postgresql://costplus_cust_20251020_001_user:<password>@<host>:5432/costplus_cust_20251020_001?sslmode=require",
    "psql": "psql 'host=<host> port=5432 dbname=costplus_cust_20251020_001 user=costplus_cust_20251020_001_user sslmode=require'",
    "jdbc": "jdbc:postgresql://<host>:5432/costplus_cust_20251020_001?user=costplus_cust_20251020_001_user&password=<password>&sslmode=require"
  },
  "provisioned_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "tier": "shared",
  "storage_gb": 10,
  "connection_limit": 25,
  "backup_retention_days": 30
}
EOF

# Encrypt credentials (optional but recommended)
gpg --symmetric --cipher-algo AES256 credentials.json
rm credentials.json
```

---

## Provisioning Script

The provisioning process is automated via `scripts/provision-database.sh`:

```bash
cd /path/to/002-clients/scripts
./provision-database.sh <customer-id> <tier>

# Example
./provision-database.sh CUST-20251020-001 shared
```

**Script performs all steps above automatically:**
1. Selects appropriate VPS
2. Creates database and user
3. Configures parameters
4. Sets up SSL/TLS
5. Configures backups
6. Sets up monitoring
7. Updates customer records
8. Generates credentials

---

## Verification

### Test Database Connection

```bash
psql "host=<host> port=5432 dbname=<database> user=<user> sslmode=require" -c "\l"
```

### Verify Backup

```bash
ssh vps-admin@<vps-host>
sudo -u postgres pgbackrest --stanza=<database> info
```

### Check Monitoring

```bash
# Check Prometheus
curl http://<vps-ip>:9090/api/v1/query?query=pg_stat_database_numbackends{database="<database>"}

# Check logs
tail -f /var/log/postgresql/postgresql-16-main.log
```

---

## Troubleshooting

### Database Creation Fails

**Check PostgreSQL logs:**
```bash
tail -f /var/log/postgresql/postgresql-16-main.log
```

**Common issues:**
- Insufficient disk space
- Database name conflict
- Permission issues

### Backup Configuration Fails

**Verify pgBackRest:**
```bash
sudo -u postgres pgbackrest version
sudo -u postgres pgbackrest --stanza=<database> check
```

**Check S3 credentials:**
```bash
sudo cat /etc/pgbackrest.conf | grep s3
```

### SSL Connection Fails

**Verify SSL is enabled:**
```bash
psql -U postgres -c "SHOW ssl;"
```

**Check pg_hba.conf:**
```bash
sudo cat /etc/postgresql/16/main/pg_hba.conf | grep ssl
```

---

## Reference

- **SOPs**: `000-docs/005-DR-SOPS-postgresql-operations.md`
- **VPS Setup**: See SOPs section on VPS hardening
- **pgBackRest**: See SOPs section on backup configuration
- **Monitoring**: See `001-security/` for monitoring setup

---

**Last Updated**: 2025-10-20
