# Turso Cloud Integration Guide

**Document Type:** DR-GUID (Daily Routine - Guide)
**Created:** 2025-10-20
**Owner:** Intent Solutions (CostPlusDB)
**Purpose:** Complete guide to integrating Turso Cloud for edge database sync

---

## Overview

Turso is a distributed SQLite platform that replicates your database to edge locations globally. Perfect for CostPlusDB backend to reduce latency and improve reliability.

**Benefits:**
- Global edge replication (35+ regions)
- SQLite compatibility (minimal migration)
- Sub-20ms reads from edge
- Automatic backups
- Point-in-time recovery
- Free tier: 500 databases, 1 billion rows

**Time Required:** 30-45 minutes
**Cost:** Free tier available, paid plans start at $29/month

---

## Part 1: Turso Account Setup

### Step 1: Install Turso CLI

```bash
# macOS/Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Or with Homebrew
brew install tursodatabase/tap/turso

# Verify installation
turso --version
```

### Step 2: Create Account and Login

```bash
# Sign up and login (opens browser)
turso auth login

# You'll be authenticated via GitHub or email
```

### Step 3: Create Production Database

```bash
# Create database
turso db create costplusdb-production

# Output:
# Created database costplusdb-production in ord (Chicago, IL)
# Database URL: libsql://costplusdb-production-YOUR_ORG.turso.io

# Get database URL
turso db show costplusdb-production --url

# Get connection info
turso db show costplusdb-production
```

### Step 4: Generate Auth Token

```bash
# Create authentication token
turso db tokens create costplusdb-production

# Output:
# eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...

# Save this token securely!
```

**Save credentials:**

```bash
# In .env file
TURSO_DATABASE_URL="libsql://costplusdb-production-YOUR_ORG.turso.io"
TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."
```

---

## Part 2: Backend Integration

### Step 1: Install Turso Client

```bash
cd backend
npm install @libsql/client
```

### Step 2: Update Database Configuration

Update `src/database/index.ts`:

```typescript
/**
 * Database Connection - Turso Integration
 */
import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Create database client based on environment
 */
export function createDatabaseClient() {
  // Use Turso in production if configured
  if (config.TURSO_DATABASE_URL && config.TURSO_AUTH_TOKEN) {
    logger.info('Using Turso database', { url: config.TURSO_DATABASE_URL });

    return createClient({
      url: config.TURSO_DATABASE_URL,
      authToken: config.TURSO_AUTH_TOKEN,
    });
  }

  // Use local SQLite for development
  logger.info('Using local SQLite database', { path: config.DATABASE_URL });
  return new Database(config.DATABASE_URL.replace('file:', ''));
}

export const db = createDatabaseClient();
```

### Step 3: Update Repository Layer

Since Turso uses async API while better-sqlite3 is sync, create adapter:

```typescript
/**
 * Database Adapter - Unified interface for SQLite and Turso
 */
import { config } from '../config/index.js';

export class DatabaseAdapter {
  private client: any;
  private isTurso: boolean;

  constructor(client: any) {
    this.client = client;
    this.isTurso = !!config.TURSO_DATABASE_URL;
  }

  async execute(sql: string, params: any[] = []): Promise<any> {
    if (this.isTurso) {
      // Turso async API
      const result = await this.client.execute({
        sql,
        args: params,
      });
      return result;
    } else {
      // SQLite sync API
      const stmt = this.client.prepare(sql);
      return stmt.run(...params);
    }
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (this.isTurso) {
      const result = await this.client.execute({
        sql,
        args: params,
      });
      return result.rows;
    } else {
      const stmt = this.client.prepare(sql);
      return stmt.all(...params);
    }
  }

  async queryOne(sql: string, params: any[] = []): Promise<any> {
    if (this.isTurso) {
      const result = await this.client.execute({
        sql,
        args: params,
      });
      return result.rows[0] || null;
    } else {
      const stmt = this.client.prepare(sql);
      return stmt.get(...params);
    }
  }
}
```

---

## Part 3: Data Migration

### Step 1: Export Local Database

```bash
# Dump local SQLite database to SQL
sqlite3 ../002-clients/database/costplusdb.db .dump > backup.sql

# Or use better-sqlite3-dump tool
npm install -g better-sqlite3-dump
better-sqlite3-dump ../002-clients/database/costplusdb.db > backup.sql
```

### Step 2: Import to Turso

```bash
# Connect to Turso database
turso db shell costplusdb-production

# Import SQL dump
.read backup.sql

# Verify tables created
.tables

# Verify data
SELECT COUNT(*) FROM customers;

# Exit
.quit
```

### Step 3: Sync Script

Create `src/scripts/sync-to-turso.ts`:

```typescript
/**
 * Sync Local SQLite to Turso
 */
import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';
import { config } from '../config/index.js';

async function syncToTurso() {
  // Local database
  const localDb = new Database(config.DATABASE_URL.replace('file:', ''));

  // Turso database
  const tursoDb = createClient({
    url: config.TURSO_DATABASE_URL!,
    authToken: config.TURSO_AUTH_TOKEN!,
  });

  console.log('Starting sync to Turso...');

  // Get all tables
  const tables = localDb
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all() as any[];

  for (const table of tables) {
    const tableName = table.name;
    console.log(`Syncing table: ${tableName}`);

    // Get all rows
    const rows = localDb.prepare(`SELECT * FROM ${tableName}`).all();

    // Clear Turso table
    await tursoDb.execute(`DELETE FROM ${tableName}`);

    // Insert rows to Turso
    for (const row of rows) {
      const columns = Object.keys(row);
      const values = Object.values(row);
      const placeholders = columns.map(() => '?').join(', ');

      await tursoDb.execute({
        sql: `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
        args: values,
      });
    }

    console.log(`✓ Synced ${rows.length} rows from ${tableName}`);
  }

  console.log('Sync complete!');
}

syncToTurso().catch(console.error);
```

**Run sync:**

```bash
npm run db:sync
```

---

## Part 4: Edge Replication Setup

### Step 1: Create Replica in Another Region

```bash
# List available regions
turso db locations

# Create replica in Europe
turso db replicas create costplusdb-production --location ams

# Create replica in Asia
turso db replicas create costplusdb-production --location sin

# List replicas
turso db show costplusdb-production
```

### Step 2: Verify Replication

```bash
# Connect to primary
turso db shell costplusdb-production

# Insert test data
INSERT INTO customers (company_name, email, tier, status)
VALUES ('Test Replication', 'test@example.com', 'shared', 'prospect');

# Wait a few seconds, then check replica
turso db shell costplusdb-production --location ams

# Query to verify replication
SELECT * FROM customers WHERE company_name = 'Test Replication';
```

### Step 3: Configure Client for Edge Routing

```typescript
// Turso client automatically routes to nearest replica
const tursoDb = createClient({
  url: config.TURSO_DATABASE_URL,
  authToken: config.TURSO_AUTH_TOKEN,
  // Sync interval (optional, default: 60s)
  syncInterval: 60,
});
```

---

## Part 5: Monitoring and Maintenance

### View Database Stats

```bash
# Show database information
turso db show costplusdb-production

# Output:
# Name:           costplusdb-production
# URL:            libsql://costplusdb-production.turso.io
# Locations:      ord (primary), ams, sin
# Size:           2.5 MB
# Tables:         5
# Rows:           1,245
```

### Query Logs

```bash
# View recent queries (if enabled)
turso db logs costplusdb-production

# Monitor real-time activity
turso db logs costplusdb-production --follow
```

### Backup and Restore

```bash
# Create manual backup
turso db backup create costplusdb-production

# List backups
turso db backup list costplusdb-production

# Restore from backup
turso db backup restore costplusdb-production BACKUP_ID
```

---

## Part 6: Point-in-Time Recovery

### Enable PITR

```bash
# Enable point-in-time recovery
turso db update costplusdb-production --enable-pitr

# PITR retention: 7 days on free tier, 30 days on paid
```

### Restore to Specific Time

```bash
# Restore to 1 hour ago
turso db restore costplusdb-production --timestamp "2025-10-20T14:00:00Z"

# Restore to specific backup
turso db restore costplusdb-production --backup BACKUP_ID
```

---

## Part 7: Local Development with Turso

### Option 1: Embedded Replica

```bash
# Create local embedded replica
turso db shell --embedded costplusdb-production

# This creates a local replica that syncs with Turso
# Changes are replicated to edge
```

### Option 2: Hybrid Approach

Use local SQLite for development, sync to Turso for staging/production:

```typescript
// config/index.ts
export const config = {
  // Development: Local SQLite
  DATABASE_URL: process.env.NODE_ENV === 'development'
    ? 'file:../002-clients/database/costplusdb.db'
    : undefined,

  // Production: Turso
  TURSO_DATABASE_URL: process.env.NODE_ENV === 'production'
    ? process.env.TURSO_DATABASE_URL
    : undefined,

  TURSO_AUTH_TOKEN: process.env.NODE_ENV === 'production'
    ? process.env.TURSO_AUTH_TOKEN
    : undefined,
};
```

---

## Part 8: Performance Optimization

### Enable HTTP/2

Turso uses HTTP/2 by default for better performance.

### Connection Pooling

```typescript
// Reuse client instance across requests
let tursoClient: any = null;

export function getTursoClient() {
  if (!tursoClient) {
    tursoClient = createClient({
      url: config.TURSO_DATABASE_URL,
      authToken: config.TURSO_AUTH_TOKEN,
    });
  }
  return tursoClient;
}
```

### Batch Operations

```typescript
// Batch multiple queries for better performance
async function batchInsert(customers: Customer[]) {
  const batch = customers.map(customer => ({
    sql: 'INSERT INTO customers (...) VALUES (?)',
    args: [customer.name, customer.email, ...],
  }));

  await tursoDb.batch(batch);
}
```

---

## Part 9: Cost Management

### Free Tier Limits

- 500 databases
- 1 billion rows
- 9 GB total storage
- 3 locations per database

### Paid Plans

**Scaler Plan ($29/month):**
- Everything in free tier
- 1,000 databases
- Unlimited rows
- 25 GB storage
- Unlimited locations

**Cost per Additional Resources:**
- $1 per additional GB
- $5 per additional 100 databases

### Optimization Tips

1. Use indexes for frequently queried columns
2. Archive old data to separate database
3. Monitor row count and storage usage
4. Use batch operations

---

## Part 10: Troubleshooting

### Issue: Connection timeout

```typescript
// Increase timeout
const tursoDb = createClient({
  url: config.TURSO_DATABASE_URL,
  authToken: config.TURSO_AUTH_TOKEN,
  timeout: 30000, // 30 seconds
});
```

### Issue: Authentication failed

```bash
# Regenerate auth token
turso db tokens create costplusdb-production

# Update .env with new token
```

### Issue: Replication lag

```bash
# Check replica status
turso db show costplusdb-production

# Force sync (if needed)
turso db replicas sync costplusdb-production --location ams
```

---

## Comparison: Local SQLite vs Turso

| Feature | Local SQLite | Turso |
|---------|-------------|-------|
| Latency | 0ms (local) | <20ms (edge) |
| Reliability | Single point of failure | Multi-region |
| Backups | Manual | Automatic |
| PITR | Not available | 7-30 days |
| Scaling | Vertical only | Automatic |
| Global | No | Yes (35+ regions) |
| Cost | Free | Free tier available |
| Setup | Simple | Moderate |

---

## Related Documentation

- **043-DR-GUID-local-development-setup.md** - Local setup
- **044-DR-GUID-production-deployment.md** - VPS deployment
- **045-DR-GUID-cloudflare-workers-deployment.md** - Workers deployment (requires Turso)
- **backend/docs/API.md** - API reference

---

**Document Owner:** Jeremy Longshore (jeremy@intentsolutions.io)
**Last Updated:** 2025-10-20
**Review Frequency:** Quarterly
