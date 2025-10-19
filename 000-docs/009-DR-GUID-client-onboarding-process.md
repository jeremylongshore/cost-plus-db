# Client Onboarding Process - CostPlusDB

**Status:** Ready for first 5 customers
**Last Updated:** 2025-10-19

---

## Overview

This document outlines the professional client onboarding process for CostPlusDB. As a bootstrapped, one-person operation, we deliberately limit initial capacity to **5 customers maximum** to ensure stellar service quality.

---

## Phase 1: Initial Inquiry & Screening

### When Someone Contacts You

**Respond within 4 hours** (business days) with:

```
Subject: Re: CostPlusDB Inquiry - Next Steps

Hi [Name],

Thanks for reaching out about CostPlusDB! I'm Jeremy, and I run this service while driving a truck part-time - so I appreciate your patience.

Before we schedule a call, I want to make sure we're a good fit. Can you answer these quick questions?

1. What's your current database setup? (AWS RDS, Heroku Postgres, self-hosted, etc.)
2. Approximate database size? (GB)
3. Average queries per second? (if known)
4. What tier are you interested in? (Shared $49, Dedicated $89, Pro $129, Enterprise $149)
5. Why are you looking to switch providers?
6. Do you need migration assistance?

Also, please review my transparency docs so you know what you're getting:
- Operations Manual: https://costplusdb.com/transparency/operations-manual.html
- Security Practices: https://costplusdb.com/security.html

I'm currently accepting 5 customers to start (bootstrap model). If we're a fit, I'll send a Calendly link for a 20-minute discovery call.

Talk soon,
Jeremy

--
CostPlusDB - Database hosting at cost + 25%
jeremy@intentsolutions.io
```

### Screening Criteria (Pre-Call)

**Good Fit:**
- ✅ Understand "cost + 25%" model and value transparency
- ✅ Need PostgreSQL (latest version fine)
- ✅ Comfortable with 99.9% SLA (not 99.999%)
- ✅ Okay with email support (4-hour SLA)
- ✅ Database size: <500GB
- ✅ Long-term thinking (not churners)

**Not a Good Fit:**
- ❌ Need 24/7 phone support
- ❌ Require 99.999% uptime SLA
- ❌ Want hand-holding (need PostgreSQL basics)
- ❌ Price shopping (will leave for $5/mo savings)
- ❌ Need HIPAA compliance immediately (Month 12+ only)
- ❌ Enterprise with SOC 2 requirement

**If not a good fit, respond:**

```
Hi [Name],

Thanks for the details! After reviewing your requirements, I don't think CostPlusDB is the best fit right now.

[Specific reason: e.g., "You need 24/7 phone support, and I only offer email support with 4-hour SLA."]

I'd recommend:
- AWS RDS (for enterprise SLAs and phone support)
- DigitalOcean Managed Databases (good middle ground)
- Railway.app (for startups wanting simplicity)

I appreciate your interest and wish you the best!

Jeremy
```

---

## Phase 2: Discovery Call (20 Minutes)

### Scheduling

Use Calendly (or similar) to schedule 20-minute slots:
- **Availability:** Tuesday/Thursday, 10 AM - 2 PM CST
- **Platform:** Google Meet or phone
- **Preparation:** Review their email answers before call

### Discovery Call Script

**[0-5 min] Introductions**

"Hi [Name], I'm Jeremy. Quick background: I run CostPlusDB as a bootstrapped side project while driving a truck to pay bills. This isn't a VC-funded startup - it's me, being honest about pricing, trying to help folks like you save money on database hosting.

Tell me about your project and why you're interested in CostPlusDB?"

**[5-10 min] Technical Discussion**

Ask:
1. "Walk me through your current database setup."
2. "What's your pain point with your current provider?"
3. "What's your database size and growth rate?"
4. "Do you have any compliance requirements? (HIPAA, SOC 2, etc.)"
5. "What's your acceptable downtime? (helps set expectations)"

**[10-15 min] Set Expectations**

Be transparent:

"Let me be clear about what you're getting and what you're NOT getting:

**What you GET:**
- PostgreSQL 16 (latest stable), fully managed
- Daily encrypted backups to Wasabi S3 cloud (7-day point-in-time recovery)
- 99.9% uptime SLA (measured monthly, pro-rated refund if we miss)
- Email support, 4-hour response time (business hours)
- Transparent invoicing - you see my exact costs every month

**What you DON'T GET:**
- 24/7 phone support (I'm driving a truck sometimes)
- 99.999% uptime (unrealistic for bootstrapped service)
- Hand-holding (you should know PostgreSQL basics)
- Enterprise account manager or fancy dashboard (coming Month 6-12)

Sound fair?"

**[15-18 min] Pricing Discussion**

"Let's talk pricing. Based on what you told me:
- Tier: [Shared/Dedicated/Pro/Enterprise]
- Your database size: [X GB]
- My infrastructure cost: $[Y]
- Your monthly price: $[Y × 1.25]

I'll send you a transparent invoice every month showing:
- VPS cost: $X.XX
- Wasabi backup storage: $X.XX
- Total cost: $X.XX
- My 25% markup: $X.XX
- Your price: $X.XX

No hidden fees. Ever."

**[18-20 min] Next Steps**

"If this sounds good, here's what happens next:
1. I'll send you a Service Agreement (simple 1-page doc)
2. You review, sign, and pay first month
3. I provision your database within 24-48 hours
4. You get connection credentials via email
5. We schedule a migration window (if needed)

Any questions?"

**Ending:**

"Thanks for the call, [Name]. I'll email you the Service Agreement by [time]. If you decide to move forward, welcome aboard! If not, no hard feelings - I appreciate your time."

---

## Phase 3: Service Agreement

### Simple 1-Page Service Agreement

**Send this via DocuSign, HelloSign, or PDF for signature:**

```markdown
# CostPlusDB Service Agreement

**Customer:** [Customer Name]
**Database Tier:** [Shared/Dedicated/Pro/Enterprise]
**Monthly Price:** $[X.XX] (infrastructure cost + 25%)
**Effective Date:** [Start Date]

## Services Provided

CostPlusDB ("Provider") will provide:
- PostgreSQL 16 managed database hosting
- Daily encrypted backups with 7-day point-in-time recovery
- 99.9% uptime SLA (measured monthly)
- Email support (4-hour response time, business hours: Mon-Fri 9 AM - 5 PM CST)
- Transparent monthly invoicing showing infrastructure costs

## Customer Responsibilities

Customer agrees to:
- Maintain valid payment method
- Have working knowledge of PostgreSQL
- Provide 30-day notice for cancellation
- Not use service for illegal purposes or cryptocurrency mining

## Service Level Agreement (SLA)

- **Uptime Target:** 99.9% (measured monthly)
- **Downtime Credit:** Pro-rated refund if below 99.9%
- **Support Response:** 4-hour email response (business hours)
- **Backup Retention:** 30 days full backups, 7 days point-in-time recovery

## Pricing & Payment

- **Monthly billing** via Stripe/PayPal/Invoice
- **Transparent invoicing** - see exact infrastructure costs
- **No hidden fees** - price is cost + 25%, period
- **Price adjustments** - only if infrastructure costs change (you'll see exact cost delta)

## Cancellation & Data

- **30-day notice** required for cancellation
- **Data export** - you get PostgreSQL dump before termination
- **Data deletion** - all data deleted within 7 days of cancellation

## Limitations

Provider explicitly does NOT offer:
- 24/7 phone support
- 99.999% uptime SLA
- HIPAA compliance (available Month 12+)
- SOC 2 certification (following standards, not certified)

## Acceptance

By signing below, Customer agrees to these terms.

**Customer Signature:** _______________________
**Date:** _______________________

**Provider Signature:** Jeremy Longshore
**Date:** [Today]

---

CostPlusDB - Database hosting at cost + 25%
Email: jeremy@intentsolutions.io
Website: https://costplusdb.com
```

---

## Phase 4: Payment & Provisioning

### Payment Methods

Accept via:
1. **Stripe** (preferred - automated invoicing)
2. **PayPal** (for international customers)
3. **Wire transfer** (for larger customers, quarterly billing)

### First Invoice

**Invoice Template:**

```
INVOICE #001-[CustomerName]

Bill To: [Customer Name]
Email: [customer@email.com]
Service Period: [Start Date] - [End Date]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INFRASTRUCTURE COSTS (Transparent Breakdown)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Contabo VPS (8GB RAM, 200GB SSD)        $12.00
Wasabi S3 Backup Storage (50GB used)     $0.30
──────────────────────────────────────────
Total Infrastructure Cost                $12.30

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR PRICING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Infrastructure Cost                      $12.30
CostPlusDB Markup (25%)                  $3.08
──────────────────────────────────────────
Your Monthly Price                       $15.38

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Due Date: [7 days from today]
Payment Methods: Stripe, PayPal, Wire Transfer

Questions? Email: jeremy@intentsolutions.io

Thank you for your business!
Jeremy Longshore
CostPlusDB
```

### Provisioning Checklist

Once payment received:

**[Day 0] Provision Database**
- [ ] Run provisioning script: `SUDO_PASS='[password]' ./provision-customer-database.sh [customer_name]`
- [ ] Verify database created: `sudo -u postgres psql -p 5433 -c "\l" | grep [customer_name]`
- [ ] Test connection with provided credentials
- [ ] Verify SSL enforced: `sudo cat /etc/postgresql/16/main/pg_hba.conf | grep [customer_name]`

**[Day 0] Send Welcome Email**
(See template below)

**[Day 1] Verify Backup**
- [ ] Check backup ran: `sudo -u postgres pgbackrest --stanza=main info`
- [ ] Verify customer database in backup
- [ ] Email customer: "Your first backup completed successfully"

**[Day 7] Check-in Email**
- [ ] "How's everything going? Any issues or questions?"

**[Day 30] Monthly Invoice**
- [ ] Generate invoice with transparent cost breakdown
- [ ] Send via email or Stripe

---

## Phase 5: Welcome Email

**Subject: Welcome to CostPlusDB - Connection Details**

```
Hi [Name],

Welcome to CostPlusDB! Your PostgreSQL 16 database is ready.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONNECTION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Host:     [server_ip]
Port:     5433
Database: [customer_name]_db
User:     [customer_name]_user
Password: [generated_password]
SSL Mode: require (REQUIRED)

Connection String:
postgresql://[user]:[password]@[host]:5433/[database]?sslmode=require

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BACKUP DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Daily automated backups at 2 AM CST
- 30-day retention (full backups)
- 7-day point-in-time recovery
- Encrypted with AES-256 and stored in Wasabi S3 cloud
- First backup will run tonight

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Email: jeremy@intentsolutions.io
Response Time: 4 hours (business hours)
Emergency: Same email (I get notifications)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT'S NEXT?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Test your connection using the details above
2. Migrate your data (if needed - let me know if you need help)
3. Update your application's database connection string
4. You'll receive your first invoice on [date] with transparent cost breakdown

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESOURCES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Documentation: https://costplusdb.com/docs.html
- Security: https://costplusdb.com/security.html
- Transparency: https://costplusdb.com/transparency/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thanks for trusting me with your database!

Jeremy Longshore
CostPlusDB - Database hosting at cost + 25%
```

---

## Phase 6: Post-Onboarding

### Day 7 Check-in

```
Subject: Quick Check-in - How's CostPlusDB Working?

Hi [Name],

Just checking in after your first week with CostPlusDB. How's everything going?

- Connection working smoothly?
- Any migration issues?
- Questions about the service?

Let me know if you need anything!

Jeremy
```

### Monthly Invoice (Ongoing)

Send transparent invoice on same day each month showing:
- Exact infrastructure costs (with line items)
- 25% markup
- Any cost changes explained

---

## Capacity Management

### First 5 Customers Only

**Why limit to 5?**
- Ensures 4-hour support response time
- Time to refine operations
- Build reputation with stellar service
- Learn and improve before scaling

**After First 5:**
- Evaluate operational efficiency
- Document lessons learned
- Consider hiring part-time support
- Gradually increase to 10, then 20 customers

### Customer #6+ Waitlist

**If someone inquires after 5 spots filled:**

```
Hi [Name],

Thanks for your interest in CostPlusDB!

I'm currently at capacity (5 customers) as I build out operations and ensure quality service. I'm adding customers slowly and carefully.

I'd love to add you to the waitlist. You'd be first in line when I open the next slot (likely in [timeframe]).

In the meantime, you can:
- Check out my transparency docs: https://costplusdb.com/transparency/
- Follow progress on Twitter: [your handle]

Would you like me to add you to the waitlist?

Jeremy
```

---

## Tools to Set Up

### Before First Customer

1. **Calendly** - Schedule discovery calls
   - https://calendly.com/
   - Free tier works

2. **DocuSign or HelloSign** - Service agreements
   - https://www.hellosign.com/
   - Free tier: 3 docs/month

3. **Stripe** - Payment processing
   - https://stripe.com/
   - Create invoice templates

4. **Email Template System**
   - Use Gmail with Canned Responses
   - Or Streak CRM (free tier)

5. **Customer Tracker Spreadsheet**
   - Track: Name, Tier, Start Date, Monthly Price, Status
   - Simple Google Sheet works

---

## Client Communication Expectations

### Response Times

**Normal inquiries:** 4 hours (business hours)
**Emergencies (database down):** 5 minutes
**Billing questions:** Same day

### Communication Channels

**Accepted:**
- ✅ Email (primary)
- ✅ Scheduled calls (for onboarding/complex issues)

**NOT Accepted:**
- ❌ Slack/Discord DMs
- ❌ Random phone calls
- ❌ Social media DMs

### Transparency in Communication

Always:
- Be honest about limitations
- Under-promise, over-deliver
- Admit mistakes quickly
- Show them actual costs and infrastructure

---

## Red Flags (Decline Customer)

During discovery call, decline if customer:
- ❌ Demands instant phone support
- ❌ Unclear about their technical needs ("I don't know, just make it work")
- ❌ Hostile or demanding tone
- ❌ Wants custom SLA negotiations
- ❌ "Can you do this for free for 3 months?"
- ❌ Cryptocurrency/gambling/adult content (regulatory complexity)

**It's okay to say no.** Protecting your time = better service for good customers.

---

## Success Metrics

Track for each customer:
- ✅ Onboarding smoothness (1-10 scale)
- ✅ Support tickets per month
- ✅ Uptime achieved (vs 99.9% target)
- ✅ Customer satisfaction (ask quarterly)
- ✅ Referrals generated

**Goal: 5 happy customers > 20 mediocre customers**

---

Jeremy Longshore
CostPlusDB
jeremy@intentsolutions.io
