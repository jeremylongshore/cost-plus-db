# Cloudflare Workers Deployment Guide

**Document Type:** DR-GUID (Daily Routine - Guide)
**Created:** 2025-10-20
**Owner:** Intent Solutions (CostPlusDB)
**Purpose:** Deploy CostPlusDB backend to Cloudflare Workers edge runtime

---

## Overview

Cloudflare Workers provides a serverless edge compute platform that can run your backend API globally with near-zero cold starts and automatic scaling.

**Benefits:**
- Global edge deployment (300+ locations)
- Near-zero cold starts
- Automatic scaling
- Free tier: 100,000 requests/day
- No server management

**Limitations:**
- Different runtime than Node.js (need adaptations)
- No file system access (use Turso for database)
- 10ms CPU time limit per request (free tier)
- Some Node.js modules not supported

**Time Required:** 45-60 minutes
**Cost:** Free tier available (100K requests/day)

---

## Prerequisites

- [ ] Cloudflare account (free tier works)
- [ ] Domain on Cloudflare (optional, but recommended)
- [ ] Turso account for database (SQLite not available on Workers)
- [ ] Node.js 18+ installed locally
- [ ] Wrangler CLI installed

---

## Part 1: Setup Cloudflare Workers

### Step 1: Create Cloudflare Account

1. Visit https://dash.cloudflare.com/sign-up
2. Create account (free tier)
3. Verify email

### Step 2: Install Wrangler CLI

```bash
# Install Wrangler globally
npm install -g wrangler

# Verify installation
wrangler --version

# Login to Cloudflare
wrangler login

# This will open browser for authentication
```

### Step 3: Create Worker Project

```bash
# Navigate to backend directory
cd ~/projects/cost-plus-db/backend

# Initialize Wrangler configuration
wrangler init

# Answer prompts:
# - Project name: costplusdb-api
# - TypeScript: Yes
# - Git: Yes
```

---

## Part 2: Adapt Express App for Workers

### Step 1: Install Hono Framework

Cloudflare Workers don't support Express directly. We'll use Hono (lightweight Express alternative):

```bash
# Install Hono
npm install hono

# Install Cloudflare Workers types
npm install -D @cloudflare/workers-types
```

### Step 2: Create Workers Entry Point

Create `src/workers/index.ts`:

```typescript
/**
 * Cloudflare Workers Entry Point
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';

const app = new Hono();

// Middleware
app.use('*', honoLogger());
app.use('*', cors({
  origin: ['https://costplusdb.dev'],
  credentials: true,
}));

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    runtime: 'cloudflare-workers'
  });
});

// Customer intake
app.post('/api/intake', async (c) => {
  const body = await c.req.json();

  // TODO: Implement intake logic with Turso

  return c.json({
    success: true,
    data: {
      customer_id: 1,
      status: 'prospect',
      message: 'Thank you! We will contact you within 2 hours.'
    }
  }, 201);
});

// Export for Cloudflare Workers
export default app;
```

### Step 3: Configure wrangler.toml

Create/update `wrangler.toml`:

```toml
name = "costplusdb-api"
main = "src/workers/index.ts"
compatibility_date = "2025-01-01"

# Account details
account_id = "YOUR_ACCOUNT_ID"

# Workers configuration
workers_dev = true

# Environment variables (dev)
[vars]
NODE_ENV = "development"
API_BASE_URL = "https://costplusdb-api.YOUR_SUBDOMAIN.workers.dev"

# Secrets (set via wrangler secret put)
# TURSO_DATABASE_URL
# TURSO_AUTH_TOKEN
# RESEND_API_KEY
# STRIPE_SECRET_KEY

# Production environment
[env.production]
name = "costplusdb-api-production"
vars = { NODE_ENV = "production" }

# Custom domain (optional)
routes = [
  { pattern = "api.costplusdb.dev/*", zone_name = "costplusdb.dev" }
]
```

---

## Part 3: Integrate Turso Database

### Step 1: Create Turso Database

```bash
# Install Turso CLI
brew install tursodatabase/tap/turso

# Or with curl
curl -sSfL https://get.tur.so/install.sh | bash

# Login to Turso
turso auth login

# Create database
turso db create costplusdb-production

# Get database URL
turso db show costplusdb-production --url

# Create auth token
turso db tokens create costplusdb-production
```

### Step 2: Configure Turso Client

```typescript
// src/workers/database.ts
import { createClient } from '@libsql/client/web';

export function createDatabase(env: Env) {
  return createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
}
```

### Step 3: Set Secrets in Wrangler

```bash
# Set Turso credentials
wrangler secret put TURSO_DATABASE_URL
# Paste: libsql://costplusdb-production.turso.io

wrangler secret put TURSO_AUTH_TOKEN
# Paste: your-token-here

# Set other secrets
wrangler secret put RESEND_API_KEY
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put JWT_SECRET
wrangler secret put ENCRYPTION_KEY
```

---

## Part 4: Deploy to Workers

### Step 1: Build and Test Locally

```bash
# Install dependencies
npm install

# Start local development server
wrangler dev

# Test endpoints
curl http://localhost:8787/health
```

### Step 2: Deploy to Workers

```bash
# Deploy to Workers
wrangler deploy

# Output will show:
# ✨ Success! Deployed to https://costplusdb-api.YOUR_SUBDOMAIN.workers.dev
```

### Step 3: Test Production Deployment

```bash
# Test deployed worker
curl https://costplusdb-api.YOUR_SUBDOMAIN.workers.dev/health

# Should return:
# {
#   "status": "healthy",
#   "version": "1.0.0",
#   "runtime": "cloudflare-workers"
# }
```

---

## Part 5: Custom Domain Setup

### Step 1: Add Domain to Cloudflare

1. Go to Cloudflare Dashboard
2. Add site: `costplusdb.dev`
3. Update nameservers at your domain registrar
4. Wait for DNS propagation

### Step 2: Configure Worker Route

```bash
# Update wrangler.toml with custom domain
[env.production]
routes = [
  { pattern = "api.costplusdb.dev/*", zone_name = "costplusdb.dev" }
]

# Deploy with custom domain
wrangler deploy --env production
```

### Step 3: Test Custom Domain

```bash
curl https://api.costplusdb.dev/health
```

---

## Part 6: Monitoring and Logs

### View Logs

```bash
# Stream real-time logs
wrangler tail

# View logs for specific deployment
wrangler tail --env production
```

### Access Metrics

1. Visit Cloudflare Dashboard
2. Navigate to Workers & Pages
3. Select your worker
4. View metrics: requests, errors, CPU time

---

## Part 7: Cost Optimization

### Free Tier Limits

- 100,000 requests/day
- 10ms CPU time per request
- 1,000 requests/min

### Upgrade to Paid ($5/month)

- 10 million requests/month included
- 50ms CPU time per request
- Additional requests: $0.50 per million

### Tips to Stay Within Free Tier

1. Enable caching for static responses
2. Optimize database queries
3. Use Turso's edge replication
4. Minimize external API calls

---

## Comparison: VPS vs Cloudflare Workers

| Feature | VPS | Cloudflare Workers |
|---------|-----|-------------------|
| Setup Time | 60-90 min | 30-45 min |
| Cost | $5-15/month | Free (100K req/day) |
| Scaling | Manual | Automatic |
| Global | Single location | 300+ locations |
| Database | SQLite local | Turso cloud |
| Cold Starts | None | Near-zero |
| Maintenance | Required | None |
| Flexibility | Full control | Some limitations |

---

## Troubleshooting

### Issue: Module not found

Workers use ES modules. Ensure imports use .js extensions:

```typescript
// Wrong
import { logger } from './utils/logger';

// Correct
import { logger } from './utils/logger.js';
```

### Issue: CPU time limit exceeded

Optimize slow operations:
- Use indexes in database queries
- Cache frequently accessed data
- Offload heavy processing to background tasks

### Issue: Database connection fails

Verify Turso credentials:

```bash
wrangler secret list
turso db show costplusdb-production
```

---

## Related Documentation

- **043-DR-GUID-local-development-setup.md** - Local setup
- **044-DR-GUID-production-deployment.md** - VPS deployment
- **048-DR-GUID-turso-cloud-integration.md** - Turso setup
- **backend/docs/API.md** - API reference

---

**Document Owner:** Jeremy Longshore (jeremy@intentsolutions.io)
**Last Updated:** 2025-10-20
**Review Frequency:** Quarterly
