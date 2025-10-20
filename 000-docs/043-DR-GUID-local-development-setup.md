# Local Development Setup Guide

**Document Type:** DR-GUID (Daily Routine - Guide)
**Created:** 2025-10-20
**Owner:** Intent Solutions (CostPlusDB)
**Purpose:** Complete guide to setting up CostPlusDB backend for local development

---

## Overview

This guide walks you through setting up the CostPlusDB backend application on your local machine for development. After completing this guide, you'll have a fully functional local environment ready for development and testing.

**What You'll Set Up:**
- Node.js 18+ and npm
- Backend TypeScript application
- Local SQLite database
- Environment configuration
- Development server with hot-reload

**Time Required:** 20-30 minutes
**Skill Level:** Intermediate (basic command line knowledge required)

---

## Prerequisites

### Required Software

**1. Node.js 18 or higher**

Check if installed:
```bash
node --version
# Should output v18.x.x or higher
```

Install if needed:
- **macOS:** `brew install node` or download from https://nodejs.org
- **Linux (Ubuntu/Debian):**
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```
- **Windows:** Download installer from https://nodejs.org

**2. npm (comes with Node.js)**

Check if installed:
```bash
npm --version
# Should output 9.x.x or higher
```

**3. Git**

Check if installed:
```bash
git --version
```

Install if needed:
- **macOS:** `brew install git`
- **Linux:** `sudo apt-get install git`
- **Windows:** Download from https://git-scm.com

**4. Text Editor or IDE**

Recommended:
- **VS Code** (recommended) - https://code.visualstudio.com
- WebStorm
- Sublime Text
- Vim/Neovim

---

## Step 1: Clone the Repository

```bash
# Navigate to your projects directory
cd ~/projects

# Clone the repository
git clone https://github.com/jeremylongshore/cost-plus-db.git

# Navigate into the project
cd cost-plus-db

# Verify you're in the correct directory
ls -la
# Should see: 000-docs/, backend/, website/, scripts/, etc.
```

**Alternative: Using SSH**

```bash
git clone git@github.com:jeremylongshore/cost-plus-db.git
```

---

## Step 2: Navigate to Backend Directory

```bash
cd backend

# Verify directory contents
ls -la
# Should see: src/, package.json, tsconfig.json, .env.example
```

---

## Step 3: Install Dependencies

```bash
# Install all npm packages
npm install

# This will install:
# - TypeScript
# - Express
# - SQLite (better-sqlite3)
# - Zod (validation)
# - Winston (logging)
# - Vitest (testing)
# - And all other dependencies
```

**Expected Output:**
```
added 250 packages, and audited 251 packages in 15s

50 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

**If you see vulnerabilities:**
```bash
# Review vulnerabilities
npm audit

# Auto-fix if possible
npm audit fix
```

---

## Step 4: Set Up Environment Variables

### Create .env File

```bash
# Copy example environment file
cp .env.example .env

# Open in your editor
# VS Code:
code .env

# Or use any text editor:
nano .env
# vim .env
# subl .env
```

### Configure Environment Variables

**Minimal Configuration (for local development):**

```bash
# Database Configuration
DATABASE_URL="file:../002-clients/database/costplusdb.db"

# Email Configuration (Resend) - Get free API key from resend.com
RESEND_API_KEY="re_123456789" # Replace with your key
RESEND_FROM_EMAIL="dev@localhost.test"
RESEND_ADMIN_EMAIL="admin@localhost.test"

# Stripe Configuration - Use test mode keys from dashboard.stripe.com
STRIPE_SECRET_KEY="sk_test_123456789" # Replace with your test key
STRIPE_WEBHOOK_SECRET="whsec_123456789" # Replace after setting up webhooks
STRIPE_PUBLISHABLE_KEY="pk_test_123456789" # Replace with your test key

# API Configuration
NODE_ENV="development"
PORT="3000"
API_BASE_URL="http://localhost:3000"

# Security - Generate secure random strings
JWT_SECRET="your-jwt-secret-change-me-use-openssl-rand-base64-32"
ENCRYPTION_KEY="your-encryption-key-change-me-32-chars"

# CORS Configuration
CORS_ORIGIN="http://localhost:8000"

# Rate Limiting
RATE_LIMIT_WINDOW_MS="900000"
RATE_LIMIT_MAX_REQUESTS="100"

# Logging
LOG_LEVEL="debug"
LOG_FILE_PATH="./logs/app.log"

# Feature Flags
ENABLE_TURSO_SYNC="false"
ENABLE_EMAIL_NOTIFICATIONS="false"
ENABLE_STRIPE_WEBHOOKS="false"
```

### Generate Secure Secrets

**Generate JWT_SECRET:**

```bash
openssl rand -base64 32
# Copy output and paste into .env as JWT_SECRET
```

**Generate ENCRYPTION_KEY:**

```bash
openssl rand -base64 32 | cut -c1-32
# Copy output and paste into .env as ENCRYPTION_KEY
```

**Your .env should now look like:**

```bash
JWT_SECRET="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0"
ENCRYPTION_KEY="x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6"
```

---

## Step 5: Create Database Directory Structure

```bash
# From backend/ directory, create database directory
mkdir -p ../002-clients/database

# Verify structure
ls -la ../002-clients/
# Should show: database/
```

**Expected Directory Structure:**

```
cost-plus-db/
├── 000-docs/
├── 001-security/
├── 002-clients/
│   └── database/           # ← SQLite database will live here
├── backend/
│   ├── src/
│   ├── .env               # ← Your environment config
│   └── package.json
└── website/
```

---

## Step 6: Initialize Database

```bash
# Run database initialization script
npm run db:init
```

**Expected Output:**

```
Creating database at: ../002-clients/database/costplusdb.db
Database created successfully
Running migrations...
Migration 001: Create customers table - SUCCESS
Migration 002: Create customer_databases table - SUCCESS
Migration 003: Create billing_records table - SUCCESS
Migration 004: Create support_tickets table - SUCCESS
Migration 005: Create activity_logs table - SUCCESS
Database initialized successfully!
```

**Verify Database Creation:**

```bash
# Check database file exists
ls -la ../002-clients/database/
# Should show: costplusdb.db

# Check database size
du -h ../002-clients/database/costplusdb.db
# Should show: 20K or similar
```

---

## Step 7: Run Database Migrations

Migrations should have run automatically during `db:init`, but you can run them manually:

```bash
npm run db:migrate
```

**Expected Output:**

```
Checking for pending migrations...
All migrations up to date!
Current schema version: 5
```

---

## Step 8: Seed Development Data (Optional)

Populate the database with test data for development:

```bash
npm run db:seed
```

**Expected Output:**

```
Seeding development data...
Creating test customers...
  - Created: Acme Corporation (acme@example.com) - Shared tier
  - Created: TechStart Inc (tech@example.com) - Dedicated tier
  - Created: Enterprise Corp (enterprise@example.com) - Enterprise tier
Seeding complete!
Total customers: 3
```

**Verify Seeded Data:**

```bash
# Use SQLite CLI (if installed)
sqlite3 ../002-clients/database/costplusdb.db "SELECT * FROM customers;"

# Or run a query via npm script (if available)
npm run db:query "SELECT company_name, email, tier, status FROM customers;"
```

---

## Step 9: Start Development Server

```bash
npm run dev
```

**Expected Output:**

```
[2025-10-20 14:30:00] INFO: Starting CostPlusDB backend server...
[2025-10-20 14:30:00] INFO: Environment: development
[2025-10-20 14:30:00] INFO: Database connected: file:../002-clients/database/costplusdb.db
[2025-10-20 14:30:00] INFO: API routes registered
[2025-10-20 14:30:01] INFO: Server listening on http://localhost:3000
```

**The development server is now running!**

---

## Step 10: Verify Installation

### Test 1: Health Check Endpoint

Open a new terminal (keep dev server running) and test:

```bash
curl http://localhost:3000/health
```

**Expected Response:**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-10-20T14:30:00.000Z"
}
```

### Test 2: List Customers (if seeded)

```bash
curl http://localhost:3000/api/customers
```

**Expected Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "company_name": "Acme Corporation",
      "email": "acme@example.com",
      "tier": "shared",
      "status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 3,
    "totalPages": 1
  }
}
```

### Test 3: Submit Intake Form

```bash
curl -X POST http://localhost:3000/api/intake \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Company",
    "email": "test@example.com",
    "tier": "shared"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "customer_id": 4,
    "status": "prospect",
    "next_step": "consultation",
    "message": "Thank you! We will contact you within 2 hours to schedule a consultation."
  }
}
```

---

## Development Workflow

### Running the Development Server

```bash
# Start with hot-reload (automatically restarts on file changes)
npm run dev

# The server will restart automatically when you edit files in src/
```

### Making Changes

1. Edit files in `backend/src/`
2. Server automatically restarts (watch mode with `tsx watch`)
3. Test your changes with `curl` or browser
4. Repeat!

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

### Type Checking

```bash
# Check TypeScript types without building
npm run type-check
```

### Linting and Formatting

```bash
# Run ESLint
npm run lint

# Auto-fix linting issues
npm run lint -- --fix

# Format code with Prettier
npm run format
```

### Building for Production

```bash
# Compile TypeScript to JavaScript
npm run build

# Output will be in dist/ directory
ls -la dist/
```

---

## Directory Structure Explained

```
backend/
├── src/
│   ├── api/
│   │   ├── middleware/        # Express middleware (error handling, logging)
│   │   ├── routes/            # API route definitions
│   │   └── app.ts             # Express app configuration
│   ├── config/
│   │   └── index.ts           # Environment variable validation
│   ├── database/
│   │   ├── migrations/        # Database schema migrations
│   │   ├── repositories/      # Data access layer
│   │   ├── index.ts           # Database connection
│   │   └── schema.ts          # TypeScript types for DB schema
│   ├── scripts/
│   │   ├── init-database.ts   # Database initialization
│   │   ├── seed-dev-data.ts   # Seed test data
│   │   └── sync-to-turso.ts   # Sync to Turso Cloud (optional)
│   ├── services/
│   │   └── customer.service.ts # Business logic layer
│   ├── types/
│   │   └── index.ts           # Shared TypeScript types
│   ├── utils/
│   │   ├── errors.ts          # Custom error classes
│   │   └── logger.ts          # Winston logger configuration
│   └── index.ts               # Application entry point
├── tests/
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   └── setup.ts               # Test configuration
├── .env                       # Environment variables (NOT in git)
├── .env.example               # Environment template (in git)
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── vitest.config.ts           # Test configuration
```

---

## Common npm Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Build TypeScript to JavaScript |
| `npm start` | Run production build (must build first) |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:init` | Initialize database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed development data |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | Check TypeScript types |

---

## Troubleshooting

### Issue: "Cannot find module 'typescript'"

**Solution:**

```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Port 3000 already in use"

**Solution:**

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change PORT in .env
PORT="3001"
```

### Issue: "Database file not found"

**Solution:**

```bash
# Ensure database directory exists
mkdir -p ../002-clients/database

# Re-run database initialization
npm run db:init
```

### Issue: "Environment variable validation failed"

**Solution:**

```bash
# Check .env file exists
ls -la .env

# Verify all required variables are set
cat .env

# Copy from example if needed
cp .env.example .env

# Generate missing secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32 | cut -c1-32  # For ENCRYPTION_KEY
```

### Issue: "Hot-reload not working"

**Solution:**

```bash
# Stop server (Ctrl+C)
# Restart dev server
npm run dev

# If still not working, check file watchers
# macOS: May need to increase file watcher limit
# Linux: sudo sysctl fs.inotify.max_user_watches=524288
```

### Issue: "TypeScript errors in VS Code"

**Solution:**

```bash
# Restart TypeScript server in VS Code
# Cmd+Shift+P (macOS) or Ctrl+Shift+P (Windows/Linux)
# Type: "TypeScript: Restart TS Server"

# Or reload VS Code window
# Cmd+Shift+P -> "Developer: Reload Window"
```

### Issue: "Tests failing"

**Solution:**

```bash
# Run tests with verbose output
npm test -- --reporter=verbose

# Check test database setup
# Tests should use separate test database or in-memory SQLite
```

---

## VS Code Setup (Recommended)

### Recommended Extensions

Install these extensions for the best development experience:

1. **ESLint** (`dbaeumer.vscode-eslint`)
   - Linting and auto-fix on save

2. **Prettier** (`esbenp.prettier-vscode`)
   - Code formatting

3. **TypeScript** (built-in)
   - TypeScript language support

4. **Thunder Client** (`rangav.vscode-thunder-client`)
   - API testing (alternative to Postman)

5. **SQLite Viewer** (`qwtel.sqlite-viewer`)
   - View SQLite databases in VS Code

6. **Error Lens** (`usernamehw.errorlens`)
   - Inline error messages

### VS Code Settings

Create `.vscode/settings.json` in project root:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true
  }
}
```

### VS Code Launch Configuration

Create `.vscode/launch.json` for debugging:

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
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

---

## Testing API Endpoints

### Using cURL (Command Line)

```bash
# Health check
curl http://localhost:3000/health

# List customers
curl http://localhost:3000/api/customers

# Create customer
curl -X POST http://localhost:3000/api/intake \
  -H "Content-Type: application/json" \
  -d '{"company_name":"Test","email":"test@example.com","tier":"shared"}'

# Get customer by ID
curl http://localhost:3000/api/customers/1

# Update customer
curl -X PATCH http://localhost:3000/api/customers/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"active"}'
```

### Using Thunder Client (VS Code Extension)

1. Install Thunder Client extension
2. Create new request
3. Set method (GET, POST, etc.)
4. Set URL (http://localhost:3000/api/...)
5. Add headers (Content-Type: application/json)
6. Add body (for POST/PATCH)
7. Click "Send"

### Using Postman

1. Download Postman: https://postman.com
2. Create new request
3. Import collection from `backend/docs/postman-collection.json` (if available)
4. Test endpoints

---

## Database Management

### View Database Contents

**Option 1: SQLite CLI**

```bash
# Install SQLite (if needed)
# macOS: brew install sqlite
# Linux: sudo apt-get install sqlite3

# Open database
sqlite3 ../002-clients/database/costplusdb.db

# List tables
.tables

# View schema
.schema customers

# Query data
SELECT * FROM customers;

# Exit
.quit
```

**Option 2: VS Code Extension**

1. Install "SQLite Viewer" extension
2. Right-click `costplusdb.db` in file explorer
3. Select "Open with SQLite Viewer"
4. Browse tables and data

**Option 3: GUI Tools**

- **DB Browser for SQLite** - https://sqlitebrowser.org
- **TablePlus** (macOS) - https://tableplus.com
- **DBeaver** - https://dbeaver.io

### Reset Database

```bash
# Delete database
rm ../002-clients/database/costplusdb.db

# Reinitialize
npm run db:init

# Re-seed (optional)
npm run db:seed
```

---

## Next Steps

**After completing local setup:**

1. **Explore the codebase:**
   - Read through `src/` directory
   - Understand the architecture
   - Review existing endpoints

2. **Run tests:**
   - `npm test`
   - Review test files in `tests/`
   - Understand testing patterns

3. **Make your first change:**
   - Add a new field to customer schema
   - Create a new API endpoint
   - Write tests for your changes

4. **Set up integrations:**
   - Configure Resend for emails (see 046-DR-GUID-resend-email-integration.md)
   - Configure Stripe for payments (see 047-DR-GUID-stripe-payment-integration.md)
   - Optional: Set up Turso Cloud (see 048-DR-GUID-turso-cloud-integration.md)

5. **Learn deployment:**
   - Production deployment (see 044-DR-GUID-production-deployment.md)
   - Cloudflare Workers (see 045-DR-GUID-cloudflare-workers-deployment.md)

---

## Related Documentation

- **backend/docs/API.md** - Complete API reference
- **044-DR-GUID-production-deployment.md** - Deploying to production
- **046-DR-GUID-resend-email-integration.md** - Email integration
- **047-DR-GUID-stripe-payment-integration.md** - Payment integration
- **048-DR-GUID-turso-cloud-integration.md** - Cloud database sync

---

## Getting Help

**Issues with setup?**

1. Check this guide's troubleshooting section
2. Review backend/README.md
3. Check GitHub Issues: https://github.com/jeremylongshore/cost-plus-db/issues
4. Contact: jeremy@intentsolutions.io

**Contributing:**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

---

**Document Owner:** Jeremy Longshore (jeremy@intentsolutions.io)
**Last Updated:** 2025-10-20
**Review Frequency:** Monthly
