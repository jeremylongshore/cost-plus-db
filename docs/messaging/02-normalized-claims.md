# Normalized Service Claims - Canonical Statements

**Date:** 2025-10-21
**Purpose:** Single source of truth for all CostPlusDB service claims
**Status:** APPROVED - Use these exact wordings across all properties

---

## PRICING

### Tier Pricing (Monthly)

**CANONICAL STATEMENT:**
```
Shared:      $49/month  (2GB RAM, 5GB storage)
Dedicated:   $89/month  (8GB RAM, 25GB storage)
Pro:         $129/month (16GB RAM, 50GB storage)
Enterprise:  $149/month (32GB RAM, 100GB storage)
```

**Rationale:** Matches README.md. Calculator.html had incorrect specs (8x higher storage).

**Files to Update:**
- `website/calculator.html` lines 143-146 (fix storage: 20GB→5GB, 200GB→25GB, 400GB→50GB, 800GB→100GB)

---

### Add-On Pricing

**CANONICAL STATEMENTS:**

**Slack Support:**
```
- Included free: Pro and Enterprise tiers (always)
- Included free: First 5 customers (all tiers, for life)
- Add-on for everyone else (Shared/Dedicated): +$29/month
- Our cost: $10/month (Slack Connect channel)
- Our margin: $19/month (190%)
```

**High Availability:**
```
+$99/month
```

**Read Replicas:**
```
+$15/month per replica
```

**VPN Access:**
```
+$15/month
```

**Compliance Package:**
```
+$100/month
```

**Premium Infrastructure:**
```
- Hetzner: +$20/month
- DigitalOcean: +$40/month
- Rumble Cloud: +$80/month
```

**Region Selection:**
```
+$10/month for specific datacenter location
```

**Rationale:** Matches pricing calculator and cost calculations.

**Files to Update:**
- `website/security.html` line 259 (clarify: "Slack included with Pro/Enterprise, +$29/mo for Shared/Dedicated")
- `website/about.html` line 215 (same clarification)

---

## SUPPORT & RESPONSE TIMES

### Response Time SLA

**CANONICAL STATEMENT (First 5 Customers):**
```
Response Time: 30 minutes, 7 days a week
Applies to: First 5 customers only
Channels: Email (jeremy@intentsolutions.io)
Critical Issues: 24/7 monitoring with phone alerts
```

**CANONICAL STATEMENT (After First 5):**
```
Response Time: 4 hours during business hours (M-F, 9am-6pm ET)
Critical Issues: 24/7 monitoring with immediate phone alerts
Weekend/After Hours: Email monitored, response by next business day
```

**Rationale:**
- First 5 customers get premium 30-minute response (recently implemented)
- After scaling to 6+ customers, return to sustainable 4-hour SLA
- Automated monitoring is always 24/7 regardless of customer count

**Files to Update:**
- ✅ `website/index.html` line 182 (already correct: "30-minute response (first 5 customers)")
- ✅ `website/docs.html` line 118 (already correct: "30 minutes, 7 days a week")
- ✅ `website/about.html` line 179 (already correct: "30-minute response time")
- ❌ `website/about.html` line 247 (change: "2-hour" → "30-minute, 7 days/week (first 5 customers)")
- ❌ `website/about.html` line 315 (change: "Within 2 hours (business hours)" → "Within 30 minutes, 7 days/week (first 5 customers)")
- ❌ `website/ai-policy.html` line 352 (change: "Within 2 hours (business hours)" → "Within 30 minutes, 7 days/week (first 5 customers)")
- ❌ `website/docs.html` line 370 (change: "Within 2 hours (business hours)" → "Within 30 minutes, 7 days/week (first 5 customers)")
- ❌ `website/docs.html` line 61 (change: "2-hour support response" → "30-minute response (first 5 customers)")
- ❌ `website/transparency/operations-manual.html` line 269 (add qualifier: "4-hour SLA (after first 5 customers), 30-min for early customers")
- ❌ `website/transparency/pricing-structure.html` line 85 (add: "30-min response for first 5 customers, 4-hour SLA after scale")
- ❌ `website/transparency/business-overview.html` line 108 (add: "30-min for first 5, 4-hour SLA after")
- ❌ `website/transparency/cost-calculations.html` line 321 (add: "30-min first 5, 4-hour after")

---

### Support Channels

**CANONICAL STATEMENT:**
```
All Tiers:
- Email: jeremy@intentsolutions.io (always available)
- Critical Issues: 24/7 monitoring with phone alerts to founder

First 5 Customers:
- Email + Slack included FREE for life (all tiers)
- Private Slack Connect channel
- Real-time collaboration

Shared/Dedicated Tiers (after first 5):
- Email support (default)
- Slack available as +$29/month add-on

Pro/Enterprise Tiers (always):
- Email + Slack included (no extra charge)
- Private Slack Connect channel
- Real-time collaboration
```

**Rationale:** Clarifies what's included vs add-on.

---

## UPTIME & AVAILABILITY

### Uptime SLA

**CANONICAL STATEMENT:**
```
Uptime SLA: 99.9% measured monthly
SLA Credit: Pro-rated refund if below 99.9% in any calendar month
Measurement: Automated monitoring via Betterstack (5-minute checks)
Exclusions: Scheduled maintenance (announced 48 hours in advance)
```

**What We DON'T Promise:**
```
❌ 99.999% uptime (five nines) - AWS/GCP territory
❌ Phone support - Email/Slack only
❌ Instant failover - Recovery time ~10-15 minutes
```

**Rationale:** Sets realistic expectations for bootstrapped service.

**Files to Update:**
- `website/security.html` lines 254-258 (clarify table is "What we DON'T promise")

---

## BACKUPS

### Backup Schedule

**CANONICAL STATEMENT:**
```
Schedule: Daily automated backups at 2:00 AM UTC
Frequency:
  - Full backup: Weekly (Sundays)
  - Incremental backup: Daily
Retention: 30 days of daily backups
Storage: Encrypted in Wasabi S3 (multi-region redundancy)
Point-in-Time Recovery: 7 days
Testing: Monthly restoration test (verify backups work)
```

**Rationale:** UTC is standard for distributed systems. Activity log can show local time for human readability.

**Files to Update:**
- `website/activity.html` lines 41, 80, 109, 122, 135 (add: "2:00 AM CST / 8:00 AM UTC" to show both)
- `website/transparency/operations-manual.html` line 124 (already correct: "2am UTC")

---

## INFRASTRUCTURE & SPECS

### VPS Infrastructure Cost

**CANONICAL STATEMENT:**
```
Contabo VPS (Default):
- Cost to us: $10.00/month (VPS) + $2.00/month (backup storage + monitoring)
- Total cost: $12.00/month
- Customer sees: $12/month in cost breakdowns
```

**Rationale:** $10 is raw VPS, $12 is total after backup storage and monitoring costs.

**Files to Update:**
- `website/transparency/cost-calculations.html` (clarify: "$10 VPS + $2 overhead = $12 total")

---

### Database Tier Specifications

**CANONICAL STATEMENT:**
```
Shared Tier:
- RAM: 2GB
- Storage: 5GB
- CPU: Shared (1-2 vCPU)
- Price: $49/month

Dedicated Tier:
- RAM: 8GB
- Storage: 25GB
- CPU: 4 vCPU (dedicated)
- Price: $89/month

Pro Tier:
- RAM: 16GB
- Storage: 50GB
- CPU: 6 vCPU (dedicated)
- Price: $129/month

Enterprise Tier:
- RAM: 32GB
- Storage: 100GB
- CPU: 8 vCPU (dedicated)
- Price: $149/month
```

**Rationale:** Matches README.md pricing table. Calculator had 8x inflated storage numbers.

**Critical Fix Required:**
- ❌ `website/calculator.html` lines 143-146 (fix storage specs)

---

## MARGINS & MARKUP

### Pricing Margins

**CANONICAL STATEMENT:**
```
Base Tier Margins (infrastructure included in base price):
- Shared: ~85% ($49 price - ~$7 cost = $42 profit)
- Dedicated: ~87% ($89 price - ~$12 cost = $77 profit)
- Pro: ~85% ($129 price - ~$20 cost = $109 profit)
- Enterprise: ~80% ($149 price - ~$30 cost = $119 profit)

Add-On Markup:
- Infrastructure upgrades: 25% markup on our cost
- Storage: 25% markup
- Services (Slack, VPN, Compliance): 25% markup

AWS Comparison:
- AWS RDS markup: 2,233% (charges $280 for $12 infrastructure)
- CostPlusDB markup: 80-87% (base tiers) + 25% (add-ons)
```

**Rationale:** Different tiers have different margins. Marketing can say "~85% average" for simplicity.

---

## MONITORING

### Monitoring Coverage

**CANONICAL STATEMENT:**
```
Automated Monitoring (24/7):
- Tool: Betterstack
- Check Frequency: Every 5 minutes
- Metrics Monitored:
  - Uptime (HTTP/HTTPS checks)
  - Response time
  - CPU usage
  - Disk space (alert at <30%)
  - Memory usage
  - Database connections

Alerts:
- Critical: Phone call + SMS to founder (immediate)
- Warning: Email notification
- Response: Manual investigation within response time SLA
```

**Rationale:** Monitoring is automated 24/7, but human response follows SLA.

---

## FEATURES INCLUDED

### All Tiers Include

**CANONICAL STATEMENT:**
```
Included with All Plans:
✓ PostgreSQL 16 (latest stable)
✓ Daily automated backups (30-day retention)
✓ 7-day point-in-time recovery (pgBackRest)
✓ 24/7 uptime monitoring (Betterstack)
✓ SSL/TLS enforced (Let's Encrypt certificates)
✓ Email support (jeremy@intentsolutions.io)
✓ Transparent invoices (see our exact costs monthly)
✓ No hidden fees (fixed 25% markup on add-ons)
✓ Connection pooling (pgBouncer)
✓ SSH key authentication (no password access)
✓ UFW firewall + fail2ban intrusion prevention

Pro/Enterprise Also Include:
✓ Slack Connect channel (private, direct founder access)
✓ Priority feature requests
✓ Dedicated account onboarding
```

**Rationale:** Clear separation between what's included for all vs premium tiers.

---

## EARLY CUSTOMER BENEFITS

### First 5 Customers

**CANONICAL STATEMENT:**
```
What the First 5 Customers Get:
✓ Direct founder access (that's me, Jeremy)
✓ 30-minute email response times, 7 days a week
✓ Slack channel included FREE for life (all tiers - $29/mo value)
✓ 24/7 critical monitoring (alerts go to my phone)
✓ Locked-in pricing forever (your rate never increases)
✓ Direct input on features (roadmap priority)
✓ Hands-on onboarding (30-60 minute setup call)
✓ First 30 days of intensive support

After First 5:
- Response time returns to 4-hour SLA (business hours)
- Standard onboarding process (email-based)
- Slack still included with Pro/Enterprise
```

**Rationale:** Clear benefits for early adopters, realistic long-term model.

---

## LIMITATIONS & HONESTY

### What We DON'T Offer

**CANONICAL STATEMENT:**
```
We're Honest About Our Limits:
❌ 99.999% uptime (we promise 99.9%)
❌ Phone support (email/Slack only)
❌ HIPAA compliance (Month 12+ roadmap)
❌ SOC 2 certification (following standards, not certified yet)
❌ Instant failover (recovery time ~10-15 minutes)
❌ Dedicated account managers (you work with founder directly)
❌ 24/7 human support (monitoring is 24/7, human response follows SLA)
```

**Rationale:** Transparency about bootstrapped service limitations.

---

## USAGE GUIDELINES

### How to Use This Document

**For All Website Updates:**
1. Copy exact wording from "CANONICAL STATEMENT" sections
2. Do not paraphrase or reword
3. If context requires different wording, add note in this doc first

**For New Features:**
1. Add new canonical statement to this document first
2. Get approval before publishing
3. Use exact wording across all properties

**For Conflicts:**
1. This document is source of truth
2. If conflict found, update this doc first
3. Then propagate to all properties

---

## Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2025-10-21 | Initial creation | Service messaging audit identified 11 conflicts |
| 2025-10-21 | Response time: 30min for first 5 | Early customer commitment |
| 2025-10-21 | Storage specs: Fixed calculator.html inflation | README.md is authoritative |
| 2025-10-21 | Slack pricing: Clarified included vs add-on | Customer confusion |
| 2025-10-21 | Backup timezone: Standardized to UTC | Industry standard |

---

## Document Maintenance

**Owner:** Jeremy Longshore (founder)
**Review Frequency:** Monthly or when new features added
**Approval Required:** Yes (founder approval before changes)
**Last Updated:** 2025-10-21

---

**This document is the single source of truth for all CostPlusDB service claims.**
**Any conflicts between this document and live website: this document wins.**
