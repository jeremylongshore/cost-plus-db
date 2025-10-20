# Customer Onboarding Checklist

**Document Type:** PM-TASK (Project Management - Task List)
**Created:** 2025-10-20
**Owner:** Intent Solutions (CostPlusDB)
**Purpose:** Per-customer onboarding checklist to ensure nothing is missed

---

## Overview

**What this is:** A comprehensive checklist for each new customer, from initial contact through successful go-live.

**How to use:**
1. Copy this template for each new customer
2. Fill in customer details at top
3. Check off each task as completed
4. Save completed checklist in customer directory
5. Review for process improvements

**Timeline Target:** Complete within 24-48 hours of onboarding form submission

---

## Customer Information

**Customer ID:** ___________________________
**Company Name:** ___________________________
**Contact Name:** ___________________________
**Contact Email:** ___________________________
**Plan Tier:** [ ] Shared  [ ] Dedicated  [ ] Pro  [ ] Enterprise
**Database Name:** ___________________________
**Database User:** ___________________________

**Start Date:** ___________________________
**Target Go-Live Date:** ___________________________

---

## Stage 1: Initial Contact & Qualification

**Timeline:** 0-4 hours from consultation form submission

### Tasks

- [ ] **Consultation form received**
  - Date/Time: _______________
  - Source: [ ] Website form  [ ] Email  [ ] Other: _______________
  - Auto-confirmation email sent: [ ] Yes  [ ] No

- [ ] **Review inquiry for fit**
  - ✅ Needs managed PostgreSQL: [ ] Yes  [ ] No
  - ✅ Budget aligns ($49-$149/mo): [ ] Yes  [ ] No
  - ✅ No requirements we can't meet: [ ] Yes  [ ] No
  - ❌ Red flags identified: [ ] None  [ ] Yes (explain): _______________

- [ ] **Create prospect directory**
  - Path: `/home/admincostplus/projects/costplusdb/001-security/customers/prospects/{email}/`
  - Created: [ ] Yes
  - Permissions set (0750): [ ] Yes

- [ ] **Save initial inquiry**
  - File: `initial-inquiry.md` created: [ ] Yes
  - Inquiry date: _______________
  - How they heard about us: _______________
  - Initial notes: _______________

- [ ] **Respond to customer within 4 hours**
  - Response sent: [ ] Yes
  - Date/Time sent: _______________
  - Next step communicated: [ ] Sent onboarding form  [ ] Clarifying questions

---

## Stage 2: Onboarding Form Submission

**Timeline:** 4-24 hours from initial response

### Tasks

- [ ] **Send onboarding form**
  - Form sent: [ ] Yes
  - Date/Time: _______________
  - Form template used: `021-DR-FORM-customer-onboarding-intake.md`
  - Attachment or inline: [ ] Attachment  [ ] Inline

- [ ] **Customer completes onboarding form**
  - Received: [ ] Yes
  - Date/Time: _______________
  - Saved to: `prospects/{email}/onboarding-form.md`

- [ ] **Validate completed form**
  - Company info complete: [ ] Yes  [ ] No
  - Database name valid (lowercase, alphanumeric, underscores): [ ] Yes  [ ] No
  - Database user valid: [ ] Yes  [ ] No
  - Plan selection clear: [ ] Yes  [ ] No
  - Payment method specified: [ ] Yes  [ ] No
  - Terms accepted and signed: [ ] Yes  [ ] No
  - No conflicting requirements: [ ] Yes  [ ] No (explain): _______________

- [ ] **Clarifications needed?**
  - [ ] No, form complete - proceed to Stage 3
  - [ ] Yes, sent clarification email on: _______________
  - Questions asked: _______________
  - Response received: _______________

---

## Stage 3: Provisioning Preparation

**Timeline:** 0-2 hours after form validation

### Tasks

- [ ] **Generate customer ID**
  - Format: `{company-slug}-{timestamp}`
  - Customer ID: ___________________________
  - Verified unique: [ ] Yes

- [ ] **Create customer directory structure**
  - Base path: `/home/admincostplus/projects/costplusdb/001-security/customers/active/{customer-id}/`
  - Created: [ ] Yes
  - Subdirectories created:
    - [ ] `invoices/`
    - [ ] `support-tickets/`
    - [ ] `backup-logs/`
  - Permissions set (0750): [ ] Yes

- [ ] **Create customer-info.json**
  - File created: [ ] Yes
  - Company details filled: [ ] Yes
  - Plan details filled: [ ] Yes
  - Billing details filled: [ ] Yes
  - Status set to "provisioning": [ ] Yes
  - Permissions set (0600): [ ] Yes

- [ ] **Move onboarding form to customer directory**
  - Moved from `prospects/` to `active/{customer-id}/`: [ ] Yes
  - Permissions set (0640): [ ] Yes

- [ ] **Verify VPS capacity**
  - Disk space available (20% buffer): [ ] Yes
  - Connection capacity available: [ ] Yes
  - If Shared tier, < 10 customers on VPS: [ ] Yes  [ ] N/A (Dedicated+)
  - Notes: _______________

- [ ] **Payment method confirmed**
  - [ ] Credit card setup (Stripe)
  - [ ] ACH authorized
  - [ ] Invoice approved (Net 30)
  - [ ] Other: _______________
  - Payment verified/invoice sent: [ ] Yes

---

## Stage 4: Database Provisioning

**Timeline:** 15-30 minutes

**Reference:** SOP-103 (`034-DR-SOPS-customer-database-provisioning.md`)

### Tasks

- [ ] **Environment variables set**
  - CUSTOMER_ID: _______________
  - DB_NAME: _______________
  - DB_USER: _______________
  - PLAN_TIER: _______________

- [ ] **Database name validated**
  - Format check passed (lowercase, alphanumeric, underscores): [ ] Yes
  - No conflicts with existing databases: [ ] Yes

- [ ] **Database user validated**
  - Format check passed: [ ] Yes
  - No conflicts with existing users: [ ] Yes

- [ ] **Secure password generated**
  - 32 characters: [ ] Yes
  - Cryptographically random: [ ] Yes
  - Saved to temporary file (0600): [ ] Yes

- [ ] **PostgreSQL database created**
  - Database created: [ ] Yes
  - UTF8 encoding: [ ] Yes
  - Comment added (customer reference): [ ] Yes
  - Command executed successfully: [ ] Yes

- [ ] **PostgreSQL user created**
  - User created with encrypted password: [ ] Yes
  - Connection limit set based on tier: [ ] Yes (limit: _______)
  - NOCREATEDB, NOCREATEROLE set: [ ] Yes
  - Comment added: [ ] Yes

- [ ] **Permissions granted**
  - ALL PRIVILEGES on database: [ ] Yes
  - Database ownership transferred: [ ] Yes
  - Schema permissions set: [ ] Yes
  - Default privileges set: [ ] Yes

- [ ] **SSL/TLS requirement configured**
  - pg_hba.conf backed up: [ ] Yes
  - hostssl entry added: [ ] Yes
  - PostgreSQL reloaded: [ ] Yes
  - No errors on reload: [ ] Yes

- [ ] **Connection test successful**
  - Test connection passed: [ ] Yes
  - PostgreSQL version displayed: [ ] Yes (version: _______)
  - No authentication errors: [ ] Yes

- [ ] **Credentials file created**
  - File: `database-credentials.txt` created: [ ] Yes
  - All connection details included: [ ] Yes
  - Permissions set (0600): [ ] Yes

- [ ] **customer-info.json updated**
  - Database credentials added: [ ] Yes
  - Connection string added: [ ] Yes
  - Status changed to "active": [ ] Yes
  - Provisioned_at timestamp added: [ ] Yes

- [ ] **Backup configuration verified**
  - pgBackRest dry-run test passed: [ ] Yes
  - Database will be included in next automated backup: [ ] Yes

- [ ] **Monitoring verified**
  - VPS-level monitoring active: [ ] Yes
  - Database accessible via external check: [ ] Yes

- [ ] **Internal notes created**
  - File: `notes.md` created: [ ] Yes
  - Provisioning details documented: [ ] Yes
  - Special configurations noted: [ ] Yes

- [ ] **Final verification passed**
  - Database exists: [ ] Yes
  - User exists: [ ] Yes
  - Connection test: [ ] Yes
  - Credentials file exists: [ ] Yes
  - customer-info.json updated: [ ] Yes
  - SSL requirement configured: [ ] Yes

- [ ] **Provisioning logged**
  - Entry added to `/logs/provisioning.log`: [ ] Yes
  - Provisioning time recorded: _______ minutes

---

## Stage 5: Credential Delivery

**Timeline:** 15 minutes after provisioning complete

### Tasks

- [ ] **Generate setup confirmation email**
  - Template used: `022-DR-FORM-setup-confirmation.md`
  - All placeholders replaced:
    - [ ] {COMPANY_NAME}
    - [ ] {DATABASE_NAME}
    - [ ] {DATABASE_USER}
    - [ ] {DATABASE_PASSWORD}
    - [ ] {PLAN_TIER}
    - [ ] {PLAN_PRICE}
    - [ ] {CUSTOMER_EMAIL}
    - [ ] {BILLING_DAY}
    - [ ] All other placeholders
  - Saved to: `setup-confirmation.md`: [ ] Yes
  - Permissions set (0640): [ ] Yes

- [ ] **Send credentials email**
  - Email sent to: _______________
  - Subject: "✅ Your CostPlusDB Database is Ready!"
  - Includes:
    - [ ] Database credentials
    - [ ] Connection string (copy-paste ready)
    - [ ] Test instructions
    - [ ] Backup details
    - [ ] Support information
  - Setup confirmation attached or inline: [ ] Yes
  - Date/Time sent: _______________

- [ ] **Generate first invoice**
  - Invoice created: [ ] Yes
  - Invoice number: _______________
  - Amount: $_______________
  - Due date: _______________
  - Saved to: `invoices/`: [ ] Yes

- [ ] **Send first invoice**
  - Invoice sent: [ ] Yes
  - Date/Time sent: _______________
  - Payment method on file: [ ] Yes

- [ ] **Update customer status**
  - Status: "active": [ ] Yes
  - credentials_sent_at timestamp: [ ] Yes
  - Next invoice date set: [ ] Yes

---

## Stage 6: Post-Launch Support

**Timeline:** 24-48 hours after credential delivery

### Tasks

### 1-Hour Check (After Credential Delivery)

- [ ] **Check for connection attempts**
  - Reviewed PostgreSQL logs: [ ] Yes
  - Connection attempts found:
    - [ ] ✅ Successful connections
    - [ ] ❌ Failed authentication
    - [ ] ❌ SSL errors
    - [ ] No connections yet
  - Notes: _______________

### 4-Hour Check

- [ ] **Check connection status**
  - Customer connected successfully: [ ] Yes  [ ] No  [ ] Not yet
  - If no connection, prepared support email: [ ] Yes  [ ] N/A

### 24-Hour Check

- [ ] **Proactive customer check-in email sent**
  - Email sent: [ ] Yes
  - Date/Time: _______________
  - Asked if setup successful: [ ] Yes
  - Offered migration assistance: [ ] Yes

- [ ] **Review connection activity**
  - Connection count: _______
  - Active connections: _______
  - Any issues identified: [ ] No  [ ] Yes (explain): _______________

- [ ] **Customer response received**
  - [ ] N/A (too early)
  - [ ] Yes - all good, database working
  - [ ] Yes - encountered issues (see support tickets)
  - [ ] No response yet

### 48-Hour Check

- [ ] **Verify first backup completed**
  - Checked backup logs: [ ] Yes
  - Customer database included in backup: [ ] Yes
  - Backup successful: [ ] Yes
  - Backup timestamp: _______________
  - If backup failed:
    - [ ] Issue identified: _______________
    - [ ] Issue resolved: [ ] Yes  [ ] In progress
    - [ ] Customer notified: [ ] Yes  [ ] No

- [ ] **Database size check**
  - Initial size: _______ MB
  - Tables created: _______ (count)
  - Data imported: [ ] Yes  [ ] No  [ ] Unknown

### Week 1 Follow-Up

- [ ] **Send Week 1 welcome email**
  - Email sent: [ ] Yes
  - Date/Time: _______________
  - Included:
    - [ ] Resources (docs, best practices)
    - [ ] Feedback request
    - [ ] Reminder of support availability

- [ ] **Mark customer as fully active**
  - First connection verified: [ ] Yes
  - First backup verified: [ ] Yes
  - No outstanding issues: [ ] Yes
  - Status in customer-info.json: "active": [ ] Yes
  - first_connection_at timestamp: [ ] Yes
  - first_backup_verified_at timestamp: [ ] Yes

---

## Support & Troubleshooting

### Common Issues Encountered

- [ ] **Issue 1: Cannot connect**
  - Issue: _______________
  - Resolution: _______________
  - Time to resolve: _______ minutes
  - Ticket created: [ ] Yes  [ ] No

- [ ] **Issue 2: Password authentication failed**
  - Issue: _______________
  - Resolution: _______________
  - Time to resolve: _______ minutes
  - Ticket created: [ ] Yes  [ ] No

- [ ] **Issue 3: SSL connection error**
  - Issue: _______________
  - Resolution: _______________
  - Time to resolve: _______ minutes
  - Ticket created: [ ] Yes  [ ] No

- [ ] **Other issues:**
  - Issue: _______________
  - Resolution: _______________
  - Time to resolve: _______ minutes
  - Ticket created: [ ] Yes  [ ] No

---

## Quality Assurance

### Final Review Checklist

- [ ] **Customer directory complete**
  - [ ] customer-info.json (0600)
  - [ ] database-credentials.txt (0600)
  - [ ] onboarding-form.md (0640)
  - [ ] setup-confirmation.md (0640)
  - [ ] notes.md (0640)
  - [ ] invoices/ directory
  - [ ] support-tickets/ directory
  - [ ] backup-logs/ directory

- [ ] **Database provisioned correctly**
  - [ ] Database created
  - [ ] User created
  - [ ] Permissions set
  - [ ] SSL enforced
  - [ ] Connection tested
  - [ ] Backup configured

- [ ] **Customer communication complete**
  - [ ] Onboarding form sent
  - [ ] Credentials sent
  - [ ] First invoice sent
  - [ ] 24-hour check-in sent
  - [ ] Week 1 welcome sent

- [ ] **Billing set up**
  - [ ] Payment method on file
  - [ ] First invoice sent
  - [ ] Next invoice date scheduled
  - [ ] Billing cycle confirmed

- [ ] **Monitoring active**
  - [ ] VPS monitoring includes customer database
  - [ ] Backup schedule includes customer database
  - [ ] Alert email configured

- [ ] **Documentation complete**
  - [ ] All checklist items completed
  - [ ] Issues documented in notes.md
  - [ ] Provisioning logged
  - [ ] Customer satisfaction confirmed

---

## Metrics & Performance

### Onboarding Performance

**Time Tracking:**

- Initial contact to onboarding form sent: _______ hours
- Onboarding form received to provisioning start: _______ hours
- Provisioning duration: _______ minutes
- Provisioning complete to credentials sent: _______ minutes
- **Total: Initial contact to live database:** _______ hours

**Target:** < 24 hours from onboarding form to live database

**Quality Metrics:**

- Issues encountered during onboarding: _______ (count)
- Support tickets opened in first week: _______ (count)
- Time to first connection: _______ hours
- Customer satisfaction (if feedback received): _______________

**Process Improvements Identified:**

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## Sign-Off

### Provisioned By

**Name:** Jeremy Longshore
**Date:** _______________
**Signature:** _______________

### Customer Confirmation (Optional)

**Customer confirmed successful setup:**
- [ ] Yes, via email
- [ ] Yes, via support ticket
- [ ] Yes, via connection logs
- [ ] Not yet confirmed

**Customer feedback:**
_______________________________________________
_______________________________________________

---

## Checklist Completion

- [ ] **All stages completed**
- [ ] **No outstanding issues**
- [ ] **Customer successfully using database**
- [ ] **Billing set up correctly**
- [ ] **Checklist saved to customer directory**
  - File: `onboarding-checklist-completed.md`
  - Location: `/home/admincostplus/projects/costplusdb/001-security/customers/active/{customer-id}/`

**Checklist Completed Date:** _______________

---

## Notes & Special Considerations

**Special requests from customer:**
_______________________________________________
_______________________________________________

**Unique configuration:**
_______________________________________________
_______________________________________________

**Follow-up actions needed:**
_______________________________________________
_______________________________________________

**Lessons learned:**
_______________________________________________
_______________________________________________

---

## Archive Information

**For future reference when customer is moved to inactive:**

- Onboarding date: _______________
- Go-live date: _______________
- Initial plan tier: _______________
- Database size at launch: _______ MB
- Issues during onboarding: _______________
- Total onboarding time: _______ hours

---

**Document Template Version:** 1.0
**Last Updated:** 2025-10-20
**Template Owner:** Jeremy Longshore (jeremy@intentsolutions.io)

---

## How to Use This Checklist

**For Each New Customer:**

1. **Copy this template:**
   ```bash
   cp 000-docs/038-PM-TASK-customer-onboarding-checklist.md \
      001-security/customers/active/{customer-id}/onboarding-checklist.md
   ```

2. **Fill in customer details** at the top

3. **Work through each stage** sequentially

4. **Check off tasks** as you complete them

5. **Document issues** in the Support & Troubleshooting section

6. **Record metrics** for continuous improvement

7. **Save completed checklist** when all stages done

8. **Review for improvements** after each customer

**Benefits:**
- Nothing gets missed
- Consistent customer experience
- Easy to track progress
- Identify bottlenecks
- Train future team members
- Continuous process improvement

---

**Related Documentation:**

- **033-DR-GUID-customer-onboarding-complete-workflow.md** - Detailed workflow
- **034-DR-SOPS-customer-database-provisioning.md** - Provisioning SOP
- **021-DR-FORM-customer-onboarding-intake.md** - Onboarding form
- **022-DR-FORM-setup-confirmation.md** - Setup confirmation template
- **020-DR-ARCH-customer-database-structure.md** - Directory structure
