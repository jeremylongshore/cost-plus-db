# Database Migration Guide - CostPlusDB

**Purpose:** Partner with customers to migrate their PostgreSQL database to CostPlusDB safely and smoothly.

**Philosophy:** This is a **partnership**. You're not just a vendor - you're helping them trust you with their most critical asset (their data). Take migration seriously.

---

## Pre-Migration Discovery (Critical)

**Before agreeing to take on a customer, understand their migration complexity:**

### Discovery Questions (During Sales Call)

1. **Current Provider:**
   - "Where is your database currently hosted?" (AWS RDS, Heroku, DigitalOcean, self-hosted)
   - "What PostgreSQL version are you running?"
   - "Do you use any provider-specific extensions?" (e.g., AWS RDS specific features)

2. **Database Complexity:**
   - "How large is your database?" (GB)
   - "How many tables/schemas?"
   - "Do you use stored procedures, triggers, or complex functions?"
   - "Any extensions? (PostGIS, pg_trgm, timescaledb, etc.)"

3. **Acceptable Downtime:**
   - "What's your acceptable downtime window for migration?"
   - "Do you have a maintenance window? When?"
   - "Is this a production database or staging?"

4. **Technical Capability:**
   - "Do you have someone technical who can help during migration?"
   - "Have you done a PostgreSQL migration before?"
   - "Can you take a pg_dump and send it to me?"

### Migration Complexity Assessment

**Simple (You can handle):**
- ✅ Database <50GB
- ✅ Standard PostgreSQL (no exotic extensions)
- ✅ Customer can handle basic pg_dump/restore
- ✅ Staging database or acceptable downtime >2 hours

**Medium (Requires planning):**
- ⚠️ Database 50-200GB
- ⚠️ Production database with <1 hour downtime requirement
- ⚠️ Uses extensions (need to verify compatibility)
- ⚠️ Customer needs hand-holding

**Complex (Consider declining or charging extra):**
- ❌ Database >200GB (takes hours to transfer)
- ❌ Real-time replication needed (zero downtime)
- ❌ Exotic extensions (PostGIS with custom types, timescaledb)
- ❌ Customer has no technical capability
- ❌ Mission-critical production with <15 min downtime requirement

**Be honest:** "Based on what you've told me, this migration is [simple/complex]. Here's what I recommend..."

---

## Migration Methods

### Method 1: pg_dump/pg_restore (Recommended)

**Best for:** Most migrations <100GB

**Downtime:** 30 minutes to 4 hours (depends on size)

**Process:**

1. **Customer takes backup:**
   ```bash
   # On their current server
   pg_dump -h old_host -U old_user -d old_db --format=custom --file=dump.backup
   ```

2. **Customer sends you the dump:**
   - Via encrypted file transfer (Dropbox, Google Drive with link)
   - Or they restore it themselves using credentials you provide

3. **You restore to their CostPlusDB database:**
   ```bash
   # On your CostPlusDB server
   sudo -u postgres pg_restore -h localhost -p 5432 -U customer_user -d customer_db --no-owner --no-acl dump.backup
   ```

4. **Verification:**
   ```bash
   # Check row counts match
   sudo -u postgres psql -p 5432 -d customer_db -c "SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables ORDER BY schemaname, tablename;"
   ```

**Customer updates connection string and tests.**

---

### Method 2: Logical Replication (Low Downtime)

**Best for:** Large databases (>100GB) or production with <30 min downtime requirement

**Downtime:** 5-30 minutes (just cutover)

**Process:**

1. **Set up logical replication from their database to yours:**
   - Requires superuser access on source (AWS RDS supports this)
   - Continuously syncs data in real-time

2. **When ready to cutover:**
   - Stop application writes
   - Let replication catch up (usually <1 minute)
   - Switch application connection string to CostPlusDB
   - Resume writes

3. **Verification:**
   - Compare row counts
   - Run application smoke tests

**This is advanced.** Only offer if customer has technical capability and you've practiced it.

---

### Method 3: Direct Copy (Self-Service)

**Best for:** Technical customers who want control

**Downtime:** Varies (customer manages)

**Process:**

1. **You provision their database on CostPlusDB**
2. **Send them connection credentials**
3. **Customer does migration themselves:**
   - pg_dump from old → pg_restore to new
   - Or use tools like pgloader, AWS DMS, etc.

4. **You're available for support questions**

**This is ideal.** Empowers customer, reduces your time commitment.

---

## Migration Checklist (Step-by-Step)

### Pre-Migration (1-2 Days Before)

**[ ] Provision customer database**
- Run provisioning script
- Test connection
- Verify SSL working

**[ ] Send customer pre-migration email:**

```
Subject: CostPlusDB Migration - Scheduled for [Date/Time]

Hi [Name],

Your CostPlusDB database is ready! Here's what we'll do for migration:

MIGRATION WINDOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date: [Date]
Time: [Time] CST
Expected Duration: [X hours]
Method: pg_dump/pg_restore

YOUR NEW CREDENTIALS (Don't use yet - for testing only)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Host: [server_ip]
Port: 5432
Database: [customer_name]_db
User: [customer_name]_user
Password: [password]
SSL: REQUIRED

BEFORE MIGRATION DAY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Test connection to new database (it's empty for now)
2. Take a backup of your current database (just in case)
3. Identify your acceptable downtime window
4. Have someone available during migration window

MIGRATION PROCESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. You take pg_dump of current database
2. You send me the dump file (Dropbox/Google Drive link)
3. I restore to your new CostPlusDB database
4. We verify data integrity together
5. You update your application connection string
6. You test and give me the green light
7. We monitor for 24 hours

ROLLBACK PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If anything goes wrong, you can immediately switch back to your old database. We'll keep your old setup running for 7 days after successful migration.

Questions? Reply to this email or call me at [your number].

Jeremy
```

**[ ] Customer confirms migration window**

---

### Migration Day (During Window)

**[ ] 15 min before: Final check-in**
- Email/call customer: "Ready to start?"
- Confirm their backup is complete
- Verify they can switch back if needed

**[ ] Start migration**

1. **Customer provides dump file:**
   - Dropbox/Google Drive link
   - Or they run pg_dump themselves

2. **Download dump (if they sent it):**
   ```bash
   wget -O /tmp/customer-dump.backup "[dropbox_link]"
   ```

3. **Verify dump file:**
   ```bash
   file /tmp/customer-dump.backup
   # Should say: "PostgreSQL custom database dump"

   ls -lh /tmp/customer-dump.backup
   # Check size is reasonable
   ```

4. **Restore to CostPlusDB:**
   ```bash
   sudo -u postgres pg_restore \
     -h localhost \
     -p 5432 \
     -U customer_user \
     -d customer_db \
     --no-owner \
     --no-acl \
     --verbose \
     /tmp/customer-dump.backup 2>&1 | tee /tmp/restore.log
   ```

5. **Monitor restore progress:**
   - Watch for errors in output
   - Typical speed: 50-100MB/min

6. **Verify row counts:**
   ```bash
   # Get customer's row counts from old database
   # Compare with new database

   sudo -u postgres psql -p 5432 -d customer_db -c \
     "SELECT schemaname, tablename, n_live_tup
      FROM pg_stat_user_tables
      ORDER BY schemaname, tablename;"
   ```

7. **Check for errors:**
   ```bash
   grep -i error /tmp/restore.log
   grep -i fatal /tmp/restore.log
   ```

**[ ] Email customer: "Migration complete, ready for testing"**

```
Subject: Migration Complete - Ready for Testing

Hi [Name],

Good news! Your database migration is complete.

VERIFICATION RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Database restored successfully
✅ Row counts verified: [X tables, Y total rows]
✅ No errors in migration log
✅ Connection tested and working

NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Test your application with new connection string:
   postgresql://[user]:[pass]@[host]:5432/[db]?sslmode=require

2. Run your smoke tests

3. When you're confident, switch your production traffic

4. Let me know once you've cutover and I'll monitor closely

ROLLBACK (if needed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If anything looks wrong, just switch back to your old database. We can troubleshoot and retry.

I'll be available for the next [X hours] to help.

Jeremy
```

---

### Post-Migration (Day 1)

**[ ] Customer switches production traffic**
- They update connection string
- Monitor application logs
- Watch for connection issues

**[ ] Monitor database activity:**
```bash
# Check active connections
sudo -u postgres psql -p 5432 -c \
  "SELECT datname, usename, count(*)
   FROM pg_stat_activity
   WHERE datname = 'customer_db'
   GROUP BY datname, usename;"

# Check for errors in PostgreSQL log
sudo tail -100 /var/log/postgresql/postgresql-18-main.log | grep customer_db
```

**[ ] Check first backup:**
- Verify backup ran successfully at 2 AM
- Email customer confirmation

**[ ] Day 1 check-in email:**

```
Subject: Day 1 Check-in - How's CostPlusDB?

Hi [Name],

Your migration was 24 hours ago. Quick check-in:

✅ First backup completed successfully (2 AM last night)
✅ Database is healthy and responding
✅ [X connections] currently active

How's everything looking on your end? Any issues or unexpected behavior?

Jeremy
```

---

## Common Migration Issues & Solutions

### Issue 1: Extension Not Available

**Symptom:** `ERROR: extension "xyz" does not exist`

**Solution:**
```bash
# Install extension on your CostPlusDB server
sudo apt-get install postgresql-18-[extension-name]

# Enable for customer database
sudo -u postgres psql -p 5432 -d customer_db -c \
  "CREATE EXTENSION IF NOT EXISTS [extension-name];"
```

**Common extensions to support:**
- pg_trgm (fuzzy search)
- pgcrypto (encryption)
- uuid-ossp (UUID generation)
- hstore (key-value store)

---

### Issue 2: Permission Errors During Restore

**Symptom:** `ERROR: permission denied for schema public`

**Solution:** Use `--no-owner --no-acl` flags in pg_restore (already in guide)

---

### Issue 3: Row Count Mismatch

**Symptom:** Customer says row counts don't match

**Investigate:**
1. Did they stop writes during migration?
2. Check for duplicate data
3. Compare specific tables:
   ```bash
   # On their old database
   SELECT count(*) FROM important_table;

   # On CostPlusDB
   sudo -u postgres psql -p 5432 -d customer_db -c \
     "SELECT count(*) FROM important_table;"
   ```

---

### Issue 4: Slow Queries After Migration

**Symptom:** "Queries are slower on CostPlusDB"

**Solution:** Rebuild indexes and analyze
```bash
sudo -u postgres psql -p 5432 -d customer_db -c \
  "REINDEX DATABASE customer_db;"

sudo -u postgres psql -p 5432 -d customer_db -c \
  "ANALYZE;"
```

---

## When to Say No to a Migration

**Decline if:**
- ❌ Customer expects zero downtime but won't pay for logical replication setup
- ❌ Database >500GB and you don't have experience with large migrations
- ❌ Customer is hostile or demanding ("Just make it work!")
- ❌ Uses exotic extensions you can't support (e.g., Citus, TimescaleDB advanced features)
- ❌ Requires instant rollback capability (complex disaster recovery)

**Be honest:** "This migration is more complex than I can confidently handle right now. I recommend [alternative provider] or waiting until I have more experience."

**Your reputation > one customer's money**

---

## Migration Pricing

### Included in Standard Service

**Free migration assistance for:**
- Simple pg_dump/restore (database <50GB)
- Email support during migration window
- Basic troubleshooting

### Charge Extra For

**$500 one-time migration fee:**
- Database >100GB
- Logical replication setup
- Custom extension installation
- Complex schema transformations
- >2 hours of hands-on work

**Be transparent:** "Your migration is complex. I typically charge a one-time $500 migration fee for this level of work. Sound fair?"

---

## Post-Migration Follow-Up

### Week 1
- Daily check-ins via email
- Monitor backup success
- Watch for performance issues

### Week 2
- 2x check-ins
- Ensure customer is happy

### Month 1
- Ask for feedback: "How's CostPlusDB compared to [old provider]?"
- Request testimonial if they're happy

---

## Customer Success = Your Success

**Remember:**
- Migration is scary for customers (it's their data!)
- Over-communicate
- Set realistic expectations
- Test everything twice
- Have a rollback plan
- Stay available during/after migration

**A smooth migration = customer for life**

---

Jeremy Longshore
CostPlusDB
jeremy@intentsolutions.io
