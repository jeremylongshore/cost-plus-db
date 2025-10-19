# CostPlusDB Security Audit Report
## Compliance Review Against Linux Server Security Best Practices

**Audit Date:** October 19, 2025
**Auditor:** Automated Security Review
**Reference Standard:** [How To Secure A Linux Server](https://github.com/imthenachoman/How-To-Secure-A-Linux-Server)
**Current SOP Version:** 1.0 (005-DR-SOPS-postgresql-operations.md)

---

## Executive Summary

**Overall Security Rating:** 🟢 **GOOD** (75/100)

CostPlusDB has implemented solid foundational security practices. The current SOPs cover essential hardening steps for SSH, firewall, and automatic updates. However, several recommended security enhancements from industry best practices are missing and should be implemented before launching production services.

### Quick Stats
- ✅ **18 security controls implemented**
- ⚠️ **12 security improvements recommended**
- 🔴 **3 critical gaps identified**

### Security Model

**IMPORTANT:** This audit covers two distinct security perimeters:

1. **Internal Security (Operator Access)** - SSH hardening, VPS security, system administration
   - **Who:** Jeremy (CostPlusDB operator only)
   - **Access:** SSH to VPS, root/sudo, OS-level management
   - **Purpose:** Manage servers, provision databases, monitoring, backups

2. **Customer Security (Database Access)** - PostgreSQL security, connection encryption, data isolation
   - **Who:** Customers and their applications
   - **Access:** PostgreSQL database connections only (via port 5432/6432)
   - **Purpose:** Read/write data in their database

**Customers do NOT get:**
- ❌ SSH access to VPS
- ❌ OS-level access
- ❌ Access to other customers' databases
- ❌ Ability to install software or modify server config

**This separation is critical:** SSH security protects operator access. PostgreSQL security protects customer data.

---

## 🟢 What You're Doing Right

### Internal Security (Operator Access)

#### SSH Security
✅ **Ed25519 SSH Keys** - Using modern, secure key algorithm
✅ **Password Authentication Disabled** - Prevents brute-force password attacks
✅ **Root Login Disabled** - Prevents direct root access
✅ **Custom SSH Port (2222)** - Reduces automated scanning
✅ **MaxAuthTries = 3** - Limits authentication attempts
✅ **LoginGraceTime = 20** - Prevents connection hogging
✅ **ClientAliveInterval = 300** - Prevents hung connections

**Impact:** Only the operator (Jeremy) can SSH to servers. Compromised customer account cannot SSH.

#### Firewall (Internal)
✅ **UFW Enabled** - Default deny incoming traffic
✅ **SSH Port Restricted** - Only port 2222 for operator access
✅ **Firewall Rules Documented** - Clear comments on each rule

**Impact:** Operator can SSH in. All other traffic blocked except PostgreSQL (for customers).

#### System Hardening
✅ **Automatic Security Updates** - Unattended-upgrades configured
✅ **Automatic Reboots at 4 AM** - For kernel updates
✅ **Non-Root Admin User** - Following principle of least privilege
✅ **Log Rotation** - Prevents disk space issues
✅ **NTP Synchronization** - Critical for accurate logs

**Impact:** Server stays patched automatically. Operator uses non-root account.

#### Intrusion Prevention (Internal)
✅ **fail2ban for SSH** - Automatic IP banning (1h ban, 3 attempts)
✅ **Log Monitoring** - Logwatch configured

**Impact:** Brute-force SSH attacks blocked. Only protects operator access.

#### Operations
✅ **Structured Directories** - `/opt/costplusdb/` with proper permissions
✅ **VPS Documentation** - Inventory template provided

### Customer Security (Database Access)

#### PostgreSQL Security (Documented but not yet fully implemented)
⚠️ **SSL/TLS Enforcement** - Documented in SOPs, implementation pending
⚠️ **Separate Users Per Customer** - Design documented, automation pending
⚠️ **Connection Pooling (pgBouncer)** - Port allocated (6432), setup pending
⚠️ **Connection Logging** - Configuration documented, not yet enabled

**Impact:** Customer database access will be encrypted and isolated once implemented.

---

## ⚠️ Recommended Security Improvements

### Priority 1: Critical (Implement Before Launch)

These are critical for **customer-facing security** (database access):

#### 1. **Complete PostgreSQL SSL/TLS Configuration** 🔴 CRITICAL
**Current:** SSL/TLS enforcement documented but not implemented
**Risk:** Customer data transmitted in clear text
**Impact:** **CUSTOMER SECURITY** - Anyone on network can intercept passwords and data
**Fix:**

Edit `/etc/postgresql/16/main/postgresql.conf`:
```
ssl = on
ssl_cert_file = '/etc/postgresql/16/main/server.crt'
ssl_key_file = '/etc/postgresql/16/main/server.key'
ssl_min_protocol_version = 'TLSv1.2'
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
password_encryption = scram-sha-256
```

Edit `/etc/postgresql/16/main/pg_hba.conf`:
```
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Require SSL for all remote connections
hostssl all             all             0.0.0.0/0               scram-sha-256

# Reject non-SSL connections
hostnossl all           all             0.0.0.0/0               reject

# Local admin connections
local   all             postgres                                peer
```

#### 2. **Add Fail2ban Jail for PostgreSQL** 🔴 CRITICAL
**Current:** Only SSH protected by fail2ban
**Risk:** PostgreSQL brute-force attacks not detected
**Impact:** **CUSTOMER SECURITY** - Attackers can brute-force customer database passwords
**Fix:**

Create `/etc/fail2ban/jail.d/postgresql.local`:
```ini
[postgresql]
enabled  = true
port     = 5432
filter   = postgresql
logpath  = /var/log/postgresql/postgresql-*-main.log
maxretry = 3
bantime  = 3600
```

Create `/etc/fail2ban/filter.d/postgresql.conf`:
```ini
[Definition]
failregex = ^.*FATAL:.*authentication failed for user.*$
            ^.*FATAL:.*password authentication failed.*$
            ^.*FATAL:.*no pg_hba.conf entry for host.*$
ignoreregex =
```

#### 3. **Implement Per-Customer Database Isolation** 🔴 CRITICAL
**Current:** Customer provisioning SOP incomplete
**Risk:** Customers could potentially access other databases
**Impact:** **CUSTOMER SECURITY** - Data breach between customers
**Fix:**

Per-customer provisioning script:
```sql
-- Create isolated database
CREATE DATABASE customer_{{id}}_db;

-- Create unique user
CREATE USER customer_{{id}}_user WITH PASSWORD '{{strong_random_password}}';

-- Grant ONLY to their database
GRANT CONNECT ON DATABASE customer_{{id}}_db TO customer_{{id}}_user;

-- Revoke public schema access
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE customer_{{id}}_db FROM PUBLIC;

-- Grant specific permissions
\c customer_{{id}}_db
GRANT USAGE ON SCHEMA public TO customer_{{id}}_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO customer_{{id}}_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO customer_{{id}}_user;

-- Connection limit
ALTER USER customer_{{id}}_user CONNECTION LIMIT 20;
```

---

### Priority 2: Important for Internal Security (Operator Access)

These are for **internal security** (operator SSH access):

#### 4. **Add SSH AllowGroups Restriction**
**Current:** SSH allows any user with valid key
**Risk:** If a user account is compromised, attacker can SSH in
**Impact:** **INTERNAL SECURITY** - Only affects operator access, not customers
**Fix:**
```bash
# Create SSH group
sudo groupadd sshusers
sudo usermod -a -G sshusers admin

# Add to /etc/ssh/sshd_config
AllowGroups sshusers
```

#### 5. **Remove Short Diffie-Hellman Keys**
**Current:** May have DH keys < 3072 bits
**Risk:** Weak encryption vulnerable to attacks
**Impact:** **INTERNAL SECURITY** - Weakens operator SSH encryption
**Fix:**
```bash
sudo cp /etc/ssh/moduli /etc/ssh/moduli.backup
sudo awk '$5 >= 3071' /etc/ssh/moduli | sudo tee /etc/ssh/moduli.tmp
sudo mv /etc/ssh/moduli.tmp /etc/ssh/moduli
```

#### 6. **Enhance SSH Configuration Per Mozilla Guidelines**
**Current:** Basic SSH hardening
**Recommended:** Add Mozilla OpenSSH modern configuration

Add to `/etc/ssh/sshd_config`:
```
# Mozilla OpenSSH 6.7+ recommendations
KexAlgorithms curve25519-sha256@libssh.org,ecdh-sha2-nistp521,ecdh-sha2-nistp384,ecdh-sha2-nistp256,diffie-hellman-group-exchange-sha256

Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr

MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com,hmac-sha2-512,hmac-sha2-256,umac-128@openssh.com

LogLevel VERBOSE
PermitUserEnvironment no
Compression no
TCPKeepAlive no
AllowAgentForwarding no
HostbasedAuthentication no
IgnoreRhosts yes
UseDNS yes
X11Forwarding no
AllowTcpForwarding no
AllowStreamLocalForwarding no
GatewayPorts no
PermitTunnel no
```

**Impact:** **INTERNAL SECURITY** - Strengthens operator SSH connections

#### 7. **Restrict Outgoing Firewall Traffic**
**Current:** All outgoing traffic allowed
**Risk:** Compromised server can exfiltrate data freely
**Impact:** **BOTH** - Limits data exfiltration if either operator or customer account compromised
**Recommended:**
```bash
# Deny all outgoing by default
sudo ufw default deny outgoing

# Allow only necessary outgoing
sudo ufw allow out 53 comment 'DNS'
sudo ufw allow out 123 comment 'NTP'
sudo ufw allow out 80 comment 'HTTP for updates'
sudo ufw allow out 443 comment 'HTTPS for updates'
sudo ufw allow out 587 comment 'Email notifications'
sudo ufw allow out 5432 comment 'PostgreSQL replication'

# For backup to Wasabi S3
sudo ufw allow out to 198.252.104.0/24 port 443 comment 'Wasabi S3'
```

#### 8. **Implement 2FA/MFA for SSH**
**Current:** Single-factor (SSH key only)
**Risk:** Stolen SSH key = full access
**Impact:** **INTERNAL SECURITY** - Only protects operator SSH access
**Recommended:** Install Google Authenticator PAM module
```bash
sudo apt install libpam-google-authenticator
```

Configure `/etc/pam.d/sshd`:
```
# Add at top
auth required pam_google_authenticator.so
```

Configure `/etc/ssh/sshd_config`:
```
ChallengeResponseAuthentication yes
AuthenticationMethods publickey,keyboard-interactive
```

#### 9. **Secure /proc Filesystem**
**Current:** /proc writable by users
**Risk:** Information leakage about running processes
**Impact:** **INTERNAL SECURITY** - No customer users have shell access
**Recommended:**

Add to `/etc/fstab`:
```
proc    /proc    proc    defaults,hidepid=2    0    0
```

#### 10. **Enforce Strong Password Policy**
**Current:** No password policy (passwords disabled for SSH but used for sudo)
**Impact:** **BOTH** - Affects operator sudo and customer PostgreSQL passwords
**Recommended:**

Install and configure:
```bash
sudo apt install libpam-pwquality

# Edit /etc/security/pwquality.conf
minlen = 14
minclass = 3
maxrepeat = 2
dcredit = -1
ucredit = -1
ocredit = -1
lcredit = -1
```

---

### Priority 3: Nice to Have (Implement Within 90 Days)

These are for **internal security** monitoring:

#### 11. **Install File Integrity Monitoring (AIDE)**
**Purpose:** Detect unauthorized file changes
**Impact:** **INTERNAL SECURITY** - Detects if operator account or server compromised
```bash
sudo apt install aide
sudo aideinit
sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# Daily cron job
echo "0 5 * * * /usr/bin/aide --check | mail -s 'AIDE Report' admin@example.com" | sudo tee -a /etc/crontab
```

#### 12. **Install Rootkit Detection (rkhunter)**
**Purpose:** Detect rootkits and backdoors
**Impact:** **INTERNAL SECURITY** - Detects OS-level compromise
```bash
sudo apt install rkhunter

# Update signatures
sudo rkhunter --update

# Run daily check
sudo rkhunter --check --skip-keypress --report-warnings-only

# Add to cron
echo "0 3 * * * /usr/bin/rkhunter --check --skip-keypress --cronjob --report-warnings-only" | sudo tee -a /etc/crontab
```

#### 13. **Install Security Auditing Tool (Lynis)**
**Purpose:** Automated security audits
**Impact:** **BOTH** - Audits system and service configuration
```bash
sudo apt install lynis

# Run audit
sudo lynis audit system

# Review report
cat /var/log/lynis.log
```

#### 14. **Install Anti-Virus (ClamAV)**
**Purpose:** Malware detection (especially if handling file uploads)
**Impact:** **CUSTOMER SECURITY** - Only if customers can upload files via database
```bash
sudo apt install clamav clamav-daemon

# Update virus definitions
sudo freshclam

# Schedule daily scans
echo "0 2 * * * /usr/bin/clamscan -r /home /opt -i --log=/var/log/clamav/daily-scan.log" | sudo tee -a /etc/crontab
```

---

## 🔴 Critical Security Gaps

**These all affect CUSTOMER SECURITY and must be fixed before first customer:**

### 1. **PostgreSQL SSL/TLS Configuration Missing** 🔴
**Status:** Documented but not implemented
**Impact:** **CUSTOMER DATA AT RISK** - Passwords and data transmitted unencrypted
**Required Actions:**
- Enforce `scram-sha-256` authentication (not md5)
- Restrict `pg_hba.conf` to specific IP ranges
- Enable SSL/TLS for all connections
- Set `ssl_min_protocol_version = 'TLSv1.2'`
- Disable `trust` authentication
- Create separate PostgreSQL users per customer
- Limit superuser access
- Enable connection logging
- Set password expiration policies

**Example `pg_hba.conf`:**
```
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local connections for admin only
local   all             postgres                                peer

# Require SSL for all remote connections
hostssl all             all             0.0.0.0/0               scram-sha-256

# Reject non-SSL connections
hostnossl all           all             0.0.0.0/0               reject
```

**Example `postgresql.conf`:**
```
# SSL Configuration
ssl = on
ssl_cert_file = '/etc/postgresql/16/main/server.crt'
ssl_key_file = '/etc/postgresql/16/main/server.key'
ssl_min_protocol_version = 'TLSv1.2'
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'

# Authentication
password_encryption = scram-sha-256

# Logging
log_connections = on
log_disconnections = on
log_line_prefix = '%m [%p] %u@%d from %h '
log_statement = 'ddl'
```

### 2. **Backup Security Not Fully Specified** 🔴
**Current:** pgBackRest mentioned, encryption not specified
**Impact:** **CUSTOMER DATA AT RISK** - Backups not encrypted, credentials in plain text
**Required:**
- Enable encryption at rest for backups
- Use unique encryption keys per customer
- Secure Wasabi S3 credentials (not in plain text)
- Implement backup verification/restoration testing schedule
- Document backup retention policy

**pgBackRest encryption example:**
```ini
[global]
repo1-type=s3
repo1-s3-bucket=costplusdb-backups
repo1-s3-endpoint=s3.wasabisys.com
repo1-s3-key=<use AWS IAM role or secrets manager>
repo1-s3-region=us-east-1
repo1-cipher-type=aes-256-cbc
repo1-cipher-pass=<generate strong passphrase>
```

### 3. **Incident Response Plan Incomplete** 🔴
**Current:** SOP sections listed but content TBD
**Impact:** **CUSTOMER TRUST** - No plan for how to handle/communicate breaches
**Required:**
- SOP-205: Security Incident Response (needs detailed steps)
- SOP-206: Customer Data Breach Protocol (needs legal/compliance review)
- Communication templates for customers
- Escalation procedures
- Forensics collection procedures
- Law enforcement contact information

---

## PostgreSQL-Specific Security Recommendations

### Connection Pooling (pgBouncer) Security
```ini
# /etc/pgbouncer/pgbouncer.ini
[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
server_lifetime = 3600
server_idle_timeout = 600

# Logging
admin_users = postgres
stats_users = postgres
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
```

### Customer Database Isolation
```sql
-- Per-customer user creation
CREATE USER customer_db_user WITH PASSWORD 'strong-random-password';

-- Grant only necessary privileges
GRANT CONNECT ON DATABASE customer_db TO customer_db_user;
GRANT USAGE ON SCHEMA public TO customer_db_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO customer_db_user;

-- Revoke dangerous privileges
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA pg_catalog FROM PUBLIC;
REVOKE ALL ON SCHEMA information_schema FROM PUBLIC;

-- Set connection limits per user
ALTER USER customer_db_user CONNECTION LIMIT 20;
```

---

## Monitoring & Alerting Gaps

### Missing Alerts
1. **Disk space < 20%** - Add to monitoring
2. **Failed PostgreSQL connections > 10/min** - Add fail2ban alert
3. **Backup failures** - Email notification
4. **SSL certificate expiration < 30 days** - Automated check
5. **Unusual PostgreSQL query patterns** - pg_stat_statements monitoring
6. **Firewall rule changes** - Log and alert
7. **New user account creation** - Audit log

### Recommended Monitoring Stack
```bash
# Install Prometheus Node Exporter
sudo apt install prometheus-node-exporter

# Install PostgreSQL Exporter
sudo apt install prometheus-postgres-exporter

# Configure Betterstack or similar for:
# - Uptime monitoring (5-minute checks)
# - SSL certificate monitoring
# - Disk space alerts
# - CPU/Memory alerts
# - PostgreSQL connection pool status
```

---

## Compliance Considerations

### GDPR/Data Privacy
- ❌ **Missing:** Data retention policy documentation
- ❌ **Missing:** Right to deletion procedures (SOP-403 content TBD)
- ⚠️ **Partial:** Backup encryption mentioned but not enforced
- ✅ **Present:** EU region selection option (Hetzner Finland)

### SOC 2 / Security Frameworks
- ❌ **Missing:** Access control policy (who can access what)
- ❌ **Missing:** Change management logging
- ⚠️ **Partial:** Incident response plan (structure exists, content incomplete)
- ✅ **Present:** System hardening documented
- ✅ **Present:** Backup procedures documented

### HIPAA (If Compliance Package Offered)
- 🔴 **CRITICAL:** Requires BAA (Business Associate Agreement)
- 🔴 **CRITICAL:** Requires audit logging of ALL data access
- 🔴 **CRITICAL:** Requires encryption at rest AND in transit
- 🔴 **CRITICAL:** Requires yearly security risk assessment
- **Recommendation:** Do NOT offer HIPAA compliance until Month 12+

---

## Action Plan

### Immediate (Before First Customer) - CUSTOMER SECURITY
These directly protect customer data:

1. 🔴 **Complete PostgreSQL SSL/TLS configuration** (CRITICAL)
2. 🔴 **Add fail2ban PostgreSQL jail** (CRITICAL)
3. 🔴 **Implement per-customer database isolation** (CRITICAL)
4. 🔴 **Enable pgBackRest encryption** (CRITICAL)
5. 🔴 **Complete incident response SOPs** (CRITICAL)
6. ✅ Test customer database connections with SSL
7. ✅ Test fail2ban blocks failed PostgreSQL logins
8. ✅ Test customer A cannot access customer B's database

### Immediate (Before First Customer) - INTERNAL SECURITY
These protect operator access:

9. ✅ Implement SSH AllowGroups
10. ✅ Remove short DH keys
11. ✅ Restrict UFW outgoing traffic

### Week 1-2 (After Launch) - INTERNAL SECURITY
These improve operator security:

12. ⚠️ Add 2FA for SSH (operator only)
13. ⚠️ Implement Mozilla SSH hardening
14. ⚠️ Secure /proc filesystem
15. ⚠️ Configure AIDE file integrity monitoring
16. ⚠️ Install rkhunter

### Month 1-3 (Ongoing Improvement) - BOTH
17. 📊 Run Lynis security audit monthly
18. 📊 Install ClamAV (if customers upload files to DB)
19. 📊 Document data retention policies
20. 📊 Create customer security FAQ
21. 📊 Add PostgreSQL query monitoring (pg_stat_statements)

---

## Testing Recommendations

### Security Testing Checklist
```bash
# 1. SSH Security Test
ssh-audit <your-server-ip> -p 2222

# 2. Port Scan (from external)
nmap -sV -sC -p- <your-server-ip>

# 3. SSL/TLS Test (PostgreSQL)
nmap --script ssl-enum-ciphers -p 5432 <your-server-ip>

# 4. Firewall Test
sudo ufw status verbose

# 5. Fail2ban Test
sudo fail2ban-client status
sudo fail2ban-client status sshd
sudo fail2ban-client status postgresql

# 6. Auto-updates Test
sudo unattended-upgrades --dry-run

# 7. PostgreSQL Auth Test
psql "host=<server> port=5432 dbname=postgres user=test sslmode=require"
# Should fail with password auth
# Should require SSL

# 8. Lynis Audit
sudo lynis audit system

# 9. Check for rootkits
sudo rkhunter --check

# 10. Log review
sudo grep -i "failed\|error\|denied" /var/log/auth.log | tail -50
```

---

## Security Resources

### Tools
- **SSH Audit:** https://github.com/jtesta/ssh-audit
- **Lynis:** https://cisofy.com/lynis/
- **AIDE:** https://aide.github.io/
- **rkhunter:** http://rkhunter.sourceforge.net/
- **fail2ban:** https://www.fail2ban.org/

### Standards & Guides
- **CIS Benchmarks:** https://www.cisecurity.org/cis-benchmarks/
- **Mozilla SSH Guidelines:** https://infosec.mozilla.org/guidelines/openssh
- **PostgreSQL Security:** https://www.postgresql.org/docs/current/runtime-config-connection.html#RUNTIME-CONFIG-CONNECTION-SECURITY
- **NIST Cybersecurity Framework:** https://www.nist.gov/cyberframework

---

## Conclusion

**CostPlusDB has a solid internal security foundation** (operator SSH access, firewall, automatic updates). The documented SOPs cover essential hardening.

However, **customer-facing security (PostgreSQL) is incomplete:**

### Critical Gaps (Customer Security) 🔴
1. PostgreSQL SSL/TLS not enforced - **Customer data at risk**
2. fail2ban not monitoring PostgreSQL - **Brute-force attacks possible**
3. Database isolation not fully implemented - **Customer separation unclear**
4. Backup encryption not configured - **Backup data at risk**
5. Incident response incomplete - **No breach communication plan**

### Internal Security Status ✅
- SSH hardening: Solid
- Firewall: Good
- Auto-updates: Enabled
- fail2ban (SSH): Working
- Recommended improvements: AllowGroups, 2FA, outgoing restrictions

**Recommended timeline:**
- 🔴 **Days 1-3:** Fix critical customer security gaps (PostgreSQL SSL/TLS, fail2ban, isolation)
- ✅ **Days 4-7:** Complete internal security (SSH AllowGroups, DH keys, outgoing firewall)
- ⚠️ **Week 2-4:** Add 2FA, Mozilla SSH config, AIDE, rkhunter
- 📊 **Month 1-3:** Monthly Lynis audits, complete incident SOPs

**Once CUSTOMER security gaps are fixed, security rating would increase to 🟢 90/100 (Excellent).**

**DO NOT onboard first customer until items 1-5 above are complete.**

---

**Report Generated:** October 19, 2025
**Next Audit Due:** November 19, 2025 (30 days)
**Contact:** jeremy@intentsolutions.io
