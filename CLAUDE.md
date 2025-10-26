# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CostPlusDB** (formerly FairDB) is a transparent, affordable managed PostgreSQL database service. The project includes business planning documents, standard operating procedures, and infrastructure for providing PostgreSQL databases to customers.

**GitHub Repository**: https://github.com/jeremylongshore/cost-plus-db.git

## Project Status & Philosophy

**Backend:** 85% production-ready (auth, API, database complete - needs API keys and deployment config)
**Website:** Live at costplusdb.dev (Netlify deployment)
**Testing:** 5 local PostgreSQL databases for validation (in progress)

This project has comprehensive documentation (68+ files) and operational SOPs. The backend uses modern TypeScript/Express architecture with SQLite + Turso cloud sync.

### Critical: "Always Works™" Implementation Philosophy

When implementing or fixing features:
- ✅ **Run/build the code** - Never assume
- ✅ **Trigger the exact feature** you changed
- ✅ **See the expected result** with your own observation
- ✅ **Check for errors** in output/logs
- ❌ Avoid: "This should work now" or "Try it now" (without testing)
- ❌ Never skip testing to save 30 seconds - failures waste 30 minutes

**Backend testing:** Use `npm run dev` + manual API calls OR `./test-auth.sh` for auth changes

## Architecture

### Directory Structure & Scaffold Rules

**CRITICAL:** All top-level directories MUST follow numbered convention (000-, 001-, 002-, etc.)

```
costplusdb/
├── 000-docs/              # All documentation (70+ files, strict naming)
├── 001-security/          # Security, scripts, configs, compliance
│   ├── config/            # Configuration files (⚠️ CONTAINS SECRETS - see Security section)
│   │   ├── backup/        # pgBackRest configuration
│   │   ├── fail2ban/      # Intrusion prevention rules
│   │   ├── firewall/      # UFW firewall rules
│   │   ├── pgbouncer/     # Connection pooling config
│   │   ├── postgresql/    # PostgreSQL configuration
│   │   └── ssl/           # SSL/TLS certificates
│   ├── scripts/           # All operational scripts
│   │   ├── provisioning/  # Customer DB provisioning
│   │   ├── maintenance/   # Backup, sync scripts
│   │   ├── monitoring/    # Health checks, alerts
│   │   ├── compliance/    # Audit and compliance tools
│   │   ├── hardening/     # Security hardening scripts
│   │   └── incident-response/  # Emergency procedures
│   └── logs/              # Security event logs
├── 002-clients/           # Customer metadata DB (SQLite + Turso)
├── backend/               # Express/TypeScript API (85% production-ready)
│   └── src/
│       ├── integrations/  # External service integrations
│       │   ├── stripe/    # Payment processing
│       │   ├── resend/    # Email service
│       │   └── turso/     # Cloud database sync
│       └── ...
├── testing/               # Testing infrastructure
│   ├── benchmarks/        # Benchmarking tools (sysbench-tpcc, etc.)
│   └── local-customer-databases/  # 5 PostgreSQL test databases
└── website/               # Static site (Netlify, live)
```

**File Placement Rules:**

1. **Documentation** → `000-docs/NNN-CC-ABCD-description.md` (NEVER create docs elsewhere)
2. **Scripts** → `001-security/scripts/{provisioning,maintenance,monitoring,compliance,hardening,incident-response}/`
3. **Configuration** → `001-security/config/{backup,fail2ban,firewall,pgbouncer,postgresql,ssl}/`
4. **Benchmarking** → `testing/benchmarks/` (NOT in 000-docs/)
5. **Root-level .md files:** ONLY `CLAUDE.md`, `README.md`, `CHANGELOG.md`
6. **New directories:** MUST get explicit approval AND follow 003-, 004- numbering

**Anti-pattern:** Creating directories like `docs/`, `scripts/`, `logs/` at root level - these violate the numbered scaffold.

## Security & Configuration Management

### ⚠️ CRITICAL: Exposed Credentials in Configuration Files

**IMMEDIATE ACTION REQUIRED BEFORE PRODUCTION:**

The following configuration files contain **EXPOSED CREDENTIALS** that must be rotated before production deployment:

```bash
001-security/config/backup/pgbackrest.conf
```

**Contains:**
- Wasabi S3 access keys (plaintext)
- Encryption cipher passwords (plaintext)
- Database connection credentials

**Pre-Production Checklist:**
1. ✅ Rotate all S3 access keys and secrets
2. ✅ Generate new encryption cipher passwords
3. ✅ Move secrets to environment variables or secrets manager
4. ✅ Update all references in scripts and documentation
5. ✅ Run security scan (`gitleaks detect`) to verify no secrets in git history
6. ✅ Document credential rotation procedure in SOPs

**Reference:** See `000-docs/059-DR-AUDIT-comprehensive-security-audit.md` for complete security audit.

### Configuration Directory Structure

All system configuration files are stored in `001-security/config/`:

- **backup/** - pgBackRest backup configuration (⚠️ contains S3 credentials)
- **fail2ban/** - Intrusion prevention rules and jail configurations
- **firewall/** - UFW firewall rules (port whitelisting)
- **pgbouncer/** - Connection pooling configuration
- **postgresql/** - PostgreSQL server configuration (postgresql.conf, pg_hba.conf)
- **ssl/** - SSL/TLS certificates and renewal scripts

**Never commit:**
- Private keys (.key, .pem files)
- Certificates with embedded passwords
- API keys or access tokens
- Database passwords

**Always use:**
- Environment variables for secrets
- `.gitignore` patterns for sensitive files
- Encrypted configuration for production

### Backend Architecture (Critical)

The backend follows a **strict layered architecture**:

```
API Layer (routes, controllers, middleware)
    ↓
Service Layer (business logic, workflows)
    ↓
Database Layer (repositories, migrations)
    ↓
SQLite (local) + Turso (cloud sync)
```

**Key patterns (MUST follow):**
1. **Controllers call services** - Never call repositories directly
2. **Services call repositories** - All DB queries live in `database/repositories/`
3. **Zod validates first** - All inputs validated before reaching controllers
4. **No direct DB access** - Controllers NEVER touch database connections
5. **Async error handling** - Use `express-async-errors` (no try/catch needed in routes)

**Service Layer Interaction Example:**
```typescript
// ❌ WRONG: Controller accessing database directly
export const getCustomer = async (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  res.json(customer);
};

// ✅ CORRECT: Controller → Service → Repository pattern
export const getCustomer = async (req, res) => {
  const customer = await customerService.getCustomer(req.params.id);
  res.json({ success: true, data: customer });
};
```

## Common Commands

### Backend Development

```bash
cd backend

# Development
npm run dev              # Start dev server with hot reload (localhost:3000)
npm run build            # Build TypeScript to JavaScript
npm start                # Start production server

# Database
npm run db:init          # Initialize database from schema
npm run db:migrate       # Run pending migrations
npm run db:seed          # Seed development data (creates admin user)
npm run db:sync          # Sync local SQLite to Turso cloud

# Testing
npm test                 # Run all tests (Vitest)
npm run test:unit        # Unit tests only (services, utilities)
npm run test:integration # Integration tests (database, APIs)
npm run test:e2e         # End-to-end tests (Playwright)
npm run test:watch       # Watch mode for test-driven development
./test-auth.sh           # Test authentication (5 scenarios)

# Code Quality
npm run lint             # ESLint
npm run format           # Prettier
npm run type-check       # TypeScript type checking
```

### Website Development

```bash
cd website
python3 -m http.server 8000  # Local preview (http://localhost:8000)

# Deployment (automatic via Netlify)
git push origin main         # Triggers Netlify deploy
```

### Testing Infrastructure

```bash
cd testing/local-customer-databases

# Setup 5 local PostgreSQL databases
./scripts/01-setup-databases.sh    # Create empty databases
./scripts/02-import-data.sh         # Import Vertex AI generated data
./scripts/03-verify-setup.sh        # Verify all databases ready

# Generate test data with Vertex AI (free tier)
cd vertex-ai
python generate-test-data.py       # Creates realistic data for all 5 DBs
```

### Documentation

```bash
cd 000-docs
ls -lt | head -20        # View recent docs (sorted by modification time)

# Find next sequence number for new doc
ls -1 | tail -5          # Check last 5 files for sequence
```

## Key Documentation

Essential documents in `000-docs/`:

- **059-DR-AUDIT-comprehensive-security-audit.md** - Security audit (800 lines, read first)
- **061-PM-HAND-session-handoff-2025-10-20.md** - Session handoff (start here for new sessions)
- **057-OD-DEPL-production-deployment-checklist.md** - Deployment guide (100+ items)
- **001-PP-PLAN-costplusdb-overview.md** - Business blueprint
- **005-DR-SOPS-postgresql-operations.md** - PostgreSQL operations manual (VPS setup, backups, monitoring)

## Documentation Standards

**CRITICAL**: All AI-generated documentation must be created in the `000-docs/` directory following a strict naming convention.

### Documentation Naming Convention (MANDATORY)

Format: `NNN-CC-ABCD-short-description.md`

- **NNN** = Sequence number (001-999)
- **CC** = Category code (2 letters)
- **ABCD** = Document type (4 letters)
- **description** = 1-4 words, kebab-case

### Common Document Categories

- **PP-PLAN** - Business plans, overviews, pricing
- **AT-ARCH** - Architecture decisions, system design
- **PM-TASK** - Task lists, checklists
- **DR-SOPS** - Standard operating procedures (SOPs)
- **DR-GUID** - User guides, how-tos
- **OD-DEPL** - Deployment guides
- **WA-AUTO** - Automation workflows
- **DC-CODE** - Code documentation
- **TQ-TEST** - Test plans

### Documentation Rules

Before creating any documentation:
1. Check existing files in `000-docs/` to find the next sequence number
2. Choose appropriate category code (PP, AT, PM, DR, OD, WA, DC, TQ)
3. Use correct document type (PLAN, ARCH, TASK, SOPS, GUID, DEPL, AUTO, CODE, TEST)
4. Keep descriptions to 1-4 words in kebab-case

✅ All docs in `000-docs/` directory (no subdirectories)
✅ Follow naming convention strictly
✅ Increment sequence numbers based on existing files
❌ Never create docs outside `000-docs/`
❌ No duplicate documentation

### Examples

```
001-PP-PLAN-costplusdb-overview.md
002-PP-PLAN-pricing-structure.md
003-PM-TASK-launch-checklist.md
004-DR-SOPS-customer-provisioning.md
005-DR-SOPS-postgresql-operations.md
```

## Operational Context

The SOPs in `005-DR-SOPS-postgresql-operations.md` define the complete operational framework for managing PostgreSQL instances on VPS infrastructure. When working with SOPs:

- **Infrastructure Provider**: Contabo VPS (primary) - Ubuntu 24.04 LTS
- **Database**: PostgreSQL 16 with SSL/TLS
- **Backup System**: pgBackRest with Wasabi S3-compatible storage
- **Security**: UFW firewall, fail2ban, SSH key authentication only
- **Naming Convention**: References to "FairDB" in SOPs should be understood as "CostPlusDB" (rebranding in progress)

### Operational Scripts

All operational scripts are located in `001-security/scripts/` and organized by function:

**Provisioning Scripts** (`provisioning/`):
- `provision-customer-database.sh` - Complete customer database setup workflow
- `deprovision-customer-database.sh` - Customer database removal and cleanup
- `generate-credentials.sh` - Generate secure database credentials
- `verify-provisioning.sh` - Validate provisioning completed successfully
- `configure-backups.sh` - Set up pgBackRest for new customer database

**Maintenance Scripts** (`maintenance/`):
- `backup-local-db.sh` - Local SQLite backup (customer metadata)
- `sync-to-turso.sh` - Sync SQLite to Turso cloud database
- `backup-to-wasabi-TEMPLATE.sh` - Template for Wasabi S3 backups
- `setup-wasabi-backups-TEMPLATE.sh` - Initial Wasabi backup configuration
- `backup-security-configs.sh` - Backup all security configuration files

**Monitoring Scripts** (`monitoring/`):
- `check-disk-space.sh` - Alert when disk usage exceeds threshold
- `check-connection-pool.sh` - Monitor pgBouncer connection pooling
- `check-database-bloat.sh` - Identify table/index bloat
- `check-wal-archiving.sh` - Verify WAL archiving is functional
- `verify-backup-weekly.sh` - Weekly backup verification
- `check-ssl-expiry.sh` - SSL certificate expiration monitoring
- `check-security-events.sh` - Scan logs for security events
- `check-failed-logins.sh` - Monitor authentication failures
- `stripe-payment-success.sh` - Webhook handler for successful payments
- `github-action-trigger.sh` - CI/CD webhook handler

**Incident Response Scripts** (`incident-response/`):
- `block-ip.sh` - Emergency IP blocking
- `isolate-customer-db.sh` - Isolate compromised customer database
- `restore-customer-db.sh` - Emergency database restoration

**Compliance Scripts** (`compliance/`):
- Audit logging and compliance reporting tools

**Hardening Scripts** (`hardening/`):
- System security hardening and configuration

### Corporate IT Standards Compliance

**Change Management:**
- All infrastructure changes MUST be documented in `000-docs/`
- Follow naming convention: `NNN-PM-TASK-change-description.md`
- Document rollback procedures before implementing changes
- Test changes on local test databases before production

**Access Control:**
- SSH key authentication only (password auth disabled)
- Principle of least privilege for all service accounts
- Regular audit of user access (quarterly)
- Multi-factor authentication for admin accounts (roadmap)

**Backup & Recovery:**
- Daily automated backups with pgBackRest
- 30-day retention policy (local) + 90-day (cloud)
- Weekly backup verification testing
- Documented recovery procedures in SOPs
- RTO: 4 hours, RPO: 24 hours (daily backups)

**Security Monitoring:**
- 24/7 uptime monitoring (Betterstack)
- Security event logging (fail2ban, UFW, PostgreSQL)
- Automated alerting via email (Resend)
- Weekly security scans (Lynis)
- Quarterly security audits

**Incident Response:**
- Documented procedures in `001-security/scripts/incident-response/`
- Severity levels: Critical, High, Medium, Low
- Response SLA: Critical (15 min), High (1 hour), Medium (4 hours), Low (24 hours)
- Post-incident reviews and documentation required

**Configuration Management:**
- All configuration in version control (git)
- Infrastructure as Code principles
- Configuration changes require approval
- Rollback procedures documented

## Website Development

The `website/` directory contains a static website built with vanilla HTML/CSS/JavaScript:

### Local Development

```bash
cd website
python3 -m http.server 8000
# Open http://localhost:8000
```

### Deployment

The site is configured for Netlify deployment with automatic GitHub integration:
- Base directory: `website` (set in Netlify dashboard)
- Publish directory: `.` (relative to base, set in netlify.toml)
- Deploy on push to `main` branch

Configuration is in ROOT `netlify.toml` (NOT website/netlify.toml) including security headers, redirects, and form handling.

**CRITICAL DEPLOYMENT LESSONS (2025-10-26 Incident):**

**Git Submodules MUST Have .gitmodules File:**
- If you see `mode 160000` entries in git status, those are submodules
- `.gitmodules` file MUST exist at repository root with URL mappings
- Netlify fails during "preparing repo" stage without proper .gitmodules
- Example incident: sysbench-tpcc submodule had no URL → 4-day deployment freeze

**Netlify Configuration - Dashboard vs netlify.toml:**
- NEVER set `base` in BOTH Netlify dashboard AND netlify.toml
- Netlify concatenates paths: dashboard base + netlify.toml base = wrong path
- Example incident: dashboard `website/` + netlify.toml `website/` = `website/website/` (doesn't exist)
- Fix: Use EITHER dashboard OR netlify.toml for base, not both
- Current config: Dashboard has `base=website`, netlify.toml uses relative paths

**Deployment Troubleshooting Checklist:**
1. Check git status for `mode 160000` entries (submodules)
2. Verify `.gitmodules` exists and has correct URLs
3. Check Netlify dashboard base directory setting
4. Verify netlify.toml doesn't duplicate base directory
5. Clear Netlify build cache if changing configuration
6. Test manual deploy before relying on auto-deploy
7. Check GitHub webhook exists: `gh api repos/OWNER/REPO/hooks`

**See:** [078-PM-INCI-netlify-deployment-failure-2025-10-26.md](000-docs/078-PM-INCI-netlify-deployment-failure-2025-10-26.md) for complete postmortem.

### Website Structure

- **Static Pages**: `index.html`, `calculator.html`, `about.html`, `privacy.html`, `terms.html`
- **CSS**: Located in `src/` directory (`reset.css`, `index.css`, `theme.css`)
- **Pricing Calculator**: Inline JavaScript in `calculator.html` with hardcoded pricing tiers
- **Forms**: Netlify Forms integration (no backend required)
- **Transparency Section**: `transparency/index.html` links to business documentation

### Updating Pricing

**CURRENT PRICING (v1.1.0 - October 2025):**
- Shared: $59/month
- Dedicated: $119/month
- Pro: $179/month
- Enterprise: $299/month

To update pricing:
1. Edit the JavaScript in `website/calculator.html`
2. Update pricing across ALL pages (use grep to find instances)
3. Update CHANGELOG.md with pricing changes
4. Test locally before deploying

### Design System

- Based on [The Monospace Web](https://github.com/owickstrom/the-monospace-web) framework
- Uses system fonts (monospace)
- Custom theme colors defined in `src/theme.css`
- Responsive tables and character-based layout

### Website Messaging Standards (CRITICAL)

**CONSISTENCY IS PARAMOUNT** - All pages must use identical messaging for core policies.

**Support Response Time Standard:**
```
Regular support: 4-hour SLA (business hours: M-F 9am-6pm ET), typically 30-min response, 7 days/week
Critical outages: IMMEDIATE response (automated alerts 24/7)
```

**Conservative SLA Approach:**
- **Promise:** 4-hour SLA (business hours)
- **Deliver:** Typically 30-min, 7 days/week
- **Never guarantee** "30 minutes" or "2 hours" as official SLA
- **Never use** "first 5 customers only" language - all customers receive same service level

**Table Formatting Standards:**
```css
/* Headers must be visually distinct from content */
table th {
  font-weight: 700;
  font-size: 1.05rem;
}

table td {
  font-weight: 400;
  font-size: 0.95rem;
}

/* NO bold tags in table content cells */
table td strong { font-weight: 400 !important; }
```

**When making website changes:**
1. Check ALL pages for consistency (use grep)
2. Never create conflicting messaging
3. Update DISCREPANCY-REPORT.md if you find inconsistencies
4. Test visual hierarchy: headers must look different from content

**Reference:** `website/DISCREPANCY-REPORT.md` for complete messaging audit

## Backend Development

**Status:** 85% production-ready (JWT auth, API complete, needs deployment config)

### Architecture Principles

1. **Layer Isolation:** API → Services → Repositories → Database (strict boundaries)
2. **No Direct DB Access:** Controllers NEVER touch database, only call services
3. **Zod Validation:** All inputs validated before reaching controllers
4. **Repository Pattern:** All database queries in `database/repositories/`
5. **Error Handling:** Consistent error format via `error.middleware.ts`

### Technology Stack

- **Node.js 18+** with TypeScript (strict mode)
- **Express.js** with async error handling
- **SQLite** (better-sqlite3) + **Turso** (cloud sync, optional)
- **JWT** authentication (express-jwt, jsonwebtoken)
- **Argon2id** password hashing (OWASP recommended)
- **Zod** schemas for validation
- **Winston** structured logging
- **Vitest** for testing

### Critical Files & Their Purposes

**Core Application:**
- `backend/src/api/app.ts` - Express setup, **middleware chain order** (CRITICAL: order matters!)
- `backend/src/api/routes/index.ts` - Central route registration (all endpoints listed here)
- `backend/src/index.ts` - Server entry point, starts Express + initializes DB

**Authentication:**
- `backend/src/api/middleware/auth.middleware.ts` - JWT verification (express-jwt)
- `backend/src/services/auth.service.ts` - Login, token generation, account lockout
- `backend/src/database/seeds/001_seed_admin_user.ts` - Creates default admin

**Database:**
- `backend/src/database/index.ts` - SQLite + Turso connection manager
- `backend/src/database/repositories/` - **ALL database queries** (NO direct DB access elsewhere)
- `backend/src/database/migrations/` - Schema migrations (never modify applied migrations)
- `backend/src/database/schema.ts` - TypeScript types matching DB schema

**Validation & Errors:**
- `backend/src/validators/` - Zod schemas (validate ALL inputs before controllers)
- `backend/src/api/middleware/error.middleware.ts` - Global error handler (MUST be last middleware)
- `backend/src/utils/errors.ts` - Custom error classes

**Integration Services:**
- `backend/src/integrations/stripe/` - Stripe payment processing
  - `client.ts` - Stripe SDK initialization
  - `webhooks.ts` - Webhook signature verification
  - `types.ts` - TypeScript types for Stripe objects
- `backend/src/integrations/resend/` - Email service (transactional emails)
  - `client.ts` - Resend API client
  - `templates.ts` - Email templates for notifications
  - `types.ts` - Email payload types
- `backend/src/integrations/turso/` - Cloud database synchronization
  - `client.ts` - Turso/libSQL client connection
  - `sync.ts` - SQLite → Turso sync logic

**Configuration:**
- `backend/src/config/index.ts` - Environment variables from `.env`
- `backend/.env.example` - Template for required environment variables

### Authentication

- **JWT tokens:** 24-hour expiration, HS256 algorithm
- **Password hashing:** Argon2id (OWASP recommended, 65536 memory cost)
- **Account lockout:** 5 failed attempts = 30-minute lock
- **Roles:** `admin`, `super_admin` (RBAC)
- **Default credentials (MUST CHANGE):** `admin@costplusdb.com` / `Admin123!ChangeMe`

### API Routes

```
GET  /health                  # Health check (public)
POST /api/auth/login          # Login (returns JWT)
GET  /api/auth/me             # Current user info (protected)
POST /api/intake              # Customer intake form (public)
POST /api/webhooks/stripe     # Stripe webhooks (verified)
GET  /api/customers           # List customers (admin only)
GET  /api/customers/:id       # Customer details (admin only)
```

See `backend/docs/API.md` for complete endpoint documentation.

### Environment Configuration

**Required Environment Variables** (copy `.env.example` to `.env`):

```bash
# Database
DATABASE_URL="file:../002-clients/database/costplusdb.db"
TURSO_DATABASE_URL="libsql://..."       # Optional cloud sync
TURSO_AUTH_TOKEN="..."                  # Optional

# Security
JWT_SECRET="openssl rand -base64 64"    # Generate strong secret
ENCRYPTION_KEY="..."                     # 64 hex chars

# Email (Resend)
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="costplusdb@intentsolutions.io"

# Payments (Stripe)
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Environment
NODE_ENV="development"                   # development | production
```

### Deployment (Production)

**Pre-deployment checklist** (see `000-docs/057-OD-DEPL-production-deployment-checklist.md`):
1. Change default admin password
2. Generate new JWT_SECRET
3. Set production API keys
4. Configure automated backups

```bash
cd backend
npm ci --production
npm run build
pm2 start ecosystem.config.js --env production
pm2 save && pm2 startup
```

### Database Migrations

Migrations are in `backend/src/database/migrations/`:

```bash
npm run db:migrate    # Apply all pending migrations
npm run db:seed       # Seed development data (admin user)
```

**Creating new migrations:**
1. Create `NNN_description.sql` in `migrations/`
2. Write SQL (schema changes only, no data)
3. Run `npm run db:migrate`
4. Never modify applied migrations

## Testing Infrastructure

### Backend Testing (Vitest + Supertest)

The backend has comprehensive test coverage with Vitest:

```bash
npm test                    # Run all tests
npm run test:unit           # Unit tests only (services, utilities)
npm run test:integration    # Integration tests (database, APIs)
npm run test:watch          # Watch mode for TDD
./test-auth.sh              # Quick auth validation (5 scenarios)
```

**Test structure mirrors src:**
```
backend/tests/
├── unit/              # Pure logic, no DB/HTTP
│   ├── services/      # Test service business logic
│   └── utils/         # Test utility functions
├── integration/       # Real DB/HTTP calls
│   ├── api/           # Test API endpoints
│   └── database/      # Test repositories
└── e2e/               # End-to-end tests (Playwright)
    ├── auth.spec.ts   # Authentication flows
    ├── intake.spec.ts # Customer intake form
    └── admin.spec.ts  # Admin dashboard
```

**Testing Best Practices:**
- **Unit tests:** Test services, not controllers (controllers are thin)
- **Integration tests:** Use real database, test repositories and API endpoints
- **E2E tests:** Full browser automation with Playwright
- **Coverage target:** 80%+ for services and repositories
- **Always test:** Before commits, before deployments, after migrations

**Anti-pattern:** Testing controllers directly. Controllers are thin - test services instead.

### PostgreSQL Testing Infrastructure

**Status:** In progress - 5 local PostgreSQL databases simulating Shared tier customers

**Purpose:** Validate CostPlusDB operations (backups, monitoring, SOPs) with realistic data before acquiring real customers.

**The 5 Test Databases** - Each simulates a different **Shared tier** ($59/mo) workload:

| Database | Use Case | Data Volume | Purpose |
|----------|----------|-------------|---------|
| customer1 | E-commerce | 10K products, 50K orders | Test transaction-heavy workloads |
| customer2 | SaaS Startup | 5K users, 100K events | Test event logging patterns |
| customer3 | Blog/CMS | 20K posts, 100K comments | Test read-heavy workloads |
| customer4 | Mobile API | 10K users, 500K API calls | Test high-volume API patterns |
| customer5 | Analytics | 250K events | Test time-series data |

**Test Data Generation** - Uses **Vertex AI Flash 2.0** (free tier, zero cost):
- GCP Project: `cost-plus-db` (already configured)
- Generates realistic schemas and INSERT statements
- Scripts in `testing/local-customer-databases/vertex-ai/`

**What gets validated:**
- pgBackRest backup/restore procedures (SOP-001)
- Betterstack monitoring and alerts (SOP-004)
- pgBouncer connection pooling configuration
- Customer onboarding workflow (from intake form to live database)
- Incident response procedures (SOP-003: Emergency Response)
- All SOPs work with real data, not just documentation

**Quick setup:** See `testing/local-customer-databases/README.md` for 3-step setup guide.

### PostgreSQL Benchmarking Standards

**Dual-Benchmark Strategy:** CostPlusDB uses TWO industry-standard benchmarking tools for comprehensive performance validation.

**Strategy:** pgbench (PostgreSQL official) + sysbench-tpcc (cloud industry standard)

**Purpose:**
- Establish baseline performance metrics
- Validate hardware sizing for customer tiers
- Support transparent pricing with data
- Enable competitive comparisons with cloud providers

**Tools:**

1. **pgbench** - PostgreSQL Official Tool
   - Built into PostgreSQL 16
   - TPC-B-like workload (banking transactions)
   - Official PostgreSQL community standard
   - Command: `pgbench --version`
   - Location: Included with PostgreSQL installation

2. **sysbench-tpcc** - Cloud Industry Standard
   - TPC-C-like workload (e-commerce/supply chain)
   - Used by AWS, PlanetScale, major cloud providers
   - More complex than pgbench (closer to real-world)
   - Location: `testing/benchmarks/sysbench-tpcc/`
   - Repository: https://github.com/Percona-Lab/sysbench-tpcc

**Quick Benchmarks:**

```bash
# pgbench - Simple TPC-B-like test
cd /path/to/postgres
pgbench -i -s 100 costplusdb_benchmark  # Initialize
pgbench -c 10 -j 2 -T 60 costplusdb_benchmark  # Run 60-second test

# sysbench-tpcc - TPC-C-like test
cd testing/benchmarks/sysbench-tpcc
./tpcc.lua --pgsql-host=localhost --pgsql-port=5433 \
  --pgsql-user=postgres --pgsql-db=costplusdb_benchmark \
  --threads=4 --tables=10 --scale=1 --time=300 \
  --db-driver=pgsql prepare

./tpcc.lua --pgsql-host=localhost --pgsql-port=5433 \
  --pgsql-user=postgres --pgsql-db=costplusdb_benchmark \
  --threads=4 --tables=10 --scale=1 --time=300 \
  --db-driver=pgsql run
```

**Key Metrics:**
- **TPS** (Transactions Per Second) - Primary throughput metric
- **Latency** (ms) - Response time (average, p95, p99)
- **New Order TPS** - TPC-C primary metric

**Scale Factors by Tier:**

| Tier | pgbench Scale | sysbench-tpcc Scale | DB Size |
|------|---------------|---------------------|---------|
| Shared (2GB) | 50 | 1 | ~750MB-2GB |
| Dedicated (8GB) | 100 | 5 | ~1.5GB-10GB |
| Pro (16GB) | 200 | 10 | ~3GB-20GB |
| Enterprise (32GB) | 400 | 25 | ~6GB-50GB |

**Documentation:**
- **073-TQ-TEST-postgresql-benchmarking-standards.md** - Complete benchmarking guide
- **testing/benchmarks/benchmarking-project/** - Benchmark methodology and results
- **testing/benchmarks/sysbench-tpcc/** - TPC-C implementation

**Performance SLAs (Baseline):**
- Shared: >500 TPS (pgbench), <20ms latency
- Dedicated: >1000 TPS (pgbench), <10ms latency

**Benchmark Schedule:**
- Initial baseline: Before first customer
- Monthly validation: Track performance over time
- Before major changes: Validate impact of upgrades/config changes

**Reference Standards:**
- **pgbench:** https://www.postgresql.org/docs/current/pgbench.html
- **TPC-C:** https://www.tpc.org (official standard)
- **PlanetScale methodology:** https://planetscale.com/blog/benchmarking-postgres

## Important Architectural Decisions

### Why SQLite + Turso (Not PostgreSQL) for Backend?

**CRITICAL CLARIFICATION:** The backend manages **customer metadata** (intake forms, billing, onboarding status), NOT customer PostgreSQL databases.

- **Backend DB (SQLite):** Customer intake forms, billing info, admin users
  - Located: `002-clients/database/costplusdb.db`
  - Purpose: Low-write admin data, zero ops overhead
  - Optional sync: Turso for global edge replication

- **Customer DBs (PostgreSQL):** Customer production databases
  - Located: Separate VPS servers (Contabo, Hetzner, etc.)
  - Purpose: Customer workloads (e-commerce, SaaS, etc.)
  - Managed via: SOPs in `005-DR-SOPS-postgresql-operations.md`

**Don't confuse:** Backend database (SQLite) ≠ Customer databases (PostgreSQL on VPS)

**Why this matters:** When you see "database" in the backend code, it refers to SQLite (customer metadata), NOT the PostgreSQL instances we provision for customers.

### Why No ORM?

- **Direct SQL:** Better-sqlite3 with raw SQL queries in repositories
- **Type safety:** TypeScript types match database schema manually
- **Performance:** No query builder overhead
- **Transparency:** See exact SQL being executed

### Customer Data Location

```
002-clients/
├── database/
│   └── costplusdb.db           # SQLite: customer metadata, intake forms
│
(Customer PostgreSQL databases run on separate VPS, managed via SOPs)
```

### Middleware Chain Order (Critical - DO NOT REORDER)

From `backend/src/api/app.ts`, the middleware executes in this EXACT order:

```typescript
1. helmet                  # Security headers (CSP, X-Frame-Options, etc.)
2. cors                    # CORS policy (config.CORS_ORIGINS)
3. express.json()          # Parse JSON bodies (10mb limit)
4. requestLogger           # Log all requests (Winston)
5. rate limiting           # 100 req/15min per IP (only on /api/ routes)
6. routes                  # Application routes (from routes/index.ts)
7. 404 handler             # Catch undefined routes
8. errorHandler            # Global error handler (MUST be last)
```

**Why order matters:**
- Security headers MUST be first
- Body parsing BEFORE routes (or req.body is undefined)
- Error handler MUST be last (catches all errors from above)
- Logging BEFORE rate limiting (see all attempts, even blocked ones)

**Anti-pattern:** Adding middleware after `errorHandler` - it will never execute!

### Error Handling Pattern

All controllers use async functions. Express-async-errors catches Promise rejections automatically. Errors bubble up to `error.middleware.ts` which formats consistent responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "errors": [...]
  }
}
```

## Quick Reference

### Starting a New Session

1. Read `000-docs/061-PM-HAND-session-handoff-2025-10-20.md` (session handoff)
2. Read `000-docs/059-DR-AUDIT-comprehensive-security-audit.md` (security audit)
3. Check recent commits: `git log -5 --oneline`
4. Review README.md for current project status

### Common Tasks

**Run backend locally:**
```bash
cd backend
npm run dev                  # Starts on localhost:3000
```

**Test authentication:**
```bash
cd backend
./test-auth.sh               # 5 auth scenarios
```

**Create new documentation:**
```bash
cd 000-docs
ls -1 | tail -5              # Check last sequence number
# Create: NNN-CC-ABCD-description.md
```

**Preview website:**
```bash
cd website
python3 -m http.server 8000  # localhost:8000
```

### Diagnostics & Troubleshooting

**Quick Health Checks:**
```bash
# Check backend is running
curl http://localhost:3000/health

# Check database connection
cd backend && npm run db:migrate

# Check PostgreSQL status (test databases)
sudo systemctl status postgresql
psql -U postgres -l  # List all databases

# Check Node.js version
node -v  # Should be 18+

# View backend logs
cd backend
tail -f logs/app.log
tail -f logs/error.log

# Check environment variables
cd backend
cat .env | grep -v "^#" | grep -v "^$"
```

**Common Issues & Solutions:**

| Issue | Diagnostic | Solution |
|-------|-----------|----------|
| Build fails | `node -v` | Ensure Node.js 18+ installed |
| Auth fails | Check `.env` for `JWT_SECRET` | Run `npm run db:seed` to create admin user |
| DB errors | `npm run db:migrate` | Run migrations, check database file exists |
| Missing deps | `ls node_modules/` | Delete `node_modules/`, run `npm install` |
| Port already in use | `lsof -i :3000` | Kill process or change PORT in `.env` |
| Cannot connect to PostgreSQL | `sudo systemctl status postgresql` | Start service: `sudo systemctl start postgresql` |
| Secrets not loading | `cat backend/.env` | Copy `.env.example` to `.env`, fill values |
| Tests failing | `npm run test:unit` | Check test output, ensure DB is seeded |

**Security Diagnostics:**
```bash
# Check for exposed secrets in git history
cd /home/admincostplus/projects/costplusdb
gitleaks detect --no-git

# Verify firewall rules (on VPS)
sudo ufw status verbose

# Check fail2ban status (on VPS)
sudo fail2ban-client status

# Scan for security vulnerabilities
cd backend
npm audit
npm audit fix  # Apply automatic fixes

# Check SSL certificate expiry (on VPS)
cd 001-security/scripts/monitoring
./check-ssl-expiry.sh
```

**Database Diagnostics:**
```bash
# Check SQLite database integrity
cd 002-clients/database
sqlite3 costplusdb.db "PRAGMA integrity_check;"

# List all tables
sqlite3 costplusdb.db ".tables"

# Check PostgreSQL test databases
psql -U postgres -c "\l" | grep customer

# Verify backup configuration
cat 001-security/config/backup/pgbackrest.conf
pgbackrest --stanza=costplusdb info  # Check backup status
```

### When Things Go Wrong

**Step-by-step Debugging:**

1. **Backend won't start:**
   ```bash
   cd backend
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   npm run dev
   ```

2. **Authentication fails:**
   ```bash
   cd backend
   # Verify JWT_SECRET exists
   grep JWT_SECRET .env

   # Recreate admin user
   npm run db:seed

   # Test auth manually
   ./test-auth.sh
   ```

3. **Database errors:**
   ```bash
   cd backend
   # Check database exists
   ls -la ../002-clients/database/costplusdb.db

   # Reset database (CAUTION: destroys data)
   rm ../002-clients/database/costplusdb.db
   npm run db:init
   npm run db:migrate
   npm run db:seed
   ```

4. **Tests failing:**
   ```bash
   cd backend
   # Run tests with verbose output
   npm run test:unit -- --reporter=verbose

   # Run single test file
   npm run test:unit tests/unit/services/auth.service.test.ts
   ```

5. **Production deployment issues:**
   - Check `000-docs/057-OD-DEPL-production-deployment-checklist.md`
   - Verify all environment variables are set
   - Ensure secrets are rotated from development values
   - Check PM2 process status: `pm2 status`
   - View PM2 logs: `pm2 logs costplusdb-backend`

### Project Context

- **Solo project** by Jeremy Longshore (jeremy@intentsolutions.io)
- **Mission:** Transparent database hosting at cost + 25%
- **Status:** Backend 85% ready, testing in progress, pre-launch
- **Next milestone:** First customer onboarding

### Key Files to Know

| File | Purpose |
|------|---------|
| `backend/src/api/app.ts` | Express app setup, middleware chain |
| `backend/src/api/routes/index.ts` | All routes registered here |
| `backend/src/services/auth.service.ts` | Authentication logic |
| `backend/src/database/index.ts` | Database connection manager |
| `002-clients/database/costplusdb.db` | Customer metadata (SQLite) |
| `000-docs/057-OD-DEPL-production-deployment-checklist.md` | Pre-launch checklist |

### Architecture Mental Model

```
Website (static HTML)
    ↓
Backend API (Express/TypeScript)
    ↓
Customer Metadata DB (SQLite + Turso)

Separate:
Customer PostgreSQL Databases (on VPS, managed via SOPs)
```

**Remember:** Backend DB ≠ Customer DBs (different servers, different purposes)

## Common Pitfalls & Anti-Patterns

### Backend Anti-Patterns (DO NOT DO)

❌ **Direct database access from controllers**
```typescript
// WRONG
export const getCustomer = async (req, res) => {
  const db = getLocalDb();
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  res.json(customer);
};
```

❌ **Skipping Zod validation**
```typescript
// WRONG - No validation
router.post('/intake', async (req, res) => {
  await intakeService.createIntake(req.body); // Dangerous!
});
```

❌ **Adding middleware after error handler**
```typescript
// WRONG - This will NEVER execute
app.use(errorHandler);
app.use(someOtherMiddleware); // Unreachable code
```

❌ **Modifying applied migrations**
```typescript
// WRONG - Never edit migrations/001_initial.sql after it's been applied
// Create a NEW migration instead
```

❌ **Assuming code works without testing**
```typescript
// WRONG - "This should work now" without running npm run dev
```

### Documentation Anti-Patterns (DO NOT DO)

❌ **Creating docs outside 000-docs/**
```bash
# WRONG
echo "# Guide" > my-guide.md

# CORRECT - Check sequence number first
ls -1 000-docs/*.md | tail -1  # Check last number
# Create: 000-docs/069-DR-GUID-your-guide.md
```

❌ **Wrong naming format**
```bash
# WRONG
000-docs/my-new-doc.md
000-docs/guide.md

# CORRECT
000-docs/069-DR-GUID-short-description.md
```

❌ **Creating directories without permission**
```bash
# WRONG - Never create new directories without explicit approval
mkdir backend/new-feature

# CORRECT - Ask first, explain structure
# "I need to create backend/new-feature/ for X purpose. Is this correct?"
```

### Website Anti-Patterns (DO NOT DO)

❌ **Inconsistent messaging across pages**
```html
<!-- WRONG - Different SLA on different pages -->
<!-- index.html: "30-minute response time" -->
<!-- about.html: "2-hour response time" -->

<!-- CORRECT - Same messaging everywhere -->
<!-- "4-hour SLA (M-F 9am-6pm ET), typically 30-min, 7 days/week" -->
```

❌ **Bold tags in table content cells**
```html
<!-- WRONG - Visual hierarchy broken -->
<td><strong>Important data</strong></td>

<!-- CORRECT - Only headers are bold -->
<th>Header</th>
<td>Regular content</td>
```

### Key Reminders

1. **Test everything** - "Always Works™" means actually running the code
2. **Follow layer boundaries** - Controllers → Services → Repositories
3. **Validate all inputs** - Zod schemas before controllers
4. **Check docs sequence** - `ls -1 000-docs/*.md | tail -1` before creating
5. **Ask before creating files** - Especially directories or new structure
6. **Keep messaging consistent** - Grep across all pages when changing claims

## Version Control & Git Workflow

### Branch Strategy

**Main Branches:**
- `main` - Production-ready code (protected, requires PR approval)
- `develop` - Integration branch for features (optional, currently using main directly)

**Feature Branches:**
- Format: `feature/description-of-feature`
- Example: `feature/add-customer-dashboard`
- Branch from `main`, merge back via pull request

**Hotfix Branches:**
- Format: `hotfix/critical-issue-description`
- Example: `hotfix/fix-authentication-bypass`
- Branch from `main`, merge immediately after testing

### Commit Message Standards

**Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Formatting, missing semicolons, etc.
- `refactor:` - Code restructuring without behavior change
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks (deps, build, etc.)
- `security:` - Security improvements or fixes

**Examples:**
```
feat(auth): add account lockout after 5 failed attempts

Implements OWASP-recommended account lockout to prevent
brute force attacks. Locks account for 30 minutes after
5 consecutive failed login attempts.

Refs: 000-docs/059-DR-AUDIT-comprehensive-security-audit.md

---

fix(backend): prevent SQL injection in customer query

Replaced string concatenation with parameterized queries
in customer repository to prevent SQL injection attacks.

SECURITY: Critical vulnerability fix

---

docs(claude): update CLAUDE.md with corporate IT standards

Added sections for:
- Security & configuration management
- Operational scripts documentation
- Corporate IT standards compliance
- Diagnostics & troubleshooting
```

### Pre-Commit Checklist

**Before every commit:**
```bash
# 1. Run linter
npm run lint

# 2. Run tests
npm test

# 3. Check for secrets
gitleaks detect --no-git

# 4. Format code
npm run format

# 5. Type check
npm run type-check

# 6. Build to verify no errors
npm run build
```

### Git Hooks (Recommended)

Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
cd backend
npm run lint || exit 1
npm test || exit 1
npm run type-check || exit 1
```

Make executable: `chmod +x .git/hooks/pre-commit`

### Security in Version Control

**Never commit:**
- `.env` files (use `.env.example` instead)
- Private keys (`.key`, `.pem` files)
- API keys or tokens
- Database passwords
- S3 credentials
- SSL certificates (unless public)

**Always commit:**
- `.env.example` with placeholder values
- Configuration templates
- Public documentation
- Test data (non-sensitive)

**If you accidentally commit secrets:**
1. Rotate the compromised secrets immediately
2. Use `git filter-branch` or BFG Repo-Cleaner to remove from history
3. Force push to remote (if private repo)
4. Document incident in `001-security/logs/`

### .gitignore Standards

The repository `.gitignore` should exclude:
```
# Dependencies
node_modules/
package-lock.json (committed for reproducibility)

# Environment
.env
.env.local
.env.*.local

# Build outputs
dist/
build/
*.log

# Database files (local development)
*.db
*.sqlite

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Secrets
*.key
*.pem
*-key.json
```

### Release Process

**Versioning:** Follow Semantic Versioning (SemVer)
- `MAJOR.MINOR.PATCH` (e.g., 1.2.0)
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

**Release Checklist:**
1. Update `CHANGELOG.md` with all changes
2. Update version in `package.json`
3. Run full test suite (`npm test`)
4. Create git tag: `git tag -a v1.2.0 -m "Release v1.2.0"`
5. Push tag: `git push origin v1.2.0`
6. Create GitHub release with changelog
7. Deploy to production following deployment checklist

### Code Review Standards

**Before merging:**
- [ ] All tests pass
- [ ] Code follows architectural patterns
- [ ] Documentation updated
- [ ] Security considerations reviewed
- [ ] No hardcoded secrets
- [ ] Changelog updated
- [ ] Backward compatibility verified (if applicable)

**Review checklist:**
- Architecture: Follows layered architecture (Controller → Service → Repository)
- Security: Input validation, authentication, authorization
- Performance: Database queries optimized, no N+1 problems
- Testing: Adequate test coverage (80%+ for services)
- Documentation: Code comments, API docs, CLAUDE.md updates

