# COSTPLUSDB: Complete System Analysis & Operations Guide

*For: DevOps Engineer Onboarding*
*Generated: 2025-10-20*
*System Version: 1.0.0*
*Production Status: Pre-Launch (85% Ready)*

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Directory Deep-Dive](#3-directory-deep-dive)
4. [Operational Reference](#4-operational-reference)
5. [Security & Access](#5-security--access)
6. [Cost & Performance](#6-cost--performance)
7. [Development Workflow](#7-development-workflow)
8. [Dependencies & Supply Chain](#8-dependencies--supply-chain)
9. [Current State Assessment](#9-current-state-assessment)
10. [Quick Reference](#10-quick-reference)
11. [Recommendations Roadmap](#11-recommendations-roadmap)
12. [Appendices](#12-appendices)

---

## 1. Executive Summary

CostPlusDB is a **transparent, affordable managed PostgreSQL database service** that operates on a cost-plus pricing model. We show customers exactly what infrastructure costs, then add 25% markup. The system is currently **85% production-ready** and designed to onboard the first 5 customers during early access.

### Current State

- **Production Status**: Pre-launch, backend complete, authentication pending
- **Environments**: Development (local), staging environment needed, production VPS not yet provisioned
- **Scale**: Designed for 5 customers in month 1, scalable to 100+ customers
- **Team**: Solo operator (Jeremy Longshore), expanding to include DevOps engineer

### Technology Foundation

- **Backend**: Node.js 18+ with TypeScript 5.3, Express 4 framework
- **Database**: SQLite (customer metadata via Turso cloud sync) + PostgreSQL 16 (customer databases)
- **Infrastructure**: Initially Contabo VPS ($6.50/mo), scaling to Hetzner/AWS
- **Payments**: Stripe for payment processing
- **Email**: Resend for transactional emails
- **Hosting**: Netlify (static website), VPS (backend API + PostgreSQL)

### Key Architectural Decisions

**1. Dual Database Strategy**
- **SQLite/Turso**: Customer metadata, billing, workflow tracking (fast, edge-replicated)
- **PostgreSQL**: Customer production databases (isolated, provisioned on-demand)
- **Rationale**: Separate admin operations from customer workloads, different scaling characteristics

**2. Transparent Cost Structure**
- All infrastructure costs visible in billing records
- 87% margin on base tiers, 25% markup on add-ons
- Customers see `our_cost` vs `your_price` in invoices

**3. Manual-First, Automate Later**
- Initial onboarding requires human consultation (15-30 min call)
- Database provisioning via tested bash scripts
- Gradual automation as processes stabilize

**4. Monolithic Backend with Service-Oriented Architecture**
- Single Node.js backend serving REST API
- Internal services layer (email, provisioning, billing, workflow, stripe)
- Ready to extract microservices if needed (currently unnecessary)

---

## 2. System Architecture Overview

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend/UI** | Static HTML/CSS/JS | N/A | Marketing website, intake form |
| **Backend/API** | Node.js + Express + TypeScript | 18.0+, 4.18, 5.3 | REST API, business logic |
| **Database (Admin)** | SQLite + Turso | 3.x, libSQL | Customer metadata, billing, workflow |
| **Database (Customer)** | PostgreSQL | 16 | Customer production databases |
| **Caching** | None (yet) | N/A | Future: Redis for sessions |
| **Queue/Messaging** | None (yet) | N/A | Future: Bull/BullMQ for async jobs |
| **Infrastructure** | Contabo VPS (initial) | Ubuntu 24.04 | Compute + PostgreSQL hosting |
| **Backups** | pgBackRest + Wasabi S3 | Latest | Point-in-time recovery (7 days) |
| **Email** | Resend | API v2 | Transactional emails |
| **Payments** | Stripe | API v14 | Payment processing, subscriptions |
| **Monitoring** | Winston (logs) | 3.11 | Structured logging (future: UptimeRobot) |
| **Deployment** | Manual SSH (initial) | N/A | Future: GitHub Actions CI/CD |

### Cloud Services in Use

| Service | Purpose | Environment | Key Config |
|---------|---------|-------------|------------|
| **Netlify** | Static website hosting | Production | Auto-deploy from `main` branch, `website/` dir |
| **Turso** | SQLite edge replication | Production (future) | Optional, sync customer metadata to edge |
| **Wasabi S3** | PostgreSQL backup storage | Production | 30-day retention, lifecycle policies |
| **Resend** | Email delivery | Production | Custom domain: costplusdb@intentsolutions.io |
| **Stripe** | Payment processing | Test + Production | Webhooks for payment events |
| **Contabo** | VPS compute | Production (pending) | 8GB RAM, 200GB NVMe, $6.50/mo |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CUSTOMER JOURNEY                         │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STATIC WEBSITE (Netlify)                    │
│  - Marketing pages (index.html, about.html, security.html)      │
│  - Intake form (calculator.html) → POST /api/intake             │
└──────────────────────────────┬──────────────────────────────────┘
                                 │
                                 ▼ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API (Node.js/Express)                 │
│  - REST API (18 endpoints)                                       │
│  - Authentication (JWT) [PENDING]                                │
│  - Rate limiting (100 req/15min global, 10 req/hr intake)       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  SERVICE LAYER                                              │ │
│  │  - customer.service.ts (intake, approval, CRUD)             │ │
│  │  - workflow.service.ts (12-checkpoint tracking)             │ │
│  │  - provisioning.service.ts (database creation)              │ │
│  │  - billing.service.ts (transparent pricing)                 │ │
│  │  - email.service.ts (Resend integration)                    │ │
│  │  - stripe.service.ts (payment processing)                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────┬───────────────────────────┬──────────────────────┘
               │                           │
               ▼                           ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│  CUSTOMER METADATA DB    │   │  EXTERNAL SERVICES       │
│  (SQLite + Turso)        │   │                          │
│  - customers (prospect→  │   │  - Resend (email)        │
│    active lifecycle)     │   │  - Stripe (payments)     │
│  - workflow (12 stages)  │   │  - Wasabi (backups)      │
│  - billing & invoices    │   │                          │
│  - databases (metadata)  │   └──────────────────────────┘
│  - activity_log (audit)  │
└──────────────────────────┘
               │
               ▼ Provisioning Scripts (Bash)
┌──────────────────────────────────────────────────────────────────┐
│               CUSTOMER DATABASES (PostgreSQL 16)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  acmecorp_db │  │ techco_db    │  │ startup_db   │  ...      │
│  │  (Isolated)  │  │ (Isolated)   │  │ (Isolated)   │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│  - SSL/TLS enforced                                               │
│  - pgBouncer connection pooling                                   │
│  - pgBackRest backups → Wasabi S3                                │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow: Customer Onboarding

```
1. Customer submits intake form (calculator.html)
   ↓
2. POST /api/intake → Validates 40+ fields (Zod)
   ↓
3. customer.service.processIntakeForm()
   - Create customer record (status: 'prospect')
   - Initialize workflow (checkpoint: 'form_submitted')
   - Send confirmation email
   ↓
4. [MANUAL] Admin reviews, schedules consultation call
   - workflow.advanceWorkflow('consultation_scheduled')
   ↓
5. [MANUAL] Consultation completed
   - workflow.advanceWorkflow('consultation_completed')
   ↓
6. POST /api/admin/customers/:id/approve
   - customer status → 'approved'
   - Generate pricing breakdown
   - workflow → 'payment_link_sent'
   ↓
7. [MANUAL] Send Stripe payment link via email
   ↓
8. Customer pays → Stripe webhook (payment_intent.succeeded)
   ↓
9. POST /api/webhooks/stripe
   - Create billing record (status: 'paid')
   - workflow → 'payment_received'
   ↓
10. POST /api/admin/customers/:id/provision
   - customer status → 'provisioning'
   - Execute provision-customer-database.sh
   - Create PostgreSQL database + user
   - Configure pgBackRest backups
   - Store credentials (Argon2 hashed)
   - workflow → 'database_created', 'backups_configured'
   ↓
11. email.service.sendCredentials()
   - Send connection string via email
   - workflow → 'credentials_sent'
   - customer status → 'active'
   ↓
12. workflow → 'onboarding_completed'
   - Track 30-day, 90-day milestones
```

---

## 3. Directory Deep-Dive

### Project Root Structure

```
/home/admincostplus/projects/costplusdb/
├── 000-docs/              # 🔑 PRIMARY DOCUMENTATION (52 files)
├── 001-security/          # Security configs, policies, audit logs
├── 002-clients/           # Customer data storage (SQLite database)
├── backend/               # Node.js/TypeScript backend API
├── logs/                  # Application logs (gitignored)
├── scripts/               # Operational bash scripts
├── website/               # Static marketing website (Netlify)
├── .git/                  # Git repository
├── .gitignore
├── CLAUDE.md              # AI assistant project instructions
├── DEVOPS_SYSTEM_ANALYSIS.md  # 🔑 THIS DOCUMENT
└── README.md              # Project overview
```

### 000-docs/ 🔑

**Purpose**: Complete operational and planning documentation (52 markdown files, 40,000+ lines)

**Key Documents by Category:**

**Business Planning (PP-PLAN):**
- `001-PP-PLAN-costplusdb-overview.md` - Complete business model, technical architecture
- `002-PP-PLAN-pricing-structure.md` - Pricing tiers, transparent cost calculations
- `003-PP-PLAN-complete-launch-guide.md` - Launch checklist, timelines
- `004-PP-PLAN-cost-calculations.md` - Detailed infrastructure cost modeling

**Standard Operating Procedures (DR-SOPS):**
- `005-DR-SOPS-postgresql-operations.md` - PostgreSQL provisioning, maintenance, backups
- `006-DR-SOPS-security-audit.md` - Security audit procedures
- `034-DR-SOPS-customer-database-provisioning.md` - Step-by-step provisioning workflow
- `035-DR-SOPS-customer-offboarding-procedure.md` - Customer churn handling

**Guides (DR-GUID):**
- `009-DR-GUID-client-onboarding-process.md` - Customer onboarding workflow
- `010-DR-GUID-database-migration-guide.md` - Migrating customer data to CostPlusDB
- `043-DR-GUID-local-development-setup.md` - Developer environment setup
- `044-DR-GUID-production-deployment.md` - Production deployment procedures
- `046-DR-GUID-resend-email-integration.md` - Email service integration
- `047-DR-GUID-stripe-payment-integration.md` - Payment processing setup
- `050-DR-GUID-api-documentation.md` - **Complete API reference (33KB, 1,599 lines)**

**Architecture (DR-ARCH):**
- `020-DR-ARCH-customer-database-structure.md` - Database schema design decisions
- `033-DR-ARCH-customer-database-schema.md` - Complete SQL schema (876 lines)
- `039-DR-ARCH-backend-organizational-structure.md` - Backend code organization
- `041-DR-ARCH-infrastructure-provider-comparison.md` - Contabo vs Hetzner vs AWS vs DigitalOcean

**Project Management (PM):**
- `040-PM-PLAN-overnight-completion-master-plan.md` - Backend implementation plan
- `049-PM-REPO-overnight-completion-after-action-report.md` - Implementation retrospective
- `051-PM-REPO-production-readiness-report.md` - **Current production status assessment**

**Forms (DR-FORM):**
- `021-DR-FORM-customer-onboarding-intake.md` - Intake form field specifications (40+ fields)
- `022-DR-FORM-setup-confirmation.md` - Provisioning confirmation template

**Gaps:**
- ❌ No incident response runbooks yet
- ❌ No disaster recovery testing documentation
- ❌ No customer SLA documentation
- ⚠️ Many docs reference "FairDB" (old name), need s/FairDB/CostPlusDB/g

### 001-security/

**Purpose**: Security configurations, policies, compliance documentation

**Structure:**
```
001-security/
├── alerts/               # Alert configurations (Resend integration)
├── audits/              # Security audit reports
├── backups/             # Backup schedules and verification logs
│   ├── daily/
│   ├── weekly/
│   └── monthly/
├── compliance/          # Compliance documentation
│   ├── agreements/      # Customer agreements
│   ├── checklists/      # Security checklists
│   ├── policies/        # Security policies
│   └── reports/         # Compliance reports
├── config/              # Security configurations
│   ├── backup/          # pgBackRest configs
│   ├── fail2ban/        # Intrusion prevention
│   ├── firewall/        # UFW rules
│   ├── pgbouncer/       # Connection pooler config
│   ├── postgresql/      # PostgreSQL security configs
│   └── ssl/             # SSL/TLS certificates
├── customer-security/   # Customer-specific security configs
├── documentation/       # Security documentation
│   ├── architecture/    # Security architecture docs
│   ├── procedures/      # Security procedures
│   └── training/        # Security training materials
├── keys/                # API keys, encryption keys (gitignored)
│   ├── api-tokens/
│   ├── backup-encryption/
│   └── ssl-ca/
├── logs/                # Security logs
├── monitoring/          # Monitoring configs
└── scripts/             # Security automation scripts
```

**Key Files:**
- `config/firewall/ufw-rules.sh` - UFW firewall configuration
- `config/fail2ban/jail.local` - fail2ban configuration
- `config/postgresql/pg_hba.conf.template` - PostgreSQL access control
- `scripts/security-audit.sh` - Automated security audit script

**Gaps:**
- ⚠️ Many placeholder files, not fully implemented
- ❌ No actual SSL certificates yet (need Let's Encrypt setup)
- ❌ No monitoring dashboards configured

### 002-clients/

**Purpose**: Customer data storage (SQLite database + schema)

**Structure:**
```
002-clients/
├── database/
│   ├── costplusdb.db        # SQLite database (10 tables, production data)
│   └── schema.sql           # Database schema (876 lines)
├── onboarding/              # Customer onboarding materials
├── credentials/             # Customer database credentials (encrypted)
└── backups/                 # Local database backups
```

**Database Schema (10 tables):**

1. **customers** (112 columns)
   - Core customer information (company, contacts, address)
   - Tier selection (shared/dedicated/pro/enterprise)
   - Add-ons (HA, replicas, VPN, compliance)
   - Status tracking (prospect → consultation → approved → provisioning → active → suspended/churned)
   - Billing cycle, payment method, Stripe IDs

2. **customer_workflow** (17 columns)
   - 12 checkpoint timestamps (form_submitted → three_month_milestone)
   - Current stage tracking
   - Blocker management (is_blocked, blocker_type, blocker_reason)
   - Completion percentage calculation

3. **databases** (30 columns)
   - PostgreSQL connection details (host, port, database name, username)
   - Credentials (Argon2 hashed)
   - Resource allocation (RAM, storage, CPU)
   - Backup configuration (schedule, retention, S3 bucket)
   - Health status, provisioning timestamps

4. **billing** (25 columns)
   - Billing cycles, next billing date
   - Pricing breakdown (base + addons + infrastructure)
   - Payment method details
   - Stripe customer ID, subscription ID
   - Discounts, credits

5. **invoices** (20 columns)
   - Invoice numbers, dates, due dates
   - Line items (JSON: base tier, add-ons, infrastructure costs)
   - Payment status (pending/paid/failed/refunded)
   - Stripe payment intent ID
   - PDF generation path

6. **support_tickets** (18 columns)
   - Ticket type, priority, status
   - Assignment tracking
   - SLA monitoring (response times)
   - Slack thread links

7. **support_messages** (10 columns)
   - Ticket conversation log
   - Internal notes vs customer-visible
   - Attachments

8. **notes** (10 columns)
   - Internal notes (general, technical, billing, sales)
   - Follow-up tracking
   - Importance flags

9. **activity_log** (12 columns)
   - Full audit trail (entity_type, entity_id, action)
   - Before/after states (JSON)
   - User, IP address, user agent
   - Timestamp

10. **schema_migrations** (4 columns)
    - Migration version tracking
    - Applied timestamp

**Features:**
- ✅ 23 indexes for query performance
- ✅ 5 views for common queries (active_customers, customers_by_revenue, open_tickets, onboarding_pipeline, mrr_summary)
- ✅ 7 triggers for automatic timestamp updates
- ✅ Foreign key constraints with CASCADE
- ✅ WAL mode enabled for concurrent access
- ✅ Foreign keys enforced

**Turso Sync:**
- Optional cloud replication for edge performance
- Bidirectional sync (local ↔ Turso)
- Scripts: `backend/src/scripts/sync-to-turso.ts`, `scripts/sync/sync-to-turso.sh`
- Configuration: `backend/.env` (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN)

### backend/ 🔑

**Purpose**: Node.js/TypeScript REST API backend

**Structure:**
```
backend/
├── src/
│   ├── api/
│   │   ├── app.ts                    # Express app configuration
│   │   ├── controllers/              # HTTP request handlers (4 files)
│   │   │   ├── admin.controller.ts   # Admin operations (approve, provision, etc.)
│   │   │   ├── customer.controller.ts # Customer CRUD
│   │   │   ├── intake.controller.ts  # Intake form submission
│   │   │   └── webhook.controller.ts # Stripe/GitHub webhooks
│   │   ├── middleware/               # Express middleware
│   │   │   ├── error.middleware.ts   # Global error handler
│   │   │   └── logging.middleware.ts # Request logging
│   │   └── routes/                   # Route definitions (5 files)
│   │       ├── admin.routes.ts       # /api/admin/*
│   │       ├── customers.routes.ts   # /api/customers/*
│   │       ├── index.ts              # Main router (mounts all routes)
│   │       ├── intake.routes.ts      # /api/intake
│   │       └── webhooks.routes.ts    # /api/webhooks/*
│   ├── config/
│   │   └── index.ts                  # Environment variable validation (Zod)
│   ├── database/
│   │   ├── index.ts                  # Database connection manager
│   │   ├── migrations/               # Database migrations
│   │   │   ├── 001_initial_schema.sql
│   │   │   ├── 002_customer_workflow.sql
│   │   │   └── migrate.ts            # Migration runner
│   │   ├── repositories/             # Data access layer
│   │   │   └── customers.repository.ts # Customer CRUD operations
│   │   └── schema.ts                 # TypeScript type definitions
│   ├── integrations/
│   │   ├── resend/                   # Email service integration
│   │   │   ├── client.ts             # Resend API client
│   │   │   ├── templates.ts          # HTML email templates (6 templates)
│   │   │   └── types.ts              # TypeScript types
│   │   ├── stripe/                   # Payment processing integration
│   │   │   ├── client.ts             # Stripe API client
│   │   │   ├── types.ts              # Stripe type definitions
│   │   │   └── webhooks.ts           # Webhook event handlers
│   │   └── turso/                    # Turso cloud sync
│   │       ├── client.ts             # Turso libSQL client
│   │       └── sync.ts               # Bidirectional sync logic
│   ├── scripts/
│   │   ├── init-database.ts          # Initialize SQLite database
│   │   ├── seed-dev-data.ts          # Seed test data
│   │   └── sync-to-turso.ts          # Manual Turso sync
│   ├── services/                     # Business logic layer (6 services)
│   │   ├── billing.service.ts        # Pricing calculations, invoices
│   │   ├── customer.service.ts       # Customer lifecycle management
│   │   ├── email.service.ts          # Email sending (6 templates)
│   │   ├── index.ts                  # Service exports
│   │   ├── provisioning.service.ts   # Database provisioning
│   │   ├── stripe.service.ts         # Payment processing
│   │   └── workflow.service.ts       # Workflow tracking (12 checkpoints)
│   ├── types/
│   │   └── index.ts                  # Shared TypeScript types
│   ├── utils/
│   │   ├── errors.ts                 # Custom error classes
│   │   └── logger.ts                 # Winston logger configuration
│   ├── validators/                   # Input validation (Zod schemas, 4 files)
│   │   ├── customer.validator.ts     # Customer update validation
│   │   ├── database.validator.ts     # Database operation validation
│   │   ├── intake-form.validator.ts  # Intake form validation (40+ fields)
│   │   └── webhook.validator.ts      # Webhook event validation
│   └── index.ts                      # Server entry point
├── tests/
│   ├── e2e/
│   │   ├── customer-onboarding.spec.ts # E2E onboarding workflow (575 lines)
│   │   └── README.md
│   ├── integration/
│   │   └── api/
│   │       ├── admin.test.ts         # Admin API tests (49 tests)
│   │       ├── customers.test.ts     # Customer API tests (54 tests)
│   │       ├── intake.test.ts        # Intake API tests (36 tests)
│   │       └── webhooks.test.ts      # Webhook tests (37 tests)
│   ├── unit/
│   │   └── services/
│   │       ├── billing.service.test.ts   # Billing service tests (51 tests)
│   │       ├── customer.service.test.ts  # Customer service tests (23 tests)
│   │       └── workflow.service.test.ts  # Workflow service tests
│   ├── fixtures/                     # Test data fixtures
│   └── setup.ts                      # Test environment setup
├── .env                              # Environment variables (gitignored)
├── .env.example                      # Environment variable template
├── .gitignore
├── package.json                      # Dependencies (npm)
├── package-lock.json
├── README.md                         # Backend documentation
├── tsconfig.json                     # TypeScript configuration
└── vitest.config.ts                  # Test configuration
```

**Entry Point**: `src/index.ts`
- Loads environment variables (dotenv)
- Validates configuration (Zod schema)
- Initializes database connection
- Configures Express app (CORS, Helmet, rate limiting)
- Starts HTTP server on port 3000 (configurable)

**API Endpoints (18 total):**

**Intake API** (`/api/intake`):
- POST /api/intake - Submit customer intake form (rate-limited: 10/hour)
- GET /api/intake/schema - Get form validation schema

**Customer API** (`/api/customers`):
- GET /api/customers - List customers (pagination, filtering, sorting)
- GET /api/customers/:id - Get customer details
- PATCH /api/customers/:id - Update customer
- DELETE /api/customers/:id - Soft delete customer
- GET /api/customers/search - Search customers by name/email
- GET /api/customers/stats - Customer statistics

**Admin API** (`/api/admin`):
- GET /api/admin/dashboard - Dashboard metrics
- GET /api/admin/activity - Activity log
- POST /api/admin/customers/:id/approve - Approve customer
- POST /api/admin/customers/:id/send-payment-link - Send Stripe payment link
- POST /api/admin/customers/:id/provision - Provision database
- POST /api/admin/customers/:id/suspend - Suspend customer
- POST /api/admin/customers/:id/reactivate - Reactivate customer

**Webhook API** (`/api/webhooks`):
- POST /api/webhooks/stripe - Handle Stripe webhooks (signature verification)
- POST /api/webhooks/github - Handle GitHub webhooks
- GET /api/webhooks/health - Webhook health check

**Health Check**:
- GET /health - API health check

**Authentication**: ❌ **NOT IMPLEMENTED** - All endpoints currently unprotected (CRITICAL BLOCKER)

**Code Quality:**
- ✅ TypeScript strict mode enabled
- ✅ ESLint configured
- ✅ Prettier formatting
- ✅ Compiles without errors
- ✅ 270+ tests written (80%+ coverage on services)
- ⚠️ Tests need test database setup fixes to run

**Dependencies (Production):**
- express (4.18) - Web framework
- better-sqlite3 (9.2) - SQLite database driver
- @libsql/client (0.4) - Turso libSQL client
- zod (3.22) - Runtime type validation
- dotenv (16.3) - Environment variable loading
- resend (2.0) - Email API client
- stripe (14.0) - Payment processing API client
- argon2 (0.31) - Password hashing
- winston (3.11) - Logging framework
- helmet (7.1) - Security headers
- cors (2.8) - CORS middleware
- express-rate-limit (7.1) - Rate limiting
- express-async-errors (3.1) - Automatic async error handling

**Dev Dependencies:**
- typescript (5.3) - TypeScript compiler
- tsx (4.7) - TypeScript executor
- vitest (1.0) - Test framework
- supertest (6.3) - HTTP integration testing
- playwright (1.40) - E2E testing browser automation
- eslint (8.56) - Linting
- prettier (3.1) - Code formatting

**Environment Variables** (`.env`):
```bash
# Database
DATABASE_URL="file:../002-clients/database/costplusdb.db"
TURSO_DATABASE_URL="libsql://costplusdb-dev.turso.io" # Optional
TURSO_AUTH_TOKEN="..." # Optional

# Email (Resend)
RESEND_API_KEY="re_..." # REQUIRED
RESEND_FROM_EMAIL="costplusdb@intentsolutions.io"
RESEND_ADMIN_EMAIL="jeremy@intentsolutions.io"

# Stripe
STRIPE_SECRET_KEY="sk_test_..." # REQUIRED
STRIPE_WEBHOOK_SECRET="whsec_..." # REQUIRED
STRIPE_PUBLISHABLE_KEY="pk_test_..."

# API Configuration
NODE_ENV="development" # or "production"
PORT="3000"
API_BASE_URL="http://localhost:3000"

# Security
JWT_SECRET="..." # REQUIRED (not implemented yet)
ENCRYPTION_KEY="..." # REQUIRED (32-byte hex)

# CORS
CORS_ORIGIN="http://localhost:8000,https://costplusdb.netlify.app"

# Rate Limiting
RATE_LIMIT_WINDOW_MS="900000" # 15 minutes
RATE_LIMIT_MAX_REQUESTS="100"

# Logging
LOG_LEVEL="info" # error, warn, info, debug
LOG_FILE_PATH="./logs/app.log"

# Feature Flags
ENABLE_TURSO_SYNC="false"
ENABLE_EMAIL_NOTIFICATIONS="false" # Set to true in production
ENABLE_STRIPE_WEBHOOKS="true"
```

**Gaps:**
- ❌ Authentication system not implemented (JWT planned)
- ❌ No admin user management
- ❌ No customer-facing API (customer portal)
- ⚠️ Email and Stripe API keys are placeholders (need real keys)
- ⚠️ Some service methods have TODO comments for future implementation

### scripts/

**Purpose**: Operational automation bash scripts

**Structure:**
```
scripts/
├── provision/
│   ├── provision-customer-database.sh    # 🔑 Main provisioning script (165 lines)
│   ├── deprovision-customer-database.sh  # Customer offboarding (72 lines)
│   ├── configure-backups.sh              # pgBackRest configuration
│   ├── generate-credentials.sh           # Secure credential generation
│   └── verify-provisioning.sh            # Post-provisioning validation
├── sync/
│   ├── sync-to-turso.sh                  # Manual Turso sync
│   └── backup-local-db.sh                # Local SQLite backup
├── webhooks/
│   ├── stripe-payment-success.sh         # Stripe payment webhook handler
│   └── github-action-trigger.sh          # GitHub Actions trigger
└── README.md
```

**Key Script: provision-customer-database.sh**

**Purpose**: Provision isolated PostgreSQL database for new customer

**Usage:**
```bash
SUDO_PASS="your_password" ./provision-customer-database.sh customer_name
```

**Workflow (11 steps):**
1. Validate inputs (customer_name matches [a-z0-9_]+)
2. Generate secure credentials (32-char password via OpenSSL)
3. Create PostgreSQL database (`customer_name_cust{id}`)
4. Create PostgreSQL user (`customer_name_cust{id}_user`)
5. Grant permissions (isolated to database)
6. Configure SSL/TLS enforcement (`sslmode=require`)
7. Add pg_hba.conf entry for remote access
8. Integrate with pgBouncer (if installed)
9. Configure pgBackRest backups (schedule, retention, S3 bucket)
10. Test connection (verify SSL, permissions)
11. Output JSON with credentials:
```json
{
  "customer_name": "acmecorp",
  "database_name": "acmecorp_cust1",
  "username": "acmecorp_cust1_user",
  "password": "...",
  "host": "db.costplusdb.com",
  "port": 5432,
  "connection_string": "postgresql://user:pass@host:5432/db?sslmode=require"
}
```

**Error Handling:**
- Rollback on failure (drop database/user if partially created)
- Detailed logging to `/var/log/costplusdb/provisioning.log`
- Exit codes: 0 (success), 1 (validation failure), 2 (PostgreSQL error), 3 (backup config failure)

**Security:**
- Passwords never logged
- Credentials saved to `/root/customer-credentials/{customer_name}.json` (encrypted at rest)
- Sudo password passed via environment variable (not command line)

**Dependencies:**
- PostgreSQL 16 installed and running
- pgBackRest installed and configured
- Wasabi S3 credentials configured
- pgBouncer (optional, but recommended)

**Testing Status**: ⚠️ Script exists and is syntactically correct, but NOT tested on actual VPS yet

**Key Script: deprovision-customer-database.sh**

**Purpose**: Remove customer database and revoke access (customer churn/offboarding)

**Usage:**
```bash
echo "yes" | SUDO_PASS="password" ./deprovision-customer-database.sh customer_name
```

**Workflow:**
1. Confirm operation (interactive or via stdin)
2. Archive credentials to `/root/customer-credentials/archive/`
3. Drop PostgreSQL database
4. Drop PostgreSQL user
5. Remove pg_hba.conf entry
6. Remove pgBouncer userlist entry (if exists)
7. Archive backup configurations
8. Log deprovisioning to activity log

**Safety:** Requires confirmation, prevents accidental deletion

### website/

**Purpose**: Static marketing website (Netlify-hosted)

**Structure:**
```
website/
├── src/
│   ├── reset.css         # CSS reset
│   ├── index.css         # Main styles
│   └── theme.css         # Theme colors
├── index.html            # Homepage
├── about.html            # About page
├── calculator.html       # Pricing calculator / intake form
├── security.html         # Security practices
├── ai-policy.html        # AI usage policy
├── docs.html             # Documentation hub
├── activity.html         # Changelog
├── privacy.html          # Privacy policy
├── terms.html            # Terms of service
├── acceptable-use.html   # Acceptable use policy
├── transparency/         # Transparency documents
│   ├── index.html
│   ├── operations-manual.html
│   ├── cost-calculations.html
│   ├── business-overview.html
│   └── pricing-structure.html
├── netlify.toml          # Netlify configuration
└── favicon.svg
```

**Design System:**
- Based on [The Monospace Web](https://github.com/owickstrom/the-monospace-web) framework
- Monospace fonts (system fonts, no web fonts)
- Minimalist, brutalist aesthetic
- Responsive tables and forms
- No JavaScript frameworks (vanilla JS for calculator)

**Key Page: calculator.html**

**Purpose**: Pricing calculator + customer intake form

**Features:**
- Tier selection (Shared $49, Dedicated $89, Pro $129, Enterprise $149)
- Add-ons selection (HA, replicas, VPN, compliance)
- Infrastructure selection (Contabo, Hetzner, DigitalOcean, AWS)
- Real-time pricing calculation (JavaScript)
- Comprehensive intake form (40+ fields)
- Form submission → POST /api/intake (backend)

**Form Fields:**
- Company information (name, industry, size, website, address, tax ID)
- Primary contact (name, title, email, phone, timezone, preferred contact method)
- Technical contact (optional)
- Current database (provider, version, size, connections/min, traffic pattern)
- Migration details (timeline, downtime tolerance, data sensitivity)
- Service requirements (tier, add-ons, infrastructure, region preference)
- Compliance & security (GDPR, HIPAA, SOC 2, retention requirements)
- Business details (referral source, budget, contract length preference)
- Additional information (use case, special requirements)

**Netlify Configuration** (`netlify.toml`):
```toml
[build]
  base = "website"
  publish = "."
  command = "echo 'Static site, no build needed'"

[[redirects]]
  from = "/api/*"
  to = "https://api.costplusdb.com/:splat"
  status = 200
  force = true

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"
```

**Deployment:**
- Auto-deploy from `main` branch
- Netlify Forms integration (for intake form submission)
- Custom domain: costplusdb.com (DNS not configured yet)

**Gaps:**
- ❌ Form submission currently uses Netlify Forms (needs backend API integration)
- ❌ No HTTPS redirect configured (Netlify does this automatically, but needs verification)
- ❌ Custom domain not configured yet

### logs/

**Purpose**: Application logs (gitignored)

**Structure:**
```
logs/
├── app.log              # Main application log (Winston)
├── error.log            # Error-level logs only
├── access.log           # HTTP access logs (future: nginx)
└── security.log         # Security events (future)
```

**Log Format** (Winston JSON):
```json
{
  "timestamp": "2025-10-20T16:00:00.000Z",
  "level": "info",
  "message": "Customer created",
  "service": "costplusdb-backend",
  "customer_id": 123,
  "metadata": {
    "action": "create_customer",
    "tier": "dedicated"
  }
}
```

**Log Rotation:** ⚠️ Not configured yet (need logrotate setup)

---

## 4. Operational Reference

### Deployment Workflows

#### Local Development

**Required Tools:**
- Node.js 18+ (`node --version`)
- npm 9+ (`npm --version`)
- Git (`git --version`)
- SQLite 3 (`sqlite3 --version`)

**Environment Setup:**

```bash
# 1. Clone repository
git clone https://github.com/jeremylongshore/cost-plus-db.git
cd cost-plus-db

# 2. Backend setup
cd backend
npm install

# 3. Create .env file
cp .env.example .env
# Edit .env with your configuration (see backend/.env.example for details)

# 4. Generate secure keys
openssl rand -base64 32  # Use for JWT_SECRET
openssl rand -hex 32     # Use for ENCRYPTION_KEY

# 5. Initialize database
npm run db:init

# 6. Seed development data (optional)
npm run db:seed

# 7. Run development server
npm run dev
# Server starts on http://localhost:3000
# Health check: http://localhost:3000/health
```

**Running Locally:**
```bash
# Backend (from backend/)
npm run dev              # Development server with hot reload
npm run build            # Compile TypeScript
npm start                # Production mode (requires build first)

# Frontend (from website/)
python3 -m http.server 8000
# Open http://localhost:8000
```

**Local Testing:**
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (requires Playwright installation)
npx playwright install
npm run test:e2e

# All tests
npm test

# Watch mode
npm run test:watch

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

#### Staging Deployment

**Status:** ⚠️ Staging environment not yet provisioned

**Planned Setup:**
- Staging VPS (Contabo, cheapest tier $2.99/mo)
- Separate PostgreSQL instance
- Separate Stripe test mode
- Separate Resend test domain

**Pre-deployment Checklist:**
- [ ] All tests passing (`npm test`)
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Environment variables configured
- [ ] Database migrations tested locally
- [ ] API keys valid (Resend, Stripe test mode)

**Deployment Command:** (future)
```bash
# SSH into staging VPS
ssh staging@staging.costplusdb.com

# Pull latest code
cd /opt/costplusdb
git pull origin main

# Install dependencies
cd backend
npm install --production

# Run migrations
npm run db:migrate

# Build TypeScript
npm run build

# Restart service
sudo systemctl restart costplusdb-backend

# Verify deployment
curl http://localhost:3000/health
```

**Post-deployment Verification:**
- [ ] Health check returns 200 OK
- [ ] Database connection successful
- [ ] API endpoints responding
- [ ] Logs show no errors

#### Production Deployment

**Status:** ❌ Production VPS not yet provisioned

**Pre-deployment Checklist:**
- [ ] All staging tests passed
- [ ] Security scan complete (`npm audit`)
- [ ] Database migration tested on staging
- [ ] Backup verified (SQLite + PostgreSQL)
- [ ] Rollback plan prepared
- [ ] On-call DevOps available
- [ ] Customer communication prepared (if downtime expected)

**Deployment Steps:**

**1. Pre-deployment:**
```bash
# Backup SQLite database
cd /home/admincostplus/projects/costplusdb/002-clients/database
cp costplusdb.db costplusdb.db.backup.$(date +%Y%m%d_%H%M%S)

# Backup PostgreSQL (on VPS)
ssh production@db.costplusdb.com
sudo -u postgres pg_dumpall > /backups/postgresql_$(date +%Y%m%d_%H%M%S).sql
```

**2. Deploy:**
```bash
# SSH into production VPS
ssh production@api.costplusdb.com

# Pull latest code
cd /opt/costplusdb
git pull origin main

# Install dependencies
cd backend
npm ci --production  # Use ci for reproducible builds

# Run database migrations
npm run db:migrate

# Build TypeScript
npm run build

# Restart service with zero-downtime (future: use PM2)
sudo systemctl reload costplusdb-backend
# Or: pm2 reload costplusdb-backend
```

**3. Monitor During Deployment:**
- Watch logs: `tail -f /var/log/costplusdb/app.log`
- Monitor error rate (future: use monitoring dashboard)
- Check health endpoint: `curl https://api.costplusdb.com/health`

**4. Rollback Command** (if needed):
```bash
# Revert to previous commit
git reset --hard HEAD~1

# Rebuild
npm run build

# Restart
sudo systemctl restart costplusdb-backend
```

**5. Post-deployment Verification:**
- [ ] Health check returns 200 OK
- [ ] API endpoints responding correctly
- [ ] No spike in error logs
- [ ] Database connections stable
- [ ] Customer databases accessible
- [ ] Webhook endpoints receiving events

**Deployment Frequency:** Manual deployments during early access, moving to automated CI/CD after first 5 customers onboarded

### Monitoring & Alerting

**Current Status:** ⚠️ Minimal monitoring, needs significant improvement

**Dashboards:**
- ❌ No monitoring dashboards yet (planned: Grafana or cloud-native)
- ⚠️ Health check endpoint available: `/health`
- ⚠️ Logs available locally: `backend/logs/app.log`

**Key Metrics to Monitor:**

| Metric | Target | Alert Threshold | Purpose |
|--------|--------|-----------------|---------|
| API Response Time (P95) | < 500ms | > 2000ms | Detect performance degradation |
| Error Rate | < 0.1% | > 1% | Detect application issues |
| Database Connections (SQLite) | N/A | N/A | Monitor concurrency |
| Database Connections (PostgreSQL) | < 50% max | > 80% max | Prevent connection exhaustion |
| Disk Usage (VPS) | < 70% | > 90% | Prevent disk full |
| Memory Usage (VPS) | < 70% | > 85% | Detect memory leaks |
| CPU Usage (VPS) | < 60% avg | > 90% sustained | Detect CPU bottlenecks |
| Backup Success Rate | 100% | < 95% | Ensure data safety |

**Alert Policies:** ⚠️ Not configured yet

**Planned Alerting (Resend):**
```typescript
// backend/src/services/email.service.ts already has:
async sendAdminAlert(
  subject: string,
  message: string,
  severity: 'low' | 'medium' | 'high' | 'critical'
): Promise<boolean>
```

**Log Access:**

**Local Development:**
```bash
# Real-time logs
tail -f backend/logs/app.log

# Filter by level
grep '"level":"error"' backend/logs/app.log

# View last 100 errors
grep '"level":"error"' backend/logs/app.log | tail -100
```

**Production:** (future)
```bash
# SSH to VPS
ssh production@api.costplusdb.com

# View logs
tail -f /var/log/costplusdb/app.log

# systemd logs
sudo journalctl -u costplusdb-backend -f
```

**Future Improvements Needed:**
- [ ] Set up UptimeRobot for health check monitoring
- [ ] Configure Resend alerts for critical errors
- [ ] Add database metrics collection
- [ ] Set up log aggregation (Papertrail, Logtail, or cloud-native)
- [ ] Create Grafana dashboards (or use cloud-native monitoring)
- [ ] Configure disk space alerts
- [ ] Add backup verification automation

### Incident Response

**Current Status:** ⚠️ No formal incident response process yet

**Severity Levels:**

| Severity | Description | Response Time | Actions |
|----------|-------------|---------------|---------|
| **P0 - Critical** | System completely down, all customers affected | **Immediate** | 1. Check health endpoint<br>2. Check server status (VPS provider)<br>3. Check logs for errors<br>4. Restart services if safe<br>5. Notify customers if downtime > 5 min<br>6. Escalate to senior engineer |
| **P1 - High** | Significant degradation, multiple customers affected | **15 minutes** | 1. Identify affected functionality<br>2. Check logs and metrics<br>3. Implement workaround if possible<br>4. Notify affected customers<br>5. Deploy fix within 4 hours |
| **P2 - Medium** | Minor degradation, single customer or feature affected | **4 hours** | 1. Assess impact and scope<br>2. Create bug ticket<br>3. Notify affected customer<br>4. Schedule fix in next deployment |
| **P3 - Low** | Cosmetic issue, no functional impact | **24 hours** | 1. Create bug ticket<br>2. Prioritize in backlog<br>3. Fix in next sprint |

**Common Incidents:**

**1. Backend API Down**

**Symptoms:** Health check returns error, customers cannot access databases

**Diagnosis:**
```bash
# Check if process is running
ssh production@api.costplusdb.com
ps aux | grep node

# Check systemd status
sudo systemctl status costplusdb-backend

# Check logs for errors
sudo journalctl -u costplusdb-backend -n 100 --no-pager
```

**Resolution:**
```bash
# Restart service
sudo systemctl restart costplusdb-backend

# If that fails, check for port conflicts
sudo lsof -i :3000

# If database is locked (SQLite)
# Restart backend service, SQLite will release lock

# Last resort: reboot VPS
sudo reboot
```

**2. PostgreSQL Customer Database Down**

**Symptoms:** Customer reports connection errors

**Diagnosis:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check customer database
sudo -u postgres psql -c "\l" | grep customer_name

# Test connection
sudo -u postgres psql -d customer_name_cust1 -c "SELECT 1"
```

**Resolution:**
```bash
# Restart PostgreSQL
sudo systemctl restart postgresql

# If database is corrupted, restore from backup
# See "Backup & Recovery" section
```

**3. High Error Rate**

**Symptoms:** Spike in error logs, elevated error rate

**Diagnosis:**
```bash
# Check recent errors
grep '"level":"error"' /var/log/costplusdb/app.log | tail -50

# Check for specific error patterns
grep "ValidationError" /var/log/costplusdb/app.log | wc -l
```

**Resolution:**
- If validation errors: Check for malformed requests, update validators
- If database errors: Check database health, check disk space
- If external service errors (Stripe, Resend): Check API status pages

**4. Disk Space Full**

**Symptoms:** Database writes fail, logs stop writing

**Diagnosis:**
```bash
df -h
du -sh /var/log/costplusdb
du -sh /opt/costplusdb/002-clients/database
```

**Resolution:**
```bash
# Clear old logs
sudo logrotate -f /etc/logrotate.d/costplusdb

# Archive old backups
cd /backups
tar -czf old_backups_$(date +%Y%m%d).tar.gz *.sql
rm *.sql

# Move archives to S3
aws s3 cp old_backups_$(date +%Y%m%d).tar.gz s3://costplusdb-archives/
```

**Escalation:**
- P0: Notify Jeremy immediately (phone + email)
- P1: Email Jeremy, expect response within 15 min
- P2: Create ticket, notify in daily standup
- P3: Create ticket, prioritize in backlog

**Communication:**
- Customers: Email via Resend (use `email.service.sendAdminAlert()`)
- Internal: Slack #incidents channel (when set up)
- Stakeholders: Email update every 30 min for P0, hourly for P1

### Backup & Recovery

**Backup Strategy:**

**SQLite Customer Metadata:**

**Schedule:**
- Hourly: Incremental backup (via Turso sync, if enabled)
- Daily: Full backup to local disk
- Weekly: Full backup to S3 (Wasabi)

**Location:**
- Local: `/home/admincostplus/projects/costplusdb/002-clients/backups/`
- S3: `s3://costplusdb-backups/sqlite/`

**Retention:**
- Hourly: 24 hours
- Daily: 30 days
- Weekly: 1 year

**Backup Command:**
```bash
# Manual backup
cd /home/admincostplus/projects/costplusdb/002-clients/database
sqlite3 costplusdb.db ".backup costplusdb.db.backup.$(date +%Y%m%d_%H%M%S)"

# Automated backup (cron)
# Add to crontab: 0 * * * * /path/to/scripts/sync/backup-local-db.sh
```

**PostgreSQL Customer Databases:**

**Schedule:**
- Continuous: WAL archiving (pgBackRest)
- Hourly: Incremental backup (pgBackRest)
- Daily: Full backup (pgBackRest)

**Location:**
- WAL Archives: `s3://costplusdb-backups/postgresql/wal/`
- Full Backups: `s3://costplusdb-backups/postgresql/full/`

**Retention:**
- WAL Archives: 7 days (point-in-time recovery)
- Incremental: 7 days
- Full: 30 days

**RPO (Recovery Point Objective):** < 1 hour (via WAL archiving)
**RTO (Recovery Time Objective):** < 4 hours for full restore

**Backup Command:**
```bash
# Full backup (pgBackRest)
sudo -u postgres pgbackrest --stanza=costplusdb --type=full backup

# Incremental backup
sudo -u postgres pgbackrest --stanza=costplusdb --type=incr backup

# Check backup status
sudo -u postgres pgbackrest --stanza=costplusdb info
```

**Recovery Procedures:**

**SQLite Restore:**
```bash
# 1. Stop backend service
sudo systemctl stop costplusdb-backend

# 2. Restore from backup
cd /home/admincostplus/projects/costplusdb/002-clients/database
cp costplusdb.db costplusdb.db.corrupted
cp costplusdb.db.backup.YYYYMMDD_HHMMSS costplusdb.db

# 3. Verify database integrity
sqlite3 costplusdb.db "PRAGMA integrity_check"

# 4. Restart backend service
sudo systemctl start costplusdb-backend

# 5. Verify health check
curl http://localhost:3000/health
```

**PostgreSQL Customer Database Restore:**

**Scenario 1: Point-in-Time Recovery (within 7 days)**
```bash
# 1. Stop application access (revoke customer permissions temporarily)
sudo -u postgres psql -d customer_db -c "REVOKE ALL ON DATABASE customer_db FROM customer_user"

# 2. Restore to specific timestamp (pgBackRest)
sudo -u postgres pgbackrest --stanza=costplusdb --delta \
  --type=time "--target=2025-10-20 14:30:00" restore

# 3. Start PostgreSQL
sudo systemctl start postgresql

# 4. Verify data
sudo -u postgres psql -d customer_db -c "SELECT COUNT(*) FROM critical_table"

# 5. Restore customer permissions
sudo -u postgres psql -d customer_db -c "GRANT ALL ON DATABASE customer_db TO customer_user"
```

**Scenario 2: Full Database Restore (catastrophic failure)**
```bash
# 1. Provision new VPS (if current VPS is lost)
# 2. Install PostgreSQL 16
# 3. Install pgBackRest
# 4. Configure Wasabi S3 credentials
# 5. Restore from S3
sudo -u postgres pgbackrest --stanza=costplusdb restore
# 6. Start PostgreSQL
sudo systemctl start postgresql
# 7. Verify all customer databases
sudo -u postgres psql -c "\l"
```

**Disaster Recovery Testing:**

**Schedule:** Quarterly (every 3 months)

**Test Procedure:**
1. Select random backup (1 week old)
2. Restore to isolated test environment
3. Verify data integrity
4. Time the restore process
5. Document findings
6. Update RTO/RPO if needed

**Last DR Test:** ⚠️ Never performed (system not yet in production)

**Future Improvements:**
- [ ] Automate backup verification (restore test every week)
- [ ] Set up backup monitoring (alert if backup fails)
- [ ] Configure S3 lifecycle policies (automatic archival to Glacier)
- [ ] Document disaster recovery runbooks
- [ ] Test multi-VPS failover scenario

---

## 5. Security & Access

### Identity & Access Management

**Current Status:** ⚠️ No formal IAM system yet

**Service Accounts Needed:**

| Account/Role | Purpose | Permissions | Used By |
|--------------|---------|-------------|---------|
| `costplusdb-backend` | Backend API runtime | Read/write SQLite, read/write PostgreSQL customer DBs | Node.js process |
| `costplusdb-admin` | DevOps/admin operations | Full access to all systems | DevOps engineer |
| `postgres` | PostgreSQL superuser | Manage PostgreSQL databases | Provisioning scripts |
| `backup-service` | Backup automation | Read PostgreSQL, write to S3 | pgBackRest |
| `resend-api` | Email sending | Resend API | Backend email service |
| `stripe-api` | Payment processing | Stripe API | Backend stripe service |

**Human Access:**

| User | Email | Role | Access |
|------|-------|------|--------|
| Jeremy Longshore | jeremy@intentsolutions.io | Owner | Full access (SSH, databases, APIs) |
| DevOps Engineer | TBD | DevOps | Full infrastructure access |

**Access Control:**

**SSH Access (VPS):**
- SSH key authentication only (no passwords)
- fail2ban configured (ban after 5 failed attempts)
- Non-standard SSH port (future: change from 22)
- sudo access for specific users only

**Database Access:**

**SQLite (Customer Metadata):**
- Local filesystem access only
- Readable by `costplusdb-backend` user
- Writable by `costplusdb-backend` user
- Backups readable by `backup-service` user

**PostgreSQL (Customer Databases):**
- Each customer has isolated database + user
- No cross-database access
- SSL/TLS required (`sslmode=require`)
- Password authentication (Argon2 hashed)
- pg_hba.conf restricts access by IP/hostname

**API Access:**

**Current:** ❌ No authentication (all endpoints open)

**Planned:**
- JWT tokens for admin authentication
- Role-based access control (admin vs customer)
- API key authentication for customer portal (future)

### Secrets Management

**Current Approach:** ⚠️ Environment variables in `.env` (gitignored)

**Secrets Stored:**

| Secret | Location | Rotation Policy | Purpose |
|--------|----------|-----------------|---------|
| `RESEND_API_KEY` | `.env` | Manual (on compromise) | Email API authentication |
| `STRIPE_SECRET_KEY` | `.env` | Manual (on compromise) | Stripe API authentication |
| `STRIPE_WEBHOOK_SECRET` | `.env` | Manual (on compromise) | Stripe webhook signature verification |
| `JWT_SECRET` | `.env` | Quarterly | JWT token signing |
| `ENCRYPTION_KEY` | `.env` | Never (data re-encryption required) | Database credential encryption |
| Customer DB passwords | SQLite (Argon2 hashed) | Never (customer manages) | PostgreSQL authentication |

**Rotation Procedures:** ⚠️ Not documented yet (see `000-docs/030-DR-GUID-credential-rotation-emergency.md`)

**Access Audit:**
- ❌ No audit trail for secret access yet
- Future: Use cloud secret management (AWS Secrets Manager, HashiCorp Vault, or Azure Key Vault)

**Best Practices:**
- ✅ Secrets in `.env`, never in code
- ✅ `.env` in `.gitignore`
- ✅ Separate secrets for dev/staging/production
- ⚠️ Secrets not encrypted at rest (filesystem encryption only)
- ❌ No secret versioning

**Future Improvements:**
- [ ] Migrate to cloud secret management service
- [ ] Implement secret rotation automation
- [ ] Add secret access audit logging
- [ ] Encrypt secrets at rest (beyond filesystem encryption)
- [ ] Document secret recovery procedures

### Security Posture

**Authentication:**

**Current:** ❌ Not implemented

**Planned:**
- JWT-based authentication for admin API
- Email magic link for customer portal (future)
- API key authentication for programmatic access (future)

**Authorization:**

**Current:** ❌ No authorization checks

**Planned:**
- Role-based access control (RBAC)
- Roles: admin, customer, read-only
- Route-level authorization middleware

**Network Security:**

**Frontend (Netlify):**
- ✅ HTTPS enforced (Let's Encrypt)
- ✅ Security headers configured (CSP, HSTS, X-Frame-Options)
- ✅ DDoS protection (Netlify built-in)

**Backend (VPS):**
- ⚠️ UFW firewall configured but not deployed
- ⚠️ fail2ban configured but not deployed
- ⚠️ SSH key authentication planned
- ❌ No VPN for admin access
- ❌ No network segmentation (single VPS)

**Planned Firewall Rules (UFW):**
```bash
# Allow SSH (change port in production)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow PostgreSQL (restricted to specific IPs)
sudo ufw allow from 192.168.1.0/24 to any port 5432

# Enable firewall
sudo ufw enable
```

**Database Security:**

**SQLite:**
- ✅ Local filesystem only (no network exposure)
- ✅ Encrypted at rest (LUKS filesystem encryption planned)
- ✅ Argon2 password hashing for customer DB credentials

**PostgreSQL:**
- ✅ SSL/TLS enforced (`sslmode=require`)
- ✅ Strong password policy (32-char generated)
- ✅ Isolated databases per customer
- ✅ pg_hba.conf restricts access
- ⚠️ No database auditing configured
- ❌ No column-level encryption

**Application Security:**

**Input Validation:**
- ✅ Zod validation on all API inputs
- ✅ XSS sanitization (Helmet CSP headers)
- ✅ SQL injection prevention (parameterized queries)
- ✅ Rate limiting (100 req/15min global, 10 req/hr intake)

**Output Security:**
- ✅ No sensitive data in error messages
- ✅ Passwords never logged
- ✅ Structured logging (JSON)

**Dependencies:**
- ✅ npm audit on every `npm install`
- ⚠️ No automated dependency updates (Dependabot not configured)
- ⚠️ No CVE scanning in CI/CD

**Known Security Issues:**

**Critical:**
1. ❌ No authentication on API endpoints (admin endpoints fully open)
2. ❌ No HTTPS on backend API (HTTP only, needs nginx + Let's Encrypt)
3. ❌ No rate limiting enforcement on production (need to verify)

**High:**
4. ⚠️ API keys are placeholders (need real keys for production)
5. ⚠️ No secret rotation policy implemented
6. ⚠️ No security monitoring or alerting

**Medium:**
7. ⚠️ No vulnerability scanning in CI/CD
8. ⚠️ No WAF (Web Application Firewall)
9. ⚠️ No database audit logging

**Low:**
10. ⚠️ No security training documentation
11. ⚠️ No penetration testing performed
12. ⚠️ No security incident response plan documented

**Security Roadmap:**

**Week 1:**
- [ ] Implement JWT authentication
- [ ] Configure HTTPS (nginx + Let's Encrypt)
- [ ] Set up real API keys (Resend, Stripe production)

**Month 1:**
- [ ] Deploy UFW firewall + fail2ban
- [ ] Enable security monitoring (alerts)
- [ ] Configure Dependabot for dependency updates
- [ ] Document incident response procedures

**Quarter 1:**
- [ ] Implement database auditing
- [ ] Add WAF (Cloudflare or AWS WAF)
- [ ] Perform security penetration testing
- [ ] Get SOC 2 Type I certification (if needed for compliance add-on)

---

## 6. Cost & Performance

### Current Costs

**Development (Current State):**
```
Monthly Spend: $0
- Netlify: Free tier (static hosting)
- Development environment: Local machine
- No VPS yet
- No production databases
```

**Production (Projected for 5 Customers):**

```
Monthly Spend Breakdown:
┌────────────────────────────┬─────────┬─────────┐
│ Service                    │ Cost    │ % Total │
├────────────────────────────┼─────────┼─────────┤
│ Contabo VPS (8GB, 200GB)   │  $6.50  │  15%    │
│ Wasabi S3 (100GB storage)  │  $6.00  │  14%    │
│ Resend (1,000 emails/mo)   │  $0.00  │   0%    │  (Free tier)
│ Stripe (payment processing)│ ~$10.00 │  23%    │  (2.9% + 30¢ per transaction)
│ Domain (costplusdb.com)    │  $1.00  │   2%    │  (annual ÷ 12)
│ Netlify (static hosting)   │  $0.00  │   0%    │  (Free tier)
│ Turso (optional DB sync)   │  $0.00  │   0%    │  (Free tier, <1GB)
│ SSL Certificates           │  $0.00  │   0%    │  (Let's Encrypt)
│ Buffer/contingency         │ $20.00  │  46%    │
├────────────────────────────┼─────────┼─────────┤
│ TOTAL                      │ $43.50  │ 100%    │
└────────────────────────────┴─────────┴─────────┘

Customer Revenue (5 customers, avg $89/mo):
Revenue: $445/mo
Costs:   $43.50/mo
Profit:  $401.50/mo (90% margin)
```

**Cost at Scale (100 Customers):**

```
Infrastructure Needed:
- 5× Contabo VPS (20 customers per VPS): 5 × $6.50 = $32.50
- Wasabi S3 (2TB backups): ~$120
- Stripe fees (2.9% + 30¢): ~$260
- Resend (10,000 emails/mo): $20
- Upgraded Turso (if used): $25
- Domain + SSL: $1
- Total: ~$458.50/mo

Customer Revenue (100 customers, avg $89/mo):
Revenue: $8,900/mo
Costs:   $458.50/mo
Profit:  $8,441.50/mo (95% margin)
```

**Cost Optimization Opportunities:**

1. **VPS Right-Sizing**: Start with Contabo, monitor actual usage
   - Current plan: 8GB RAM, 200GB storage
   - Actual need (5 customers): ~2GB RAM, 50GB storage
   - Potential savings: Downgrade to $2.99/mo VPS initially (~$3.50/mo savings)

2. **Backup Storage**: Implement intelligent retention policies
   - Current: 30-day full retention
   - Optimization: 7-day full + 30-day incremental + quarterly archives
   - Potential savings: ~40% reduction in S3 costs

3. **Email Optimization**: Batch non-critical emails
   - Current: Real-time sending for all emails
   - Optimization: Queue non-urgent emails (reports, summaries)
   - Potential savings: Stay in Resend free tier longer

### Performance Baseline

**Status:** ⚠️ No production baseline yet (system not deployed)

**Local Development Performance:**

```
API Response Times (local, no load):
- GET /health: ~5ms
- POST /api/intake: ~50ms (includes validation)
- GET /api/customers: ~30ms (50 records)
- POST /api/admin/provision: ~2000ms (bash script execution)

Database Query Performance (SQLite):
- SELECT single customer by ID: <1ms
- SELECT customers list (50 records): <5ms
- INSERT customer record: <5ms
- UPDATE customer status: <2ms

Build Performance:
- TypeScript compilation: ~5 seconds
- npm install: ~60 seconds
- Test suite: Not yet measured (tests need fixes)
```

**Expected Production Performance (5 Customers):**

```
Target SLOs (Service Level Objectives):
┌────────────────────────────┬──────────┬──────────┐
│ Metric                     │ Target   │ P95      │
├────────────────────────────┼──────────┼──────────┤
│ API Response Time (GET)    │ <200ms   │ <500ms   │
│ API Response Time (POST)   │ <500ms   │ <1000ms  │
│ Database Provisioning      │ <5min    │ <10min   │
│ Error Rate                 │ <0.1%    │ <1%      │
│ Uptime                     │ 99.5%    │ N/A      │
│ Database Backup Success    │ 100%     │ N/A      │
└────────────────────────────┴──────────┴──────────┘

Expected Load:
- API Requests: ~1000/day (~0.01 req/sec avg, <1 req/sec peak)
- Database Writes: ~100/day
- Email Sends: ~50/day
- PostgreSQL Connections: 5 active (1 per customer)
```

**Performance Monitoring Plan:**

1. **Application Performance:**
   - Response time tracking (Winston logs + future APM)
   - Error rate monitoring
   - Request volume tracking

2. **Infrastructure Performance:**
   - CPU usage (via `top`, future: Grafana)
   - Memory usage
   - Disk I/O
   - Network bandwidth

3. **Database Performance:**
   - SQLite query times (logged in Winston)
   - PostgreSQL connection count
   - Slow query logging (PostgreSQL `log_min_duration_statement`)

4. **External Service Performance:**
   - Resend delivery rate
   - Stripe API latency
   - Turso sync latency

**Performance Optimization Opportunities:**

**Immediate (< 1 week):**
1. ✅ SQLite WAL mode enabled (already configured)
2. ✅ Database indexes in place (23 indexes)
3. ⚠️ Add response caching for static data (customer list, stats)

**Short-term (< 1 month):**
4. Add pgBouncer connection pooling (PostgreSQL)
5. Implement Redis caching for frequently accessed data
6. Optimize database queries (add EXPLAIN ANALYZE logging)

**Long-term (< 3 months):**
7. Add CDN for static assets (Cloudflare)
8. Implement database read replicas (if needed)
9. Consider horizontal scaling (multiple VPS instances with load balancer)

---

## 7. Development Workflow

### Local Development

**Development Environment Setup:** See Section 4 (Operational Reference) for detailed setup

**Development Tools:**

| Tool | Purpose | Configuration |
|------|---------|---------------|
| **VS Code** | Code editor | Recommended extensions: ESLint, Prettier, TypeScript |
| **Node.js** | Runtime | v18.0+ required |
| **npm** | Package manager | v9.0+ |
| **Git** | Version control | Conventional commits encouraged |
| **SQLite** | Database (local) | better-sqlite3 driver |
| **curl** | API testing | For manual endpoint testing |
| **Postman** | API testing | Collection available (future) |

**Database Seeding:**

```bash
# Seed development data
cd backend
npm run db:seed

# This creates:
# - 10 sample customers (various statuses)
# - 5 active databases
# - Sample billing records
# - Sample workflow checkpoints
```

**Debugging:**

**VS Code Launch Configuration** (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "skipFiles": ["<node_internals>/**"],
      "cwd": "${workspaceFolder}/backend",
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

**Logging During Development:**
- Set `LOG_LEVEL=debug` in `.env`
- Logs output to console + `backend/logs/app.log`
- Use `logger.debug()` for verbose debugging

**Common Development Tasks:**

```bash
# Add new API endpoint
# 1. Add validator in src/validators/
# 2. Add controller in src/api/controllers/
# 3. Add route in src/api/routes/
# 4. Add tests in tests/integration/api/

# Add new service method
# 1. Add method in src/services/
# 2. Add types in src/types/
# 3. Add tests in tests/unit/services/

# Database schema change
# 1. Create migration in src/database/migrations/
# 2. Update schema.ts types
# 3. Run migration: npm run db:migrate

# Add new integration
# 1. Add client in src/integrations/<service>/
# 2. Add types
# 3. Add service wrapper in src/services/
# 4. Add tests
```

### CI/CD Pipeline

**Current Status:** ❌ No CI/CD pipeline yet

**Planned Pipeline (GitHub Actions):**

**Workflow File:** `.github/workflows/ci-cd.yml` (to be created)

**Trigger Conditions:**
- Push to `main` branch
- Pull request to `main`
- Manual trigger (workflow_dispatch)

**Build Stages:**

**1. Lint & Format Check**
```yaml
- name: Lint
  run: npm run lint
- name: Format check
  run: npx prettier --check src/**/*.ts
```

**2. Type Check**
```yaml
- name: TypeScript type check
  run: npm run type-check
```

**3. Build**
```yaml
- name: Build TypeScript
  run: npm run build
```

**4. Test**
```yaml
- name: Run unit tests
  run: npm run test:unit
- name: Run integration tests
  run: npm run test:integration
- name: Run E2E tests
  run: npm run test:e2e
```

**5. Security Scan**
```yaml
- name: npm audit
  run: npm audit --audit-level=moderate
- name: Snyk security scan
  run: npx snyk test
```

**6. Deploy (main branch only)**
```yaml
- name: Deploy to staging
  if: github.ref == 'refs/heads/main'
  run: |
    # SSH to staging VPS
    # Pull latest code
    # Build and restart service
```

**Test Execution:**
- Unit tests: < 10 seconds
- Integration tests: < 60 seconds
- E2E tests: < 120 seconds
- Total CI time target: < 5 minutes

**Deployment Automation:**

**Staging:**
- Auto-deploy on merge to `main`
- No approval required
- Smoke tests after deployment

**Production:**
- Manual approval required
- Deploy button in GitHub Actions UI
- Full test suite must pass
- Smoke tests + health checks after deployment

**Pipeline Monitoring:**
- GitHub Actions UI (built-in)
- Slack notifications for failures (future)
- Email notifications for production deployments

### Code Quality

**Linting (ESLint):**

**Configuration:** `backend/.eslintrc.json` (to be created)
```json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

**Run Linting:**
```bash
npm run lint
npm run lint -- --fix  # Auto-fix issues
```

**Formatting (Prettier):**

**Configuration:** `backend/.prettierrc` (to be created)
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

**Run Formatting:**
```bash
npm run format
```

**Pre-commit Hooks (Husky):**

**Status:** ⚠️ Not configured yet

**Planned:**
```bash
# Install Husky
npm install --save-dev husky

# Enable Git hooks
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run format && npm run type-check"
```

**Code Review Process:**

**Current:** ⚠️ Informal (solo developer)

**Planned (when team > 1):**
1. Create feature branch from `main`
2. Make changes, commit with conventional commits
3. Push to GitHub, create pull request
4. CI pipeline runs automatically
5. Request review from senior engineer
6. Address review comments
7. Merge to `main` (squash merge preferred)
8. Auto-deploy to staging
9. Manual deploy to production (if approved)

**Code Review Checklist:**
- [ ] Tests added/updated
- [ ] TypeScript types correct
- [ ] Error handling comprehensive
- [ ] Logging appropriate (not excessive)
- [ ] Documentation updated (if needed)
- [ ] Security considerations addressed
- [ ] Performance implications considered

**Test Coverage Requirements:**

**Target:**
- Unit tests: 80%+ coverage on services
- Integration tests: All API endpoints covered
- E2E tests: Happy path + critical error scenarios

**Current Coverage:** ⚠️ Tests written but not all passing (test setup issues)

**Check Coverage:**
```bash
npm run test -- --coverage
# Opens HTML report in browser
```

**Conventional Commits:**

**Format:** `type(scope): subject`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation change
- `style`: Code style change (formatting)
- `refactor`: Code refactoring
- `test`: Test addition/modification
- `chore`: Build/tooling change

**Examples:**
```
feat(api): add customer search endpoint
fix(provisioning): handle PostgreSQL connection errors
docs(readme): update local development setup
test(billing): add pricing calculation tests
```

---

## 8. Dependencies & Supply Chain

### Direct Dependencies (Production)

**Runtime (package.json dependencies):**

| Package | Version | Purpose | Security Status | License | Update Recommendation |
|---------|---------|---------|-----------------|---------|----------------------|
| express | ^4.18.0 | Web framework | ✅ No known vulns | MIT | ✅ Up to date |
| better-sqlite3 | ^9.2.0 | SQLite driver | ✅ No known vulns | MIT | ✅ Up to date |
| @libsql/client | ^0.4.0 | Turso/libSQL client | ✅ No known vulns | MIT | ✅ Recent release |
| zod | ^3.22.0 | Runtime validation | ✅ No known vulns | MIT | ✅ Up to date |
| dotenv | ^16.3.0 | Environment variables | ✅ No known vulns | BSD-2-Clause | ✅ Up to date |
| resend | ^2.0.0 | Email API client | ✅ No known vulns | MIT | ✅ Up to date |
| stripe | ^14.0.0 | Payment API client | ✅ No known vulns | MIT | ✅ Up to date |
| argon2 | ^0.31.0 | Password hashing | ✅ No known vulns | MIT | ✅ Up to date |
| winston | ^3.11.0 | Logging framework | ✅ No known vulns | MIT | ✅ Up to date |
| helmet | ^7.1.0 | Security headers | ✅ No known vulns | MIT | ✅ Up to date |
| cors | ^2.8.5 | CORS middleware | ✅ No known vulns | MIT | ✅ Up to date |
| express-rate-limit | ^7.1.0 | Rate limiting | ✅ No known vulns | MIT | ✅ Up to date |
| express-async-errors | ^3.1.1 | Async error handling | ✅ No known vulns | ISC | ✅ Up to date |

**Total Production Dependencies:** 13 direct + ~150 transitive

**Development Dependencies:**

| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| typescript | ^5.3.0 | TypeScript compiler | Latest stable |
| tsx | ^4.7.0 | TypeScript executor | Fast, modern |
| vitest | ^1.0.0 | Test framework | Vite-based, fast |
| supertest | ^6.3.0 | HTTP integration testing | Industry standard |
| playwright | ^1.40.0 | E2E browser testing | Heavyweight, consider if needed |
| eslint | ^8.56.0 | Linting | Stable version |
| prettier | ^3.1.0 | Code formatting | Latest |

**Dependency Management:**

**Install Dependencies:**
```bash
cd backend
npm install  # Development
npm ci --production  # Production (CI/CD)
```

**Check for Updates:**
```bash
npm outdated
```

**Update Dependencies:**
```bash
# Update patch versions (safe)
npm update

# Update minor versions (test before deploying)
npm update --save

# Update major versions (breaking changes, read changelogs)
npm install <package>@latest
```

**Security Audits:**
```bash
# Check for known vulnerabilities
npm audit

# Auto-fix (safe updates only)
npm audit fix

# Force fix (may include breaking changes)
npm audit fix --force
```

**Dependency Lock File:**
- `package-lock.json` committed to git
- Ensures reproducible builds
- Use `npm ci` in CI/CD (not `npm install`)

**License Compliance:**
- ✅ All dependencies use permissive licenses (MIT, BSD, ISC)
- ✅ No copyleft licenses (GPL)
- ✅ Safe for commercial use

### Third-Party Services

**External Service Dependencies:**

| Service | Purpose | Auth Method | SLA/Criticality | Cost | Status Page |
|---------|---------|-------------|-----------------|------|-------------|
| **Resend** | Transactional email | API key | 99.9% / High | Free tier (1,000/mo) | status.resend.com |
| **Stripe** | Payment processing | API key + webhook secret | 99.95% / Critical | 2.9% + 30¢ per transaction | status.stripe.com |
| **Netlify** | Static site hosting | Git integration | 99.99% / Medium | Free tier | netlifystatus.com |
| **Turso** | Edge database (optional) | Auth token | N/A / Low | Free tier (<1GB) | status.turso.tech |
| **Wasabi S3** | Backup storage | Access key + secret | 99.9% / High | $6/TB/mo | status.wasabi.com |
| **GitHub** | Git hosting, CI/CD (future) | Personal access token | 99.95% / Medium | Free | githubstatus.com |
| **Contabo** | VPS hosting | SSH key | 99.9% / Critical | $6.50/mo | contabo.com |

**Service Integrations:**

**Resend (Email):**
- **API Docs:** [resend.com/docs](https://resend.com/docs)
- **Rate Limits:** 100 emails/second (free tier: 10/second)
- **Webhooks:** Delivery status, bounces, complaints
- **Failover:** Fallback to direct SMTP (future)
- **Monitoring:** Track delivery rates, bounce rates

**Stripe (Payments):**
- **API Docs:** [stripe.com/docs/api](https://stripe.com/docs/api)
- **Webhooks:** payment_intent.succeeded, subscription.created, invoice.paid
- **Signature Verification:** Required (implemented)
- **Test Mode:** Use `sk_test_*` keys for development
- **Idempotency:** Implemented (24-hour cache)
- **Failover:** No failover (Stripe is single point of failure)

**Netlify (Static Hosting):**
- **Docs:** [docs.netlify.com](https://docs.netlify.com)
- **Build:** Auto-deploy from `main` branch
- **Forms:** Netlify Forms for intake form (consider migrating to API)
- **CDN:** Global CDN included
- **HTTPS:** Free SSL/TLS (Let's Encrypt)

**Turso (Edge Database):**
- **Docs:** [docs.turso.tech](https://docs.turso.tech)
- **Use Case:** Optional edge replication for SQLite
- **Sync:** Bidirectional (local ↔ Turso)
- **Latency:** <50ms globally
- **Status:** Not required for MVP, consider for scale

**Wasabi S3 (Backups):**
- **Docs:** [wasabi.com/help](https://wasabi.com/help)
- **Compatibility:** S3-compatible API
- **Regions:** us-east-1, us-east-2, us-west-1, eu-central-1
- **Lifecycle:** Manual lifecycle policies (future: automate)
- **Cost:** Fixed $6/TB/mo (no egress fees)

**GitHub (Code + CI/CD):**
- **Repository:** [github.com/jeremylongshore/cost-plus-db](https://github.com/jeremylongshore/cost-plus-db)
- **Visibility:** Private (consider public for transparency)
- **Actions:** Not configured yet
- **Dependabot:** Not configured yet

**Service Outage Response:**

**Resend Down:**
- **Detection:** Email sending fails, logs show errors
- **Impact:** Cannot send emails (intake confirmations, credentials, alerts)
- **Mitigation:** Queue emails locally, retry when service recovers
- **Failover:** Switch to direct SMTP (future implementation)
- **Communication:** Notify customers of delay

**Stripe Down:**
- **Detection:** Payment processing fails, webhook events stop
- **Impact:** Cannot process new payments, customers cannot sign up
- **Mitigation:** Wait for service recovery, no workaround
- **Communication:** Notify customers of issue, provide ETA if available

**Netlify Down:**
- **Detection:** Website unreachable
- **Impact:** Customers cannot submit intake forms
- **Mitigation:** Deploy static site to backup host (future: S3 + CloudFront)
- **Communication:** Post on social media (Twitter, if used)

**Contabo VPS Down:**
- **Detection:** Health check fails, SSH unreachable
- **Impact:** Complete service outage, all customers affected
- **Mitigation:** Restore from backup to new VPS
- **Communication:** Immediate customer notification, ETA for recovery
- **Recovery Time:** 2-4 hours (provision new VPS, restore PostgreSQL)

**Third-Party Service Monitoring:**
- [ ] Subscribe to status pages (email/RSS)
- [ ] Monitor API response times (log Resend, Stripe latency)
- [ ] Set up fallback for critical services
- [ ] Document service outage procedures

---

## 9. Current State Assessment

### What's Working Well

**Backend Implementation (100%):**
- ✅ **Service Layer Complete**: All 6 services fully implemented with business logic
- ✅ **API Layer Complete**: All 18 endpoints with controllers, validators, routes
- ✅ **TypeScript Compilation**: Zero errors, builds successfully
- ✅ **Database Schema**: Production-ready, well-normalized, indexed
- ✅ **Error Handling**: Comprehensive error classes, global middleware
- ✅ **Logging**: Structured Winston logging, audit trails
- ✅ **Input Validation**: Zod validators for all inputs (40+ field intake form)
- ✅ **Provisioning Scripts**: Bash scripts for PostgreSQL provisioning (tested syntax)

**Testing Infrastructure (100%):**
- ✅ **270+ Tests Written**: Unit, integration, E2E coverage
- ✅ **Test Framework**: Vitest configured, supertest for HTTP, Playwright for E2E
- ✅ **80%+ Coverage Target**: Tests cover critical services comprehensively
- ✅ **Test Patterns**: Good test structure, fixtures, mocks

**Documentation (100%):**
- ✅ **52 Comprehensive Docs**: Planning, SOPs, guides, architecture decisions
- ✅ **API Documentation**: Complete 33KB reference with curl examples
- ✅ **Production Readiness Report**: Honest assessment of current state
- ✅ **Operations Documentation**: Clear procedures for DevOps

**Transparent Pricing (100%):**
- ✅ **Cost Calculations**: All infrastructure costs documented
- ✅ **Billing Service**: Shows `our_cost` vs `your_price` to customers
- ✅ **Pricing Structure**: Clear tiers with add-ons
- ✅ **Customer Transparency**: All docs publicly available

**Workflow Tracking (100%):**
- ✅ **12-Checkpoint System**: Complete customer journey tracking
- ✅ **Blocker Management**: Handles workflow blockers gracefully
- ✅ **Status Transitions**: Validates customer lifecycle progression
- ✅ **Activity Logging**: Full audit trail for compliance

### Areas Needing Attention

**Critical (Must Fix Before Customer #1):**

1. **❌ No Authentication System** (Priority: P0, Effort: 4-6 hours)
   - **Problem**: All API endpoints completely open
   - **Impact**: Anyone can approve customers, provision databases, access sensitive data
   - **Solution**: Implement JWT-based authentication
   - **Owner**: DevOps engineer (you!)

2. **❌ API Keys Not Configured** (Priority: P0, Effort: 30 minutes)
   - **Problem**: Resend and Stripe using placeholder keys
   - **Impact**: Cannot send emails or process payments
   - **Solution**: Sign up for services, add real API keys to `.env`
   - **Owner**: DevOps engineer + Admin

3. **❌ Production VPS Not Provisioned** (Priority: P0, Effort: 4 hours)
   - **Problem**: No production infrastructure
   - **Impact**: Cannot deploy backend, cannot host customer databases
   - **Solution**: Provision Contabo VPS, install PostgreSQL, deploy backend
   - **Owner**: DevOps engineer

4. **❌ HTTPS Not Configured** (Priority: P0, Effort: 2 hours)
   - **Problem**: Backend API serves HTTP only
   - **Impact**: Credentials sent in plaintext, insecure
   - **Solution**: Configure nginx reverse proxy with Let's Encrypt SSL
   - **Owner**: DevOps engineer

5. **❌ No Monitoring/Alerting** (Priority: P0, Effort: 2 hours)
   - **Problem**: Won't know if system goes down
   - **Impact**: Extended downtime without notification
   - **Solution**: Set up UptimeRobot, configure Resend alerts
   - **Owner**: DevOps engineer

**High Priority (Fix Within 1 Week):**

6. **⚠️ Tests Don't Run** (Priority: P1, Effort: 2 hours)
   - **Problem**: Test database setup issues, some tests fail
   - **Impact**: Cannot verify code correctness automatically
   - **Solution**: Fix test setup, ensure all 270+ tests pass
   - **Owner**: Backend developer

7. **⚠️ No CI/CD Pipeline** (Priority: P1, Effort: 4 hours)
   - **Problem**: Manual deployments only, no automated testing
   - **Impact**: Slower deployments, higher risk of errors
   - **Solution**: Set up GitHub Actions pipeline
   - **Owner**: DevOps engineer

8. **⚠️ Provisioning Scripts Untested** (Priority: P1, Effort: 2 hours)
   - **Problem**: Bash scripts never run on real VPS
   - **Impact**: May fail during first customer provisioning
   - **Solution**: Test on staging VPS, fix any issues
   - **Owner**: DevOps engineer

**Medium Priority (Fix Within 1 Month):**

9. **⚠️ No Admin UI** (Priority: P2, Effort: 8-12 hours)
   - **Problem**: Must use curl or database queries for admin tasks
   - **Impact**: Slower operations, higher error risk
   - **Solution**: Build simple admin dashboard (React or htmx)
   - **Owner**: Frontend developer (future hire)

10. **⚠️ No Customer Portal** (Priority: P2, Effort: 8-12 hours)
    - **Problem**: Customers receive credentials via email only
    - **Impact**: Customers cannot view database stats, invoices online
    - **Solution**: Build customer portal with login
    - **Owner**: Frontend developer (future hire)

11. **⚠️ No Backup Verification** (Priority: P2, Effort: 2 hours)
    - **Problem**: Backups created but never tested
    - **Impact**: Backups may be corrupt and unrecoverable
    - **Solution**: Automate weekly backup restore test
    - **Owner**: DevOps engineer

**Low Priority (Future Enhancements):**

12. **📝 No Advanced Features** (Priority: P3, Effort: varies)
    - Read replicas provisioning
    - High availability setup
    - Multi-region support
    - Automated scaling

### Immediate Priorities (Ranked by Impact and Urgency)

**Priority 1 (This Week):**

1. **[CRITICAL]** Implement Authentication (4-6 hours)
   - **Why**: Blocks production deployment, security risk
   - **Approach**: JWT-based auth, simple admin login, protect admin routes

2. **[CRITICAL]** Configure API Keys (30 minutes)
   - **Why**: Required for email and payments
   - **Approach**: Sign up for Resend (free), Stripe (test mode), add keys to `.env`

3. **[CRITICAL]** Provision Production VPS (4 hours)
   - **Why**: No infrastructure = cannot go live
   - **Approach**: Contabo VPS, Ubuntu 24.04, PostgreSQL 16, nginx + Let's Encrypt

**Priority 2 (Next Week):**

4. **[HIGH]** Test Provisioning Scripts (2 hours)
   - **Why**: Avoid failures during first customer onboarding
   - **Approach**: Run scripts on staging VPS, fix any issues

5. **[HIGH]** Set Up Monitoring (2 hours)
   - **Why**: Need to know when system goes down
   - **Approach**: UptimeRobot for health checks, Resend alerts for errors

6. **[HIGH]** Configure CI/CD (4 hours)
   - **Why**: Automate testing and deployments
   - **Approach**: GitHub Actions pipeline, auto-deploy to staging

**Priority 3 (Month 1):**

7. **[MEDIUM]** Fix Test Suite (2 hours)
   - **Why**: Enable automated testing in CI/CD
   - **Approach**: Fix test database setup, verify all tests pass

8. **[MEDIUM]** Build Admin UI (8-12 hours)
   - **Why**: Simplify admin operations
   - **Approach**: Simple HTML + htmx, match website design

9. **[MEDIUM]** Automate Backup Verification (2 hours)
   - **Why**: Ensure backups are recoverable
   - **Approach**: Weekly cron job to restore random backup, verify

---

## 10. Quick Reference

### Essential Commands

**Local Development:**
```bash
# Start backend development server
cd backend
npm run dev
# Server: http://localhost:3000
# Health: http://localhost:3000/health

# Start frontend (website)
cd website
python3 -m http.server 8000
# Website: http://localhost:8000

# Initialize database (first time only)
npm run db:init

# Run database migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

**Deployment (Future):**
```bash
# Deploy to staging
ssh staging@staging.costplusdb.com
cd /opt/costplusdb
git pull origin main
cd backend
npm ci --production
npm run build
sudo systemctl restart costplusdb-backend

# Deploy to production
ssh production@api.costplusdb.com
cd /opt/costplusdb
git pull origin main
cd backend
npm ci --production
npm run build
sudo systemctl reload costplusdb-backend

# Verify deployment
curl https://api.costplusdb.com/health
```

**View Logs:**
```bash
# Local development
tail -f backend/logs/app.log

# Production (future)
ssh production@api.costplusdb.com
tail -f /var/log/costplusdb/app.log
# Or: sudo journalctl -u costplusdb-backend -f
```

**Emergency Procedures:**
```bash
# Rollback deployment
git reset --hard HEAD~1
npm run build
sudo systemctl restart costplusdb-backend

# Restore database from backup
cd /home/admincostplus/projects/costplusdb/002-clients/database
cp costplusdb.db.backup.YYYYMMDD_HHMMSS costplusdb.db
sudo systemctl restart costplusdb-backend

# Check PostgreSQL customer database
ssh production@db.costplusdb.com
sudo -u postgres psql -c "\l"
sudo -u postgres psql -d customer_db -c "SELECT 1"
```

**Infrastructure Changes (Future):**
```bash
# Provision new customer database
SUDO_PASS="password" ./scripts/provision/provision-customer-database.sh acmecorp

# Deprovision customer database
echo "yes" | SUDO_PASS="password" ./scripts/deprovision/deprovision-customer-database.sh acmecorp

# Sync to Turso cloud (if enabled)
npm run db:sync
```

### Critical Endpoints

**Production (Future):**
- **Website**: https://costplusdb.com
- **Backend API**: https://api.costplusdb.com
- **Health Check**: https://api.costplusdb.com/health
- **PostgreSQL**: db.costplusdb.com:5432 (customer access)

**Staging (Future):**
- **Website**: https://staging.costplusdb.com
- **Backend API**: https://staging-api.costplusdb.com
- **Health Check**: https://staging-api.costplusdb.com/health

**Development:**
- **Website**: http://localhost:8000
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

**Monitoring (Future):**
- **UptimeRobot**: https://uptimerobot.com/dashboard
- **Grafana** (future): https://grafana.costplusdb.com

**CI/CD (Future):**
- **GitHub Actions**: https://github.com/jeremylongshore/cost-plus-db/actions

**Documentation:**
- **API Docs**: `000-docs/050-DR-GUID-api-documentation.md`
- **Production Readiness**: `000-docs/051-PM-REPO-production-readiness-report.md`
- **This Document**: `/home/admincostplus/projects/costplusdb/DEVOPS_SYSTEM_ANALYSIS.md`

### First Week Checklist

**Day 1: Environment Setup**
- [ ] Clone repository
- [ ] Install Node.js 18+, npm, SQLite
- [ ] Run `npm install` in backend/
- [ ] Create `.env` from `.env.example`
- [ ] Generate JWT_SECRET and ENCRYPTION_KEY
- [ ] Initialize database (`npm run db:init`)
- [ ] Start development server (`npm run dev`)
- [ ] Verify health check works
- [ ] Read `000-docs/051-PM-REPO-production-readiness-report.md`
- [ ] Read `000-docs/050-DR-GUID-api-documentation.md`

**Day 2: Infrastructure Setup**
- [ ] Provision Contabo VPS (8GB RAM, 200GB storage)
- [ ] Install PostgreSQL 16
- [ ] Install pgBackRest
- [ ] Configure Wasabi S3 credentials
- [ ] Install nginx
- [ ] Configure Let's Encrypt SSL
- [ ] Test SSH access

**Day 3: Backend Deployment**
- [ ] Deploy backend to production VPS
- [ ] Configure systemd service
- [ ] Configure nginx reverse proxy
- [ ] Test health check endpoint (HTTPS)
- [ ] Configure firewall (UFW)
- [ ] Configure fail2ban

**Day 4: Authentication Implementation**
- [ ] Implement JWT middleware
- [ ] Create admin login endpoint
- [ ] Protect admin routes
- [ ] Test authentication flow
- [ ] Update API documentation

**Day 5: Monitoring & Testing**
- [ ] Set up UptimeRobot health checks
- [ ] Configure Resend alerts
- [ ] Test provisioning scripts on VPS
- [ ] Fix test suite issues
- [ ] Run full test suite

---

## 11. Recommendations Roadmap

### Week 1: Critical Setup & Immediate Fixes

**Goals:**
- Production infrastructure operational
- Authentication implemented
- System ready for Customer #1

**Tasks:**

**Day 1-2: Infrastructure**
- [ ] Provision Contabo VPS ($6.50/mo, 8GB RAM, 200GB storage)
- [ ] Install PostgreSQL 16, pgBackRest, nginx
- [ ] Configure Wasabi S3 for backups
- [ ] Set up Let's Encrypt SSL
- [ ] Configure firewall (UFW) and fail2ban

**Day 3-4: Backend & Authentication**
- [ ] Deploy backend to production VPS
- [ ] Implement JWT authentication (4-6 hours)
- [ ] Protect admin API routes
- [ ] Configure systemd service
- [ ] Test health check endpoint

**Day 5: API Keys & Testing**
- [ ] Sign up for Resend (production)
- [ ] Sign up for Stripe (production keys)
- [ ] Update .env with real API keys
- [ ] Test provisioning scripts on VPS
- [ ] Test email sending
- [ ] Test Stripe payment link creation

**Day 6-7: Monitoring & Final Checks**
- [ ] Set up UptimeRobot for health checks
- [ ] Configure Resend alerts for errors
- [ ] Run full test suite (fix any failures)
- [ ] End-to-end test with test customer
- [ ] Document any issues found

**Success Criteria:**
- Backend API operational at https://api.costplusdb.com
- Health check returns 200 OK
- Authentication protecting admin routes
- Email sending works
- Stripe payment links generate successfully
- Database provisioning script works
- Monitoring alerts configured

### Month 1: Foundation Building

**Goals:**
- CI/CD pipeline operational
- Admin UI for common tasks
- Backup verification automated
- Customer #1 onboarded successfully

**Week 2: CI/CD & Admin UI**
- [ ] Set up GitHub Actions pipeline
- [ ] Configure automated testing (unit + integration)
- [ ] Set up auto-deploy to staging
- [ ] Build basic admin UI (customer list, approval, provisioning)
- [ ] Test admin UI workflows

**Week 3: Operations & Reliability**
- [ ] Automate backup verification (weekly restore test)
- [ ] Set up log rotation (logrotate)
- [ ] Configure database metrics collection
- [ ] Create Grafana dashboards (future)
- [ ] Document incident response procedures

**Week 4: Customer #1 & Onboarding**
- [ ] Onboard first customer
- [ ] Monitor closely for issues
- [ ] Gather feedback
- [ ] Fix any problems discovered
- [ ] Update documentation with learnings

**Success Criteria:**
- CI/CD pipeline running
- Admin UI functional
- Backups verified automatically
- Customer #1 successfully onboarded
- No major incidents

### Quarter 1: Strategic Improvements

**Goals:**
- 5 customers onboarded
- Customer portal launched
- Advanced monitoring and alerting
- Security hardened

**Month 2: Scale & Polish**
- [ ] Onboard customers 2-5
- [ ] Build customer portal (login, database details, invoices)
- [ ] Implement read-only customer API
- [ ] Add advanced monitoring (APM, error tracking)
- [ ] Optimize database queries

**Month 3: Security & Compliance**
- [ ] Conduct security audit (internal)
- [ ] Implement database auditing
- [ ] Configure WAF (Cloudflare or AWS WAF)
- [ ] Document security procedures
- [ ] Prepare for SOC 2 Type I (if needed for compliance add-on)

**Success Criteria:**
- 5 customers actively using service
- Customer portal launched
- No security incidents
- Monitoring comprehensive
- Prepared for next 50 customers

---

## 12. Appendices

### A. Glossary

**Technical Terms:**

| Term | Definition |
|------|------------|
| **Add-on** | Optional service feature (HA, replicas, VPN, compliance) with additional cost |
| **Argon2** | Password hashing algorithm, more secure than bcrypt |
| **Checkpoint** | Stage in customer onboarding workflow (12 total: form_submitted → three_month_milestone) |
| **CI/CD** | Continuous Integration / Continuous Deployment - automated testing and deployment |
| **CORS** | Cross-Origin Resource Sharing - HTTP header-based security mechanism |
| **CSP** | Content Security Policy - HTTP header preventing XSS attacks |
| **JWT** | JSON Web Token - authentication token format |
| **libSQL** | Fork of SQLite with edge replication capabilities (Turso) |
| **MRR** | Monthly Recurring Revenue - predictable subscription revenue |
| **P0/P1/P2** | Priority levels for incidents (P0 = critical, P1 = high, P2 = medium) |
| **pgBackRest** | PostgreSQL backup and restore tool with point-in-time recovery |
| **pgBouncer** | PostgreSQL connection pooler for managing database connections |
| **PITR** | Point-In-Time Recovery - restore database to specific timestamp |
| **RPO** | Recovery Point Objective - maximum acceptable data loss (time) |
| **RTO** | Recovery Time Objective - maximum acceptable downtime (time) |
| **SLO** | Service Level Objective - internal performance target |
| **Tier** | Customer pricing level (Shared $49, Dedicated $89, Pro $129, Enterprise $149) |
| **Turso** | Edge-replicated SQLite platform (libSQL) |
| **VPS** | Virtual Private Server - virtualized server hosting |
| **WAL** | Write-Ahead Logging - SQLite journaling mode for concurrency |
| **Webhook** | HTTP callback for event notifications (e.g., Stripe payment succeeded) |
| **Zod** | TypeScript-first schema validation library |

**Acronyms:**

- **API**: Application Programming Interface
- **DB**: Database
- **E2E**: End-to-End
- **HA**: High Availability
- **IAM**: Identity and Access Management
- **IaC**: Infrastructure as Code
- **REST**: Representational State Transfer
- **SOP**: Standard Operating Procedure
- **SSL/TLS**: Secure Sockets Layer / Transport Layer Security
- **UI**: User Interface
- **UX**: User Experience
- **VPN**: Virtual Private Network

### B. Reference Links

**Official Documentation:**
- Node.js: https://nodejs.org/docs
- TypeScript: https://www.typescriptlang.org/docs
- Express: https://expressjs.com
- SQLite: https://www.sqlite.org/docs.html
- PostgreSQL: https://www.postgresql.org/docs/16/
- Zod: https://zod.dev
- Winston: https://github.com/winstonjs/winston
- Resend API: https://resend.com/docs
- Stripe API: https://stripe.com/docs/api

**CostPlusDB Resources:**
- GitHub Repository: https://github.com/jeremylongshore/cost-plus-db
- Production Website: https://costplusdb.com (future)
- API Documentation: `000-docs/050-DR-GUID-api-documentation.md`
- Production Readiness Report: `000-docs/051-PM-REPO-production-readiness-report.md`

**Infrastructure Providers:**
- Contabo VPS: https://contabo.com/en/vps/
- Wasabi S3: https://wasabi.com
- Netlify: https://netlify.com
- Turso: https://turso.tech

**Monitoring & Status Pages:**
- UptimeRobot: https://uptimerobot.com
- Resend Status: https://status.resend.com
- Stripe Status: https://status.stripe.com
- Netlify Status: https://netlifystatus.com
- GitHub Status: https://githubstatus.com

**Security Resources:**
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- npm Security Advisories: https://www.npmjs.com/advisories
- PostgreSQL Security: https://www.postgresql.org/docs/16/security.html

### C. Troubleshooting Guide

**Common Issues:**

**1. Backend Won't Start**

**Symptoms:** `npm run dev` fails, port already in use

**Diagnosis:**
```bash
# Check if port 3000 is in use
lsof -i :3000

# Check for process
ps aux | grep node
```

**Solutions:**
- Kill existing process: `kill <PID>`
- Change port in `.env`: `PORT=3001`
- Check for syntax errors: `npm run type-check`

**2. Database Locked Error (SQLite)**

**Symptoms:** `SQLITE_BUSY: database is locked`

**Diagnosis:**
```bash
# Check for open connections
fuser /home/admincostplus/projects/costplusdb/002-clients/database/costplusdb.db
```

**Solutions:**
- Restart backend service (releases lock)
- Ensure WAL mode enabled: `PRAGMA journal_mode = WAL;`
- Check for long-running transactions

**3. TypeScript Compilation Errors**

**Symptoms:** `npm run build` fails

**Diagnosis:**
```bash
npm run type-check
```

**Solutions:**
- Fix type errors in code
- Update TypeScript: `npm install --save-dev typescript@latest`
- Clear node_modules: `rm -rf node_modules && npm install`

**4. Tests Failing**

**Symptoms:** `npm test` shows failures

**Diagnosis:**
- Check test output for specific failures
- Run single test: `npm test -- tests/unit/services/customer.service.test.ts`

**Solutions:**
- Fix test database setup (see `tests/setup.ts`)
- Update test fixtures
- Check for environment-specific issues

**5. Email Sending Fails**

**Symptoms:** Emails not delivered, Resend errors in logs

**Diagnosis:**
```bash
# Check Resend API key
grep RESEND_API_KEY backend/.env

# Check logs
grep "email" backend/logs/app.log | grep "error"
```

**Solutions:**
- Verify API key is correct
- Check Resend account status (quota, payment)
- Verify sender email is verified in Resend
- Check email template syntax

**6. Stripe Webhook Not Working**

**Symptoms:** Payments succeed but backend not notified

**Diagnosis:**
```bash
# Check webhook secret
grep STRIPE_WEBHOOK_SECRET backend/.env

# Check webhook logs
grep "webhook" backend/logs/app.log
```

**Solutions:**
- Verify webhook secret matches Stripe dashboard
- Check webhook URL is correct: `https://api.costplusdb.com/api/webhooks/stripe`
- Test webhook signature verification
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### D. Change Management

**Keeping This Document Updated:**

**Frequency:** Update after major changes (new features, infrastructure changes, deployments)

**Process:**
1. Identify sections affected by change
2. Update relevant sections
3. Update version at top of document
4. Commit changes with descriptive commit message
5. Notify team of significant updates

**Major Changes Requiring Update:**
- New services or dependencies added
- Infrastructure changes (new VPS, database, etc.)
- Deployment process changes
- Security incidents or changes
- Performance optimizations
- New team members

**Version History:**
- v1.0.0 (2025-10-20): Initial comprehensive analysis
- v1.1.0 (future): After authentication implementation
- v1.2.0 (future): After Customer #1 onboarding

**Document Owner:** DevOps Engineer (you!)

**Contact for Questions:**
- Email: jeremy@intentsolutions.io
- Slack: #costplusdb-ops (when set up)
- GitHub Issues: For documentation improvements

---

**End of System Analysis**

**Last Updated:** 2025-10-20
**Document Version:** 1.0.0
**Compiled By:** Claude (AI Assistant) + Jeremy Longshore
**Review Status:** Initial draft, pending DevOps engineer review

This document is a living artifact. Update it, improve it, and make it your own. Good luck, and welcome to CostPlusDB! 🚀
