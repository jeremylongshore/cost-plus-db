# Security Breach Response Runbook

**CostPlusDB Incident Response Procedures**

## Overview

This runbook provides step-by-step procedures for responding to security incidents and data breaches. Follow these procedures exactly during a security incident.

**Severity Levels:**
- **CRITICAL**: Active breach, data exfiltration, or system compromise
- **HIGH**: Suspected unauthorized access, failed security controls
- **MEDIUM**: Security anomalies, failed login attempts above threshold
- **LOW**: Minor security alerts, informational events

---

## Phase 1: Detection & Assessment (0-15 minutes)

### 1.1 Confirm the Incident

**Actions:**
- [ ] Review alert details and triggering events
- [ ] Verify this is not a false positive
- [ ] Document initial observations

**Commands:**
```bash
# Check recent failed logins
sudo /home/admincostplus/projects/costplusdb/001-security/scripts/monitoring/check-failed-logins.sh

# Review PostgreSQL logs
sudo tail -n 100 /var/log/postgresql/postgresql-*.log

# Check active connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

### 1.2 Determine Severity

**Questions to answer:**
1. Is there active unauthorized access? → **CRITICAL**
2. Is customer data at risk? → **CRITICAL/HIGH**
3. Are security controls bypassed? → **HIGH**
4. Is this an automated attack attempt? → **MEDIUM**

**Severity Decision Matrix:**

| Factor | Critical | High | Medium | Low |
|--------|----------|------|--------|-----|
| Data access | Confirmed | Suspected | Attempted | None |
| Active attacker | Yes | Possibly | No | No |
| Customer impact | Immediate | Likely | Possible | None |
| System compromise | Yes | Suspected | No | No |

### 1.3 Initial Documentation

**Create incident file:**
```bash
INCIDENT_ID="INC-$(date +%Y%m%d-%H%M%S)"
INCIDENT_DIR="/home/admincostplus/projects/costplusdb/001-security/compliance/reports"
mkdir -p "$INCIDENT_DIR"

# Create incident report
cat > "$INCIDENT_DIR/${INCIDENT_ID}-report.md" << EOF
# Security Incident Report: $INCIDENT_ID

**Detection Time:** $(date +'%Y-%m-%d %H:%M:%S')
**Severity:** [CRITICAL/HIGH/MEDIUM/LOW]
**Status:** ACTIVE

## Initial Observations

- Alert source:
- Affected systems:
- Indicators:

## Timeline

- $(date +'%H:%M:%S') - Incident detected

EOF
```

---

## Phase 2: Containment (15-30 minutes)

### 2.1 CRITICAL Severity - Immediate Actions

**If active breach confirmed:**

1. **Isolate affected database:**
```bash
# Emergency isolation
sudo /home/admincostplus/projects/costplusdb/001-security/scripts/incident-response/isolate-customer-db.sh <db_name> "Active security breach - $INCIDENT_ID"
```

2. **Block attacker IP (if identified):**
```bash
# Add UFW rule to block IP
sudo ufw insert 1 deny from <attacker_ip> to any
sudo ufw reload

# Log the block
echo "$(date) - BLOCKED IP: <attacker_ip> - Incident: $INCIDENT_ID" >> \
  /home/admincostplus/projects/costplusdb/001-security/logs/security-events/ip-blocks.log
```

3. **Terminate all external connections:**
```bash
# Kill all non-local connections
sudo -u postgres psql -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE client_addr IS NOT NULL
  AND client_addr::text != '127.0.0.1'
  AND pid != pg_backend_pid();
"
```

### 2.2 HIGH Severity - Containment Actions

1. **Change affected user passwords:**
```bash
# Generate new password
NEW_PASS=$(/home/admincostplus/projects/costplusdb/001-security/tools/password-generator/generate-secure-password.py --quiet)

# Change password
sudo -u postgres psql -c "ALTER USER <username> WITH PASSWORD '$NEW_PASS';"

# Store securely
echo "$NEW_PASS" | sudo tee /home/admincostplus/projects/costplusdb/001-security/keys/api-tokens/emergency-${INCIDENT_ID}-password.txt
sudo chmod 600 /home/admincostplus/projects/costplusdb/001-security/keys/api-tokens/emergency-${INCIDENT_ID}-password.txt
```

2. **Enable enhanced logging:**
```bash
# Temporarily increase logging
sudo -u postgres psql -c "ALTER SYSTEM SET log_statement = 'all';"
sudo -u postgres psql -c "SELECT pg_reload_conf();"
```

### 2.3 Preserve Evidence

**Critical - Do this BEFORE any remediation:**

```bash
# Snapshot current connections
sudo -u postgres psql -c "COPY (SELECT * FROM pg_stat_activity) TO '/tmp/incident-${INCIDENT_ID}-connections.csv' CSV HEADER;"

# Snapshot authentication attempts
sudo grep "FATAL.*authentication" /var/log/postgresql/postgresql-*.log > \
  /home/admincostplus/projects/costplusdb/001-security/scans/penetration-tests/incident-${INCIDENT_ID}-auth-failures.log

# Copy recent logs
sudo cp /var/log/postgresql/postgresql-*.log \
  /home/admincostplus/projects/costplusdb/001-security/scans/penetration-tests/incident-${INCIDENT_ID}-postgres-logs/
```

---

## Phase 3: Investigation (30 minutes - 2 hours)

### 3.1 Analyze Attack Vector

**Questions to answer:**
- How did the attacker gain access?
- What credentials were used?
- What data was accessed?
- How long has the attacker had access?

**Investigation queries:**
```bash
# Check for unusual query patterns
sudo -u postgres psql -c "
SELECT usename, datname, query, state_change
FROM pg_stat_activity
ORDER BY state_change DESC
LIMIT 50;
"

# Review recent DDL changes
sudo grep -E "CREATE|ALTER|DROP" /var/log/postgresql/postgresql-*.log | tail -n 50

# Check for privilege escalations
sudo -u postgres psql -c "
SELECT grantee, privilege_type, table_name
FROM information_schema.table_privileges
WHERE grantee NOT IN ('postgres', 'PUBLIC')
ORDER BY grantee;
"
```

### 3.2 Determine Data Impact

**Check for data exfiltration:**
```bash
# Review data export attempts
sudo grep -E "COPY.*TO|SELECT.*INTO|pg_dump" /var/log/postgresql/postgresql-*.log

# Check database sizes for unusual changes
sudo -u postgres psql -c "
SELECT datname, pg_size_pretty(pg_database_size(datname))
FROM pg_database
WHERE datname NOT IN ('template0', 'template1')
ORDER BY pg_database_size(datname) DESC;
"
```

### 3.3 Document Findings

**Update incident report with:**
- Attack vector identified
- Systems/databases affected
- Data accessed (if any)
- Timeline of attacker activity
- Evidence preserved

---

## Phase 4: Eradication (2-4 hours)

### 4.1 Remove Attacker Access

**Complete checklist:**
- [ ] All compromised credentials rotated
- [ ] Attacker IPs blocked at firewall
- [ ] Backdoors identified and removed
- [ ] Vulnerable services patched
- [ ] Security controls verified

### 4.2 Security Hardening

```bash
# Review and update firewall rules
sudo /home/admincostplus/projects/costplusdb/001-security/config/firewall/ufw-rules.sh

# Regenerate SSL certificates (if compromised)
sudo /home/admincostplus/projects/costplusdb/001-security/config/ssl/generate-cert.sh

# Review fail2ban configuration
sudo fail2ban-client status
sudo fail2ban-client status postgresql
```

### 4.3 Vulnerability Assessment

**Scan for additional vulnerabilities:**
```bash
# Run security audit
# (Add security scanning commands here)

# Review PostgreSQL configuration
sudo -u postgres psql -c "SHOW ALL;" > /tmp/pg-config-${INCIDENT_ID}.txt

# Check for weak passwords (if possible)
# Review user account policies
```

---

## Phase 5: Recovery (4-8 hours)

### 5.1 Restore Normal Operations

**Gradual restoration:**

1. **Test database integrity:**
```bash
# Check for corruption
sudo -u postgres psql -d <db_name> -c "
SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname))
FROM pg_database;
"

# Verify tables
sudo -u postgres psql -d <db_name> -c "\dt+"
```

2. **Re-enable customer access:**
```bash
# Grant CONNECT permission
sudo -u postgres psql -c "GRANT CONNECT ON DATABASE <db_name> TO <user>;"

# Re-enable login
sudo -u postgres psql -c "ALTER USER <user> WITH LOGIN;"

# Provide new credentials to customer
```

### 5.2 Enhanced Monitoring

**Implement additional monitoring:**
```bash
# Add monitoring cron jobs
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/admincostplus/projects/costplusdb/001-security/scripts/monitoring/check-failed-logins.sh") | crontab -

# Enable query logging temporarily
sudo -u postgres psql -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"  # Log queries > 1s
sudo -u postgres psql -c "SELECT pg_reload_conf();"
```

---

## Phase 6: Post-Incident Activities (1-2 weeks)

### 6.1 Customer Communication

**CRITICAL severity - Notify within 24 hours:**

**Email template:** See `/home/admincostplus/projects/costplusdb/001-security/alerts/templates/email-templates/security-incident.html`

**Required information:**
- What happened (high-level, non-technical)
- What data was affected
- Actions taken to secure the system
- What customers should do
- Contact information for questions

### 6.2 Lessons Learned

**Post-incident review meeting:**
- What went well?
- What could be improved?
- What security gaps were identified?
- What process changes are needed?

**Document in incident report:**
- Root cause analysis
- Contributing factors
- Preventive measures implemented
- Detection improvements
- Response time analysis

### 6.3 Security Improvements

**Update security procedures based on findings:**
```bash
# Document improvements
IMPROVEMENTS_FILE="/home/admincostplus/projects/costplusdb/001-security/compliance/reports/${INCIDENT_ID}-improvements.md"

cat > "$IMPROVEMENTS_FILE" << EOF
# Security Improvements - $INCIDENT_ID

## Root Cause
[Describe what allowed the incident]

## Preventive Measures
1. [Specific action taken]
2. [Configuration change]
3. [Process improvement]

## Detection Improvements
1. [New monitoring implemented]
2. [Alert tuning]

## Response Improvements
1. [Procedure updates]
2. [Tool enhancements]

## Timeline for Implementation
- Immediate: [actions]
- Short-term (1 week): [actions]
- Long-term (1 month): [actions]
EOF
```

---

## Emergency Contacts

### Internal Team
- **Security Lead:** security@costplusdb.com
- **On-Call Engineer:** +1-XXX-XXX-XXXX
- **CTO:** cto@costplusdb.com

### External Resources
- **PostgreSQL Security:** security@postgresql.org
- **Hosting Provider (Contabo):** support.contabo.com
- **Legal Counsel:** legal@costplusdb.com

### Regulatory Reporting
- **Data Breach Notification:** (if required by law)
- **Timeline:** Most jurisdictions require 72-hour notification

---

## Communication Templates

### Internal Alert (Slack/Email)

```
🚨 SECURITY INCIDENT - $INCIDENT_ID

Severity: [CRITICAL/HIGH/MEDIUM/LOW]
Status: [ACTIVE/CONTAINED/RESOLVED]
Affected: [Systems/Databases]

Current Actions:
- [Action 1]
- [Action 2]

Incident Commander: [Name]
Next Update: [Time]

DO NOT forward outside security team.
```

### Customer Notification (HIGH/CRITICAL only)

See: `/home/admincostplus/projects/costplusdb/001-security/alerts/templates/email-templates/security-incident.html`

---

## Appendix: Quick Reference Commands

### Emergency Isolation
```bash
sudo /home/admincostplus/projects/costplusdb/001-security/scripts/incident-response/isolate-customer-db.sh <db_name> "<reason>"
```

### Block IP Address
```bash
sudo ufw insert 1 deny from <ip> to any && sudo ufw reload
```

### Check Active Connections
```bash
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
```

### Generate Secure Password
```bash
/home/admincostplus/projects/costplusdb/001-security/tools/password-generator/generate-secure-password.py
```

### View Recent Failed Logins
```bash
sudo grep "FATAL.*authentication failed" /var/log/postgresql/postgresql-*.log | tail -n 50
```

---

**Document Version:** 1.0
**Last Updated:** $(date +'%Y-%m-%d')
**Next Review:** 6 months
