# CostPlusDB: Pricing Structure & Business Philosophy

**Product:** CostPlusDB
**Domain:** costplusdb.dev
**Company:** intent solutions io
**Tagline:** "Database hosting at cost + 25%"

---

## Core Business Philosophy

### Radical Transparency
We show you **exactly** what we pay for infrastructure. You pay our cost + 25%. That's it.

### Why Cost-Plus?
- ❌ AWS marks up 5-20x (charges $280 for $12 of infrastructure)
- ❌ Traditional SaaS hides costs behind "tiers"
- ✅ We believe you deserve to know what you're paying for
- ✅ 25% markup is fair, sustainable, and honest

### Our Values
1. **Transparency over tricks** - Show all costs on every invoice
2. **Fair margins** - 25% markup is sustainable for us, fair for you
3. **No BS pricing** - No hidden fees, no surprise charges
4. **Customer choice** - Pick your infrastructure provider
5. **Human support** - Solo founder who actually responds

---

## Pricing Structure

### STANDARD TIERS (Fixed Pricing)

All tiers include Contabo infrastructure by default.

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   SHARED    │  DEDICATED  │     PRO     │ ENTERPRISE  │
│  $49/month  │  $89/month  │ $129/month  │ $149/month  │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ 2GB RAM     │ 8GB RAM     │ 16GB RAM    │ 32GB RAM    │
│ 20GB storage│ 200GB       │ 400GB       │ 800GB       │
│ Shared CPU  │ 4 vCPU      │ 6 vCPU      │ 8 vCPU      │
│ 10 databases│ Dedicated   │ Dedicated   │ Dedicated   │
│ per VPS     │ VPS         │ VPS         │ VPS         │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

**All Tiers Include:**
- ✅ PostgreSQL 16 (latest stable)
- ✅ Daily backups (30-day retention)
- ✅ Point-in-time recovery (7 days)
- ✅ Multi-region backup redundancy
- ✅ 24/7 monitoring (Betterstack)
- ✅ Email support (4-hour SLA, M-F 9am-6pm ET)
- ✅ TLS/SSL encryption
- ✅ Firewall protection
- ✅ Connection pooling (pgBouncer)
- ✅ No surprise charges

**Enterprise Tier Also Includes:**
- ✅ Private Slack Connect channel (+$10/mo our cost)
- ✅ Data Processing Agreement (DPA template)
- ✅ Audit logs
- ✅ Priority support (1-hour response)

**Our Margins on Standard Tiers:**

| Tier       | Our Cost | Your Price | Our Margin |
|------------|----------|------------|------------|
| Shared     | $2/mo    | $49/mo     | 96%        |
| Dedicated  | $12/mo   | $89/mo     | 87%        |
| Pro        | $20/mo   | $129/mo    | 84%        |
| Enterprise | $30/mo   | $149/mo    | 80%        |

*High margins because we show exact costs on add-ons below*

---

### INFRASTRUCTURE UPGRADES (Cost + 25%)

Choose your infrastructure provider. We show you what we pay.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROVIDER COMPARISON (Add to any base tier)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Contabo (Default - Included)
├─ Location: Germany / US
├─ Our cost: $12/month
├─ Your price: Included in base tier
└─ Best for: Budget-conscious, excellent value

Hetzner (+$20/month)
├─ Location: Germany / Finland / US
├─ Our cost: $47/month
├─ Your price: +$20/month (cost × 0.43 markup)
└─ Best for: Developer favorite, EU compliance

Rumble Cloud (+$80/month) [IN EVALUATION - Q2 2026]
├─ Location: United States (multiple regions)
├─ Our cost: $90/month (includes 1TB backup storage)
├─ Your price: +$80/month (cost × 0.89 markup)
├─ Best for: Anti-Big-Tech, transparent fixed pricing
└─ Note: Testing phase - available after service matures

DigitalOcean (+$40/month)
├─ Location: 14 regions worldwide
├─ Our cost: $62/month
├─ Your price: +$40/month (cost × 0.65 markup)
└─ Best for: Enterprise trust, global reach

AWS (Cost + 25%)
├─ Location: Global
├─ Our cost: $73-120/month (varies by region)
├─ Your price: Our cost × 1.25
├─ Example: $73 → $91/month extra
└─ Best for: Maximum compliance (HIPAA, SOC 2)

GCP (Cost + 25%)
├─ Location: Global
├─ Our cost: $73-95/month (varies)
├─ Your price: Our cost × 1.25
└─ Best for: Google Cloud integration

Region Selection (+$10/month)
├─ Choose specific datacenter
├─ EU (GDPR compliance)
├─ US West/East
└─ Asia Pacific
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Launch Timeline:**
- **Day 1:** Contabo + Hetzner available
- **Month 2-3:** Add DigitalOcean
- **Month 4-6:** Add AWS/GCP
- **Month 6-12:** Internal testing of Rumble Cloud
- **Q2 2026:** Rumble Cloud available to customers (if testing successful)

---

### ENTERPRISE ADD-ONS (Cost + 25%)

For customers who need Google/AWS-level features.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENTERPRISE ADD-ONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HIGH AVAILABILITY (Auto-Failover)
├─ What: Primary + standby replica, <60s failover
├─ 99.95% uptime SLA
├─ Our cost: $79/month (2× VPS + orchestration)
├─ Your price: $99/month
└─ Available: Month 6+ (tested thoroughly first)

READ REPLICAS (Scale Reads)
├─ What: Live read-only database copy
├─ Reduce primary database load
├─ Deploy to different regions
├─ Our cost: $12-30/month (depends on tier)
├─ Your price: Cost × 1.25 = $15-38/month per replica
└─ Available: Month 3+

EXTRA STORAGE (Beyond Standard)
├─ Standard limits: Shared 20GB, Dedicated 200GB, Pro 400GB
├─ Our cost: Transparent per GB
├─ Your price: Cost × 1.25
├─ Examples:
│   • +200GB = $4 cost → $5/month
│   • +500GB = $10 cost → $12.50/month
│   • +1TB = $20 cost → $25/month
└─ Available: Day 1

VPN ACCESS (Private Network)
├─ What: WireGuard VPN to database
├─ No public internet exposure
├─ Private IP only
├─ Our cost: $12/month (VPN server or shared)
├─ Your price: $15/month
└─ Available: Month 2+

COMPLIANCE PACKAGE (HIPAA/SOC 2 Ready)
├─ What: BAA signing, audit logs, encryption
├─ Compliance documentation
├─ Quarterly reports
├─ Our cost: $80/month (insurance + overhead)
├─ Your price: $100/month
└─ Available: Month 12+ (legal review required)

MANAGED MIGRATION (One-Time)
├─ What: Zero-downtime migration from AWS/Heroku/anywhere
├─ We handle everything
├─ Our cost: 4 hours @ $40/hour = $160
├─ Your price:
│   • <10GB: $200 one-time
│   • 10-100GB: $500 one-time
│   • 100GB+: $1,000 one-time
└─ Available: Day 1

CUSTOM MONITORING DASHBOARDS
├─ What: Tailored Grafana dashboards for your app
├─ Track specific queries
├─ Custom alerts
├─ Our cost: $40/month (Grafana Pro) + 4 hours setup
├─ Your price: $200 setup + $50/month
└─ Available: Month 6+
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Example Customer Configurations

### Bootstrapped Startup
```
Base: Dedicated tier (Contabo)        $89/month
Add-ons: None

Total: $89/month
Compare to AWS RDS: $280/month
Savings: $191/month (68% cheaper)
```

### EU SaaS Company
```
Base: Dedicated tier                  $89/month
Infrastructure: Hetzner Finland      +$20/month
Region: EU Central                   +$10/month

Total: $119/month
Compare to AWS RDS EU: $380/month
Savings: $261/month (69% cheaper)
```

### Growing Startup (High Traffic)
```
Base: Pro tier                        $129/month
Infrastructure: Contabo (default)     $0
Add-ons:
  • High Availability                 $99/month
  • 2× Read Replicas                  $30/month
  • Extra 200GB storage               $5/month

Total: $263/month
Compare to AWS with replicas: $1,800/month
Savings: $1,537/month (85% cheaper)
```

### Healthcare Startup (HIPAA)
```
Base: Enterprise tier                 $149/month
Infrastructure: AWS (compliance)     +$91/month
Add-ons:
  • Compliance Package                $100/month
  • VPN Access                        $15/month
  • Extra 300GB storage               $8/month

Total: $363/month
Compare to AWS RDS + compliance: $950/month
Savings: $587/month (62% cheaper)
```

### Enterprise (Brand-Conscious CTO)
```
Base: Pro tier                        $129/month
Infrastructure: DigitalOcean         +$40/month
Add-ons:
  • High Availability                 $99/month
  • Read Replica                      $15/month
  • Custom Monitoring                 $50/month

Total: $333/month
Compare to DigitalOcean Managed DB HA: $720/month
Savings: $387/month (54% cheaper)
```

---

## Invoice Transparency

Every customer invoice shows cost breakdown:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CostPlusDB Monthly Invoice - December 2025
Customer: Acme Healthcare Inc.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BASE PLAN
Enterprise Tier                                $149.00

INFRASTRUCTURE UPGRADE (Cost + 25%)
├─ AWS RDS (t3.large, us-east-1)
│  └─ Our cost: $73.00
│  └─ Your price: $91.25

ENTERPRISE ADD-ONS (Cost + 25%)
├─ Compliance Package
│  └─ Our cost: $80.00
│  └─ Your price: $100.00
├─ VPN Access
│  └─ Our cost: $12.00
│  └─ Your price: $15.00
└─ Extra Storage (+300GB)
   └─ Our cost: $6.00
   └─ Your price: $7.50

                                              ──────────
TOTAL THIS MONTH:                              $362.75

Compare to AWS RDS + Compliance:               $950.00
Your Monthly Savings:                          $587.25
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions about our pricing?
We're happy to explain any costs.
support@intentsolutions.io
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## AI-Assisted Support Disclosure

### Transparency About AI Usage

**We use AI to provide better, faster support.**

**What AI helps with:**
- ✅ Drafting support ticket responses (80% of tickets)
- ✅ Analyzing slow query performance
- ✅ Suggesting database optimizations
- ✅ Troubleshooting common issues
- ✅ Generating documentation

**What data goes to AI:**
- ✅ Error messages (anonymized when possible)
- ✅ Query structures (not your actual data)
- ✅ Database performance metrics
- ✅ Your support questions

**What is NEVER sent to AI:**
- ❌ Your actual customer data (row contents)
- ❌ Passwords or credentials
- ❌ Personal identifying information
- ❌ Complete database exports

**Our AI practices:**
- We anonymize data before sending to AI
- We only send technical information, not business data
- AI providers (Anthropic/OpenAI) don't train on our data (Enterprise agreements)
- All AI-assisted responses are reviewed by a human before sending

**Your choice:**
- **Opt out:** Email support@intentsolutions.io to disable AI for your account
- Response times may be slightly longer without AI assistance
- No additional cost either way

**For regulated industries (HIPAA, PCI-DSS):**
- Enterprise tier ($149/mo) uses **local AI only** or **no AI**
- No data sent to third-party AI services
- Required for compliance

---

## Data Access & Privacy Policy

### Can We Access Your Data?

**Yes, technically.** As server administrators, we have the ability to access databases for:
- ✅ Emergency incident response
- ✅ Backup restoration at your request
- ✅ Performance debugging at your request
- ✅ Compliance with legal requirements

### Do We Access Your Data?

**Only when necessary.** We don't:
- ❌ Browse your data
- ❌ Read your customer information
- ❌ Use your data for any purpose
- ❌ Share your data with third parties
- ❌ Train AI models on your data
- ❌ Sell your data

### Audit Trail

All administrative database access is logged:
- Timestamp of access
- Reason for access (ticket number, incident, etc.)
- Actions taken
- Available to you on request

### Your Rights

- **Export your data** anytime (standard pg_dump)
- **Request access logs** to see when/why we accessed your database
- **Delete your data** on cancellation (within 30 days)
- **Encrypted volumes** available (Enterprise tier)

### Compare to Big Cloud

Large providers have **hundreds of engineers** with potential access to your data.

With CostPlusDB, it's **one person** (solo founder) who treats your data like I'd want mine treated.

**Bottom line:** Your trust = my business. I take that seriously.

---

## What's NOT Included (Be Honest)

### Customer Responsibilities

**You handle:**
- ❌ Database schema design
- ❌ SQL query writing
- ❌ Application code debugging
- ❌ ORM configuration
- ❌ Data modeling
- ❌ Learning SQL basics

### Available as Add-Ons

**Complex consulting:**
- $150/hour for advanced architecture help
- Custom replication setups
- Performance tuning for specific workloads

### We Don't Offer (Yet)

**Not available at launch:**
- ❌ 24/7 phone support (email only)
- ❌ Dedicated support engineer (unless you pay $500/mo)
- ❌ SOC 2 certification (available Month 12+)
- ❌ Multi-cloud replication (coming later)

**We're honest about limitations.**

If we can't help, we'll tell you and point you to resources that can.

---

## Break-Even & Growth Projections

### How Many Customers Do We Need?

**Fixed costs:** ~$15/month (domain, tools)

**Break-even:** 1 customer at Shared tier ($49/mo)

**Profitability:**
- 10 customers (Dedicated): $890/mo revenue, $120 costs = **$770/mo profit**
- 50 customers (mix): $4,000/mo revenue, $600 costs = **$3,400/mo profit**
- 100 customers: $8,000/mo revenue, $1,200 costs = **$6,800/mo profit**

**We're profitable from customer #1.**

---

## Why This Model Works

### For Customers

✅ **You know exactly what you're paying for**
✅ **No hidden fees or surprise charges**
✅ **Fair margins (25% vs 500-2000%)**
✅ **Flexibility to choose infrastructure**
✅ **Transparent invoices show our costs**

### For Us

✅ **Sustainable margins (25% on add-ons, 80%+ on base)**
✅ **Simple to explain and market**
✅ **Defensible (can't compete on transparency)**
✅ **Scales with customer needs**
✅ **Builds trust and loyalty**

### For the Industry

✅ **Forces transparency**
✅ **Proves cost-plus can work**
✅ **Challenges exploitative pricing**
✅ **Better for developers and startups**

---

**Last Updated:** October 2025
**Version:** 1.0
**Status:** Production Ready ✅
