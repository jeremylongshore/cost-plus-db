# CostPlusDB - Customer Onboarding Form

**Welcome to CostPlusDB!** Please fill out this form completely so we can provision your PostgreSQL database.

**Estimated time:** 5-10 minutes

---

## 1. Company Information

**Company/Project Name:**
```
[Your answer here]
```

**Primary Contact Name:**
```
[Your answer here]
```

**Primary Email Address:**
```
[Your answer here]
```

**Phone Number (optional, for urgent issues):**
```
[Your answer here]
```

**Company Website:**
```
[Your answer here]
```

**Timezone:**
```
[e.g., America/Chicago, America/New_York, UTC]
```

---

## 2. Database Requirements

**Preferred Database Name:**
```
[e.g., myapp_production, acme_db, projectname_prod]
```

**Database User Name:**
```
[e.g., myapp_user, acme_admin, projectname_owner]
```

**Estimated Database Size (initially):**
- [ ] < 1 GB
- [ ] 1-5 GB
- [ ] 5-10 GB
- [ ] 10-25 GB
- [ ] 25+ GB (requires Pro or Enterprise tier)

**Expected Monthly Growth:**
```
[e.g., ~500 MB/month, minimal growth, ~5 GB/month]
```

**Database Purpose:**
- [ ] Production (live application)
- [ ] Staging (pre-production testing)
- [ ] Development (experimental/testing)
- [ ] Backup/Archive
- [ ] Other: ____________________

---

## 3. Plan Selection

**Which tier do you want?**
- [ ] **Shared** ($49/month) - 5GB storage, shared resources
- [ ] **Dedicated** ($89/month) - 25GB storage, dedicated CPU/RAM
- [ ] **Pro** ($129/month) - 50GB storage, enhanced resources
- [ ] **Enterprise** ($149/month) - 100GB storage, priority support

See pricing details: https://costplusdb.dev/calculator.html

---

## 4. Application Details

**What is your application/service?**
```
[Brief description: e.g., "SaaS tool for project management", "Mobile app backend", "E-commerce site"]
```

**Expected traffic level:**
- [ ] Low (< 1,000 requests/day)
- [ ] Medium (1,000 - 10,000 requests/day)
- [ ] High (10,000 - 100,000 requests/day)
- [ ] Very High (> 100,000 requests/day)

**Peak usage times:**
```
[e.g., "Business hours 9 AM - 5 PM CT", "24/7 steady traffic", "Evening spikes 6-10 PM"]
```

---

## 5. Technical Requirements

**PostgreSQL Version Preference:**
- [ ] PostgreSQL 16 (latest stable)
- [ ] PostgreSQL 15
- [ ] PostgreSQL 14
- [ ] No preference (recommend latest)

**Required Extensions (if any):**
```
[e.g., pg_stat_statements, uuid-ossp, pgcrypto, postgis, none]
```

**Connection Pooling (pgBouncer):**
- [ ] Yes, enable pgBouncer (recommended for high-traffic apps)
- [ ] No, direct PostgreSQL connections only

**IP Whitelist Restriction:**
- [ ] No restriction (allow connections from any IP)
- [ ] Restrict to specific IPs: ____________________

---

## 6. Backup & Recovery

**Backup Frequency:**
- [x] Daily (included, recommended)
- [ ] Twice daily (+$10/month)
- [ ] Hourly (+$25/month)

**Point-in-Time Recovery (PITR):**
- [x] 7 days (included)
- [ ] 14 days (+$15/month)
- [ ] 30 days (+$30/month)

**Do you need an initial database restore?**
- [ ] No, fresh database
- [ ] Yes, I have a PostgreSQL dump file to import

**If yes, upload details:**
```
[File size, format (pg_dump, SQL), download URL or will email separately]
```

---

## 7. Communication Preferences

**Preferred Support Channel:**
- [ ] Email only (included)
- [ ] Email + Slack (+$29/month) - See Slack setup instructions

**Alert Notifications:**
- [ ] Email me for critical issues (downtime, security alerts)
- [ ] No alerts, I'll monitor myself

**Monthly Reports:**
- [ ] Yes, send monthly usage reports
- [ ] No, I'll check dashboard myself

---

## 8. Billing Information

**Billing Contact Email:**
```
[Same as primary email, or different billing email]
```

**Billing Address:**
```
[Street Address]
[City, State, ZIP]
[Country]
```

**Payment Method:**
- [ ] Credit Card (Stripe)
- [ ] ACH Bank Transfer
- [ ] Wire Transfer (Enterprise only)
- [ ] Invoice (Net 30, Enterprise only)

**PO Number (if required):**
```
[Your answer here, or "N/A"]
```

---

## 9. Security & Compliance

**Do you require a BAA (HIPAA compliance)?**
- [ ] No
- [ ] Yes (available Month 12+, additional legal review required)

**Do you require SOC 2 compliance?**
- [ ] No
- [ ] Yes (not currently available, roadmap item)

**Special security requirements:**
```
[Any specific compliance needs, data residency requirements, etc.]
```

---

## 10. Additional Information

**How did you hear about CostPlusDB?**
- [ ] Google search
- [ ] Hacker News
- [ ] Reddit
- [ ] Twitter/X
- [ ] Word of mouth
- [ ] Other: ____________________

**Any special requests or questions?**
```
[Your answer here]
```

**Is this a migration from another provider?**
- [ ] No, new database
- [ ] Yes, migrating from: ____________________

**If migrating, do you need migration assistance?**
- [ ] No, I'll handle it myself
- [ ] Yes, need help with migration (+$99 one-time setup fee)

---

## 11. Terms & Agreement

By submitting this form, I agree to:

- [ ] I have read and agree to the [Terms of Service](https://costplusdb.dev/terms.html)
- [ ] I have read and agree to the [Privacy Policy](https://costplusdb.dev/privacy.html)
- [ ] I have read and agree to the [Acceptable Use Policy](https://costplusdb.dev/acceptable-use.html)
- [ ] I understand that backups are encrypted and cannot be recovered if I lose my connection credentials
- [ ] I understand the pricing is monthly recurring and billed on the start date each month

**Date:**
```
[YYYY-MM-DD]
```

**Signature (type full name):**
```
[Your full legal name]
```

---

## Submission Instructions

**How to submit:**

1. **Fill out this form completely**
2. **Save as:** `onboarding-{yourcompany}-{date}.md`
3. **Email to:** jeremy@intentsolutions.io
4. **Subject:** "CostPlusDB Onboarding - [Your Company Name]"

**What happens next:**

1. We'll review your form (usually within 24 hours)
2. We'll provision your database (takes ~15-30 minutes)
3. You'll receive a setup confirmation email with:
   - Database connection credentials
   - Connection string
   - Setup verification steps
   - First invoice
4. You can start using your database immediately

**Questions?** Email jeremy@intentsolutions.io

---

**Thank you for choosing CostPlusDB!**

We're excited to host your PostgreSQL database. Our goal is to provide transparent, affordable, and reliable database hosting.

---

**Internal Use Only (Do Not Fill Out)**

```
Customer ID: _______________________
Provisioned By: _______________________
Provisioned Date: _______________________
Database Created: [ ] Yes [ ] No
Credentials Sent: [ ] Yes [ ] No
Payment Setup: [ ] Yes [ ] No
```
