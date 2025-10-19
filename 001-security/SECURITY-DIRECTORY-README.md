# CostPlusDB Security Directory

**Comprehensive Security Infrastructure for CostPlusDB**

This directory contains all security-related configurations, scripts, monitoring tools, incident response procedures, and compliance documentation for the CostPlusDB managed PostgreSQL service.

---

## 📁 Directory Structure

```
001-security/
├── config/              # Security configurations
│   ├── firewall/        # UFW firewall rules
│   ├── ssl/             # SSL/TLS certificates
│   ├── postgresql/      # PostgreSQL security configs
│   ├── fail2ban/        # Intrusion prevention
│   ├── pgbouncer/       # Connection pooler security
│   └── backup/          # Backup encryption configs
│
├── scripts/             # Operational scripts
│   ├── hardening/       # System hardening automation
│   ├── monitoring/      # Security monitoring scripts
│   ├── incident-response/ # Emergency response tools
│   ├── compliance/      # Compliance reporting
│   ├── provisioning/    # Secure database provisioning
│   └── maintenance/     # Security maintenance tasks
│
├── logs/                # Security logging (NOT committed to git)
│   ├── access/          # Access logs
│   ├── security-events/ # Security event logs
│   ├── audit/           # Audit trail logs
│   ├── backups/         # Backup operation logs
│   └── alerts/          # Alert notifications
│
├── alerts/              # Alert system
│   ├── rules/           # Alert rule definitions
│   ├── templates/       # Notification templates
│   │   ├── email-templates/
│   │   └── slack-templates/
│   └── scripts/         # Alert processing scripts
│
├── runbooks/            # Incident response procedures
│   └── 01-security-breach-response.md
│
├── compliance/          # Compliance & policy
│   ├── policies/        # Security policies
│   ├── agreements/      # Customer security agreements
│   ├── checklists/      # Compliance checklists
│   └── reports/         # Incident reports
│
├── keys/                # Cryptographic keys (NOT committed to git)
│   ├── backup-encryption/
│   ├── ssl-ca/
│   └── api-tokens/
│
├── scans/               # Security scanning results
│   ├── vulnerability-scans/
│   ├── port-scans/
│   ├── ssl-scans/
│   └── penetration-tests/
│
├── customer-security/   # Per-customer security
│   ├── templates/       # Security agreement templates
│   └── customers/       # Customer-specific configs (NOT committed)
│
├── tools/               # Security utilities
│   ├── password-generator/
│   ├── log-analyzers/
│   ├── encryption/
│   └── validators/
│
├── documentation/       # Security documentation
│   ├── architecture/    # Security architecture docs
│   ├── procedures/      # Operating procedures
│   ├── training/        # Security training materials
│   └── external/        # Customer-facing security docs
│
└── backups/             # Security configuration backups
    ├── daily/
    ├── weekly/
    └── monthly/
```

---

## 🚀 Quick Start

### Initial Setup

1. **Run system hardening:**
```bash
sudo ./scripts/hardening/01-initial-setup.sh
```

2. **Configure firewall:**
```bash
sudo ./config/firewall/ufw-rules.sh
```

3. **Generate SSL certificates:**
```bash
sudo ./config/ssl/generate-cert.sh
```

4. **Install fail2ban rules:**
```bash
sudo cp config/fail2ban/jail.local /etc/fail2ban/
sudo systemctl restart fail2ban
```

5. **Apply PostgreSQL security:**
```bash
# Add to postgresql.conf:
include = '/home/admincostplus/projects/costplusdb/001-security/config/postgresql/postgresql-security.conf'

# Copy pg_hba.conf template:
sudo cp config/postgresql/pg_hba.conf.template /etc/postgresql/16/main/pg_hba.conf
sudo systemctl reload postgresql
```

---

## 🔧 Common Operations

### Provision New Customer Database

```bash
sudo ./scripts/provisioning/create-customer-db.sh <customer_name> <tier>

# Example:
sudo ./scripts/provisioning/create-customer-db.sh acme-corp dedicated
```

### Monitor Failed Login Attempts

```bash
./scripts/monitoring/check-failed-logins.sh

# Set custom threshold:
./scripts/monitoring/check-failed-logins.sh 20
```

### Emergency Database Isolation

```bash
sudo ./scripts/incident-response/isolate-customer-db.sh <db_name> "<reason>"

# Example:
sudo ./scripts/incident-response/isolate-customer-db.sh acme_corp_db "Suspected breach"
```

### Generate Secure Password

```bash
./tools/password-generator/generate-secure-password.py

# Custom length:
./tools/password-generator/generate-secure-password.py 32

# Multiple passwords:
./tools/password-generator/generate-secure-password.py 25 --count 5
```

---

## 🚨 Emergency Procedures

### Security Breach Response

**If you detect a security incident:**

1. **Follow the runbook:**
   ```bash
   cat runbooks/01-security-breach-response.md
   ```

2. **Assess severity:** CRITICAL, HIGH, MEDIUM, or LOW

3. **Execute containment:**
   - CRITICAL: Immediate isolation
   - HIGH: Change passwords, block IPs
   - MEDIUM: Enhanced monitoring
   - LOW: Log and monitor

4. **Document everything:**
   - Create incident report in `compliance/reports/`
   - Log all actions in `logs/audit/`
   - Preserve evidence in `scans/penetration-tests/`

### Emergency Contacts

- **Security Team:** security@costplusdb.com
- **On-Call:** +1-XXX-XXX-XXXX
- **CTO:** cto@costplusdb.com

---

## 📊 Monitoring & Alerts

### Alert Rules

Alert configurations are defined in `alerts/rules/`:
- `failed-login-threshold.yaml` - Failed authentication monitoring
- More rules to be added...

### Log Locations

**Security logs are written to:**
- Access logs: `logs/access/`
- Security events: `logs/security-events/`
- Audit trail: `logs/audit/`
- Alerts: `logs/alerts/`

**PostgreSQL logs:**
- System logs: `/var/log/postgresql/`

### Setting Up Monitoring Cron Jobs

```bash
# Check failed logins every 5 minutes
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/admincostplus/projects/costplusdb/001-security/scripts/monitoring/check-failed-logins.sh") | crontab -
```

---

## 🔐 Security Best Practices

### Access Control

- **Keys directory:** `chmod 700`, owner-only access
- **Logs directory:** `chmod 750`, group-readable for auditing
- **Scripts:** `chmod 750`, executable by security team only
- **Configs:** `chmod 640`, readable but not writable

### Password Management

- **Minimum length:** 25 characters
- **Composition:** Uppercase, lowercase, digits, symbols
- **Storage:** Encrypted, restricted access
- **Rotation:** Every 90 days (or immediately if compromised)

### Audit Logging

All security-critical operations are logged to:
- `logs/audit/database-provisioning.log`
- `logs/audit/database-isolation.log`
- `logs/audit/firewall-changes.log`
- `logs/audit/ssl-certificates.log`

### Credential Storage

**NEVER commit these to git:**
- Database passwords
- API tokens
- SSL private keys
- Backup encryption keys
- Customer credentials

These are stored in `keys/` and protected by `.gitignore`.

---

## 📝 Compliance & Reporting

### Incident Reports

All security incidents are documented in:
```
compliance/reports/INC-YYYYMMDD-HHMMSS-report.md
```

### Security Policies

Located in `compliance/policies/`:
- Incident response policy
- Access control policy
- Data protection policy
- Backup and recovery policy

### Customer Security Agreements

Templates in `customer-security/templates/`
Executed agreements in `customer-security/customers/<customer>/`

---

## 🛠️ Tools & Utilities

### Password Generator

**Location:** `tools/password-generator/generate-secure-password.py`

**Features:**
- Cryptographically secure (uses `secrets` module)
- Customizable length (default: 25 chars)
- Entropy calculation
- Batch generation

### Log Analyzers

**Location:** `tools/log-analyzers/`

(To be implemented)

### Validators

**Location:** `tools/validators/`

(To be implemented)

---

## 🔄 Maintenance

### Regular Security Tasks

**Daily:**
- Review security logs
- Check failed login attempts
- Monitor alert notifications

**Weekly:**
- Review access logs
- Audit user permissions
- Update fail2ban rules if needed

**Monthly:**
- Security configuration review
- Vulnerability scanning
- Incident response drill
- Documentation updates

**Quarterly:**
- Password rotation for service accounts
- SSL certificate review
- Security policy review
- Penetration testing

### Backup Procedures

Security configurations should be backed up regularly:

```bash
# Manual backup
tar -czf security-backup-$(date +%Y%m%d).tar.gz \
  config/ \
  scripts/ \
  alerts/ \
  runbooks/ \
  compliance/ \
  documentation/

# Store in backups/ directory
mv security-backup-*.tar.gz backups/monthly/
```

---

## 📖 Documentation

### Internal Documentation

Located in `documentation/`:
- **architecture/** - Security architecture decisions
- **procedures/** - Standard operating procedures
- **training/** - Security training materials

### External Documentation

Located in `documentation/external/`:
- Customer-facing security information
- Security questionnaire responses
- Public security commitments

### Related Documentation

In main `000-docs/` directory:
- `015-DR-SOPS-security-implementation-masterplan.md` - Security master plan
- `005-DR-SOPS-postgresql-operations.md` - PostgreSQL operations including security

---

## 🔗 Integration Points

### With Main CostPlusDB System

**This security directory integrates with:**

1. **Customer Provisioning:**
   - Main script: `/scripts/provision-customer-database.sh`
   - Security script: `scripts/provisioning/create-customer-db.sh`

2. **Website:**
   - Security page: `/website/security.html`
   - Transparency: `/website/transparency/operations-manual.html`

3. **Documentation:**
   - SOPs: `/000-docs/005-DR-SOPS-postgresql-operations.md`
   - Security master plan: `/000-docs/015-DR-SOPS-security-implementation-masterplan.md`

### With External Systems

- **Fail2ban:** `/etc/fail2ban/jail.local`
- **PostgreSQL:** `/etc/postgresql/16/main/`
- **UFW:** System firewall
- **Cron:** Automated monitoring tasks

---

## ⚠️ Important Notes

### Git Commit Policy

**DO commit:**
- ✅ All scripts and tools
- ✅ Configuration templates
- ✅ Documentation
- ✅ Alert rules
- ✅ Runbooks
- ✅ Empty directory structures

**DO NOT commit:**
- ❌ Actual passwords or credentials
- ❌ Private SSL keys
- ❌ Customer-specific data
- ❌ Log files
- ❌ Backup encryption keys
- ❌ API tokens

See `.gitignore` for complete exclusion list.

### Permissions

After setup, verify permissions:

```bash
# Check ownership
ls -la 001-security/

# Expected:
# drwxr-x--- admincostplus:costplusdb 001-security/
# drwx------ admincostplus:costplusdb 001-security/keys/
# drwxr-x--- admincostplus:costplusdb 001-security/logs/
# drwxr-x--- admincostplus:costplusdb 001-security/scripts/
```

### Transparency Commitment

CostPlusDB is committed to security transparency:
- All security procedures are documented
- Scripts and configurations are version-controlled
- Incident response procedures are public
- Security architecture is clearly explained

**What we keep private:**
- Customer credentials
- Actual encryption keys
- Customer-specific security configurations
- Active vulnerability details

---

## 📚 Additional Resources

### Learning Resources

- PostgreSQL Security: https://www.postgresql.org/docs/current/security.html
- fail2ban Documentation: https://www.fail2ban.org/
- UFW Firewall Guide: https://help.ubuntu.com/community/UFW
- OWASP Security Guidelines: https://owasp.org/

### Support

- **Documentation:** `/000-docs/`
- **Issues:** GitHub Issues
- **Security:** security@costplusdb.com

---

## 📄 License

This security infrastructure is part of the CostPlusDB project.

**Copyright:** CostPlusDB
**Repository:** https://github.com/jeremylongshore/cost-plus-db

---

## 🔄 Version History

- **v1.0.0** (2025-10-19) - Initial security directory structure
  - Complete directory structure
  - Core scripts implemented
  - Incident response runbooks
  - Security monitoring tools
  - Customer provisioning with audit logging

---

**Last Updated:** 2025-10-19
**Maintained By:** CostPlusDB Security Team
**Next Review:** 2026-01-19 (Quarterly)
