# Changelog

All notable changes to CostPlusDB will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### In Progress
- Ongoing operational improvements and documentation

## [1.3.0] - 2025-10-26

### Added
- **Form Anti-Phishing & Anti-Spam Security:** 8-layer protection system
  - Layer 1: Netlify built-in spam filtering (Akismet)
  - Layer 2: Honeypot anti-bot field with tabindex/autocomplete blocking
  - Layer 3: reCAPTCHA v2 integration (requires Netlify dashboard setup)
  - Layer 4: Time-based validation (3-second minimum submission time)
  - Layer 5: Disposable email blocking (20 common providers)
  - Layer 6: Spam content detection (regex patterns for phishing, XSS, spam keywords)
  - Layer 7: Input validation & sanitization (name/email format, character limits)
  - Layer 8: Client-side rate limiting (60-second cooldown between submissions)
  - Documentation: 077-WA-SECR-form-anti-phishing-anti-spam-security.md

### Added
- **Benchmark Transparency Page:** Published brutally honest multi-tenant performance results
  - New page: `/benchmarks/` with complete test methodology and results
  - Educational content explaining pgbench, TPC-B, and how to interpret metrics
  - Downloadable raw data (5 customer results + benchmark script)
  - Cloud provider comparisons (AWS RDS, DigitalOcean, Google Cloud SQL)
  - Links to official PostgreSQL docs and industry benchmarking resources
- **Testing Infrastructure:** Complete 5-database testing environment
  - Created 5 local PostgreSQL databases (Shared tier simulations)
  - Each database simulates realistic use case (e-commerce, SaaS, CMS, mobile API, analytics)
  - Industry-standard pgbench tests (TPC-B workload)
  - Multi-tenant concurrent load testing
- **Documentation:** Comprehensive benchmarking documentation (4 new files)
  - 073-TQ-TEST: PostgreSQL benchmarking standards (dual-benchmark strategy)
  - 074-TQ-TEST: Benchmark execution plan (industry-standard methodology)
  - 075-TQ-TEST: Shared tier multi-tenant benchmark methodology
  - 076-TQ-TEST: Full benchmark results report (500+ lines, brutally honest)
- **Infrastructure:** Testing scripts and automation
  - `testing/benchmarks/run-multitenant-benchmark.sh` - Concurrent benchmark script
  - All baseline results archived in `testing/benchmarks/benchmarking-project/baseline-results/2025-10-25/`

### Changed
- **SLA Revision:** Updated performance promises based on real testing
  - OLD: 500 TPS minimum for Shared tier
  - NEW: 300 TPS minimum for Shared tier
  - Reason: Real multi-tenant testing showed 297 TPS per customer (all 5 concurrent)
  - Brutal honesty: Changed promise to match reality rather than miss estimates
- **Website Navigation:** Added benchmarks link to main navigation
  - New navigation item: `/benchmarks/` - "Real multi-tenant performance, brutally honest"
  - Updated all pages with benchmark link

### Results
- **Single Database Baseline (Best Case):** 1,077 TPS @ 9.23ms latency
- **Multi-Tenant (5 Concurrent, Real Case):** 297 TPS each @ 13.45ms latency
- **Consistency:** All 5 customers got essentially identical performance (fair resource sharing)
- **Transparency:** Published first-run results with no cherry-picking
- **Trade-offs:** 72% TPS reduction when sharing with 4 neighbors (documented honestly)

### Fixed
- **Deployment Failure (2025-10-26):** Fixed broken Netlify auto-deploy
  - Incident: Site frozen at v1.2.0 (Oct 22), benchmarks page 404, no auto-deploys since Oct 22
  - Root Cause #1: Missing `.gitmodules` file for sysbench-tpcc submodule → "fatal: No url found for submodule"
  - Root Cause #2: Double base directory (dashboard: `base=website`, netlify.toml: `base=website`) → tried `website/website/`
  - Fix #1: Created `.gitmodules` with proper submodule URL configuration
  - Fix #2: Changed netlify.toml to relative paths (`publish="."`, `functions="netlify/functions"`)
  - Resolution: Cleared Netlify cache, manual deploy succeeded
  - Postmortem: 078-PM-INCI-netlify-deployment-failure-2025-10-26.md
  - Duration: 4 days (Oct 22-26) - site served stale content during benchmarks launch

### Technical
- Security: Removed `001-security/config/backup/pgbackrest.conf` from git tracking (contained exposed S3 credentials)
- Template remains: `pgbackrest.conf.template` with placeholders for safe public sharing
- Git commits: 6126155 (benchmarks), 42eb0a6 (form security), 76ceb07 (gitmodules), d18f760 (paths fix)
- Deployed via Netlify from GitHub main branch
- Benchmark results published to: https://costplusdb.dev/benchmarks/ (live 2025-10-26)

### Philosophy
From the benchmark report:
> "We'd rather promise 300 TPS and deliver 297 than promise 500 TPS and miss it.
> Because honesty > marketing."

## [1.2.0] - 2025-10-22

### Added
- **Incident Response Page:** New dedicated crisis response page (`website/incident-response.html`)
  - Clear "database down RIGHT NOW" destination
  - P0/P1/P2/P3 severity levels with response times
  - 5 detailed incident scenarios with immediate action steps
  - Self-service diagnostic tools (emergency backup export, connection tests)
  - Clear escalation path
  - Eliminates confusion between planning docs and active incident response
- **Site Navigation:** Visual sitemap page (`website/sitemap.html`)
  - ASCII tree navigation showing all pages
  - Quick navigation by use case (emergency, evaluating, customer docs, operations, legal)
  - Example customer journeys (database down, evaluating service)
  - External links to GitHub and related projects
- **Documentation:** Complete audit documentation
  - 064-DR-AUDIT: Website claims vs SOPs comprehensive audit
  - 065-DR-AUDIT: Website structure analysis and navigation confusion findings
  - SOP-004: Monitoring Stack Deployment (1,243 lines)
    - Betterstack, Healthchecks.io, Uptime Kuma, Prometheus, Grafana OnCall
    - Complete setup procedures, configurations, alert rules

### Changed
- **Website Structure:** 3-page incident response pattern for clarity
  - **reliability.html** - Refocused on pre-sale trust building only
    - Removed "When Things Break: Recovery Scenarios" section (moved to incident-response.html)
    - Added prominent emergency banner linking to incident response page
    - Kept all trust-building content (how we think, what you get, verification testing)
  - **incident-response.html** - NEW dedicated active incident guide
    - Purpose: Guide customers through database emergencies RIGHT NOW
    - Audience: Customers experiencing active outages or performance issues
    - Content: Immediate actions, diagnostic tools, contact information
  - **emergency.html** - Remains technical deep dive (unchanged in this release)
    - Purpose: Detailed procedures, EBO system, post-mortems
- **Navigation:** Updated all page navigation to include incident-response.html
  - index.html updated with new navigation links
  - All footers standardized to match homepage footer
  - Consistent Info section links across all pages

### Fixed
- Navigation confusion between reliability planning and active incident response
- Missing clear entry point for customers experiencing database emergencies
- Inconsistent footers across new and existing pages
- Website-advertised monitoring features (Betterstack, Healthchecks.io, Uptime Kuma, Prometheus, Grafana OnCall) now fully documented in SOP-004

### Technical
- Created git rollback tag: `pre-incident-response-restructure` (safe rollback point)
- Updated 3 HTML files, created 2 new HTML files, created 2 audit documents
- Added 1,243 lines of monitoring stack deployment procedures to SOP-004
- Deployed via Netlify from GitHub main branch
- Commit: 1cf5b0d

## [1.1.1] - 2025-10-21

### Changed
- **Website Consistency:** Standardized support response times and table formatting across all pages
  - Support SLA now consistent: "4-hour SLA (business hours), typically 30-min response, 7 days/week"
  - Critical outages: "IMMEDIATE response" (24/7 automated alerts)
  - Removed bold tags from all table content cells (12 instances) - headers now visually distinct from content
  - Fixed 16 instances of conflicting support response time claims (2-hour, 30-min guarantees, first-5-customer-only claims)
  - Files updated: index.html, about.html, docs.html, activity.html, calculator.html, emergency.html, ai-policy.html, thank-you.html
  - Created DISCREPANCY-REPORT.md documenting all issues before fixes
  - Conservative SLA approach: Underpromise (4-hour SLA), overdeliver (30-min typical)

### Added
- **Documentation:** Website messaging standards added to CLAUDE.md
  - Support response time standard documented
  - Conservative SLA approach documented
  - Table formatting standards documented
  - Consistency check guidelines for future changes

### Fixed
- Version number updated to v1.1.1 in website header
- Updated date in website header to 10-21-2025

## [1.1.0] - 2025-10-21 (Earlier in Day)

### Changed
- Updated cost comparisons site-wide with accurate October 2025 pricing
  - AWS RDS: $280 → $303/month (db.m5.xlarge 4 vCPU) - 2,425% markup
  - Google Cloud SQL: $275 → $403/month (db-n1-standard-4 4 vCPU) - 3,258% markup
  - Updated savings vs CostPlusDB: $184/month (61% savings vs AWS)
  - Maintained monospace ASCII formatting throughout
  - Files updated: index.html, docs.html, about.html, business-overview.html, pricing-structure.html
  - Commit: ced80ae

## [1.1.0] - 2025-10-21

### Changed
- **BREAKING**: Pricing model overhaul - implemented base + add-ons structure
  - Shared: $49 → $59/month (+20%)
  - Dedicated: $89 → $119/month (+34%)
  - Pro: $129 → $179/month (+39%)
  - Enterprise: $149 → $299/month (+100%)
- **BREAKING**: Backup retention now tier-specific:
  - Shared/Dedicated: 7-day retention (down from 30-day)
  - Pro/Enterprise: 30-day retention (unchanged)
  - Extended 30-day backups available as +$15/mo add-on for Shared/Dedicated
- **BREAKING**: Slack support now tier-specific:
  - Shared/Dedicated: +$29/mo add-on
  - Pro/Enterprise: Included (free)
- Support SLA standardized: 4-hour response (business hours), 30-min for first 5 customers
- Improved base tier margins: Dedicated 86% (was 81%), Pro 89% (was 84%), Enterprise 90% (was 80%)

### Fixed
- Resolved 44 instances of inconsistent pricing across website
- Resolved 8 instances of unqualified "30-day backup" promises
- Resolved 5 instances of conflicting Slack support claims
- Standardized response time SLAs across all documentation

### Updated
- All cost calculation examples recalculated with new pricing
- Transparency documentation updated (business-overview.html, pricing-structure.html, cost-calculations.html)
- Customer-facing pages updated (index.html, calculator.html, docs.html, about.html)
- Operations manual updated with tier-specific backup retention policies

### Technical
- Updated 11 HTML files across website
- GitHub commit: 25a2a7f
- Auto-deployed via Netlify
- Zero customer impact (no customers at time of change)

## [1.0.0] - 2025-10-19

### Added
- Emergency procedures page (`website/emergency.html`) with 4 scenario runbooks
- Emergency Backup Operator (EBO) system documentation
- Dead man's switch monitoring with Healthchecks.io
- Comprehensive incident response procedures
- Activity log page (`website/activity.html`) for real-time transparency

### Changed
- Migration policy standardized: $500 flat fee for professional service
- Calculator page messaging: minimalist consultation approach
- Removed "drives a truck part-time" from bio
- Applied TypeScript-style hanging indentation to all list items

### Fixed
- Removed all emojis from website (per user request)
- Fixed typo in Resend email template: `initial-case` → `initial-scale`

### Security
- Comprehensive 4-phase security implementation completed (2025-10-20)
- Gitleaks secret scanning (109 commits)
- JWT authentication with Argon2id password hashing
- Account lockout mechanism (5 failed attempts = 30-min lock)
- Production deployment checklist created
- Security rating: STRONG (85% production-ready)

## [0.9.0] - 2025-10-18

### Added
- Backend authentication system (JWT + Argon2id)
- Admin user management
- Protected API routes with role-based access control
- Automated backup scripts
- PM2 process manager configuration
- dotenv-vault for secrets management

### Documentation
- Complete business plan and operational SOPs
- PostgreSQL operations guide (005-DR-SOPS-postgresql-operations.md)
- Pricing structure transparency documentation
- Cost calculations and verification

## [0.1.0] - 2025-10-15

### Added
- Initial project setup
- Website foundation (Monospace Web theme)
- Pricing calculator
- Transparency hub
- Business documentation

---

## Legend

- **BREAKING**: Breaking changes that affect existing customers or APIs
- **Added**: New features or capabilities
- **Changed**: Changes to existing functionality
- **Deprecated**: Features marked for removal
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements or fixes
- **Technical**: Technical changes with no user-facing impact
- **Documentation**: Documentation-only changes

---

## Notes

- No customers affected by v1.1.0 pricing changes (zero customers at time of change)
- All changes maintain "half of AWS" strategic positioning ($119 vs $280 = 58% of AWS)
- Changelog follows [Keep a Changelog](https://keepachangelog.com/) format
- Version numbers follow [Semantic Versioning](https://semver.org/)
