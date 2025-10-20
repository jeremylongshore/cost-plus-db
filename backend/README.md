# CostPlusDB Backend

Production-ready backend for CostPlusDB - Transparent managed PostgreSQL database service.

## Architecture Overview

This backend follows a **strict layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────┐
│                   API Layer                         │
│  (Express routes, controllers, middleware)          │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│                 Service Layer                       │
│  (Business logic, workflows, orchestration)         │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│                Database Layer                       │
│  (Repositories, data access, migrations)            │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│              SQLite + Turso Cloud                   │
│  (Local SQLite with optional cloud sync)            │
└─────────────────────────────────────────────────────┘
```

### Key Principles

- **Layer Isolation**: Each layer only communicates with adjacent layers
- **Repository Pattern**: All database access goes through repositories
- **Service-Oriented**: Business logic lives in service layer
- **Type Safety**: Full TypeScript with strict mode enabled
- **Validation**: Zod schemas for all inputs
- **Error Handling**: Consistent error responses across all endpoints

## Directory Structure

```
backend/
├── src/
│   ├── api/                    # HTTP layer
│   │   ├── app.ts              # Express app setup
│   │   ├── middleware/         # Auth, validation, logging, errors
│   │   ├── routes/             # Route definitions
│   │   └── controllers/        # Request handlers
│   │
│   ├── services/               # Business logic
│   │   ├── customer.service.ts
│   │   ├── provisioning.service.ts
│   │   ├── billing.service.ts
│   │   └── email.service.ts
│   │
│   ├── database/               # Data access layer
│   │   ├── index.ts            # Connection manager
│   │   ├── schema.ts           # TypeScript types
│   │   ├── repositories/       # Data access objects
│   │   ├── migrations/         # SQL migrations
│   │   └── seeds/              # Test data
│   │
│   ├── config/                 # Configuration management
│   ├── validators/             # Zod validation schemas
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Utility functions
│   └── scripts/                # Operational scripts
│
├── tests/                      # Test suite
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   ├── e2e/                    # End-to-end tests
│   └── fixtures/               # Test data
│
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.3+ (strict mode)
- **Framework**: Express 4
- **Database**: SQLite (better-sqlite3) + Turso (cloud sync)
- **Validation**: Zod
- **Email**: Resend
- **Payments**: Stripe
- **Testing**: Vitest + Supertest + Playwright
- **Logging**: Winston

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or pnpm

### Installation

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your actual values
# IMPORTANT: Set all required environment variables!
nano .env
```

### Environment Variables

See `.env.example` for all required variables. Critical ones:

```bash
# Database
DATABASE_URL="file:../002-clients/database/costplusdb.db"

# Email (Resend)
RESEND_API_KEY="your-resend-api-key"
RESEND_FROM_EMAIL="costplusdb@intentsolutions.io"
RESEND_ADMIN_EMAIL="jeremy@intentsolutions.io"

# Stripe
STRIPE_SECRET_KEY="your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="your-webhook-secret"

# Security
JWT_SECRET="generate-with-openssl-rand-base64-32"
ENCRYPTION_KEY="generate-32-byte-key"
```

### Database Setup

```bash
# Initialize database from schema
npm run db:init

# Run migrations
npm run db:migrate

# Seed development data (optional)
npm run db:seed
```

### Development

```bash
# Start development server (with hot reload)
npm run dev

# Server will start on http://localhost:3000
# Health check: http://localhost:3000/health
```

### Production Build

```bash
# Build TypeScript to JavaScript
npm run build

# Start production server
npm start
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm test` | Run all tests |
| `npm run test:unit` | Run unit tests |
| `npm run test:integration` | Run integration tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run db:init` | Initialize database from schema |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:seed` | Seed development data |
| `npm run db:sync` | Sync to Turso cloud |
| `npm run lint` | Lint TypeScript files |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | Check TypeScript types |

## API Endpoints

### Health Check
- `GET /health` - System health status

### Customer Intake
- `POST /api/intake` - Submit customer intake form

### Webhooks
- `POST /api/webhooks/stripe` - Stripe payment webhooks

### Customers (Admin)
- `GET /api/customers` - List all customers
- `GET /api/customers/:id` - Get customer details
- `PATCH /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

## Database Management

### Migrations

Migrations are SQL files in `src/database/migrations/`:

```
001_initial_schema.sql
002_add_indexes.sql
003_add_billing_table.sql
```

**Create a new migration:**

1. Create file: `NNN_description.sql`
2. Write SQL with up migration
3. Run: `npm run db:migrate`

**Migration best practices:**
- Always use incremental version numbers
- Include descriptive names
- Test migrations on development database first
- Never modify applied migrations

### Turso Cloud Sync

Turso provides global edge replication for low-latency access worldwide.

**Setup:**
1. Create Turso database: `turso db create costplusdb`
2. Get auth token: `turso db tokens create costplusdb`
3. Set environment variables in `.env`
4. Enable sync: `ENABLE_TURSO_SYNC=true`

**Sync strategies:**
- **Development**: Local SQLite primary, manual sync to Turso
- **Production**: Turso primary, local SQLite for backup

## Testing

### Unit Tests

Test individual functions/classes in isolation:

```bash
npm run test:unit
```

Example: `tests/unit/services/customer.service.test.ts`

### Integration Tests

Test API endpoints + database together:

```bash
npm run test:integration
```

Example: `tests/integration/api/intake.integration.test.ts`

### End-to-End Tests

Test complete user workflows with Playwright:

```bash
npm run test:e2e
```

## Security

### Environment Secrets
- ✅ Never commit `.env` (gitignored)
- ✅ Use strong secrets (32+ characters)
- ✅ Rotate keys regularly

### API Security
- ✅ Rate limiting enabled (100 req/15min)
- ✅ Helmet.js security headers
- ✅ CORS restricted to allowed origins
- ✅ Input validation with Zod

### Database Security
- ✅ Parameterized queries (SQL injection prevention)
- ✅ Encrypted sensitive fields
- ✅ Activity logging (audit trail)

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "errors": [...]
  }
}
```

**Error types:**
- `400 VALIDATION_ERROR` - Invalid input
- `401 UNAUTHORIZED` - Authentication required
- `404 NOT_FOUND` - Resource not found
- `409 CONFLICT` - Duplicate resource
- `429 RATE_LIMIT_EXCEEDED` - Too many requests
- `500 INTERNAL_SERVER_ERROR` - Unexpected error

## Logging

Winston logger with structured logging:

```typescript
import { logger } from './utils/logger.js';

logger.info('Customer created', { customerId: 123 });
logger.error('Database error', { error: err.message });
logger.debug('Debug details', { data: payload });
```

**Log levels:**
- `error` - Errors requiring attention
- `warn` - Warning conditions
- `info` - Informational messages
- `debug` - Debug information

## Deployment

### Cloudflare Workers (Production)

TODO: Add deployment guide for Cloudflare Workers

### VPS Deployment

1. Clone repository
2. Install dependencies: `npm ci --production`
3. Set environment variables
4. Build: `npm run build`
5. Run with PM2: `pm2 start dist/index.js --name costplusdb-backend`

## Architecture Documentation

For detailed architecture decisions and patterns, see:

- `/000-docs/039-DR-ARCH-backend-organizational-structure.md`

## Support

- **Email**: jeremy@intentsolutions.io
- **GitHub**: https://github.com/jeremylongshore/cost-plus-db
- **Documentation**: See `/000-docs/` directory

## License

Proprietary - CostPlusDB © 2025
