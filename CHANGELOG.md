# Changelog

All notable changes to CostPlusDB will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### In Progress
- **Testing Infrastructure:** Building comprehensive testing environment
  - ✅ Created GCP project `cost-plus-db` for Vertex AI
  - ✅ Installed Google Cloud SDK
  - ✅ Created testing directory structure: `testing/local-customer-databases/`
  - 🔄 Setting up 5 local PostgreSQL databases (Shared tier simulations)
  - 🔄 Configuring Vertex AI Flash 2.0 for realistic test data generation (free tier)
  - Testing scenarios: e-commerce, SaaS, CMS, mobile API, analytics
  - Goal: Validate all CostPlusDB operations before first customer
  - Testing: Backups, monitoring, incident response, SOPs

### Changed
- **Website Consistency:** Standardized support response times and table formatting across all pages
  - Support SLA now consistent: "4-hour SLA (business hours), typically 30-min response, 7 days/week"
  - Critical outages: "IMMEDIATE response" (24/7 automated alerts)
  - Removed bold tags from all table content cells (12 instances) - headers now visually distinct from content
  - Fixed 11 instances of conflicting support response time claims (2-hour, 30-min guarantees, first-5-customer-only claims)
  - Files updated: index.html, about.html, docs.html, activity.html, calculator.html, emergency.html
  - Created DISCREPANCY-REPORT.md documenting all issues before fixes
  - Conservative SLA approach: Underpromise (4-hour SLA), overdeliver (30-min typical)

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
