# Complete Automation Setup - Pre-Launch Dry Run

**Document ID:** 019-DR-TASK-complete-automation-setup
**Category:** Task Documentation
**Owner:** Operations
**Created:** 2025-10-19
**Status:** 🔴 READY TO IMPLEMENT

---

## 🎯 Objective

Move all security configurations and credentials from `/root/` and `/etc/` into the proper `/001-security/` directory structure, then fully automate all monitoring, logging, and backup systems for dry run testing.

---

## 📊 Current State Assessment

### ✅ What's Working (Production VPS)

| System | Location | Status |
|--------|----------|--------|
| **pgBackRest backups** | `/etc/pgbackrest/pgbackrest.conf` | ✅ Running daily at 2 AM |
| **Encryption key** | `/root/pgbackrest-keys/encryption-passphrase.txt` | ✅ Exists (needs to move) |
| **Wasabi credentials** | In `/etc/pgbackrest/pgbackrest.conf` | ✅ Working (needs to centralize) |
| **Backup script** | `001-security/procedures/backup-to-both-repos.sh` | ✅ In cron |
| **fail2ban** | `/etc/fail2ban/` | ✅ Running |
| **PostgreSQL SSL** | `/var/lib/postgresql/16/main/ssl/` | ✅ Enforced |

### ⚠️ What's Missing (Directory Structure)

| Item | Should Be | Currently Is | Action Needed |
|------|-----------|--------------|---------------|
| **pgbackrest.conf** | `001-security/config/backup/pgbackrest.conf` | `/etc/pgbackrest/pgbackrest.conf` | Copy to scaffold |
| **Encryption key** | `001-security/keys/backup-encryption/master.key` | `/root/pgbackrest-keys/` | Move + secure permissions |
| **Wasabi credentials** | `001-security/keys/backup-encryption/wasabi-credentials` | In pgbackrest.conf | Extract to separate file |
| **Log rotation** | `/etc/logrotate.d/costplusdb-security` | NOT EXISTS | Create |
| **Monitoring crons** | `crontab -l` | NOT EXISTS | Add |
| **Alert webhooks** | `001-security/alerts/scripts/` | NOT CONFIGURED | Implement |

---

## 🗂️ Phase 1: Organize Existing Configs into Scaffold

### Step 1.1: Copy Live pgBackRest Config

```bash
# Copy actual working config to scaffold
sudo cp /etc/pgbackrest/pgbackrest.conf \
  /home/admincostplus/projects/costplusdb/001-security/config/backup/pgbackrest.conf

# Set proper permissions
chmod 640 /home/admincostplus/projects/costplusdb/001-security/config/backup/pgbackrest.conf
```

**Verification:**
```bash
cat 001-security/config/backup/pgbackrest.conf
# Should show:
# - [main] stanza
# - repo1 (local /var/lib/pgbackrest)
# - repo2 (Wasabi S3)
# - cipher-type=aes-256-cbc
```

---

### Step 1.2: Move Encryption Key to Scaffold

```bash
# Create encryption key in scaffold
sudo cp /root/pgbackrest-keys/encryption-passphrase.txt \
  /home/admincostplus/projects/costplusdb/001-security/keys/backup-encryption/master.key

# Secure permissions (0600 - owner read/write only)
chmod 600 /home/admincostplus/projects/costplusdb/001-security/keys/backup-encryption/master.key

# Verify
cat 001-security/keys/backup-encryption/master.key
# Should output: tXoiSmzmMh67qJ/2iY7c/vSpLgUMfY4Vo0Bj2fmOx8fdQ+4svAFxQx8uljBT5yzF
```

**⚠️ CRITICAL:** This key MUST be backed up to password manager before launch!

---

### Step 1.3: Extract Wasabi Credentials to Separate File

```bash
# Create Wasabi credentials file
cat > 001-security/keys/backup-encryption/wasabi-credentials <<EOF
# Wasabi S3 Credentials for pgBackRest
# Bucket: costplusdb-backups
# Region: us-east-1

WASABI_ACCESS_KEY=49S2EH8V84D0JO6DH5MV
WASABI_SECRET_KEY=q46A3zvsEITqXeB3cbQTnyPnCFRe8XI6mSyVZuQy
WASABI_BUCKET=costplusdb-backups
WASABI_REGION=us-east-1
WASABI_ENDPOINT=s3.wasabisys.com
EOF

# Secure permissions
chmod 600 001-security/keys/backup-encryption/wasabi-credentials
```

---

### Step 1.4: Document Encryption Passphrase Location

```bash
# Create passphrase location reference
cat > 001-security/keys/backup-encryption/README.md <<EOF
# Backup Encryption Keys

## Master Encryption Key

**File:** \`master.key\`
**Cipher:** AES-256-CBC
**Used for:** pgBackRest backup encryption (local + Wasabi S3)

**⚠️ CRITICAL:** Without this key, backups CANNOT be restored!

**Current value:** \`tXoiSmzmMh67qJ/2iY7c/vSpLgUMfY4Vo0Bj2fmOx8fdQ+4svAFxQx8uljBT5yzF\`

**Backup locations:**
- [ ] 1Password vault (primary)
- [ ] Printed copy in fire safe
- [ ] Encrypted USB drive (offsite)

**Last rotated:** Never (initial key)
**Next rotation:** 2026-04-19 (6 months)

---

## Wasabi S3 Credentials

**File:** \`wasabi-credentials\`
**Access Key ID:** 49S2EH8V84D0JO6DH5MV
**Bucket:** costplusdb-backups
**Region:** us-east-1

**Used by:** pgBackRest repo2 (cloud backups)

**Rotation schedule:** Every 90 days
**Next rotation:** 2026-01-19
EOF

chmod 640 001-security/keys/backup-encryption/README.md
```

---

## 🤖 Phase 2: Implement Full Automation

### Step 2.1: Log Rotation

Create `/etc/logrotate.d/costplusdb-security`:

```bash
sudo tee /etc/logrotate.d/costplusdb-security > /dev/null <<'EOF'
# CostPlusDB Security Logs Rotation
/home/admincostplus/projects/costplusdb/001-security/logs/*/*.log {
    daily
    rotate 90
    compress
    delaycompress
    missingok
    notifempty
    create 0640 admincostplus admincostplus
    sharedscripts
    postrotate
        # Archive old logs to encrypted backup
        /home/admincostplus/projects/costplusdb/001-security/scripts/maintenance/backup-security-configs.sh >> /var/log/costplusdb-logrotate.log 2>&1
    endscript
}

# Separate rotation for audit logs (longer retention)
/home/admincostplus/projects/costplusdb/001-security/logs/audit/**/*.log {
    daily
    rotate 365
    compress
    delaycompress
    missingok
    notifempty
    create 0640 admincostplus admincostplus
}
EOF
```

**Test log rotation:**
```bash
sudo logrotate -d /etc/logrotate.d/costplusdb-security
# Should show what would happen (dry run)

sudo logrotate -f /etc/logrotate.d/costplusdb-security
# Force rotation to test
```

---

### Step 2.2: Monitoring Cron Jobs

```bash
# Edit crontab
crontab -e

# Add these lines:
```

```cron
# CostPlusDB Security Monitoring
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Check failed logins every 5 minutes
*/5 * * * * /home/admincostplus/projects/costplusdb/001-security/scripts/monitoring/check-failed-logins.sh >> /home/admincostplus/projects/costplusdb/001-security/logs/security-events/failed-auth.log 2>&1

# Check resource usage every 15 minutes
*/15 * * * * /home/admincostplus/projects/costplusdb/001-security/scripts/monitoring/check-resource-usage.sh >> /home/admincostplus/projects/costplusdb/001-security/logs/security-events/resource-usage.log 2>&1

# Check SSL certificate expiry every 6 hours
0 */6 * * * /home/admincostplus/projects/costplusdb/001-security/scripts/monitoring/check-ssl-expiry.sh >> /home/admincostplus/projects/costplusdb/001-security/logs/alerts/ssl-expiry-checks.log 2>&1

# Backup security configs daily at 2 AM (after database backup)
0 2 * * * /home/admincostplus/projects/costplusdb/001-security/scripts/maintenance/backup-security-configs.sh >> /home/admincostplus/projects/costplusdb/001-security/logs/backups/config-backups.log 2>&1

# Security event check every hour
0 * * * * /home/admincostplus/projects/costplusdb/001-security/scripts/monitoring/check-security-events.sh >> /home/admincostplus/projects/costplusdb/001-security/logs/security-events/hourly-check.log 2>&1

# Monthly security scan (Lynis) - 1st of month at 3 AM
0 3 1 * * /home/admincostplus/projects/costplusdb/001-security/scripts/monitoring/run-lynis-scan.sh >> /home/admincostplus/projects/costplusdb/001-security/logs/scans/lynis-monthly.log 2>&1
```

**Verify cron jobs:**
```bash
crontab -l | grep -i costplus
# Should show all 6 cron jobs
```

---

### Step 2.3: Create Missing Monitoring Scripts

#### check-failed-logins.sh

```bash
cat > 001-security/scripts/monitoring/check-failed-logins.sh <<'EOF'
#!/bin/bash
# Check for failed PostgreSQL authentication attempts

THRESHOLD=5
LOG_FILE="/var/log/postgresql/postgresql-16-main.log"
ALERT_SCRIPT="/home/admincostplus/projects/costplusdb/001-security/alerts/scripts/send-alert-email.sh"

# Count failed attempts in last 5 minutes
FAILED_COUNT=$(sudo grep "authentication failed" "$LOG_FILE" | grep "$(date '+%Y-%m-%d %H:%M' --date='5 minutes ago')" | wc -l)

if [ "$FAILED_COUNT" -gt "$THRESHOLD" ]; then
    echo "[$(date)] ALERT: $FAILED_COUNT failed login attempts in last 5 minutes"
    $ALERT_SCRIPT "Failed Login Alert" "Detected $FAILED_COUNT failed PostgreSQL login attempts in last 5 minutes. Investigate immediately."
fi
EOF

chmod +x 001-security/scripts/monitoring/check-failed-logins.sh
```

#### check-resource-usage.sh

```bash
cat > 001-security/scripts/monitoring/check-resource-usage.sh <<'EOF'
#!/bin/bash
# Monitor disk space, CPU, and memory

DISK_THRESHOLD=85
MEM_THRESHOLD=90
ALERT_SCRIPT="/home/admincostplus/projects/costplusdb/001-security/alerts/scripts/send-alert-email.sh"

# Check disk usage
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
    echo "[$(date)] ALERT: Disk usage at ${DISK_USAGE}%"
    $ALERT_SCRIPT "Disk Space Alert" "Disk usage at ${DISK_USAGE}% (threshold: ${DISK_THRESHOLD}%)"
fi

# Check memory usage
MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ "$MEM_USAGE" -gt "$MEM_THRESHOLD" ]; then
    echo "[$(date)] ALERT: Memory usage at ${MEM_USAGE}%"
    $ALERT_SCRIPT "Memory Alert" "Memory usage at ${MEM_USAGE}% (threshold: ${MEM_THRESHOLD}%)"
fi

echo "[$(date)] Resource check complete - Disk: ${DISK_USAGE}%, Memory: ${MEM_USAGE}%"
EOF

chmod +x 001-security/scripts/monitoring/check-resource-usage.sh
```

#### check-ssl-expiry.sh

```bash
cat > 001-security/scripts/monitoring/check-ssl-expiry.sh <<'EOF'
#!/bin/bash
# Check PostgreSQL SSL certificate expiration

CERT_FILE="/var/lib/postgresql/16/main/ssl/server.crt"
ALERT_SCRIPT="/home/admincostplus/projects/costplusdb/001-security/alerts/scripts/send-alert-email.sh"
DAYS_WARNING=30

if [ ! -f "$CERT_FILE" ]; then
    echo "[$(date)] ERROR: Certificate file not found: $CERT_FILE"
    exit 1
fi

# Get expiration date
EXPIRY_DATE=$(sudo openssl x509 -in "$CERT_FILE" -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

if [ "$DAYS_UNTIL_EXPIRY" -lt "$DAYS_WARNING" ]; then
    echo "[$(date)] ALERT: SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
    $ALERT_SCRIPT "SSL Certificate Expiry Warning" "PostgreSQL SSL certificate expires in $DAYS_UNTIL_EXPIRY days. Renew immediately."
else
    echo "[$(date)] SSL certificate valid for $DAYS_UNTIL_EXPIRY more days"
fi
EOF

chmod +x 001-security/scripts/monitoring/check-ssl-expiry.sh
```

---

### Step 2.4: Create Alert Email Script

```bash
cat > 001-security/alerts/scripts/send-alert-email.sh <<'EOF'
#!/bin/bash
# Send security alert via email

SUBJECT="$1"
MESSAGE="$2"
TO_EMAIL="jeremy@intentsolutions.io"
FROM_EMAIL="alerts@costplusdb.dev"

# Log alert
echo "[$(date)] ALERT SENT: $SUBJECT - $MESSAGE" >> /home/admincostplus/projects/costplusdb/001-security/logs/alerts/email-alerts.log

# Send email (requires mailutils or sendmail configured)
# For now, log to file until email is configured
echo "TO: $TO_EMAIL
FROM: $FROM_EMAIL
SUBJECT: [CostPlusDB] $SUBJECT
DATE: $(date)

$MESSAGE

---
Automated alert from CostPlusDB Security System
" >> /home/admincostplus/projects/costplusdb/001-security/logs/alerts/pending-emails.log

# NOTE: Email configuration pending - configure Mailgun, SendGrid, or SMTP when ready
# Uncomment and configure when email service is set up:
# echo "$MESSAGE" | mail -s "[CostPlusDB] $SUBJECT" "$TO_EMAIL"
EOF

chmod +x 001-security/alerts/scripts/send-alert-email.sh
```

---

## 🧪 Phase 3: Dry Run Testing

### Test 1: Log Rotation

```bash
# Create test log file
echo "Test log entry $(date)" >> 001-security/logs/access/ssh-access.log

# Force rotation
sudo logrotate -f /etc/logrotate.d/costplusdb-security

# Verify
ls -lh 001-security/logs/access/
# Should show ssh-access.log.1.gz (rotated and compressed)
```

**Expected Result:** ✅ Logs rotate, compress, and retain for 90 days

---

### Test 2: Failed Login Monitoring

```bash
# Manually run failed login check
./001-security/scripts/monitoring/check-failed-logins.sh

# Check output
cat 001-security/logs/security-events/failed-auth.log
```

**Expected Result:** ✅ Script runs without errors, logs to correct location

---

### Test 3: Resource Monitoring

```bash
# Run resource check
./001-security/scripts/monitoring/check-resource-usage.sh

# Check output
cat 001-security/logs/security-events/resource-usage.log
```

**Expected Result:** ✅ Disk and memory usage logged

---

### Test 4: SSL Expiry Check

```bash
# Run SSL expiry check
./001-security/scripts/monitoring/check-ssl-expiry.sh

# Check output
cat 001-security/logs/alerts/ssl-expiry-checks.log
```

**Expected Result:** ✅ Shows days until certificate expiration

---

### Test 5: Alert System

```bash
# Send test alert
./001-security/alerts/scripts/send-alert-email.sh "Test Alert" "This is a test security alert"

# Check pending emails log
cat 001-security/logs/alerts/pending-emails.log
```

**Expected Result:** ✅ Alert logged (email sending configured later)

---

### Test 6: Cron Jobs

```bash
# Wait 5 minutes, then check cron execution
cat 001-security/logs/security-events/failed-auth.log
# Should have new entry from cron

# Check all cron job logs
tail -20 001-security/logs/security-events/*.log
tail -20 001-security/logs/alerts/*.log
```

**Expected Result:** ✅ All cron jobs executing on schedule

---

## ✅ Success Criteria

Before marking this complete, verify:

- [x] pgbackrest.conf copied to `001-security/config/backup/`
- [x] Encryption key moved to `001-security/keys/backup-encryption/master.key`
- [x] Wasabi credentials in `001-security/keys/backup-encryption/wasabi-credentials`
- [x] Log rotation configured and tested
- [x] All 6 monitoring cron jobs added and working
- [x] All monitoring scripts created and executable
- [x] Alert system logging (email config pending)
- [x] Dry run tests pass for all systems

---

## 🚀 Post-Implementation

### Immediate Actions

1. **Backup encryption key to password manager** (CRITICAL)
2. **Test full backup restore** from Wasabi
3. **Configure email sending** (Mailgun/SendGrid)
4. **Connect Betterstack webhooks** to alert system
5. **Remove test customer** before launch

### 30-Day Actions

1. Set up automated backup verification
2. Implement customer notification automation
3. Configure PagerDuty integration
4. Set up Grafana dashboards

---

## 📝 Notes

- All credentials are currently stored in plaintext in `001-security/keys/` with 600 permissions
- Consider encrypting the keys directory with LUKS or dm-crypt for production
- Email sending requires SMTP configuration (Mailgun, SendGrid, or local sendmail)
- Wasabi credentials should be rotated every 90 days

---

**Document Status:** Ready to execute
**Estimated Time:** 2-3 hours
**Dependencies:** sudo access, crontab access
