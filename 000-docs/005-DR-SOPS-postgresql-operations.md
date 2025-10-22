# CostPlusDB Standard Operating Procedures (SOPs)
## The "Don't Mess Up" Operations Manual

**Version:** 1.0
**Last Updated:** October 19, 2025
**Owner:** Intent Solutions (CostPlusDB)

---

## SOP Index

### Pre-Launch (Setup Phase)
- SOP-001: VPS Initial Setup & Hardening
- SOP-002: PostgreSQL Installation & Configuration
- SOP-003: Backup System Setup & Verification
- SOP-004: Monitoring Stack Deployment
- SOP-005: SSL/TLS Certificate Setup

### Daily Operations
- SOP-101: Morning Health Check Routine
- SOP-102: New Customer Onboarding (Manual Process)
- SOP-103: Customer Database Provisioning
- SOP-104: Support Ticket Response Workflow
- SOP-105: Daily Backup Verification

### Incident Response
- SOP-201: P0 - Database Down (Critical)
- SOP-202: P1 - Degraded Performance
- SOP-203: P0 - Disk Space Emergency
- SOP-204: Backup Restoration Procedure
- SOP-205: Security Incident Response
- SOP-206: Customer Data Breach Protocol

### Weekly/Monthly Maintenance
- SOP-301: Weekly Security Patches
- SOP-302: Monthly Backup Restoration Test
- SOP-303: Monthly Financial Reconciliation
- SOP-304: Monthly Customer Health Review

### Emergency Procedures
- SOP-401: Total VPS Failure - Customer Migration
- SOP-402: Mass Security Incident Response
- SOP-403: Customer Cancellation & Data Deletion
- SOP-404: Emergency Shutdown Procedure

### Change Management
- SOP-501: PostgreSQL Version Upgrade
- SOP-502: Configuration Change Protocol
- SOP-503: Adding New VPS to Fleet

---

## Pre-Launch SOPs

<a name="sop-001"></a>

## SOP-001: VPS Initial Setup & Hardening

**Purpose:** Secure a newly provisioned VPS before putting into production
**When to use:** Every time you provision a new VPS from Contabo or any provider
**Time required:** 45-60 minutes
**Frequency:** One-time per VPS
**Risk Level:** HIGH - Mistakes here compromise all customer data on this VPS

### Prerequisites
- [ ] New VPS provisioned from Contabo
- [ ] Root password received via email
- [ ] SSH client installed on your laptop
- [ ] Password manager accessible (1Password/Bitwarden)
- [ ] Notepad/document ready to record VPS details

### Safety Checklist Before Starting
- [ ] You have the root password
- [ ] You're on a stable internet connection (not coffee shop WiFi)
- [ ] You have 1 hour of uninterrupted time
- [ ] You have your password manager open

### Step 1: Initial Connection & System Update

```bash
# 1.1 - Connect as root (first time only)
ssh root@<VPS_IP_ADDRESS>
# Replace <VPS_IP_ADDRESS> with actual IP from Contabo email

# 1.2 - You'll be prompted to change password immediately
# Create strong password (20+ chars, mixed case, numbers, symbols)
# Save in password manager as: "CostPlusDB-VPS-[NUMBER]-root"
# Note: You'll disable root login later, but need it now

# 1.3 - Update system (CRITICAL - do this first)
apt update
apt upgrade -y
# This may take 5-10 minutes

# 1.4 - Install essential security tools
apt install -y ufw fail2ban unattended-upgrades vim curl wget git htop net-tools

# 1.5 - Check if kernel was updated
ls /boot/vmlinuz* | wc -l
# If output is >1, reboot is needed

# 1.6 - Reboot if needed
reboot
# Wait 2 minutes

# 1.7 - Reconnect after reboot
ssh root@<VPS_IP_ADDRESS>
```

**✅ Checkpoint 1:** Can you reconnect after reboot?
**❌ If NO:** Contact Contabo support - possible VPS issue

### Step 2: Create Non-Root Admin User

**Why:** Never operate as root. Mistakes as root = catastrophic.

```bash
# 2.1 - Create admin user
adduser admin
# Or use your preferred username (keep it simple: admin, ops, costplusdb)

# Prompts you'll see:
# - Password: Create STRONG password, save in password manager
# - Full Name: Your name or "CostPlusDB Operations"
# - Room Number, Work Phone, Home Phone, Other: Press Enter to skip

# 2.2 - Add user to sudo group (gives admin privileges)
usermod -aG sudo admin

# 2.3 - Verify sudo works
su - admin
# You're now logged in as 'admin'

sudo whoami
# Should output: root
# (This means sudo is working correctly)

# 2.4 - Check which groups admin belongs to
groups
# Should show: admin sudo

# 2.5 - Exit back to root user
exit
```

**✅ Checkpoint 2:** sudo whoami outputs "root"?
**❌ If NO:** Run `usermod -aG sudo admin` again as root

### Step 3: SSH Key Setup (CRITICAL for Security)

**Why:** Password authentication is vulnerable. SSH keys are required.

**On Your Laptop (NOT on the VPS):**

```bash
# 3.1 - Check if you already have SSH keys
ls ~/.ssh/
# Look for: id_ed25519, id_rsa, costplusdb_ed25519

# 3.2 - If you don't have costplusdb keys, generate new ones
ssh-keygen -t ed25519 -C "costplusdb-operations-$(date +%Y%m%d)"

# Prompts:
# - Save location: ~/.ssh/costplusdb_ed25519 (press Enter)
# - Passphrase: Create strong passphrase (save in password manager)
# - Confirm passphrase: Enter again

# 3.3 - Your keys are now created
ls ~/.ssh/costplusdb_ed25519*
# Should show:
# - costplusdb_ed25519 (private key - NEVER share this)
# - costplusdb_ed25519.pub (public key - safe to share)

# 3.4 - Copy public key to VPS
ssh-copy-id -i ~/.ssh/costplusdb_ed25519.pub admin@<VPS_IP>
# Enter the 'admin' user password you created in Step 2

# You'll see output like:
# Number of key(s) added: 1
```

**Back on the VPS (as admin user):**

```bash
# 3.5 - Verify key was added
cat ~/.ssh/authorized_keys
# You should see a line starting with: ssh-ed25519 AAAA...

# 3.6 - Check permissions (must be exact for security)
ls -la ~/.ssh/
# Should show:
# drwx------ .ssh (700)
# -rw------- authorized_keys (600)

# If permissions are wrong, fix them:
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

**Test from Your Laptop:**

```bash
# 3.7 - Test SSH key authentication
ssh -i ~/.ssh/costplusdb_ed25519 admin@<VPS_IP>
# Should connect WITHOUT asking for password
# (May ask for your SSH key passphrase)
```

**✅ Checkpoint 3:** Can you SSH without entering server password?
**❌ If NO:**
- Check authorized_keys file exists on server
- Check permissions are correct (700 for .ssh, 600 for authorized_keys)
- Verify you're using the correct private key path

### Step 4: Harden SSH Configuration

**Why:** Default SSH config is insecure. We lock it down.

**⚠️ CRITICAL WARNING:** DO NOT close your current SSH session until Step 4.9 succeeds!

```bash
# 4.1 - Create backup of original config (safety!)
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d)

# 4.2 - Edit SSH config
sudo vim /etc/ssh/sshd_config
# If you prefer nano: sudo nano /etc/ssh/sshd_config

# 4.3 - Find and modify these lines (use / to search in vim):
# Search for "PermitRootLogin" - change to:
PermitRootLogin no

# Search for "PasswordAuthentication" - change to:
PasswordAuthentication no

# Search for "PubkeyAuthentication" - ensure it says:
PubkeyAuthentication yes

# Search for "Port" - change to (optional but recommended):
Port 2222
# Note: Remember this port! You'll use it for all future connections.

# Add these lines at the bottom if not present:
MaxAuthTries 3
LoginGraceTime 20
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers admin
# Replace 'admin' with your username if different

# 4.4 - Save and exit
# In vim: Press Esc, then type :wq and press Enter
# In nano: Press Ctrl+X, then Y, then Enter

# 4.5 - Test configuration BEFORE restarting (CRITICAL!)
sudo sshd -t
# Expected output: (nothing) or "Configuration OK"
# Any error? Go back and fix the config file!

# 4.6 - If test passed, restart SSH service
sudo systemctl restart sshd

# Check it restarted successfully
sudo systemctl status sshd
# Should show: "active (running)"
```

**⚠️ DO NOT LOG OUT YET!**

```bash
# 4.7 - Keep current terminal open
# Open a NEW terminal window/tab on your laptop

# 4.8 - In the NEW terminal, test connection with new settings:
ssh -i ~/.ssh/costplusdb_ed25519 -p 2222 admin@<VPS_IP>
# Note: Using port 2222 now (or whatever port you chose)

# 4.9 - Verification:
# ✅ If new connection works: You can close the old terminal
# ❌ If new connection fails: Use old terminal to fix sshd_config
```

**✅ Checkpoint 4:** New SSH connection on port 2222 works?
**❌ If NO:** In old terminal, restore backup config:
```bash
sudo cp /etc/ssh/sshd_config.backup.$(date +%Y%m%d) /etc/ssh/sshd_config
sudo systemctl restart sshd
```

### Step 5: Configure Firewall (UFW)

**Why:** Only allow necessary ports. Block everything else.

```bash
# 5.1 - Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 5.2 - Allow SSH (use YOUR port from Step 4)
sudo ufw allow 2222/tcp comment 'SSH'
# If you kept default port 22, use: sudo ufw allow 22/tcp

# 5.3 - Allow PostgreSQL (will be needed later)
sudo ufw allow 5432/tcp comment 'PostgreSQL'

# 5.4 - Allow pgBouncer (connection pooler - port 6432)
sudo ufw allow 6432/tcp comment 'pgBouncer'

# 5.5 - Allow HTTP/HTTPS (if this VPS will host dashboard)
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# 5.6 - Review rules before enabling
sudo ufw show added
# Verify your SSH port is listed!

# 5.7 - Enable firewall
sudo ufw enable
# Confirm: yes

# 5.8 - Check firewall status
sudo ufw status verbose
```

**Expected output:**
```
Status: active

To                         Action      From
--                         ------      ----
2222/tcp                   ALLOW IN    Anywhere        # SSH
5432/tcp                   ALLOW IN    Anywhere        # PostgreSQL
6432/tcp                   ALLOW IN    Anywhere        # pgBouncer
80/tcp                     ALLOW IN    Anywhere        # HTTP
443/tcp                    ALLOW IN    Anywhere        # HTTPS
```

**✅ Checkpoint 5:** Firewall enabled and SSH still works?
**❌ If locked out:** You'll need Contabo's VNC console to disable UFW:
```bash
sudo ufw disable
```

### Step 6: Configure Fail2ban (Intrusion Prevention)

**Why:** Automatically ban IPs that try to brute-force SSH.

```bash
# 6.1 - Copy default config
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# 6.2 - Edit local config
sudo vim /etc/fail2ban/jail.local

# 6.3 - Find [DEFAULT] section, modify:
bantime  = 1h          # Ban for 1 hour
findtime  = 10m        # Look at last 10 minutes
maxretry = 3           # 3 failed attempts = ban

# 6.4 - Find [sshd] section, ensure enabled:
[sshd]
enabled = true
port = 2222            # Match your SSH port!
logpath = /var/log/auth.log

# 6.5 - Save and exit (:wq in vim)

# 6.6 - Start fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# 6.7 - Check status
sudo fail2ban-client status
# Should show: sshd jail active

# 6.8 - Check sshd jail specifically
sudo fail2ban-client status sshd
```

**✅ Checkpoint 6:** Fail2ban is running?

### Step 7: Enable Automatic Security Updates

**Why:** Critical security patches applied automatically. Sleep better at night.

```bash
# 7.1 - Configure unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
# Select: Yes

# 7.2 - Edit configuration
sudo vim /etc/apt/apt.conf.d/50unattended-upgrades

# 7.3 - Ensure these lines are uncommented (remove // if present):
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};

# 7.4 - Enable automatic reboots for kernel updates
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:00";
# Reboots at 4 AM if kernel update requires it

# 7.5 - Enable email notifications (optional)
Unattended-Upgrade::Mail "your-email@example.com";
Unattended-Upgrade::MailReport "on-change";

# 7.6 - Save and exit

# 7.7 - Test the configuration
sudo unattended-upgrades --dry-run --debug
# Should complete without errors

# 7.8 - Enable auto-update service
sudo systemctl enable unattended-upgrades
sudo systemctl start unattended-upgrades

# 7.9 - Check status
sudo systemctl status unattended-upgrades
```

**✅ Checkpoint 7:** Unattended-upgrades service is active?

### Step 8: Configure Logging & Log Rotation

**Why:** Logs help diagnose issues. Rotation prevents disk full.

```bash
# 8.1 - Check current disk usage
df -h
# Note the usage of root filesystem (/)

# 8.2 - Configure logrotate for auth logs
sudo vim /etc/logrotate.d/rsyslog

# 8.3 - Ensure these settings:
/var/log/auth.log {
    weekly
    rotate 4
    missingok
    notifempty
    compress
    delaycompress
    sharedscripts
    postrotate
        /usr/lib/rsyslog/rsyslog-rotate
    endscript
}

# 8.4 - Test logrotate configuration
sudo logrotate -d /etc/logrotate.d/rsyslog
# Check for errors

# 8.5 - Set up log monitoring (optional but recommended)
sudo apt install -y logwatch

# 8.6 - Configure logwatch to email daily summaries
sudo vim /etc/logwatch/conf/logwatch.conf
# Add:
MailTo = your-email@example.com
Detail = Med
Range = yesterday
Service = All

# 8.7 - Test logwatch
sudo logwatch --detail Med --range today --output stdout
```

**✅ Checkpoint 8:** Logrotate config is valid?

### Step 9: Set Timezone & NTP

**Why:** Correct time is critical for logs, backups, and PostgreSQL.

```bash
# 9.1 - Check current timezone
timedatectl

# 9.2 - List available timezones
timedatectl list-timezones | grep America
# Find your timezone (e.g., America/Chicago for Minneapolis)

# 9.3 - Set timezone
sudo timedatectl set-timezone America/Chicago

# 9.4 - Verify change
timedatectl
# Check "Time zone:" line

# 9.5 - Ensure NTP is enabled (for time sync)
sudo timedatectl set-ntp true

# 9.6 - Check NTP sync status
timedatectl status
# "System clock synchronized: yes" means working
```

**✅ Checkpoint 9:** Timezone correct and NTP synchronized?

### Step 10: Create Operations Directories

**Why:** Organized file structure prevents mistakes.

```bash
# 10.1 - Create standard directory structure
sudo mkdir -p /opt/costplusdb/{scripts,backups,logs,configs}

# 10.2 - Set ownership
sudo chown -R admin:admin /opt/costplusdb

# 10.3 - Set permissions
chmod 750 /opt/costplusdb
chmod 750 /opt/costplusdb/*

# 10.4 - Create symlink for easy access
ln -s /opt/costplusdb ~/costplusdb

# 10.5 - Verify structure
tree /opt/costplusdb
# Or: ls -la /opt/costplusdb
```

**Directory purposes:**
- `/opt/costplusdb/scripts` - Operational scripts (provisioning, monitoring)
- `/opt/costplusdb/backups` - Local backup staging
- `/opt/costplusdb/logs` - Application logs
- `/opt/costplusdb/configs` - Configuration backups

**✅ Checkpoint 10:** Directory structure created?

### Step 11: Document This VPS

**Why:** You'll forget details. Write them down NOW.

Create a file: `~/costplusdb/VPS-INVENTORY.md`

```bash
vim ~/costplusdb/VPS-INVENTORY.md
```

**Template:**

```markdown
# VPS Inventory

## VPS-001: [Give it a name, e.g., "db-primary-01"]

**Provisioned:** YYYY-MM-DD
**Provider:** Contabo
**IP Address:** xxx.xxx.xxx.xxx
**SSH Port:** 2222
**Purpose:** [Control Plane / Customer Databases / Shared Hosting]

**Specs:**
- CPU: 4 vCPU
- RAM: 8 GB
- Storage: 200 GB NVMe
- Bandwidth: 20 TB

**Credentials:**
- Root user: DISABLED
- Admin user: admin
- SSH key: ~/.ssh/costplusdb_ed25519

**Software Installed:**
- OS: Ubuntu 24.04 LTS
- PostgreSQL: (to be installed)
- pgBouncer: (to be installed)
- Monitoring: (to be configured)

**Customers Hosted:** (none yet)

**Monthly Cost:** $12.00

**Notes:**
- Initial setup completed: YYYY-MM-DD
- Security hardening: Complete
- Monitoring configured: Pending
- Backups configured: Pending

**Maintenance Windows:**
- Security patches: Sunday 4:00 AM CT (automatic)
- Manual maintenance: First Sunday of month, 2:00-4:00 AM CT
```

**Save this file and keep it updated!**

### Step 12: Final Security Verification

Run this checklist:

```bash
# 12.1 - SSH configuration
sudo sshd -t && echo "✅ SSH config valid"

# 12.2 - Firewall status
sudo ufw status | grep -q "Status: active" && echo "✅ Firewall active"

# 12.3 - Fail2ban status
sudo systemctl is-active fail2ban && echo "✅ Fail2ban running"

# 12.4 - Automatic updates
sudo systemctl is-active unattended-upgrades && echo "✅ Auto-updates enabled"

# 12.5 - Check for root login attempts (should be empty)
sudo grep "Failed password for root" /var/log/auth.log | tail -10

# 12.6 - Verify root login is disabled
sudo grep "^PermitRootLogin" /etc/ssh/sshd_config
# Should show: PermitRootLogin no

# 12.7 - Check open ports
sudo ss -tlnp
# Verify only expected ports are listening

# 12.8 - System resource check
htop
# Press F10 to quit
# Check: CPU idle, RAM usage reasonable, no suspicious processes
```

**✅ Final Checkpoint:** All checks pass?

### Step 13: Create VPS Snapshot (Optional but Recommended)

**Why:** Baseline backup before installing PostgreSQL.

**If using Contabo:**
1. Log into Contabo control panel
2. Select this VPS
3. Go to "Snapshots"
4. Create snapshot: `baseline-hardened-$(date +%Y%m%d)`
5. Wait for completion (10-15 minutes)

**Document the snapshot:**

```bash
echo "Snapshot: baseline-hardened-$(date +%Y%m%d)" >> ~/costplusdb/VPS-INVENTORY.md
echo "Purpose: Clean hardened Ubuntu before PostgreSQL install" >> ~/costplusdb/VPS-INVENTORY.md
```

### Completion Checklist

Before marking SOP-001 complete, verify:

- [ ] VPS is updated (apt upgrade completed)
- [ ] Non-root admin user created with sudo access
- [ ] SSH key authentication working
- [ ] Password authentication disabled
- [ ] Root login disabled
- [ ] Firewall (UFW) enabled with proper rules
- [ ] Fail2ban installed and running
- [ ] Automatic security updates enabled
- [ ] Timezone set correctly
- [ ] NTP synchronization working
- [ ] Directory structure created (/opt/costplusdb)
- [ ] VPS documented in inventory file
- [ ] You can reconnect via SSH on port 2222
- [ ] Baseline snapshot created (optional)

**⚠️ Before proceeding to SOP-002:**
- Test SSH connection from your laptop one final time
- Verify you have backup access method (Contabo VNC console)
- Save all passwords in password manager
- Update your laptop's SSH config:

```bash
# On your laptop, edit ~/.ssh/config
vim ~/.ssh/config

# Add entry for this VPS:
Host costplusdb-vps-001
    HostName xxx.xxx.xxx.xxx
    Port 2222
    User admin
    IdentityFile ~/.ssh/costplusdb_ed25519
    ServerAliveInterval 60

# Now you can connect with: ssh costplusdb-vps-001
```

### 🎉 SOP-001 Complete!

**Time to complete:** _____ minutes (record for future reference)
**Issues encountered:** (document any problems for future troubleshooting)
**Next SOP:** SOP-002: PostgreSQL Installation & Configuration

---

<a name="sop-002"></a>

## SOP-002: PostgreSQL Installation & Configuration

**Purpose:** Install and configure PostgreSQL 16 for production use
**When to use:** On every VPS that will host customer databases
**Time required:** 60-90 minutes
**Frequency:** One-time per VPS
**Risk Level:** MEDIUM - Misconfigurations affect performance but usually fixable

### Prerequisites
- [ ] SOP-001 completed successfully
- [ ] VPS is accessible via SSH
- [ ] You have sudo access
- [ ] At least 2 GB free disk space

### Safety Checklist
- [ ] No customers on this VPS yet (or maintenance window scheduled)
- [ ] You have 1.5 hours of uninterrupted time
- [ ] Backup snapshot exists (from SOP-001)

### Step 1: Add PostgreSQL APT Repository

**Why:** Ubuntu's default PostgreSQL is outdated. We want PostgreSQL 16.

```bash
# 1.1 - Install prerequisites
sudo apt install -y postgresql-common apt-transport-https ca-certificates

# 1.2 - Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# 1.3 - Import repository signing key
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# 1.4 - Update package list
sudo apt update

# 1.5 - Verify PostgreSQL 16 is available
apt-cache policy postgresql-16
# Should show: Candidate: 16.x
```

**✅ Checkpoint 1:** PostgreSQL 16 appears in available packages?

### Step 2: Install PostgreSQL 16

```bash
# 2.1 - Install PostgreSQL 16 and contrib modules
sudo apt install -y postgresql-16 postgresql-contrib-16

# 2.2 - Verify installation
sudo systemctl status postgresql
# Should show: "active (running)"

# 2.3 - Check PostgreSQL version
sudo -u postgres psql -c "SELECT version();"
# Should show: PostgreSQL 16.x

# 2.4 - Check default cluster status
sudo pg_lsclusters
# Should show:
# Ver Cluster Port Status Owner    Data directory              Log file
# 16  main    5432 online postgres /var/lib/postgresql/16/main ...
```

**✅ Checkpoint 2:** PostgreSQL 16 is running?

### Step 3: Set PostgreSQL Password & Basic Security

```bash
# 3.1 - Set password for postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
ALTER USER postgres WITH PASSWORD 'YOUR_STRONG_PASSWORD_HERE';
# Generate strong password (20+ chars), save in password manager as "VPS-001-postgres"

# 3.2 - Verify password was set
\password postgres
# Enter password again to confirm

# 3.3 - Exit psql
\q

# 3.4 - Test password login
psql -U postgres -h localhost -d postgres
# Enter password when prompted
# Should connect successfully

# Exit
\q
```

**✅ Checkpoint 3:** Can connect with password?

### Step 4: Configure PostgreSQL for Remote Access

**Why:** Customers need to connect from their applications.

```bash
# 4.1 - Backup original config
sudo cp /etc/postgresql/16/main/postgresql.conf /etc/postgresql/16/main/postgresql.conf.backup

# 4.2 - Edit postgresql.conf
sudo vim /etc/postgresql/16/main/postgresql.conf

# 4.3 - Find and modify these settings:

# Listen on all interfaces (not just localhost)
listen_addresses = '*'              # Line ~64

# Connection settings
max_connections = 100               # Line ~63
superuser_reserved_connections = 3  # Line ~65

# Memory settings (for 8GB RAM VPS)
shared_buffers = 2GB                # Line ~127 (25% of RAM)
effective_cache_size = 6GB          # Line ~139 (75% of RAM)
maintenance_work_mem = 512MB        # Line ~133
work_mem = 16MB                     # Line ~129

# Checkpoint settings
checkpoint_completion_target = 0.9  # Line ~145
wal_buffers = 16MB                  # Line ~142
default_statistics_target = 100     # Line ~158

# Logging (IMPORTANT for troubleshooting)
log_destination = 'stderr'          # Line ~173
logging_collector = on              # Line ~176
log_directory = 'log'               # Line ~177
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'  # Line ~178
log_rotation_age = 1d               # Line ~181
log_rotation_size = 100MB           # Line ~182
log_min_duration_statement = 1000   # Line ~197 (log queries >1 second)
log_connections = on                # Line ~187
log_disconnections = on             # Line ~188
log_line_prefix = '%t [%p]: user=%u,db=%d,app=%a,client=%h '  # Line ~190

# Performance monitoring
shared_preload_libraries = 'pg_stat_statements'  # Line ~115

# Save and exit (:wq)
```

**✅ Checkpoint 4.1:** Config file saved?

```bash
# 4.4 - Edit pg_hba.conf (client authentication)
sudo cp /etc/postgresql/16/main/pg_hba.conf /etc/postgresql/16/main/pg_hba.conf.backup
sudo vim /etc/postgresql/16/main/pg_hba.conf

# 4.5 - Add these lines at the BOTTOM (order matters):

# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local connections (Unix socket)
local   all             postgres                                peer
local   all             all                                     scram-sha-256

# IPv4 remote connections - REQUIRE SSL
hostssl all             all             0.0.0.0/0               scram-sha-256

# IPv6 remote connections - REQUIRE SSL
hostssl all             all             ::0/0                   scram-sha-256

# REJECT non-SSL connections
host    all             all             0.0.0.0/0               reject
host    all             all             ::0/0                   reject

# Save and exit (:wq)

# 4.6 - Test config files for syntax errors
sudo -u postgres /usr/lib/postgresql/16/bin/postgres -C config_file
# Should output: /etc/postgresql/16/main/postgresql.conf

# 4.7 - Restart PostgreSQL
sudo systemctl restart postgresql

# 4.8 - Check status
sudo systemctl status postgresql
# Should show: "active (running)"

# 4.9 - Check logs for errors
sudo tail -50 /var/log/postgresql/postgresql-16-main.log
# Look for any ERROR or FATAL messages
```

**✅ Checkpoint 4.2:** PostgreSQL restarted without errors?

### Step 5: Enable pg_stat_statements Extension

**Why:** Critical for query performance monitoring.

```bash
# 5.1 - Connect to PostgreSQL
sudo -u postgres psql

# 5.2 - Create extension in postgres database (template)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

# 5.3 - Verify extension
\dx
# Should show pg_stat_statements in list

# 5.4 - Configure extension settings
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET pg_stat_statements.max = 10000;

# 5.5 - Reload configuration
SELECT pg_reload_conf();

# 5.6 - Exit
\q

# 5.7 - Restart PostgreSQL to load shared library
sudo systemctl restart postgresql

# 5.8 - Verify extension is working
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_statements;"
# Should return a number (even if 0)
```

**✅ Checkpoint 5:** pg_stat_statements working?

### Step 6: Set Up SSL/TLS Certificates

**Why:** Encrypt all database connections. Required by pg_hba.conf config.

```bash
# 6.1 - Create directory for certificates
sudo mkdir -p /var/lib/postgresql/16/ssl
sudo chown postgres:postgres /var/lib/postgresql/16/ssl
sudo chmod 700 /var/lib/postgresql/16/ssl

# 6.2 - Generate self-signed certificate (for now - replace with real cert later)
sudo -u postgres openssl req -new -x509 -days 365 -nodes \
  -text \
  -out /var/lib/postgresql/16/ssl/server.crt \
  -keyout /var/lib/postgresql/16/ssl/server.key \
  -subj "/CN=costplusdb-postgresql"

# 6.3 - Set correct permissions
sudo chmod 600 /var/lib/postgresql/16/ssl/server.key
sudo chmod 644 /var/lib/postgresql/16/ssl/server.crt
sudo chown postgres:postgres /var/lib/postgresql/16/ssl/server.*

# 6.4 - Configure PostgreSQL to use SSL
sudo vim /etc/postgresql/16/main/postgresql.conf

# Find and modify:
ssl = on
ssl_cert_file = '/var/lib/postgresql/16/ssl/server.crt'
ssl_key_file = '/var/lib/postgresql/16/ssl/server.key'

# Save and exit (:wq)

# 6.5 - Restart PostgreSQL
sudo systemctl restart postgresql

# 6.6 - Verify SSL is enabled
sudo -u postgres psql -c "SHOW ssl;"
# Should output: on

# 6.7 - Test SSL connection from localhost
psql "postgresql://postgres@localhost/postgres?sslmode=require"
# Enter password
# Should connect with SSL
\conninfo
# Should show: "SSL connection"
\q
```

**✅ Checkpoint 6:** SSL connections working?

**Note:** For production, replace self-signed cert with Let's Encrypt certificate (see SOP-005)

### Step 7: Create Database Health Check Script

**Why:** Automated monitoring needs a quick health check.

```bash
# 7.1 - Create script
vim /opt/costplusdb/scripts/pg-health-check.sh

# 7.2 - Add this content:
```

```bash
#!/bin/bash
# PostgreSQL Health Check Script
# Returns exit code 0 if healthy, 1 if unhealthy

# Configuration
PG_USER="postgres"
PG_DB="postgres"
LOG_FILE="/opt/costplusdb/logs/health-check.log"

# Create log directory if doesn't exist
mkdir -p /opt/costplusdb/logs

# Function to log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check 1: Is PostgreSQL running?
if ! systemctl is-active --quiet postgresql; then
    log "ERROR: PostgreSQL service is not running"
    exit 1
fi

# Check 2: Can we connect?
if ! sudo -u postgres psql -c "SELECT 1;" > /dev/null 2>&1; then
    log "ERROR: Cannot connect to PostgreSQL"
    exit 1
fi

# Check 3: Check database connections
CONN_COUNT=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity;")
MAX_CONN=$(sudo -u postgres psql -t -c "SHOW max_connections;" | tr -d ' ')

if [ "$CONN_COUNT" -ge "$((MAX_CONN * 90 / 100))" ]; then
    log "WARNING: Connection usage at ${CONN_COUNT}/${MAX_CONN} (90%+)"
fi

# Check 4: Check disk space
DISK_USAGE=$(df -h /var/lib/postgresql | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    log "WARNING: Disk usage at ${DISK_USAGE}%"
fi

# Check 5: Check for long-running queries (>5 minutes)
LONG_QUERIES=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '5 minutes';")
if [ "$LONG_QUERIES" -gt 0 ]; then
    log "WARNING: ${LONG_QUERIES} queries running >5 minutes"
fi

# All checks passed
log "INFO: Health check passed"
exit 0
```

```bash
# 7.3 - Save and make executable
chmod +x /opt/costplusdb/scripts/pg-health-check.sh

# 7.4 - Test the script
/opt/costplusdb/scripts/pg-health-check.sh
echo $?
# Should output: 0 (success)

# 7.5 - Check log file
cat /opt/costplusdb/logs/health-check.log
# Should show: Health check passed

# 7.6 - Schedule health check (every 5 minutes)
crontab -e
# Add this line:
*/5 * * * * /opt/costplusdb/scripts/pg-health-check.sh

# 7.7 - Verify cron job
crontab -l
```

**✅ Checkpoint 7:** Health check script works and is scheduled?

### Step 8: Optimize PostgreSQL Vacuum Settings

**Why:** Automatic vacuuming prevents table bloat and performance degradation.

```bash
# 8.1 - Edit postgresql.conf
sudo vim /etc/postgresql/16/main/postgresql.conf

# 8.2 - Find and modify autovacuum settings:

# Enable autovacuum
autovacuum = on                              # Line ~208

# Autovacuum worker processes
autovacuum_max_workers = 3                   # Line ~210

# Vacuum cost settings (prevent vacuum from hogging resources)
autovacuum_vacuum_cost_delay = 2ms           # Line ~211
autovacuum_vacuum_cost_limit = 200           # Line ~212

# Thresholds for when to vacuum
autovacuum_vacuum_threshold = 50             # Line ~213
autovacuum_vacuum_scale_factor = 0.1         # Line ~214

# Thresholds for when to analyze
autovacuum_analyze_threshold = 50            # Line ~215
autovacuum_analyze_scale_factor = 0.05       # Line ~216

# Save and exit (:wq)

# 8.3 - Reload configuration
sudo systemctl reload postgresql

# 8.4 - Verify settings
sudo -u postgres psql -c "SHOW autovacuum;"
# Should output: on
```

**✅ Checkpoint 8:** Autovacuum configured?

### Step 9: Create PostgreSQL Monitoring Queries

**Why:** Quick queries for troubleshooting and monitoring.

```bash
# 9.1 - Create queries file
vim /opt/costplusdb/scripts/pg-queries.sql

# 9.2 - Add useful monitoring queries:
```

```sql
-- PostgreSQL Monitoring Queries
-- Usage: psql -U postgres -f /opt/costplusdb/scripts/pg-queries.sql

-- 1. Database sizes
\echo '=== DATABASE SIZES ==='
SELECT
    datname AS database,
    pg_size_pretty(pg_database_size(datname)) AS size
FROM pg_database
WHERE datname NOT IN ('template0', 'template1')
ORDER BY pg_database_size(datname) DESC;

-- 2. Active connections by database
\echo '\n=== ACTIVE CONNECTIONS ==='
SELECT
    datname AS database,
    count(*) AS connections
FROM pg_stat_activity
WHERE state = 'active'
GROUP BY datname
ORDER BY connections DESC;

-- 3. Top 10 largest tables
\echo '\n=== LARGEST TABLES ==='
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- 4. Slow queries (from pg_stat_statements)
\echo '\n=== SLOWEST QUERIES (avg time) ==='
SELECT
    substring(query, 1, 100) AS query_preview,
    calls,
    ROUND(mean_exec_time::numeric, 2) AS avg_ms,
    ROUND(total_exec_time::numeric, 2) AS total_ms
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 5. Cache hit ratio (should be >90%)
\echo '\n=== CACHE HIT RATIO ==='
SELECT
    sum(heap_blks_read) AS heap_read,
    sum(heap_blks_hit) AS heap_hit,
    ROUND(sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100, 2) AS ratio
FROM pg_statio_user_tables;

-- 6. Connection limits
\echo '\n=== CONNECTION USAGE ==='
SELECT
    count(*) AS current_connections,
    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max_connections,
    ROUND(count(*)::numeric / (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') * 100, 2) AS usage_percent
FROM pg_stat_activity;

-- 7. Long-running queries
\echo '\n=== LONG-RUNNING QUERIES (>1 min) ==='
SELECT
    pid,
    usename,
    datname,
    state,
    now() - query_start AS duration,
    substring(query, 1, 100) AS query_preview
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '1 minute'
ORDER BY duration DESC;

-- 8. Database bloat check
\echo '\n=== TABLE BLOAT ==='
SELECT
    schemaname,
    tablename,
    ROUND(100 * pg_relation_size(schemaname||'.'||tablename) /
        NULLIF(pg_total_relation_size(schemaname||'.'||tablename), 0), 2) AS bloat_percent
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND pg_total_relation_size(schemaname||'.'||tablename) > 1048576  -- >1MB
ORDER BY bloat_percent DESC
LIMIT 10;
```

```bash
# 9.3 - Save file

# 9.4 - Test queries
sudo -u postgres psql -f /opt/costplusdb/scripts/pg-queries.sql

# 9.5 - Create alias for quick access
echo "alias pgstats='sudo -u postgres psql -f /opt/costplusdb/scripts/pg-queries.sql'" >> ~/.bashrc
source ~/.bashrc

# Now you can run: pgstats
```

**✅ Checkpoint 9:** Monitoring queries work?

### Step 10: Document PostgreSQL Configuration

```bash
# 10.1 - Create PostgreSQL documentation file
vim ~/costplusdb/POSTGRESQL-CONFIG.md

# 10.2 - Add this template:
```

```markdown
# PostgreSQL Configuration - VPS-001

## Installation Details
- PostgreSQL Version: 16.x
- Installed: YYYY-MM-DD
- Data Directory: /var/lib/postgresql/16/main
- Config Files: /etc/postgresql/16/main/
- Log Directory: /var/log/postgresql/

## Key Configuration Settings

### Memory (8GB RAM VPS)
- shared_buffers: 2GB (25% of RAM)
- effective_cache_size: 6GB (75% of RAM)
- maintenance_work_mem: 512MB
- work_mem: 16MB

### Connections
- max_connections: 100
- superuser_reserved_connections: 3

### Security
- SSL: Enabled (self-signed cert)
- Remote connections: Allowed with SSL only
- Authentication: scram-sha-256
- Password policy: Strong passwords required

### Monitoring
- pg_stat_statements: Enabled
- Log slow queries: >1 second
- Connection logging: Enabled

### Autovacuum
- Enabled: Yes
- Workers: 3
- Thresholds: Standard settings

## Credentials
- postgres user password: Stored in 1Password as "VPS-001-postgres"

## Important Files
- Main config: /etc/postgresql/16/main/postgresql.conf
- Auth config: /etc/postgresql/16/main/pg_hba.conf
- SSL cert: /var/lib/postgresql/16/ssl/server.crt
- SSL key: /var/lib/postgresql/16/ssl/server.key
- Health check: /opt/costplusdb/scripts/pg-health-check.sh
- Monitoring queries: /opt/costplusdb/scripts/pg-queries.sql

## Maintenance Schedule
- Autovacuum: Automatic
- VACUUM FULL: Manual when needed
- ANALYZE: Automatic
- Backups: Configured in SOP-003

## Common Commands
\```bash
# Start/stop/restart
sudo systemctl start postgresql
sudo systemctl stop postgresql
sudo systemctl restart postgresql
sudo systemctl reload postgresql  # Reload config without restart

# Connect as postgres
sudo -u postgres psql

# View logs
sudo tail -f /var/log/postgresql/postgresql-16-main.log

# Run health check
/opt/costplusdb/scripts/pg-health-check.sh

# Run monitoring queries
sudo -u postgres psql -f /opt/costplusdb/scripts/pg-queries.sql
\```

## Backup Configuration
- Configured: (pending SOP-003)

## Notes
(Add any custom notes here)
```

```bash
# 10.3 - Save file

# 10.4 - Add entry to VPS inventory
echo "" >> ~/costplusdb/VPS-INVENTORY.md
echo "## Software Configuration" >> ~/costplusdb/VPS-INVENTORY.md
echo "- PostgreSQL: 16.x (see POSTGRESQL-CONFIG.md)" >> ~/costplusdb/VPS-INVENTORY.md
```

**✅ Checkpoint 10:** Documentation complete?

### Step 11: Final PostgreSQL Verification

Run complete verification:

```bash
# 11.1 - PostgreSQL service status
sudo systemctl status postgresql
# Expected: active (running)

# 11.2 - Version check
sudo -u postgres psql -c "SELECT version();"
# Expected: PostgreSQL 16.x

# 11.3 - SSL check
sudo -u postgres psql -c "SHOW ssl;"
# Expected: on

# 11.4 - Extension check
sudo -u postgres psql -c "\dx"
# Expected: pg_stat_statements listed

# 11.5 - Connection test from localhost
psql "postgresql://postgres@localhost/postgres?sslmode=require"
# Enter password - should connect with SSL
\conninfo
# Should show SSL connection
\q

# 11.6 - Configuration syntax check
sudo -u postgres /usr/lib/postgresql/16/bin/postgres --check -D /var/lib/postgresql/16/main
# Expected: No output = success

# 11.7 - Health check test
/opt/costplusdb/scripts/pg-health-check.sh
echo $?
# Expected: 0

# 11.8 - Check logs for errors
sudo grep -i error /var/log/postgresql/postgresql-16-main.log | tail -20
# Expected: No recent errors

# 11.9 - Performance check
sudo -u postgres psql -f /opt/costplusdb/scripts/pg-queries.sql
# Review output - cache hit ratio should be high

# 11.10 - Test creating a database (we'll delete it)
sudo -u postgres psql -c "CREATE DATABASE test_db;"
sudo -u postgres psql -c "\l" | grep test_db
# Should see test_db listed
sudo -u postgres psql -c "DROP DATABASE test_db;"
# Cleanup test database
```

**✅ Final Verification:** All checks pass?

### Completion Checklist

Before marking SOP-002 complete, verify:

- [ ] PostgreSQL 16 installed and running
- [ ] postgres user password set and saved in password manager
- [ ] Remote connections enabled (listen_addresses = '*')
- [ ] SSL/TLS enabled and working
- [ ] pg_hba.conf requires SSL for remote connections
- [ ] Memory settings optimized for 8GB RAM
- [ ] pg_stat_statements extension enabled
- [ ] Autovacuum configured
- [ ] Health check script created and scheduled (cron)
- [ ] Monitoring queries file created
- [ ] PostgreSQL configuration documented
- [ ] Can connect locally with SSL
- [ ] All verification tests pass
- [ ] No errors in PostgreSQL logs

**⚠️ Security Note:** At this point, PostgreSQL is accessible from the internet (port 5432 open in UFW). This is correct for customer connections, but be aware:
- Only SSL connections are allowed
- Strong authentication required (scram-sha-256)
- Firewall is protecting the VPS
- You'll create individual customer databases with limited permissions (SOP-103)

### 🎉 SOP-002 Complete!

**Time to complete:** _____ minutes
**Issues encountered:** (document for future reference)
**Next SOP:** SOP-003: Backup System Setup & Verification

---

<a name="sop-003"></a>

## SOP-003: Backup System Setup & Verification

**Purpose:** Configure automated backups with pgBackRest to Wasabi S3-compatible storage
**When to use:** After PostgreSQL installation, before hosting any customer data
**Time required:** 90-120 minutes
**Frequency:** One-time per VPS
**Risk Level:** HIGH - Backup failures = potential data loss

### Prerequisites
- [ ] SOP-002 completed (PostgreSQL installed and configured)
- [ ] Wasabi account created (or alternative S3-compatible storage)
- [ ] Wasabi bucket created
- [ ] Wasabi API keys generated
- [ ] Credit card ready for Wasabi (first 1TB free, then ~$6/TB/month)

### Safety Checklist
- [ ] No customer data on this VPS yet (or maintenance window scheduled)
- [ ] You have 2 hours of uninterrupted time
- [ ] You have Wasabi credentials accessible

### Step 1: Create Wasabi Account and Bucket

**Why:** Offsite backup storage. Wasabi is S3-compatible, cheaper than AWS S3.

**1.1 - Sign up for Wasabi:**
1. Go to https://wasabi.com
2. Click "Sign Up" or "Free Trial"
3. Choose region closest to you (us-east-1, us-west-1, eu-central-1, etc.)
4. Complete registration
5. Verify email

**1.2 - Create Access Keys:**
1. Log into Wasabi console
2. Go to "Access Keys"
3. Click "Create New Access Key"
4. Save these immediately in password manager:
   - Access Key ID: (looks like: AKIAIOSFODNN7EXAMPLE)
   - Secret Access Key: (looks like: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY)
   - Label in password manager: "Wasabi-CostPlusDB-Backups"

**1.3 - Create Bucket:**
1. In Wasabi console, go to "Buckets"
2. Click "Create Bucket"
3. Bucket name: `costplusdb-backups-prod` (must be globally unique)
4. Region: Select same region as your signup
5. Enable versioning: No (we'll manage versions with pgBackRest)
6. Enable logging: Optional
7. Click "Create Bucket"

**1.4 - Note the S3 endpoint:**

Find your endpoint URL based on region:
- us-east-1: s3.wasabisys.com
- us-east-2: s3.us-east-2.wasabisys.com
- us-west-1: s3.us-west-1.wasabisys.com
- eu-central-1: s3.eu-central-1.wasabisys.com

Save in your notes:
```
Wasabi Configuration:
- Bucket: costplusdb-backups-prod
- Region: us-east-1
- Endpoint: s3.wasabisys.com
- Access Key: (in password manager)
- Secret Key: (in password manager)
```

**✅ Checkpoint 1:** Wasabi bucket created and credentials saved?

### Step 2: Install pgBackRest

**Why:** Industry-standard PostgreSQL backup tool. Supports incremental backups, compression, encryption.

```bash
# 2.1 - Add pgBackRest repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# 2.2 - Update package list
sudo apt update

# 2.3 - Install pgBackRest
sudo apt install -y pgbackrest

# 2.4 - Verify installation
pgbackrest version
# Should show: pgBackRest 2.x

# 2.5 - Create pgBackRest directories
sudo mkdir -p /var/log/pgbackrest
sudo mkdir -p /var/lib/pgbackrest
sudo chmod 750 /var/log/pgbackrest
sudo chmod 750 /var/lib/pgbackrest
sudo chown -R postgres:postgres /var/log/pgbackrest
sudo chown -R postgres:postgres /var/lib/pgbackrest
```

**✅ Checkpoint 2:** pgBackRest installed?

### Step 3: Configure pgBackRest

```bash
# 3.1 - Create pgBackRest configuration file
sudo vim /etc/pgbackrest.conf

# 3.2 - Add this configuration (replace YOUR_* with actual values):

[global]
# Repository configuration
repo1-type=s3
repo1-s3-bucket=costplusdb-backups-prod
repo1-s3-endpoint=s3.wasabisys.com
repo1-s3-region=us-east-1
repo1-s3-key=YOUR_WASABI_ACCESS_KEY_HERE
repo1-s3-key-secret=YOUR_WASABI_SECRET_KEY_HERE
repo1-path=/pgbackrest
repo1-retention-full=4
repo1-retention-diff=4

# Encryption (HIGHLY RECOMMENDED)
repo1-cipher-type=aes-256-cbc
repo1-cipher-pass=YOUR_STRONG_ENCRYPTION_PASSWORD_HERE

# Compression
compress-type=zst
compress-level=3

# Logging
log-level-console=info
log-level-file=detail
log-path=/var/log/pgbackrest

# Process settings
process-max=4

# PostgreSQL cluster configuration
[main]
pg1-path=/var/lib/postgresql/16/main
pg1-port=5432
pg1-socket-path=/var/run/postgresql
```

**Important notes:**
- Replace `YOUR_WASABI_ACCESS_KEY_HERE` with your actual Wasabi access key
- Replace `YOUR_WASABI_SECRET_KEY_HERE` with your actual Wasabi secret key
- Replace `YOUR_STRONG_ENCRYPTION_PASSWORD_HERE` with a strong password (generate one, save in password manager as "pgBackRest-encryption-key")
- Adjust `repo1-s3-endpoint` and `repo1-s3-region` to match your Wasabi region

```bash
# 3.3 - Save and exit (:wq)

# 3.4 - Set file permissions (CRITICAL - contains secrets)
sudo chmod 640 /etc/pgbackrest.conf
sudo chown postgres:postgres /etc/pgbackrest.conf

# 3.5 - Verify file permissions
ls -l /etc/pgbackrest.conf
# Should show: -rw-r----- 1 postgres postgres

# 3.6 - Test configuration syntax
sudo -u postgres pgbackrest --stanza=main info
# May show error "stanza doesn't exist" - this is expected, we'll create it next
```

**✅ Checkpoint 3:** Configuration file created with correct permissions?

### Step 4: Configure PostgreSQL for Archiving

**Why:** PostgreSQL needs to archive WAL files for point-in-time recovery.

```bash
# 4.1 - Edit PostgreSQL configuration
sudo vim /etc/postgresql/16/main/postgresql.conf

# 4.2 - Find and modify these settings:

# WAL (Write-Ahead Log) settings
wal_level = replica                         # Line ~90 (enables archiving)
archive_mode = on                           # Line ~93
archive_command = 'pgbackrest --stanza=main archive-push %p'  # Line ~95
archive_timeout = 1800                      # Line ~98 (30 minutes)

# For point-in-time recovery
max_wal_senders = 3                         # Line ~100
wal_keep_size = 1GB                         # Line ~104

# Save and exit (:wq)

# 4.3 - Restart PostgreSQL (required for wal_level change)
sudo systemctl restart postgresql

# 4.4 - Verify PostgreSQL is running
sudo systemctl status postgresql

# 4.5 - Verify WAL settings
sudo -u postgres psql -c "SHOW wal_level;"
# Should output: replica

sudo -u postgres psql -c "SHOW archive_mode;"
# Should output: on

sudo -u postgres psql -c "SHOW archive_command;"
# Should show: pgbackrest --stanza=main archive-push %p
```

**✅ Checkpoint 4:** PostgreSQL configured for archiving?

### Step 5: Create and Initialize pgBackRest Stanza

**Why:** Stanza is pgBackRest's configuration for a specific database cluster.

```bash
# 5.1 - Create the stanza (one-time setup)
sudo -u postgres pgbackrest --stanza=main stanza-create

# Expected output:
# P00   INFO: stanza-create command end: completed successfully

# 5.2 - Verify stanza was created
sudo -u postgres pgbackrest --stanza=main info

# Expected output:
# stanza: main
#     status: ok
#     cipher: aes-256-cbc
#     (no backup yet)

# 5.3 - Check Wasabi bucket
# Log into Wasabi web console
# Go to your bucket: costplusdb-backups-prod
# You should see a folder structure like: /pgbackrest/backup/main/
```

**✅ Checkpoint 5:** Stanza created successfully?
**❌ If error:**
- Check Wasabi credentials in /etc/pgbackrest.conf
- Verify bucket name is correct
- Test internet connectivity: `curl -I https://s3.wasabisys.com`
- Check pgBackRest logs: `sudo tail -50 /var/log/pgbackrest/main-stanza-create.log`

### Step 6: Take First Full Backup

**Why:** Create baseline backup before adding customers.

```bash
# 6.1 - Take first full backup
sudo -u postgres pgbackrest --stanza=main --type=full backup

# This will take 5-30 minutes depending on data size
# Expected output at end:
# P00   INFO: new backup label = [TIMESTAMP]F
# P00   INFO: full backup size = [SIZE]
# P00   INFO: backup command end: completed successfully

# 6.2 - Verify backup was created
sudo -u postgres pgbackrest --stanza=main info

# Expected output:
# stanza: main
#     status: ok
#     cipher: aes-256-cbc
#
#     full backup: [TIMESTAMP]F
#         timestamp start/stop: [TIME] / [TIME]
#         wal start/stop: [WAL] / [WAL]
#         database size: [SIZE], backup size: [SIZE]
#         repo1: backup size: [SIZE]

# 6.3 - Check backup in Wasabi
# Log into Wasabi console
# Navigate to: costplusdb-backups-prod/pgbackrest/backup/main/
# You should see timestamped backup folders

# 6.4 - Check local pgBackRest logs
sudo tail -100 /var/log/pgbackrest/main-backup.log
# Review for any warnings or errors
```

**✅ Checkpoint 6:** First full backup completed successfully?

**Backup completed?** Record the backup label and size in your documentation.

### Step 7: Test Backup Restoration

**Why:** CRITICAL - Backups are useless if you can't restore them. Test NOW.

**⚠️ Warning:** This test creates a temporary PostgreSQL instance. Don't skip this step!

```bash
# 7.1 - Stop PostgreSQL (we'll restore to test directory)
sudo systemctl stop postgresql

# 7.2 - Create test restore directory
sudo mkdir -p /var/lib/postgresql/restore-test
sudo chown postgres:postgres /var/lib/postgresql/restore-test

# 7.3 - Restore backup to test directory
sudo -u postgres pgbackrest --stanza=main --delta \
  --pg1-path=/var/lib/postgresql/restore-test restore

# This will take 5-30 minutes
# Expected output at end:
# P00   INFO: restore command end: completed successfully

# 7.4 - Verify restored files
sudo ls -la /var/lib/postgresql/restore-test/
# Should show PostgreSQL data directory files: base/, global/, pg_wal/, etc.

# 7.5 - Check restore log
sudo tail -100 /var/log/pgbackrest/main-restore.log

# 7.6 - Clean up test restore
sudo rm -rf /var/lib/postgresql/restore-test

# 7.7 - Start PostgreSQL again
sudo systemctl start postgresql

# 7.8 - Verify PostgreSQL is running
sudo systemctl status postgresql
```

**✅ Checkpoint 7:** Backup restoration test successful?
**❌ If restoration failed:**
- Check pgBackRest logs: `/var/log/pgbackrest/main-restore.log`
- Verify backup exists: `sudo -u postgres pgbackrest --stanza=main info`
- Check Wasabi connectivity
- Contact support if needed (save error messages)

### Step 8: Schedule Automated Backups

**Why:** Manual backups are forgotten. Automate everything.

**Backup Strategy:**
- Full backup: Weekly (Sunday 2 AM)
- Differential backup: Daily (2 AM)
- Keep: 4 full backups, 4 differential backups per full
- WAL archiving: Continuous (automatic)

```bash
# 8.1 - Create backup script
sudo vim /opt/costplusdb/scripts/pgbackrest-backup.sh

# 8.2 - Add this content:
```

```bash
#!/bin/bash
# pgBackRest Automated Backup Script

# Configuration
STANZA="main"
LOG_FILE="/opt/costplusdb/logs/backup-scheduler.log"
ALERT_EMAIL="your-email@example.com"  # Replace with your email

# Create log directory
mkdir -p /opt/costplusdb/logs

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to send alert
send_alert() {
    local subject="$1"
    local message="$2"
    echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
}

# Determine backup type based on day of week
DAY_OF_WEEK=$(date +%u)  # 1 = Monday, 7 = Sunday

if [ "$DAY_OF_WEEK" -eq 7 ]; then
    BACKUP_TYPE="full"
    log "Starting FULL backup"
else
    BACKUP_TYPE="diff"
    log "Starting DIFFERENTIAL backup"
fi

# Run backup
if sudo -u postgres pgbackrest --stanza="$STANZA" --type="$BACKUP_TYPE" backup; then
    log "SUCCESS: $BACKUP_TYPE backup completed"

    # Get backup info
    BACKUP_INFO=$(sudo -u postgres pgbackrest --stanza="$STANZA" info)
    log "$BACKUP_INFO"
else
    log "ERROR: $BACKUP_TYPE backup failed"
    send_alert "CostPlusDB Backup FAILED" "Backup type: $BACKUP_TYPE\nTime: $(date)\nCheck logs: /var/log/pgbackrest/"
    exit 1
fi

# Check disk space
DISK_USAGE=$(df -h /var/lib/postgresql | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
    log "WARNING: Disk usage at ${DISK_USAGE}%"
    send_alert "CostPlusDB Disk Space Warning" "Disk usage: ${DISK_USAGE}%\nConsider cleanup or expansion"
fi

log "Backup script completed"
exit 0
```

```bash
# 8.3 - Save and make executable
sudo chmod +x /opt/costplusdb/scripts/pgbackrest-backup.sh
sudo chown postgres:postgres /opt/costplusdb/scripts/pgbackrest-backup.sh

# 8.4 - Test the script manually
sudo -u postgres /opt/costplusdb/scripts/pgbackrest-backup.sh

# Check output
cat /opt/costplusdb/logs/backup-scheduler.log

# 8.5 - Install mail utility (for email alerts)
sudo apt install -y mailutils

# 8.6 - Configure mail (optional - or use external service later)
# For now, skip email configuration - you'll see logs

# 8.7 - Schedule backups via cron (as postgres user)
sudo -u postgres crontab -e

# Add these lines:
# Daily differential backup at 2 AM
0 2 * * * /opt/costplusdb/scripts/pgbackrest-backup.sh

# Weekly backup verification at 3 AM Sunday
0 3 * * 0 /opt/costplusdb/scripts/pgbackrest-verify.sh

# 8.8 - Verify cron job
sudo -u postgres crontab -l
```

**✅ Checkpoint 8:** Backup script created and scheduled?

### Step 9: Create Backup Verification Script

**Why:** Backups can silently fail. Regular verification catches problems early.

```bash
# 9.1 - Create verification script
sudo vim /opt/costplusdb/scripts/pgbackrest-verify.sh

# 9.2 - Add this content:
```

```bash
#!/bin/bash
# pgBackRest Backup Verification Script
# Runs weekly to verify backups are restorable

# Configuration
STANZA="main"
TEST_DIR="/var/lib/postgresql/backup-verify-test"
LOG_FILE="/opt/costplusdb/logs/backup-verification.log"
ALERT_EMAIL="your-email@example.com"

# Function to log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to send alert
send_alert() {
    local subject="$1"
    local message="$2"
    echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
}

log "=== Starting Backup Verification ==="

# Step 1: Check backup info
log "Checking backup repository..."
if ! sudo -u postgres pgbackrest --stanza="$STANZA" info > /tmp/backup-info.txt 2>&1; then
    log "ERROR: Cannot access backup repository"
    send_alert "CostPlusDB Backup Verification FAILED" "Cannot access backup repository. Check Wasabi connectivity."
    exit 1
fi

BACKUP_COUNT=$(grep -c "full backup:" /tmp/backup-info.txt)
log "Found $BACKUP_COUNT full backup(s)"

if [ "$BACKUP_COUNT" -eq 0 ]; then
    log "ERROR: No backups found!"
    send_alert "CostPlusDB Backup Verification FAILED" "No backups found in repository!"
    exit 1
fi

# Step 2: Get latest backup info
LATEST_BACKUP=$(sudo -u postgres pgbackrest --stanza="$STANZA" info | grep "full backup:" | tail -1 | awk '{print $3}')
log "Latest backup: $LATEST_BACKUP"

# Step 3: Test restore to temporary directory
log "Testing restore to $TEST_DIR..."
sudo rm -rf "$TEST_DIR"
sudo mkdir -p "$TEST_DIR"
sudo chown postgres:postgres "$TEST_DIR"

if sudo -u postgres pgbackrest --stanza="$STANZA" --delta --pg1-path="$TEST_DIR" restore; then
    log "SUCCESS: Backup restore test completed"
else
    log "ERROR: Backup restore test failed"
    send_alert "CostPlusDB Backup Verification FAILED" "Backup restore test failed. Check logs: /var/log/pgbackrest/"
    exit 1
fi

# Step 4: Verify restored files
log "Verifying restored files..."
REQUIRED_FILES=("PG_VERSION" "postgresql.conf" "base" "global")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -e "$TEST_DIR/$file" ]; then
        log "ERROR: Required file missing: $file"
        send_alert "CostPlusDB Backup Verification FAILED" "Restored backup is incomplete. Missing: $file"
        exit 1
    fi
done

log "All required files present"

# Step 5: Check backup age
BACKUP_AGE_HOURS=$(( ($(date +%s) - $(date -d "$(sudo -u postgres pgbackrest --stanza="$STANZA" info --output=json | jq -r '.[0].backup[0].timestamp.start')" +%s)) / 3600 ))
log "Latest backup age: $BACKUP_AGE_HOURS hours"

if [ "$BACKUP_AGE_HOURS" -gt 48 ]; then
    log "WARNING: Latest backup is over 48 hours old"
    send_alert "CostPlusDB Backup Age Warning" "Latest backup is $BACKUP_AGE_HOURS hours old. Check backup schedule."
fi

# Step 6: Clean up test directory
log "Cleaning up test restore..."
sudo rm -rf "$TEST_DIR"

log "=== Backup Verification Complete: SUCCESS ==="
exit 0
```

```bash
# 9.3 - Save and make executable
sudo chmod +x /opt/costplusdb/scripts/pgbackrest-verify.sh
sudo chown postgres:postgres /opt/costplusdb/scripts/pgbackrest-verify.sh

# 9.4 - Test the verification script
sudo -u postgres /opt/costplusdb/scripts/pgbackrest-verify.sh

# 9.5 - Check verification log
cat /opt/costplusdb/logs/backup-verification.log
```

**✅ Checkpoint 9:** Verification script works?

### Step 10: Create Backup Monitoring Dashboard

**Why:** Quick visual check of backup health.

```bash
# 10.1 - Create monitoring script
vim /opt/costplusdb/scripts/backup-status.sh

# 10.2 - Add this content:
```

```bash
#!/bin/bash
# Quick Backup Status Display

echo "======================================"
echo "  CostPlusDB Backup Status"
echo "======================================"
echo ""

# Backup repository status
echo "Repository Status:"
sudo -u postgres pgbackrest --stanza=main info

echo ""
echo "======================================"

# Recent backups
echo "Recent Backup Logs:"
echo ""
echo "Last Full Backup:"
grep "full backup size" /var/log/pgbackrest/main-backup.log | tail -1
echo ""
echo "Last Differential Backup:"
grep "diff backup size" /var/log/pgbackrest/main-backup.log | tail -1

echo ""
echo "======================================"

# Disk usage
echo "Storage Usage:"
echo ""
echo "PostgreSQL Data:"
du -sh /var/lib/postgresql/16/main
echo ""
echo "Backup Disk Usage:"
df -h /var/lib/postgresql | grep -v Filesystem

echo ""
echo "======================================"

# WAL archive status
echo "WAL Archive Status:"
sudo -u postgres psql -c "SELECT archived_count, failed_count, last_archived_wal, last_archived_time FROM pg_stat_archiver;"

echo ""
echo "======================================"

# Recent backup verification
if [ -f /opt/costplusdb/logs/backup-verification.log ]; then
    echo "Last Verification:"
    tail -3 /opt/costplusdb/logs/backup-verification.log
else
    echo "No verification logs found yet"
fi

echo ""
echo "======================================"
```

```bash
# 10.3 - Save and make executable
chmod +x /opt/costplusdb/scripts/backup-status.sh

# 10.4 - Test it
/opt/costplusdb/scripts/backup-status.sh

# 10.5 - Create alias for easy access
echo "alias backup-status='/opt/costplusdb/scripts/backup-status.sh'" >> ~/.bashrc
source ~/.bashrc

# Now you can just run: backup-status
```

**✅ Checkpoint 10:** Backup status dashboard works?

### Step 11: Document Backup Configuration

```bash
# 11.1 - Create backup documentation
vim ~/costplusdb/BACKUP-CONFIG.md

# 11.2 - Add this template:
```

```markdown
# Backup Configuration - CostPlusDB

## Backup System
- Tool: pgBackRest 2.x
- Storage: Wasabi S3 (costplusdb-backups-prod)
- Encryption: AES-256-CBC
- Compression: zstd (level 3)

## Schedule
- Full backup: Sunday 2:00 AM CT
- Differential backup: Daily 2:00 AM CT
- WAL archiving: Continuous
- Verification: Sunday 3:00 AM CT

## Retention
- Full backups: 4 weeks
- Differential backups: 4 per full backup
- WAL archives: Automatic with backups

## Credentials
- Wasabi Access Key: Stored in password manager
- Wasabi Secret Key: Stored in password manager
- Encryption Key: Stored in password manager as "pgBackRest-encryption-key"

## Important Files
- Config: /etc/pgbackrest.conf
- Backup script: /opt/costplusdb/scripts/pgbackrest-backup.sh
- Verify script: /opt/costplusdb/scripts/pgbackrest-verify.sh
- Status script: /opt/costplusdb/scripts/backup-status.sh
- Logs: /var/log/pgbackrest/

## Common Commands
\```bash
# Manual backup
sudo -u postgres pgbackrest --stanza=main --type=full backup

# Check backup status
sudo -u postgres pgbackrest --stanza=main info

# Restore (DANGEROUS - test first!)
sudo -u postgres pgbackrest --stanza=main --delta restore

# View backup status dashboard
backup-status
\```

## Recovery Procedures
See SOP-204: Backup Restoration Procedure

## Notes
- First backup: (date)
- Last verified: (date)
```

```bash
# 11.3 - Save file

# 11.4 - Update VPS inventory
echo "- Backups: Configured (see BACKUP-CONFIG.md)" >> ~/costplusdb/VPS-INVENTORY.md
```

**✅ Checkpoint 11:** Documentation complete?

### Completion Checklist

Before marking SOP-003 complete, verify:

- [ ] Wasabi account created and bucket configured
- [ ] pgBackRest installed
- [ ] Configuration file created with correct credentials
- [ ] PostgreSQL configured for WAL archiving
- [ ] Stanza created successfully
- [ ] First full backup completed
- [ ] Backup restoration test successful
- [ ] Automated backup script created and scheduled
- [ ] Verification script created and scheduled
- [ ] Monitoring dashboard script created
- [ ] Backup configuration documented
- [ ] All credentials saved in password manager
- [ ] Backup status shows "ok" in dashboard

### 🎉 SOP-003 Complete!

**Time to complete:** _____ minutes
**Issues encountered:** (document for future reference)
**Next SOP:** SOP-004: Monitoring Stack Deployment

<a name="sop-004"></a>

## SOP-004: Monitoring Stack Deployment

**Purpose:** Deploy and configure comprehensive 24/7 monitoring infrastructure
**When to use:** After backup system setup, before hosting any customer data
**Time required:** 120-180 minutes
**Frequency:** One-time per VPS (with ongoing maintenance)
**Risk Level:** HIGH - Monitoring failures = blind to customer issues

### Prerequisites
- [ ] SOP-003 completed (Backup system working)
- [ ] PostgreSQL 16 running and accessible
- [ ] Valid email address for alerts
- [ ] Credit card for monitoring services (most have free tiers)
- [ ] Access to phone for critical alert testing

### Safety Checklist
- [ ] No customers on this VPS yet (or maintenance window scheduled)
- [ ] You have 3 hours of uninterrupted time
- [ ] Backup snapshot exists (from SOP-003)
- [ ] You have password manager open

### Overview: The 5-Tool Monitoring Stack

**Why 5 different tools?** Each serves a specific purpose:

1. **Betterstack** - External uptime monitoring (is database reachable?)
2. **Healthchecks.io** - Cron job monitoring (are backups running?)
3. **Uptime Kuma** - Internal service dashboard (visual status overview)
4. **Grafana OnCall** - Alert routing & escalation (phone/email/Slack)
5. **Prometheus** - Metrics collection & graphing (performance trends)

**Total Monthly Cost:** $0-29 (all have free tiers that work for 1-5 customers)

---

### Step 1: Betterstack Uptime Monitoring

**Purpose:** External monitoring that alerts if database becomes unreachable from internet.

**1.1 - Create Betterstack Account:**

1. Go to https://betterstack.com/uptime
2. Click "Start Free Trial" (no credit card required)
3. Sign up with your email
4. Verify email address
5. Choose "Uptime Monitoring" product

**1.2 - Create PostgreSQL Monitor:**

1. In Betterstack dashboard, click "Create Monitor"
2. Monitor type: **TCP Port Check**
3. Configuration:
   - **Name:** `CostPlusDB-VPS-001-PostgreSQL`
   - **Host:** Your VPS IP address
   - **Port:** 5432
   - **Check frequency:** Every 1 minute (free tier allows 30 sec)
   - **Regions:** Select 2-3 regions (US-East, US-West, Europe)
   - **Expected response:** Port open
   - **Timeout:** 10 seconds

4. Click "Create Monitor"

**1.3 - Configure Alert Policy:**

1. Go to "Policies" in Betterstack
2. Create new policy: "Critical Database Down"
3. Settings:
   - **Trigger after:** 2 failed checks (2 minutes down)
   - **Alert channels:** Email (add your email)
   - **Escalation:** After 5 minutes, send SMS (if configured)
   - **On-call schedule:** 24/7

4. Assign this policy to your PostgreSQL monitor

**1.4 - Test the Monitor:**

```bash
# Test 1: Verify monitor shows "UP"
# Check Betterstack dashboard - should show green status

# Test 2: Simulate downtime
sudo systemctl stop postgresql

# Wait 3 minutes
# Check your email - should receive alert

# Test 3: Restore service
sudo systemctl start postgresql

# Check email - should receive recovery notification
```

**1.5 - Add to Dashboard:**

1. Create Betterstack status page (optional): https://statuspage.betterstack.com
2. Add monitor to public status page
3. Save status page URL for customer communications

**✅ Checkpoint 1:** Betterstack monitoring active and tested?

**Save credentials:**
- Login: your-email@example.com
- Password: (save in password manager as "Betterstack-CostPlusDB")
- Status page URL: (save in notes)

---

### Step 2: Healthchecks.io (Dead Man's Switch)

**Purpose:** Ensure cron jobs (backups, health checks) are running on schedule.

**2.1 - Create Healthchecks.io Account:**

1. Go to https://healthchecks.io
2. Click "Sign Up" (free tier: 20 checks)
3. Verify email
4. Log in to dashboard

**2.2 - Create Backup Check:**

1. Click "Add Check"
2. Configuration:
   - **Name:** `CostPlusDB Backup (Full)`
   - **Schedule:** Once per week (Sunday 2:00 AM)
   - **Grace time:** 30 minutes
   - **Description:** Weekly full backup via pgBackRest

3. Click "Save"
4. Copy the **Ping URL** (looks like: `https://hc-ping.com/xxxxxxxxxx`)

**2.3 - Create Daily Differential Backup Check:**

1. Click "Add Check"
2. Configuration:
   - **Name:** `CostPlusDB Backup (Differential)`
   - **Schedule:** Daily at 2:00 AM
   - **Grace time:** 30 minutes

3. Save and copy Ping URL

**2.4 - Create Health Check Monitor:**

1. Click "Add Check"
2. Configuration:
   - **Name:** `CostPlusDB Health Check`
   - **Schedule:** Every 5 minutes
   - **Grace time:** 10 minutes

3. Save and copy Ping URL

**2.5 - Integrate with Backup Scripts:**

Edit backup script to ping Healthchecks.io:

```bash
sudo vim /opt/costplusdb/scripts/pgbackrest-backup.sh
```

Add after successful backup (around line 1789):

```bash
# Healthchecks.io ping (success)
HEALTHCHECK_URL="https://hc-ping.com/YOUR-BACKUP-CHECK-UUID"

if [ "$BACKUP_TYPE" = "full" ]; then
    # Ping full backup check
    curl -fsS -m 10 --retry 5 "$HEALTHCHECK_URL" > /dev/null
else
    # Ping differential backup check
    DIFF_URL="https://hc-ping.com/YOUR-DIFF-BACKUP-CHECK-UUID"
    curl -fsS -m 10 --retry 5 "$DIFF_URL" > /dev/null
fi
```

Add before `exit 1` on failure (around line 1797):

```bash
# Healthchecks.io ping (failure)
curl -fsS -m 10 --retry 5 "$HEALTHCHECK_URL/fail" > /dev/null
```

**2.6 - Integrate with Health Check Script:**

Edit health check script:

```bash
sudo vim /opt/costplusdb/scripts/pg-health-check.sh
```

Add at the end (after line 1032):

```bash
# Healthchecks.io ping
HEALTH_CHECK_URL="https://hc-ping.com/YOUR-HEALTH-CHECK-UUID"
curl -fsS -m 10 --retry 3 "$HEALTH_CHECK_URL" > /dev/null
```

**2.7 - Test Healthchecks.io:**

```bash
# Test backup monitoring
sudo -u postgres /opt/costplusdb/scripts/pgbackrest-backup.sh

# Check Healthchecks.io dashboard - should show green checkmark

# Test health check monitoring
/opt/costplusdb/scripts/pg-health-check.sh

# Verify ping received in Healthchecks.io dashboard
```

**2.8 - Configure Alerts:**

1. In Healthchecks.io, go to "Integrations"
2. Add Email integration (your email)
3. Test integration - send test alert
4. Verify email received

**✅ Checkpoint 2:** Healthchecks.io monitoring backup/health check jobs?

---

### Step 3: Uptime Kuma (Self-Hosted Dashboard)

**Purpose:** Visual dashboard for all service statuses (PostgreSQL, pgBouncer, disk space, etc.)

**3.1 - Install Uptime Kuma:**

```bash
# 3.1.1 - Install Node.js (required)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3.1.2 - Verify Node.js installed
node --version
npm --version

# 3.1.3 - Create directory for Uptime Kuma
sudo mkdir -p /opt/uptime-kuma
sudo chown admin:admin /opt/uptime-kuma

# 3.1.4 - Clone Uptime Kuma
cd /opt/uptime-kuma
git clone https://github.com/louislam/uptime-kuma.git .

# 3.1.5 - Install dependencies (takes 5-10 minutes)
npm ci --production

# 3.1.6 - Build the application
npm run build
```

**3.2 - Configure Uptime Kuma as Service:**

```bash
# 3.2.1 - Create systemd service file
sudo vim /etc/systemd/system/uptime-kuma.service
```

Add this content:

```ini
[Unit]
Description=Uptime Kuma Service Monitoring Dashboard
After=network.target

[Service]
Type=simple
User=admin
WorkingDirectory=/opt/uptime-kuma
ExecStart=/usr/bin/node server/server.js
Restart=always
RestartSec=10

Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
```

```bash
# 3.2.2 - Save and reload systemd
sudo systemctl daemon-reload

# 3.2.3 - Start Uptime Kuma
sudo systemctl start uptime-kuma

# 3.2.4 - Enable on boot
sudo systemctl enable uptime-kuma

# 3.2.5 - Check status
sudo systemctl status uptime-kuma
# Should show: "active (running)"
```

**3.3 - Configure Firewall for Dashboard:**

```bash
# Allow port 3001 for Uptime Kuma dashboard
sudo ufw allow 3001/tcp comment 'Uptime Kuma'

# Verify
sudo ufw status
```

**3.4 - Access Dashboard & Initial Setup:**

1. Open browser: `http://YOUR-VPS-IP:3001`
2. First-time setup:
   - Create admin username: `admin`
   - Create strong password (save in password manager: "Uptime-Kuma-Admin")
3. Click "Create"

**3.5 - Add Monitors:**

**Monitor 1: PostgreSQL (TCP)**
1. Click "Add New Monitor"
2. Settings:
   - Monitor Type: **TCP Port**
   - Friendly Name: `PostgreSQL-5432`
   - Hostname: `localhost`
   - Port: `5432`
   - Heartbeat Interval: 60 seconds
   - Retries: 3
3. Click "Save"

**Monitor 2: pgBouncer (TCP)**
1. Add New Monitor
2. Settings:
   - Monitor Type: **TCP Port**
   - Friendly Name: `pgBouncer-6432`
   - Hostname: `localhost`
   - Port: `6432`
   - Heartbeat Interval: 60 seconds
3. Click "Save"

**Monitor 3: Disk Space**
1. Add New Monitor
2. Settings:
   - Monitor Type: **HTTP(s)**
   - Friendly Name: `Disk-Space-Check`
   - URL: Script that returns disk usage JSON
   - Method: GET
   - Heartbeat Interval: 300 seconds (5 min)
   - Expected Status Code: 200
3. Click "Save"

**Monitor 4: Database Connections**
1. Add New Monitor
2. Settings:
   - Monitor Type: **HTTP(s)**
   - Friendly Name: `DB-Connection-Count`
   - URL: Script that returns connection count
   - Heartbeat Interval: 60 seconds
3. Click "Save"

**3.6 - Configure Notifications:**

1. Go to Settings → Notifications
2. Add Email notification:
   - Type: SMTP Email
   - SMTP Host: (your email provider)
   - SMTP Port: 587
   - From Address: monitoring@yourdomain.com
   - To Address: your-email@example.com
3. Save and test

**3.7 - Create Status Page:**

1. Go to "Status Pages"
2. Click "Create New Status Page"
3. Settings:
   - Title: `CostPlusDB System Status`
   - Description: `Real-time status of CostPlusDB infrastructure`
   - Add all monitors to the page
4. Save and get public URL

**✅ Checkpoint 3:** Uptime Kuma dashboard accessible and monitoring services?

---

### Step 4: Prometheus (Metrics Collection)

**Purpose:** Collect and graph PostgreSQL performance metrics over time.

**4.1 - Install Prometheus:**

```bash
# 4.1.1 - Create prometheus user
sudo useradd --no-create-home --shell /bin/false prometheus

# 4.1.2 - Download Prometheus
cd /tmp
PROM_VERSION="2.45.0"
wget https://github.com/prometheus/prometheus/releases/download/v${PROM_VERSION}/prometheus-${PROM_VERSION}.linux-amd64.tar.gz

# 4.1.3 - Extract
tar xzf prometheus-${PROM_VERSION}.linux-amd64.tar.gz
cd prometheus-${PROM_VERSION}.linux-amd64

# 4.1.4 - Copy binaries
sudo cp prometheus /usr/local/bin/
sudo cp promtool /usr/local/bin/
sudo chown prometheus:prometheus /usr/local/bin/prometheus
sudo chown prometheus:prometheus /usr/local/bin/promtool

# 4.1.5 - Create directories
sudo mkdir -p /etc/prometheus
sudo mkdir -p /var/lib/prometheus
sudo chown prometheus:prometheus /etc/prometheus
sudo chown prometheus:prometheus /var/lib/prometheus

# 4.1.6 - Copy console files
sudo cp -r consoles /etc/prometheus
sudo cp -r console_libraries /etc/prometheus
sudo chown -R prometheus:prometheus /etc/prometheus
```

**4.2 - Install PostgreSQL Exporter:**

```bash
# 4.2.1 - Download postgres_exporter
cd /tmp
EXPORTER_VERSION="0.13.2"
wget https://github.com/prometheus-community/postgres_exporter/releases/download/v${EXPORTER_VERSION}/postgres_exporter-${EXPORTER_VERSION}.linux-amd64.tar.gz

# 4.2.2 - Extract and install
tar xzf postgres_exporter-${EXPORTER_VERSION}.linux-amd64.tar.gz
cd postgres_exporter-${EXPORTER_VERSION}.linux-amd64
sudo cp postgres_exporter /usr/local/bin/
sudo chown prometheus:prometheus /usr/local/bin/postgres_exporter
```

**4.3 - Configure PostgreSQL Exporter:**

```bash
# 4.3.1 - Create monitoring user in PostgreSQL
sudo -u postgres psql << EOF
CREATE USER prometheus_exporter WITH PASSWORD 'STRONG_PASSWORD_HERE';
GRANT pg_monitor TO prometheus_exporter;
GRANT CONNECT ON DATABASE postgres TO prometheus_exporter;
EOF

# Save password in password manager as "Prometheus-PostgreSQL-Exporter"

# 4.3.2 - Create connection string file
sudo mkdir -p /etc/postgres_exporter
sudo vim /etc/postgres_exporter/postgres_exporter.env
```

Add:

```bash
DATA_SOURCE_NAME="postgresql://prometheus_exporter:STRONG_PASSWORD_HERE@localhost:5432/postgres?sslmode=require"
```

```bash
# 4.3.3 - Set permissions
sudo chown prometheus:prometheus /etc/postgres_exporter/postgres_exporter.env
sudo chmod 600 /etc/postgres_exporter/postgres_exporter.env
```

**4.4 - Create Systemd Services:**

**PostgreSQL Exporter Service:**

```bash
sudo vim /etc/systemd/system/postgres_exporter.service
```

Add:

```ini
[Unit]
Description=PostgreSQL Exporter for Prometheus
After=network.target

[Service]
Type=simple
User=prometheus
EnvironmentFile=/etc/postgres_exporter/postgres_exporter.env
ExecStart=/usr/local/bin/postgres_exporter
Restart=always

[Install]
WantedBy=multi-user.target
```

**Prometheus Service:**

```bash
sudo vim /etc/systemd/system/prometheus.service
```

Add:

```ini
[Unit]
Description=Prometheus Monitoring System
After=network.target

[Service]
Type=simple
User=prometheus
ExecStart=/usr/local/bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus/ \
  --web.console.templates=/etc/prometheus/consoles \
  --web.console.libraries=/etc/prometheus/console_libraries
Restart=always

[Install]
WantedBy=multi-user.target
```

**4.5 - Configure Prometheus:**

```bash
sudo vim /etc/prometheus/prometheus.yml
```

Add:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'postgresql'
    static_configs:
      - targets: ['localhost:9187']
        labels:
          instance: 'costplusdb-vps-001'
          customer: 'internal'

  - job_name: 'node_exporter'
    static_configs:
      - targets: ['localhost:9100']
```

```bash
# Set ownership
sudo chown prometheus:prometheus /etc/prometheus/prometheus.yml
```

**4.6 - Install Node Exporter (System Metrics):**

```bash
cd /tmp
NODE_EXPORTER_VERSION="1.6.1"
wget https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXPORTER_VERSION}/node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz

tar xzf node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz
cd node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64
sudo cp node_exporter /usr/local/bin/
sudo chown prometheus:prometheus /usr/local/bin/node_exporter
```

**Node Exporter Service:**

```bash
sudo vim /etc/systemd/system/node_exporter.service
```

Add:

```ini
[Unit]
Description=Node Exporter for Prometheus
After=network.target

[Service]
Type=simple
User=prometheus
ExecStart=/usr/local/bin/node_exporter
Restart=always

[Install]
WantedBy=multi-user.target
```

**4.7 - Start All Services:**

```bash
# Reload systemd
sudo systemctl daemon-reload

# Start and enable services
sudo systemctl start postgres_exporter
sudo systemctl enable postgres_exporter
sudo systemctl start node_exporter
sudo systemctl enable node_exporter
sudo systemctl start prometheus
sudo systemctl enable prometheus

# Verify all running
sudo systemctl status postgres_exporter
sudo systemctl status node_exporter
sudo systemctl status prometheus
```

**4.8 - Configure Firewall:**

```bash
# Prometheus dashboard
sudo ufw allow 9090/tcp comment 'Prometheus'

# PostgreSQL exporter
sudo ufw allow 9187/tcp comment 'PostgreSQL Exporter'

# Node exporter
sudo ufw allow 9100/tcp comment 'Node Exporter'
```

**4.9 - Verify Metrics Collection:**

```bash
# Test PostgreSQL exporter
curl http://localhost:9187/metrics | grep pg_up
# Should show: pg_up 1

# Test Node exporter
curl http://localhost:9100/metrics | grep node_cpu
# Should show CPU metrics

# Access Prometheus dashboard
# Open browser: http://YOUR-VPS-IP:9090
```

**4.10 - Create Basic Queries:**

In Prometheus dashboard (http://YOUR-VPS-IP:9090):

1. **Database connections:**
   ```
   pg_stat_database_numbackends{datname="postgres"}
   ```

2. **Query rate:**
   ```
   rate(pg_stat_database_xact_commit{datname="postgres"}[5m])
   ```

3. **Disk usage:**
   ```
   node_filesystem_avail_bytes{mountpoint="/"}
   ```

4. **CPU usage:**
   ```
   100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
   ```

**✅ Checkpoint 4:** Prometheus collecting PostgreSQL and system metrics?

---

### Step 5: Grafana OnCall (Alert Routing)

**Purpose:** Centralized alert routing with phone/SMS escalation for critical issues.

**5.1 - Create Grafana Cloud Account:**

1. Go to https://grafana.com/products/cloud/
2. Click "Sign Up for Free"
3. Choose "Grafana Cloud Free" plan
4. Create account and verify email

**5.2 - Enable OnCall:**

1. Log into Grafana Cloud
2. Go to "Apps" → "OnCall"
3. Click "Enable OnCall"
4. Wait for provisioning (1-2 minutes)

**5.3 - Create Integration with Prometheus:**

1. In OnCall, go to "Integrations"
2. Click "Add Integration"
3. Choose "Webhook"
4. Name: `CostPlusDB Prometheus`
5. Copy the webhook URL
6. Save

**5.4 - Configure Prometheus Alertmanager:**

```bash
# Install Alertmanager
cd /tmp
ALERTMANAGER_VERSION="0.26.0"
wget https://github.com/prometheus/alertmanager/releases/download/v${ALERTMANAGER_VERSION}/alertmanager-${ALERTMANAGER_VERSION}.linux-amd64.tar.gz

tar xzf alertmanager-${ALERTMANAGER_VERSION}.linux-amd64.tar.gz
cd alertmanager-${ALERTMANAGER_VERSION}.linux-amd64

sudo cp alertmanager /usr/local/bin/
sudo cp amtool /usr/local/bin/
sudo chown prometheus:prometheus /usr/local/bin/alertmanager
sudo chown prometheus:prometheus /usr/local/bin/amtool

sudo mkdir -p /etc/alertmanager
sudo chown prometheus:prometheus /etc/alertmanager
```

**Create Alertmanager config:**

```bash
sudo vim /etc/alertmanager/alertmanager.yml
```

Add:

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'instance']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 4h
  receiver: 'grafana-oncall'

receivers:
  - name: 'grafana-oncall'
    webhook_configs:
      - url: 'YOUR_GRAFANA_ONCALL_WEBHOOK_URL_HERE'
        send_resolved: true
```

```bash
sudo chown prometheus:prometheus /etc/alertmanager/alertmanager.yml
```

**Create Alertmanager service:**

```bash
sudo vim /etc/systemd/system/alertmanager.service
```

Add:

```ini
[Unit]
Description=Prometheus Alertmanager
After=network.target

[Service]
Type=simple
User=prometheus
ExecStart=/usr/local/bin/alertmanager \
  --config.file=/etc/alertmanager/alertmanager.yml \
  --storage.path=/var/lib/alertmanager
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Create storage directory
sudo mkdir -p /var/lib/alertmanager
sudo chown prometheus:prometheus /var/lib/alertmanager

# Start service
sudo systemctl daemon-reload
sudo systemctl start alertmanager
sudo systemctl enable alertmanager
sudo systemctl status alertmanager
```

**5.5 - Add Alert Rules to Prometheus:**

```bash
sudo vim /etc/prometheus/alert_rules.yml
```

Add:

```yaml
groups:
  - name: database_alerts
    interval: 30s
    rules:
      - alert: PostgreSQLDown
        expr: pg_up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL is down on {{ $labels.instance }}"
          description: "PostgreSQL has been down for more than 2 minutes"

      - alert: HighDatabaseConnections
        expr: pg_stat_database_numbackends > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connections on {{ $labels.instance }}"
          description: "Database has {{ $value }} connections (>80)"

      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 15
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space on {{ $labels.instance }}"
          description: "Disk space is below 15% ({{ $value }}%)"

      - alert: HighCPU
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ $value }}% (>85%)"

      - alert: BackupFailed
        expr: up{job="healthchecks"} == 0
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: "Backup check failed on {{ $labels.instance }}"
          description: "No backup ping received in the last hour"
```

Update prometheus.yml to include rules:

```bash
sudo vim /etc/prometheus/prometheus.yml
```

Add under `global:`:

```yaml
rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']
```

```bash
# Reload Prometheus
sudo systemctl reload prometheus

# Verify rules loaded
curl http://localhost:9090/api/v1/rules | jq
```

**5.6 - Configure OnCall Escalation:**

1. In Grafana OnCall dashboard, go to "Escalation Chains"
2. Create new chain: "Critical Database Issues"
3. Steps:
   - Step 1: Notify via email (immediately)
   - Step 2: Wait 5 minutes
   - Step 3: Call phone (if no acknowledgment)
   - Step 4: Wait 10 minutes
   - Step 5: Repeat

4. Add your contact methods:
   - Email: your-email@example.com
   - Phone: (add via Twilio or similar - requires setup)

**5.7 - Test Alert Flow:**

```bash
# Simulate PostgreSQL down
sudo systemctl stop postgresql

# Wait 3 minutes

# Check Grafana OnCall - should receive alert

# Restore service
sudo systemctl start postgresql

# Check for resolution notification
```

**✅ Checkpoint 5:** Grafana OnCall receiving and routing alerts?

---

### Step 6: Integration Testing

**Purpose:** Verify all monitoring tools work together.

**6.1 - Create Monitoring Status Script:**

```bash
vim /opt/costplusdb/scripts/monitoring-status.sh
```

Add:

```bash
#!/bin/bash
# Monitoring Stack Status Check

echo "=========================================="
echo "  CostPlusDB Monitoring Stack Status"
echo "=========================================="
echo ""

# Check Betterstack (external check)
echo "1. Betterstack Uptime Monitoring:"
echo "   → https://betterstack.com/uptime"
echo "   Status: Check dashboard manually"
echo ""

# Check Healthchecks.io
echo "2. Healthchecks.io (Dead Man's Switch):"
echo "   → https://healthchecks.io"
echo "   Status: Check dashboard manually"
echo ""

# Check Uptime Kuma
echo "3. Uptime Kuma:"
if systemctl is-active --quiet uptime-kuma; then
    echo "   Service: ✓ Running"
    echo "   Dashboard: http://$(hostname -I | awk '{print $1}'):3001"
else
    echo "   Service: ✗ Not running"
fi
echo ""

# Check Prometheus
echo "4. Prometheus:"
if systemctl is-active --quiet prometheus; then
    echo "   Service: ✓ Running"
    PROM_STATUS=$(curl -s http://localhost:9090/-/healthy)
    echo "   Health: $PROM_STATUS"
    echo "   Dashboard: http://$(hostname -I | awk '{print $1}'):9090"
else
    echo "   Service: ✗ Not running"
fi
echo ""

# Check PostgreSQL Exporter
echo "5. PostgreSQL Exporter:"
if systemctl is-active --quiet postgres_exporter; then
    echo "   Service: ✓ Running"
    EXPORTER_STATUS=$(curl -s http://localhost:9187/metrics | grep -c pg_up)
    echo "   Metrics available: $EXPORTER_STATUS lines"
else
    echo "   Service: ✗ Not running"
fi
echo ""

# Check Alertmanager
echo "6. Alertmanager:"
if systemctl is-active --quiet alertmanager; then
    echo "   Service: ✓ Running"
    echo "   Dashboard: http://$(hostname -I | awk '{print $1}'):9093"
else
    echo "   Service: ✗ Not running"
fi
echo ""

echo "7. Grafana OnCall:"
echo "   → https://grafana.com/products/cloud/oncall/"
echo "   Status: Check dashboard manually"
echo ""

echo "=========================================="
```

```bash
chmod +x /opt/costplusdb/scripts/monitoring-status.sh

# Create alias
echo "alias monitoring-status='/opt/costplusdb/scripts/monitoring-status.sh'" >> ~/.bashrc
source ~/.bashrc

# Run it
monitoring-status
```

**6.2 - Test Each Alert Path:**

**Test 1: PostgreSQL Down Alert**
```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Expected alerts (within 5 minutes):
# - Betterstack: Email alert (port 5432 unreachable)
# - Uptime Kuma: Dashboard shows red
# - Prometheus: Alert fires after 2 minutes
# - Grafana OnCall: Receives alert, sends email
# - Healthchecks.io: No ping received (after 10 min)

# Restore
sudo systemctl start postgresql

# Expected recovery notifications
```

**Test 2: Backup Failure Alert**
```bash
# Simulate backup failure (rename script temporarily)
sudo mv /opt/costplusdb/scripts/pgbackrest-backup.sh /opt/costplusdb/scripts/pgbackrest-backup.sh.disabled

# Wait for next scheduled backup time (or run cron manually)
# After 30 minutes grace period:
# - Healthchecks.io: Alert (no ping received)

# Restore
sudo mv /opt/costplusdb/scripts/pgbackrest-backup.sh.disabled /opt/costplusdb/scripts/pgbackrest-backup.sh
```

**Test 3: Disk Space Alert**
```bash
# Create large temporary file to simulate disk full
# (DO NOT DO THIS IN PRODUCTION)
# sudo dd if=/dev/zero of=/tmp/bigfile bs=1M count=50000

# Wait 10 minutes
# Expected: Prometheus disk space alert → Grafana OnCall

# Clean up
# sudo rm /tmp/bigfile
```

**6.3 - Document Alert Response Times:**

Create log of test results:

```bash
vim ~/costplusdb/MONITORING-TEST-RESULTS.md
```

Document:
- Time to detect (how long until alert fired)
- Time to notify (how long until you received notification)
- Recovery detection (did it detect when issue resolved?)
- False positives (any alerts that shouldn't have fired?)

**✅ Checkpoint 6:** All monitoring tools tested and working?

---

### Step 7: Documentation & Maintenance

**7.1 - Create Monitoring Documentation:**

```bash
vim ~/costplusdb/MONITORING-CONFIG.md
```

Add:

```markdown
# Monitoring Stack Configuration - CostPlusDB

## Overview
5-tool monitoring stack providing 24/7 coverage for database infrastructure.

## Tools & Access

### 1. Betterstack (External Uptime)
- Dashboard: https://betterstack.com/uptime
- Login: your-email@example.com
- Password: (in password manager: "Betterstack-CostPlusDB")
- Monitors: PostgreSQL TCP port 5432
- Check frequency: Every 1 minute
- Alert threshold: 2 failed checks (2 minutes down)

### 2. Healthchecks.io (Cron Monitoring)
- Dashboard: https://healthchecks.io
- Login: your-email@example.com
- Password: (in password manager: "Healthchecks-CostPlusDB")
- Monitors:
  - Full backup (weekly Sunday 2 AM)
  - Differential backup (daily 2 AM)
  - Health check (every 5 minutes)

### 3. Uptime Kuma (Internal Dashboard)
- Dashboard: http://YOUR-VPS-IP:3001
- Login: admin
- Password: (in password manager: "Uptime-Kuma-Admin")
- Monitors: PostgreSQL, pgBouncer, disk space, connections

### 4. Prometheus (Metrics)
- Dashboard: http://YOUR-VPS-IP:9090
- No authentication (internal only)
- Scrapes: PostgreSQL exporter, Node exporter
- Alert rules: /etc/prometheus/alert_rules.yml

### 5. Grafana OnCall (Alert Routing)
- Dashboard: https://YOUR-ORG.grafana.net/a/grafana-oncall-app
- Login: your-email@example.com
- Password: (in password manager: "Grafana-Cloud")
- Escalation chain: Critical Database Issues

## Alert Flow

```
Issue Detected
    ↓
[Prometheus detects via metrics]
    ↓
[Fires alert to Alertmanager]
    ↓
[Alertmanager routes to Grafana OnCall]
    ↓
[OnCall escalates per policy]
    ↓
1. Email (immediate)
2. Wait 5 min
3. Phone call (if not acknowledged)
4. Repeat every 10 min
```

## Maintenance Schedule

- **Daily:** Review Uptime Kuma dashboard
- **Weekly:** Check Healthchecks.io for missed pings
- **Monthly:** Review Prometheus metrics for trends
- **Quarterly:** Test full alert escalation chain

## Common Commands

```bash
# Check all monitoring services
monitoring-status

# View Prometheus metrics
curl http://localhost:9187/metrics | grep pg_up

# Check Alertmanager status
curl http://localhost:9093/api/v1/status

# Restart services
sudo systemctl restart prometheus
sudo systemctl restart postgres_exporter
sudo systemctl restart uptime-kuma
```

## Troubleshooting

**Issue:** Prometheus not collecting PostgreSQL metrics
- Check postgres_exporter: `sudo systemctl status postgres_exporter`
- Verify connection string: `sudo cat /etc/postgres_exporter/postgres_exporter.env`
- Test manually: `curl http://localhost:9187/metrics`

**Issue:** Healthchecks.io not receiving pings
- Check backup script has curl commands
- Verify URL is correct in script
- Test ping manually: `curl https://hc-ping.com/YOUR-UUID`

**Issue:** Uptime Kuma shows all services down
- Check if Uptime Kuma service is running
- Verify monitors are configured with correct targets
- Check firewall isn't blocking internal connections

## Notes
- All monitoring tools have free tiers sufficient for 1-5 customers
- Total cost: $0-29/month depending on features used
- Phone alerts require Twilio integration (additional cost)
```

**7.2 - Update VPS Inventory:**

```bash
echo "" >> ~/costplusdb/VPS-INVENTORY.md
echo "## Monitoring Configuration" >> ~/costplusdb/VPS-INVENTORY.md
echo "- Monitoring Stack: Deployed (see MONITORING-CONFIG.md)" >> ~/costplusdb/VPS-INVENTORY.md
echo "- Betterstack: Active" >> ~/costplusdb/VPS-INVENTORY.md
echo "- Healthchecks.io: Active (3 checks)" >> ~/costplusdb/VPS-INVENTORY.md
echo "- Uptime Kuma: Running on port 3001" >> ~/costplusdb/VPS-INVENTORY.md
echo "- Prometheus: Running on port 9090" >> ~/costplusdb/VPS-INVENTORY.md
echo "- Grafana OnCall: Configured" >> ~/costplusdb/VPS-INVENTORY.md
```

**7.3 - Add to Health Check Routine:**

Add monitoring stack checks to morning routine (future SOP-101):

```bash
vim /opt/costplusdb/scripts/morning-health-check.sh
```

Include checks for:
- All 5 monitoring services running
- No critical alerts in last 24 hours
- Healthchecks.io shows all green
- Betterstack uptime percentage

---

### Completion Checklist

Before marking SOP-004 complete, verify:

- [ ] Betterstack account created and monitoring PostgreSQL
- [ ] Healthchecks.io monitoring backup and health check jobs
- [ ] Uptime Kuma installed and running as systemd service
- [ ] Prometheus collecting PostgreSQL and system metrics
- [ ] PostgreSQL exporter configured and scraping
- [ ] Node exporter installed for system metrics
- [ ] Alertmanager configured and routing alerts
- [ ] Grafana OnCall receiving and escalating alerts
- [ ] Alert rules created for critical conditions
- [ ] All monitoring tools tested with simulated failures
- [ ] Alert notification paths tested (email, phone)
- [ ] Recovery notifications tested
- [ ] Monitoring status script created
- [ ] Documentation complete (MONITORING-CONFIG.md)
- [ ] All credentials saved in password manager
- [ ] Firewall rules configured for monitoring services
- [ ] All monitoring services set to start on boot

---

### 🎉 SOP-004 Complete!

**Time to complete:** _____ minutes
**Issues encountered:** (document for future reference)
**Next SOP:** SOP-101: Morning Health Check Routine (or SOP-102: Customer Onboarding)

---

**Last Updated:** October 22, 2025
**Status:** SOP-001 through SOP-004 complete and production-ready

**Note:** Remaining SOPs (SOP-101, SOP-102, SOP-201, etc.) will be added based on operational priorities.
