# Secure Customer Onboarding Checklist

**Document ID:** 012-DR-GUID-secure-customer-onboarding-checklist.md
**Purpose:** Minimum viable security checklist for customer onboarding
**Philosophy:** Secure by default, minimalistic, protect against scope creep

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

## Summary: Minimum Viable Security Checklist

**Customer Onboarding (Every Customer):**
1. ✅ Verify email and identity
2. ✅ Detect enterprise customers (charge appropriately)
3. ✅ Payment verification
4. ✅ Security model acknowledgment
5. ✅ Secure server hardening
6. ✅ PostgreSQL security configuration
7. ✅ Encrypted backups setup
8. ✅ Secure credential delivery
9. ✅ Monitoring enabled
10. ✅ 24-hour check-in

**Enterprise Customer Additions:**
11. ✅ Compliance documentation (if needed)
12. ✅ Private Slack channel
13. ✅ Custom work scoping and pricing

**Ongoing:**
14. ✅ Weekly security log review
15. ✅ Monthly backup restoration test
16. ✅ Scope creep protection (price custom work at $150/hour)

**Philosophy:**
- Secure by default
- Transparent pricing (cost + 25% for infra, $150/hour for time)
- Protect your time (charge for enterprise needs, decline bad fits)
- No surprises (set expectations upfront)

---

**This is your shield against getting fucked over by enterprise customers.** 🛡️
