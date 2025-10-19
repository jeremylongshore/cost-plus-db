# Secure Customer Onboarding Checklist

**Document ID:** 012-DR-GUID-secure-customer-onboarding-checklist.md
**Purpose:** Minimum viable security checklist for customer onboarding
**Philosophy:** Secure by default, minimalistic, protect against scope creep

---

## Launch Strategy: Quality Over Quantity

### Limited Initial Rollout (Month 0-3)

**MAXIMUM 5 CUSTOMERS for initial launch.**

**Why Only 5?**
- **Execution is everything** - I will not sacrifice quality for quantity
- **Learn from each customer** - Refine processes, catch issues early
- **Maintain 4-hour support SLA** - Can't do that with 50 customers
- **Build reputation on excellence** - 5 happy customers > 50 mediocre experiences
- **Solo operator reality** - I'm doing setup, support, monitoring myself

**What This Means:**

```
If someone requests onboarding and we're at 5 customers:

"Hi [Name],

Thanks for your interest in CostPlusDB!

We're currently at capacity for our initial rollout (5 customers max).
This is intentional - I'm focused on execution quality, not growth speed.

I'm adding customers slowly as I refine operations and ensure existing
customers get excellent service.

Options:
1. Join the waitlist - I'll reach out when a slot opens (usually 2-4 weeks)
2. If you need immediate access, I can refer you to [alternative provider]

I appreciate your patience. Building this right is more important than
building it fast.

Best,
Jeremy"
```

**Expansion Timeline:**
- **Month 0-3:** Max 5 customers (learn, refine, document)
- **Month 4-6:** Expand to 10-15 customers (processes proven)
- **Month 7-12:** Expand to 25-50 customers (automation in place)
- **Month 12+:** Remove cap, scale carefully

**Philosophy:**
- Execution > Growth
- Quality > Quantity
- Happy customers > Revenue targets
- Sustainable > Fast

**If a customer can't wait:** That's okay. Refer them elsewhere. Don't compromise quality.

---

## Pre-Onboarding: Customer Qualification

### Step 1: Initial Contact & Verification (5 min)

**Purpose:** Basic identity verification, prevent fraud, qualify customer

**Required Information:**
- [ ] Full name (matches payment method)
- [ ] Business email (no temporary/disposable emails)
- [ ] Company name (if applicable)
- [ ] Use case description (1-2 sentences)

**Email Verification:**
```bash
# Verify email domain is not disposable
# Check: company website exists if business customer
# Red flags: disposable email (guerrillamail, tempmail, etc.)
```

**Decision Point:** Approve or request more info?

---

### Step 2: Enterprise Customer Detection & Protection

**Purpose:** Identify enterprise customers early, charge appropriately

**Automatic Enterprise Detection (triggers Enterprise tier requirement):**
- [ ] Company has >100 employees (LinkedIn check)
- [ ] Company is publicly traded
- [ ] Request mentions: "compliance team", "legal review", "procurement", "BAA", "DPA"
- [ ] Request mentions: "SOC 2", "HIPAA", "PCI-DSS", "ISO 27001"
- [ ] Multiple departments/stakeholders mentioned
- [ ] Request for custom SLA beyond standard offering

**If Enterprise Detected:**
```
Response Template:

"Hi [Name],

Based on your requirements, I recommend our Enterprise tier ($149/mo base + custom add-ons).

Enterprise tier includes:
- Priority support (1-hour SLA)
- Custom compliance documentation (DPA, BAA if needed)
- Audit logs
- Private Slack channel
- Custom onboarding assistance

For custom compliance requirements (HIPAA, SOC2, etc.), we offer:
- Compliance Package: +$100/mo (includes compliance documentation, audit support)
- Custom implementation work: $150/hour (capped based on scope)

If your needs exceed our standard offering, I'm happy to discuss custom pricing.

Would you like to schedule a 15-minute call to discuss?

Best,
Jeremy"
```

**Protection Mechanism: Cost-Plus for Custom Work**
- [ ] Any custom work beyond standard offering = $150/hour
- [ ] Estimate hours upfront, get written approval
- [ ] Cap custom work hours (e.g., "up to 10 hours for setup, $1500")
- [ ] Monthly retainer for ongoing custom requests: $500/mo for 3 hours, then $150/hour after

---

## Security Verification (10 min)

### Step 3: Payment Verification

**Purpose:** Confirm legitimate customer, prevent fraud

**Requirements:**
- [ ] Valid payment method on file (Stripe)
- [ ] Name on payment matches customer name
- [ ] Business address provided (Google Maps verification)
- [ ] Phone number provided (verified via SMS if suspicious)

**Red Flags:**
- Payment method country ≠ stated location
- Multiple failed payment attempts
- Disposable/virtual credit card (not necessarily bad, but note it)

---

### Step 4: Security Requirements Review

**Purpose:** Set expectations, ensure customer understands security model

**Customer Must Acknowledge (email confirmation):**

```
CostPlusDB Security Model - Please Confirm

Before provisioning your database, please confirm you understand:

✅ Security Responsibilities:
- YOU are responsible for: Application security, user access control, SQL injection prevention
- WE are responsible for: Server hardening, PostgreSQL security, backups, monitoring

✅ Access Model:
- You receive: Superuser PostgreSQL credentials, direct database access
- You can: Create users, install extensions, configure as needed
- We monitor: Connection logs, failed authentication attempts, unusual queries

✅ Data Ownership:
- Your data is YOUR data
- You can export/migrate anytime
- We retain backups 30 days after cancellation

✅ What We DON'T Provide (without Enterprise tier):
- Application-level security consulting
- Custom firewall rules beyond standard hardening
- Compliance certifications (HIPAA/SOC2/PCI)
- Schema design or query optimization
- Hand-holding for basic PostgreSQL tasks

Please reply "CONFIRMED" to proceed with provisioning.
```

**If customer has questions/concerns:** Address them or recommend Enterprise tier.

---

## Provisioning (Automated)

### Step 5: Secure Database Provisioning

**Security Checklist During Provisioning:**

**Server Hardening:**
- [ ] SSH key authentication only (no passwords)
- [ ] Root login disabled
- [ ] Custom SSH port (non-22)
- [ ] UFW firewall configured (PostgreSQL port + SSH only)
- [ ] fail2ban installed and configured
- [ ] Automatic security updates enabled
- [ ] NTP time sync configured

**PostgreSQL Security:**
- [ ] Strong random password generated (32 chars, alphanumeric + symbols)
- [ ] SSL/TLS enforced (reject non-SSL connections)
- [ ] scram-sha-256 password encryption
- [ ] Connection logging enabled
- [ ] Customer database isolated (dedicated role, no cross-db access)
- [ ] `pg_hba.conf` restricted to customer IP (if provided) or 0.0.0.0/0 with SSL

**Backup Security:**
- [ ] pgBackRest configured with encryption
- [ ] Wasabi S3 bucket created (unique per customer)
- [ ] Backup encryption keys stored in password manager
- [ ] First backup completed and verified
- [ ] Backup verification cron job scheduled

---

### Step 6: Credential Delivery (Secure)

**Purpose:** Securely deliver credentials to customer

**Method 1 (Recommended): One-Time Secret Link**
```bash
# Use: onetimesecret.com or similar
# Send password via one-time secret link (expires after 1 view or 24 hours)
# Send connection string separately via email
```

**Email Template:**
```
Subject: Your CostPlusDB Database is Ready

Hi [Name],

Your PostgreSQL database is provisioned and ready!

Connection Details:
- Host: [hostname].costplusdb.dev
- Port: 5432
- Database: [db_name]
- Username: [username]
- SSL Mode: require

Password: [one-time secret link]
(This link expires after one view or 24 hours. Save your password securely.)

First Steps:
1. Test connection: psql "postgresql://[username]@[hostname].costplusdb.dev:5432/[db_name]?sslmode=require"
2. Change your password (optional): ALTER USER [username] PASSWORD 'your_new_password';
3. Create additional users if needed: CREATE USER app_user WITH PASSWORD 'secure_password';

Backup Info:
- Automated daily backups (30-day retention)
- Point-in-time recovery available (7 days)
- Manual backup on request

Support:
- Email: jeremy@intentsolutions.io
- Response time: 4 hours (M-F 9am-6pm ET)

Your monthly invoice will show exact cost breakdown.

Best,
Jeremy
```

---

## Post-Onboarding Security

### Step 7: Monitoring Setup (Automated)

**Security Monitoring (Betterstack + Custom Scripts):**
- [ ] Uptime monitoring configured (alert if down >5 min)
- [ ] Failed authentication monitoring (alert if >10 failures/hour)
- [ ] Connection spike monitoring (alert if >100 new connections in 5 min)
- [ ] Disk usage monitoring (alert at 80%)
- [ ] Backup verification (daily check, alert if backup fails)

**Customer Access Logging:**
- [ ] Log all connections (IP, timestamp, user)
- [ ] Log failed authentication attempts
- [ ] Weekly review of suspicious activity

---

### Step 8: Customer Check-In (24 Hours)

**Purpose:** Ensure successful onboarding, catch issues early

**Email Template (24h after provisioning):**
```
Subject: CostPlusDB - How's it going?

Hi [Name],

Just checking in - were you able to connect to your database?

Common issues:
- Firewall blocking port 5432 (test with: telnet [hostname].costplusdb.dev 5432)
- SSL mode not set to 'require'
- Password copied with extra spaces/characters

Need help? Just reply to this email.

Best,
Jeremy
```

---

## Enterprise Customer Special Handling

### Additional Enterprise Requirements

**If customer purchased Enterprise tier or custom work:**

**Compliance Documentation (if requested):**
- [ ] Data Processing Agreement (DPA) signed
- [ ] Business Associate Agreement (BAA) if HIPAA (Month 12+, requires legal review)
- [ ] Security questionnaire completed
- [ ] Audit log access provided

**Private Slack Channel Setup:**
- [ ] Create private channel: #costplusdb-[company-name]
- [ ] Invite customer stakeholders (max 5)
- [ ] Set expectations: 1-hour response time during business hours

**Custom Work Tracking:**
- [ ] Scope of work documented (email confirmation)
- [ ] Hours estimated and approved
- [ ] Track time in spreadsheet: [Date] | [Task] | [Hours] | [Notes]
- [ ] Invoice monthly: Base tier + (Hours × $150)

**Scope Creep Protection:**
```
Email Template for Out-of-Scope Requests:

"Hi [Name],

That's outside our standard offering, but I can help!

This would be custom work:
- Estimated time: [X] hours
- Cost: $[X × 150]
- Timeline: [Y] days

If you'd like to proceed, please confirm and I'll get started.

Alternatively, if this is ongoing, we can set up a monthly retainer:
- $500/mo for 3 hours/month
- $150/hour after that

Let me know what works best!

Best,
Jeremy"
```

---

## Custom Feature Requests

### When Customer Wants Something You Don't Have

**Philosophy:** "If there is something someone wants that we don't have, we can do it for them."

**Process:**

1. **Clarify the Request**
   ```
   - What exactly do they need?
   - Why do they need it?
   - Is this a one-time setup or ongoing?
   - When do they need it by?
   ```

2. **Assess Feasibility**
   ```
   - Can I do this? (technical capability)
   - Should I do this? (fits CostPlusDB mission)
   - How long will it take? (time estimate)
   ```

3. **Price It**
   ```
   If infrastructure cost:
   - Calculate exact cost
   - Add 25% markup
   - Add to monthly invoice transparently

   If custom work/time:
   - Estimate hours
   - $150/hour
   - Get approval before starting
   ```

4. **Set Boundaries**
   ```
   Examples of YES:
   - "Can you set up read replicas?" → Yes, +$15/mo (cost + 25%)
   - "Can you install pg_cron extension?" → Yes, $150 one-time setup
   - "Can you help migrate from AWS RDS?" → Yes, $150/hour (estimate 3-5 hours)

   Examples of NO (or "Not Yet"):
   - "Can you manage our application code?" → No, out of scope
   - "Can you be our DBA 24/7?" → Not standard, but can quote retainer
   - "Can you guarantee 99.999% uptime?" → Not yet, max 99.9% currently
   ```

5. **Document Everything**
   ```
   - Email confirmation of scope
   - Written approval of cost
   - Track time if hourly work
   - Invoice transparently
   ```

---

## Red Flags: When to Decline a Customer

**Automatic Decline:**
- [ ] Obvious fraud (disposable email, payment fails multiple times, suspicious activity)
- [ ] Illegal use case (gambling, adult content, crypto mining without disclosure)
- [ ] Hostile/abusive communication
- [ ] Demands beyond what you can deliver (99.999% SLA, 24/7 phone support, etc.)

**Questionable (Investigate Further):**
- [ ] Unwilling to pay Enterprise tier but has Enterprise needs
- [ ] Expects custom work for free
- [ ] Vague about use case
- [ ] Requests that would expose you to legal risk (HIPAA before Month 12, etc.)

**Response Template for Decline:**
```
"Hi [Name],

Thanks for your interest in CostPlusDB.

Unfortunately, I don't think we're the right fit for your needs at this time. Here's why:
[Specific reason]

I'd recommend:
[Alternative provider or approach]

Best of luck with your project!

Jeremy"
```

**Be honest, be kind, but protect your time and sanity.**

---

## Security Incident Response (Post-Onboarding)

### If Customer Reports Security Issue

**Immediate Actions:**
1. [ ] Acknowledge within 1 hour (even if "investigating")
2. [ ] Assess severity (P0: data breach, P1: service down, P2: degraded, P3: minor)
3. [ ] Isolate if needed (disconnect affected database from network)
4. [ ] Investigate logs (PostgreSQL logs, auth logs, firewall logs)
5. [ ] Communicate every 30 minutes until resolved

**If Data Breach:**
1. [ ] Isolate immediately
2. [ ] Forensic analysis (what was accessed, when, how)
3. [ ] Notify customer within 1 hour of confirmation
4. [ ] Written incident report within 24 hours
5. [ ] Remediation plan
6. [ ] Public disclosure if required (based on jurisdiction)

---

## Summary: Base Security vs Add-On Security

### **INCLUDED IN BASE PRICE (All Tiers: $49/$89/$129/$149)**

**Standard Security (Good Enough for 90% of Customers):**
1. ✅ Server hardening: SSH keys, firewall, fail2ban, auto-updates
2. ✅ PostgreSQL security: SSL/TLS enforced, strong passwords, isolated databases
3. ✅ Daily encrypted backups (30-day retention, Wasabi S3)
4. ✅ Point-in-time recovery (7 days)
5. ✅ Uptime monitoring (alerts if down)
6. ✅ Connection logging
7. ✅ Email support (4-hour SLA, M-F 9am-6pm ET)

**This is solid, reasonable, minimal security. Most customers won't need more.**

---

### **SECURITY ADD-ONS (This is where you make money)**

**Infrastructure Security Add-Ons (Cost + 25%):**

1. **VPN Access** - +$15/mo
   - Private VPN tunnel to database
   - Customer's application connects only via VPN
   - Additional firewall isolation

2. **IP Whitelisting** - Free (included)
   - Restrict database access to specific IPs
   - Basic security, no extra cost

3. **Read Replicas (HA)** - +$99/mo
   - Multi-region failover
   - Load balancing
   - 99.95% uptime SLA (vs 99.9% base)

4. **Private Network (VPC)** - +$25/mo
   - Dedicated private network
   - Isolated from other customers
   - Advanced network security

5. **DDoS Protection** - +$50/mo
   - Cloudflare enterprise DDoS mitigation
   - Rate limiting
   - Advanced threat detection

**Compliance & Audit Add-Ons (Your Time = $150/hour OR monthly packages):**

6. **Compliance Package** - +$100/mo
   - DPA (Data Processing Agreement)
   - Security questionnaire responses
   - Audit logs with 1-year retention (vs 30-day base)
   - Quarterly security reports
   - **Does NOT include:** HIPAA/SOC2 certification (available Month 12+)

7. **HIPAA Compliance** - +$200/mo (Month 12+, requires legal review)
   - BAA (Business Associate Agreement)
   - HIPAA-compliant infrastructure
   - Enhanced audit logging
   - Encrypted backups with compliance documentation

8. **SOC 2 Assistance** - +$150/mo OR project-based pricing
   - Help with SOC 2 audit preparation
   - Documentation for your auditors
   - **Not** a SOC 2 certification (you can't afford the audit yet)

**Advanced Security Add-Ons (Your Time):**

9. **Custom Firewall Rules** - $150 one-time setup
   - Non-standard firewall configurations
   - Application-specific rules
   - Advanced iptables setup

10. **Penetration Testing** - $500 one-time (external service cost + 25%)
    - Hire external pentester
    - Pass through cost + 25%
    - Remediation included

11. **Security Consulting** - $150/hour
    - Schema design security review
    - Query optimization for security
    - Application-level security advice

12. **Dedicated Support (Slack Channel)** - +$300/mo
    - Direct Slack channel access to Jeremy
    - Response within minutes (not hours)
    - Security questions, incidents, general support
    - M-F 9am-6pm ET (best-effort outside hours)
    - Base tier: Email with 4-hour response (M-F 9am-6pm ET)

**What's an SLA?** Service Level Agreement - the maximum time we promise to respond.
- 4-hour SLA = we respond within 4 hours (usually faster)
- Minute-response = typically within 5-15 minutes via Slack

---

### **Pricing Philosophy**

**Base Tiers ($49/$89/$129/$149):**
- Includes: Reasonable, standard security that protects 90% of customers
- You're not cutting corners, this is good security
- Most indie devs/startups won't need more

**Add-Ons (Where You Make Money):**
- Infrastructure add-ons: Cost + 25% (VPN, HA, VPC, DDoS)
- Compliance packages: Monthly fees cover your time + overhead
- Custom work: $150/hour for your time

**Philosophy:**
- Don't upsell security they don't need
- But if they WANT extra security, charge for it
- Compliance/audit work = your time is valuable
- Enterprise customers who need custom security = $$$ add-ons

---

### **Customer Onboarding Checklist (Streamlined)**

**Every Customer Gets:**
1. ✅ Email verification (prevent fraud)
2. ✅ Payment verification
3. ✅ Standard security provisioning (included in base price)
4. ✅ Secure credential delivery
5. ✅ Monitoring setup
6. ✅ 24-hour check-in

**If Customer Wants More Security:**
7. ✅ Assess which add-ons they need
8. ✅ Quote add-on pricing (cost + 25% OR $150/hour)
9. ✅ Get written approval
10. ✅ Implement and invoice transparently

**Scope Creep Protection:**
- Base security = included, no nickel-and-diming
- Extra security = add-ons, charge appropriately
- Custom work = $150/hour, estimated upfront

---

**This is your shield against getting fucked over by enterprise customers.** 🛡️

**You provide good security in the base price. You make money when they want MORE.**
