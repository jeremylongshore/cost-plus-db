# Customer Onboarding Workflow

Complete step-by-step guide for onboarding new CostPlusDB customers from initial contact through active service.

## Overview

The onboarding workflow consists of 5 main stages:

1. **Lead Capture** - Customer fills out intake form
2. **Consultation** - Review requirements, confirm pricing
3. **Payment** - Process payment via Stripe
4. **Provisioning** - Create PostgreSQL database on VPS
5. **Activation** - Deliver credentials, customer goes live

**Total Time**: 24-48 hours from payment to active database

---

## Stage 1: Lead Capture (Prospect)

### Customer Actions
- Visits CostPlusDB website
- Navigates to pricing calculator
- Fills out customer intake form
- Submits form

### System Actions
```
1. Netlify Forms receives submission
2. Form data stored in forms/form-submissions/
3. Resend sends confirmation email to customer
4. Form submission record created in database (status: pending)
```

### Manual Actions Required
**NONE** - Fully automated

### Files Created
- `forms/form-submissions/{timestamp}-{email}.json` - Raw form data
- Database record in `form_submissions` table

### Next Steps
Wait for form processing (runs every 15 minutes via cron)

---

## Stage 2: Form Processing & Consultation

### System Actions
```bash
# Automated via cron job
cd /path/to/002-clients/scripts
node process-intake-form.js ../forms/form-submissions/latest.json
```

**Script actions:**
1. Reads form submission JSON
2. Creates customer record (status: prospect)
3. Moves customer data to `customers/prospects/{customer-id}/`
4. Updates form submission status to "processed"
5. Logs activity in activity_log table

### Manual Actions Required

**Review customer requirements:**
```bash
sqlite3 database/costplusdb.db "SELECT * FROM customers WHERE status='prospect' ORDER BY created_at DESC LIMIT 5;"
```

**Contact customer for consultation:**
- Review their use case and requirements
- Confirm appropriate tier selection
- Answer technical questions
- Provide pricing confirmation

**Send consultation follow-up:**
```bash
# Use template
cat templates/consultation-confirmation.md

# Customize and send via Resend
```

### Files Created
- `customers/prospects/{customer-id}/info.json` - Customer data
- `customers/prospects/{customer-id}/notes.txt` - Consultation notes

### Next Steps
Customer receives payment link, proceeds to payment

---

## Stage 3: Payment Processing

### Customer Actions
- Receives Stripe payment link via email
- Enters payment information
- Completes payment

### System Actions
```
1. Stripe webhook fires payment.succeeded event
2. Webhook handler updates customer status: prospect → active
3. Customer folder moved from prospects/ to active/
4. Provisioning workflow triggered automatically
```

### Manual Actions Required

**If using manual payment processing:**
```bash
# Update customer status
sqlite3 database/costplusdb.db "UPDATE customers SET status='active', activated_at=datetime('now') WHERE customer_id='CUST-XXXXXXXX';"

# Move customer folder
mv customers/prospects/CUST-XXXXXXXX customers/active/

# Trigger provisioning
cd scripts
./provision-database.sh CUST-XXXXXXXX <tier>
```

### Files Updated
- Customer record status: prospect → active
- Customer folder location: prospects/ → active/

### Next Steps
Database provisioning begins automatically

---

## Stage 4: Database Provisioning

### System Actions
```bash
# Automated after payment confirmation
cd scripts
./provision-database.sh <customer-id> <tier>
```

**Provisioning script performs:**

1. **VPS Selection**
   - Selects appropriate VPS based on tier and location
   - Checks available capacity

2. **Database Creation**
   - SSH into VPS
   - Create PostgreSQL database and user
   - Configure database parameters based on tier
   - Set connection limits, shared_buffers, etc.

3. **Security Configuration**
   - Generate strong password (32 characters)
   - Configure SSL/TLS certificates
   - Set up firewall rules
   - Create dedicated database user

4. **Backup Configuration**
   - Configure pgBackRest for database
   - Set up S3/Wasabi backup target
   - Run initial full backup
   - Configure backup schedule

5. **Monitoring Setup**
   - Add database to monitoring system
   - Configure alerting thresholds
   - Set up log collection

6. **Database Record Creation**
   ```sql
   INSERT INTO databases (
       customer_id, database_name, host, port, username,
       status, provisioned_at, backup_enabled, backup_location
   ) VALUES (...);
   ```

### Manual Actions Required

**Monitor provisioning progress:**
```bash
tail -f logs/provisioning-{customer-id}.log
```

**Verify successful provisioning:**
```bash
# Check database status
sqlite3 database/costplusdb.db "SELECT * FROM databases WHERE customer_id='CUST-XXXXXXXX';"

# Test database connection
psql "host=<host> port=5432 dbname=<db_name> user=<user> sslmode=require" -c "SELECT version();"

# Verify backup
ssh vps-server "pgbackrest info --stanza=<db_name>"
```

### Files Created
- `customers/active/{customer-id}/credentials.json` - Connection details (encrypted)
- `customers/active/{customer-id}/provisioning.log` - Provisioning log
- `logs/provisioning-{customer-id}.log` - Detailed provisioning log

### Next Steps
Send credentials to customer

---

## Stage 5: Credential Delivery & Activation

### System Actions
```bash
# Send setup confirmation email
cd scripts
./send-setup-email.sh <customer-id>
```

**Email includes:**
- Database connection details (host, port, database name, username)
- Temporary password (customer must change on first login)
- SSL certificate download link
- Connection examples (psql, pgAdmin, application connection strings)
- Getting started guide
- Support contact information

### Manual Actions Required

**Verify email sent:**
```bash
# Check logs
tail logs/email-{customer-id}.log
```

**Follow up with customer:**
- Confirm email received
- Offer onboarding call if needed
- Provide documentation links
- Set expectations for support

**Final verification:**
```bash
# Update database status to active
sqlite3 database/costplusdb.db "UPDATE databases SET status='active' WHERE customer_id='CUST-XXXXXXXX';"

# Log activation
sqlite3 database/costplusdb.db "INSERT INTO activity_log (customer_id, action, description, actor) VALUES ('CUST-XXXXXXXX', 'activated', 'Customer successfully activated', 'admin');"
```

### Files Created
- `customers/active/{customer-id}/setup-email-sent.log`
- Activity log entry: "customer_activated"

---

## Post-Activation

### Ongoing Monitoring

**Daily:**
- Check backup success
- Monitor connection health
- Review error logs

**Weekly:**
- Review storage usage
- Check performance metrics
- Customer check-in (first month)

**Monthly:**
- Billing cycle
- Usage report
- Capacity planning

### Customer Support

**Support channels:**
- Email: support@costplusdb.com
- Slack (for Pro/Enterprise)
- Documentation: docs.costplusdb.com

**Response times:**
- Shared: 24 hours
- Dedicated: 12 hours
- Pro: 4 hours
- Enterprise: 1 hour

---

## Troubleshooting

### Form Submission Not Processing

**Check:**
```bash
# Verify form data exists
ls -l forms/form-submissions/

# Check processing logs
tail logs/form-processing.log

# Manually process
node scripts/process-intake-form.js forms/form-submissions/<file>.json
```

### Provisioning Fails

**Common issues:**
1. VPS capacity full - Select different VPS
2. Database name conflict - Check existing databases
3. Backup configuration fails - Verify S3 credentials
4. Network connectivity - Check VPS firewall rules

**Recovery:**
```bash
# Check provisioning status
sqlite3 database/costplusdb.db "SELECT * FROM databases WHERE status='provisioning';"

# Retry provisioning
./scripts/provision-database.sh <customer-id> <tier> --retry
```

### Email Not Received

**Check:**
```bash
# Verify Resend API key
echo $RESEND_API_KEY

# Check email logs
tail logs/email-*.log

# Resend manually
./scripts/send-setup-email.sh <customer-id> --force
```

---

## Automation

### Cron Jobs

**Process form submissions (every 15 minutes):**
```cron
*/15 * * * * cd /path/to/002-clients/scripts && node process-intake-form.js
```

**Sync to Turso cloud (daily at 2 AM):**
```cron
0 2 * * * cd /path/to/002-clients/scripts && ./sync-to-turso.sh
```

**Cleanup old logs (weekly):**
```cron
0 0 * * 0 find /path/to/002-clients/logs -name "*.log" -mtime +30 -delete
```

### Webhook Handlers

**Stripe payment.succeeded:**
- Updates customer status to active
- Triggers provisioning workflow

**Stripe payment.failed:**
- Updates customer record
- Sends payment failure notification

---

## Security Checklist

- [ ] Customer data stored in gitignored directories
- [ ] Database credentials encrypted at rest
- [ ] SSL/TLS enabled for all database connections
- [ ] Strong passwords generated (32+ characters)
- [ ] Backup encryption enabled
- [ ] Access logs maintained
- [ ] Regular security audits scheduled

---

## Reference

### Database Schema
See: `database/schema.sql`

### Email Templates
See: `templates/`

### Provisioning Script
See: `scripts/provision-database.sh`

### SOPs
See: `000-docs/005-DR-SOPS-postgresql-operations.md`

---

**Last Updated**: 2025-10-20
