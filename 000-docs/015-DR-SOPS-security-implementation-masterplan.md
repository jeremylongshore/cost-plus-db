# PostgreSQL Security Implementation Master Plan

**Document ID:** 015-DR-SOPS-security-implementation-masterplan
**Category:** Security Operations
**Owner:** Jeremy Longshore
**Last Updated:** 2025-10-19
**Status:** Implementation Guide

---

## Purpose

Comprehensive security implementation plan for CostPlusDB PostgreSQL infrastructure. Based on industry-standard security practices from PostgreSQL official docs, CIS Benchmarks, and security best practices.

**Implementation Status:** See checklist at bottom

---

## Quick Reference

| Security Area | Priority | Time Est | Doc Reference |
|---------------|----------|----------|---------------|
| 1. Server Hardening | CRITICAL | 2 hours | Section 1 |
| 2. SSL/TLS Enforcement | CRITICAL | 1 hour | Section 2 |
| 3. Firewall (UFW) | CRITICAL | 30 min | Section 3 |
| 4. fail2ban | CRITICAL | 30 min | Section 4 |
| 5. User & Role Management | HIGH | 1 hour | Section 5 |
| 6. Audit Logging | HIGH | 1 hour | Section 6 |
| 7. pgBouncer | HIGH | 30 min | 014-DR-GUID |
| 8. Backup Encryption | HIGH | Complete | ✅ Done |
| 9. Resource Limits | MEDIUM | 1 hour | Section 9 |
| 10. Intrusion Detection | MEDIUM | 1 hour | Section 10 |
| 11. Patch Management | MEDIUM | 1 hour | Section 11 |
| 12. Incident Response | LOW | 2 hours | Section 12 |

---

## Section 1: Server Hardening & Access Control

**Status:** ✅ Mostly Complete (verify)
**Priority:** CRITICAL
**Time:** 2 hours

### 1.1 Configure pg_hba.conf for Secure Authentication

**Location:** `/etc/postgresql/16/main/pg_hba.conf`

```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

**Required Configuration:**

```conf
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# "local" is for Unix domain socket connections only
local   all             postgres                                peer

# IPv4 local connections (change to scram-sha-256 if needed)
host    all             all             127.0.0.1/32            scram-sha-256

# REQUIRE SSL for ALL remote connections
hostssl all             all             0.0.0.0/0               scram-sha-256

# REJECT any non-SSL remote attempts
hostnossl all           all             0.0.0.0/0               reject

# IPv6 local connections
host    all             all             ::1/128                 scram-sha-256
```

**Apply changes:**
```bash
sudo -u postgres psql -p 5433 -c "SELECT pg_reload_conf();"
```

### 1.2 Optimize postgresql.conf Security Settings

**Location:** `/etc/postgresql/16/main/postgresql.conf`

```bash
sudo nano /etc/postgresql/16/main/postgresql.conf
```

**Critical Settings:**

```conf
#------------------------------------------------------------------------------
# CONNECTIONS AND AUTHENTICATION
#------------------------------------------------------------------------------

listen_addresses = '*'          # Listen on all interfaces
port = 5433                     # Non-default port for security
max_connections = 100           # Adjust based on needs

# SSL Settings
ssl = on                        # Enable SSL
ssl_cert_file = '/var/lib/postgresql/16/main/ssl/server.crt'
ssl_key_file = '/var/lib/postgresql/16/main/ssl/server.key'
ssl_min_protocol_version = 'TLSv1.2'  # Enforce modern TLS
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'  # Strong ciphers only

# Authentication
password_encryption = scram-sha-256  # Strongest auth method

#------------------------------------------------------------------------------
# RESOURCE USAGE (except WAL)
#------------------------------------------------------------------------------

shared_buffers = 256MB          # 25% of RAM for small VPS
work_mem = 4MB                  # Per-operation memory
maintenance_work_mem = 64MB     # For VACUUM, index creation

#------------------------------------------------------------------------------
# WRITE-AHEAD LOG
#------------------------------------------------------------------------------

wal_level = replica             # Required for backups
archive_mode = on               # Required for pgBackRest
archive_command = 'pgbackrest --stanza=main archive-push %p'

#------------------------------------------------------------------------------
# QUERY/INDEX STATISTICS COLLECTOR
#------------------------------------------------------------------------------

track_activities = on
track_counts = on
track_functions = all

#------------------------------------------------------------------------------
# ERROR REPORTING AND LOGGING
#------------------------------------------------------------------------------

logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB

# What to log
log_connections = on
log_disconnections = on
log_duration = off
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_statement = 'ddl'           # Log all DDL (CREATE, ALTER, DROP)
log_min_duration_statement = 1000  # Log queries > 1 second

#------------------------------------------------------------------------------
# CLIENT CONNECTION DEFAULTS
#------------------------------------------------------------------------------

statement_timeout = 0           # Disabled by default (set per-DB)
idle_in_transaction_session_timeout = 600000  # 10 minutes
```

**Apply changes:**
```bash
sudo systemctl restart postgresql@16-main
```

### 1.3 Verify SSL Certificate Setup

**Check current SSL status:**
```bash
sudo -u postgres psql -p 5433 -c "SHOW ssl; SHOW ssl_cert_file; SHOW ssl_min_protocol_version;"
```

**Expected output:**
```
 ssl
-----
 on

 ssl_cert_file
---------------------------------
 /var/lib/postgresql/16/main/ssl/server.crt

 ssl_min_protocol_version
--------------------------
 TLSv1.2
```

**If SSL certs don't exist, generate them:**
```bash
# See 001-security/keys/README.md for full SSL setup
sudo mkdir -p /var/lib/postgresql/16/main/ssl
cd /var/lib/postgresql/16/main/ssl

# Generate self-signed cert (valid 10 years)
sudo openssl req -new -x509 -days 3650 -nodes -text \
  -out server.crt \
  -keyout server.key \
  -subj "/CN=costplusdb"

sudo chmod 600 server.key
sudo chown postgres:postgres server.{key,crt}
```

### 1.4 Set Proper File Permissions

```bash
# PostgreSQL data directory
sudo chmod 700 /var/lib/postgresql/16/main

# Configuration files
sudo chmod 640 /etc/postgresql/16/main/postgresql.conf
sudo chmod 640 /etc/postgresql/16/main/pg_hba.conf
sudo chown postgres:postgres /etc/postgresql/16/main/*.conf

# SSL certificates
sudo chmod 600 /var/lib/postgresql/16/main/ssl/server.key
sudo chmod 644 /var/lib/postgresql/16/main/ssl/server.crt
sudo chown postgres:postgres /var/lib/postgresql/16/main/ssl/*
```

---

## Section 2: SSL/TLS Enforcement Verification

**Status:** ✅ Complete (verify)
**Priority:** CRITICAL
**Time:** 30 minutes

### 2.1 Test SSL Connection

**From remote client:**
```bash
# Should succeed
psql "postgresql://username:password@server_ip:5433/database?sslmode=require"

# Should fail (SSL required)
psql "postgresql://username:password@server_ip:5433/database?sslmode=disable"
```

### 2.2 Verify SSL is Enforced

**Check active connections:**
```bash
sudo -u postgres psql -p 5433 -c "SELECT pid, usename, client_addr, ssl, cipher FROM pg_stat_ssl JOIN pg_stat_activity ON pg_stat_ssl.pid = pg_stat_activity.pid;"
```

**Expected:** All remote connections show `ssl = t` (true)

---

## Section 3: Firewall Configuration (UFW)

**Status:** ⚠️ TODO
**Priority:** CRITICAL
**Time:** 30 minutes

### 3.1 Install and Enable UFW

```bash
# Install UFW
sudo apt update
sudo apt install ufw -y

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (IMPORTANT - do this first!)
sudo ufw allow 22/tcp comment 'SSH'

# Allow PostgreSQL (custom port)
sudo ufw allow 5433/tcp comment 'PostgreSQL direct'

# Allow pgBouncer (when implemented)
sudo ufw allow 6432/tcp comment 'pgBouncer connection pooling'

# Enable UFW
sudo ufw enable

# Verify
sudo ufw status numbered
```

### 3.2 Advanced UFW Rules (Optional)

**Rate limiting for SSH:**
```bash
sudo ufw limit 22/tcp comment 'SSH rate limit'
```

**Allow PostgreSQL from specific IPs only:**
```bash
# Delete the open rule
sudo ufw delete allow 5433/tcp

# Add IP-specific rules
sudo ufw allow from 1.2.3.4 to any port 5433 comment 'Customer XYZ'
sudo ufw allow from 5.6.7.8 to any port 5433 comment 'Customer ABC'
```

---

## Section 4: fail2ban for Intrusion Prevention

**Status:** ✅ Complete (verify)
**Priority:** CRITICAL
**Time:** 30 minutes

### 4.1 Install fail2ban

```bash
sudo apt update
sudo apt install fail2ban -y
```

### 4.2 Configure PostgreSQL Filter

**Create filter:** `/etc/fail2ban/filter.d/postgresql.conf`

```bash
sudo nano /etc/fail2ban/filter.d/postgresql.conf
```

```conf
[Definition]
failregex = FATAL:  password authentication failed for user ".*"$
            FATAL:  no pg_hba.conf entry for host ".*", user ".*", database ".*"
            FATAL:  role ".*" does not exist$
ignoreregex =
```

### 4.3 Configure PostgreSQL Jail

**Create jail:** `/etc/fail2ban/jail.d/postgresql.local`

```bash
sudo nano /etc/fail2ban/jail.d/postgresql.local
```

```conf
[postgresql]
enabled = true
port = 5433
filter = postgresql
logpath = /var/log/postgresql/postgresql-16-main.log
maxretry = 5
findtime = 600
bantime = 3600
action = ufw
```

### 4.4 Enable Connection Logging in PostgreSQL

Ensure `log_connections = on` in postgresql.conf (already set in Section 1.2)

### 4.5 Start and Verify fail2ban

```bash
# Restart fail2ban
sudo systemctl restart fail2ban

# Verify PostgreSQL jail is active
sudo fail2ban-client status postgresql

# Check banned IPs
sudo fail2ban-client status postgresql
```

---

## Section 5: User & Role Management

**Status:** ✅ Complete (via provisioning scripts)
**Priority:** HIGH
**Time:** 1 hour

### 5.1 Role Hierarchy Design

```sql
-- Admin role (for CostPlusDB operations)
CREATE ROLE costplusdb_admin WITH LOGIN SUPERUSER PASSWORD 'strong_password';

-- Monitoring role (read-only for metrics)
CREATE ROLE costplusdb_monitor WITH LOGIN PASSWORD 'monitor_password';
GRANT pg_monitor TO costplusdb_monitor;

-- Backup role (for pgBackRest)
CREATE ROLE costplusdb_backup WITH REPLICATION LOGIN PASSWORD 'backup_password';
```

### 5.2 Customer User Creation (Automated)

**Using provisioning script:**
```bash
SUDO_PASS='your_sudo_pass' ./provision-customer-database.sh customer_name
```

**Script automatically:**
- Creates isolated database
- Creates user with secure random password
- Sets connection limit (20 connections)
- Grants minimal privileges (NO SUPERUSER, NO CREATEDB, NO CREATEROLE)
- Configures SSL-only access in pg_hba.conf

### 5.3 Verify User Permissions

```sql
-- Check user privileges
\du

-- Verify customer user has NO superuser
SELECT usename, usesuper, usecreatedb, usecreaterole
FROM pg_user
WHERE usename = 'customer_user';

-- Should show: usesuper=f, usecreatedb=f, usecreaterole=f
```

---

## Section 6: Audit Logging & Monitoring

**Status:** ⚠️ Partial (connections logged, need DDL logging)
**Priority:** HIGH
**Time:** 1 hour

### 6.1 PostgreSQL Logging Configuration

Already configured in Section 1.2:
- ✅ `log_connections = on`
- ✅ `log_disconnections = on`
- ✅ `log_statement = 'ddl'` (logs CREATE, ALTER, DROP)
- ✅ `log_min_duration_statement = 1000` (queries > 1 second)

### 6.2 Install pgAudit Extension (Optional - Enhanced Auditing)

```bash
# Install pgAudit
sudo apt install postgresql-16-pgaudit -y
```

**Enable in postgresql.conf:**
```conf
shared_preload_libraries = 'pgaudit'
pgaudit.log = 'write, ddl'
pgaudit.log_catalog = off
```

**Restart PostgreSQL:**
```bash
sudo systemctl restart postgresql@16-main
```

**Enable in each database:**
```sql
CREATE EXTENSION pgaudit;
```

### 6.3 Log Rotation and Retention

PostgreSQL log rotation already configured in Section 1.2:
- Daily rotation
- 100MB size limit
- Logs in `/var/log/postgresql/`

**Set up log retention (90 days):**
```bash
# Create logrotate config
sudo nano /etc/logrotate.d/postgresql-custom
```

```conf
/var/log/postgresql/*.log {
    daily
    rotate 90
    compress
    delaycompress
    notifempty
    missingok
    create 640 postgres postgres
}
```

### 6.4 Automated Log Monitoring (Basic)

**Create script:** `/root/scripts/monitor-postgres-logs.sh`

```bash
#!/bin/bash
# Monitor PostgreSQL logs for security events

LOG_FILE="/var/log/postgresql/postgresql-16-main.log"
ALERT_EMAIL="jeremy@intentsolutions.io"

# Check for failed logins in last hour
FAILED_LOGINS=$(grep "password authentication failed" "$LOG_FILE" | grep "$(date +'%Y-%m-%d %H')" | wc -l)

if [ "$FAILED_LOGINS" -gt 10 ]; then
    echo "ALERT: $FAILED_LOGINS failed PostgreSQL logins in the last hour" | mail -s "PostgreSQL Security Alert" "$ALERT_EMAIL"
fi

# Check for unauthorized access attempts
UNAUTHORIZED=$(grep "no pg_hba.conf entry" "$LOG_FILE" | grep "$(date +'%Y-%m-%d %H')" | wc -l)

if [ "$UNAUTHORIZED" -gt 5 ]; then
    echo "ALERT: $UNAUTHORIZED unauthorized PostgreSQL access attempts" | mail -s "PostgreSQL Security Alert" "$ALERT_EMAIL"
fi
```

**Schedule with cron:**
```bash
# Run every hour
0 * * * * /root/scripts/monitor-postgres-logs.sh
```

---

## Section 7: Connection Pooling (pgBouncer)

**Status:** ⚠️ TODO
**Priority:** HIGH
**Time:** 30 minutes

**See:** `000-docs/014-DR-GUID-pgbouncer-setup.md` for complete implementation guide

**Quick checklist:**
- [ ] Install pgBouncer
- [ ] Configure `/etc/pgbouncer/pgbouncer.ini`
- [ ] Set up authentication file `/etc/pgbouncer/userlist.txt`
- [ ] Start and enable pgBouncer service
- [ ] Update UFW to allow port 6432
- [ ] Test connections through pgBouncer
- [ ] Update provisioning scripts (already done)
- [ ] Update customer welcome emails with port 6432

---

## Section 8: Backup Encryption

**Status:** ✅ Complete
**Priority:** HIGH
**Time:** N/A (already done)

**Verification:**
```bash
# Check pgBackRest encryption
sudo -u postgres pgbackrest --stanza=main info

# Should show "cipher: aes-256-cbc" in backup info
```

**Encryption passphrase location:**
- `/root/pgbackrest-keys/encryption-passphrase.txt`
- ⚠️ **CRITICAL:** Backup to password manager!

---

## Section 9: Resource Limits & DoS Prevention

**Status:** ⚠️ TODO
**Priority:** MEDIUM
**Time:** 1 hour

### 9.1 Global Resource Limits

**Edit postgresql.conf:**
```conf
# Statement timeout (0 = disabled, set per-database)
statement_timeout = 0

# Idle transaction timeout (10 minutes)
idle_in_transaction_session_timeout = 600000

# Max connections
max_connections = 100

# Per-query work memory
work_mem = 4MB

# Temp file size limit (10GB)
temp_file_limit = 10485760
```

### 9.2 Per-Database Resource Limits

**Example: Set statement timeout for customer database:**
```sql
ALTER DATABASE customer_db SET statement_timeout = '30s';
```

**Set connection limit (already done in provisioning script):**
```sql
ALTER USER customer_user CONNECTION LIMIT 20;
```

### 9.3 Connection Rate Limiting with fail2ban

Already configured in Section 4 - fail2ban will ban IPs with repeated failed auth attempts.

### 9.4 Monitoring for Resource Abuse

**Create monitoring script:** `/root/scripts/monitor-resource-usage.sh`

```bash
#!/bin/bash
# Monitor for resource abuse

# Check for long-running queries (>10 minutes)
sudo -u postgres psql -p 5433 -t -A -c "
SELECT pid, usename, datname, query_start, query
FROM pg_stat_activity
WHERE state = 'active'
  AND query_start < NOW() - INTERVAL '10 minutes'
  AND usename != 'postgres';
"

# Check for excessive connections per user
sudo -u postgres psql -p 5433 -t -A -c "
SELECT usename, count(*) as connection_count
FROM pg_stat_activity
GROUP BY usename
HAVING count(*) > 15;
"
```

---

## Section 10: Intrusion Detection & Response

**Status:** ✅ Partial (fail2ban configured)
**Priority:** MEDIUM
**Time:** 1 hour

### 10.1 fail2ban Configuration

Already configured in Section 4.

### 10.2 Log Analysis for Security Events

**Manual check:**
```bash
# Failed auth attempts today
sudo grep "authentication failed" /var/log/postgresql/postgresql-16-main.log | grep "$(date +'%Y-%m-%d')"

# Unauthorized access attempts
sudo grep "no pg_hba.conf entry" /var/log/postgresql/postgresql-16-main.log | grep "$(date +'%Y-%m-%d')"

# Unusual queries (potential injection attempts)
sudo grep "syntax error" /var/log/postgresql/postgresql-16-main.log | grep "$(date +'%Y-%m-%d')"
```

### 10.3 Automated Security Responses

fail2ban already provides:
- Auto-ban after 5 failed attempts in 10 minutes
- 1-hour ban duration
- Email alerts (configure in `/etc/fail2ban/jail.local`)

### 10.4 Incident Response Runbook

See Section 12 for complete incident response procedures.

---

## Section 11: Security Patch Management

**Status:** ✅ Partial (unattended-upgrades enabled)
**Priority:** MEDIUM
**Time:** 1 hour

### 11.1 Verify unattended-upgrades

```bash
# Check if enabled
sudo systemctl status unattended-upgrades

# Check configuration
cat /etc/apt/apt.conf.d/50unattended-upgrades
```

### 11.2 PostgreSQL Update Procedure

**Minor version updates (safe, automatic):**
```bash
# PostgreSQL minor updates included in unattended-upgrades
# Example: 16.0 → 16.1

# Check current version
sudo -u postgres psql -p 5433 -c "SELECT version();"
```

**Major version updates (manual, scheduled):**
```bash
# Example: PostgreSQL 16 → 17 (when available)
# ALWAYS test in staging first

# 1. Announce maintenance window (email customers)
# 2. Take full backup
# 3. Install new version
# 4. Run pg_upgrade
# 5. Verify all databases work
# 6. Update documentation
```

### 11.3 Vulnerability Monitoring

**Subscribe to security mailing lists:**
- PostgreSQL Security List: pgsql-announce@postgresql.org
- Ubuntu Security Notices: ubuntu-security-announce

**Check for CVEs:**
```bash
# Check for security updates
sudo apt update
sudo apt list --upgradable | grep postgresql
```

### 11.4 Patch Management Schedule

| Frequency | Action | Notification |
|-----------|--------|--------------|
| Daily | Automatic security updates | None (unless reboot required) |
| Weekly | Check for PostgreSQL minor updates | Email if manual action needed |
| Monthly | Review security audit logs | Internal review |
| Quarterly | Major version planning | Customer notice 30 days ahead |

---

## Section 12: Incident Response Runbook

**Status:** ⚠️ TODO (needs documentation)
**Priority:** MEDIUM (but critical to have)
**Time:** 2 hours to document

### 12.1 Incident Classification

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| P0 - Critical | Database down, data breach | Immediate | Server offline, unauthorized data access |
| P1 - High | Performance degraded, security concern | 15 minutes | Slow queries, suspected intrusion |
| P2 - Medium | Non-critical issue | 1 hour | Failed backup, minor security alert |
| P3 - Low | Informational | 4 hours | Disk space warning, log rotation |

### 12.2 P0 Critical Incident Response

**Database Down:**
1. **Detect:** Betterstack alert → SMS to Jeremy
2. **Immediate:** SSH into server, check status
   ```bash
   sudo systemctl status postgresql@16-main
   sudo tail -100 /var/log/postgresql/postgresql-16-main.log
   ```
3. **Notify:** Email customer within 5 minutes
4. **Fix:** Restart service, check logs, restore from backup if needed
5. **Update:** Email customer every 15 minutes until resolved
6. **Post-mortem:** Document incident within 24 hours

**Data Breach:**
1. **Detect:** Unauthorized access in logs or customer report
2. **Immediate:** Isolate affected database
   ```bash
   # Revoke all connections
   sudo -u postgres psql -p 5433 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'customer_db';"

   # Change passwords
   sudo -u postgres psql -p 5433 -c "ALTER USER customer_user WITH PASSWORD 'new_random_password';"
   ```
3. **Notify:** Email customer within 1 hour
4. **Forensic:** Export logs, analyze access patterns
5. **Remediate:** Fix vulnerability, restore from pre-breach backup if needed
6. **Report:** Provide detailed incident report to customer
7. **Public:** If data was exposed, public disclosure required (legal requirement)

### 12.3 Security Incident Checklist

```
[ ] Incident detected - timestamp: _______
[ ] Severity assessed: P0 / P1 / P2 / P3
[ ] Customer notified (within SLA)
[ ] Systems isolated (if needed)
[ ] Logs exported for analysis
[ ] Root cause identified
[ ] Vulnerability patched
[ ] Customer updated with resolution
[ ] Post-mortem documented
[ ] Preventive measures implemented
```

### 12.4 Communication Templates

**Incident Notification Email:**
```
Subject: INCIDENT: [Database Name] - [Brief Description]

Hi [Customer Name],

We've detected an incident affecting your database:

Incident ID: INC-2025-001
Severity: P0 (Critical)
Impact: [Database offline / Slow performance / Security concern]
Detected: [Timestamp]
Current Status: [Investigating / Fixing / Resolved]

What happened:
[Brief explanation]

What we're doing:
[Action being taken]

Next update: 15 minutes

Jeremy Longshore
CostPlusDB
jeremy@intentsolutions.io
```

**Resolution Email:**
```
Subject: RESOLVED: [Database Name] - [Brief Description]

Hi [Customer Name],

The incident has been resolved.

Incident ID: INC-2025-001
Resolved: [Timestamp]
Total downtime: [Duration]

Root cause:
[Explanation]

Actions taken:
1. [Action 1]
2. [Action 2]

Preventive measures:
- [Measure 1]
- [Measure 2]

SLA credit: [If applicable, pro-rated refund amount]

Detailed post-mortem report will follow within 24 hours.

Jeremy Longshore
CostPlusDB
jeremy@intentsolutions.io
```

---

## Implementation Checklist

### Week 1: Critical Security (Launch Blockers)

- [ ] **Section 1.1:** Configure pg_hba.conf for SSL-only connections
- [ ] **Section 1.2:** Optimize postgresql.conf security settings
- [ ] **Section 1.3:** Verify SSL certificates working
- [ ] **Section 1.4:** Set proper file permissions
- [ ] **Section 2:** Test SSL enforcement
- [ ] **Section 3:** Install and configure UFW firewall
- [ ] **Section 4:** Install and configure fail2ban
- [ ] **Section 5:** Verify user provisioning scripts work
- [ ] **Section 7:** Implement pgBouncer (see 014-DR-GUID)

### Week 2: Enhanced Security

- [ ] **Section 6.1:** Verify audit logging configuration
- [ ] **Section 6.2:** Install pgAudit extension (optional)
- [ ] **Section 6.3:** Configure log rotation (90 days)
- [ ] **Section 6.4:** Set up log monitoring scripts
- [ ] **Section 9:** Configure resource limits
- [ ] **Section 11:** Verify patch management working

### Week 3: Documentation & Response

- [ ] **Section 12:** Document complete incident response runbook
- [ ] Create customer security FAQ
- [ ] Update website security page
- [ ] Create internal security checklist
- [ ] Schedule monthly security review

---

## Verification Tests

**Before accepting first customer:**

```bash
# 1. SSL enforcement test
psql "postgresql://testuser:testpass@server_ip:5433/testdb?sslmode=disable"
# Expected: Connection should FAIL

# 2. Firewall test
nmap -p 5433 server_ip
# Expected: Port 5433 open

# 3. fail2ban test
# Attempt 6 failed logins
for i in {1..6}; do psql "postgresql://baduser:badpass@server_ip:5433/postgres?sslmode=require" 2>&1; done
# Check ban:
sudo fail2ban-client status postgresql
# Expected: IP should be banned

# 4. Backup encryption test
sudo -u postgres pgbackrest --stanza=main info | grep cipher
# Expected: cipher: aes-256-cbc

# 5. User isolation test
psql "postgresql://customer1_user:pass@server_ip:5433/customer2_db?sslmode=require"
# Expected: Access denied

# 6. pgBouncer test (when implemented)
psql "postgresql://testuser:testpass@server_ip:6432/testdb?sslmode=require"
# Expected: Connection successful via pgBouncer
```

---

## Security Audit Schedule

| Frequency | Audit Type | Responsibility |
|-----------|------------|----------------|
| Daily | Failed login review | Automated (fail2ban) |
| Weekly | Log analysis | Jeremy |
| Monthly | Security checklist review | Jeremy |
| Quarterly | Full security audit | Jeremy + External (when possible) |
| Annually | Penetration test | External vendor (when revenue supports) |

---

## References

- PostgreSQL Security: https://www.postgresql.org/docs/current/security.html
- CIS PostgreSQL Benchmark: https://www.cisecurity.org/benchmark/postgresql
- Ubuntu UFW: https://help.ubuntu.com/community/UFW
- fail2ban PostgreSQL: https://www.fail2ban.org/
- pgBackRest Encryption: https://pgbackrest.org/user-guide.html#encryption

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-10-19 | 1.0 | Initial security implementation master plan |

---

**Next Step:** Begin Week 1 critical security implementation
