# CostPlusDB

**Transparent, affordable managed PostgreSQL hosting**

[![Website](https://img.shields.io/badge/website-costplusdb.dev-blue)](https://costplusdb.dev)
[![Status](https://img.shields.io/badge/status-backend_85%25_ready-green)](https://github.com/jeremylongshore/cost-plus-db)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

> Database hosting at our cost + transparent margin. No hidden fees. No 20x markups.

---

## 📍 Current Development Status (2025-10-25)

**Latest Release:** v1.2.0 - Multi-Tenant Benchmark Transparency Page ([CHANGELOG](CHANGELOG.md))

**Latest Work:** ✅ Multi-tenant benchmarking complete (PUBLISHED)
- ✅ Created 5 local PostgreSQL databases (Shared tier simulations)
- ✅ Ran industry-standard pgbench tests (TPC-B workload)
- ✅ Tested single database baseline: **1,077 TPS @ 9.23ms latency**
- ✅ Tested all 5 databases simultaneously: **297 TPS each @ 13.45ms latency**
- ✅ Published brutally honest results: [costplusdb.dev/benchmarks](https://costplusdb.dev/benchmarks/)
- ✅ Created benchmark transparency page with educational content
- ✅ Revised SLA from 500 TPS to 300 TPS based on real data
- 📋 Each database simulates different use case:
  1. E-commerce shop (transaction-heavy)
  2. SaaS startup (event logging)
  3. Blog/CMS (read-heavy)
  4. Mobile app API (high-volume API calls)
  5. Analytics platform (time-series data)
- **Goal:** Prove Shared tier multi-tenant performance with radical transparency
- **Results:** Published with no cherry-picking - first run results, warts and all

**Recent Milestones:**
- ✅ Website navigation restructure (2025-10-22) - 3-page incident response pattern
  - Created dedicated incident-response.html (clear crisis guide)
  - Created sitemap.html (visual navigation tree)
  - Removed "When Things Break" confusion from reliability.html
  - Added SOP-004: Monitoring Stack Deployment (1,243 lines)
  - Completed website claims vs SOPs audit (064-DR-AUDIT, 065-DR-AUDIT)
  - Standardized all footers across website
- ✅ Website consistency overhaul (2025-10-21) - Standardized all messaging
  - Support SLA consistent across all pages: "4-hour SLA, typically 30-min"
  - Fixed 16 instances of conflicting response time claims
  - Removed 12 bold tags from table cells (visual hierarchy enforced)
  - Created DISCREPANCY-REPORT.md for full audit trail
- ✅ v1.1.0 pricing model deployed (2025-10-21)
- ✅ Updated all cost comparisons with Oct 2025 pricing (AWS $303, GCP $403)
- ✅ Created rollback points and GitHub release (v1.1.0, v1.1.0-rollback)
- ✅ Testing infrastructure directory created: `testing/local-customer-databases/`
- ✅ Backend 85% production-ready

---

## 🚀 Quick Start for Developers

**Just joining this project? Start here:**

1. **Read the session handoff:** [000-docs/061-PM-HAND-session-handoff-2025-10-20.md](000-docs/061-PM-HAND-session-handoff-2025-10-20.md)
2. **Read the security audit:** [000-docs/059-DR-AUDIT-comprehensive-security-audit.md](000-docs/059-DR-AUDIT-comprehensive-security-audit.md)
3. **Check CLAUDE.md** for updated backend documentation
4. **Test infrastructure:** [testing/local-customer-databases/](testing/local-customer-databases/) - 5 database testing setup

**Backend is 85% production-ready.** Missing: Resend API key, UptimeRobot setup, production secrets.

**Default Admin Login (CHANGE IN PRODUCTION):**
- Email: `admin@costplusdb.com`
- Password: `Admin123!ChangeMe`

**Test Authentication:**
```bash
cd backend
./test-auth.sh
```

---

## What is CostPlusDB?

### The Problem

Cloud database services charge massive markups with zero transparency:
- AWS RDS charges $303/month for infrastructure that costs them $12
- That's a **2,425% markup**
- Complex pricing calculators hide the real costs
- Surprise charges and hidden fees are standard practice

### The Solution

**Cost-plus pricing:** You pay our actual infrastructure cost + a transparent, fair margin.

We show you exactly what we pay. You pay that + 25%. That's it.

### The Difference

```
Example: 8GB RAM, 200GB Storage, 4 vCPU PostgreSQL Database

AWS RDS Equivalent:        $303/month
Google Cloud SQL:          $403/month
DigitalOcean Managed DB:   $120/month

Our Infrastructure Cost:    $12/month
Your Price:                 $119/month
Our Margin:                 $107/month

You Save:                   $184/month (61% vs AWS)
```

**The difference?** We show our costs. They don't.

---

## Key Features

### Core Database Infrastructure
- **PostgreSQL 16** - Latest stable version with modern features
- **SSL/TLS Enforced** - All connections encrypted, no exceptions
- **Dedicated Resources** - Your database, your VPS (Dedicated tier and above)
- **Connection Pooling** - pgBouncer included for efficient connections

### Security & Compliance
- **Daily Encrypted Backups** - pgBackRest with Wasabi S3 storage
- **30-Day Retention** - Point-in-time recovery for 7 days
- **Multi-Region Redundancy** - Backups stored in multiple geographic locations
- **Automated Monitoring** - 6 active security monitors (Betterstack)
- **Intrusion Prevention** - fail2ban, UFW firewall, SSH key auth only
- **Security Audits** - Pre-launch audit completed, findings addressed

### Operational Transparency
- **All SOPs Published** - Every operational procedure is public
- **Cost Breakdowns** - See exactly what you're paying for
- **Security Practices** - Our entire security model is documented
- **Incident Reports** - We publish what went wrong and how we fixed it

---

## Pricing

We offer four tiers with transparent pricing:

| Tier | Storage | RAM | Price | Our Cost | Margin |
|------|---------|-----|-------|----------|--------|
| **Shared** | 5GB | 2GB | $59/mo | ~$2/mo | $57/mo |
| **Dedicated** | 25GB | 8GB | $119/mo | ~$12/mo | $107/mo |
| **Pro** | 50GB | 16GB | $179/mo | ~$20/mo | $159/mo |
| **Enterprise** | 100GB | 32GB | $299/mo | ~$30/mo | $269/mo |

**All tiers include:**
- PostgreSQL 16 managed hosting
- Daily encrypted backups
- 24/7 uptime monitoring
- Email support (4-hour SLA, M-F 9am-6pm ET)
- No hidden fees, no surprise charges

**Compare to AWS RDS equivalent:**
- Dedicated Tier (8GB RAM, 200GB): **AWS charges $303/mo** vs our $119/mo
- That's **$184/month savings** or **$2,208/year**

---

## Quick Start

### 1. Explore & Calculate
- Visit: [https://costplusdb.dev](https://costplusdb.dev)
- Try the pricing calculator: [https://costplusdb.dev/calculator.html](https://costplusdb.dev/calculator.html)
- Review our transparency documentation

### 2. Get Started
- **Early Access:** Email [jeremy@intentsolutions.io](mailto:jeremy@intentsolutions.io)
- **Timeline:** Onboarded within 48 hours
- **Support:** Direct access to the founder

### 3. Onboarding
We'll set up:
- Dedicated PostgreSQL 16 instance
- SSL/TLS certificates
- Daily encrypted backups
- Connection credentials
- Monitoring alerts

---

## Transparency Commitments

Unlike traditional cloud providers, we publish everything:

### Published Standard Operating Procedures
- [005-DR-SOPS-postgresql-operations.md](000-docs/005-DR-SOPS-postgresql-operations.md) - Complete operations manual
- [028-DR-AUDIT-security-pre-launch.md](000-docs/028-DR-AUDIT-security-pre-launch.md) - Security audit and findings
- [021-DR-FORM-customer-onboarding-intake.md](000-docs/021-DR-FORM-customer-onboarding-intake.md) - Onboarding process

### What We Show (And Competitors Hide)
- Exact infrastructure costs
- Profit margins per tier
- Security implementation details
- Backup and recovery procedures
- Incident response protocols
- Cost breakdowns on every invoice

### Our Values
1. **Transparency over tricks** - Show all costs, always
2. **Fair margins** - 25% markup is sustainable and honest
3. **No BS pricing** - No hidden fees, no surprise charges
4. **Customer choice** - Pick your infrastructure provider
5. **Human support** - Solo founder who actually responds

---

## Tech Stack

### Database
- **PostgreSQL 16** - Latest stable with modern features
- **pgBackRest** - Enterprise-grade backup and recovery
- **pgBouncer** - Connection pooling and management

### Infrastructure
- **Contabo VPS** - Primary infrastructure provider
- **Ubuntu 24.04 LTS** - Stable, secure, long-term support
- **Wasabi S3** - Encrypted backup storage with multi-region redundancy

### Security
- **fail2ban** - Intrusion prevention and rate limiting
- **UFW Firewall** - Network access control
- **SSL/TLS** - Let's Encrypt certificates, auto-renewed
- **SSH Key Auth** - Password authentication disabled

### Monitoring
- **Betterstack** - 24/7 uptime monitoring (6 active monitors)
- **Custom Scripts** - Security event monitoring and alerting
- **Email Alerts** - Instant notifications via Resend

---

## Repository Structure

```
cost-plus-db/
├── 000-docs/           # All documentation (31 comprehensive files)
│   ├── 001-PP-PLAN-costplusdb-overview.md
│   ├── 002-PP-PLAN-pricing-structure.md
│   ├── 005-DR-SOPS-postgresql-operations.md
│   ├── 028-DR-AUDIT-security-pre-launch.md
│   └── ... (27 more files)
│
├── 001-security/       # Security scans and procedures
│   ├── scans/          # Gitleaks reports
│   ├── documentation/  # Security procedures
│   └── procedures/     # Credential rotation, git cleanup
│
├── backend/            # ✅ Backend API (PRODUCTION READY - 85%)
│   ├── src/
│   │   ├── api/        # Routes, controllers, middleware
│   │   ├── services/   # Business logic (auth, email, stripe)
│   │   ├── database/   # Migrations, seeds, repositories
│   │   └── utils/      # Logger, errors, validators
│   ├── scripts/        # Backup automation
│   ├── ecosystem.config.js  # PM2 process manager
│   └── test-auth.sh    # Authentication testing
│
├── website/            # Public website (costplusdb.dev)
│   ├── index.html      # Landing page
│   ├── calculator.html # Pricing calculator
│   └── transparency/   # Transparency documentation
│
├── scripts/            # Operational automation (future)
└── CLAUDE.md           # AI assistant guidance (UPDATED)
```

---

## Project Status

**Current Phase:** Backend Production Ready (85%) - Email/Monitoring Configuration Needed

### ✅ What's Complete
- **Backend API:** Production-ready authentication, routes, database (85%)
- **Security:** 4-phase security implementation complete
  - Phase 1: Security audit with Gitleaks
  - Phase 2: JWT authentication (express-jwt, jsonwebtoken, argon2)
  - Phase 3: PM2, automated backups, deployment checklist
  - Phase 4: Comprehensive documentation & audit
- **Authentication:** 5/5 tests passed, OWASP-compliant
- **Documentation:** 61 comprehensive documents (20 added this session)
- **Website:** Live at [costplusdb.dev](https://costplusdb.dev)
- **Infrastructure SOPs:** Complete PostgreSQL operations manual

### ⏳ What's Needed (15% to Production)
- **Email Alerts:** Get Resend API key (5 min) + enable notifications
- **Monitoring:** Set up UptimeRobot (10 min)
- **Secrets:** Change default admin password, generate production JWT_SECRET
- **Time to Production:** 2-4 hours after completing above

### What We're Building
- **Month 1:** First 10 customers, gather feedback
- **Month 2:** Automated customer onboarding
- **Month 3:** 30-day backup retention, advanced monitoring
- **Month 6+:** SOC 2 compliance preparation
- **Month 12+:** HIPAA compliance support

### What We're Honest About
We're NOT launching with:
- ❌ 99.999% uptime SLA (we promise 99.9%)
- ❌ HIPAA compliance (Month 12+ roadmap)
- ❌ SOC 2 certification (following standards, not certified yet)
- ❌ Phone support (email/Slack only)

---

## Documentation

Browse all 31 documentation files in the [000-docs/](000-docs/) directory:

### Key Documents

**Start Here (New Session Handoff):**
- [061-PM-HAND-session-handoff-2025-10-20.md](000-docs/061-PM-HAND-session-handoff-2025-10-20.md) - **READ THIS FIRST** - Complete session handoff
- [059-DR-AUDIT-comprehensive-security-audit.md](000-docs/059-DR-AUDIT-comprehensive-security-audit.md) - Complete security audit (800 lines)
- [057-OD-DEPL-production-deployment-checklist.md](000-docs/057-OD-DEPL-production-deployment-checklist.md) - Deployment guide (19 sections, 100+ items)

**Business & Planning:**
- [001-PP-PLAN-costplusdb-overview.md](000-docs/001-PP-PLAN-costplusdb-overview.md) - Complete business blueprint
- [002-PP-PLAN-pricing-structure.md](000-docs/002-PP-PLAN-pricing-structure.md) - Pricing philosophy and calculations

**Operations:**
- [005-DR-SOPS-postgresql-operations.md](000-docs/005-DR-SOPS-postgresql-operations.md) - PostgreSQL operations manual
- [028-DR-AUDIT-security-pre-launch.md](000-docs/028-DR-AUDIT-security-pre-launch.md) - Security audit report

### Categories
- **Business Plans (PP-PLAN):** Overview, pricing, cost calculations
- **Operations (DR-SOPS):** PostgreSQL operations, security implementation
- **Guides (DR-GUID):** Onboarding, backups, database migration
- **Audits (DR-AUDIT):** Security, documentation, website compliance
- **Tasks (PM-TASK):** Launch checklists, automation setup

---

## Contributing

This is a solo project by Jeremy Longshore. While not actively seeking contributions, I'm open to:
- Security vulnerability reports (please email privately)
- Feedback on documentation clarity
- Suggestions for transparency improvements

**Please do not submit PRs without prior discussion.**

---

## Contact

**Founder:** Jeremy Longshore
- **Email:** [jeremy@intentsolutions.io](mailto:jeremy@intentsolutions.io)
- **Website:** [jeremylongshore.com](https://jeremylongshore.com)
- **GitHub:** [@jeremylongshore](https://github.com/jeremylongshore)
- **Company:** intent solutions io

**Project Links:**
- **Website:** [https://costplusdb.dev](https://costplusdb.dev)
- **Calculator:** [https://costplusdb.dev/calculator.html](https://costplusdb.dev/calculator.html)
- **GitHub:** [https://github.com/jeremylongshore/cost-plus-db](https://github.com/jeremylongshore/cost-plus-db)

---

## License

- **Documentation:** [Creative Commons Attribution-ShareAlike 4.0 International (CC-BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/)
- **Code:** [MIT License](LICENSE)

You are free to:
- Use our documentation to build your own transparent service
- Share and adapt our operational procedures
- Learn from our cost-plus pricing model

We only ask that you:
- Give credit where credit is due
- Share your improvements under the same license
- Consider adopting transparent pricing yourself

---

## Why CostPlusDB Exists

Cloud database services charge 500-2000% markups and hide behind complex pricing calculators. This is standard practice, but it doesn't have to be.

**CostPlusDB exists to prove that:**
1. You can run a sustainable database service with transparent pricing
2. Customers deserve to know what they're paying for
3. Fair margins (25%) are better than massive markups (2000%)
4. Publishing your SOPs makes you more secure, not less

If you believe in transparent pricing and fair margins, we'd love to have you as a customer.

**Get started:** [jeremy@intentsolutions.io](mailto:jeremy@intentsolutions.io)

---

*Built with transparency. Priced with fairness. Operated with integrity.*
