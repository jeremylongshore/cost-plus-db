# Security Directory Structure and Architecture

**Document ID:** 017-DR-ARCH-security-directory-structure
**Category:** Architecture Documentation
**Owner:** Security Team
**Last Updated:** 2025-10-19
**Status:** Production Ready

---

## Overview

The `/001-security/` directory contains the complete security infrastructure for CostPlusDB, including configurations, scripts, tools, documentation, and monitoring systems. This document provides a comprehensive overview of the security directory architecture and usage.

**Location:** `/home/admincostplus/projects/costplusdb/001-security/`

---

## Directory Architecture

```
001-security/
├── alerts/                      # Alert management system
│   ├── rules/                   # Alert rule definitions (YAML)
│   ├── scripts/                 # Alert delivery scripts
│   └── templates/               # Email and Slack templates
│       ├── email-templates/
│       └── slack-templates/
│
├── audits/                      # Security audit reports
│   └── 006-DR-SOPS-security-audit.md
│
├── backups/                     # Backup storage (encrypted)
│   ├── daily/
│   ├── weekly/
│   └── monthly/
│
├── compliance/                  # Compliance and policy documents
│   ├── agreements/              # Security agreements
│   ├── checklists/              # Compliance checklists
│   ├── policies/                # Security policies
│   └── reports/                 # Incident reports
│
├── config/                      # Configuration templates
│   ├── backup/                  # pgBackRest configs
│   ├── fail2ban/                # Intrusion prevention
│   ├── firewall/                # UFW firewall rules
│   ├── pgbouncer/               # Connection pooling
│   ├── postgresql/              # Database security settings
│   └── ssl/                     # SSL/TLS certificates
│
├── customer-security/           # Customer-specific security
│   ├── customers/               # Per-customer configs
│   └── templates/               # Customer security templates
│
├── documentation/               # Security documentation
│   ├── architecture/            # Architecture docs
│   ├── external/                # Customer-facing docs
│   ├── procedures/              # Operational procedures
│   └── training/                # Training materials
│
├── implementation/              # Implementation guides
│   └── 007-DR-SOPS-security-implementation-guide.md
│
├── keys/                        # Encryption keys (NEVER in git)
│   ├── api-tokens/              # API keys and tokens
│   ├── backup-encryption/       # Backup encryption keys
│   └── ssl-ca/                  # SSL certificates
│
├── logs/                        # Security logs
│   ├── access/                  # Access logs
│   ├── alerts/                  # Alert history
│   ├── audit/                   # Audit trails
│   ├── backups/                 # Backup logs
│   └── security-events/         # Security incidents
│
├── procedures/                  # Operational procedures
│   ├── provision-customer-database.sh
│   ├── deprovision-customer-database.sh
│   └── backup-to-both-repos.sh
│
├── runbooks/                    # Incident response runbooks
│   ├── 01-security-breach-response.md
│   └── 02-unauthorized-access.md
│
├── scans/                       # Security scan results
│   ├── penetration-tests/
│   ├── port-scans/
│   ├── ssl-scans/
│   └── vulnerability-scans/
│
├── scripts/                     # Operational scripts
│   ├── compliance/              # Compliance automation
│   ├── hardening/               # System hardening
│   ├── incident-response/       # Emergency response
│   ├── maintenance/             # Maintenance tasks
│   ├── monitoring/              # Security monitoring
│   └── provisioning/            # Database provisioning
│
├── tools/                       # Security utilities
│   ├── encryption/              # Encryption tools
│   ├── log-analyzers/           # Log analysis
│   ├── password-generator/      # Password generation
│   └── validators/              # Configuration validators
│
├── README.md                    # Main documentation
├── QUICK-START.md               # Quick reference guide
├── setup-security-dir.sh        # Setup script
└── .gitignore                   # Git exclusions
```

---

## Key Components

### 1. Hardening Scripts

Located in `scripts/hardening/`, these scripts implement security hardening:

- **01-initial-setup.sh** - System initialization and user setup
- **02-postgresql-hardening.sh** - PostgreSQL security configuration
- **03-network-hardening.sh** - Firewall and fail2ban setup
- **04-backup-hardening.sh** - Backup encryption and verification

**Usage:**
```bash
cd /home/admincostplus/projects/costplusdb/001-security
sudo ./scripts/hardening/01-initial-setup.sh
sudo ./scripts/hardening/02-postgresql-hardening.sh
sudo ./scripts/hardening/03-network-hardening.sh
sudo ./scripts/hardening/04-backup-hardening.sh
```

### 2. Monitoring Scripts

Located in `scripts/monitoring/`, these provide real-time security monitoring:

- **check-failed-logins.sh** - Monitor authentication failures
- **check-ssl-expiry.sh** - SSL certificate expiry monitoring
- **check-resource-usage.sh** - Resource abuse detection
- **check-security-events.sh** - Comprehensive security analysis
- **network-status.sh** - Network security status

**Usage:**
```bash
# Check security events (last 24 hours)
./scripts/monitoring/check-security-events.sh 24

# Monitor failed logins
./scripts/monitoring/check-failed-logins.sh

# Check SSL certificate expiry
./scripts/monitoring/check-ssl-expiry.sh
```

### 3. Incident Response Scripts

Located in `scripts/incident-response/`, for emergency situations:

- **isolate-customer-db.sh** - Emergency database isolation
- **block-ip.sh** - Immediate IP blocking
- **restore-customer-db.sh** - Emergency database restoration

**Usage:**
```bash
# Isolate compromised database
sudo ./scripts/incident-response/isolate-customer-db.sh <db_name> "reason"

# Block malicious IP
sudo ./scripts/incident-response/block-ip.sh <ip_address> "reason"

# Emergency restore
sudo ./scripts/incident-response/restore-customer-db.sh <db_name>
```

### 4. Security Tools

Located in `tools/`, various security utilities:

- **password-generator/** - Cryptographically secure password generation
- **validators/** - Configuration validation tools
- **log-analyzers/** - Security log analysis
- **encryption/** - File encryption utilities

**Usage:**
```bash
# Generate secure password
./tools/password-generator/generate-secure-password.py 32

# Validate PostgreSQL config
sudo ./tools/validators/validate-postgresql-config.sh

# Analyze failed logins
./tools/log-analyzers/analyze-failed-logins.sh 24 text
```

### 5. Configuration Templates

Located in `config/`, production-ready templates:

- **firewall/ufw-rules.sh** - UFW firewall configuration
- **ssl/generate-cert.sh** - SSL certificate generation
- **fail2ban/** - Intrusion prevention configs
- **postgresql/** - PostgreSQL security settings
- **pgbouncer/** - Connection pooling configs
- **backup/** - pgBackRest encryption

**Usage:**
```bash
# Apply firewall rules
sudo ./config/firewall/ufw-rules.sh

# Generate SSL certificates
sudo ./config/ssl/generate-cert.sh

# Copy fail2ban configs
sudo cp config/fail2ban/jail.local /etc/fail2ban/
sudo cp config/fail2ban/filter.d/postgresql.conf /etc/fail2ban/filter.d/
sudo systemctl restart fail2ban
```

### 6. Alert System

Located in `alerts/`, complete alerting infrastructure:

- **rules/** - Alert definitions (YAML)
- **templates/email-templates/** - HTML email templates
- **templates/slack-templates/** - Slack webhook templates
- **scripts/** - Alert delivery scripts

**Alert Types:**
- Failed login threshold alerts
- Disk space warnings
- Database down alerts
- Backup failure alerts
- Security incident notifications

### 7. Runbooks and Documentation

Located in `runbooks/` and `documentation/`:

- **01-security-breach-response.md** - Breach response procedures
- **02-unauthorized-access.md** - Unauthorized access response
- **compliance/policies/** - Security policies
- **documentation/external/** - Customer-facing docs

---

## Setup and Initialization

### Initial Setup

```bash
cd /home/admincostplus/projects/costplusdb/001-security
sudo ./setup-security-dir.sh
```

This script:
- Creates all required directories
- Sets proper permissions and ownership
- Creates audit logs
- Generates status files
- Verifies critical files exist

### Post-Setup Configuration

1. **Review configuration templates:**
```bash
cd config/
# Edit templates with your environment-specific settings
```

2. **Run hardening scripts in sequence:**
```bash
sudo ./scripts/hardening/01-initial-setup.sh
sudo ./scripts/hardening/02-postgresql-hardening.sh
sudo ./scripts/hardening/03-network-hardening.sh
sudo ./scripts/hardening/04-backup-hardening.sh
```

3. **Test monitoring:**
```bash
./scripts/monitoring/check-security-events.sh 24
./scripts/monitoring/check-failed-logins.sh
```

4. **Review runbooks:**
```bash
cat runbooks/01-security-breach-response.md
cat runbooks/02-unauthorized-access.md
```

---

## Security Best Practices

### File Permissions

The security directory uses strict permission model:

- **Directories:** 750 (owner + group)
- **Regular files:** 640 (owner read/write, group read)
- **Scripts:** 750 (executable by owner + group)
- **Keys directory:** 700 (owner only)
- **Key files:** 600 (owner read/write only)

### Git Safety

The `.gitignore` file prevents sensitive data from being committed:

- All files in `keys/` directory
- Customer-specific data
- Log files
- Scan results
- Incident reports with sensitive details
- Credentials and passwords

**CRITICAL:** Never commit:
- Private keys
- Passwords or passphrases
- API tokens
- Customer data
- Incident reports with PII

### Logging and Auditing

All security operations are logged:

- **Audit trail:** `logs/audit/` - All configuration changes
- **Security events:** `logs/security-events/` - Security incidents
- **Access logs:** `logs/access/` - System access
- **Alert history:** `logs/alerts/` - Alert triggers

Logs are:
- Timestamped
- Include operator identity
- Retain for 90 days minimum
- Backed up with database backups

---

## Integration with Other Systems

### PostgreSQL Integration

Security configurations applied to PostgreSQL:

```bash
# Include security config in postgresql.conf
echo "include = '/home/admincostplus/projects/costplusdb/001-security/config/postgresql/postgresql-security.conf'" >> /etc/postgresql/16/main/postgresql.conf
```

### Backup Integration

pgBackRest uses security directory for:
- Encryption key storage: `keys/backup-encryption/`
- Configuration templates: `config/backup/`
- Backup logs: `logs/backups/`

### Monitoring Integration

Monitoring scripts can be scheduled with cron:

```bash
# Add to /etc/cron.d/costplusdb-security
0 * * * * admincostplus /home/admincostplus/projects/costplusdb/001-security/scripts/monitoring/check-security-events.sh 1
*/15 * * * * admincostplus /home/admincostplus/projects/costplusdb/001-security/scripts/monitoring/check-failed-logins.sh
0 0 * * * root /home/admincostplus/projects/costplusdb/001-security/scripts/monitoring/check-ssl-expiry.sh
```

---

## Maintenance Procedures

### Daily
- Review security event logs
- Check monitoring alerts
- Verify backup completion

### Weekly
- Run security validation: `tools/validators/validate-postgresql-config.sh`
- Analyze failed login patterns
- Review access logs

### Monthly
- Update security documentation
- Review and rotate old logs
- Test incident response procedures
- Update runbooks based on new threats

### Quarterly
- Complete security audit
- Review and update policies
- Security team training
- Penetration testing (when resources available)

---

## Emergency Procedures

### Security Breach
1. Follow `runbooks/01-security-breach-response.md`
2. Use isolation script: `scripts/incident-response/isolate-customer-db.sh`
3. Document in `compliance/reports/`
4. Notify customers per policy

### Unauthorized Access
1. Follow `runbooks/02-unauthorized-access.md`
2. Block attacker: `scripts/incident-response/block-ip.sh`
3. Investigate logs: `tools/log-analyzers/analyze-failed-logins.sh`
4. Create incident report

### Database Corruption
1. Emergency restore: `scripts/incident-response/restore-customer-db.sh`
2. Verify data integrity
3. Document incident
4. Root cause analysis

---

## Related Documentation

**Within 001-security/:**
- `README.md` - Complete overview
- `QUICK-START.md` - Quick reference guide
- `runbooks/` - Incident response procedures
- `compliance/policies/` - Security policies

**In 000-docs/:**
- `015-DR-SOPS-security-implementation-masterplan.md` - Implementation guide
- `006-DR-SOPS-security-audit.md` - Security audit
- `005-DR-SOPS-postgresql-operations.md` - PostgreSQL operations

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-10-19 | 1.0 | Initial security directory architecture document |

---

**Document Owner:** Security Team
**Review Schedule:** Quarterly
**Next Review:** 2025-12-31
