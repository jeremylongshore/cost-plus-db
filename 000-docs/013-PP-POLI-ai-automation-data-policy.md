# AI, Automation & Data Usage Policy

**Document ID:** 013-PP-POLI-ai-automation-data-policy
**Category:** Business Policy
**Owner:** Jeremy Longshore
**Last Updated:** 2025-10-19
**Status:** Active

---

## Purpose

This policy defines how CostPlusDB uses artificial intelligence, automation, and handles customer data. We believe in radical transparency - if AI touches your data, you deserve to know exactly how and why.

---

## AI & Automation Usage

### What We Use AI For

**✅ ALLOWED - Internal Operations (No Customer Data)**

1. **Documentation Generation**
   - Creating internal SOPs and operational guides
   - Drafting business plans and marketing copy
   - Generating code comments and README files
   - **Data used:** None - only generic templates

2. **Infrastructure Automation**
   - Server provisioning scripts
   - Backup automation scripts
   - Monitoring alert configurations
   - **Data used:** Server configs only, no customer data

3. **Support Response Drafting**
   - Drafting initial responses to common questions
   - **Human review required:** ALL responses reviewed by Jeremy before sending
   - **Data used:** Only question text, never customer database contents

4. **Code Review & Security Audits**
   - Reviewing configuration files for security issues
   - Suggesting improvements to infrastructure setup
   - **Data used:** Configuration files only, no customer data

**❌ PROHIBITED - Customer Data**

1. **NEVER use AI for:**
   - Analyzing customer database contents
   - Processing customer application data
   - Training models on customer schemas or queries
   - Automated decision-making about customer access or pricing

### AI Tools We Use

| Tool | Purpose | Customer Data? | Provider |
|------|---------|----------------|----------|
| Claude Code (Anthropic) | Infrastructure automation, documentation | NO | Anthropic |
| GitHub Copilot | Code suggestions | NO | GitHub/OpenAI |
| ChatGPT | Support drafting (reviewed) | NO | OpenAI |

**Data Handling:** All AI tools operate under their respective data usage policies. We NEVER input customer database contents, credentials, or sensitive information into any AI tool.

---

## Customer Data Policy

### What Data We Collect

**Infrastructure Data (Required for Service):**
- ✅ Database connection logs (IP, timestamp, success/fail)
- ✅ Performance metrics (query count, database size)
- ✅ Backup metadata (size, timestamp, success/fail)
- ✅ Billing information (Stripe handles payment data)

**What We DON'T Collect:**
- ❌ Your database schema
- ❌ Your table contents
- ❌ Your application data
- ❌ Your query contents (except for errors if you request debugging help)

### Data Access Policy

**Who Can Access Your Data:**

| Role | Access Level | Purpose |
|------|--------------|---------|
| Jeremy (Owner) | SSH/PostgreSQL admin | Setup, maintenance, debugging (with permission) |
| Automated backups | Read-only snapshot | pgBackRest backup process |
| Monitoring | Connection count only | Betterstack uptime checks |

**We Will NEVER:**
- Sell your data to third parties
- Use your data for AI training
- Share your data with other customers
- Access your database without permission (except emergencies)

### Emergency Access Policy

**When we might access your database WITHOUT prior permission:**

1. **Security Incident:** Active attack or breach detected
2. **Data Loss Prevention:** Corruption detected during backup verification
3. **Legal Requirement:** Valid court order or subpoena

**In ALL cases:**
- You'll be notified within 1 hour via email
- Full incident report provided within 24 hours
- Access logs provided on request

---

## Automation Boundaries

### Fully Automated (No Human Review)

✅ **Safe Operations:**
- Daily backups (pgBackRest to Wasabi S3)
- Security updates (unattended-upgrades)
- SSL certificate renewal (Let's Encrypt)
- Monitoring alerts (Betterstack)
- Log rotation

### Semi-Automated (Human Review Required)

⚠️ **Requires Jeremy's Review:**
- Customer database provisioning (script runs, Jeremy verifies)
- Database migrations
- PostgreSQL version upgrades
- Firewall rule changes
- Support ticket responses (AI drafts, Jeremy sends)

### Manual Only (No Automation)

🚫 **Always Manual:**
- Customer onboarding decisions (accept/reject)
- Pricing negotiations
- Security incident response
- Customer data deletion requests
- Refund processing

---

## AI-Generated Content Disclosure

### This Website

**AI-assisted content includes:**
- About page story (AI-drafted, human-edited)
- Security practices documentation (AI-drafted from official sources)
- FAQ responses (AI-drafted, human-reviewed)

**100% human-written:**
- Pricing structure and tiers
- Business model and philosophy
- Customer communication (emails, support)

### Transparency Commitment

We mark AI-generated git commits with:
```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>
```

**See our commit history:** https://github.com/jeremylongshore/cost-plus-db

---

## Data Retention Policy

### Customer Databases

| Data Type | Retention | Deletion Method |
|-----------|-----------|----------------|
| Active database | Until cancellation | N/A |
| After cancellation | 30 days | DROP DATABASE + backup deletion |
| Backups (Wasabi S3) | 30 days rolling | Automatic expiration |
| Connection logs | 90 days | Automatic rotation |
| Billing records | 7 years (legal requirement) | Encrypted archive |

### Deletion Requests

**Right to be forgotten:**
- Email: jeremy@intentsolutions.io with subject "DATA DELETION REQUEST"
- Timeline: Database deleted within 24 hours, backups purged within 30 days
- Confirmation: You'll receive proof of deletion (screenshot of dropped database)

---

## Third-Party Services & Data Sharing

### Services We Use (Where Your Data Might Go)

| Service | Data Shared | Purpose | DPA Available? |
|---------|-------------|---------|----------------|
| Contabo VPS | Database resides on their servers | Infrastructure hosting | No (VPS provider) |
| Wasabi S3 | Encrypted backups | Backup storage | Yes (on request) |
| Betterstack | Connection success/fail pings | Uptime monitoring | Yes |
| Stripe | Email, billing info | Payment processing | Yes (built-in) |
| Netlify | Form submissions (name, email, config) | Website hosting | Yes |

**Encryption:**
- ✅ Backups encrypted with AES-256-CBC before upload to Wasabi
- ✅ Database connections require TLS/SSL
- ✅ SSH connections require Ed25519 keys

---

## AI Policy Updates

### Change Notification

**If we add NEW AI tools or change data handling:**
- 30 days advance notice via email
- Opt-out option provided
- Updated policy published at: costplusdb.com/ai-policy.html

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-19 | Initial policy |

---

## Customer Rights

**You have the right to:**

1. ✅ **Inspect:** Request access logs showing who accessed your database
2. ✅ **Export:** Download full database dump at any time
3. ✅ **Delete:** Request immediate data deletion (30-day backup retention applies)
4. ✅ **Audit:** Request our security audit reports
5. ✅ **Opt-out:** Request NO AI-assisted support responses

**How to exercise these rights:**
- Email: jeremy@intentsolutions.io
- Response time: Within 24 hours
- Fulfillment: Within 7 days (except deletion = 24 hours)

---

## Questions or Concerns?

**Contact:**
- Email: jeremy@intentsolutions.io
- Response time: 4 hours (business days)

**Escalation:**
If you believe we've violated this policy, email with subject "POLICY VIOLATION" for priority handling.

---

## Legal Disclaimer

This policy is binding on CostPlusDB (intent solutions io). Customers agree to this policy by using our service. This policy does NOT replace our [Terms of Service](/terms.html) or [Privacy Policy](/privacy.html) - it supplements them.

**Effective Date:** 2025-10-19
**Governed By:** Texas law (intent solutions io is a Texas sole proprietorship)

---

**Standing on the shoulders of giants:**
- OpenAI's AI usage policies (reference)
- Anthropic's Claude usage guidelines (reference)
- PostgreSQL community security guidelines (implementation)
