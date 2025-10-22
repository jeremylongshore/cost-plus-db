# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CostPlusDB** (formerly FairDB) is a transparent, affordable managed PostgreSQL database service. The project includes business planning documents, standard operating procedures, and infrastructure for providing PostgreSQL databases to customers.

**GitHub Repository**: https://github.com/jeremylongshore/cost-plus-db.git

## Project Status

This is an **early-stage project** currently in the planning and documentation phase. The focus is on:
- Business model development
- Infrastructure SOPs for VPS management and PostgreSQL operations
- Pricing structure and cost calculations
- Customer onboarding workflows

The `backend/` and `scripts/` directories are currently empty, awaiting implementation once planning is finalized.

## Architecture

The project is organized into the following top-level directories:

- `000-docs/` - **All AI-generated documentation must be placed here** (see Documentation Standards below)
- `backend/` - Backend application code (not yet implemented)
- `website/` - Website/frontend code (contains temp CSS from monospace-web)
- `scripts/` - Operational automation scripts (not yet implemented)
- `logs/` - Log files (not committed to git)

## Key Documentation

The `000-docs/` directory contains the complete business and operational documentation:

1. **001-PP-PLAN-costplusdb-overview.md** - Complete technical, business, and client blueprint
2. **002-PP-PLAN-pricing-structure.md** - Pricing tiers and calculations
3. **003-PP-PLAN-complete-launch-guide.md** - Launch checklist and timelines
4. **004-PP-PLAN-cost-calculations.md** - Detailed cost modeling
5. **005-DR-SOPS-postgresql-operations.md** - Comprehensive operational procedures including:
   - VPS setup and hardening
   - PostgreSQL installation and configuration
   - Backup systems (pgBackRest + Wasabi S3)
   - Monitoring, incident response, and maintenance procedures

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
- Base directory: `website`
- Publish directory: `.` (relative to base)
- Deploy on push to `main` branch

Configuration is in `website/netlify.toml` including security headers, redirects, and form handling.

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

**Current State**: ✅ **PRODUCTION READY** (85% - pending deployment configuration)

The backend application is fully implemented with production-ready authentication, security, and infrastructure:

### Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite (local development) + Turso (optional cloud sync)
- **Authentication**: JWT with express-jwt and jsonwebtoken
- **Password Hashing**: Argon2id (OWASP recommended)
- **Process Manager**: PM2
- **Secrets Management**: dotenv-vault
- **Email**: Resend API
- **Payments**: Stripe

### Backend Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── controllers/      # Request handlers
│   │   ├── middleware/       # Auth, CORS, error handling
│   │   └── routes/           # API route definitions
│   ├── services/             # Business logic (auth, database, email)
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Logger, validators, helpers
│   ├── database/
│   │   ├── migrations/       # SQL schema migrations
│   │   └── seeds/            # Database seed data
│   ├── config.ts             # Environment configuration
│   └── index.ts              # Application entry point
├── scripts/
│   └── backup-database.sh    # Automated backup script
├── ecosystem.config.js       # PM2 configuration
├── test-auth.sh              # Authentication test script
└── .env                      # Environment variables (gitignored)
```

### Authentication System

**Implementation**: Industry-standard JWT authentication with role-based access control

**Features**:
- JWT tokens (24-hour expiration, HS256 algorithm)
- Argon2id password hashing (65536 memory cost, 3 iterations)
- Account lockout (5 failed attempts = 30-minute lock)
- Role-based access (admin, super_admin)
- Protected admin routes
- Password change functionality
- Token refresh capability

**Admin Users Table**: `backend/src/database/migrations/001_create_admin_users.sql`

**Default Admin Credentials** (CHANGE IN PRODUCTION):
- Email: admin@costplusdb.com
- Password: Admin123!ChangeMe
- Role: super_admin

**Auth Endpoints**:
- POST `/api/auth/login` - Authenticate and receive JWT
- POST `/api/auth/logout` - Logout (client discards token)
- GET `/api/auth/me` - Get current user info
- POST `/api/auth/change-password` - Change password
- POST `/api/auth/refresh` - Refresh JWT token

### API Routes

All routes are under `/api`:

- **Health Check**: GET `/health` - Server health status
- **Authentication**: `/api/auth/*` - Login, logout, user info
- **Customer Intake**: `/api/intake` - Public customer onboarding form
- **Webhooks**: `/api/webhooks` - Stripe payment webhooks
- **Customers**: `/api/customers` - Customer management (requires auth)
- **Admin**: `/api/admin/*` - Admin operations (requires admin role)

### Production Deployment

**Requirements Before Deployment**:
1. ⚠️  Change default admin password
2. ⚠️  Generate production JWT_SECRET: `openssl rand -base64 64`
3. ⚠️  Set production API keys (Resend, Stripe, Turso)
4. ⚠️  Configure SSL/TLS certificates
5. ⚠️  Set up automated backups (cron job)
6. ⚠️  Configure monitoring (UptimeRobot)

**Deployment Process**:
```bash
# 1. Build production application
cd backend
npm ci --production
npm run build

# 2. Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# 3. Configure automated backups
crontab -e
# Add: 0 2 * * * /path/to/backend/scripts/backup-database.sh

# 4. Verify deployment
curl https://api.yourdomain.com/health
```

**See Full Deployment Checklist**: `000-docs/057-OD-DEPL-production-deployment-checklist.md`

### Security Implementation

A comprehensive 4-phase security implementation was completed on 2025-10-20:

**Phase 1: Security Audit** (17 minutes)
- Gitleaks secret scanning (109 commits scanned)
- Credential analysis and rotation procedures
- Git history cleanup procedure

**Phase 2: Authentication** (35 minutes)
- JWT-based authentication system
- Argon2id password hashing
- Account lockout mechanism
- Role-based access control
- 5/5 tests passed

**Phase 3: Production Prep** (15 minutes)
- dotenv-vault for secrets management
- PM2 process manager configuration
- Automated backup scripts
- Comprehensive deployment checklist

**Phase 4: Documentation & Audit** (Completed)
- Comprehensive security audit report
- Phase verification reports
- Production readiness assessment
- Security rating: STRONG (85% ready)

**Security Documentation**:
- `000-docs/056-DR-AUDIT-phase-2-authentication-verification.md`
- `000-docs/057-OD-DEPL-production-deployment-checklist.md`
- `000-docs/058-DR-AUDIT-phase-3-production-prep-verification.md`
- `000-docs/059-DR-AUDIT-comprehensive-security-audit.md`

### Environment Configuration

Copy `backend/.env.example` to `backend/.env` and configure:

**Required Variables**:
- `DATABASE_URL` - SQLite database path
- `JWT_SECRET` - JWT signing secret (64+ chars)
- `ENCRYPTION_KEY` - Data encryption key (64 hex chars)
- `RESEND_API_KEY` - Email service API key
- `STRIPE_SECRET_KEY` - Payment processing key
- `NODE_ENV` - Environment (development/production)

**See**: `backend/.env.example` for full configuration documentation

### Local Development

```bash
# Install dependencies
cd backend
npm install

# Run migrations
npm run db:migrate

# Seed admin user
npm run db:seed

# Start development server
npm run dev

# Server starts on http://localhost:3000
# Health check: http://localhost:3000/health
```

### Testing

**Manual Testing**:
```bash
cd backend
./test-auth.sh
```

**Test Coverage**:
- ✅ Login with valid credentials
- ✅ Login with invalid credentials
- ✅ Protected route access with token
- ✅ Protected route access without token
- ✅ User info retrieval

### Production Monitoring

**Process Monitoring**: PM2 built-in monitoring
```bash
pm2 status                   # Check process status
pm2 logs costplusdb-backend  # View logs
pm2 monit                    # Real-time monitoring
```

**Health Check**: GET `/health` endpoint for external monitoring (UptimeRobot)

**Backups**: Daily automated backups at 2 AM (cron job + Wasabi S3)

### Operational Scripts

**Automated Backups**:
```bash
# Manual backup
backend/scripts/backup-database.sh

# Automated via cron (daily 2 AM)
0 2 * * * /path/to/backend/scripts/backup-database.sh
```

**Process Management**:
```bash
pm2 start ecosystem.config.js --env production
pm2 restart costplusdb-backend
pm2 stop costplusdb-backend
pm2 logs costplusdb-backend
```

---

## Testing Infrastructure (Current Development)

**Status:** IN PROGRESS (2025-10-21)

### Overview

Building comprehensive testing environment with 5 local PostgreSQL databases to validate CostPlusDB operations before acquiring first customer.

### 5 Test Customer Databases (Shared Tier)

All databases simulate **Shared tier** ($59/mo) customers with different workload patterns:

| Database | Use Case | Schema Focus | Data Volume |
|----------|----------|--------------|-------------|
| `costplusdb_customer1` | E-commerce Shop | Products, Orders, Customers | 10K products, 50K orders |
| `costplusdb_customer2` | SaaS Startup | Users, Subscriptions, Events | 5K users, 100K events |
| `costplusdb_customer3` | Blog/CMS | Posts, Comments, Media | 20K posts, 100K comments |
| `costplusdb_customer4` | Mobile App API | Users, Sessions, Logs | 10K users, 500K API calls |
| `costplusdb_customer5` | Analytics Platform | Events, Metrics, Reports | 250K events |

### Test Data Generation

**Using Vertex AI Flash 2.0 (Free Tier):**
- No Claude Code tokens used for data generation
- Realistic schemas and data generated via Google Cloud
- GCP Project: `cost-plus-db`
- Region: us-central1
- Free tier limit: 2M tokens/month
- Estimated usage: ~500K tokens

### Directory Structure

```
testing/local-customer-databases/
├── README.md                    # Setup guide and overview
├── GCP-PROJECT-SETUP.md        # Google Cloud project setup instructions
├── scripts/
│   ├── 01-setup-databases.sh   # Creates 5 local PostgreSQL databases
│   ├── 02-import-data.sh       # Imports generated SQL data
│   └── 03-verify-setup.sh      # Verifies all databases are ready
├── schemas/
│   ├── customer1-ecommerce.sql
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

### Setup Progress

- ✅ GCP project `cost-plus-db` created
- ✅ Google Cloud SDK installed
- ✅ Testing directory structure created
- 🔄 Configuring Vertex AI authentication
- 🔄 Creating database schemas
- 📋 Generating test data with Vertex AI
- 📋 Setting up local PostgreSQL databases
- 📋 Importing test data
- 📋 Validating backups/restores
- 📋 Testing monitoring setup

### What Will Be Tested

Once setup is complete:

1. **Backup/Restore Procedures**
   - pgBackRest full backups
   - Point-in-time recovery (PITR)
   - Wasabi S3 integration
   - Multi-database backup orchestration

2. **Monitoring & Alerting**
   - Betterstack uptime monitoring
   - pg_stat_statements query analysis
   - Database health checks
   - Alert notification delivery

3. **Performance**
   - Query performance under load
   - Connection pooling (pgBouncer)
   - Resource usage tracking
   - Storage growth patterns

4. **Operations**
   - Customer onboarding workflow
   - Database provisioning
   - Migration procedures
   - Incident response

5. **SOPs Validation**
   - 005-DR-SOPS-postgresql-operations.md procedures
   - Security implementation
   - Compliance workflows

### Cost

- **Local PostgreSQL:** $0 (uses local machine)
- **Vertex AI:** $0 (free tier)
- **Total:** $0

### Quick Start (For Future Reference)

```bash
# 1. Setup GCP authentication
gcloud auth login
gcloud config set project cost-plus-db

# 2. Generate test data
cd testing/local-customer-databases/vertex-ai
python generate-test-data.py

# 3. Create local databases
cd ..
./scripts/01-setup-databases.sh

# 4. Import generated data
./scripts/02-import-data.sh

# 5. Verify setup
./scripts/03-verify-setup.sh
```

### Next Steps After Testing

1. Validate all SOPs work with realistic data
2. Document any gaps or improvements needed
3. Practice incident response scenarios
4. Create customer demo environments
5. Move to Dedicated/Pro/Enterprise tier testing

---

**See:** `testing/local-customer-databases/README.md` for complete setup instructions.

