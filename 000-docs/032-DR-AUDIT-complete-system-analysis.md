# CostPlusDB: Complete System Analysis & Operations Guide

**For:** DevOps/Operations Team (Future or Current)
**Generated:** 2025-10-19
**System Version:** v1.0 (Pre-Production)
**Status:** 🟡 Planning Complete, Infrastructure Pending

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Directory Deep-Dive](#directory-deep-dive)
4. [Operational Reference](#operational-reference)
5. [Security & Access](#security--access)
6. [Cost & Performance](#cost--performance)
7. [Development Workflow](#development-workflow)
8. [Dependencies & Supply Chain](#dependencies--supply-chain)
9. [Integration with Existing Documentation](#integration-with-existing-documentation)
10. [Current State Assessment](#current-state-assessment)
11. [Quick Reference](#quick-reference)
12. [Recommendations Roadmap](#recommendations-roadmap)
13. [Appendices](#appendices)

---

## Executive Summary

**What This System Does:**
CostPlusDB is a transparent, cost-plus managed PostgreSQL database hosting service. Unlike AWS RDS ($280/month for 8GB) or Google Cloud SQL ($275/month), CostPlusDB charges actual infrastructure costs plus a transparent margin—$89/month for equivalent specs. The business model is radical transparency: all SOPs, cost calculations, and operational procedures are public.

**Current State:**
⚠️ **PRE-PRODUCTION** - Documentation and planning phase complete. Website live at costplusdb.dev (Netlify). No production infrastructure deployed yet. Zero customers.

**Key Architectural Decision:**
Quality-focused, boutique service model. Limiting to 5 clients first month to ensure operational excellence. Positioning as professional consultation service, not commodity self-service hosting.

**Technology Foundation:**
- **Website:** Static HTML/CSS/JS (vanilla, no frameworks) deployed via Netlify
- **Infrastructure Plan:** Contabo VPS → Ubuntu 24.04 LTS → PostgreSQL 16
- **Backup System Plan:** pgBackRest + Wasabi S3 (AES-256-CBC encryption)
- **Monitoring Plan:** Custom bash scripts + Resend email alerts
- **Repository:** https://github.com/jeremylongshore/cost-plus-db.git (currently private, planning public release)

---

## System Architecture Overview

### Technology Stack

| Layer | Technology | Version | Purpose | Status |
|-------|------------|---------|---------|--------|
| **Frontend/UI** | Static HTML/CSS/JS | N/A | Public website, consultation requests | ✅ Live |
| **Backend/API** | Not implemented | N/A | Future: Customer provisioning automation | 🔴 Not started |
| **Database (Service)** | PostgreSQL | 16.x | Customer databases (what we sell) | 🔴 Not deployed |
| **Database (Internal)** | None | N/A | Future: Customer records, billing | 🔴 Not needed yet |
| **Hosting (Website)** | Netlify | N/A | Static site hosting, form handling | ✅ Live |
| **Hosting (Database VPS)** | Contabo VPS | Ubuntu 24.04 | PostgreSQL hosting infrastructure | 🔴 Not provisioned |
| **Backup Storage** | Wasabi S3 | N/A | Encrypted database backups | 🔴 Account not created |
| **Email Service** | Resend | API | Security alerts, customer notifications | ✅ Configured |
| **Monitoring** | Custom bash scripts | N/A | fail2ban, SSL, logins, backups | 🟡 Scripts ready, not deployed |
| **Version Control** | GitHub | N/A | Code repository | ✅ Active |

### Cloud Services in Use

| Service | Purpose | Environment | Key Config | Status |
|---------|---------|-------------|------------|--------|
| **Netlify** | Static website hosting | Production | `netlify.toml` | ✅ Live |
| **Resend** | Email alerts & notifications | Production | API key in `001-security/keys/` | ✅ Configured |
| **GitHub** | Source code management | N/A | Private repo (planning public) | ✅ Active |
| **Contabo VPS** | PostgreSQL hosting | Production (planned) | Not provisioned yet | 🔴 Not started |
| **Wasabi S3** | Backup storage | Production (planned) | Account not created | 🔴 Not started |

### Architecture Diagram (Planned State)

```
┌─────────────────────────────────────────────────────────────────┐
│                         PUBLIC INTERNET                          │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├─► costplusdb.dev (Website)
             │   └─► Netlify CDN
             │       ├─► Static HTML/CSS/JS
             │       ├─► Consultation request forms
             │       └─► Transparency documentation
             │
             └─► db-prod-01.costplusdb.dev (Customer Databases)
                 └─► Contabo VPS (Ubuntu 24.04)
                     ├─► PostgreSQL 16 (Port 5432)
                     │   ├─► SSL/TLS enforced
                     │   ├─► Customer DB 1 (isolated)
                     │   ├─► Customer DB 2 (isolated)
                     │   └─► Customer DB N (isolated)
                     │
                     ├─► pgBackRest (Backup System)
                     │   ├─► Local: /var/lib/pgbackrest/
                     │   └─► Cloud: Wasabi S3 (encrypted)
                     │
                     ├─► Security Layer
                     │   ├─► UFW firewall
                     │   ├─► fail2ban (intrusion prevention)
                     │   └─► SSH key auth only
                     │
                     └─► Monitoring Scripts (cron)
                         ├─► Failed login detection
                         ├─► Security event scanning
                         ├─► SSL expiry checks
                         ├─► Backup verification
                         └─► Resend email alerts
```

**Critical Data Flows:**

1. **Customer Connection:** `Customer App → SSL/TLS → PostgreSQL (Port 5432)`
2. **Backup Flow:** `PostgreSQL → pgBackRest → Local Disk + Wasabi S3`
3. **Alert Flow:** `Monitoring Script → Resend API → jeremy@intentsolutions.io`
4. **Onboarding Flow:** `Website Form → Netlify → Email → Manual Consultation → Stripe Payment → Provision DB`

---

## Directory Deep-Dive

### Project Structure (Current State)

```
/home/admincostplus/projects/costplusdb/
├── 000-docs/                    # 📁 All documentation (32 files, 100% coverage)
│   ├── 001-PP-PLAN-*.md         # Business plans, pricing structure
│   ├── 005-DR-SOPS-*.md         # Standard operating procedures
│   ├── 0XX-DR-AUDIT-*.md        # Pre-launch audit reports
│   ├── 0XX-DR-FORM-*.md         # Customer forms (intake, setup)
│   ├── 0XX-DR-GUID-*.md         # Operational guides
│   └── 031-PM-ANNO-*.md         # Launch announcements
│
├── 001-security/                # 🔐 Security infrastructure (ready, not deployed)
│   ├── alerts/                  # Email alert delivery system
│   │   └── scripts/             # send-alert-email.sh (Resend API)
│   ├── config/                  # Configuration files
│   │   ├── backup/              # pgBackRest config (template + real)
│   │   ├── fail2ban/            # Intrusion prevention config
│   │   ├── logrotate/           # Log rotation config
│   │   └── sudoers-setup.md     # Sudo NOPASSWD guide
│   ├── keys/                    # 🔴 Credentials (gitignored, empty)
│   │   ├── api-tokens/          # Resend API key (file exists)
│   │   ├── backup-encryption/   # Encryption passphrases (not created)
│   │   └── ssh-keys/            # SSH keys (not created)
│   ├── logs/                    # 📊 Log files (gitignored, empty)
│   ├── procedures/              # Operational procedures
│   │   ├── backup-to-both-repos.sh      # Backup execution script
│   │   └── verify-backup-integrity.sh   # Backup verification
│   ├── scripts/                 # Monitoring scripts (all executable)
│   │   ├── monitoring/          # 5 monitoring scripts (ready)
│   │   └── maintenance/         # 1 backup config script
│   └── tools/                   # Utility scripts
│       └── password-generator/  # Secure password generation
│
├── backend/                     # 🔴 Empty (future customer automation)
├── scripts/                     # 🔴 Empty (future operational scripts)
│
├── website/                     # 🌐 Static website (LIVE on Netlify)
│   ├── src/                     # CSS stylesheets
│   │   ├── reset.css            # CSS reset
│   │   ├── index.css            # Main styles
│   │   └── theme.css            # Color theme
│   ├── transparency/            # Public transparency docs
│   │   └── index.html           # Links to operational docs
│   ├── index.html               # Homepage
│   ├── calculator.html          # Get Started (consultation form)
│   ├── about.html               # About page
│   ├── security.html            # Security practices
│   ├── docs.html                # Documentation hub
│   ├── activity.html            # Changelog
│   ├── ai-policy.html           # AI usage policy
│   ├── privacy.html             # Privacy policy
│   ├── terms.html               # Terms of service
│   ├── acceptable-use.html      # Acceptable use policy
│   ├── thank-you.html           # Form submission confirmation
│   ├── favicon.svg              # Site favicon
│   └── netlify.toml             # Netlify deployment config
│
├── .gitignore                   # Git ignore rules (comprehensive)
├── CLAUDE.md                    # 📘 Claude Code instructions
├── README.md                    # 📘 Project README
└── netlify.toml                 # Netlify configuration (symlink)
```

---

### 000-docs/ 📁

**Purpose:** Complete business and operational documentation. This is the heart of the transparency model—all docs designed to be made public.

**Key Documents:**

| File | Purpose | Completeness |
|------|---------|--------------|
| `001-PP-PLAN-costplusdb-overview.md` | Complete technical, business, client blueprint | ✅ 100% |
| `002-PP-PLAN-pricing-structure.md` | Pricing tiers and calculations | ✅ 100% |
| `005-DR-SOPS-postgresql-operations.md` | Comprehensive SOPs (VPS, PostgreSQL, backups) | ✅ 100% |
| `015-DR-SOPS-security-implementation-masterplan.md` | Security automation implementation | ✅ 100% |
| `020-DR-ARCH-customer-database-structure.md` | Customer database isolation architecture | ✅ 100% |
| `021-DR-FORM-customer-onboarding-intake.md` | Customer onboarding form template | ✅ 100% |
| `022-DR-FORM-setup-confirmation.md` | Database setup confirmation email template | ✅ 100% |
| `026-DR-AUDIT-documentation-pre-launch.md` | Documentation audit report | ✅ Complete |
| `027-DR-AUDIT-website-ux-pre-launch.md` | Website UX audit report | ✅ Complete |
| `028-DR-AUDIT-security-pre-launch.md` | Security audit report | ✅ Complete |
| `029-DR-AUDIT-operations-pre-launch.md` | Operations readiness audit | ✅ Complete |
| `030-DR-GUID-credential-rotation-emergency.md` | Emergency credential rotation guide | ✅ 100% |
| `031-PM-ANNO-v1-launch-statement.md` | Official v1.0 launch announcement | ✅ 100% |

**Documentation Quality:** 85/100 (B+)
- ✅ Comprehensive business planning
- ✅ Detailed operational procedures
- ✅ Customer workflow templates
- ✅ Security implementation guides
- ⚠️ Some docs reference future state (VPS not yet provisioned)

**Gaps:**
- Missing: SOP-102 (Customer Onboarding Workflow - step-by-step)
- Missing: SOP-103 (Database Provisioning Procedure - actual commands)
- Missing: Incident response runbook (operational)
- Missing: Customer database migration guide

---

### 001-security/ 🔐

**Purpose:** Security automation, monitoring, and operational security infrastructure.

#### alerts/scripts/

**send-alert-email.sh** - Email alert delivery via Resend API
- **Status:** ✅ Implemented and tested (6 successful test emails in logs)
- **Configuration:** Uses Resend API key from `001-security/keys/api-tokens/resend-api-key`
- **Functionality:** Sends security alerts to jeremy@intentsolutions.io
- **Fallback:** Logs to pending queue if API fails
- **Permissions:** 755 (executable)

#### config/

**backup/pgbackrest.conf** 🔴 CRITICAL SECURITY ISSUE
- **Status:** ⚠️ Real credentials committed to git history (commit 3f05c90)
- **Problem:** Contains Wasabi S3 keys and encryption passphrase
- **Template:** `pgbackrest.conf.template` exists (safe for public repo)
- **Action Required:** Rotate ALL credentials before repo goes public

**backup/pgbackrest.conf.template**
- **Status:** ✅ Safe template with placeholders
- **Purpose:** Public-safe configuration template

**fail2ban/jail.local**
- **Status:** ✅ Configuration ready
- **Functionality:** PostgreSQL intrusion prevention
- **Rules:** Ban after 3 failed auth attempts, 1 hour ban duration

**logrotate-costplusdb.conf**
- **Status:** ✅ Configuration ready
- **Functionality:** 30-day log retention, gzip compression

**sudoers-setup.md**
- **Status:** ✅ Complete guide for sudo NOPASSWD configuration
- **Purpose:** Allows monitoring scripts to run sudo commands without password

#### keys/ 🔴

**Status:** Gitignored directory with partial setup

```
001-security/keys/
├── api-tokens/
│   └── resend-api-key           # ✅ Exists (600 permissions)
├── backup-encryption/           # 🔴 Empty (encryption key not generated)
└── ssh-keys/                    # 🔴 Empty (SSH keys not created)
```

**Security Status:**
- ✅ Resend API key: Properly stored with 600 permissions
- 🔴 Backup encryption passphrase: Not created yet
- 🔴 SSH keys: Not created yet
- ⚠️ Git history exposure: Old credentials in commit 3f05c90 (see audit 028)

#### logs/

**Status:** Gitignored directory (empty, will populate when monitoring starts)

**Planned logs:**
- `failed-logins.log` - Authentication failure tracking
- `security-events.log` - General security events
- `ssl-expiry.log` - SSL certificate expiration checks
- `lynis-scan.log` - Security audit scans
- `backup-configs.log` - Configuration backup logs

#### procedures/

**backup-to-both-repos.sh**
- **Status:** ✅ Script ready
- **Functionality:** Executes pgBackRest backup to local + Wasabi S3
- **Problem:** 🔴 Not scheduled (no cron job exists)
- **Action Required:** Add to crontab: `0 1 * * * /path/to/backup-to-both-repos.sh`

**verify-backup-integrity.sh**
- **Status:** ✅ Script ready
- **Functionality:** Verifies backup completion and integrity
- **Problem:** 🔴 Not scheduled (no cron job exists)
- **Action Required:** Add to crontab: `5 2 * * * /path/to/verify-backup-integrity.sh`

#### scripts/monitoring/

All scripts have been updated to remove hardcoded passwords (security audit fix).

| Script | Purpose | Status | Permissions |
|--------|---------|--------|-------------|
| `check-failed-logins.sh` | Detect PostgreSQL authentication failures | ✅ Ready | 755 |
| `check-security-events.sh` | Scan PostgreSQL logs for security events | ✅ Ready | 755 |
| `check-ssl-expiry.sh` | Alert 30 days before SSL cert expiration | ✅ Ready | 755 |
| `run-lynis-scan.sh` | Weekly security audit with Lynis | ✅ Ready | 755 |

**All scripts require:**
- Sudo NOPASSWD configuration (see `001-security/config/sudoers-setup.md`)
- Resend API key for email alerts
- PostgreSQL server running (not deployed yet)

#### scripts/maintenance/

**backup-security-configs.sh**
- **Status:** ✅ Scheduled (cron: `5 2 * * *`)
- **Functionality:** Backs up fail2ban, UFW, pgBackRest configs
- **Destination:** `001-security/logs/backups/`

#### tools/password-generator/

**generate-secure-password.sh**
- **Status:** ✅ Working utility
- **Functionality:** Generates cryptographically secure 64-character passwords
- **Usage:** Used to create backup encryption passphrases, DB passwords

---

### backend/ 🔴

**Status:** Empty directory (placeholder)

**Planned Functionality:**
- Customer database provisioning automation
- Billing and invoice generation
- Customer portal (view connection details, usage stats)
- API for programmatic database management

**Technology Decision:** Not yet determined
- **Options:** Node.js/Express, Python/Flask, Go
- **Requirements:** PostgreSQL client library, Stripe API integration
- **Timeline:** Post-launch, after manual processes validated

---

### scripts/ 🔴

**Status:** Empty directory (placeholder)

**Planned Scripts:**
- `provision-customer-database.sh` - Create isolated customer database
- `create-customer-user.sh` - Generate credentials, configure access
- `backup-customer-database.sh` - Customer-specific backup
- `restore-customer-database.sh` - Customer-specific restore
- `offboard-customer.sh` - Archive and remove customer database

**Timeline:** Needed before Customer #1

---

### website/ 🌐

**Status:** ✅ LIVE - https://costplusdb.dev (Netlify)

#### Design System

**Framework:** [The Monospace Web](https://github.com/owickstrom/the-monospace-web) by Oskar Wickström
- **Philosophy:** Minimalist, text-first, no JavaScript dependencies
- **Typography:** System monospace fonts
- **Layout:** Character-based, responsive tables
- **Colors:** Custom theme (`src/theme.css`)

#### src/

**CSS Architecture:**

| File | Purpose | Status |
|------|---------|--------|
| `reset.css` | CSS reset (normalize) | ✅ From monospace-web |
| `index.css` | Main layout and typography | ✅ From monospace-web |
| `theme.css` | CostPlusDB color theme | ✅ Custom |

**Theme Colors:**
- Primary: Dark background, light text (high contrast)
- Accent: Links, CTAs
- Code blocks: Monospace syntax highlighting

#### Pages

| Page | Purpose | Status | Key Features |
|------|---------|--------|--------------|
| `index.html` | Homepage | ✅ Live | Early access messaging, pricing comparison |
| `calculator.html` | Get Started | ✅ Live | Consultation request form (converted from pricing calculator) |
| `about.html` | About CostPlusDB | ✅ Live | Story, founder info |
| `security.html` | Security practices | ✅ Live | Transparency on monitoring, backups, security |
| `docs.html` | Documentation hub | ✅ Live | Links to guides, SOPs |
| `activity.html` | Changelog | ✅ Live | Version history |
| `ai-policy.html` | AI usage policy | ✅ Live | Transparency on Claude Code usage |
| `privacy.html` | Privacy policy | ✅ Live | GDPR-compliant |
| `terms.html` | Terms of service | ✅ Live | Legal terms |
| `acceptable-use.html` | Acceptable use | ✅ Live | Usage policies |
| `thank-you.html` | Form success | ✅ Live | Post-submission confirmation |

#### transparency/

**index.html** - Transparency hub
- **Status:** ✅ Live
- **Content:** Links to public operational documentation
- **Future:** Will link to public GitHub repo (when repo goes public)

#### Forms

**Netlify Forms Integration:**
- **Form Name:** `consultation-request` (on calculator.html)
- **Fields:** name, email, company, current-db, tier-interest, timeline, requirements
- **Handling:** Netlify captures submissions, sends to email
- **Spam Protection:** Honeypot field (`bot-field`)

**Form Flow:**
1. User fills consultation request form
2. Netlify captures submission
3. Email sent to jeremy@intentsolutions.io
4. Manual review and consultation scheduling
5. Upon approval: Stripe payment link
6. Upon payment: Manual database provisioning

#### Deployment

**Platform:** Netlify
**Configuration:** `netlify.toml`

```toml
[build]
  base = "website"
  publish = "."
  command = "echo 'Static site - no build required'"

[[redirects]]
  from = "/transparency/operations-manual.html"
  to = "https://github.com/jeremylongshore/cost-plus-db/blob/main/000-docs/005-DR-SOPS-postgresql-operations.md"
  status = 302

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

**Features:**
- Automatic deployments on `git push` to `main`
- Form handling (no backend needed)
- CDN distribution
- HTTPS automatic (Let's Encrypt)
- Custom domain: costplusdb.dev

---

## Operational Reference

### Deployment Workflows

#### Local Development

**Required tools:**
- Any modern web browser
- Python 3 (for local server)

**Running locally:**
```bash
cd /home/admincostplus/projects/costplusdb/website
python3 -m http.server 8000
# Open http://localhost:8000
```

**No build process required** (static HTML/CSS/JS)

#### Website Deployment (Netlify)

**Trigger:** Automatic on push to `main` branch

```bash
# Make changes to website/
git add website/
git commit -m "Update website"
git push origin main
# Netlify automatically deploys within 1-2 minutes
```

**Verify deployment:**
1. Check Netlify dashboard: https://app.netlify.com
2. Visit https://costplusdb.dev
3. Test form submission on /calculator.html

#### Infrastructure Deployment (Future)

**Not yet implemented** - Will require:

1. Provision Contabo VPS
2. Run SOP-001: VPS hardening
3. Run SOP-002: PostgreSQL installation
4. Run SOP-003: pgBackRest setup
5. Configure DNS: costplusdb.dev → VPS IP
6. Deploy monitoring scripts via cron
7. Test backup and restore

**Estimated time:** 6-8 hours for first deployment

---

### Monitoring & Alerting

#### Current State: 🔴 Not Deployed

**Planned Monitoring:**

| Monitor | Frequency | Alert Trigger | Status |
|---------|-----------|---------------|--------|
| Failed Logins | Every 5 min | 3+ failures in 5 min | Script ready, not scheduled |
| Security Events | Every 5 min | SQL injection attempts, unusual queries | Script ready, not scheduled |
| SSL Expiry | Daily at 3 AM | 30 days before expiration | Script ready, not scheduled |
| Lynis Security Audit | Weekly (Sun 2 AM) | Any high-severity findings | Script ready, not scheduled |
| Backup Verification | Daily at 2:05 AM | Backup failed or missing | Script exists, not scheduled |

**Alert Delivery:**
- **Method:** Email via Resend API
- **Recipient:** jeremy@intentsolutions.io
- **From:** CostPlusDB Security <costplusdb@intentsolutions.io>
- **Fallback:** If Resend fails, log to `001-security/logs/pending-alerts.log`

**Dashboards:**
- 🔴 No monitoring dashboards exist yet
- **Planned:** BetterStack, UptimeRobot, or custom Grafana

**Log Access:**
- **Production logs:** `/var/log/postgresql/` (on VPS, not provisioned)
- **Monitoring logs:** `001-security/logs/` (not populated yet)

---

### Incident Response

**Status:** 🟡 Procedures documented, not tested

| Severity | Description | Response Time | Actions |
|----------|-------------|---------------|---------|
| **P0** | PostgreSQL down, customers cannot connect | Immediate | 1. Check VPS status<br>2. Restart PostgreSQL<br>3. Email customers<br>4. Restore from backup if needed |
| **P1** | Degraded performance, slow queries | 15 minutes | 1. Check query performance<br>2. Identify slow queries<br>3. Kill long-running queries if necessary<br>4. Investigate root cause |
| **P2** | Security alert (failed logins, intrusion attempt) | 1 hour | 1. Review logs<br>2. Check fail2ban status<br>3. Block malicious IPs<br>4. Update firewall rules if needed |
| **P3** | Non-critical (backup warning, cert expiring soon) | 4 hours | 1. Investigate root cause<br>2. Schedule fix<br>3. Document issue |

**Incident Response Contacts:**
- **Primary:** Jeremy Longshore (jeremy@intentsolutions.io)
- **Escalation:** N/A (solo operator)
- **Customer Communication:** Email customers directly during P0/P1 incidents

---

### Backup & Recovery

**Status:** 🔴 Configured but not operational

#### Backup System

**Technology:** pgBackRest 2.x
**Encryption:** AES-256-CBC
**Repositories:**
1. **Local:** `/var/lib/pgbackrest/` (fast recovery)
2. **Cloud:** Wasabi S3 `costplusdb-backups` (disaster recovery)

**Backup Schedule (Planned):**
- **Full backups:** Daily at 1:00 AM CT
- **Incremental backups:** Every 6 hours
- **Retention:**
  - Local: 2 full backups + 4 differential (currently)
  - Cloud: 4 full backups + 7 differential (currently)
  - **Target:** 30 full backups (need to update retention policy)

**Current Configuration Issues:**
- 🔴 Backup cron job not scheduled
- 🔴 Backup verification script not scheduled
- ⚠️ Retention mismatch: Claiming 30 days, only keeping ~2 weeks

#### Recovery Procedures

**RPO (Recovery Point Objective):** 6 hours (incremental backup frequency)
**RTO (Recovery Time Objective):** 2 hours (restore from Wasabi + verify)

**Recovery Steps (Documented in SOP-003):**

```bash
# 1. Stop PostgreSQL
sudo systemctl stop postgresql

# 2. Restore from backup
sudo pgbackrest restore --stanza=main --type=time --target="2025-01-15 14:30:00"

# 3. Start PostgreSQL
sudo systemctl start postgresql

# 4. Verify restore
sudo -u postgres psql -c "SELECT version();"

# 5. Notify customer of restore completion
```

**DR Testing Schedule:**
- 🔴 Not yet scheduled
- **Recommended:** Monthly restore test (first Saturday of month)

---

## Security & Access

### Identity & Access Management

**Status:** 🔴 Accounts not created yet

**Required Accounts:**

| Account/Service | Purpose | Permissions | Status |
|-----------------|---------|-------------|--------|
| **Contabo Account** | VPS hosting | Full admin | 🔴 Not created |
| **Wasabi Account** | Backup storage | S3 bucket access | 🔴 Not created |
| **Resend Account** | Email alerts | API key for sending | ✅ Active |
| **Netlify Account** | Website hosting | Deploy access | ✅ Active |
| **GitHub Account** | Code repository | Owner | ✅ Active |
| **Stripe Account** | Payment processing | Payment links, invoices | 🔴 Not created |

**Server Access (Future):**
- **SSH:** Key-based authentication only (password auth disabled)
- **PostgreSQL:** Individual customer users (isolated databases)
- **Root Access:** Only via SSH key, sudo for administrative tasks

---

### Secrets Management

**Current Approach:**

1. **API Keys:** Stored in `001-security/keys/api-tokens/` (600 permissions, gitignored)
2. **Database Passwords:** Will be generated per-customer, stored in password manager
3. **Backup Encryption:** Will be stored in `/root/pgbackrest-keys/` (600 permissions)
4. **SSH Keys:** Will be generated and stored in `001-security/keys/ssh-keys/`

**Rotation Policies:**
- **API Keys:** Rotate every 90 days
- **Customer Passwords:** Rotate on customer request
- **Backup Encryption:** Rotate annually (requires re-encryption of backups)
- **SSH Keys:** Rotate every 6 months

**Access Audit:**
- 🔴 No audit trail yet
- **Planned:** Log all sudo commands, PostgreSQL access logs

---

### Security Posture

#### Authentication

**Website:** No authentication (public site)
**Customer Databases:** PostgreSQL role-based authentication
- Individual username/password per customer
- SSL/TLS enforced
- No shared credentials

**Server Access:**
- SSH key authentication only
- No password authentication
- fail2ban protection (3 attempts → 1 hour ban)

#### Authorization

**Customer Database Isolation:**
- Each customer gets dedicated PostgreSQL role
- GRANT permissions limited to customer's database only
- No cross-customer access possible
- No superuser access for customers

**Server Administration:**
- Root access: SSH key only
- Sudo: NOPASSWD configured for monitoring scripts only
- PostgreSQL superuser: postgres role (not exposed to customers)

#### Network Security

**Firewall (UFW):**
```bash
# Default deny incoming
ufw default deny incoming

# Allow PostgreSQL (customers only)
ufw allow 5432/tcp

# Allow SSH (admin only)
ufw allow 22/tcp

# Allow HTTPS (if web panel added)
ufw allow 443/tcp
```

**fail2ban:**
- PostgreSQL jail: Ban after 3 failed auth attempts
- SSH jail: Ban after 5 failed attempts
- Ban duration: 1 hour
- Repeat offenders: Permanent ban

**WAF:** 🔴 Not implemented (Netlify handles website security)

---

### Known Security Issues

**🔴 CRITICAL (Must fix before launch):**

1. **Hardcoded credentials in git history**
   - Wasabi S3 keys in commit 3f05c90
   - Backup encryption passphrase in commit 3f05c90
   - **Action:** Rotate all credentials, scrub git history before repo goes public
   - **Reference:** See `000-docs/030-DR-GUID-credential-rotation-emergency.md`

2. **No VPS/PostgreSQL server**
   - Cannot accept customers without production infrastructure
   - **Action:** Provision Contabo VPS, run SOPs 001-003

3. **Backup system not scheduled**
   - Scripts ready, but no cron jobs configured
   - **Action:** Add cron jobs for backup and verification

**⚠️ IMPORTANT (Security debt):**

1. **No backup verification automation**
   - Script exists, not scheduled
   - **Action:** Schedule daily at 2:05 AM

2. **No uptime monitoring**
   - Claiming "30-second uptime monitoring" on website
   - Cron cannot do sub-minute intervals
   - **Action:** Set up external monitoring (BetterStack) or update website claims

3. **Backup retention mismatch**
   - Website claims 30 days, pgBackRest configured for ~2 weeks
   - **Action:** Update pgBackRest retention to 30 full backups

---

## Cost & Performance

### Current Costs

**Monthly Recurring:**

| Service | Cost | Purpose |
|---------|------|---------|
| **Netlify** | $0 | Website hosting (free tier) |
| **Resend** | $0 | Email alerts (free tier: 3k emails/month) |
| **GitHub** | $0 | Private repository (free tier) |
| **Domain (costplusdb.dev)** | ~$12/year | Domain registration |
| **TOTAL** | **~$1/month** | Current operational cost |

**Future Costs (First Customer):**

| Service | Cost | Purpose |
|---------|------|---------|
| **Contabo VPS (8GB RAM)** | $12/month | PostgreSQL hosting |
| **Wasabi S3 (500GB)** | $6/month | Backup storage |
| **Stripe** | 2.9% + $0.30/transaction | Payment processing |
| **TOTAL** | **~$18/month** | Infrastructure cost for first customer |

**Pricing Model:**
- **Customer pays:** $89/month (Dedicated tier)
- **Infrastructure cost:** $12/month (VPS) + $6/month (backups) = $18/month
- **Gross margin:** $71/month (80%)
- **Net margin:** After Stripe fees (2.9%) = ~$68/month (76%)

**Break-even:** First customer covers infrastructure + margin
**Target:** 5 customers first month = $445/month revenue, $90 infrastructure cost = $355/month net

---

### Performance Baseline

**🔴 No production data yet** (no customers, no VPS)

**Target Performance (Dedicated Tier - 8GB RAM):**
- **Response Time P50:** < 50ms (simple queries)
- **Response Time P95:** < 200ms
- **Response Time P99:** < 500ms
- **Availability:** 99.9% (< 45 min downtime/month)
- **Error Rate:** < 0.1%

**Planned Monitoring:**
- PostgreSQL slow query log (queries > 1 second)
- Connection pool monitoring
- Disk I/O monitoring
- CPU and memory utilization

---

### Optimization Opportunities

**Infrastructure (Future State):**

1. **Right-sizing VPS:** Start with smallest tier, monitor actual usage, upgrade if needed
2. **Backup compression:** pgBackRest already uses gzip, but can optimize compression level
3. **Connection pooling:** PgBouncer for customers with high connection counts
4. **Read replicas:** Offer as add-on (+$15/month) for read-heavy workloads

**Website (Current):**

1. **Asset optimization:** Already minimal (vanilla CSS, no JS frameworks)
2. **CDN:** Netlify provides CDN automatically
3. **Image optimization:** No images on site (pure text)

**Operational Efficiency:**

1. **Automation:** Provision script would save 30-60 min per customer onboarding
2. **Monitoring:** Centralized dashboard (Grafana) would reduce time to diagnose issues
3. **Customer portal:** Self-service connection details would reduce support burden

---

## Development Workflow

### Local Development

**Prerequisites:**
- Git
- Text editor (VS Code, Vim, etc.)
- Python 3 (for local web server)
- Claude Code (optional, for AI assistance)

**Setup:**
```bash
# Clone repository
git clone https://github.com/jeremylongshore/cost-plus-db.git
cd cost-plus-db

# No dependencies to install (static site)

# Run local web server
cd website
python3 -m http.server 8000
# Open http://localhost:8000
```

**Common Development Tasks:**

```bash
# Update website content
vim website/index.html
# Test locally at http://localhost:8000

# Create new documentation
vim 000-docs/0XX-CC-ABCD-description.md

# Update security scripts
vim 001-security/scripts/monitoring/check-failed-logins.sh
chmod +x 001-security/scripts/monitoring/check-failed-logins.sh

# Test email alerts (requires Resend API key)
./001-security/alerts/scripts/send-alert-email.sh "Test Subject" "Test message body"
```

---

### CI/CD Pipeline

**Platform:** Netlify (automatic deployments)

**Trigger:** Push to `main` branch

**Pipeline Stages:**
1. **Detect Push:** GitHub webhook triggers Netlify
2. **Build:** None required (static site)
3. **Deploy:** Copy files to Netlify CDN
4. **Publish:** Live at https://costplusdb.dev

**No formal CI/CD for infrastructure** (manual deployment following SOPs)

**Future CI/CD (Planned):**
- GitHub Actions for automated testing
- Pre-commit hooks for documentation linting
- Automated security scanning (GitHub Dependabot)

---

### Code Quality

**Website:**
- **Linting:** None currently (vanilla HTML/CSS)
- **Formatting:** Manual (consistent with Monospace Web style)
- **Validation:** W3C HTML validator (manual checks)

**Scripts:**
- **Linting:** ShellCheck (recommended, not enforced)
- **Testing:** Manual testing before deployment
- **Code Review:** Solo developer (self-review)

**Documentation:**
- **Naming Convention:** Strictly enforced (NNN-CC-ABCD-description.md)
- **Completeness:** All docs aim for 100% completeness before commit
- **Versioning:** Git history tracks all documentation changes

---

## Dependencies & Supply Chain

### Direct Dependencies

**Website:** ZERO runtime dependencies
- Pure HTML/CSS (no frameworks)
- CSS from [The Monospace Web](https://github.com/owickstrom/the-monospace-web) (MIT License)

**Monitoring Scripts:** Standard Linux utilities
- `bash` (shell)
- `grep`, `awk`, `sed` (text processing)
- `curl` (Resend API calls)
- `jq` (JSON processing, optional)
- `fail2ban-client` (intrusion prevention)
- `pgbackrest` (backup system)

**Future Dependencies:**
- PostgreSQL 16 (server)
- pgBackRest (backup)
- UFW (firewall)
- fail2ban (intrusion prevention)
- Lynis (security auditing)

---

### Third-Party Services

| Service | Purpose | Auth Method | SLA/Criticality | Cost |
|---------|---------|-------------|-----------------|------|
| **Netlify** | Website hosting | OAuth (GitHub) | 99.9% / Medium | Free |
| **Resend** | Email alerts | API key | 99.9% / High | Free tier |
| **GitHub** | Code repository | SSH key | 99.95% / Medium | Free |
| **Contabo** | VPS hosting | Username/password | 99.9% / CRITICAL | $12/mo |
| **Wasabi** | Backup storage | S3 API key | 99.9% / CRITICAL | $6/mo |
| **Stripe** | Payment processing | API key | 99.99% / High | 2.9% + $0.30 |

**Criticality Assessment:**
- **CRITICAL:** Contabo (hosts customer databases), Wasabi (backup disaster recovery)
- **High:** Resend (security alerts), Stripe (payment collection)
- **Medium:** Netlify (website uptime), GitHub (code availability)

**Vendor Lock-in Risk:**
- **Low:** Can migrate website to any static host
- **Medium:** Can migrate VPS to Hetzner/DigitalOcean with 1-2 hours work
- **Low:** Can migrate backups to any S3-compatible storage (B2, AWS S3)

---

## Integration with Existing Documentation

### Key Documentation to Read First

**Priority 1 (Read Before Infrastructure Deployment):**

1. **`005-DR-SOPS-postgresql-operations.md`** - Complete SOPs for VPS setup, PostgreSQL, backups
   - SOP-001: VPS Hardening (Ubuntu 24.04 security configuration)
   - SOP-002: PostgreSQL Installation (PostgreSQL 16 setup, SSL/TLS)
   - SOP-003: Backup System (pgBackRest + Wasabi S3 configuration)

2. **`028-DR-AUDIT-security-pre-launch.md`** - Critical security issues found in audit
   - Hardcoded credentials in git history
   - Missing backup cron jobs
   - Security claims vs reality mismatch

3. **`029-DR-AUDIT-operations-pre-launch.md`** - Operational readiness assessment
   - Customer onboarding workflow simulation
   - Infrastructure blockers
   - Minimum viable launch checklist

**Priority 2 (Read Before Customer #1):**

4. **`020-DR-ARCH-customer-database-structure.md`** - Database isolation architecture
5. **`021-DR-FORM-customer-onboarding-intake.md`** - Customer intake form
6. **`022-DR-FORM-setup-confirmation.md`** - Setup confirmation email template
7. **`030-DR-GUID-credential-rotation-emergency.md`** - Emergency credential rotation

**Priority 3 (Business Context):**

8. **`001-PP-PLAN-costplusdb-overview.md`** - Complete business blueprint
9. **`002-PP-PLAN-pricing-structure.md`** - Pricing tiers and calculations
10. **`README.md`** - GitHub repository README

---

### Documentation Gaps

**Missing Operational Procedures:**

1. **SOP-102: Customer Onboarding Workflow** 🔴 CRITICAL
   - Step-by-step: From consultation request → database provisioning → credentials delivered
   - Timeline: What happens when, who does what
   - Communication templates: Email templates for each stage

2. **SOP-103: Database Provisioning Procedure** 🔴 CRITICAL
   - Exact commands to create customer database
   - User creation and permission granting
   - SSL certificate generation
   - Connection string generation

3. **Incident Response Runbook** ⚠️ IMPORTANT
   - P0 scenario: PostgreSQL down (step-by-step recovery)
   - P1 scenario: Degraded performance (troubleshooting)
   - P2 scenario: Security incident (investigation and response)

4. **Customer Database Migration Guide** ⚠️ IMPORTANT
   - How to help customers migrate from Heroku/AWS/GCP
   - pg_dump and pg_restore procedures
   - Zero-downtime migration strategies

---

## Current State Assessment

### What's Working Well ✅

**1. Documentation (85/100 - B+)**
- Comprehensive business planning
- Detailed SOPs for all infrastructure operations
- Transparent pricing calculations
- Professional customer-facing forms
- Complete pre-launch audit reports

**2. Website (90/100 - A-)**
- Clean, professional design
- Fast loading (no JavaScript bloat)
- Mobile-responsive
- Transparent messaging (early access, quality focus)
- Consultation-focused onboarding (vs commodity signup)
- Automatic deployments via Netlify

**3. Security Architecture (Design 95/100)**
- Solid security design (fail2ban, UFW, SSL/TLS)
- Monitoring scripts ready to deploy
- Email alerting system working
- Proper secrets management approach (gitignore, 600 permissions)

**4. Transparency Commitment**
- All operational docs designed to be public
- Pricing fully transparent (cost breakdowns available)
- AI usage disclosed (CLAUDE.md, ai-policy.html)
- Open about limitations (early access, capacity constraints)

**5. Business Model**
- Defensible pricing (cost-plus vs AWS 2000% markup)
- Quality-focused positioning (5 clients max first month)
- Professional vetting process (consultation before signup)
- Clear value proposition (save $191/month vs AWS RDS)

---

### Areas Needing Attention 🔴⚠️

#### 🔴 CRITICAL BLOCKERS (Cannot launch without these)

**1. No Production Infrastructure**
- **Problem:** Zero infrastructure provisioned. No VPS, no PostgreSQL server, no backup system.
- **Impact:** Cannot accept Customer #1 even if they want to pay
- **Estimated Fix Time:** 6-8 hours (VPS provisioning + SOPs 001-003)
- **Action:** Provision Contabo VPS, run hardening, install PostgreSQL, configure backups

**2. Secrets Exposed in Git History**
- **Problem:** Wasabi credentials and backup encryption passphrase committed in 3f05c90
- **Impact:** If repo goes public, anyone can access customer backups and decrypt them
- **Estimated Fix Time:** 2-3 hours (credential rotation + git history scrub)
- **Action:** Execute `030-DR-GUID-credential-rotation-emergency.md`

**3. No Payment Collection System**
- **Problem:** No Stripe account, no invoice templates, no payment links
- **Impact:** Cannot bill customers even if we provision databases
- **Estimated Fix Time:** 2-4 hours (Stripe setup + testing)
- **Action:** Create Stripe account, design invoice template, test payment flow

**4. Missing Customer Provisioning Procedures**
- **Problem:** No SOP-102 (onboarding workflow) or SOP-103 (database provisioning commands)
- **Impact:** No step-by-step guide for actual customer onboarding
- **Estimated Fix Time:** 2-3 hours (write procedures + test with dummy customer)
- **Action:** Document complete workflow, test end-to-end

**5. Backup System Not Scheduled**
- **Problem:** Backup scripts ready, but no cron jobs configured
- **Impact:** Customer data at risk if server fails, false advertising on website
- **Estimated Fix Time:** 30 minutes (add 2 cron jobs)
- **Action:**
  ```bash
  # Add to crontab:
  0 1 * * * /home/admincostplus/projects/costplusdb/001-security/procedures/backup-to-both-repos.sh
  5 2 * * * /home/admincostplus/projects/costplusdb/001-security/procedures/verify-backup-integrity.sh
  ```

---

#### ⚠️ IMPORTANT (Security/Operational Debt)

**6. Backup Retention Mismatch**
- **Problem:** Website claims 30 days, pgBackRest configured for 2-4 backups (~2 weeks max)
- **Impact:** False advertising, cannot restore from 3 weeks ago if customer asks
- **Action:** Update `pgbackrest.conf` retention to 30 full backups

**7. No Uptime Monitoring**
- **Problem:** Website claims "30-second uptime monitoring", but it doesn't exist (and cron can't do sub-minute)
- **Impact:** False advertising, won't know if PostgreSQL crashes until customer complains
- **Action:** Set up external monitoring (BetterStack) OR update website to realistic claim

**8. No Backup Verification Automation**
- **Problem:** Script exists, not scheduled
- **Impact:** Backups could be failing silently, wouldn't know until disaster recovery needed
- **Action:** Schedule `verify-backup-integrity.sh` daily at 2:05 AM

**9. Customer Directory Not Initialized**
- **Problem:** No directory structure for storing customer data
- **Impact:** No organized place to keep intake forms, setup confirmations, credentials
- **Action:**
  ```bash
  mkdir -p 001-security/customer-security/customers/{active,inactive,prospects}
  mkdir -p 001-security/customer-security/templates
  ```

---

#### 💡 NICE TO HAVE (Future Improvements)

**10. No Customer Portal**
- **Problem:** Customers must email to get connection details, usage stats
- **Impact:** Higher support burden, less professional experience
- **Timeline:** Post-launch (Month 2-3)

**11. No Automated Provisioning**
- **Problem:** Database provisioning is manual (30-60 min per customer)
- **Impact:** Limits scalability, human error risk
- **Timeline:** After first 5 customers validated manual process

**12. No Monitoring Dashboard**
- **Problem:** Monitoring alerts via email only, no visual dashboard
- **Impact:** Harder to diagnose issues, no historical trend data
- **Timeline:** Month 2 (set up Grafana or BetterStack)

**13. Limited Payment Options**
- **Problem:** Stripe only (no wire transfer, no crypto)
- **Impact:** May lose some customers who prefer alternative payment methods
- **Timeline:** Based on customer demand

---

### Immediate Priorities (Ranked by Impact + Urgency)

**MUST FIX BEFORE LAUNCH (Week 1):**

1. **🔴 Rotate exposed credentials** (TODAY)
   - Change Wasabi S3 access keys
   - Generate new backup encryption passphrase
   - Change sudo password
   - Scrub git history or start fresh repo

2. **🔴 Provision production infrastructure** (Day 1-2)
   - Provision Contabo VPS
   - Run SOP-001 (VPS hardening)
   - Run SOP-002 (PostgreSQL installation)
   - Run SOP-003 (pgBackRest setup)
   - Configure DNS

3. **🔴 Schedule backup automation** (Day 2)
   - Add backup cron job (1 AM daily)
   - Add verification cron job (2:05 AM daily)
   - Test backup and restore

4. **🔴 Set up payment system** (Day 2-3)
   - Create Stripe account
   - Design invoice template
   - Test payment link creation
   - Test payment flow end-to-end

5. **🔴 Write missing SOPs** (Day 3)
   - SOP-102: Customer Onboarding Workflow
   - SOP-103: Database Provisioning Procedure
   - Test with dummy customer

**SHOULD FIX BEFORE CUSTOMER #1 (Week 1-2):**

6. **⚠️ Fix backup retention mismatch**
   - Update pgBackRest config to 30-day retention
   - Update website if configuration can't support 30 days

7. **⚠️ Set up uptime monitoring**
   - BetterStack or UptimeRobot free tier
   - OR update website to remove false claim

8. **⚠️ Initialize customer directory structure**
   - Create directory hierarchy
   - Copy form templates

**CAN DEFER (Post-Launch):**

9. **💡 Build customer portal** (Month 2-3)
10. **💡 Automate provisioning** (After first 5 customers)
11. **💡 Set up monitoring dashboard** (Month 2)
12. **💡 Add payment options** (Based on demand)

---

## Quick Reference

### Essential Commands

**Local Development:**
```bash
# Start local web server
cd /home/admincostplus/projects/costplusdb/website
python3 -m http.server 8000

# Test email alerts
./001-security/alerts/scripts/send-alert-email.sh "Test Subject" "Test message"

# Generate secure password
./001-security/tools/password-generator/generate-secure-password.sh
```

**Website Deployment:**
```bash
# Deploy website (automatic on push)
git add website/
git commit -m "Update website"
git push origin main
# Netlify deploys automatically
```

**Infrastructure Deployment (Future):**
```bash
# Provision VPS
# (Manual via Contabo web console)

# SSH to VPS
ssh -i ~/.ssh/costplusdb_rsa admin@SERVER_IP

# Run SOPs
sudo bash 001-security/scripts/sop-001-vps-hardening.sh
sudo bash 001-security/scripts/sop-002-postgresql-install.sh
sudo bash 001-security/scripts/sop-003-backup-setup.sh
```

**Backup Operations (Future):**
```bash
# Manual backup
sudo pgbackrest backup --type=full --stanza=main

# Verify backup
sudo pgbackrest info --stanza=main

# Restore backup
sudo pgbackrest restore --stanza=main --type=time --target="2025-01-15 14:30:00"
```

**Monitoring (Future):**
```bash
# Check failed logins
./001-security/scripts/monitoring/check-failed-logins.sh

# Check security events
./001-security/scripts/monitoring/check-security-events.sh

# Check SSL expiry
./001-security/scripts/monitoring/check-ssl-expiry.sh

# Run security audit
./001-security/scripts/monitoring/run-lynis-scan.sh
```

**Emergency Procedures:**
```bash
# Restart PostgreSQL
sudo systemctl restart postgresql

# Check PostgreSQL status
sudo systemctl status postgresql

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-16-main.log

# Restore from backup
sudo pgbackrest restore --stanza=main
sudo systemctl start postgresql
```

---

### Critical Endpoints

**Website (Production):**
- Homepage: https://costplusdb.dev
- Get Started: https://costplusdb.dev/calculator.html
- Security: https://costplusdb.dev/security.html
- Transparency: https://costplusdb.dev/transparency/

**Monitoring:**
- Netlify Dashboard: https://app.netlify.com (website deployments)
- GitHub Repository: https://github.com/jeremylongshore/cost-plus-db (private)
- Resend Dashboard: https://resend.com/emails (email delivery logs)

**Infrastructure (Future):**
- PostgreSQL Server: db-prod-01.costplusdb.dev:5432 (not provisioned)
- Monitoring Dashboard: TBD (not set up)
- Customer Portal: TBD (not built)

---

### First Week Checklist

**Access & Accounts:**
- [x] GitHub repository access
- [x] Netlify account access
- [x] Resend account access
- [ ] Contabo account (create)
- [ ] Wasabi account (create)
- [ ] Stripe account (create)

**Local Environment:**
- [x] Repository cloned
- [x] Local web server working
- [x] Email alert script tested
- [ ] SSH keys generated
- [ ] Backup encryption passphrase generated

**Infrastructure:**
- [ ] VPS provisioned
- [ ] SSH access configured
- [ ] SOP-001 completed (VPS hardening)
- [ ] SOP-002 completed (PostgreSQL installation)
- [ ] SOP-003 completed (Backup system)
- [ ] DNS configured

**Operational Readiness:**
- [x] Read all pre-launch audit reports
- [ ] Read SOPs 001-003
- [ ] Test backup and restore
- [ ] Write SOP-102 (customer onboarding)
- [ ] Write SOP-103 (database provisioning)
- [ ] Test end-to-end with dummy customer

**Security:**
- [ ] Rotate exposed credentials
- [ ] Scrub git history
- [ ] Configure fail2ban
- [ ] Test monitoring scripts
- [ ] Schedule cron jobs

**Business:**
- [ ] Stripe payment flow tested
- [ ] Invoice template created
- [ ] Customer intake form finalized
- [ ] Setup confirmation email template finalized

---

## Recommendations Roadmap

### Week 1: Critical Setup & Security Fixes

**Day 1-2: Infrastructure Foundation**
- [ ] Rotate ALL exposed credentials (Wasabi, backup encryption, sudo password)
- [ ] Scrub git history OR create fresh public repo
- [ ] Provision Contabo VPS (Ubuntu 24.04 LTS, 8GB RAM)
- [ ] Run SOP-001: VPS Hardening (UFW, fail2ban, SSH keys)
- [ ] Run SOP-002: PostgreSQL 16 Installation (SSL/TLS, basic config)

**Day 3-4: Backup & Monitoring**
- [ ] Create Wasabi account + S3 bucket
- [ ] Run SOP-003: pgBackRest Setup (local + Wasabi repos)
- [ ] Test backup and restore procedures
- [ ] Schedule backup cron jobs (1 AM backup, 2:05 AM verification)
- [ ] Deploy monitoring scripts + cron jobs
- [ ] Test email alerting end-to-end

**Day 5: Business Operations**
- [ ] Create Stripe account
- [ ] Design invoice template
- [ ] Test payment link creation and checkout flow
- [ ] Set up external uptime monitoring (BetterStack free tier)

**Day 6-7: Operational Procedures**
- [ ] Write SOP-102: Customer Onboarding Workflow (consultation → provisioning → delivery)
- [ ] Write SOP-103: Database Provisioning Procedure (exact commands)
- [ ] Initialize customer directory structure
- [ ] Create test customer end-to-end (provision, test, offboard)
- [ ] Fix backup retention to 30 days OR update website claims

**End of Week 1 Milestone:** Ready to accept Customer #1

---

### Month 1: Foundation Building & First Customers

**Weeks 2-4: Onboard First 5 Customers**
- [ ] Customer #1: Onboard, monitor closely, collect feedback
- [ ] Customer #2-3: Refine procedures based on learnings
- [ ] Customer #4-5: Validate scalability of manual processes
- [ ] Document common customer issues and solutions
- [ ] Create troubleshooting guide for frequent problems

**Infrastructure Improvements:**
- [ ] Set up monitoring dashboard (Grafana or BetterStack)
- [ ] Implement automated backup verification alerts
- [ ] Configure log aggregation (structured logging)
- [ ] Test disaster recovery procedures (full restore from Wasabi)

**Documentation:**
- [ ] Write customer database migration guide
- [ ] Write incident response runbook (P0/P1/P2 scenarios)
- [ ] Document lessons learned from first 5 customers
- [ ] Update SOPs based on actual operational experience

**Transparency:**
- [ ] Make GitHub repo public (after credential rotation confirmed)
- [ ] Publish actual cost data from first month
- [ ] Write blog post: "What we learned from our first 5 customers"

**End of Month 1 Milestone:** 5 customers, proven operational procedures, public repository

---

### Quarter 1: Strategic Improvements & Scaling

**Month 2: Automation & Efficiency**
- [ ] Build customer provisioning automation script
  - Input: Customer intake form data
  - Output: Database created, credentials generated, setup email sent
  - Reduces provisioning time from 60 min → 5 min
- [ ] Build customer portal (basic)
  - View connection details
  - View usage stats (connections, storage)
  - Download connection certificate
- [ ] Implement automated invoice generation (Stripe integration)
- [ ] Set up CI/CD for monitoring script deployments

**Month 3: Feature Expansion**
- [ ] Implement high availability add-on (if customer demand exists)
  - PostgreSQL streaming replication
  - Automatic failover
  - +$99/month pricing validated
- [ ] Implement read replica add-on
  - pgBackRest parallel restore for replica creation
  - Replication lag monitoring
  - +$15/month pricing validated
- [ ] Expand to second VPS (if > 5 customers)
  - Validate multi-VPS management procedures
  - Customer distribution strategy

**Scaling Preparation:**
- [ ] Document what breaks at 10 customers, 20 customers, 50 customers
- [ ] Identify bottlenecks (monitoring, support, provisioning)
- [ ] Build roadmap for automation priorities
- [ ] Hire decision point: At what customer count do we need help?

**End of Quarter 1 Milestone:** 10-15 customers, automated provisioning, customer portal, proven scaling path

---

## Appendices

### A. Glossary

| Term | Definition |
|------|------------|
| **pgBackRest** | PostgreSQL backup and restore tool with compression, encryption, and S3 support |
| **Contabo** | Budget VPS hosting provider (primary infrastructure) |
| **Wasabi** | S3-compatible cloud storage (75% cheaper than AWS S3) |
| **Resend** | Email API service for transactional emails (alerts, notifications) |
| **Netlify** | Static site hosting with CDN, forms, automatic deployments |
| **fail2ban** | Intrusion prevention system (bans IPs after failed auth attempts) |
| **UFW** | Uncomplicated Firewall (user-friendly iptables wrapper) |
| **Lynis** | Security auditing tool for Unix systems |
| **RPO** | Recovery Point Objective (how much data loss is acceptable) |
| **RTO** | Recovery Time Objective (how long recovery can take) |
| **SOP** | Standard Operating Procedure |
| **SSL/TLS** | Secure Sockets Layer / Transport Layer Security (encryption) |
| **VPS** | Virtual Private Server |
| **The Monospace Web** | Minimalist web design framework (text-first, monospace fonts) |

---

### B. Reference Links

**External Services:**
- Netlify Dashboard: https://app.netlify.com
- GitHub Repository: https://github.com/jeremylongshore/cost-plus-db
- Resend Dashboard: https://resend.com/emails
- Contabo: https://contabo.com (not signed up yet)
- Wasabi: https://wasabi.com (not signed up yet)
- Stripe: https://stripe.com (not signed up yet)

**Documentation:**
- PostgreSQL 16 Docs: https://www.postgresql.org/docs/16/
- pgBackRest Docs: https://pgbackrest.org/documentation.html
- Netlify Docs: https://docs.netlify.com
- The Monospace Web: https://github.com/owickstrom/the-monospace-web

**Tools:**
- Lynis: https://cisofy.com/lynis/
- fail2ban: https://www.fail2ban.org/
- BetterStack: https://betterstack.com (uptime monitoring)

---

### C. Troubleshooting Guide

**Common Issues (Future):**

#### Website Not Updating After Push

**Symptom:** Changes pushed to GitHub not reflected on costplusdb.dev

**Diagnosis:**
```bash
# Check Netlify deploy status
# Visit: https://app.netlify.com/sites/[site-name]/deploys

# Check git push succeeded
git log --oneline -5
git remote -v
```

**Resolution:**
1. Verify push succeeded: `git push origin main`
2. Check Netlify deploy logs for errors
3. Manual deploy trigger if needed (Netlify dashboard)

---

#### Email Alerts Not Sending

**Symptom:** Monitoring scripts not sending email alerts

**Diagnosis:**
```bash
# Check Resend API key exists and has correct permissions
ls -la /home/admincostplus/projects/costplusdb/001-security/keys/api-tokens/resend-api-key

# Test alert script manually
./001-security/alerts/scripts/send-alert-email.sh "Test" "Testing alerts"

# Check Resend dashboard for delivery logs
# Visit: https://resend.com/emails
```

**Resolution:**
1. Verify API key file exists (600 permissions)
2. Check Resend account status (free tier limits: 3k emails/month)
3. Check API key not expired or revoked
4. Review pending alerts log: `001-security/logs/pending-alerts.log`

---

#### PostgreSQL Connection Refused (Future)

**Symptom:** Cannot connect to customer database

**Diagnosis:**
```bash
# Check PostgreSQL running
sudo systemctl status postgresql

# Check PostgreSQL listening on port 5432
sudo netstat -tlnp | grep 5432

# Check firewall allows port 5432
sudo ufw status | grep 5432

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

**Resolution:**
1. Restart PostgreSQL: `sudo systemctl restart postgresql`
2. Check `pg_hba.conf` allows customer IP
3. Verify SSL certificate valid
4. Check fail2ban hasn't banned customer IP: `sudo fail2ban-client status postgresql`

---

#### Backup Failed

**Symptom:** Backup verification script reports failure

**Diagnosis:**
```bash
# Check pgBackRest status
sudo pgbackrest info --stanza=main

# Check last backup log
sudo tail -100 /var/log/pgbackrest/main-backup.log

# Check Wasabi S3 connectivity
aws s3 ls s3://costplusdb-backups --endpoint-url=https://s3.us-east-1.wasabisys.com

# Check disk space
df -h
```

**Resolution:**
1. Check Wasabi credentials still valid
2. Verify disk space available (local backups)
3. Check network connectivity to Wasabi
4. Manual backup: `sudo pgbackrest backup --type=full --stanza=main`
5. If still failing, check pgBackRest configuration

---

### D. Change Management

**How to Keep This Document Updated:**

1. **After Infrastructure Changes:**
   - Update "System Architecture Overview" section
   - Update "Operational Reference" with new commands
   - Update "Quick Reference" with new endpoints

2. **After Adding Customers:**
   - Update "Cost & Performance" with actual data
   - Update "Current State Assessment" with lessons learned
   - Update "Troubleshooting Guide" with new issues encountered

3. **After New Services Added:**
   - Update "Technology Stack" table
   - Update "Cloud Services in Use" table
   - Update "Dependencies & Supply Chain" section

4. **Quarterly Review:**
   - Review "Areas Needing Attention" (mark items completed or deferred)
   - Update "Recommendations Roadmap" based on progress
   - Add new priorities based on operational learnings

**Document Owner:** Jeremy Longshore (jeremy@intentsolutions.io)

**Last Updated:** 2025-10-19 (v1.0 - Pre-Production)

**Next Review:** After infrastructure provisioned and Customer #1 onboarded

---

## End of System Analysis

**This document serves as the foundational operational reference for CostPlusDB.**

**Key Takeaway:** Documentation and planning are 85% complete. Infrastructure is 0% deployed. Critical path: Provision VPS → Run SOPs 001-003 → Rotate credentials → Write SOPs 102-103 → Launch.

**Estimated Time to Launch-Ready:** 3-4 full days of focused work.

**Questions or Updates:** Contact jeremy@intentsolutions.io

---

**Generated with Claude Code** - https://claude.com/claude-code
