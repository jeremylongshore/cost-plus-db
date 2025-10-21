# Emergency Backup Operator - Business Continuity Plan
## CostPlusDB Solo Founder Risk Mitigation

**Version:** 1.0
**Date Created:** 2025-10-21
**Last Updated:** 2025-10-21
**Owner:** Jeremy Longshore (jeremy@intentsolutions.io)
**Status:** IMPLEMENTATION READY
**Purpose:** Ensure customer database continuity if primary operator is incapacitated

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [The Solo Founder Risk](#the-solo-founder-risk)
3. [Emergency Backup Operator Role](#emergency-backup-operator-role)
4. [Dead Man's Switch System](#dead-mans-switch-system)
5. [Emergency Access Architecture](#emergency-access-architecture)
6. [Emergency Runbooks](#emergency-runbooks)
7. [Legal Framework](#legal-framework)
8. [Cost Structure Options](#cost-structure-options)
9. [Implementation Checklist](#implementation-checklist)
10. [Testing & Drills](#testing--drills)
11. [Integration with Transparency Model](#integration-with-transparency-model)

---

## 1. Executive Summary

### The Problem

**CostPlusDB is a solo founder operation.**

- **Single point of failure:** If Jeremy is unavailable (hospitalized, incapacitated, emergency), customer databases are at risk
- **Response time commitment:** 30-minute response for first 5 customers, 7 days/week
- **Critical infrastructure:** Customers depend on 99.9% uptime SLA
- **Transparency promise:** All procedures documented and public

### The Solution

**Emergency Backup Operator (EBO) System:**

✅ Trusted technical colleague with **read-only** access to infrastructure
✅ **Emergency-only** write access triggered by dead man's switch
✅ Clear procedures for 4 critical scenarios (database down, disk full, security breach, backup failure)
✅ Legal framework (NDA, contractor agreement, liability protection)
✅ Quarterly testing and drills
✅ Transparent to customers (disclosed on website)

### Success Criteria

- Emergency Backup Operator onboarded within **30 days**
- Dead man's switch tested **monthly**
- Emergency runbooks validated **quarterly**
- Customer databases protected even if primary operator incapacitated for **7+ days**

---

## 2. The Solo Founder Risk

### Current State: Single Point of Failure

**If Jeremy is incapacitated:**

❌ **Response time SLA breaks** (30 minutes → infinite)
❌ **Critical incidents go unhandled** (database down, disk full, security breach)
❌ **Backups continue** (automated) but **restorations require manual intervention**
❌ **Customer trust erodes** (no communication, no resolution)
❌ **Business reputation damaged permanently**

### How We Mitigate Today

**Existing safeguards:**

✅ **Automated monitoring** - Betterstack alerts (but no one to respond)
✅ **Automated backups** - pgBackRest daily (but no one can restore)
✅ **Documented SOPs** - All procedures public (but no one authorized to execute)
✅ **Standard PostgreSQL** - No lock-in, customers can export data (but most won't know how in emergency)

**The Gap:** No authorized human backup when primary operator unavailable.

### Real-World Scenarios

**When this matters:**

1. **Medical Emergency**
   - Car accident, hospitalization → Incapacitated 3-14 days
   - Surgery with complications → Unavailable 7-30 days
   - Serious illness → Bedridden 5-10 days

2. **Family Emergency**
   - Death in family → Distracted/unavailable 3-7 days
   - Childbirth complications → Hospital-bound 2-5 days

3. **Infrastructure Emergency**
   - While traveling with no internet → Unreachable 12-48 hours
   - Power outage + phone dead → Unreachable 6-24 hours

4. **Worst Case**
   - Sudden death → Permanent unavailability
   - Customers need migration assistance to new provider

**Bottom Line:** Solo founder = unacceptable risk without backup plan.

---

## 3. Emergency Backup Operator Role

### Role Definition

**Emergency Backup Operator (EBO):** Trusted technical colleague with authorization to perform **critical incident response** when primary operator is unavailable.

### Access Levels

#### **Level 1: Read-Only (Always Active)**

**Purpose:** Monitoring and situational awareness

**Access:**
- ✅ View Betterstack monitoring dashboard
- ✅ View backup status (Wasabi S3 read-only)
- ✅ SSH access to VPS (read-only sudo user: `ebo_readonly`)
- ✅ PostgreSQL read-only user (`ebo_monitor`)
- ✅ Access to all SOPs and documentation (public GitHub repo)

**Forbidden:**
- ❌ Database writes
- ❌ Customer data access
- ❌ Configuration changes
- ❌ VPS modifications

**Use Case:** EBO can monitor for issues, but cannot act unless emergency triggered.

#### **Level 2: Emergency Write Access (Dead Man's Switch Activated)**

**Purpose:** Critical incident response

**Triggered by:**
- Dead man's switch activated (primary operator unresponsive 24+ hours)
- Primary operator explicitly requests emergency assistance

**Additional Access:**
- ✅ Full sudo access to VPS
- ✅ PostgreSQL superuser credentials
- ✅ Wasabi S3 write access (backup restoration)
- ✅ Betterstack admin access (silence alerts, update monitors)
- ✅ Customer notification email access (Resend API)

**Scope:**
- ✅ Execute emergency runbooks (database down, disk space, backups, security)
- ✅ Communicate with customers (status updates, migration assistance)
- ✅ Coordinate with VPS provider (Contabo/Hetzner support)

**Forbidden:**
- ❌ Access customer data beyond troubleshooting needs
- ❌ Make business decisions (pricing, new customers, cancellations)
- ❌ Share credentials or access with third parties
- ❌ Delete customer data without explicit customer request

### Candidate Profile

**Required Skills:**
- ✅ 5+ years PostgreSQL administration experience
- ✅ Ubuntu/Linux server management (firewall, SSH, systemd)
- ✅ Backup restoration experience (pgBackRest or similar)
- ✅ Incident response experience (triage, root cause analysis)
- ✅ Professional communication skills (customer-facing)

**Nice to Have:**
- ✅ VPS provider experience (Contabo, Hetzner, DigitalOcean)
- ✅ Managed database service experience
- ✅ On-call rotation experience
- ✅ Security incident response

**Trust Requirements:**
- ✅ Known to primary operator personally (3+ years)
- ✅ Willing to sign NDA and contractor agreement
- ✅ Verifiable professional references
- ✅ No conflicts of interest (not competitor, not customer)

### Candidate Options

**Option A: Former Colleague / Peer (Best)**
- Someone Jeremy has worked with professionally
- Already familiar with DevOps/database operations
- Trust established through years of collaboration
- **Cost:** Friend rate ($0-50/month retainer + hourly for actual incidents)

**Option B: Fractional CTO / Consultant**
- Professional DevOps consultant offering on-call backup services
- Commercial relationship with clear SLA
- **Cost:** $200-500/month retainer + $150-300/hour incident response

**Option C: Managed Service Backstop**
- Contract with managed PostgreSQL service (e.g., PostgresPro, Crunchy Data) for emergency-only support
- They handle Level 2 emergencies, migrate customers to their platform if necessary
- **Cost:** $500-1000/month retainer

**Recommended:** Option A (trusted colleague) for first 20 customers, transition to Option B at scale.

---

## 4. Dead Man's Switch System

### What is a Dead Man's Switch?

**Purpose:** Automatically detect when primary operator is unresponsive and trigger emergency protocols.

**How it works:**
1. Primary operator checks in daily (simple email, web ping, or app)
2. If no check-in for 24 hours → Send alert to primary operator ("Are you okay?")
3. If no check-in for 48 hours → Activate Emergency Backup Operator
4. EBO receives encrypted credentials vault + emergency runbooks

### Implementation Options

#### **Option 1: Dead Man's Snitch (Recommended)**

**Service:** https://deadmanssnitch.com

**How it works:**
- Primary operator sends daily ping (cron job or manual)
- If ping missed, sends escalating alerts
- Can trigger webhooks to notify EBO

**Setup:**
```bash
# Daily cron job (runs at 8am, 8pm)
0 8,20 * * * curl https://nosnch.in/YOUR_SNITCH_ID

# Or manual check-in via email
echo "Daily check-in" | mail -s "CostPlusDB check-in" check-in@YOUR_SNITCH_EMAIL
```

**Configuration:**
- **Check-in interval:** Every 12 hours (2 pings/day)
- **Alert after:** 24 hours missed
- **Escalation:**
  - 24 hours → Email/SMS to Jeremy ("Are you okay?")
  - 48 hours → Email/SMS to EBO ("Emergency protocols activated")

**Cost:** $5/month (Hitchhiker plan, 5 snitches)

#### **Option 2: Custom Script + Monitoring**

**How it works:**
- Cron job runs daily, touches a file: `/opt/costplusdb/checkin/last_checkin.txt`
- Betterstack Heartbeat monitor checks file age
- If file >24 hours old → Alert

**Setup:**
```bash
# Create check-in directory
sudo mkdir -p /opt/costplusdb/checkin
sudo chown admin:admin /opt/costplusdb/checkin

# Daily cron (8am, 8pm)
0 8,20 * * * echo $(date +%s) > /opt/costplusdb/checkin/last_checkin.txt

# Betterstack Heartbeat: Check every 6 hours, alert if >24 hours old
# Configure in Betterstack dashboard
```

**Cost:** $0 (uses existing Betterstack account)

#### **Option 3: PagerDuty + Escalation Policy**

**How it works:**
- Daily health check incident created in PagerDuty
- If primary operator doesn't acknowledge within 12 hours → Escalate to EBO

**Cost:** $25/month (Starter plan)

**Recommended:** Option 1 (Dead Man's Snitch) for simplicity and reliability.

### Credential Vault for Emergency

**Problem:** EBO needs emergency credentials (root passwords, API keys) but shouldn't have them during normal operations.

**Solution:** Encrypted credential vault, only accessible when dead man's switch triggered.

#### **Implementation: 1Password Emergency Kit**

**Setup:**

1. **Create Emergency Vault in 1Password**
   - Vault name: "CostPlusDB Emergency Access"
   - Contains:
     - All VPS root credentials
     - PostgreSQL superuser passwords
     - Wasabi S3 API keys
     - Resend API key (customer notifications)
     - Betterstack admin credentials
     - Customer contact information

2. **Share with EBO Using Emergency Access**
   - 1Password feature: "Grant Emergency Access"
   - EBO requests access → Triggers 48-hour waiting period
   - If Jeremy doesn't deny within 48 hours → EBO gets access automatically
   - If dead man's switch triggered, Jeremy emails 1Password to grant immediate access

3. **Alternative: Time-Locked Encrypted File**
   - Encrypt credentials with GPG
   - Share decryption key with EBO in sealed envelope (physical mail)
   - Instruction: "Only open if dead man's switch activated or Jeremy explicitly authorizes"

**Recommended:** 1Password Emergency Access (automatic, auditable, revokable).

---

## 5. Emergency Access Architecture

### Network Access

#### **EBO Read-Only User (Always Active)**

**VPS Access:**
```bash
# Create EBO read-only user on each VPS
sudo adduser ebo_readonly
sudo usermod -aG sudo ebo_readonly  # Add to sudo group

# Configure sudo for read-only operations
sudo visudo -f /etc/sudoers.d/ebo_readonly

# Add these lines:
# EBO read-only user - can view logs, check services, run monitoring commands
ebo_readonly ALL=(ALL) NOPASSWD: /usr/bin/systemctl status *
ebo_readonly ALL=(ALL) NOPASSWD: /usr/bin/journalctl *
ebo_readonly ALL=(ALL) NOPASSWD: /bin/cat /var/log/*
ebo_readonly ALL=(ALL) NOPASSWD: /usr/bin/tail /var/log/*
ebo_readonly ALL=(ALL) NOPASSWD: /usr/bin/ls *
ebo_readonly ALL=(ALL) NOPASSWD: /usr/bin/df *
ebo_readonly ALL=(ALL) NOPASSWD: /usr/bin/htop
ebo_readonly ALL=(ALL) NOPASSWD: /opt/costplusdb/scripts/pg-health-check.sh
ebo_readonly ALL=(ALL) NOPASSWD: /opt/costplusdb/scripts/backup-status.sh

# Deny all other sudo commands
ebo_readonly ALL=(ALL) !/usr/bin/systemctl stop *
ebo_readonly ALL=(ALL) !/usr/bin/systemctl restart *
ebo_readonly ALL=(ALL) !/bin/rm *
ebo_readonly ALL=(ALL) !/usr/bin/apt install *

# Generate SSH key for EBO
ssh-keygen -t ed25519 -C "ebo@costplusdb-emergency"

# Add EBO's public key to authorized_keys
echo "ebo's public key here" | sudo tee -a /home/ebo_readonly/.ssh/authorized_keys
```

#### **PostgreSQL Read-Only User**

```sql
-- Create EBO monitoring user
CREATE USER ebo_monitor WITH PASSWORD 'STRONG_PASSWORD_HERE';

-- Grant read-only access to all databases
GRANT CONNECT ON DATABASE postgres TO ebo_monitor;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ebo_monitor;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO ebo_monitor;

-- Allow viewing of active queries and statistics
GRANT pg_monitor TO ebo_monitor;

-- Explicitly forbid writes
ALTER USER ebo_monitor WITH CONNECTION LIMIT 3;
ALTER USER ebo_monitor SET default_transaction_read_only = on;
```

### Emergency Escalation Process

**Scenario: Database Down at 2am on Saturday**

**Step 1: Automated Alert (Immediate)**
- Betterstack detects database down
- Sends SMS/email to Jeremy: "CRITICAL: Database vps-001 is DOWN"
- Sends copy to EBO (informational only)

**Step 2: Primary Response Window (30 minutes)**
- Jeremy expected to acknowledge and respond within 30 minutes
- If Jeremy responds → Normal incident response
- If no response → Proceed to Step 3

**Step 3: Dead Man's Switch Check (30-120 minutes)**
- EBO checks dead man's switch status
- If last check-in <24 hours ago → Wait, try contacting Jeremy again
- If last check-in >24 hours ago AND critical alert active → Proceed to Step 4

**Step 4: Emergency Activation (120 minutes after alert)**
- EBO requests 1Password Emergency Access (or opens sealed envelope)
- Receives full credentials within 48 hours (or immediately if Jeremy pre-authorized)
- EBO executes emergency runbook (see Section 6)

**Step 5: Customer Communication (Immediate after EBO activation)**
- EBO sends email to affected customers:

```
Subject: CostPlusDB Incident Response - Emergency Backup Operator Activated

Dear [Customer Name],

This is [EBO Name], the Emergency Backup Operator for CostPlusDB.

I'm writing to inform you that your database experienced a service
interruption at [TIME] on [DATE]. Our primary operator (Jeremy Longshore)
is currently unavailable, and I have been activated to handle this emergency.

STATUS:
- Issue: [Database down / Disk space / etc.]
- Impact: [Your application cannot connect / Performance degraded / etc.]
- ETA for resolution: [TIME]

ACTIONS TAKEN:
- [Specific steps being executed]
- [Current status]

I will send updates every 30 minutes until resolved.

This emergency backup operator system is part of our business continuity plan,
documented at: https://costplusdb.dev/transparency/emergency-procedures.html

If you have urgent questions, reply to this email or call: [EBO PHONE]

[EBO Name]
Emergency Backup Operator
CostPlusDB by intent solutions io
```

**Step 6: Resolution & Handoff**
- EBO resolves incident following runbooks
- Documents all actions taken in `/opt/costplusdb/logs/ebo-incident-[DATE].log`
- When Jeremy returns, full incident debrief and credential rotation

---

## 6. Emergency Runbooks

### Runbook 1: Database Down (P0 - CRITICAL)

**Symptoms:**
- Betterstack alert: "PostgreSQL service DOWN on vps-001"
- Customer reports: "Cannot connect to database"
- Health check fails: `systemctl status postgresql` shows inactive

**Impact:** CRITICAL - Customer applications offline

**Response Time:** Resolve within 30 minutes (SLA breach after 30 min)

---

#### **EBO Emergency Response Steps**

**STEP 1: Verify the Issue (2 minutes)**

```bash
# SSH to affected VPS (using ebo_readonly credentials initially)
ssh -i ~/.ssh/ebo_emergency_key ebo_readonly@VPS_IP -p 2222

# Check PostgreSQL service status
sudo systemctl status postgresql

# Expected output if down:
# ● postgresql.service - PostgreSQL RDBMS
#    Loaded: loaded
#    Active: inactive (dead)

# Check logs for crash reason
sudo tail -100 /var/log/postgresql/postgresql-16-main.log

# Look for errors:
# - "FATAL: out of memory"
# - "PANIC: could not write to file"
# - "FATAL: data directory permissions incorrect"
```

**STEP 2: Request Emergency Credentials (if not already granted)**

If still in `ebo_readonly` mode, request full access:
- Contact Jeremy (call, text, email): "VPS-001 PostgreSQL DOWN - Need emergency access"
- If no response in 30 minutes AND dead man's switch active (>24 hrs):
  - Request 1Password Emergency Access
  - OR open sealed envelope with GPG key

**STEP 3: Attempt Quick Restart (5 minutes)**

```bash
# Switch to admin user (after receiving credentials)
su - admin
# Enter emergency password from vault

# Attempt service restart
sudo systemctl restart postgresql

# Wait 30 seconds
sleep 30

# Check status
sudo systemctl status postgresql

# If ACTIVE:
echo "SUCCESS: PostgreSQL restarted" | sudo tee -a /opt/costplusdb/logs/ebo-incident-$(date +%Y%m%d).log
# Proceed to STEP 7 (customer notification)

# If FAILED:
# Proceed to STEP 4
```

**STEP 4: Diagnose Root Cause (10 minutes)**

```bash
# Check disk space (common cause of PostgreSQL failure)
df -h /var/lib/postgresql

# If <10% free:
echo "CAUSE: Disk space critical" | sudo tee -a /opt/costplusdb/logs/ebo-incident-$(date +%Y%m%d).log
# See RUNBOOK 3: Disk Space Emergency

# Check memory
free -h

# If swap is maxed out:
echo "CAUSE: Out of memory" | sudo tee -a /opt/costplusdb/logs/ebo-incident-$(date +%Y%m%d).log

# Check data directory permissions
ls -la /var/lib/postgresql/16/main

# Should be owned by postgres:postgres with 700 permissions
# If incorrect:
sudo chown -R postgres:postgres /var/lib/postgresql/16/main
sudo chmod 700 /var/lib/postgresql/16/main

# Check for database corruption
sudo -u postgres pg_controldata /var/lib/postgresql/16/main

# Look for "Database cluster state: in production" (normal)
# If "Database cluster state: in recovery" or "shut down":
# May need restore from backup (see STEP 6)
```

**STEP 5: Restore from Backup (if database corrupted) (30 minutes)**

```bash
# ONLY if PostgreSQL cannot start due to corruption

# Stop PostgreSQL (if running)
sudo systemctl stop postgresql

# Backup corrupted data directory
sudo mv /var/lib/postgresql/16/main /var/lib/postgresql/16/main.CORRUPTED.$(date +%Y%m%d)

# Restore from latest backup using pgBackRest
sudo -u postgres pgbackrest --stanza=main --delta restore

# Check restore log
sudo tail -100 /var/log/pgbackrest/main-restore.log

# If successful, start PostgreSQL
sudo systemctl start postgresql

# Verify
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"

# If working:
echo "SUCCESS: Database restored from backup" | sudo tee -a /opt/costplusdb/logs/ebo-incident-$(date +%Y%m%d).log
```

**STEP 6: Test Database Connectivity**

```bash
# Connect as postgres user
sudo -u postgres psql

# Run test query
SELECT version();
SELECT count(*) FROM pg_stat_activity;

# If successful:
\q

# Test customer database connectivity (if known)
sudo -u postgres psql -d customer_database_name -c "SELECT count(*) FROM pg_tables;"

# If successful:
echo "SUCCESS: Customer database accessible" | sudo tee -a /opt/costplusdb/logs/ebo-incident-$(date +%Y%m%d).log
```

**STEP 7: Customer Notification**

```bash
# Send recovery notification
# Use Resend API (credentials in emergency vault)

# Email template:
cat > /tmp/ebo-recovery-email.txt <<EOF
Subject: [RESOLVED] CostPlusDB Service Restored

Dear Customer,

Your database service has been restored as of $(date).

Incident Summary:
- Start: [INCIDENT_START_TIME]
- End: $(date)
- Duration: [CALCULATE_DOWNTIME]
- Cause: [ROOT_CAUSE]
- Resolution: [ACTIONS_TAKEN]

Your database is now operational. Please verify your application connectivity.

If you experience any issues, reply to this email immediately.

We will provide a full incident report within 24 hours, including:
- Root cause analysis
- Steps taken to prevent recurrence
- SLA credit calculation (if applicable)

Thank you for your patience.

[EBO Name]
Emergency Backup Operator
CostPlusDB
EOF

# Send via Resend API or directly via mail
```

**STEP 8: Documentation**

```bash
# Create incident report
cat > /opt/costplusdb/logs/ebo-incident-$(date +%Y%m%d).log <<EOF
=== EBO INCIDENT REPORT ===
Date: $(date)
VPS: [VPS_ID]
Customer: [CUSTOMER_NAME]
Incident: PostgreSQL Service Down

Timeline:
[TIME] - Alert received (Betterstack)
[TIME] - EBO logged in (read-only)
[TIME] - Emergency credentials activated
[TIME] - PostgreSQL restart attempted
[TIME] - [ACTIONS_TAKEN]
[TIME] - Service restored
[TIME] - Customer notified

Root Cause:
[SPECIFIC_CAUSE]

Resolution:
[SPECIFIC_ACTIONS]

Recommendations:
[PREVENTIVE_MEASURES]

EBO: [YOUR_NAME]
EOF

# Email incident log to Jeremy
cat /opt/costplusdb/logs/ebo-incident-$(date +%Y%m%d).log | \
  mail -s "EBO Incident Report - PostgreSQL Down on $(date)" jeremy@intentsolutions.io
```

---

### Runbook 2: Disk Space Critical (P1 - HIGH)

**Symptoms:**
- Betterstack alert: "Disk usage >90% on vps-001"
- PostgreSQL logs: "could not write to file: No space left on device"
- Database writes failing

**Impact:** HIGH - Database read-only, writes failing

**Response Time:** Resolve within 2 hours

---

#### **EBO Emergency Response Steps**

**STEP 1: Verify Disk Usage**

```bash
# SSH to VPS
ssh -i ~/.ssh/ebo_emergency_key admin@VPS_IP -p 2222

# Check disk usage
df -h

# Identify full partition (usually /var or /var/lib/postgresql)
# Example output:
# /dev/sda1       200G  185G   5.0G  98% /var/lib/postgresql

# Log finding
echo "Disk usage: $(df -h /var/lib/postgresql | tail -1)" | \
  sudo tee -a /opt/costplusdb/logs/ebo-disk-$(date +%Y%m%d).log
```

**STEP 2: Identify Space Hogs**

```bash
# Find largest directories
sudo du -h /var/lib/postgresql | sort -rh | head -20

# Common culprits:
# - Old WAL files (/var/lib/postgresql/16/main/pg_wal/)
# - pgBackRest local cache (/var/lib/pgbackrest/)
# - PostgreSQL logs (/var/log/postgresql/)
# - Old backups (/opt/costplusdb/backups/)

# Example output:
# 45G  /var/lib/postgresql/16/main/pg_wal   <-- WAL files not archived
# 12G  /var/log/postgresql                   <-- Old logs
```

**STEP 3: Quick Cleanup (Gain 10-20GB immediately)**

```bash
# SAFE CLEANUP OPTIONS (in order of preference):

# Option A: Clean old PostgreSQL logs (SAFEST)
sudo find /var/log/postgresql/ -name "*.log" -mtime +30 -delete
# Deletes logs older than 30 days

# Option B: Compress old logs instead of deleting
sudo find /var/log/postgresql/ -name "*.log" -mtime +7 -exec gzip {} \;

# Option C: Clean pgBackRest local cache
sudo -u postgres pgbackrest --stanza=main stanza-delete --force --repo1-local-only
# WARNING: Only do this if backups are confirmed in Wasabi S3

# Option D: Archive old WAL files (if archiving failed)
sudo -u postgres pgbackrest --stanza=main archive-push /var/lib/postgresql/16/main/pg_wal/XXXXXXXXXXXXXXXX
# Manually push stuck WAL files

# Option E: Clean old local backups (if any)
sudo find /opt/costplusdb/backups/ -name "*.gz" -mtime +7 -delete

# Verify space freed
df -h /var/lib/postgresql
```

**STEP 4: Restart PostgreSQL (if it stopped due to disk space)**

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# If stopped:
sudo systemctl start postgresql

# Monitor logs during startup
sudo tail -f /var/log/postgresql/postgresql-16-main.log
# Watch for errors

# Verify recovery
sudo -u postgres psql -c "SELECT version();"
```

**STEP 5: Customer Notification**

```bash
# Email customers
cat > /tmp/disk-space-recovery.txt <<EOF
Subject: CostPlusDB Service Restored - Disk Space Issue Resolved

Your database service experienced a temporary write failure due to disk space
reaching capacity. This has been resolved.

Actions Taken:
- Cleaned old log files (freed [X]GB)
- Verified database integrity
- Service restored at $(date)

Impact:
- Read operations: Not affected
- Write operations: Failed for approximately [DURATION]

We are implementing monitoring improvements to prevent this issue in the future.

[EBO Name]
EOF
```

**STEP 6: Long-Term Fix (Coordinate with Jeremy)**

```bash
# Document recommendations in incident report
cat >> /opt/costplusdb/logs/ebo-disk-$(date +%Y%m%d).log <<EOF

RECOMMENDATIONS:
1. Upgrade VPS storage (current: 200GB → recommended: 400GB)
2. Implement automated log rotation (logrotate)
3. Set up proactive alerts at 80% disk usage (currently 90%)
4. Review customer database size growth trends

Cost Impact:
- Storage upgrade: +$5-10/month per VPS
- Customer price impact: +$1-2/month (cost + 25%)

Action Required:
- Jeremy to approve storage upgrade
- Jeremy to communicate price change to customers (30 days notice)
EOF
```

---

### Runbook 3: Security Breach / Unauthorized Access (P0 - CRITICAL)

**Symptoms:**
- fail2ban alert: "Multiple SSH login attempts from [IP]"
- Betterstack alert: "Unusual traffic pattern detected"
- Customer reports: "My database was modified without authorization"
- Suspicious process running: `ps aux | grep suspicious`

**Impact:** CRITICAL - Customer data may be compromised

**Response Time:** Immediate (within 15 minutes)

---

#### **EBO Emergency Response Steps**

**STEP 1: Isolate the Server (Immediate)**

```bash
# SSH to affected VPS
ssh -i ~/.ssh/ebo_emergency_key admin@VPS_IP -p 2222

# Check for active SSH sessions
who
w

# Look for unknown sessions:
# If you see unfamiliar users or IPs:
# - Note the IP addresses
# - Note the login times

# IMMEDIATELY block all inbound traffic except your IP
sudo ufw default deny incoming
sudo ufw allow from YOUR_IP_HERE to any port 2222
sudo ufw reload

# This cuts off attacker but keeps your access

# Log action
echo "$(date) - SECURITY BREACH: Firewall locked down to EBO IP only" | \
  sudo tee -a /opt/costplusdb/logs/security-incident-$(date +%Y%m%d).log
```

**STEP 2: Identify Attack Vector**

```bash
# Check auth logs for intrusion
sudo grep -i "accepted" /var/log/auth.log | tail -50
sudo grep -i "failed" /var/log/auth.log | tail -100

# Look for:
# - "Accepted publickey for [UNKNOWN_USER]"
# - "Accepted password for root" (root login should be disabled!)
# - Unusual source IPs

# Check PostgreSQL logs for unauthorized queries
sudo grep -i "connection" /var/log/postgresql/postgresql-16-main.log | tail -100

# Look for connections from unexpected IPs

# Check for added SSH keys (backdoors)
sudo cat /home/admin/.ssh/authorized_keys
sudo cat /root/.ssh/authorized_keys  # Should not exist if root login disabled

# Check for suspicious processes
ps aux | grep -v "grep" | grep -E "nc|ncat|/tmp|/dev/shm"

# Check for modified system files
sudo find /etc -name "*.conf" -mtime -1
sudo find /var/www -mtime -1  # If hosting dashboard
```

**STEP 3: Preserve Evidence**

```bash
# Create forensics directory
sudo mkdir -p /opt/costplusdb/security-forensics/$(date +%Y%m%d)

# Copy auth logs
sudo cp /var/log/auth.log /opt/costplusdb/security-forensics/$(date +%Y%m%d)/
sudo cp /var/log/postgresql/*.log /opt/costplusdb/security-forensics/$(date +%Y%m%d)/

# List current network connections
sudo netstat -tunap > /opt/costplusdb/security-forensics/$(date +%Y%m%d)/netstat.txt

# List running processes
ps auxf > /opt/costplusdb/security-forensics/$(date +%Y%m%d)/processes.txt

# Capture list of installed packages (check for added backdoors)
dpkg -l > /opt/costplusdb/security-forensics/$(date +%Y%m%d)/packages.txt
```

**STEP 4: Change All Credentials**

```bash
# Change admin user password
sudo passwd admin

# Rotate PostgreSQL postgres user password
sudo -u postgres psql
ALTER USER postgres WITH PASSWORD 'NEW_STRONG_PASSWORD_HERE';
\q

# Update password in /etc/pgbackrest.conf if needed

# Rotate all customer database passwords
sudo -u postgres psql -c "\du"  # List all users
# Manually change each customer password
# Email new credentials to customers immediately
```

**STEP 5: Customer Data Breach Assessment**

```bash
# Check PostgreSQL logs for unauthorized data access
sudo grep -i "SELECT" /var/log/postgresql/postgresql-16-main.log | \
  grep [SUSPICIOUS_IP]

# If customer data accessed:
# - Document what queries were run
# - Document what tables were accessed
# - Prepare customer data breach notification (REQUIRED by most privacy laws)

# Check for data exfiltration
sudo grep -i "COPY" /var/log/postgresql/postgresql-16-main.log
# COPY command can export entire tables to files

# Check for dropped tables or deleted data
sudo grep -i "DROP" /var/log/postgresql/postgresql-16-main.log
sudo grep -i "DELETE" /var/log/postgresql/postgresql-16-main.log
```

**STEP 6: Customer Notification (IMMEDIATE if data accessed)**

```bash
# If customer data accessed, LEGALLY REQUIRED to notify within 72 hours (GDPR)
cat > /tmp/security-breach-notice.txt <<EOF
Subject: URGENT: CostPlusDB Security Incident - Your Immediate Action Required

[CUSTOMER_NAME],

We are writing to inform you of a security incident affecting your database.

INCIDENT SUMMARY:
- Date/Time: $(date)
- Type: Unauthorized access to server infrastructure
- Customer Data Impact: [SPECIFY: accessed / not accessed / under investigation]
- Resolution Status: [In Progress / Resolved]

ACTIONS TAKEN BY COSTPLUSDB:
- Server isolated immediately (no further unauthorized access possible)
- All credentials rotated
- Forensic investigation underway
- [OTHER_ACTIONS]

YOUR IMMEDIATE ACTIONS REQUIRED:
1. Reset your database password immediately (new credentials attached)
2. Review your application logs for unusual activity between [START] and [END]
3. Rotate any API keys or tokens stored in your database
4. Notify your customers if their data was accessed (we will provide details)

We take this incident extremely seriously. A full incident report will be
provided within 24 hours.

If you have questions, call [EBO_PHONE] immediately.

[EBO_NAME]
Emergency Backup Operator
CostPlusDB
EOF
```

**STEP 7: Restore from Clean Backup (if compromised)**

```bash
# If database modified by attacker, restore from last known-good backup

# Stop PostgreSQL
sudo systemctl stop postgresql

# Backup compromised database (for forensics)
sudo mv /var/lib/postgresql/16/main /var/lib/postgresql/16/main.COMPROMISED.$(date +%Y%m%d)

# Restore from yesterday's backup (before attack)
sudo -u postgres pgbackrest --stanza=main --type=time \
  --target="$(date -d 'yesterday' --iso-8601=seconds)" restore

# Start PostgreSQL
sudo systemctl start postgresql

# Verify restoration
sudo -u postgres psql -c "SELECT now();"
```

**STEP 8: Contact Authorities (if required)**

```bash
# For serious breaches (customer PII accessed, financial data stolen):
# - File police report
# - Contact FBI cybercrime division (if in USA)
# - Notify state attorney general (data breach laws)

# Document everything
echo "Law enforcement contacted: [AGENCY] at $(date)" | \
  sudo tee -a /opt/costplusdb/logs/security-incident-$(date +%Y%m%d).log
```

---

### Runbook 4: Backup Failure (P1 - HIGH)

**Symptoms:**
- pgBackRest email alert: "Backup failed on vps-001"
- Wasabi S3 storage full or inaccessible
- Backup verification script reports: "No backup in 48 hours"

**Impact:** HIGH - No disaster recovery if database fails

**Response Time:** Resolve within 4 hours

---

#### **EBO Emergency Response Steps**

**STEP 1: Verify Backup Status**

```bash
# SSH to VPS
ssh -i ~/.ssh/ebo_emergency_key admin@VPS_IP -p 2222

# Check backup status
sudo -u postgres pgbackrest --stanza=main info

# Expected output:
# stanza: main
#     status: ok
#     full backup: [DATE]

# If "status: error" or no backup:
# Proceed to diagnose
```

**STEP 2: Diagnose Failure**

```bash
# Check backup logs
sudo tail -100 /var/log/pgbackrest/main-backup.log

# Common failures:
# - "ERROR: [075]: repository is missing"  → Wasabi S3 connection issue
# - "ERROR: unable to open file"  → Permissions issue
# - "ERROR: backup command failed"  → PostgreSQL connection issue
# - "ERROR: archive timeout"  → WAL archiving broken

# Check Wasabi S3 connectivity
ping s3.wasabisys.com

# Check S3 credentials
cat /etc/pgbackrest.conf
# Verify repo1-s3-key and repo1-s3-key-secret are present

# Test S3 connection manually
sudo -u postgres pgbackrest --stanza=main check
```

**STEP 3: Fix Common Issues**

```bash
# Issue: S3 credentials invalid/expired
# Fix: Update credentials in /etc/pgbackrest.conf
sudo vim /etc/pgbackrest.conf
# Update repo1-s3-key and repo1-s3-key-secret
# (get fresh credentials from emergency vault)

# Issue: Wasabi storage full
# Check Wasabi dashboard for quota
# Fix: Clean old backups manually
sudo -u postgres pgbackrest --stanza=main expire
# This removes backups outside retention policy

# Issue: PostgreSQL not archiving WAL files
# Check PostgreSQL archive_command
sudo -u postgres psql -c "SHOW archive_command;"
# Should be: pgbackrest --stanza=main archive-push %p

# Fix: Restart PostgreSQL to reinitialize archiving
sudo systemctl restart postgresql

# Issue: Permissions on backup directories
# Fix:
sudo chown -R postgres:postgres /var/lib/pgbackrest
sudo chmod 750 /var/lib/pgbackrest
```

**STEP 4: Force Manual Backup**

```bash
# Attempt full backup manually
sudo -u postgres pgbackrest --stanza=main --type=full backup

# Watch logs in real-time
sudo tail -f /var/log/pgbackrest/main-backup.log

# If successful:
echo "SUCCESS: Manual backup completed at $(date)" | \
  sudo tee -a /opt/costplusdb/logs/ebo-backup-fix-$(date +%Y%m%d).log

# Verify backup in Wasabi
sudo -u postgres pgbackrest --stanza=main info
```

**STEP 5: Test Backup Restoration**

```bash
# CRITICAL: Verify backup is usable

# Restore to test directory
sudo mkdir -p /var/lib/postgresql/restore-test
sudo chown postgres:postgres /var/lib/postgresql/restore-test

sudo -u postgres pgbackrest --stanza=main --delta \
  --pg1-path=/var/lib/postgresql/restore-test restore

# Verify restored files
sudo ls -la /var/lib/postgresql/restore-test/

# Should see PostgreSQL data files:
# - PG_VERSION
# - base/
# - global/
# - pg_wal/

# Cleanup test
sudo rm -rf /var/lib/postgresql/restore-test

# If successful:
echo "SUCCESS: Backup restoration tested successfully" | \
  sudo tee -a /opt/costplusdb/logs/ebo-backup-fix-$(date +%Y%m%d).log
```

**STEP 6: Re-enable Automated Backups**

```bash
# Verify cron job is still scheduled
sudo -u postgres crontab -l | grep pgbackrest

# Expected:
# 0 2 * * * /opt/costplusdb/scripts/pgbackrest-backup.sh

# If missing, re-add:
sudo -u postgres crontab -e
# Add line: 0 2 * * * /opt/costplusdb/scripts/pgbackrest-backup.sh

# Test automated script manually
sudo -u postgres /opt/costplusdb/scripts/pgbackrest-backup.sh

# Check logs
cat /opt/costplusdb/logs/backup-scheduler.log
```

**STEP 7: Customer Communication**

```bash
# Email customers (informational)
cat > /tmp/backup-fix-notice.txt <<EOF
Subject: CostPlusDB Backup System Restored

This is a proactive notification regarding your database backup system.

We detected a temporary issue with our automated backup process on $(date -d yesterday).
The issue has been resolved, and backups are now functioning normally.

Impact:
- Your database was NOT affected
- Your data remains secure and accessible
- Backup coverage gap: [X] hours (now resolved)

Verification:
- Latest successful backup: $(date)
- Backup restoration tested: Successful

We have implemented additional monitoring to prevent this issue from recurring.

No action required on your part.

[EBO_NAME]
Emergency Backup Operator
CostPlusDB
EOF
```

---

## 7. Legal Framework

### Non-Disclosure Agreement (NDA)

**Purpose:** Protect customer data and CostPlusDB business information.

**Key Terms:**

```markdown
MUTUAL NON-DISCLOSURE AGREEMENT

This Agreement is entered into as of [DATE] between:
- Jeremy Longshore / intent solutions io ("CostPlusDB")
- [EBO_NAME] ("Emergency Backup Operator")

1. CONFIDENTIAL INFORMATION DEFINED:
   - Customer database contents
   - Customer contact information
   - Customer billing information
   - VPS credentials and API keys
   - CostPlusDB business strategies and financial information

2. EBO OBLIGATIONS:
   - EBO agrees to hold all Confidential Information in strict confidence
   - EBO shall not disclose to any third party without prior written consent
   - EBO shall use Confidential Information solely for emergency incident response
   - EBO shall not use Confidential Information for personal benefit

3. EXCEPTIONS (Not considered Confidential):
   - Information publicly available
   - Information already known to EBO prior to this agreement
   - Information required by law to disclose (with notice to CostPlusDB)

4. DATA ACCESS RESTRICTIONS:
   - EBO shall only access customer data when necessary for incident resolution
   - EBO shall not browse, export, or copy customer data except for troubleshooting
   - EBO shall not access customer financial records (payments, invoices) except
     if necessary to contact customers

5. TERM: This agreement remains in effect for 5 years from signing

SIGNATURES:
_____________________           _____________________
Jeremy Longshore                [EBO_NAME]
Date: [DATE]                    Date: [DATE]
```

### Emergency Contractor Agreement

**Purpose:** Define compensation, liability, and scope of work.

**Key Terms:**

```markdown
EMERGENCY BACKUP OPERATOR AGREEMENT

This Agreement is entered into as of [DATE] between:
- Jeremy Longshore / intent solutions io ("CostPlusDB")
- [EBO_NAME] ("Contractor")

1. SCOPE OF WORK:
   Contractor shall serve as Emergency Backup Operator for CostPlusDB, providing
   on-call emergency response services for critical database incidents when
   primary operator (Jeremy Longshore) is unavailable.

2. ACTIVATION:
   Services activated when:
   a) Dead man's switch triggers (primary operator unresponsive >24 hours)
   b) Primary operator explicitly requests emergency assistance

3. COMPENSATION (Select Option):

   OPTION A - Friend/Colleague Rate:
   - Monthly retainer: $0-50/month (access fees)
   - Incident response: $0-75/hour (capped at 4 hours per incident)
   - Maximum monthly cost: $350

   OPTION B - Professional Consultant Rate:
   - Monthly retainer: $200/month (standby availability)
   - Incident response: $150/hour (no cap)
   - Monthly estimate: $200-800

   OPTION C - Managed Service Backstop:
   - Monthly retainer: $500/month
   - Incident response: Included in retainer (unlimited)
   - Monthly fixed cost: $500

4. RESPONSIBILITIES:
   - Contractor shall maintain technical proficiency in PostgreSQL administration
   - Contractor shall respond to activation within 2 hours (emergency line)
   - Contractor shall follow emergency runbooks documented in CostPlusDB SOPs
   - Contractor shall document all actions taken during incident response

5. LIABILITY LIMITATION:
   - Contractor shall not be liable for damages resulting from good faith
     efforts to resolve incidents following documented runbooks
   - Contractor's maximum liability: Monthly retainer amount
   - CostPlusDB maintains professional liability insurance covering incidents

6. TERMINATION:
   Either party may terminate with 30 days written notice.

7. INSURANCE:
   CostPlusDB shall maintain cyber liability insurance covering EBO activities.

SIGNATURES:
_____________________           _____________________
Jeremy Longshore                [EBO_NAME]
Date: [DATE]                    Date: [DATE]
```

### Customer Data Processing Agreement (DPA) Amendment

**Purpose:** Disclose Emergency Backup Operator to customers under GDPR/privacy laws.

**Add to Terms of Service:**

```markdown
EMERGENCY BACKUP OPERATOR DISCLOSURE

To ensure continuity of service, CostPlusDB employs an Emergency Backup Operator
(EBO) who may access your database in the following circumstances:

1. When primary operator is unavailable due to emergency (medical, family, etc.)
2. When critical incidents require immediate response
3. When explicitly authorized by primary operator

SCOPE OF EBO ACCESS:
- Read-only monitoring access (always active)
- Write access only during activated emergencies
- Access limited to incident resolution (no browsing of customer data)

DATA PROTECTION:
- EBO is bound by Non-Disclosure Agreement
- EBO access is logged and auditable
- EBO credentials rotated after each incident
- Customer notification provided when EBO activates

IDENTITY:
- Name: [EBO_NAME]
- Role: Emergency Backup Operator
- Qualifications: [CREDENTIALS]

You have the right to:
- Request audit logs of EBO access to your database
- Object to EBO access (may result in service termination if continuity at risk)

By using CostPlusDB services, you consent to this arrangement.
```

---

## 8. Cost Structure Options

### Option A: Friend/Colleague Rate (Recommended for <20 customers)

**Monthly Costs:**

| Item | Cost | Notes |
|------|------|-------|
| Dead Man's Snitch | $5/month | Monitoring service |
| 1Password Emergency Access | $0 | Included in existing 1Password Teams account |
| EBO Retainer Fee | $50/month | Friend rate, access maintenance |
| EBO Incident Response | $0-75/hour | Only if activated, capped at 4 hrs/incident |

**Total Monthly:** $55-350/month

**Per Customer Impact:** $2.75-17.50/customer (for 20 customers)

**Pros:**
- ✅ Affordable at small scale
- ✅ Flexible arrangement with trusted peer
- ✅ Low overhead (no contracts, minimal paperwork)

**Cons:**
- ⚠️ Dependent on friend's availability (may have day job conflicts)
- ⚠️ No formal SLA (best effort)
- ⚠️ May not scale beyond 20-30 customers

---

### Option B: Professional Consultant (Recommended for 20-100 customers)

**Monthly Costs:**

| Item | Cost | Notes |
|------|------|-------|
| Dead Man's Snitch | $5/month | Monitoring service |
| 1Password Emergency Access | $0 | Included |
| EBO Retainer Fee | $200-500/month | Professional DevOps consultant standby fee |
| EBO Incident Response | $150-300/hour | Billed when activated, typical 2-4 hours/incident |

**Total Monthly:** $205-500/month (retainer) + incidents

**Typical Monthly with 1 incident/quarter:** ~$250-600/month

**Per Customer Impact:** $2.50-6/customer (for 100 customers)

**Pros:**
- ✅ Professional relationship with clear SLA
- ✅ Consultant likely has on-call infrastructure already
- ✅ Scalable to 100+ customers
- ✅ Tax deductible business expense

**Cons:**
- ⚠️ Higher fixed cost
- ⚠️ Less personal relationship (less trust)

---

### Option C: Managed Service Backstop (Recommended for 100+ customers)

**Monthly Costs:**

| Item | Cost | Notes |
|------|------|-------|
| Managed PostgreSQL Service Contract | $500-1000/month | e.g., PostgresPro, Crunchy Data emergency support |
| Dead Man's Snitch | $5/month | Still needed for activation trigger |

**Total Monthly:** $505-1005/month

**Per Customer Impact:** $5-10/customer (for 100 customers)

**How it works:**
- Contract with established managed PostgreSQL provider
- They provide emergency-only support (not full management)
- If primary operator unavailable, they take over incident response
- Can migrate customers to their platform if primary operator permanently unavailable

**Pros:**
- ✅ Enterprise-grade reliability
- ✅ 24/7 coverage
- ✅ Can handle mass customer migration if needed
- ✅ No trust issues (established company)

**Cons:**
- ⚠️ Expensive at small scale
- ⚠️ May recommend migrating customers away (conflict of interest)
- ⚠️ Loses "solo founder" authenticity

---

### Recommended Progression

**0-20 customers:** Option A (Friend rate) - $55-350/month total
**20-100 customers:** Option B (Professional consultant) - $250-600/month total
**100+ customers:** Option C (Managed service backstop) - $500-1000/month total

**Pass cost to customers?**

**NO** - This is a business operating expense, not passed through.

**Why:**
- Emergency backup operator is part of "service delivery cost"
- Base tier margins (80-85%) already cover operational expenses
- Customers shouldn't pay for founder risk mitigation
- Transparency model shows infrastructure costs, not internal operational costs

**However:**
- Document in transparency docs as "Business Continuity Expense"
- Show customers this is part of what base tier pricing covers

---

## 9. Implementation Checklist

### Week 1: Planning & Selection

- [ ] **Select Emergency Backup Operator candidate**
  - Review candidate options (former colleagues, professional consultants)
  - Interview candidate (technical skills, availability, trustworthiness)
  - Verify candidate references and credentials
  - Decision: Go with [CANDIDATE_NAME]

- [ ] **Negotiate compensation**
  - Decide on cost structure (Option A/B/C)
  - Draft contractor agreement
  - Agree on retainer fee and hourly rate
  - Sign contracts (NDA + Contractor Agreement)

- [ ] **Legal review**
  - Have attorney review NDA and contractor agreement
  - Update Terms of Service with EBO disclosure
  - Prepare customer DPA amendment

### Week 2: Access Setup

- [ ] **Create EBO read-only access**
  - Create `ebo_readonly` user on all VPS servers
  - Generate SSH key for EBO
  - Add public key to `~/.ssh/authorized_keys`
  - Configure sudo rules (`/etc/sudoers.d/ebo_readonly`)
  - Test SSH access from EBO's machine

- [ ] **Create PostgreSQL monitoring user**
  - Run SQL: `CREATE USER ebo_monitor WITH PASSWORD '...'`
  - Grant read-only permissions (`GRANT SELECT ON ALL TABLES`)
  - Grant pg_monitor role
  - Test connection from EBO's machine
  - Provide connection string to EBO

- [ ] **Set up emergency credential vault**
  - Create 1Password Emergency vault
  - Add all VPS root passwords
  - Add PostgreSQL superuser passwords
  - Add Wasabi S3 API keys
  - Add Resend API key
  - Add Betterstack credentials
  - Add customer contact list
  - Grant Emergency Access to EBO

### Week 3: Dead Man's Switch

- [ ] **Set up Dead Man's Snitch**
  - Create account at deadmanssnitch.com
  - Create snitch: "CostPlusDB Primary Operator Check-in"
  - Set interval: 12 hours
  - Set alert delay: 24 hours
  - Add alert contacts: Jeremy (email/SMS) + EBO (email/SMS)

- [ ] **Configure daily check-in**
  - Add cron job: `0 8,20 * * * curl https://nosnch.in/YOUR_SNITCH_ID`
  - Test manual check-in
  - Wait 25 hours, verify alert triggers

- [ ] **Create activation procedure**
  - Document in runbook: "When dead man's switch triggers, EBO shall..."
  - Set up 1Password emergency access trigger
  - Test end-to-end: Miss check-in → Alert → EBO requests access

### Week 4: Documentation & Training

- [ ] **Customize emergency runbooks**
  - Adapt generic runbooks to CostPlusDB infrastructure
  - Add VPS-specific information (IPs, credentials locations)
  - Add customer-specific information
  - Review runbooks with EBO

- [ ] **Training session with EBO (2 hours)**
  - Walk through CostPlusDB infrastructure (VPS, PostgreSQL, backups)
  - Review all 4 emergency runbooks
  - Practice SSH access and PostgreSQL connections
  - Review customer contact procedures
  - Answer EBO questions

- [ ] **Test scenario 1: Database down**
  - EBO attempts read-only diagnosis
  - EBO requests emergency credentials
  - EBO follows Runbook 1 (simulated - don't actually restart!)
  - Document time to resolution

- [ ] **Test scenario 2: Backup failure**
  - EBO reviews backup logs
  - EBO diagnoses issue
  - EBO follows Runbook 4
  - Document findings

### Week 5: Customer Communication

- [ ] **Update Terms of Service**
  - Add EBO disclosure section
  - Post updated TOS on website
  - Email all existing customers with notice

- [ ] **Update transparency documentation**
  - Add to `/transparency/emergency-procedures.html`
  - Publish emergency runbooks (public GitHub)
  - Add EBO to "About" page ("Emergency backup operator: [NAME]")

- [ ] **Customer email notification**

```
Subject: CostPlusDB Business Continuity Update

Dear CostPlusDB Customer,

As part of our commitment to transparency and service reliability, we're
implementing an Emergency Backup Operator (EBO) system.

WHAT THIS MEANS:
- A trusted technical colleague will have read-only access to monitor infrastructure
- If I (Jeremy) become unavailable due to emergency, the EBO can respond to incidents
- Your data remains protected by NDA and strict access controls

WHO IS THE EBO:
- Name: [EBO_NAME]
- Role: [Professional DevOps Consultant / Former Colleague]
- Credentials: [X] years PostgreSQL administration

WHEN DOES EBO ACCESS YOUR DATABASE:
- Only during critical incidents when I'm unavailable
- All access is logged and auditable
- You'll be notified immediately if EBO activates

This system ensures 30-minute response times even if I'm hospitalized or
experiencing a family emergency.

Full details: https://costplusdb.dev/transparency/emergency-procedures.html

Questions? Reply to this email.

Jeremy Longshore
Founder, CostPlusDB
```

### Week 6: Launch & Monitoring

- [ ] **Go live with EBO system**
  - Confirm all access is working
  - Verify dead man's switch is monitoring
  - EBO confirms availability

- [ ] **Monthly review meeting (1 hour)**
  - Review any alerts or near-misses
  - Review changes to infrastructure
  - Update runbooks if needed
  - Test dead man's switch

- [ ] **Quarterly drill**
  - Simulate full emergency scenario
  - Jeremy goes "offline" for 48 hours
  - EBO activates and follows runbooks
  - Document learnings and improve procedures

---

## 10. Testing & Drills

### Monthly Test: Dead Man's Switch

**Duration:** 5 minutes
**Frequency:** First Monday of every month

**Procedure:**

1. **Skip daily check-in intentionally**
   - Don't run cron job for 25 hours
   - Wait for Dead Man's Snitch alert

2. **Verify alerts**
   - Confirm Jeremy receives alert email/SMS
   - Confirm EBO receives informational alert

3. **Respond to alert**
   - Jeremy checks in manually: `curl https://nosnch.in/YOUR_SNITCH_ID`
   - Verify alert clears

4. **Document**
   - Log test results in `/opt/costplusdb/logs/ebo-monthly-test-[DATE].log`

**Expected Time:** Alert should trigger within 30 minutes of missed check-in.

---

### Quarterly Drill: Full Emergency Simulation

**Duration:** 2-4 hours
**Frequency:** Every 3 months (Jan, Apr, Jul, Oct)

**Procedure:**

**Pre-Drill (1 week before):**
- Schedule 4-hour window with EBO (e.g., Saturday 2pm-6pm)
- Notify customers: "Planned maintenance drill - no impact expected"
- Prepare test environment (staging VPS if available, or use non-production database)

**Drill Execution:**

**Hour 1: Scenario Briefing**
- Jeremy sends email to EBO: "I'm unavailable - activate emergency procedures"
- Jeremy goes offline (no responses for next 3 hours)
- EBO begins activation

**Hour 2: EBO Activates**
- EBO requests 1Password emergency access
- Jeremy pre-authorizes access (instead of waiting 48 hours)
- EBO receives credentials

**Hour 3: Emergency Runbook Execution**
- EBO selects one runbook to execute (rotate each quarter):
  - Q1: Database Down (simulate with stopped PostgreSQL on staging)
  - Q2: Disk Space (simulate with filled partition)
  - Q3: Security Breach (simulate with suspicious logs)
  - Q4: Backup Failure (simulate with broken backup)
- EBO follows runbook step-by-step
- EBO documents actions taken

**Hour 4: Debrief**
- Jeremy returns "from emergency"
- Review EBO's actions
- Discuss what went well / what needs improvement
- Update runbooks with learnings

**Post-Drill:**
- Rotate all credentials used during drill
- Document lessons learned
- Update emergency procedures if needed
- Schedule next quarter's drill

---

### Annual Audit: Full Business Continuity Review

**Duration:** 1 day
**Frequency:** Annually (every October)

**Scope:**

1. **Review all emergency access**
   - Verify EBO credentials still work
   - Verify 1Password Emergency Access still configured
   - Verify dead man's switch still monitoring
   - Verify Betterstack alerts routing correctly

2. **Review legal agreements**
   - Confirm NDA still in effect
   - Confirm contractor agreement current
   - Renew if needed (5-year term)

3. **Review compensation**
   - Evaluate if EBO retainer is market-rate
   - Adjust if CostPlusDB has scaled (20+ customers → increase retainer)

4. **Update runbooks**
   - Review all 4 emergency runbooks
   - Update with any infrastructure changes
   - Add new runbooks if new failure modes discovered

5. **Test customer migration scenario**
   - Simulate "Jeremy permanently unavailable"
   - EBO practices customer migration to alternative provider
   - Document process for worst-case scenario

---

## 11. Integration with Transparency Model

### Public Documentation

**CostPlusDB's transparency promise: Publish all SOPs.**

**What to publish publicly:**

✅ **Emergency runbooks** (all 4) - Published at:
- `000-docs/063-DR-SOPS-emergency-backup-operator.md` (this document)
- Website: `/transparency/emergency-procedures.html`

✅ **EBO role definition** - Listed on About page

✅ **Dead man's switch concept** - Explained in transparency docs

✅ **Customer notification procedures** - Published

**What to keep private:**

❌ **EBO identity** (until they agree to be public)
❌ **1Password emergency vault credentials**
❌ **Specific VPS IPs and passwords**
❌ **Customer contact information**
❌ **Dead Man's Snitch URLs**

**Redacted public version:**

Create `/website/transparency/emergency-procedures.html`:

```html
<h2>Emergency Backup Operator System</h2>

<p>CostPlusDB is a solo founder operation. To ensure continuity of service if
the primary operator is unavailable, we employ an Emergency Backup Operator (EBO).</p>

<h3>How It Works</h3>

<ol>
<li><strong>Daily check-in:</strong> Primary operator confirms availability twice daily</li>
<li><strong>Alert system:</strong> If no check-in for 24 hours, alert triggers</li>
<li><strong>EBO activation:</strong> After 48 hours, Emergency Backup Operator receives access</li>
<li><strong>Incident response:</strong> EBO follows documented runbooks to resolve critical issues</li>
</ol>

<h3>Emergency Runbooks</h3>

<p>Our emergency procedures are fully documented:</p>

<ul>
<li><a href="/transparency/runbook-database-down.html">Database Down</a></li>
<li><a href="/transparency/runbook-disk-space.html">Disk Space Critical</a></li>
<li><a href="/transparency/runbook-security-breach.html">Security Breach</a></li>
<li><a href="/transparency/runbook-backup-failure.html">Backup Failure</a></li>
</ul>

<h3>Your Data Protection</h3>

<p>Emergency Backup Operator access is:</p>

<ul>
<li>Read-only during normal operations</li>
<li>Write access only during activated emergencies</li>
<li>Logged and auditable (you can request access logs)</li>
<li>Bound by Non-Disclosure Agreement</li>
</ul>

<h3>Testing & Drills</h3>

<p>We test this system:</p>

<ul>
<li>Monthly dead man's switch test</li>
<li>Quarterly full emergency drill</li>
<li>Annual business continuity audit</li>
</ul>

<p>All test results documented in our <a href="/transparency/">transparency hub</a>.</p>
```

---

### Customer FAQ

**Add to `/docs.html`:**

```html
<details>
<summary><strong>What happens if Jeremy is unavailable?</strong></summary>
<p><strong>Emergency Backup Operator system.</strong></p>

<p>We have a trusted technical colleague who can respond to critical incidents if
the primary operator (Jeremy) is unavailable due to emergency.</p>

<p><strong>How it activates:</strong></p>
<ul>
<li>Jeremy checks in twice daily via automated system</li>
<li>If no check-in for 24 hours → Alert sent to Jeremy</li>
<li>If no check-in for 48 hours → Emergency Backup Operator activated</li>
</ul>

<p><strong>Your data protection:</strong></p>
<ul>
<li>EBO has read-only access during normal operations</li>
<li>Write access only during emergencies (logged and auditable)</li>
<li>Bound by NDA and contractor agreement</li>
<li>You're notified immediately if EBO activates</li>
</ul>

<p>Full details: <a href="/transparency/emergency-procedures.html">Emergency Procedures</a></p>
</details>

<details>
<summary><strong>Can I opt out of Emergency Backup Operator access?</strong></summary>
<p>Yes, but we don't recommend it.</p>

<p>If you opt out of EBO access:</p>
<ul>
<li>Your database will have no emergency response if primary operator unavailable</li>
<li>You accept risk of extended downtime during Jeremy's medical/family emergency</li>
<li>We'll provide migration assistance to another provider if needed</li>
</ul>

<p>To opt out, email: jeremy@intentsolutions.io</p>
</details>
```

---

## 12. Conclusion

### What This System Provides

✅ **Customer protection** - Databases stay operational even if founder incapacitated
✅ **Transparency** - All procedures documented and public
✅ **Scalability** - System scales from 5 customers to 100+ customers
✅ **Professionalism** - Demonstrates business continuity planning
✅ **Trust** - Customers see solo founder has thought through risks

### Implementation Timeline

**30 days from start to fully operational:**

- Week 1: Select EBO, sign agreements
- Week 2: Set up access (read-only + emergency vault)
- Week 3: Configure dead man's switch
- Week 4: Train EBO, review runbooks
- Week 5: Notify customers, update website
- Week 6: Go live, monthly monitoring begins

### Next Steps

**To implement this plan:**

1. **Read this document fully** ✅ (You're doing it now!)
2. **Identify EBO candidate** (Friend? Consultant? Service?)
3. **Review cost structure** (Option A/B/C based on customer count)
4. **Begin Week 1 checklist** (Selection and contracts)
5. **Follow implementation timeline** (Weeks 2-6)

### Questions to Answer Before Starting

- [ ] Who is my Emergency Backup Operator? (Name, contact, credentials)
- [ ] What compensation model? (Friend rate / Professional / Managed service)
- [ ] When can I start? (Need 30-day implementation window)
- [ ] Budget approved? ($55-1000/month depending on option)

---

**Document Status:** READY FOR IMPLEMENTATION
**Owner:** Jeremy Longshore (jeremy@intentsolutions.io)
**Last Updated:** 2025-10-21
**Version:** 1.0

**Next Review:** After first EBO activation (or annually if never activated)

---

*This document is part of the CostPlusDB transparency commitment.*
*Published at: https://costplusdb.dev/transparency/emergency-procedures.html*
*Source code: https://github.com/jeremylongshore/cost-plus-db (000-docs/063-DR-SOPS-emergency-backup-operator.md)*
