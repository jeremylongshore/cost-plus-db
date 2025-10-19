# Unauthorized Access Response Runbook

**CostPlusDB Security Procedures**

## Purpose

This runbook provides procedures for responding to unauthorized access attempts, including brute force attacks, credential stuffing, and successful unauthorized logins.

---

## Detection Indicators

### Failed Authentication
- Excessive failed login attempts (>10 in 1 hour)
- Failed attempts from multiple IPs for single user
- Failed attempts for multiple users from single IP
- Authentication failures outside business hours

### Successful Unauthorized Access
- Connections from unexpected geographic locations
- Connections outside normal customer hours
- Multiple simultaneous connections from different IPs
- Unusual query patterns or DDL operations

---

## Response Procedures

### Level 1: Failed Authentication Attempts (Low-Medium)

**Indicators:** 5-20 failed attempts from single IP

**Response (1-hour SLA):**

1. **Verify fail2ban protection:**
```bash
# Check if IP is banned
sudo fail2ban-client status postgresql
```

2. **Analyze pattern:**
```bash
# Run failed login analyzer
/home/admincostplus/projects/costplusdb/001-security/tools/log-analyzers/analyze-failed-logins.sh 24 text
```

3. **Review targeted accounts:**
```bash
# Check which users are being targeted
sudo grep "authentication failed" /var/log/postgresql/postgresql-16-main.log | \
  grep -oP 'user "\K[^"]+' | sort | uniq -c | sort -rn | head -10
```

4. **Document findings:**
- Record in security log
- No customer notification needed (normal activity)
- Continue monitoring

### Level 2: Brute Force Attack (Medium-High)

**Indicators:** >20 failed attempts from single IP

**Response (30-minute SLA):**

1. **Immediate blocking:**
```bash
# Block attacker IP
sudo /home/admincostplus/projects/costplusdb/001-security/scripts/incident-response/block-ip.sh <IP_ADDRESS> "Brute force attack"
```

2. **Check for successful logins:**
```bash
# Check if attacker gained access
sudo grep "<IP_ADDRESS>" /var/log/postgresql/postgresql-16-main.log | grep "connection authorized"
```

3. **If successful login found:**
- Escalate to Level 4 (Confirmed Unauthorized Access)
- Notify security team immediately
- Prepare customer notification

4. **If no successful login:**
- Document incident
- Update monitoring thresholds if needed
- No customer notification required

### Level 3: Credential Stuffing (High)

**Indicators:** Multiple IPs attempting same username(s)

**Response (15-minute SLA):**

1. **Identify targeted accounts:**
```bash
# Find accounts under attack
sudo grep "authentication failed" /var/log/postgresql/postgresql-16-main.log | \
  grep -oP 'user "\K[^"]+' | sort | uniq -c | sort -rn | head -5
```

2. **Check for compromised accounts:**
```bash
# For each targeted account, check successful logins
TARGETED_USER="customer_user"
sudo grep "user \"$TARGETED_USER\"" /var/log/postgresql/postgresql-16-main.log | \
  grep "connection authorized" | tail -20
```

3. **If compromise suspected:**
```bash
# Immediately rotate credentials
sudo -u postgres psql -p 5433 <<EOF
ALTER USER $TARGETED_USER WITH PASSWORD '$(openssl rand -base64 32)';
EOF

# Store new password
echo "New password stored: /root/customer-credentials/${TARGETED_USER}-emergency-$(date +%Y%m%d).txt"
```

4. **Notify customer:**
- Email customer immediately
- Provide new credentials via secure channel
- Recommend additional security measures

### Level 4: Confirmed Unauthorized Access (Critical)

**Indicators:** Successful login from unauthorized source

**Response (Immediate - 5 minute SLA):**

1. **Emergency isolation:**
```bash
# Isolate affected database
INCIDENT_ID="INC-$(date +%Y%m%d-%H%M%S)"
DB_NAME="customer_db"

sudo /home/admincostplus/projects/costplusdb/001-security/scripts/incident-response/isolate-customer-db.sh \
  "$DB_NAME" "Confirmed unauthorized access - $INCIDENT_ID"
```

2. **Terminate all sessions:**
```bash
# Kill all connections to affected database
sudo -u postgres psql -p 5433 <<EOF
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DB_NAME'
  AND pid != pg_backend_pid();
EOF
```

3. **Block attacker access:**
```bash
# Get attacker IP
ATTACKER_IP=$(sudo grep "user \"$TARGETED_USER\"" /var/log/postgresql/postgresql-16-main.log | \
  grep "connection authorized" | tail -1 | grep -oP 'host=\K[^ ]+')

# Block immediately
sudo /home/admincostplus/projects/costplusdb/001-security/scripts/incident-response/block-ip.sh \
  "$ATTACKER_IP" "Confirmed unauthorized database access - $INCIDENT_ID"
```

4. **Evidence collection:**
```bash
# Export all logs for forensic analysis
EVIDENCE_DIR="/home/admincostplus/projects/costplusdb/001-security/scans/penetration-tests/${INCIDENT_ID}"
mkdir -p "$EVIDENCE_DIR"

# Copy relevant logs
sudo grep "$ATTACKER_IP" /var/log/postgresql/*.log > "$EVIDENCE_DIR/postgresql-attacker-activity.log"
sudo grep "$DB_NAME" /var/log/postgresql/*.log > "$EVIDENCE_DIR/database-activity.log"

# Database snapshot
sudo -u postgres pg_dump -p 5433 "$DB_NAME" | gzip > "$EVIDENCE_DIR/${DB_NAME}-snapshot-$(date +%Y%m%d-%H%M%S).sql.gz"

# Query history (if available)
sudo -u postgres psql -p 5433 -d "$DB_NAME" -c "
SELECT query_start, usename, query
FROM pg_stat_activity_history
WHERE usename = '$TARGETED_USER'
  AND query_start >= NOW() - INTERVAL '24 hours'
ORDER BY query_start;
" > "$EVIDENCE_DIR/query-history.txt" 2>/dev/null || echo "Query history not available"
```

5. **Assess data impact:**
```bash
# Check for data exfiltration
sudo -u postgres psql -p 5433 -d "$DB_NAME" <<EOF
-- Check for SELECT queries (data reads)
-- Check for COPY TO commands (bulk export)
-- Check for table modifications
-- Check for privilege escalations
EOF

# Document findings
cat >> "$EVIDENCE_DIR/impact-assessment.txt" << EOF
Unauthorized Access Impact Assessment
======================================
Incident ID: $INCIDENT_ID
Database: $DB_NAME
Attacker IP: $ATTACKER_IP
Access Duration: [CALCULATE FROM LOGS]

Data Read Access: [YES/NO/UNKNOWN]
Data Modifications: [YES/NO/UNKNOWN]
Data Exfiltration: [YES/NO/UNKNOWN]
Privilege Escalation: [YES/NO/UNKNOWN]

Affected Tables:
[LIST TABLES]

Recommended Actions:
[RESTORE/CONTINUE/INVESTIGATE]
EOF
```

6. **Customer notification (CRITICAL):**
```bash
# Use security incident template
cat > "$EVIDENCE_DIR/customer-notification-${INCIDENT_ID}.txt" << EOF
SUBJECT: SECURITY ALERT - Unauthorized Database Access Detected

Dear [Customer Name],

We are contacting you immediately regarding a security incident affecting your database.

INCIDENT DETAILS:
- Incident ID: $INCIDENT_ID
- Detection Time: $(date +'%Y-%m-%d %H:%M:%S')
- Database: $DB_NAME
- Status: Database isolated, attacker blocked

IMMEDIATE ACTIONS TAKEN:
1. Unauthorized access detected and blocked
2. Database immediately isolated
3. Attacker IP address blocked at firewall level
4. Database credentials rotated
5. Forensic investigation initiated

YOUR DATABASE STATUS:
- Current State: Offline (isolated for security)
- Data Integrity: Under investigation
- Estimated Restoration: [TIMEFRAME]

WHAT WE NEED FROM YOU:
1. Review your application logs for unusual activity
2. Verify your API keys/credentials haven't been compromised
3. Contact us immediately if you notice any other issues

NEXT STEPS:
1. Complete forensic investigation (2-4 hours)
2. Restore database from clean backup if needed
3. Provide you with new secure credentials
4. Detailed incident report within 24 hours

CONTACT:
Security Team: security@costplusdb.com
Emergency Hotline: [PHONE]
Incident ID: $INCIDENT_ID

We take your data security extremely seriously and will keep you updated every 2 hours until resolution.

Sincerely,
CostPlusDB Security Team
EOF

# Send immediately
mail -s "CRITICAL: Unauthorized Access Detected - $INCIDENT_ID" [CUSTOMER_EMAIL] < "$EVIDENCE_DIR/customer-notification-${INCIDENT_ID}.txt"
```

7. **Escalation:**
```bash
# Notify emergency contacts
echo "CRITICAL SECURITY INCIDENT: $INCIDENT_ID" | \
  mail -s "CRITICAL: Unauthorized Database Access" security-team@costplusdb.com
```

---

## Post-Incident Procedures

### Investigation (24-48 hours after containment)

1. **Root cause analysis:**
- How did attacker obtain credentials?
- Were credentials leaked in previous breach?
- Was password weak or guessable?
- Was MFA bypassed?

2. **Data impact assessment:**
- What data was accessed?
- Was data modified or deleted?
- Was data exfiltrated?
- Regulatory notification required?

3. **Security improvements:**
- Update authentication policies
- Implement additional monitoring
- Review customer security practices
- Update incident response procedures

### Customer Communication

**24-hour update:**
- Detailed incident timeline
- Complete impact assessment
- Restoration plan
- Security recommendations

**Post-mortem (7 days):**
- Full incident report
- Root cause analysis
- Preventive measures implemented
- Lessons learned

---

## Prevention Measures

### Immediate Actions
- [ ] Verify fail2ban is active and configured
- [ ] Enable connection logging
- [ ] Review password policies
- [ ] Implement rate limiting

### Short-term (1 week)
- [ ] Deploy IP whitelisting for sensitive databases
- [ ] Implement anomaly detection
- [ ] Customer security awareness program
- [ ] Regular security audits

### Long-term (1 month)
- [ ] Implement MFA for database access
- [ ] Deploy SIEM for advanced threat detection
- [ ] Automated breach notification system
- [ ] Third-party security assessment

---

## Reference Commands

### Quick Status Checks
```bash
# Check active connections
sudo -u postgres psql -p 5433 -c "
SELECT datname, usename, client_addr, state, query_start
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY query_start;"

# Check fail2ban status
sudo fail2ban-client status postgresql

# Review recent authentications
sudo tail -100 /var/log/postgresql/postgresql-16-main.log | grep "authentication"

# Check firewall rules
sudo ufw status numbered
```

### Emergency Actions
```bash
# Block IP immediately
sudo ufw deny from <IP_ADDRESS>

# Kill all connections to database
sudo -u postgres psql -p 5433 -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '<DB_NAME>';"

# Change user password
sudo -u postgres psql -p 5433 -c "
ALTER USER <USERNAME> WITH PASSWORD '<NEW_PASSWORD>';"

# Revoke database access
sudo -u postgres psql -p 5433 -c "
REVOKE CONNECT ON DATABASE <DB_NAME> FROM <USERNAME>;"
```

---

## Contact Information

**Security Team:** security@costplusdb.com
**Emergency Hotline:** [PHONE NUMBER]
**On-Call Rotation:** [PAGERDUTY/ONCALL SYSTEM]

---

**Document Version:** 1.0
**Last Updated:** 2025-10-19
**Owner:** Security Team
**Review Schedule:** Quarterly
