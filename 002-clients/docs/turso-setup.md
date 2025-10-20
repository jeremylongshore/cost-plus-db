# Turso Cloud Database Setup Guide

Configuration guide for syncing CostPlusDB customer management database to Turso cloud platform.

## What is Turso?

Turso is a distributed SQLite database platform built on libSQL. It provides:
- Global edge replication for low-latency access
- Free tier: 500 databases, 9GB total storage, 1 billion row reads/month
- Full SQLite compatibility
- Embedded replicas for offline-first applications

**Why use Turso for customer management:**
- Sync local SQLite database to cloud for backup and remote access
- Access customer data from anywhere
- No complex PostgreSQL setup needed for simple CRM data
- Cost-effective for small-scale customer databases

---

## Installation

### Install Turso CLI

```bash
# Linux/macOS
curl -sSfL https://get.tur.so/install.sh | bash

# Add to PATH
export PATH="$HOME/.turso:$PATH"

# Verify installation
turso --version
```

### Authenticate

```bash
# Login to Turso (opens browser for GitHub OAuth)
turso auth login

# Verify authentication
turso auth whoami
```

---

## Database Setup

### Create Turso Database

```bash
# Create new database
turso db create costplusdb-customers

# Get database URL and authentication token
turso db show costplusdb-customers

# Example output:
# Name:           costplusdb-customers
# URL:            libsql://costplusdb-customers-[username].turso.io
# Regions:        iad (primary)
# Version:        0.24.0
```

### Create Authentication Token

```bash
# Create a token for programmatic access
turso db tokens create costplusdb-customers --expiration none

# Save the token (shown once!)
# Example: eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

### Configure Environment Variables

```bash
# Add to .env file (in 002-clients directory)
cat > /path/to/002-clients/.env <<EOF
# Turso Cloud Configuration
TURSO_DATABASE_URL="libsql://costplusdb-customers-[username].turso.io"
TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."
EOF

# Secure the .env file
chmod 600 .env
```

---

## Initial Database Migration

### Method 1: Push Local Schema to Turso

```bash
cd /path/to/002-clients

# Push schema to Turso
turso db shell costplusdb-customers < database/schema.sql

# Verify schema created
turso db shell costplusdb-customers
> .tables
> .schema customers
> .quit
```

### Method 2: Import Existing Database

```bash
# If you have an existing local database with data
cd /path/to/002-clients

# Dump local database
sqlite3 database/costplusdb.db .dump > /tmp/costplusdb-dump.sql

# Import to Turso
turso db shell costplusdb-customers < /tmp/costplusdb-dump.sql

# Clean up
rm /tmp/costplusdb-dump.sql
```

---

## Synchronization Strategy

### Option 1: Manual Sync (Simplest)

**When to sync manually:**
- Development/testing
- Infrequent updates
- You want full control

**Sync script: `scripts/sync-to-turso.sh`**

```bash
#!/bin/bash
# Manual sync script

LOCAL_DB="/path/to/002-clients/database/costplusdb.db"
TURSO_DB="costplusdb-customers"

echo "Syncing local database to Turso..."

# Dump local database
sqlite3 "$LOCAL_DB" .dump > /tmp/costplusdb-sync.sql

# Push to Turso
turso db shell "$TURSO_DB" < /tmp/costplusdb-sync.sql

# Clean up
rm /tmp/costplusdb-sync.sql

echo "Sync complete!"
```

**Usage:**
```bash
cd scripts
./sync-to-turso.sh
```

### Option 2: Scheduled Sync (Recommended)

**Automated daily sync via cron:**

```bash
# Edit crontab
crontab -e

# Add daily sync at 3 AM
0 3 * * * cd /path/to/002-clients/scripts && ./sync-to-turso.sh >> /path/to/002-clients/logs/turso-sync.log 2>&1
```

### Option 3: Real-time Replication (Advanced)

**For production environments requiring real-time sync:**

Use Turso embedded replicas with your application:

```javascript
// Example: Node.js application with Turso client
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
  syncUrl: "file:/path/to/local/database.db", // Local replica
  syncInterval: 60 // Sync every 60 seconds
});

// All queries now automatically sync
const result = await client.execute("SELECT * FROM customers");
```

---

## Using Turso Database

### Query via CLI

```bash
# Open interactive shell
turso db shell costplusdb-customers

# Run query
SELECT * FROM customers WHERE status = 'active';

# Exit
.quit
```

### Query via API (HTTP)

```bash
# Using curl
curl -X POST \
  -H "Authorization: Bearer $TURSO_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"statements": ["SELECT * FROM customers LIMIT 5"]}' \
  https://costplusdb-customers-[username].turso.io/v2/pipeline
```

### Query via SDK (Node.js)

```javascript
// Install: npm install @libsql/client
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// Query customers
const result = await client.execute(
  "SELECT * FROM customers WHERE status = ?",
  ["active"]
);

console.log(result.rows);
```

---

## Backup Strategy

### Turso Automatic Backups

Turso automatically backs up your database:
- Point-in-time recovery (24 hours on free tier)
- Daily snapshots (retained for 30 days)

### Manual Backup from Turso

```bash
# Dump entire database from Turso
turso db shell costplusdb-customers .dump > backups/costplusdb-$(date +%Y%m%d).sql

# Compress backup
gzip backups/costplusdb-$(date +%Y%m%d).sql
```

### Automated Backup Script

```bash
#!/bin/bash
# scripts/backup-turso.sh

BACKUP_DIR="/path/to/002-clients/backups"
DATE=$(date +%Y%m%d-%H%M%S)
TURSO_DB="costplusdb-customers"

mkdir -p "$BACKUP_DIR"

# Create backup
turso db shell "$TURSO_DB" .dump > "$BACKUP_DIR/turso-$DATE.sql"

# Compress
gzip "$BACKUP_DIR/turso-$DATE.sql"

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "turso-*.sql.gz" -mtime +30 -delete

echo "Backup complete: $BACKUP_DIR/turso-$DATE.sql.gz"
```

---

## Multi-Region Setup

### Add Replicas for Global Access

```bash
# Add replica in Europe
turso db replicate costplusdb-customers fra

# Add replica in Asia-Pacific
turso db replicate costplusdb-customers sin

# View all replicas
turso db show costplusdb-customers
```

**Regions available:**
- `iad` - US East (Virginia)
- `ord` - US Central (Chicago)
- `sjc` - US West (San Jose)
- `fra` - Europe (Frankfurt)
- `lhr` - Europe (London)
- `ams` - Europe (Amsterdam)
- `sin` - Asia-Pacific (Singapore)
- `syd` - Asia-Pacific (Sydney)

---

## Monitoring

### Check Database Status

```bash
# Database info
turso db show costplusdb-customers

# List all databases
turso db list

# Check usage
turso plan show
```

### Database Size

```bash
turso db shell costplusdb-customers

# Inside shell
SELECT page_count * page_size / 1024.0 / 1024.0 as size_mb
FROM pragma_page_count(), pragma_page_size();

.quit
```

---

## Troubleshooting

### Sync Fails

**Check local database:**
```bash
sqlite3 database/costplusdb.db "PRAGMA integrity_check;"
```

**Check Turso connectivity:**
```bash
turso db shell costplusdb-customers "SELECT 1;"
```

**Check token expiration:**
```bash
turso db tokens list costplusdb-customers
```

### Authentication Errors

**Re-authenticate:**
```bash
turso auth logout
turso auth login
```

**Create new token:**
```bash
turso db tokens create costplusdb-customers --expiration none
```

### Schema Conflicts

**If schema gets out of sync:**

```bash
# Option 1: Reset Turso database (DESTRUCTIVE)
turso db destroy costplusdb-customers
turso db create costplusdb-customers
turso db shell costplusdb-customers < database/schema.sql

# Option 2: Compare schemas
turso db shell costplusdb-customers .schema > /tmp/turso-schema.sql
sqlite3 database/costplusdb.db .schema > /tmp/local-schema.sql
diff /tmp/turso-schema.sql /tmp/local-schema.sql
```

---

## Security Best Practices

### Token Management

- **NEVER** commit `.env` files to git
- Use separate tokens for development and production
- Rotate tokens regularly
- Set expiration on tokens when possible

### Access Control

```bash
# Create read-only token (coming soon to Turso)
turso db tokens create costplusdb-customers --read-only

# Limit token to specific IP ranges (enterprise feature)
```

### Encryption

- Turso encrypts data at rest by default
- All connections use TLS/SSL
- No additional configuration needed

---

## Cost Optimization

### Free Tier Limits (as of 2025)

- **Databases**: 500
- **Storage**: 9GB total
- **Rows read**: 1 billion/month
- **Rows written**: 25 million/month
- **Locations**: 3 (primary + 2 replicas)

**CostPlusDB customer database should easily fit within free tier:**
- Estimated database size: <100MB (10,000 customers)
- Estimated reads: <1M/month
- Estimated writes: <100K/month

### Monitoring Usage

```bash
# Check current usage
turso plan show

# View detailed database stats
turso db inspect costplusdb-customers
```

### Upgrade if Needed

```bash
# View plans
turso plan list

# Upgrade to paid plan
turso plan upgrade
```

---

## Integration with CostPlusDB

### Environment Variables

Add to `002-clients/.env`:

```bash
# Local SQLite (primary)
LOCAL_DB_PATH="/path/to/002-clients/database/costplusdb.db"

# Turso Cloud (backup/remote access)
TURSO_DATABASE_URL="libsql://costplusdb-customers-[username].turso.io"
TURSO_AUTH_TOKEN="your-token-here"

# Sync settings
TURSO_SYNC_ENABLED=true
TURSO_SYNC_INTERVAL=3600  # seconds (1 hour)
```

### Workflow Integration

**Local-first approach:**
1. All writes go to local SQLite database
2. Scheduled sync pushes to Turso (hourly/daily)
3. Turso serves as backup and remote access point
4. Applications can read from either local or Turso

**Cloud-first approach:**
1. All writes go to Turso
2. Local SQLite is a cache/replica
3. Automatic sync keeps local in sync
4. Provides offline access if needed

---

## Reference

- **Turso Documentation**: https://docs.turso.tech
- **Turso CLI Reference**: https://docs.turso.tech/reference/turso-cli
- **libSQL Client SDK**: https://github.com/libsql/libsql-client-ts

---

**Last Updated**: 2025-10-20
