# CostPlusDB Security Documentation

**Last Updated:** 2025-10-19
**Security Rating:** 75/100 (Good) - 5 critical items implemented

This folder contains all security-related documentation, audits, implementation guides, and procedures for CostPlusDB.

---

## Folder Structure

```
001-security/
├── README.md                    (this file)
├── audits/                      Security audit reports
│   └── 006-DR-SOPS-security-audit.md
├── implementation/              Implementation guides and procedures
│   └── 007-DR-SOPS-security-implementation-guide.md
├── procedures/                  Operational security procedures
│   ├── 008-DR-GUID-add-wasabi-s3-backups.md
│   ├── provision-customer-database.sh
│   └── deprovision-customer-database.sh
└── keys/                        Encryption keys and passphrases (NOT in git)
    └── .gitignore
```

---

## Quick Reference

### Current Security Status

| Security Control | Status | Details |
|-----------------|--------|---------|
| PostgreSQL SSL/TLS | ✅ Implemented | TLSv1.2+, proper certificates |
| fail2ban Protection | ✅ Implemented | Port 5433, 5 retries, 1hr ban |
| Customer DB Isolation | ✅ Implemented | Per-customer users + databases |
| Backup Encryption | ✅ Implemented | AES-256-CBC, pgBackRest |
| Connection Logging | ✅ Enabled | All connections logged |
| SSH Hardening | ✅ Implemented | Key-only, custom port, fail2ban |
| UFW Firewall | ✅ Configured | Minimal open ports |

### Critical Security Credentials

**Location on Server:**
- Encryption passphrase: `/root/pgbackrest-keys/encryption-passphrase.txt`
- Customer credentials: `/root/customer-credentials/`
- SSL certificates: `/var/lib/postgresql/18/main/ssl/`

⚠️ **NEVER commit these to git!**

---

## Security Documentation

### 1. Audits (`audits/`)

**006-DR-SOPS-security-audit.md**
- Complete security audit against industry standards
- Rating: 75/100 (Good)
- 18 controls implemented
- 12 improvements recommended
- Based on: [How To Secure A Linux Server](https://github.com/imthenachoman/How-To-Secure-A-Linux-Server)

### 2. Implementation Guides (`implementation/`)

**007-DR-SOPS-security-implementation-guide.md**
- Step-by-step implementation of 5 critical security items
- Complete with scripts, configs, and verification steps
- Time estimates for each task
- Ready-to-use code snippets

### 3. Operational Procedures (`procedures/`)

**008-DR-GUID-add-wasabi-s3-backups.md**
- Guide for adding Wasabi S3 cloud backups
- Upgrades from local-only to cloud storage
- Cost impact analysis
- Step-by-step configuration

**provision-customer-database.sh**
- Automated customer database provisioning
- Creates isolated database + user
- Generates secure credentials
- Adds SSL-required pg_hba entry

**deprovision-customer-database.sh**
- Safe customer database removal
- Terminates active connections
- Removes database, user, and pg_hba entry
- Archives credentials

---

## Security Model Overview

### Two-Tier Security Architecture

**1. Internal Security (Operator Access)**
- **Who:** Jeremy (CostPlusDB operator only)
- **Access:** SSH to VPS, root/sudo, OS-level management
- **Controls:** SSH key auth, custom port, fail2ban, UFW

**2. Customer Security (Database Access)**
- **Who:** Customers and their applications
- **Access:** PostgreSQL connections ONLY (port 5433)
- **Controls:** SSL/TLS enforced, scram-sha-256, database isolation

**Customers do NOT get:**
- ❌ SSH access to VPS
- ❌ OS-level access
- ❌ Access to other customers' databases

---

## Quick Commands

### Check Security Status

```bash
# PostgreSQL SSL status
sudo -u postgres psql -p 5433 -c "SHOW ssl; SHOW ssl_cert_file; SHOW ssl_min_protocol_version;"

# fail2ban status
sudo fail2ban-client status
sudo fail2ban-client status postgresql

# Backup status
sudo -u postgres pgbackrest --stanza=main info

# Customer databases
sudo -u postgres psql -p 5433 -c "\l"

# Active connections
sudo -u postgres psql -p 5433 -c "SELECT datname, usename, application_name, client_addr FROM pg_stat_activity WHERE datname NOT IN ('postgres', 'template0', 'template1');"
```

### Provision Customer

```bash
cd /home/admincostplus/projects/costplusdb/001-security/procedures
SUDO_PASS='TheCitadel2003' ./provision-customer-database.sh <customer_name>
```

### Run Backup

```bash
# Manual backup
sudo -u postgres pgbackrest --stanza=main --type=full backup

# Check backup status
sudo -u postgres pgbackrest --stanza=main info
```

### Test Customer Isolation

```bash
# List customer databases and owners
sudo -u postgres psql -p 5433 -c "SELECT datname, datdba::regrole AS owner FROM pg_database WHERE datname NOT IN ('postgres', 'template0', 'template1');"

# Check pg_hba.conf entries
sudo cat /etc/postgresql/18/main/pg_hba.conf | grep hostssl
```

---

## Security Standards Followed

CostPlusDB security is based on these industry-proven standards:

1. **[How To Secure A Linux Server](https://github.com/imthenachoman/How-To-Secure-A-Linux-Server)**
   - Comprehensive Linux hardening guide
   - CC-BY-SA License

2. **[Mozilla OpenSSH Guidelines](https://infosec.mozilla.org/guidelines/openssh)**
   - SSH configuration best practices

3. **[PostgreSQL Security Documentation](https://www.postgresql.org/docs/current/security.html)**
   - Official database security guidelines

4. **[CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks/)**
   - Industry-standard security configurations

---

## Incident Response

### P0: Database Down (Critical)
1. Automatic alert via Betterstack
2. Check PostgreSQL status: `sudo systemctl status postgresql`
3. Check logs: `sudo tail -100 /var/log/postgresql/postgresql-18-main.log`
4. Email customer within 5 minutes
5. Post-mortem report within 24 hours

### Security Incident
1. Isolate affected systems immediately
2. Email affected customers within 1 hour
3. Check fail2ban logs: `sudo fail2ban-client status postgresql`
4. Review connection logs: `sudo grep FATAL /var/log/postgresql/postgresql-18-main.log`
5. Detailed incident report to customers

### Reporting Security Issues

**Email:** jeremy@intentsolutions.io
**Subject:** "SECURITY: [brief description]"

**Response times:**
- Acknowledgment: 24 hours
- Assessment: 72 hours
- Fix: Critical issues within 7 days

---

## Before First Customer

### Pre-Launch Checklist

- [x] PostgreSQL SSL/TLS enforced
- [x] fail2ban for PostgreSQL configured
- [x] Per-customer database isolation tested
- [x] Backup encryption enabled
- [ ] Wasabi S3 cloud backups configured (local backups working)
- [ ] Test restoration from backup
- [ ] Document server IP address
- [ ] Set up monitoring alerts (Betterstack)
- [ ] Create first customer invoice template

### Test Customer Cleanup

Before going live, remove test customer:

```bash
sudo -u postgres psql -p 5433 -c "DROP DATABASE IF EXISTS testcustomer_db;"
sudo -u postgres psql -p 5433 -c "DROP USER IF EXISTS testcustomer_user;"
sudo sed -i '/testcustomer/d' /etc/postgresql/18/main/pg_hba.conf
sudo -u postgres psql -p 5433 -c "SELECT pg_reload_conf();"
```

---

## Maintenance Schedule

### Daily
- Automated backups (2 AM)
- Backup verification logs

### Weekly
- Review fail2ban logs
- Check disk space: `df -h /var/lib/pgbackrest`
- Security updates: `sudo apt-get update && sudo apt-get upgrade -y`

### Monthly
- Test backup restoration
- Review customer access logs
- Update security documentation
- Run security audit: `sudo lynis audit system`

---

## Future Security Improvements

Priority items from security audit:

**High Priority (Month 0-3):**
1. Wasabi S3 cloud backups
2. Automated backup restoration testing
3. Security incident playbooks
4. Betterstack monitoring setup

**Medium Priority (Month 3-6):**
1. Automated security updates
2. Log aggregation/SIEM
3. Rate limiting for connections
4. Customer-specific connection limits

**Low Priority (Month 6-12):**
1. Two-factor authentication for operator access
2. External penetration testing
3. SOC 2 compliance preparation
4. Automated vulnerability scanning

---

## Contact

**Security issues:** jeremy@intentsolutions.io
**Emergency:** Same (email, 4-hour SLA)

**GitHub:** https://github.com/jeremylongshore/cost-plus-db (private)

---

## Credits

Security practices based on open-source standards and guides from:
- [imthenachoman](https://github.com/imthenachoman) - Linux Server Security Guide
- [Mozilla](https://infosec.mozilla.org/) - OpenSSH Guidelines
- [PostgreSQL Global Development Group](https://www.postgresql.org/) - Database Security
- [CIS](https://www.cisecurity.org/) - Security Benchmarks

Standing on the shoulders of giants. 🙏
