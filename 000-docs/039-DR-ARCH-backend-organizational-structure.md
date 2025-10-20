# Backend Organizational Architecture - CostPlusDB

**Document ID:** 039-DR-ARCH-backend-organizational-structure.md
**Created:** 2025-10-20
**Status:** Architectural Decision Record
**Purpose:** Define strict organizational architecture for SQLite/Turso integration and backend infrastructure

---

## Executive Summary

This document establishes the **strict organizational architecture** for CostPlusDB's backend infrastructure, SQLite database integration, API layer, and automation systems. The architecture prioritizes:

- **Separation of Concerns** - Clear boundaries between database, API, business logic
- **Scalability** - Easy migration from SQLite → PostgreSQL at 5,000+ customers
- **Security** - Environment-based secrets, encrypted credentials, audit trails
- **Maintainability** - Consistent naming, clear dependencies, comprehensive documentation
- **Testability** - Isolated components, mock-friendly structure

**Technology Stack:**
- **Database:** SQLite (local) + Turso (cloud sync)
- **API Layer:** Node.js + Express (Cloudflare Workers for production)
- **ORM:** Better-sqlite3 (synchronous, fast) or Drizzle ORM
- **Validation:** Zod (TypeScript schema validation)
- **Testing:** Vitest (unit) + Playwright (E2E)

---

## Directory Structure (Strict Standard)

```
/home/admincostplus/projects/costplusdb/
│
├── backend/                                 # 🎯 NEW: Backend application code
│   ├── README.md                            # Backend overview, quick start
│   ├── package.json                         # Node.js dependencies
│   ├── tsconfig.json                        # TypeScript configuration
│   ├── .env.example                         # Environment variable template
│   ├── .env                                 # Local environment (gitignored)
│   │
│   ├── src/                                 # Source code (TypeScript)
│   │   ├── index.ts                         # Main entry point
│   │   │
│   │   ├── config/                          # Configuration management
│   │   │   ├── index.ts                     # Config loader (env validation)
│   │   │   ├── database.ts                  # Database config (SQLite/Turso)
│   │   │   ├── email.ts                     # Email config (Resend)
│   │   │   └── stripe.ts                    # Stripe config
│   │   │
│   │   ├── database/                        # Database layer (SQLite/Turso)
│   │   │   ├── index.ts                     # Database connection manager
│   │   │   ├── schema.ts                    # TypeScript schema definitions
│   │   │   ├── migrations/                  # Database migrations
│   │   │   │   ├── 001_initial_schema.sql
│   │   │   │   ├── 002_add_indexes.sql
│   │   │   │   └── migrate.ts               # Migration runner
│   │   │   ├── seeds/                       # Test data
│   │   │   │   └── dev-customers.ts
│   │   │   └── repositories/                # Data access layer (DAL)
│   │   │       ├── customers.repository.ts
│   │   │       ├── databases.repository.ts
│   │   │       ├── billing.repository.ts
│   │   │       └── support.repository.ts
│   │   │
│   │   ├── services/                        # Business logic layer
│   │   │   ├── customer.service.ts          # Customer operations
│   │   │   ├── provisioning.service.ts      # Database provisioning logic
│   │   │   ├── billing.service.ts           # Billing calculations
│   │   │   ├── email.service.ts             # Email sending (Resend)
│   │   │   └── stripe.service.ts            # Stripe integration
│   │   │
│   │   ├── api/                             # API layer (HTTP endpoints)
│   │   │   ├── app.ts                       # Express app setup
│   │   │   ├── middleware/                  # Express middleware
│   │   │   │   ├── auth.middleware.ts       # Authentication
│   │   │   │   ├── validation.middleware.ts # Request validation
│   │   │   │   ├── error.middleware.ts      # Error handling
│   │   │   │   └── logging.middleware.ts    # Request logging
│   │   │   ├── routes/                      # API routes
│   │   │   │   ├── index.ts                 # Route registration
│   │   │   │   ├── intake.routes.ts         # POST /api/intake
│   │   │   │   ├── webhooks.routes.ts       # POST /api/webhooks/*
│   │   │   │   ├── customers.routes.ts      # CRUD /api/customers
│   │   │   │   └── health.routes.ts         # GET /health
│   │   │   └── controllers/                 # Route handlers
│   │   │       ├── intake.controller.ts
│   │   │       ├── webhook.controller.ts
│   │   │       └── customer.controller.ts
│   │   │
│   │   ├── validators/                      # Zod schema validators
│   │   │   ├── intake-form.validator.ts     # Customer intake form
│   │   │   ├── customer.validator.ts        # Customer updates
│   │   │   └── webhook.validator.ts         # Stripe webhook events
│   │   │
│   │   ├── types/                           # TypeScript type definitions
│   │   │   ├── customer.types.ts
│   │   │   ├── database.types.ts
│   │   │   ├── api.types.ts
│   │   │   └── index.ts                     # Type exports
│   │   │
│   │   ├── utils/                           # Utility functions
│   │   │   ├── logger.ts                    # Structured logging
│   │   │   ├── encryption.ts                # Password hashing, encryption
│   │   │   ├── dates.ts                     # Date formatting
│   │   │   └── errors.ts                    # Custom error classes
│   │   │
│   │   └── scripts/                         # Operational scripts
│   │       ├── init-database.ts             # Initialize SQLite database
│   │       ├── sync-to-turso.ts             # Sync to Turso cloud
│   │       ├── seed-dev-data.ts             # Seed development data
│   │       └── generate-types.ts            # Generate types from schema
│   │
│   ├── tests/                               # Test suite
│   │   ├── unit/                            # Unit tests (services, utils)
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   └── utils/
│   │   ├── integration/                     # Integration tests (API + DB)
│   │   │   ├── api/
│   │   │   └── database/
│   │   ├── e2e/                             # End-to-end tests
│   │   │   └── customer-onboarding.spec.ts
│   │   ├── fixtures/                        # Test data fixtures
│   │   └── setup.ts                         # Test environment setup
│   │
│   ├── dist/                                # Compiled JavaScript (gitignored)
│   ├── node_modules/                        # Dependencies (gitignored)
│   └── .gitignore                           # Backend-specific gitignore
│
├── 002-clients/                             # Customer data storage
│   ├── database/
│   │   ├── costplusdb.db                    # Local SQLite (gitignored)
│   │   ├── costplusdb-test.db               # Test database (gitignored)
│   │   └── schema.sql                       # ✅ Already exists
│   └── ...
│
├── scripts/                                 # 🎯 NEW: Operational automation
│   ├── README.md                            # Scripts overview
│   ├── provision/                           # Database provisioning
│   │   ├── provision-customer-database.sh   # Main provisioning script
│   │   ├── generate-credentials.sh          # Generate secure credentials
│   │   └── configure-backups.sh             # Configure pgBackRest for customer
│   ├── sync/                                # Data synchronization
│   │   ├── sync-to-turso.sh                 # Sync SQLite → Turso
│   │   └── backup-local-db.sh               # Backup local SQLite
│   ├── webhooks/                            # Webhook handlers
│   │   ├── stripe-payment-success.sh        # Handle Stripe webhook
│   │   └── github-action-trigger.sh         # Trigger GitHub Actions
│   └── utils/                               # Utility scripts
│       ├── health-check.sh                  # Check backend health
│       └── rotate-secrets.sh                # Rotate API keys
│
└── ...
```

---

## Architectural Layers (Strict Separation)

### **Layer 1: Database Layer** (`backend/src/database/`)

**Purpose:** Direct database access, schema definitions, migrations

**Responsibilities:**
- Database connection management (SQLite local + Turso remote)
- Schema definitions (TypeScript types matching SQL schema)
- Migration execution and version tracking
- Repository pattern (data access objects)

**Rules:**
- ✅ NO business logic in this layer
- ✅ NO API concerns (HTTP, validation)
- ✅ Pure data access (CRUD operations)
- ✅ Returns plain objects (no HTTP responses)

**Example: `customers.repository.ts`**
```typescript
// Data Access Object for customers table
export class CustomersRepository {
  constructor(private db: Database) {}

  // Create new customer
  async create(data: CustomerCreateInput): Promise<Customer> {
    const stmt = this.db.prepare(`
      INSERT INTO customers (company_name, email, tier, status)
      VALUES (@company_name, @email, @tier, @status)
    `);
    const result = stmt.run(data);
    return this.findById(result.lastInsertRowid);
  }

  // Find customer by ID
  async findById(id: number): Promise<Customer | null> {
    const stmt = this.db.prepare('SELECT * FROM customers WHERE id = ?');
    return stmt.get(id) || null;
  }

  // Find customer by email
  async findByEmail(email: string): Promise<Customer | null> {
    const stmt = this.db.prepare('SELECT * FROM customers WHERE email = ?');
    return stmt.get(email) || null;
  }

  // Update customer status
  async updateStatus(id: number, status: CustomerStatus): Promise<void> {
    const stmt = this.db.prepare('UPDATE customers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(status, id);
  }

  // List active customers
  async listActive(): Promise<Customer[]> {
    const stmt = this.db.prepare('SELECT * FROM customers WHERE status = ? ORDER BY created_at DESC');
    return stmt.all('active');
  }
}
```

---

### **Layer 2: Service Layer** (`backend/src/services/`)

**Purpose:** Business logic, orchestration, workflows

**Responsibilities:**
- Implement business rules
- Orchestrate multiple repositories
- Call external services (email, Stripe)
- Handle complex workflows (onboarding, provisioning)

**Rules:**
- ✅ NO database queries (use repositories)
- ✅ NO HTTP concerns (no request/response objects)
- ✅ Pure business logic
- ✅ Testable in isolation

**Example: `customer.service.ts`**
```typescript
export class CustomerService {
  constructor(
    private customersRepo: CustomersRepository,
    private emailService: EmailService,
    private stripeService: StripeService
  ) {}

  // Process customer intake form submission
  async processIntakeForm(formData: IntakeFormData): Promise<CustomerOnboarding> {
    // Validate no duplicate email
    const existing = await this.customersRepo.findByEmail(formData.email);
    if (existing) {
      throw new ConflictError('Customer with this email already exists');
    }

    // Create customer record
    const customer = await this.customersRepo.create({
      company_name: formData.company_name,
      email: formData.email,
      tier: formData.tier,
      status: 'prospect',
      // ... map all form fields
    });

    // Send confirmation email to customer
    await this.emailService.sendIntakeConfirmation(customer);

    // Send internal notification
    await this.emailService.sendInternalNotification('New customer intake', customer);

    // Return onboarding status
    return {
      customer_id: customer.id,
      status: 'prospect',
      next_step: 'consultation',
      message: 'Thank you! We will contact you within 2 hours to schedule a consultation.'
    };
  }

  // Approve customer and send payment link
  async approveCustomer(customerId: number, tier: Tier, addons: Addon[]): Promise<PaymentLink> {
    const customer = await this.customersRepo.findById(customerId);
    if (!customer) throw new NotFoundError('Customer not found');

    // Update status to approved
    await this.customersRepo.updateStatus(customerId, 'approved');

    // Calculate pricing
    const pricing = this.calculatePricing(tier, addons);

    // Create Stripe payment link
    const paymentLink = await this.stripeService.createPaymentLink(customer, pricing);

    // Send payment request email
    await this.emailService.sendPaymentRequest(customer, paymentLink);

    return paymentLink;
  }

  // Calculate transparent pricing
  private calculatePricing(tier: Tier, addons: Addon[]): Pricing {
    const basePrices = { shared: 49, dedicated: 89, pro: 129, enterprise: 149 };
    const addonPrices = { ha: 99, replicas: 15, vpn: 15, compliance: 100 };

    let total = basePrices[tier];
    const breakdown = [{ item: `${tier} tier`, cost: basePrices[tier] }];

    addons.forEach(addon => {
      total += addonPrices[addon];
      breakdown.push({ item: addon, cost: addonPrices[addon] });
    });

    return { total, breakdown };
  }
}
```

---

### **Layer 3: API Layer** (`backend/src/api/`)

**Purpose:** HTTP interface, request handling, response formatting

**Responsibilities:**
- Handle HTTP requests/responses
- Validate incoming data (Zod schemas)
- Authentication and authorization
- Error handling and logging
- Route registration

**Rules:**
- ✅ NO business logic (delegate to services)
- ✅ NO database access (use services)
- ✅ Thin controllers (just orchestration)
- ✅ Return proper HTTP status codes

**Example: `intake.controller.ts`**
```typescript
export class IntakeController {
  constructor(
    private customerService: CustomerService,
    private validator: IntakeFormValidator
  ) {}

  // POST /api/intake - Handle customer intake form submission
  async handleIntakeSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body
      const formData = this.validator.validate(req.body);

      // Process intake form (business logic in service)
      const result = await this.customerService.processIntakeForm(formData);

      // Log successful submission
      logger.info('Customer intake processed', { customer_id: result.customer_id });

      // Return success response
      res.status(201).json({
        success: true,
        data: result,
        message: 'Your request has been submitted successfully'
      });

    } catch (error) {
      // Pass errors to error handling middleware
      next(error);
    }
  }
}
```

**Example: `intake.routes.ts`**
```typescript
const router = express.Router();
const intakeController = new IntakeController(customerService, validator);

// POST /api/intake - Customer intake form submission
router.post('/intake', intakeController.handleIntakeSubmission.bind(intakeController));

export default router;
```

---

## Database Management Strategy

### **Local SQLite (Development & Backup)**

**Location:** `/home/admincostplus/projects/costplusdb/002-clients/database/costplusdb.db`

**Purpose:**
- Primary development database
- Local backup of customer data
- Offline-capable operations

**Initialization:**
```bash
# Initialize database from schema
sqlite3 002-clients/database/costplusdb.db < 002-clients/database/schema.sql

# OR using Node.js script
npm run db:init
```

**Backup Strategy:**
- Daily backup via Litestream → Wasabi S3
- Git-ignored (never commit database file)

---

### **Turso Cloud (Production & Sync)**

**Purpose:**
- Global edge replication (low latency worldwide)
- Multi-region redundancy
- Remote access for dashboards/APIs
- Automatic backups

**Sync Strategy:**

**Option A: Turso as Primary (Recommended)**
- Backend writes directly to Turso
- Local SQLite as backup/read replica
- Periodic sync: Turso → Local

**Option B: Local Primary, Turso Backup**
- Backend writes to local SQLite
- Sync every 5 minutes: Local → Turso
- Turso as disaster recovery

**Recommended:** Option A (Turso primary) for production, Option B for development.

---

## Configuration Management (Environment Variables)

### **`.env.example` (Committed to Git)**
```bash
# Database Configuration
DATABASE_URL="file:002-clients/database/costplusdb.db"
TURSO_DATABASE_URL="libsql://your-database-name.turso.io"
TURSO_AUTH_TOKEN="your-auth-token-here"

# Email Configuration (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxx"
RESEND_FROM_EMAIL="costplusdb@intentsolutions.io"
RESEND_ADMIN_EMAIL="jeremy@intentsolutions.io"

# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_xxxxxxxxxxxxxxxxxxxxxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxxxxxxxxxxxxx"
STRIPE_PUBLISHABLE_KEY="pk_test_xxxxxxxxxxxxxxxxxxxxxxxx"

# API Configuration
NODE_ENV="development"
PORT="3000"
API_BASE_URL="http://localhost:3000"

# Security
JWT_SECRET="your-jwt-secret-here"
ENCRYPTION_KEY="your-32-byte-encryption-key"

# Logging
LOG_LEVEL="info"
```

### **`.env` (Gitignored, Local Development)**
```bash
# Actual secrets (NEVER commit this file)
DATABASE_URL="file:002-clients/database/costplusdb.db"
TURSO_DATABASE_URL="libsql://costplusdb-prod.turso.io"
TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."
RESEND_API_KEY="re_RgaDN3Rd_..."
STRIPE_SECRET_KEY="sk_live_..."
# ... real values
```

### **Config Loader (`backend/src/config/index.ts`)**
```typescript
import { z } from 'zod';

// Zod schema for environment validation
const envSchema = z.object({
  DATABASE_URL: z.string(),
  TURSO_DATABASE_URL: z.string().optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),
  RESEND_API_KEY: z.string(),
  RESEND_FROM_EMAIL: z.string().email(),
  RESEND_ADMIN_EMAIL: z.string().email(),
  STRIPE_SECRET_KEY: z.string(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('3000'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// Validate and export config
export const config = envSchema.parse(process.env);
```

**Benefits:**
- Type-safe configuration (TypeScript autocomplete)
- Runtime validation (fails fast if missing required vars)
- Single source of truth

---

## Migration Management

### **Migration Files (`backend/src/database/migrations/`)**

**Naming Convention:** `NNN_description.sql`

**Example: `001_initial_schema.sql`**
```sql
-- Migration: 001_initial_schema
-- Created: 2025-10-20
-- Description: Initial database schema with all tables

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL CHECK(tier IN ('shared', 'dedicated', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'prospect' CHECK(status IN ('prospect', 'consultation', 'approved', 'provisioning', 'active', 'suspended', 'churned')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for fast lookups
CREATE INDEX idx_customers_email ON customers(email);

-- Create index on status for filtering
CREATE INDEX idx_customers_status ON customers(status);

-- Record migration
INSERT INTO schema_migrations (version, description, applied_at)
VALUES (1, 'Initial schema', CURRENT_TIMESTAMP);
```

### **Migration Runner (`backend/src/database/migrations/migrate.ts`)**
```typescript
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export class MigrationRunner {
  constructor(private db: Database.Database) {}

  // Run all pending migrations
  async migrate() {
    // Ensure migrations table exists
    this.createMigrationsTable();

    // Get applied migrations
    const applied = this.getAppliedMigrations();

    // Get all migration files
    const migrationFiles = fs.readdirSync(__dirname)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // Run pending migrations
    for (const file of migrationFiles) {
      const version = parseInt(file.split('_')[0]);

      if (!applied.includes(version)) {
        console.log(`Running migration ${version}: ${file}`);
        const sql = fs.readFileSync(path.join(__dirname, file), 'utf-8');
        this.db.exec(sql);
        console.log(`✓ Migration ${version} completed`);
      }
    }
  }

  private createMigrationsTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  private getAppliedMigrations(): number[] {
    const stmt = this.db.prepare('SELECT version FROM schema_migrations ORDER BY version');
    return stmt.all().map((row: any) => row.version);
  }
}

// CLI usage: npm run migrate
if (require.main === module) {
  const db = new Database('002-clients/database/costplusdb.db');
  const runner = new MigrationRunner(db);
  runner.migrate()
    .then(() => console.log('All migrations completed'))
    .catch(err => console.error('Migration failed:', err));
}
```

---

## Error Handling Strategy

### **Custom Error Classes (`backend/src/utils/errors.ts`)**
```typescript
// Base error class
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', public errors?: any) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}
```

### **Error Handling Middleware (`backend/src/api/middleware/error.middleware.ts`)**
```typescript
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Log error
  logger.error('API Error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle AppError (known errors)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err instanceof ValidationError && { errors: err.errors }),
      },
    });
  }

  // Handle Zod validation errors
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: err.errors,
      },
    });
  }

  // Unknown errors (500)
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      ...(process.env.NODE_ENV === 'development' && { details: err.message }),
    },
  });
}
```

---

## Testing Strategy

### **Unit Tests (`backend/tests/unit/`)**

**Purpose:** Test individual functions/classes in isolation

**Example: `services/customer.service.test.ts`**
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CustomerService } from '../../src/services/customer.service';

describe('CustomerService', () => {
  let service: CustomerService;
  let mockRepo: any;
  let mockEmailService: any;

  beforeEach(() => {
    // Create mocks
    mockRepo = {
      findByEmail: vi.fn(),
      create: vi.fn(),
    };
    mockEmailService = {
      sendIntakeConfirmation: vi.fn(),
    };

    service = new CustomerService(mockRepo, mockEmailService, mockStripeService);
  });

  describe('processIntakeForm', () => {
    it('should create customer and send confirmation email', async () => {
      // Arrange
      const formData = { email: 'test@example.com', company_name: 'Test Co' };
      mockRepo.findByEmail.mockResolvedValue(null); // No existing customer
      mockRepo.create.mockResolvedValue({ id: 1, ...formData });

      // Act
      const result = await service.processIntakeForm(formData);

      // Assert
      expect(mockRepo.create).toHaveBeenCalledWith(formData);
      expect(mockEmailService.sendIntakeConfirmation).toHaveBeenCalled();
      expect(result.customer_id).toBe(1);
      expect(result.status).toBe('prospect');
    });

    it('should throw ConflictError if email already exists', async () => {
      // Arrange
      mockRepo.findByEmail.mockResolvedValue({ id: 1, email: 'test@example.com' });

      // Act & Assert
      await expect(service.processIntakeForm({ email: 'test@example.com' }))
        .rejects.toThrow(ConflictError);
    });
  });
});
```

### **Integration Tests (`backend/tests/integration/`)**

**Purpose:** Test API endpoints + database together

**Example: `api/intake.integration.test.ts`**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/api/app';
import Database from 'better-sqlite3';

describe('POST /api/intake', () => {
  let db: Database.Database;

  beforeEach(() => {
    // Create test database
    db = new Database(':memory:');
    // Run migrations
    // Seed test data if needed
  });

  it('should accept valid intake form and return 201', async () => {
    const formData = {
      company_name: 'Test Company',
      email: 'test@example.com',
      tier: 'dedicated',
      // ... all required fields
    };

    const response = await request(app)
      .post('/api/intake')
      .send(formData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.customer_id).toBeDefined();
  });

  it('should reject duplicate email with 409', async () => {
    // Insert existing customer
    // ...

    const response = await request(app)
      .post('/api/intake')
      .send({ email: 'existing@example.com' })
      .expect(409);

    expect(response.body.error.code).toBe('CONFLICT');
  });
});
```

---

## Security Considerations

### **1. Environment Secrets**
- ✅ Never commit `.env` file (gitignored)
- ✅ Use `.env.example` as template
- ✅ Validate all env vars on startup (Zod schema)
- ✅ Fail fast if critical vars missing

### **2. Database Security**
- ✅ Encrypt sensitive fields (passwords, tokens)
- ✅ Hash customer database passwords (Argon2id)
- ✅ Parameterized queries (prevent SQL injection)
- ✅ Activity logging (audit trail)

### **3. API Security**
- ✅ Rate limiting (express-rate-limit)
- ✅ Helmet.js (security headers)
- ✅ CORS configuration (restrict origins)
- ✅ Input validation (Zod schemas)

### **4. Webhook Security**
- ✅ Verify Stripe webhook signatures
- ✅ Use webhook secrets
- ✅ Idempotency (handle duplicate events)

---

## NPM Scripts (`package.json`)

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "db:init": "tsx src/scripts/init-database.ts",
    "db:migrate": "tsx src/database/migrations/migrate.ts",
    "db:seed": "tsx src/scripts/seed-dev-data.ts",
    "db:sync": "tsx src/scripts/sync-to-turso.ts",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts"
  }
}
```

---

## Dependencies

### **Core Dependencies**
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "better-sqlite3": "^9.2.0",
    "@libsql/client": "^0.4.0",
    "zod": "^3.22.0",
    "dotenv": "^16.3.0",
    "resend": "^2.0.0",
    "stripe": "^14.0.0",
    "argon2": "^0.31.0",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "tsx": "^4.7.0",
    "@types/express": "^4.17.0",
    "@types/better-sqlite3": "^7.6.0",
    "vitest": "^1.0.0",
    "supertest": "^6.3.0",
    "playwright": "^1.40.0",
    "eslint": "^8.56.0",
    "prettier": "^3.1.0"
  }
}
```

---

## Next Steps

1. **Create `backend/` directory structure** (following this architecture)
2. **Initialize Node.js project** (`npm init`, install dependencies)
3. **Set up TypeScript** (`tsconfig.json`)
4. **Implement database layer** (connection, repositories)
5. **Implement service layer** (business logic)
6. **Implement API layer** (Express routes, controllers)
7. **Write tests** (unit, integration)
8. **Deploy to Cloudflare Workers** (production)

---

**Document Status:** ✅ Ready for Implementation
**Review Frequency:** Monthly (as architecture evolves)
**Owner:** Jeremy Longshore (jeremy@intentsolutions.io)
