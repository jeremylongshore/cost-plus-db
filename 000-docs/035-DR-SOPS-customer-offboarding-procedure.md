# Customer Offboarding Procedure (SOP-403)

**Document Type:** DR-SOPS (Daily Routine - Standard Operating Procedure)
**SOP Number:** SOP-403
**Created:** 2025-10-20
**Owner:** Intent Solutions (CostPlusDB)
**Purpose:** Professional customer offboarding, data export, and database removal

---

## Overview

**What this SOP covers:** Safely and professionally offboarding a customer who cancels service, including data export, archival, and database removal.

**When to use:** When a customer requests cancellation or fails to pay after grace period.

**Time required:** 30-60 minutes (depending on database size)
**Risk level:** HIGH - Permanent data deletion involved
**Frequency:** Estimated 1-3x per month at scale

---

## Offboarding Scenarios

### Scenario 1: Voluntary Cancellation (Customer-Initiated)

**Trigger:** Customer emails requesting cancellation
**Timeline:** 30-day grace period before deletion
**Outcome:** Professional exit, positive relationship maintained

### Scenario 2: Non-Payment (Involuntary)

**Trigger:** Payment failure after 14-day grace period
**Timeline:** 30 days from last successful payment
**Outcome:** Account suspended, then deleted

### Scenario 3: Terms Violation (Rare)

**Trigger:** Customer violates Acceptable Use Policy
**Timeline:** Immediate suspension, 7-day appeal period
**Outcome:** Database archived, account terminated

### Scenario 4: Temporary Suspension (Pause)

**Trigger:** Customer requests temporary pause (travel, downtime, etc.)
**Timeline:** Up to 90 days
**Outcome:** Database preserved, billing paused, reactivation available

---

## Prerequisites

**Before starting offboarding:**

- [ ] Customer cancellation request received in writing (email)
- [ ] Reason for cancellation documented
- [ ] Outstanding invoices identified (paid or unpaid)
- [ ] Customer ID verified
- [ ] Database name verified
- [ ] You have sudo access to VPS

**Required Information:**

- Customer ID: _______________
- Database Name: _______________
- Database User: _______________
- Cancellation Reason: _______________
- Last Payment Date: _______________
- Outstanding Balance: _______________

---

## Safety Checklist

**Critical warnings:**

- ⚠️ This procedure involves permanent data deletion
- ⚠️ Customer must explicitly acknowledge data deletion
- ⚠️ Always offer data export before deletion
- ⚠️ Always create final backup before deletion
- ⚠️ Cannot recover data after database drop (intentionally no recovery)

**Red Flags (STOP if encountered):**

- ❌ Customer has not acknowledged data deletion policy
- ❌ Outstanding balance > $500 without payment plan
- ❌ Dispute in progress (wait for resolution)
- ❌ Customer requested cancellation by phone (require written confirmation)

---

## Offboarding Timeline

### Standard Voluntary Cancellation Timeline

```
Day 0:  Customer submits cancellation request
Day 1:  Confirm cancellation, offer data export
Day 7:  Send data export (if requested)
Day 14: Send final invoice and 16-day deletion warning
Day 30: Final warning (database deletion in 24 hours)
Day 31: Database deletion, account archived
```

### Non-Payment Timeline

```
Day 0:  Payment due date
Day 3:  Automated payment reminder email
Day 7:  Second payment reminder (manual email)
Day 14: Final notice, account suspension warning
Day 15: Account suspended (database inaccessible)
Day 30: Final data export offer
Day 31: Database deletion, account archived
```

---

## Part 1: Cancellation Request & Acknowledgment

### Step 1: Receive Cancellation Request

**Customer sends email:**

```
Subject: Cancel my CostPlusDB account
From: john@acme.com

Hi Jeremy,

I need to cancel my database service. We're shutting down the project.
Please cancel my account effective immediately.

Thanks,
John
```

### Step 2: Acknowledge Cancellation & Offer Export

**Response email template:**

```
Subject: RE: Cancel my CostPlusDB account - Cancellation Confirmed

Hi {CUSTOMER_NAME},

I've received your cancellation request for {DATABASE_NAME}. I'm sorry to see you go, but I understand.

**Cancellation Details:**
- Database: {DATABASE_NAME}
- Cancellation Date: {TODAY}
- Final Access Date: {30_DAYS_FROM_NOW}
- Final Invoice: ${AMOUNT} (prorated for {DAYS} days)

**IMPORTANT - Data Export:**

Your database will remain accessible for 30 days. After that, all data will be permanently deleted and cannot be recovered.

Would you like me to provide a database export before deletion?

I can provide:
✅ Full PostgreSQL dump file (.sql or .dump format)
✅ CSV exports of all tables
✅ Secure download link (expires in 7 days)

Just reply with your preference, or let me know if you've already exported your data.

**What happens next:**

1. Your database remains accessible for 30 days ({30_DAYS_FROM_NOW})
2. Billing will be prorated to today
3. You'll receive final invoice within 3 business days
4. Data export provided (if requested)
5. Database deleted on {30_DAYS_FROM_NOW}
6. Account archived

**Want to share feedback?**

I'd love to know why you're canceling (optional, helps us improve):
- Cost too high?
- Performance issues?
- Switching providers?
- Project shutting down?
- Something else?

Thanks for being a customer. If you need anything in the future, don't hesitate to reach out.

Best regards,
Jeremy Longshore
Founder, CostPlusDB
jeremy@intentsolutions.io
```

### Step 3: Document Cancellation

```bash
# Set customer variables
CUSTOMER_ID="acme-corp-20251020"
CUSTOMER_DIR="/home/admincostplus/projects/costplusdb/001-security/customers/active/$CUSTOMER_ID"

# Create cancellation record
cat > $CUSTOMER_DIR/cancellation.md <<EOF
# Cancellation Record

**Customer:** {CUSTOMER_NAME}
**Customer ID:** $CUSTOMER_ID
**Cancellation Date:** $(date +%Y-%m-%d)
**Requested By:** {CUSTOMER_EMAIL}

## Cancellation Details

**Reason:** {CANCELLATION_REASON}
**Type:** Voluntary
**Notice Period:** 30 days
**Final Access Date:** $(date -d "+30 days" +%Y-%m-%d)
**Database Deletion Date:** $(date -d "+31 days" +%Y-%m-%d)

## Outstanding Balance

**Last Payment:** {LAST_PAYMENT_DATE}
**Amount Paid:** \${AMOUNT}
**Outstanding Balance:** \${OUTSTANDING}
**Final Invoice:** \${FINAL_INVOICE}

## Data Export Requested

- [ ] Yes - Format: _______________
- [ ] No - Customer confirmed data already exported

## Customer Feedback

{FEEDBACK_TEXT}

## Internal Notes

{INTERNAL_NOTES}

---

**Processed By:** $(whoami)
**Date:** $(date +%Y-%m-%d\ %H:%M:%S)
EOF

chmod 640 $CUSTOMER_DIR/cancellation.md
echo "✅ Cancellation documented"
```

---

## Part 2: Data Export (If Requested)

### Step 4: Create Full Database Dump

**Purpose:** Provide customer with complete copy of their data.

```bash
# Set variables
CUSTOMER_ID="acme-corp-20251020"
DB_NAME="acme_production"
DB_USER="acme_user"
EXPORT_DIR="/home/admincostplus/projects/costplusdb/001-security/customers/active/$CUSTOMER_ID/exports"
EXPORT_DATE=$(date +%Y%m%d)

# Create export directory
mkdir -p $EXPORT_DIR
chmod 700 $EXPORT_DIR

# Option 1: PostgreSQL custom format (recommended, compressed)
sudo -u postgres pg_dump -Fc -d $DB_NAME -f $EXPORT_DIR/${DB_NAME}_${EXPORT_DATE}.dump

# Option 2: SQL format (human-readable, larger file)
sudo -u postgres pg_dump -d $DB_NAME -f $EXPORT_DIR/${DB_NAME}_${EXPORT_DATE}.sql

# Option 3: Plain SQL with compression
sudo -u postgres pg_dump -d $DB_NAME | gzip > $EXPORT_DIR/${DB_NAME}_${EXPORT_DATE}.sql.gz

# Check export file size
ls -lh $EXPORT_DIR/

echo "✅ Database export created"
```

**Export Formats:**

| Format | File Extension | Size | Use Case |
|--------|----------------|------|----------|
| Custom | `.dump` | Small (compressed) | Best for pg_restore |
| SQL | `.sql` | Large (uncompressed) | Human-readable |
| SQL + gzip | `.sql.gz` | Small (compressed) | Portable, universal |

### Step 5: Create CSV Exports (Optional)

**Purpose:** Provide table-by-table CSV exports for non-PostgreSQL use.

```bash
# Get list of all tables
TABLES=$(sudo -u postgres psql -d $DB_NAME -tAc "SELECT tablename FROM pg_tables WHERE schemaname='public';")

# Create CSV exports directory
CSV_DIR="$EXPORT_DIR/csv"
mkdir -p $CSV_DIR

# Export each table to CSV
for TABLE in $TABLES; do
  echo "Exporting table: $TABLE"
  sudo -u postgres psql -d $DB_NAME -c "\COPY $TABLE TO '$CSV_DIR/${TABLE}.csv' WITH CSV HEADER;"
done

# Create ZIP archive of CSVs
cd $EXPORT_DIR
zip -r ${DB_NAME}_tables_${EXPORT_DATE}.zip csv/

echo "✅ CSV exports created and zipped"
```

### Step 6: Generate Export Metadata

**Purpose:** Document what's included in the export.

```bash
# Create export manifest
cat > $EXPORT_DIR/EXPORT_MANIFEST.txt <<EOF
=================================================================
COSTPLUSDB - DATABASE EXPORT MANIFEST
Customer: {CUSTOMER_NAME} ($CUSTOMER_ID)
Database: $DB_NAME
Export Date: $(date +%Y-%m-%d\ %H:%M:%S)
=================================================================

EXPORT CONTENTS
--------------

PostgreSQL Dump File:
- File: ${DB_NAME}_${EXPORT_DATE}.dump
- Format: PostgreSQL custom format
- Size: $(du -h $EXPORT_DIR/${DB_NAME}_${EXPORT_DATE}.dump | cut -f1)
- PostgreSQL Version: 16.x

CSV Table Exports:
- Archive: ${DB_NAME}_tables_${EXPORT_DATE}.zip
- Size: $(du -h $EXPORT_DIR/${DB_NAME}_tables_${EXPORT_DATE}.zip | cut -f1)
- Tables Included: $(echo "$TABLES" | wc -l)

HOW TO RESTORE
-------------

**Using pg_restore (custom format):**
pg_restore -d new_database_name ${DB_NAME}_${EXPORT_DATE}.dump

**Using psql (SQL format):**
psql -d new_database_name -f ${DB_NAME}_${EXPORT_DATE}.sql

**Using CSV files:**
Unzip the archive and import CSVs into any database system.

VERIFICATION
-----------

MD5 Checksums:
$(md5sum $EXPORT_DIR/${DB_NAME}_${EXPORT_DATE}.dump)
$(md5sum $EXPORT_DIR/${DB_NAME}_tables_${EXPORT_DATE}.zip)

Database Statistics:
- Total Size: $(sudo -u postgres psql -d $DB_NAME -tAc "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));")
- Table Count: $(echo "$TABLES" | wc -l)
- Total Rows: [Run: SELECT sum(n_live_tup) FROM pg_stat_user_tables;]

=================================================================

SUPPORT

If you have trouble restoring this export, email jeremy@intentsolutions.io
We're happy to help even after cancellation.

=================================================================
EOF

chmod 640 $EXPORT_DIR/EXPORT_MANIFEST.txt
echo "✅ Export manifest created"
```

### Step 7: Upload Export to Secure Location

**Purpose:** Provide customer with download link.

**Option 1: Direct Email (Small Databases < 25 MB)**

```bash
# Email export directly as attachment
# Use email client or mail command
```

**Option 2: Wasabi S3 Temporary Link (Large Databases)**

```bash
# Upload to Wasabi S3 with 7-day expiration
# (Requires AWS CLI configured for Wasabi)

aws s3 cp $EXPORT_DIR/${DB_NAME}_${EXPORT_DATE}.dump \
  s3://costplusdb-exports/${CUSTOMER_ID}/${DB_NAME}_${EXPORT_DATE}.dump \
  --endpoint-url=https://s3.us-east-1.wasabisys.com

# Generate presigned URL (expires in 7 days)
aws s3 presign s3://costplusdb-exports/${CUSTOMER_ID}/${DB_NAME}_${EXPORT_DATE}.dump \
  --endpoint-url=https://s3.us-east-1.wasabisys.com \
  --expires-in 604800

# Send download link to customer
```

**Option 3: SFTP/SCP (Customer-Provided Server)**

```bash
# Customer provides SFTP credentials
# Upload export to their server
scp $EXPORT_DIR/${DB_NAME}_${EXPORT_DATE}.dump \
  customer@their-server.com:/path/to/destination/
```

### Step 8: Send Export Confirmation Email

**Email template:**

```
Subject: Your CostPlusDB Data Export is Ready

Hi {CUSTOMER_NAME},

Your database export is ready for download.

**Export Details:**
- Database: {DATABASE_NAME}
- Export Date: {EXPORT_DATE}
- Format: PostgreSQL custom format + CSV tables
- Total Size: {EXPORT_SIZE}

**Download Links:**
- PostgreSQL Dump: {DOWNLOAD_LINK_1} (expires in 7 days)
- CSV Tables: {DOWNLOAD_LINK_2} (expires in 7 days)

**How to Restore:**

See attached EXPORT_MANIFEST.txt for detailed restore instructions.

Quick restore:
pg_restore -d new_database_name {DB_NAME}_{EXPORT_DATE}.dump

**Verification:**

MD5 Checksum: {MD5_CHECKSUM}
Database Size: {DB_SIZE}

**Need Help?**

If you have trouble restoring this export, I'm happy to help. Just reply to this email.

Your database remains accessible until {30_DAYS_FROM_NOW}. This export is a point-in-time snapshot from {EXPORT_DATE}.

Best regards,
Jeremy Longshore
```

---

## Part 3: Account Suspension (Non-Payment Only)

### Step 9: Suspend Database Access (Day 15)

**Purpose:** Prevent access while preserving data during grace period.

```bash
# Set variables
DB_USER="acme_user"

# Revoke connection privileges (user cannot connect)
sudo -u postgres psql <<EOF
-- Revoke CONNECT privilege
REVOKE CONNECT ON DATABASE $DB_NAME FROM $DB_USER;

-- Terminate active connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE usename = '$DB_USER';
EOF

echo "✅ Database access suspended for $DB_USER"

# Update customer-info.json status to "suspended"
# Update notes.md with suspension details
```

**Suspension notification email:**

```
Subject: URGENT - CostPlusDB Account Suspended - Payment Required

Hi {CUSTOMER_NAME},

Your CostPlusDB account has been suspended due to non-payment.

**Account Status:**
- Database: {DATABASE_NAME}
- Status: SUSPENDED (no access)
- Outstanding Balance: ${AMOUNT}
- Original Due Date: {DUE_DATE}
- Days Overdue: {DAYS_OVERDUE}

**Your database is currently inaccessible.**

**To Restore Access:**
1. Pay outstanding balance: ${AMOUNT}
2. Reply to confirm payment
3. Access restored within 2 hours

**Data Retention:**
Your data is safe and preserved. If payment is not received within 15 days ({DELETION_DATE}), your database will be permanently deleted.

**Need Help?**
If you're experiencing financial difficulties, let's talk. I'm open to payment plans or temporary account pause.

Best regards,
Jeremy Longshore
jeremy@intentsolutions.io
```

### Step 10: Reactivate Account (If Payment Received)

**Purpose:** Restore access after payment.

```bash
# Grant CONNECT privilege back
sudo -u postgres psql <<EOF
GRANT CONNECT ON DATABASE $DB_NAME TO $DB_USER;
EOF

echo "✅ Database access restored for $DB_USER"

# Update customer-info.json status back to "active"
# Send reactivation confirmation email
```

---

## Part 4: Database Deletion (Day 30-31)

### Step 11: Final Deletion Warning (Day 30)

**Email template:**

```
Subject: FINAL NOTICE - Database Deletion in 24 Hours - {DATABASE_NAME}

Hi {CUSTOMER_NAME},

This is your final notice before permanent database deletion.

**Database Deletion Schedule:**
- Database: {DATABASE_NAME}
- Deletion Date: {TOMORROW}
- Deletion Time: 9:00 AM CT

**After deletion:**
- All data permanently removed
- No backups retained
- Cannot be recovered

**Last Chance Actions:**

1. **Want to keep your data?**
   - Download export: {DOWNLOAD_LINK}
   - Export expires: {EXPIRY_DATE}

2. **Want to reactivate?**
   - Pay outstanding balance: ${AMOUNT}
   - Reply to this email before 9:00 AM CT tomorrow

3. **Ready to proceed with deletion?**
   - No action needed
   - Database will be deleted automatically

Reply to this email if you need anything.

Best regards,
Jeremy Longshore
```

### Step 12: Create Final Archival Backup

**Purpose:** Internal record-keeping (not for customer recovery).

```bash
# Set variables
CUSTOMER_ID="acme-corp-20251020"
DB_NAME="acme_production"
ARCHIVE_DIR="/home/admincostplus/projects/costplusdb/001-security/customers/inactive/$CUSTOMER_ID"

# Create archive directory
mkdir -p $ARCHIVE_DIR/final-backup
chmod 700 $ARCHIVE_DIR/final-backup

# Create final backup (for internal records only)
sudo -u postgres pg_dump -Fc -d $DB_NAME -f $ARCHIVE_DIR/final-backup/${DB_NAME}_final_$(date +%Y%m%d).dump

# Document backup
cat > $ARCHIVE_DIR/final-backup/ARCHIVE_INFO.txt <<EOF
=================================================================
COSTPLUSDB - FINAL ARCHIVE
Customer: {CUSTOMER_NAME} ($CUSTOMER_ID)
Database: $DB_NAME
Archive Date: $(date +%Y-%m-%d\ %H:%M:%S)
=================================================================

PURPOSE: Internal record-keeping only (not for customer recovery)
RETENTION: 90 days from archive date
DELETION: $(date -d "+90 days" +%Y-%m-%d)

This backup is for compliance and dispute resolution only.
Do not restore unless legally required.

=================================================================
EOF

echo "✅ Final archival backup created"
```

### Step 13: Delete PostgreSQL Database and User

**⚠️ CRITICAL STEP - IRREVERSIBLE DATA DELETION**

```bash
# Set variables
DB_NAME="acme_production"
DB_USER="acme_user"

# Triple-check before proceeding
echo "⚠️  WARNING: You are about to permanently delete database '$DB_NAME'"
echo "Type the database name to confirm: "
read -r CONFIRM_DB_NAME

if [ "$CONFIRM_DB_NAME" != "$DB_NAME" ]; then
  echo "❌ Database name does not match. Aborting."
  exit 1
fi

echo "✅ Confirmation received. Proceeding with deletion..."

# Terminate all active connections to the database
sudo -u postgres psql <<EOF
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DB_NAME';
EOF

# Drop the database
sudo -u postgres psql <<EOF
DROP DATABASE IF EXISTS $DB_NAME;
EOF

if [ $? -eq 0 ]; then
  echo "✅ Database deleted: $DB_NAME"
else
  echo "❌ Failed to delete database: $DB_NAME"
  exit 1
fi

# Drop the user
sudo -u postgres psql <<EOF
DROP USER IF EXISTS $DB_USER;
EOF

if [ $? -eq 0 ]; then
  echo "✅ Database user deleted: $DB_USER"
else
  echo "❌ Failed to delete user: $DB_USER"
  exit 1
fi

# Remove pg_hba.conf entry
sudo sed -i "/$CUSTOMER_ID/,+1d" /etc/postgresql/16/main/pg_hba.conf

# Reload PostgreSQL config
sudo systemctl reload postgresql

echo "✅ PostgreSQL configuration updated"
```

### Step 14: Move Customer to Inactive Directory

**Purpose:** Archive customer records for 1 year.

```bash
# Set variables
CUSTOMER_ID="acme-corp-20251020"
ACTIVE_DIR="/home/admincostplus/projects/costplusdb/001-security/customers/active/$CUSTOMER_ID"
INACTIVE_DIR="/home/admincostplus/projects/costplusdb/001-security/customers/inactive/$CUSTOMER_ID"

# Create inactive directory
mkdir -p /home/admincostplus/projects/costplusdb/001-security/customers/inactive

# Move customer directory
mv $ACTIVE_DIR $INACTIVE_DIR

# Update customer-info.json status
# status: "deleted"
# metadata.deleted_at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
# metadata.retention_until: "$(date -d "+1 year" -u +%Y-%m-%dT%H:%M:%SZ)"

echo "✅ Customer moved to inactive directory"
```

### Step 15: Send Deletion Confirmation Email

**Email template:**

```
Subject: Database Deletion Complete - {DATABASE_NAME}

Hi {CUSTOMER_NAME},

Your database has been permanently deleted as scheduled.

**Deletion Details:**
- Database: {DATABASE_NAME}
- Deleted: {DELETE_DATE} at {DELETE_TIME}
- Status: Permanently removed

**What was deleted:**
- All database tables and data
- Database user and credentials
- Automated backups

**Your account has been closed.**

**Questions or Concerns?**

If you have questions or need account information for your records, email jeremy@intentsolutions.io.

Thank you for being a customer. If you need database hosting in the future, we'd love to work with you again.

Best regards,
Jeremy Longshore
Founder, CostPlusDB
```

### Step 16: Log Deletion

**Purpose:** Audit trail of deletion action.

```bash
# Log deletion
DELETION_LOG="/home/admincostplus/projects/costplusdb/logs/deletions.log"

cat >> $DELETION_LOG <<EOF
[$(date +%Y-%m-%d\ %H:%M:%S)] DATABASE_DELETED
Customer ID: $CUSTOMER_ID
Customer Name: {CUSTOMER_NAME}
Database: $DB_NAME
User: $DB_USER
Reason: {CANCELLATION_REASON}
Deleted By: $(whoami)
Archive Location: $INACTIVE_DIR
Retention Until: $(date -d "+1 year" +%Y-%m-%d)
EOF

echo "✅ Deletion logged"
```

---

## Part 5: Temporary Account Pause (Alternative to Deletion)

### Customer Requests Temporary Pause

**Use case:** Customer needs to pause service for 1-3 months (travel, funding gap, etc.)

**Email template:**

```
Subject: RE: Pause my CostPlusDB account

Hi {CUSTOMER_NAME},

I can definitely pause your account temporarily.

**Pause Details:**
- Your database will remain intact (no deletion)
- Billing will be paused (no charges)
- Access will be suspended (database inaccessible during pause)
- Maximum pause duration: 90 days

**Cost:**
- No charge during pause
- $10 reactivation fee when you resume

**When you're ready to resume:**
- Email me
- I'll reactivate within 2 hours
- All your data will be exactly as you left it

Sound good? Just reply to confirm.

Best,
Jeremy
```

**Pause procedure:**

```bash
# Revoke CONNECT (suspend access)
sudo -u postgres psql -c "REVOKE CONNECT ON DATABASE $DB_NAME FROM $DB_USER;"

# Update customer-info.json
# status: "paused"
# metadata.paused_at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
# metadata.pause_ends_at: "$(date -d "+90 days" -u +%Y-%m-%dT%H:%M:%SZ)"
# billing.status: "paused"

# Stop billing
# (Manual process until billing automation implemented)

echo "✅ Account paused for $CUSTOMER_ID"
```

**Reactivation procedure:**

```bash
# Grant CONNECT (restore access)
sudo -u postgres psql -c "GRANT CONNECT ON DATABASE $DB_NAME TO $DB_USER;"

# Update customer-info.json
# status: "active"
# metadata.reactivated_at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
# billing.status: "active"

# Send reactivation invoice ($10 fee + prorated month)

echo "✅ Account reactivated for $CUSTOMER_ID"
```

---

## Offboarding Checklist

**Before deletion, verify:**

- [ ] Cancellation request received in writing
- [ ] Customer acknowledged data deletion policy
- [ ] Data export offered and completed (if requested)
- [ ] Final invoice sent and outstanding balance settled (or written off)
- [ ] 30-day grace period elapsed
- [ ] Final deletion warning sent (24 hours before)
- [ ] Final archival backup created (internal records)
- [ ] Database name and customer ID triple-checked
- [ ] Database deleted (DROP DATABASE)
- [ ] User deleted (DROP USER)
- [ ] pg_hba.conf entry removed
- [ ] Customer directory moved to inactive
- [ ] customer-info.json updated (status: deleted)
- [ ] Deletion confirmation email sent
- [ ] Deletion logged in audit trail
- [ ] Cancellation reason documented (for analysis)

---

## Metrics to Track

**Churn Metrics:**
- Number of cancellations per month
- Churn rate (% of customers canceling)
- Average customer lifetime (days)
- Cancellation reasons (categorized)

**Offboarding Performance:**
- Time from cancellation request to deletion
- Percentage of customers requesting data export
- Percentage of suspended accounts reactivating
- Revenue recovered from paused accounts

---

## Related Documentation

- **033-DR-GUID-customer-onboarding-complete-workflow.md** - Onboarding process
- **034-DR-SOPS-customer-database-provisioning.md** - Database provisioning
- **020-DR-ARCH-customer-database-structure.md** - Customer directory structure
- **005-DR-SOPS-postgresql-operations.md** - General PostgreSQL SOPs

---

**Document Owner:** Jeremy Longshore (jeremy@intentsolutions.io)
**Last Updated:** 2025-10-20
**Review Frequency:** Quarterly
**Related SOP:** SOP-403 (Emergency Procedures - Customer Cancellation & Data Deletion)
