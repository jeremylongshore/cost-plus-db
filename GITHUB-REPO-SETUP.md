# GitHub Repository Setup Guide

This file contains the recommended settings for making the CostPlusDB repository public.

---

## Repository Description

**Short description (max 350 characters):**

```
Transparent PostgreSQL hosting at cost + 25%. No hidden fees. Published benchmark results, operational SOPs, and pricing breakdowns. See real multi-tenant performance (297 TPS @ 13.45ms with 5 concurrent customers). Pre-launch.
```

**Alternative (more casual):**

```
PostgreSQL hosting with radical transparency. We show our costs, you pay cost + 25%. Published benchmarks, SOPs, and pricing. No BS. Pre-launch (accepting first 5 customers).
```

---

## Repository Topics (Tags)

**Recommended topics for GitHub** (select 10-20):

### Core Topics
- `postgresql`
- `database`
- `managed-database`
- `database-hosting`
- `postgresql-16`

### Business Model
- `transparent-pricing`
- `cost-plus`
- `pricing-transparency`
- `fair-pricing`
- `open-business`

### Technical
- `pgbackrest`
- `pgbouncer`
- `database-backup`
- `database-monitoring`
- `nodejs`
- `typescript`
- `express`
- `sqlite`

### Operations
- `devops`
- `sops`
- `standard-operating-procedures`
- `infrastructure`
- `benchmarking`
- `pgbench`

### Philosophy
- `transparency`
- `honesty`
- `no-bullshit`
- `customer-first`

**Final selection (max 20):**
```
postgresql, database, managed-database, transparent-pricing, cost-plus, pgbackrest,
benchmarking, pgbench, nodejs, typescript, database-hosting, pricing-transparency,
devops, sops, infrastructure, postgresql-16, honesty, no-bullshit, open-business,
fair-pricing
```

---

## Repository Settings

### About Section

**Website URL:** `https://costplusdb.dev`

**Description:** Use one of the short descriptions above

**Topics:** Use the 20 topics listed above

**Include in the home page:**
- ✅ Releases
- ✅ Packages (if applicable)
- ❌ Deployments (handled by Netlify)

### Social Preview Image

**Recommended:** Create a simple social card showing:
- "CostPlusDB"
- "PostgreSQL hosting at cost + 25%"
- "Benchmark: 297 TPS @ 13.45ms (5 concurrent customers)"
- "Radically transparent"

**Dimensions:** 1280x640px (2:1 ratio)

---

## Repository Features

### Wikis
❌ Disabled - All documentation is in `000-docs/`

### Issues
✅ Enabled - For bug reports, security issues, and feedback

**Issue Templates:**

1. **Bug Report**
2. **Feature Request**
3. **Security Vulnerability** (private reporting enabled)
4. **Documentation Improvement**

### Discussions
✅ Enabled - For questions, feedback, transparency discussions

**Discussion Categories:**
- General
- Q&A
- Ideas (feature requests)
- Pricing & Transparency
- Performance & Benchmarks
- Show and Tell (customer stories)

### Projects
❌ Disabled - Using Taskwarrior internally

### Actions
❌ Disabled - Using Netlify for deployments

---

## README Badges

Add these badges to the top of README.md:

```markdown
[![Website](https://img.shields.io/badge/website-costplusdb.dev-blue)](https://costplusdb.dev)
[![Benchmarks](https://img.shields.io/badge/benchmarks-297_TPS-green)](https://costplusdb.dev/benchmarks/)
[![Status](https://img.shields.io/badge/status-pre--launch-yellow)](https://github.com/jeremylongshore/cost-plus-db)
[![License](https://img.shields.io/badge/license-MIT%20%2B%20CC--BY--SA-green)](LICENSE)
```

---

## LICENSE File

Current license structure:
- **Code (backend, website):** MIT License
- **Documentation:** CC-BY-SA 4.0

**Recommended:** Create a `LICENSE` file that clarifies the dual license:

```
This repository contains both open-source and proprietary content:

MIT LICENSE (Code):
- Backend source code (backend/)
- Website source code (website/)
- Testing scripts (testing/)

CC-BY-SA 4.0 (Documentation):
- Documentation files (000-docs/)
- Standard Operating Procedures
- Benchmark reports

PROPRIETARY (Not Licensed):
- Business strategy documents (000-docs/*-PP-PLAN-*)
- Customer data structures
- Production configurations (gitignored)

See full license texts in LICENSE-MIT and LICENSE-CC-BY-SA files.
```

---

## Security Policy (SECURITY.md)

Create a `SECURITY.md` file:

```markdown
# Security Policy

## Supported Versions

CostPlusDB is currently in pre-launch. All security updates will be applied to the main branch.

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |

## Reporting a Vulnerability

**Email:** security@intentsolutions.io OR jeremy@intentsolutions.io

**Subject line:** SECURITY: [brief description]

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### What to Expect

1. **Acknowledgment:** Within 24 hours
2. **Initial assessment:** Within 72 hours
3. **Fix timeline:** Provided within 1 week
4. **Credit:** We'll credit you in our security log (if desired)

### Our Commitments

- We will not take legal action against good-faith security researchers
- We will keep you updated on our progress
- We will publicly acknowledge your contribution (with your permission)

### Out of Scope

- Social engineering attacks
- Physical attacks
- Denial of Service (DoS/DDoS)
- Issues in third-party services (report to them directly)
- Issues requiring MITM or physical access to infrastructure

## Security Transparency

- All infrastructure SOPs are public: [000-docs/005-DR-SOPS-postgresql-operations.md](000-docs/005-DR-SOPS-postgresql-operations.md)
- Security audit completed: [000-docs/059-DR-AUDIT-comprehensive-security-audit.md](000-docs/059-DR-AUDIT-comprehensive-security-audit.md)
- Emergency procedures: [000-docs/006-DR-SOPS-emergency-response.md](000-docs/006-DR-SOPS-emergency-response.md)

## Contact

**General security questions:** jeremy@intentsolutions.io
**Urgent security issues:** Same email with SECURITY in subject

We respond to all security emails within 24 hours.
```

---

## .github Folder

Create `.github/` folder with:

### FUNDING.yml (Optional)

```yaml
# Funding options for CostPlusDB
github: # jeremylongshore (if you set up GitHub Sponsors)
custom: ['https://costplusdb.dev/calculator.html']
```

### CODEOWNERS

```
# CostPlusDB Code Owners
# Solo project - all changes reviewed by founder

* @jeremylongshore

# Critical infrastructure
/001-security/ @jeremylongshore
/backend/ @jeremylongshore
/website/ @jeremylongshore
```

### PULL_REQUEST_TEMPLATE.md

```markdown
## Description
<!-- Describe your changes in detail -->

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Checklist
- [ ] I have discussed this change with @jeremylongshore before creating this PR
- [ ] My code follows the code style of this project
- [ ] I have updated the documentation accordingly
- [ ] I have added tests to cover my changes (if applicable)
- [ ] All new and existing tests passed

## Additional Context
<!-- Add any other context about the PR here -->

---

**Note:** This is a solo project. Please discuss significant changes before submitting PRs.
```

---

## Going Public Checklist

Before making the repository public, ensure:

### Security
- [x] Removed `001-security/config/backup/pgbackrest.conf` from git tracking
- [x] Verified `.gitignore` excludes all sensitive files
- [ ] Reviewed git history for accidentally committed secrets (run `git log --all --full-history -- "001-security/config/backup/pgbackrest.conf"`)
- [ ] Consider using BFG Repo-Cleaner if secrets were found in history

### Documentation
- [x] Updated README.md with current status
- [x] Updated CHANGELOG.md with v1.3.0
- [ ] Created SECURITY.md
- [ ] Created LICENSE file
- [ ] Verified all links work (especially in README)

### Repository Settings
- [ ] Added repository description
- [ ] Added repository topics (tags)
- [ ] Set website URL to https://costplusdb.dev
- [ ] Enabled Discussions
- [ ] Enabled Issues
- [ ] Created issue templates
- [ ] Disabled Wikis (documentation in repo)

### Social
- [ ] Created social preview image (optional)
- [ ] Announced on Twitter/X
- [ ] Posted on Hacker News (optional)
- [ ] Posted on r/PostgreSQL, r/databases, r/startups (optional)

---

## Recommended Announcement Text

### For Twitter/X:

```
🚀 Making CostPlusDB public

PostgreSQL hosting with radical transparency:
- Show our costs, charge cost + 25%
- Published benchmark results (297 TPS @ 13.45ms, 5 concurrent)
- All SOPs public
- No BS pricing

Pre-launch. First 5 customers get locked-in pricing.

https://github.com/jeremylongshore/cost-plus-db
```

### For Hacker News:

**Title:** Show HN: CostPlusDB – PostgreSQL hosting with transparent pricing and published benchmarks

**Text:**
```
I'm building a PostgreSQL hosting service with radical transparency.

The idea: show customers exactly what infrastructure costs, charge cost + 25%. No hidden fees, no 2000% markups.

What's different:
- Published benchmark results (https://costplusdb.dev/benchmarks/) showing real multi-tenant performance
- All operational SOPs are public (GitHub repo)
- Revised our SLA from 500 TPS to 300 TPS when real testing showed that was honest
- Show profit margins on every invoice

I'm accepting the first 5 customers for pre-launch validation. Feedback welcome.

GitHub: https://github.com/jeremylongshore/cost-plus-db
Website: https://costplusdb.dev
```

---

## Post-Public Monitoring

After going public:

1. **Watch for:** Issues, PRs, discussions, stars
2. **Respond to:** All security reports within 24 hours
3. **Acknowledge:** Feature requests and bug reports within 48 hours
4. **Update:** CHANGELOG.md for all changes
5. **Tag:** Releases for major milestones

---

**Last Updated:** 2025-10-25
