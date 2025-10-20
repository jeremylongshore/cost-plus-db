# Customer Data Management System Architecture

**Document Type:** DR-ARCH (Daily Routine - Architecture Decision)
**Created:** 2025-10-20
**Owner:** Intent Solutions (CostPlusDB)
**Purpose:** Architecture for customer metadata, form processing, and data management

---

## Overview

**What this document covers:** The complete architecture for managing customer data, from initial consultation form submission through active customer lifecycle, including SQLite database design, Turso cloud sync, and security considerations.

**Core Technologies:**
- **Local Storage:** File-based customer directories + SQLite database
- **Cloud Sync:** Turso (SQLite-as-a-Service with edge replication)
- **Form Processing:** Netlify Forms → Email → Manual entry (Phase 1), Automated (Phase 2)
- **Backup:** Encrypted daily backups to Wasabi S3

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOMER DATA MANAGEMENT                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐                                              │
│  │  Customer    │                                              │
│  │  (Browser)   │                                              │
│  └──────┬───────┘                                              │
│         │                                                       │
│         │ 1. Submit consultation form                          │
│         ▼                                                       │
│  ┌──────────────────────┐                                      │
│  │   Netlify Forms      │                                      │
│  │  (costplusdb.dev)    │                                      │
│  └──────┬───────────────┘                                      │
│         │                                                       │
│         │ 2. Email notification                                │
│         ▼                                                       │
│  ┌──────────────────────┐                                      │
│  │  Jeremy's Email      │                                      │
│  │ jeremy@intentsol...  │                                      │
│  └──────┬───────────────┘                                      │
│         │                                                       │
│         │ 3. Manual review & response                          │
│         ▼                                                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │          LOCAL FILE SYSTEM (VPS)                         │ │
│  │                                                          │ │
│  │  001-security/customers/                                │ │
│  │  ├── prospects/                                         │ │
│  │  │   └── {email}/                                       │ │
│  │  │       ├── initial-inquiry.md                         │ │
│  │  │       ├── onboarding-form.md                         │ │
│  │  │       └── notes.md                                   │ │
│  │  ├── active/                                            │ │
│  │  │   └── {customer-id}/                                 │ │
│  │  │       ├── customer-info.json                         │ │
│  │  │       ├── database-credentials.txt                   │ │
│  │  │       ├── onboarding-form.md                         │ │
│  │  │       ├── setup-confirmation.md                      │ │
│  │  │       ├── invoices/                                  │ │
│  │  │       ├── support-tickets/                           │ │
│  │  │       └── backup-logs/                               │ │
│  │  └── inactive/                                          │ │
│  │      └── {customer-id}/ (archived)                      │ │
│  │                                                          │ │
│  └──────────────┬───────────────────────────────────────────┘ │
│                 │                                             │
│                 │ 4. Sync metadata to SQLite                  │
│                 ▼                                             │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │          LOCAL SQLite DATABASE                           │ │
│  │                                                          │ │
│  │  001-security/databases/customers.db                    │ │
│  │                                                          │ │
│  │  Tables:                                                 │ │
│  │  - customers                                             │ │
│  │  - databases                                             │ │
│  │  - invoices                                              │ │
│  │  - support_tickets                                       │ │
│  │  - events_log                                            │ │
│  │                                                          │ │
│  └──────────────┬───────────────────────────────────────────┘ │
│                 │                                             │
│                 │ 5. Bidirectional sync                       │
│                 ▼                                             │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │          TURSO CLOUD (Edge SQLite)                       │ │
│  │                                                          │ │
│  │  - Global read replicas                                  │ │
│  │  - Primary write location: US-East                       │ │
│  │  - Automatic sync from local SQLite                      │ │
│  │  - Accessible via HTTPS API                              │ │
│  │  - Future: Mobile dashboard, analytics                   │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │          BACKUP & ENCRYPTION                             │ │
│  │                                                          │ │
│  │  Daily encrypted backup to Wasabi S3                     │ │
│  │  - 001-security/customers/ → encrypted → S3              │ │
│  │  - customers.db → encrypted → S3                         │ │
│  │  - 30-day retention                                      │ │
│  │  - AES-256-CBC encryption                                │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: File-Based System (Current)

**Timeline:** Launch → Month 3
**Status:** Implemented

### Storage Strategy

**Primary Storage:** File-based directories

```
001-security/customers/
├── prospects/          # Leads who haven't signed up yet
├── active/             # Paying customers
├── inactive/           # Churned or paused
└── templates/          # Email and form templates
```

**Metadata Format:** `customer-info.json` (per customer)

**Pros:**
- Simple to implement (no database setup)
- Easy to inspect (cat/grep/ls commands)
- Git-friendly (with .gitignore)
- Human-readable
- No schema migrations needed

**Cons:**
- No relational queries
- Manual aggregation (count customers, revenue, etc.)
- No full-text search across all customers
- Difficult to generate reports

**Use Cases:**
- 1-50 customers
- Solo founder manually managing
- Infrequent queries

---

## Phase 2: SQLite Database (Month 3-12)

**Timeline:** Month 3 → Month 12
**Status:** Planned

### Why SQLite?

**Advantages:**
- Single file database (no server needed)
- ACID compliant (reliable transactions)
- Fast queries (indexes, JOIN operations)
- Full-text search (FTS5 extension)
- JSON support (JSON1 extension)
- Zero configuration
- Embeddable in scripts
- Perfect for < 10,000 customers

**Limitations:**
- Single-writer (fine for solo founder)
- Not horizontally scalable (not needed at this stage)
- No built-in replication (solved with Turso)

### Database Schema

**File Location:** `/home/admincostplus/projects/costplusdb/001-security/databases/customers.db`

**Permissions:** `0600` (owner read/write only)

#### Table: `customers`

```sql
CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT UNIQUE NOT NULL,           -- acme-corp-20251020
    status TEXT NOT NULL DEFAULT 'prospect',    -- prospect, active, suspended, paused, deleted

    -- Company info
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    website TEXT,
    timezone TEXT DEFAULT 'America/Chicago',

    -- Plan details
    plan_tier TEXT NOT NULL,                    -- Shared, Dedicated, Pro, Enterprise
    price_monthly DECIMAL(10,2) NOT NULL,
    features TEXT,                              -- JSON array of features

    -- Billing
    billing_cycle TEXT DEFAULT 'monthly',       -- monthly, annual
    payment_method TEXT,                        -- Stripe, ACH, Wire, Invoice
    billing_start_date DATE,
    next_invoice_date DATE,

    -- Communication preferences
    preferred_channel TEXT DEFAULT 'email',     -- email, slack
    slack_webhook_url TEXT,
    alert_preferences TEXT,                     -- JSON: {downtime: true, backups: true}

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    provisioned_at DATETIME,
    credentials_sent_at DATETIME,
    deleted_at DATETIME,
    tags TEXT,                                  -- JSON array: ["startup", "saas"]

    -- File references
    directory_path TEXT,                        -- /path/to/001-security/customers/active/{id}
    onboarding_form_path TEXT,
    credentials_file_path TEXT,

    -- Notes
    internal_notes TEXT,
    cancellation_reason TEXT,
    customer_feedback TEXT
);

-- Indexes for common queries
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_email ON customers(contact_email);
CREATE INDEX idx_customers_tier ON customers(plan_tier);
CREATE INDEX idx_customers_next_invoice ON customers(next_invoice_date);

-- Full-text search on company names and emails
CREATE VIRTUAL TABLE customers_fts USING fts5(
    customer_id,
    company_name,
    contact_name,
    contact_email,
    content=customers
);
```

#### Table: `databases`

```sql
CREATE TABLE databases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,                  -- FK to customers.customer_id

    -- Database details
    db_name TEXT UNIQUE NOT NULL,
    db_user TEXT UNIQUE NOT NULL,
    db_password_hash TEXT NOT NULL,             -- Hashed, not plaintext
    connection_string_encrypted TEXT,           -- Encrypted connection string

    -- Connection settings
    ssl_required BOOLEAN DEFAULT 1,
    max_connections INTEGER DEFAULT 25,

    -- Hosting details
    vps_hostname TEXT,                          -- Which VPS hosts this database
    vps_ip TEXT,
    postgresql_version TEXT DEFAULT '16',

    -- Size tracking
    initial_size_mb DECIMAL(10,2),
    current_size_mb DECIMAL(10,2),
    last_size_check DATETIME,

    -- Backup configuration
    backup_frequency TEXT DEFAULT 'daily',      -- daily, twice-daily, hourly
    backup_retention_days INTEGER DEFAULT 30,
    pitr_days INTEGER DEFAULT 7,
    last_backup_at DATETIME,
    last_backup_status TEXT,                    -- success, failed

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,

    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE INDEX idx_databases_customer ON databases(customer_id);
CREATE INDEX idx_databases_vps ON databases(vps_hostname);
CREATE INDEX idx_databases_last_backup ON databases(last_backup_at);
```

#### Table: `invoices`

```sql
CREATE TABLE invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT NOT NULL,                  -- FK to customers.customer_id

    invoice_number TEXT UNIQUE NOT NULL,        -- INV-20251020-001
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,

    -- Amounts
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,

    -- Payment
    status TEXT DEFAULT 'unpaid',               -- unpaid, paid, overdue, forgiven
    paid_at DATETIME,
    payment_method TEXT,
    payment_reference TEXT,                     -- Stripe charge ID, etc.

    -- Line items (JSON)
    line_items TEXT,                            -- JSON array of {description, amount}

    -- Files
    invoice_file_path TEXT,                     -- /path/to/invoices/INV-xxx.pdf

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
```

#### Table: `support_tickets`

```sql
CREATE TABLE support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_number TEXT UNIQUE NOT NULL,         -- TKT-20251020-001
    customer_id TEXT NOT NULL,                  -- FK to customers.customer_id

    subject TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'P2',                 -- P0, P1, P2 (Critical, Urgent, Normal)
    status TEXT DEFAULT 'open',                 -- open, in_progress, waiting, resolved, closed

    -- Assignment
    assigned_to TEXT DEFAULT 'jeremy@intentsolutions.io',

    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    first_response_at DATETIME,
    resolved_at DATETIME,
    closed_at DATETIME,

    -- SLA tracking
    response_sla_minutes INTEGER DEFAULT 240,   -- 4 hours default
    resolution_sla_minutes INTEGER,
    sla_breached BOOLEAN DEFAULT 0,

    -- Files
    ticket_file_path TEXT,                      -- /path/to/support-tickets/TKT-xxx.md

    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE INDEX idx_tickets_customer ON support_tickets(customer_id);
CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_tickets_priority ON support_tickets(priority);
```

#### Table: `events_log`

```sql
CREATE TABLE events_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    customer_id TEXT,                           -- FK (optional)

    event_type TEXT NOT NULL,                   -- signup, provision, payment, ticket, etc.
    event_category TEXT NOT NULL,               -- customer, billing, support, system
    event_severity TEXT DEFAULT 'info',         -- info, warning, error, critical

    description TEXT NOT NULL,
    details TEXT,                               -- JSON with additional context

    -- Who/what triggered the event
    triggered_by TEXT,                          -- jeremy@intentsolutions.io, system, customer

    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE INDEX idx_events_timestamp ON events_log(event_timestamp);
CREATE INDEX idx_events_customer ON events_log(customer_id);
CREATE INDEX idx_events_type ON events_log(event_type);
CREATE INDEX idx_events_severity ON events_log(event_severity);
```

### Example Queries

**Count active customers:**

```sql
SELECT COUNT(*) FROM customers WHERE status = 'active';
```

**Total monthly recurring revenue (MRR):**

```sql
SELECT SUM(price_monthly) FROM customers WHERE status = 'active';
```

**Customers with upcoming invoices (next 7 days):**

```sql
SELECT customer_id, company_name, next_invoice_date, price_monthly
FROM customers
WHERE status = 'active'
AND next_invoice_date BETWEEN DATE('now') AND DATE('now', '+7 days')
ORDER BY next_invoice_date;
```

**Customers who haven't connected yet (24 hours after provisioning):**

```sql
SELECT c.customer_id, c.company_name, c.contact_email, c.provisioned_at
FROM customers c
LEFT JOIN databases d ON c.customer_id = d.customer_id
WHERE c.status = 'active'
AND c.provisioned_at < DATETIME('now', '-24 hours')
AND NOT EXISTS (
    SELECT 1 FROM events_log e
    WHERE e.customer_id = c.customer_id
    AND e.event_type = 'first_connection'
);
```

**Overdue invoices:**

```sql
SELECT i.invoice_number, c.company_name, c.contact_email, i.total, i.due_date
FROM invoices i
JOIN customers c ON i.customer_id = c.customer_id
WHERE i.status = 'unpaid'
AND i.due_date < DATE('now')
ORDER BY i.due_date;
```

**Support ticket SLA breaches:**

```sql
SELECT ticket_number, c.company_name, subject, priority, created_at
FROM support_tickets st
JOIN customers c ON st.customer_id = c.customer_id
WHERE st.sla_breached = 1
AND st.status != 'closed'
ORDER BY created_at;
```

---

## Phase 3: Turso Cloud Sync (Month 6+)

**Timeline:** Month 6 → Ongoing
**Status:** Future

### What is Turso?

**Turso** = SQLite-as-a-Service with edge replication

**Key Features:**
- Built on libSQL (SQLite fork)
- Automatic global replication
- Edge reads (low latency worldwide)
- Centralized writes
- HTTPS API access
- Compatible with standard SQLite

### Why Add Turso?

**Benefits:**
1. **Remote Access:** Query customer data from anywhere (not just VPS SSH)
2. **Mobile Dashboard:** Build iOS/Android app to view customer stats
3. **Analytics:** Connect to BI tools (Metabase, Grafana)
4. **Redundancy:** Customer metadata backed up to cloud automatically
5. **Collaboration:** Future team members can access customer data
6. **API Integration:** Future customer self-service portal

**Architecture:**

```
Local SQLite (VPS)
       ↓
   [Turso CLI Sync]
       ↓
Turso Cloud (Primary DB)
       ↓
   [Automatic Replication]
       ↓
Edge Locations (Read Replicas)
```

### Turso Setup

**See:** `037-DR-GUID-turso-cloud-setup-configuration.md` for detailed setup

**High-Level Steps:**

1. Create Turso account
2. Create database: `costplusdb-customers`
3. Configure sync from local SQLite
4. Set up authentication tokens
5. Enable edge replication
6. Test read/write operations

**Sync Strategy:**

```bash
# One-way sync: Local SQLite → Turso (every 5 minutes)
*/5 * * * * /usr/local/bin/turso-sync.sh

# Sync script checks for changes and pushes to Turso
# Turso automatically replicates to edge locations
```

**Security:**

- Turso connection requires auth token (stored in 001-security/keys/)
- TLS encryption for all API calls
- Read-only tokens for analytics/dashboards
- Write tokens only on VPS

---

## Form Processing Pipeline

### Current Workflow (Phase 1)

```
Customer submits form (Netlify)
       ↓
Netlify sends email notification
       ↓
Jeremy reads email
       ↓
Jeremy manually creates customer directory
       ↓
Jeremy manually provisions database (SOP-103)
       ↓
Jeremy manually sends credentials
```

**Pros:** Simple, no code needed
**Cons:** Manual, time-consuming, not scalable

### Future Workflow (Phase 2 - Month 3+)

```
Customer submits form (Netlify)
       ↓
Netlify webhook triggers automation script
       ↓
Script creates customer directory
       ↓
Script creates prospect record in SQLite
       ↓
Script sends onboarding form email
       ↓
Customer completes onboarding form (Netlify)
       ↓
Webhook triggers provisioning script
       ↓
Script provisions database (automated SOP-103)
       ↓
Script sends credentials email
       ↓
Script logs event in SQLite
```

**Automation Script:** `/home/admincostplus/projects/costplusdb/scripts/onboarding/auto-provision.sh`

---

## Security & Encryption

### Sensitive Data Classification

**Critical (Must Encrypt):**
- Database passwords (`db_password` in customer-info.json)
- Connection strings (contain passwords)
- Payment method details
- Customer PII (email, phone, address)

**Internal Use (Protect but Not Encrypt):**
- Customer IDs
- Database names
- Plan tiers
- Invoices (already encrypted in backups)

### Encryption Strategy

**At Rest:**
- `database-credentials.txt` → 0600 permissions, backed up encrypted
- `customer-info.json` → 0600 permissions, backed up encrypted
- `customers.db` → 0600 permissions, backed up encrypted
- Backups → AES-256-CBC encryption before uploading to Wasabi S3

**In Transit:**
- Turso API → HTTPS (TLS 1.3)
- Wasabi S3 → HTTPS
- Email credentials → TLS (email encryption)

**Password Storage in SQLite:**

```sql
-- DO NOT store plaintext passwords in SQLite
-- Store hashed passwords only (for verification)
CREATE TABLE databases (
    db_password_hash TEXT NOT NULL  -- bcrypt hash, not plaintext
);

-- Actual passwords stored in 001-security/customers/{id}/database-credentials.txt
-- SQLite only stores hash for validation
```

**Encryption Key Management:**

```
001-security/keys/
├── backup-encryption/
│   └── master.key              # AES-256 key for backup encryption
├── turso/
│   ├── auth-token.txt          # Turso write token
│   └── readonly-token.txt      # Turso read-only token
└── database/
    └── encryption.key          # SQLite encryption key (if using SQLCipher)
```

**All keys:** 0600 permissions, never committed to git

---

## Backup & Disaster Recovery

### Daily Backup Schedule

**2:05 AM CT Daily:**

```bash
# Backup script: 001-security/scripts/backup-security-configs.sh

# 1. Backup customer directories
tar -czf customers-$(date +%Y%m%d).tar.gz 001-security/customers/

# 2. Backup SQLite database
cp 001-security/databases/customers.db customers-db-$(date +%Y%m%d).db

# 3. Encrypt backup
openssl enc -aes-256-cbc -salt -in customers-$(date +%Y%m%d).tar.gz \
    -out customers-$(date +%Y%m%d).tar.gz.enc \
    -pass file:001-security/keys/backup-encryption/master.key

# 4. Upload to Wasabi S3
aws s3 cp customers-$(date +%Y%m%d).tar.gz.enc \
    s3://costplusdb-security/backups/customers/ \
    --endpoint-url=https://s3.us-east-1.wasabisys.com

# 5. Clean up local files
rm customers-$(date +%Y%m%d).tar.gz customers-$(date +%Y%m%d).tar.gz.enc

# 6. Delete backups older than 30 days
```

### Recovery Procedures

**Scenario 1: Restore Single Customer**

```bash
# Download backup
aws s3 cp s3://costplusdb-security/backups/customers/customers-20251020.tar.gz.enc . \
    --endpoint-url=https://s3.us-east-1.wasabisys.com

# Decrypt
openssl enc -aes-256-cbc -d -in customers-20251020.tar.gz.enc \
    -out customers-20251020.tar.gz \
    -pass file:001-security/keys/backup-encryption/master.key

# Extract specific customer
tar -xzf customers-20251020.tar.gz \
    001-security/customers/active/acme-corp-20251020/

# Restore to correct location
cp -r 001-security/customers/active/acme-corp-20251020 \
    /home/admincostplus/projects/costplusdb/001-security/customers/active/
```

**Scenario 2: Restore Entire Customers Database**

```bash
# Download latest backup
# Decrypt
# Extract all customers
tar -xzf customers-20251020.tar.gz -C /

# Restore SQLite database
aws s3 cp s3://costplusdb-security/backups/customers/customers-db-20251020.db . \
    --endpoint-url=https://s3.us-east-1.wasabisys.com

cp customers-db-20251020.db \
    /home/admincostplus/projects/costplusdb/001-security/databases/customers.db
```

**Scenario 3: Complete VPS Loss**

```bash
# On new VPS:
# 1. Restore from Wasabi S3 (all backups)
# 2. Restore customer directories
# 3. Restore SQLite database
# 4. Re-provision PostgreSQL databases (use customer-info.json for credentials)
# 5. Sync to Turso cloud (if configured)
```

---

## Scaling Considerations

### Phase 1: 1-50 Customers (File-Based)

**Current System:** File directories + JSON files
**Query Method:** grep, find, shell scripts
**Sufficient Until:** 50 customers or 6 months

### Phase 2: 50-500 Customers (SQLite)

**System:** File directories + SQLite database
**Query Method:** SQL queries via sqlite3 CLI or scripts
**Sufficient Until:** 500 customers or 12 months

### Phase 3: 500-5,000 Customers (SQLite + Turso)

**System:** SQLite + Turso cloud sync
**Query Method:** SQL via Turso API, web dashboards, BI tools
**Sufficient Until:** 5,000 customers or 24 months

### Phase 4: 5,000+ Customers (PostgreSQL?)

**Consider Migration To:** PostgreSQL or MySQL for customer metadata
**Reasons:**
- SQLite single-writer limitation
- Team collaboration (multiple admins)
- Advanced analytics and reporting
- Integration with billing/CRM systems

**Still Viable:** Many companies use SQLite for millions of rows. Turso enables horizontal scaling.

---

## Data Retention Policies

### Active Customers

**Retention:** Indefinite (as long as customer is active)

**Includes:**
- All customer information
- Database credentials
- Invoices
- Support tickets
- Backup logs

### Inactive Customers (Canceled)

**Retention:** 1 year after cancellation

**Includes:**
- customer-info.json (status: deleted)
- Final invoice
- Cancellation record
- Final database backup (encrypted)

**After 1 Year:**
- Move to deep archive (Wasabi Glacier)
- Or permanently delete (confirm no legal/tax requirements)

### Prospects (Never Converted)

**Retention:** 90 days after last contact

**Includes:**
- Initial inquiry
- Onboarding form (if submitted)
- Email correspondence

**After 90 Days:**
- Permanently delete (no legal requirement to keep)

---

## Related Documentation

- **020-DR-ARCH-customer-database-structure.md** - File directory structure
- **033-DR-GUID-customer-onboarding-complete-workflow.md** - Onboarding process
- **034-DR-SOPS-customer-database-provisioning.md** - Database provisioning
- **037-DR-GUID-turso-cloud-setup-configuration.md** - Turso cloud sync setup
- **005-DR-SOPS-postgresql-operations.md** - PostgreSQL SOPs

---

## Future Enhancements

**Month 3:**
- Implement SQLite database
- Migrate existing customers to SQLite
- Create reporting dashboard (CLI-based)

**Month 6:**
- Set up Turso cloud sync
- Build simple web dashboard (read-only customer stats)
- Automate invoice generation

**Month 12:**
- Customer self-service portal (view invoices, request support)
- Automated provisioning (webhook → database → credentials)
- Advanced analytics (churn prediction, LTV, etc.)

**Month 24:**
- Mobile app for customer management
- CRM integration (HubSpot, Salesforce)
- Automated billing via Stripe

---

**Document Owner:** Jeremy Longshore (jeremy@intentsolutions.io)
**Last Updated:** 2025-10-20
**Review Frequency:** Quarterly
