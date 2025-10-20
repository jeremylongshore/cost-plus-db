# CostPlusDB Customer Intake Form

**Version:** 1.0
**Updated:** October 20, 2025

## Professional PostgreSQL Hosting Intake

Thank you for your interest in CostPlusDB. This intake form helps us understand your database requirements and provide the best possible consultation and service.

**What to expect:**
- Completion time: 10-15 minutes
- Response within 24 hours
- Personalized consultation call scheduled
- Custom migration plan if needed

**Fields marked with (*) are required.**

---

## 1. Company Information

### Company Name *
_Your registered business name_

### Industry/Sector
_e.g., SaaS, Healthcare, E-commerce, Fintech, etc._

### Company Size (Employees)
- [ ] 1-10 employees
- [ ] 11-50 employees
- [ ] 51-200 employees
- [ ] 201-500 employees
- [ ] 501+ employees

### Website URL
_Your company website_

### Physical Address
_Street address, City, State/Province, Postal Code, Country_

### Tax ID / Business Registration Number
_EIN, VAT, ABN, etc. (for invoicing and compliance purposes)_

---

## 2. Primary Contact

### Full Name *
_Primary point of contact_

### Title/Role
_e.g., CTO, Engineering Manager, Founder, etc._

### Email *
_Primary contact email_

### Phone Number
_Including country code_

### Preferred Contact Method
- [ ] Email
- [ ] Phone
- [ ] Slack
- [ ] Microsoft Teams

### Timezone
_Your local timezone or region_
- [ ] Eastern Time (ET)
- [ ] Central Time (CT)
- [ ] Mountain Time (MT)
- [ ] Pacific Time (PT)
- [ ] GMT/BST (London)
- [ ] CET/CEST (Paris)
- [ ] JST (Tokyo)
- [ ] AEST (Sydney)
- [ ] Other: ___________

---

## 3. Technical Contact
_(If different from primary contact)_

### Full Name
_Technical point of contact_

### Role
_e.g., DevOps Engineer, Database Administrator, Lead Developer, etc._

### Email
_Technical contact email_

### Phone
_Technical contact phone number_

---

## 4. Current Database Environment

### Current Provider
- [ ] Heroku Postgres
- [ ] AWS RDS
- [ ] GCP Cloud SQL
- [ ] Azure Database
- [ ] DigitalOcean Managed DB
- [ ] Self-hosted
- [ ] No existing database
- [ ] Other: ___________

### PostgreSQL Version (or other database)
_e.g., PostgreSQL 15, MySQL 8.0, etc._

### Database Size (GB)
_Current database size in gigabytes_

### Number of Databases
_How many separate databases do you manage?_

### Average Connections
_Typical concurrent database connections_

### Peak Traffic Times
_When does your application experience highest database load?_

### Performance Requirements
_e.g., 1000 queries/sec, <100ms response time, 99.9% uptime SLA_

---

## 5. Migration Details

### Migration Timeline
- [ ] ASAP (within 1 week)
- [ ] 1-2 weeks
- [ ] Within 1 month
- [ ] 1-3 months
- [ ] Just exploring options

### Acceptable Downtime Window
_e.g., 1 hour on Sunday 2-3 AM EST_

### Zero-Downtime Requirement?
- [ ] Yes - Zero downtime required
- [ ] No - Some downtime acceptable
- [ ] Let's discuss options

### Data Sensitivity Level
- [ ] Public data
- [ ] Internal business data
- [ ] Confidential data
- [ ] Regulated data (HIPAA, PCI, etc.)

---

## 6. Service Requirements

### Tier Interest
- [ ] **Shared** - $49/mo (2 vCPU, 4GB RAM, 50GB storage)
- [ ] **Dedicated** - $89/mo (4 vCPU, 8GB RAM, 200GB storage)
- [ ] **Pro** - $129/mo (8 vCPU, 16GB RAM, 500GB storage)
- [ ] **Enterprise** - $149/mo (16 vCPU, 32GB RAM, 1TB storage)
- [ ] **Custom** - Let's discuss

### Add-ons Needed
_(Check all that apply)_

- [ ] **High Availability** (+$99/mo) - Multi-node failover cluster
- [ ] **Read Replicas** (+$15/mo per replica) - Scale read workloads
- [ ] **VPN Access** (+$15/mo) - Private network connectivity
- [ ] **Compliance Package** (+$100/mo) - HIPAA, SOC 2, audit logs
- [ ] **Slack Support** (+$29/mo) - Direct channel with team

### Infrastructure Preference
- [ ] No preference
- [ ] Contabo (default - best value)
- [ ] Hetzner (EU-focused)
- [ ] DigitalOcean
- [ ] AWS (premium tier only)

### Region Preference
- [ ] Default (US East)
- [ ] US East
- [ ] US West
- [ ] EU Central (Frankfurt)
- [ ] Asia Pacific (Singapore)

---

## 7. Compliance & Security

### Compliance Requirements
_(Check all that apply)_

- [ ] **HIPAA** - Healthcare data
- [ ] **SOC 2** - Security, availability, confidentiality
- [ ] **GDPR** - EU data privacy
- [ ] **PCI-DSS** - Payment card data
- [ ] **None** - No specific compliance requirements

### Backup Retention Requirements
- [ ] 30 days (default)
- [ ] 60 days
- [ ] 90 days
- [ ] 180 days
- [ ] 1 year
- [ ] Custom retention period: ___________

### Data Residency Requirements
_e.g., Must stay in EU, US only, etc._

### Security Certifications Required
_List any required certifications or security standards_

---

## 8. Business Details

### How did you hear about us?
- [ ] Web search
- [ ] Social media
- [ ] Referral from colleague
- [ ] Blog post or article
- [ ] Reddit/HackerNews
- [ ] Other: ___________

### Current Monthly Database Spend
_What you're currently paying per month_

### Budget for Database Hosting
_Your budget range for managed PostgreSQL_

### Contract Length Preference
- [ ] Monthly (no commitment)
- [ ] Annual (10% discount)
- [ ] Let's discuss

### Anticipated Growth
_Expected database size in 12 months_

---

## 9. Additional Information

### Use Case Description
_Tell us about your application and how you use your database. What problem are you solving?_

### Specific Requirements or Questions
_Any special considerations, technical requirements, or questions for us?_

### Special Considerations
_Anything else we should know? (regulatory concerns, unusual workloads, etc.)_

---

## Submission

By submitting this form, you agree to our [Privacy Policy](/privacy.html) and [Terms of Service](/terms.html).

**Next Steps:**
1. We review your intake within 24 hours
2. Schedule consultation call (typically 30-45 minutes)
3. Provide custom migration plan and timeline
4. Answer all technical questions
5. Create formal proposal

**Questions?** Email us at [jeremy@intentsolutions.io](mailto:jeremy@intentsolutions.io)

---

## Form Data Structure (for SQLite database)

```sql
CREATE TABLE customer_intake (
  -- Metadata
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_date TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, reviewed, contacted, converted

  -- Company Information
  company_name TEXT NOT NULL,
  industry TEXT,
  company_size TEXT,
  website TEXT,
  address TEXT,
  tax_id TEXT,

  -- Primary Contact
  primary_contact_name TEXT NOT NULL,
  primary_contact_title TEXT,
  primary_contact_email TEXT NOT NULL,
  primary_contact_phone TEXT,
  preferred_contact_method TEXT,
  timezone TEXT,

  -- Technical Contact
  tech_contact_name TEXT,
  tech_contact_role TEXT,
  tech_contact_email TEXT,
  tech_contact_phone TEXT,

  -- Current Database Environment
  current_provider TEXT,
  postgres_version TEXT,
  database_size TEXT,
  num_databases INTEGER,
  avg_connections INTEGER,
  peak_traffic TEXT,
  performance_requirements TEXT,

  -- Migration Details
  migration_timeline TEXT,
  downtime_window TEXT,
  zero_downtime TEXT,
  data_sensitivity TEXT,

  -- Service Requirements
  tier_interest TEXT,
  addons TEXT, -- JSON array
  infrastructure_preference TEXT,
  region_preference TEXT,

  -- Compliance & Security
  compliance_requirements TEXT, -- JSON array
  backup_retention TEXT,
  data_residency TEXT,
  security_certifications TEXT,

  -- Business Details
  referral_source TEXT,
  current_monthly_spend TEXT,
  budget TEXT,
  contract_length TEXT,
  anticipated_growth TEXT,

  -- Additional Information
  use_case TEXT,
  specific_requirements TEXT,
  special_considerations TEXT,

  -- Internal Notes
  internal_notes TEXT,
  assigned_to TEXT,
  follow_up_date TEXT
);

-- Index for common queries
CREATE INDEX idx_status ON customer_intake(status);
CREATE INDEX idx_submission_date ON customer_intake(submission_date);
CREATE INDEX idx_company_name ON customer_intake(company_name);
```

## Field Mapping Reference

| Form Field | Database Column | Type | Required |
|------------|----------------|------|----------|
| Company Name | company_name | TEXT | Yes |
| Industry/Sector | industry | TEXT | No |
| Company Size | company_size | TEXT | No |
| Website URL | website | TEXT | No |
| Physical Address | address | TEXT | No |
| Tax ID | tax_id | TEXT | No |
| Primary Contact Name | primary_contact_name | TEXT | Yes |
| Primary Contact Title | primary_contact_title | TEXT | No |
| Primary Contact Email | primary_contact_email | TEXT | Yes |
| Primary Contact Phone | primary_contact_phone | TEXT | No |
| Preferred Contact Method | preferred_contact_method | TEXT | No |
| Timezone | timezone | TEXT | No |
| Tech Contact Name | tech_contact_name | TEXT | No |
| Tech Contact Role | tech_contact_role | TEXT | No |
| Tech Contact Email | tech_contact_email | TEXT | No |
| Tech Contact Phone | tech_contact_phone | TEXT | No |
| Current Provider | current_provider | TEXT | No |
| PostgreSQL Version | postgres_version | TEXT | No |
| Database Size | database_size | TEXT | No |
| Number of Databases | num_databases | INTEGER | No |
| Average Connections | avg_connections | INTEGER | No |
| Peak Traffic Times | peak_traffic | TEXT | No |
| Performance Requirements | performance_requirements | TEXT | No |
| Migration Timeline | migration_timeline | TEXT | No |
| Downtime Window | downtime_window | TEXT | No |
| Zero Downtime | zero_downtime | TEXT | No |
| Data Sensitivity | data_sensitivity | TEXT | No |
| Tier Interest | tier_interest | TEXT | No |
| Add-ons | addons | TEXT (JSON) | No |
| Infrastructure Preference | infrastructure_preference | TEXT | No |
| Region Preference | region_preference | TEXT | No |
| Compliance Requirements | compliance_requirements | TEXT (JSON) | No |
| Backup Retention | backup_retention | TEXT | No |
| Data Residency | data_residency | TEXT | No |
| Security Certifications | security_certifications | TEXT | No |
| Referral Source | referral_source | TEXT | No |
| Current Monthly Spend | current_monthly_spend | TEXT | No |
| Budget | budget | TEXT | No |
| Contract Length | contract_length | TEXT | No |
| Anticipated Growth | anticipated_growth | TEXT | No |
| Use Case | use_case | TEXT | No |
| Specific Requirements | specific_requirements | TEXT | No |
| Special Considerations | special_considerations | TEXT | No |

---

**CostPlusDB Customer Intake Form v1.0**
*Professional PostgreSQL hosting consultation*
