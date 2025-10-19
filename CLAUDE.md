# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CostPlusDB** (formerly FairDB) is a transparent, affordable managed PostgreSQL database service. The project includes business planning documents, standard operating procedures, and infrastructure for providing PostgreSQL databases to customers.

**GitHub Repository**: https://github.com/jeremylongshore/cost-plus-db.git

## Project Status

This is an **early-stage project** currently in the planning and documentation phase. The focus is on:
- Business model development
- Infrastructure SOPs for VPS management and PostgreSQL operations
- Pricing structure and cost calculations
- Customer onboarding workflows

The `backend/` and `scripts/` directories are currently empty, awaiting implementation once planning is finalized.

## Architecture

The project is organized into the following top-level directories:

- `000-docs/` - **All AI-generated documentation must be placed here** (see Documentation Standards below)
- `backend/` - Backend application code (not yet implemented)
- `website/` - Website/frontend code (contains temp CSS from monospace-web)
- `scripts/` - Operational automation scripts (not yet implemented)
- `logs/` - Log files (not committed to git)

## Key Documentation

The `000-docs/` directory contains the complete business and operational documentation:

1. **001-PP-PLAN-costplusdb-overview.md** - Complete technical, business, and client blueprint
2. **002-PP-PLAN-pricing-structure.md** - Pricing tiers and calculations
3. **003-PP-PLAN-complete-launch-guide.md** - Launch checklist and timelines
4. **004-PP-PLAN-cost-calculations.md** - Detailed cost modeling
5. **005-DR-SOPS-postgresql-operations.md** - Comprehensive operational procedures including:
   - VPS setup and hardening
   - PostgreSQL installation and configuration
   - Backup systems (pgBackRest + Wasabi S3)
   - Monitoring, incident response, and maintenance procedures

## Documentation Standards

**CRITICAL**: All AI-generated documentation must be created in the `000-docs/` directory following a strict naming convention.

### Documentation Naming Convention (MANDATORY)

Format: `NNN-CC-ABCD-short-description.md`

- **NNN** = Sequence number (001-999)
- **CC** = Category code (2 letters)
- **ABCD** = Document type (4 letters)
- **description** = 1-4 words, kebab-case

### Common Document Categories

- **PP-PLAN** - Business plans, overviews, pricing
- **AT-ARCH** - Architecture decisions, system design
- **PM-TASK** - Task lists, checklists
- **DR-SOPS** - Standard operating procedures (SOPs)
- **DR-GUID** - User guides, how-tos
- **OD-DEPL** - Deployment guides
- **WA-AUTO** - Automation workflows
- **DC-CODE** - Code documentation
- **TQ-TEST** - Test plans

### Documentation Rules

Before creating any documentation:
1. Check existing files in `000-docs/` to find the next sequence number
2. Choose appropriate category code (PP, AT, PM, DR, OD, WA, DC, TQ)
3. Use correct document type (PLAN, ARCH, TASK, SOPS, GUID, DEPL, AUTO, CODE, TEST)
4. Keep descriptions to 1-4 words in kebab-case

✅ All docs in `000-docs/` directory (no subdirectories)
✅ Follow naming convention strictly
✅ Increment sequence numbers based on existing files
❌ Never create docs outside `000-docs/`
❌ No duplicate documentation

### Examples

```
001-PP-PLAN-costplusdb-overview.md
002-PP-PLAN-pricing-structure.md
003-PM-TASK-launch-checklist.md
004-DR-SOPS-customer-provisioning.md
005-DR-SOPS-postgresql-operations.md
```

## Operational Context

The SOPs in `005-DR-SOPS-postgresql-operations.md` define the complete operational framework for managing PostgreSQL instances on VPS infrastructure. When working with SOPs:

- **Infrastructure Provider**: Contabo VPS (primary) - Ubuntu 24.04 LTS
- **Database**: PostgreSQL 16 with SSL/TLS
- **Backup System**: pgBackRest with Wasabi S3-compatible storage
- **Security**: UFW firewall, fail2ban, SSH key authentication only
- **Naming Convention**: References to "FairDB" in SOPs should be understood as "CostPlusDB" (rebranding in progress)

## Development

**Current State**: The project is in the planning/documentation phase.

**Future Development**: Once SOPs are finalized and infrastructure is operational:
- `backend/` - Will contain customer provisioning automation, billing, and API services
- `scripts/` - Will contain operational automation scripts referenced in SOPs
- `website/` - Will contain marketing site and customer dashboard
