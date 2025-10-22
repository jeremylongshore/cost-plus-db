# Website Structure Analysis: Reliability vs Incident Response

**Date:** October 22, 2025
**Issue:** Potential confusion between reliability.html and emergency.html
**Concern:** Is the website structure confusing for customers?

---

## Current Website Structure

### reliability.html - "Reliability & Recovery"
**Current Content:**
- How We Think About Reliability (isolation, redundancy, simplicity)
- **"When Things Break: Recovery Scenarios"** ⚠️ (sounds like incident response)
  - VPS Hardware Failure
  - Accidental Data Deletion
  - Database Corruption
  - Datacenter Outage
  - Founder Unavailable
- What You Get (uptime, backups, support)
- What We Don't Do (no failover, no 99.999%, no multi-region)
- Detailed backup procedures
- Weekly verification testing
- Monitoring setup details

**Audience:** Prospective customers evaluating reliability
**Tone:** Educational, technical, proactive
**Purpose:** Build confidence in the service

---

### emergency.html - "Emergency Procedures"
**Current Content:**
- Critical Emergency Contact Information
- **Severity Levels (P0, P1, P2, P3)** ⚠️ (incident classification)
- **Emergency Scenarios** with immediate actions:
  - Database Down (P0)
  - Security Incident (P0)
  - Performance Issues (P1)
  - Backup/Recovery Issues (P0)
- Emergency Backup Operator System
- Open Source Emergency Tools (monitoring stack)
- Status Page
- Incident Post-Mortems
- Escalation Path
- Customer Self-Service Emergency Tools

**Audience:** Customers experiencing an active incident
**Tone:** Urgent, action-oriented, reactive
**Purpose:** Guide customers through emergencies

---

## The Confusion Problem

### Overlap Issues

**1. "When Things Break" (reliability.html) vs "Emergency Scenarios" (emergency.html)**

Both describe what happens during failures, but:
- **reliability.html**: "When Things Break" describes theoretical scenarios for prospective customers
- **emergency.html**: "Emergency Scenarios" gives actual procedures for customers in crisis

**Example of confusion:**
- Customer reads reliability.html → sees "VPS Hardware Failure: Downtime 1-2 hours"
- Customer's VPS fails → Goes to emergency.html → Different format, different information
- Result: Customer bounces between pages looking for the right info

**2. Recovery Procedures in Both Places**

- **reliability.html**: "Recovery Scenarios" describes WHAT happens
- **emergency.html**: "What We'll Do" describes HOW we respond

**Example:**
- reliability.html: "VPS Hardware Failure → Detection: 5 minutes → Response: Restore to new VPS → Downtime: 1-2 hours"
- emergency.html: "Database Down (P0) → Response Time: 30 minutes → Immediate Actions: Check status page, verify DNS, contact us"

**3. Monitoring Tools in Both Places**

- **reliability.html**: Describes monitoring setup as part of reliability
- **emergency.html**: Lists monitoring tools under "Open Source Emergency Tools"

---

## Analysis: Is This Confusing?

### ✅ What Works Well

1. **Clear Separation of Audience Intent:**
   - reliability.html = "Should I trust this service?" (pre-sale)
   - emergency.html = "My database is down, help!" (active incident)

2. **Emergency Page is Comprehensive:**
   - Has everything a customer needs during crisis
   - Clear severity levels
   - Contact information prominent
   - Self-service options

3. **Reliability Page Builds Trust:**
   - Shows transparency about limitations
   - Sets realistic expectations
   - Technical details build credibility

---

### ⚠️ What Could Be Confusing

1. **"When Things Break" Title on Reliability Page**
   - Sounds like incident response
   - Actually describes theoretical scenarios
   - Could mislead customers in crisis to wrong page

2. **Duplicate Information with Different Framing**
   - VPS failure described in both places
   - Backup procedures in both places
   - Monitoring tools in both places
   - No clear "this is planning" vs "this is response" distinction

3. **No Clear Navigation Between Pages**
   - Customer reading reliability.html doesn't know emergency.html exists
   - Customer in crisis might land on reliability.html and think it's incident response
   - No clear signposting: "In an active emergency? Go here →"

---

## Recommendation: Three-Page Structure

### Option A: Keep Current Structure, Improve Clarity

**reliability.html** → Rename section: "Recovery Planning: What to Expect"
- Change from: "When Things Break: Recovery Scenarios"
- Change to: "Understanding Recovery: What to Expect"
- Add prominent link at top: "🚨 In an active emergency? Go to Emergency Procedures →"
- Keep all current content (builds trust, sets expectations)

**emergency.html** → Keep as-is, rename to "incident-response.html"
- Current title/content perfect for active incidents
- Add to nav: "Incident Response" (clearer than "Emergency")
- Add breadcrumb: "If this is not an emergency, see: Reliability & Recovery"

**NEW: status.html** → Create public status page
- Real-time status of all systems
- Current incidents
- Scheduled maintenance
- Historical uptime
- Links to emergency.html if issues detected

---

### Option B: Create Dedicated Incident Response Page (RECOMMENDED)

**reliability.html** - Keep focus on trust/confidence
- How We Think About Reliability
- Backup & Recovery CAPABILITIES (not procedures)
- What You Get / What We Don't Do
- Monitoring APPROACH (not incident handling)
- Remove: "When Things Break" section → move to new page

**incident-response.html** - NEW dedicated page for active incidents
- **PRIMARY PURPOSE:** Guide customers through active incidents
- Severity Levels (P0/P1/P2/P3)
- "What to Do Right Now" for each scenario
- Contact information (email, phone, Slack)
- Status page link
- Self-service diagnostic tools
- Clear escalation path

**emergency.html** - Refocus as "Emergency Contacts & Procedures"
- Emergency Backup Operator system
- After-hours contact information
- Disaster recovery procedures
- Incident post-mortems
- Keep detailed technical procedures here

---

## Proposed Navigation Structure

```
Homepage
├─ Reliability          (pre-sale: builds trust, sets expectations)
├─ Incident Response    (active incident: what to do RIGHT NOW)
└─ Emergency            (detailed procedures, EBO system, post-mortems)
```

**Updated index.html nav links:**
```html
<a href="/reliability.html">Reliability</a>........Uptime, backups, disaster recovery
<a href="/incident-response.html">Incident Response</a>...........Database down? Start here
<a href="/emergency.html">Emergency</a>........................Critical incident procedures
```

---

## Detailed Recommendation: Option B Implementation

### 1. reliability.html - KEEP, MODIFY SLIGHTLY

**Remove:**
- "When Things Break: Recovery Scenarios" section (move to incident-response.html)

**Add at top:**
```html
<div style="background: var(--accent-2); padding: 1em; margin-bottom: 2em;">
<strong>🚨 Active Incident?</strong> If your database is down or experiencing issues right now,
go to <a href="/incident-response.html" style="color: var(--bg); text-decoration: underline;">Incident Response →</a>
</div>
```

**Keep:**
- How We Think About Reliability
- What You Get (uptime, backups, support)
- What We Don't Do
- Backup details
- Monitoring approach

---

### 2. incident-response.html - CREATE NEW (move content from emergency.html)

**Structure:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Incident Response - CostPlusDB</title>
  <meta name="description" content="Database down? Start here. Immediate actions and response procedures.">
</head>
<body>

<h1>Incident Response</h1>
<p class="subtitle">Database down? Performance issues? Start here.</p>

<div class="emergency-banner">
<h2>🚨 Critical Contact Information</h2>
<pre>
Email:    jeremy@intentsolutions.io
Response: Within 30 minutes (typically)
Critical: IMMEDIATE response (24/7 automated alerts)
</pre>
</div>

<h2>Severity Levels</h2>
<table>
  <tr><th>Level</th><th>Examples</th><th>Response Time</th></tr>
  <tr><td>P0 - CRITICAL</td><td>Database offline, data loss</td><td>30 minutes</td></tr>
  <tr><td>P1 - HIGH</td><td>Severe degradation</td><td>2 hours</td></tr>
  <tr><td>P2 - MEDIUM</td><td>Moderate issues</td><td>4 hours</td></tr>
  <tr><td>P3 - LOW</td><td>Minor issues</td><td>Next business day</td></tr>
</table>

<h2>What to Do Right Now</h2>

<h3>1. Database is Completely Down (P0)</h3>
<pre>
Immediate Actions:
1. Check status page: status.costplusdb.com
2. Verify DNS resolution: dig your-database.costplusdb.com
3. Check your application logs for connection errors
4. Contact us immediately (email + Slack if enabled)

We're already alerted:
- Betterstack detected outage
- Automated alerts sent to my phone
- I'm investigating or already working on it

Expected Recovery:
- Detection: Within 5 minutes (automated)
- Response: Immediate (24/7 monitoring)
- Restoration: 30-120 minutes depending on cause
</pre>

<h3>2. Slow Performance / Connection Issues (P1)</h3>
<pre>
Quick Diagnostics:
1. Run this query to check connections:
   SELECT count(*) FROM pg_stat_activity;

2. Check for long-running queries:
   SELECT pid, query_start, state, query
   FROM pg_stat_activity
   WHERE state = 'active'
   ORDER BY query_start;

3. Contact us with these results

We'll investigate:
- Connection pool status
- Query performance
- Resource usage (CPU, memory, disk)
- Potential optimization opportunities
</pre>

<h3>3. Suspected Data Loss or Corruption (P0)</h3>
<pre>
STOP:
- Do NOT run any DELETE or UPDATE statements
- Do NOT attempt to restore backups yourself
- Do NOT restart the database

DO:
- Document what you observe (missing records, incorrect values)
- Note the approximate time the issue started
- Contact us immediately
- If possible, export current state: pg_dump before we restore

We'll:
- Assess the scope of data loss
- Determine point-in-time recovery target
- Restore from backup to recovery window
- Verify data integrity before switching back
</pre>

<h3>4. Security Concern (P0)</h3>
<pre>
Signs of Security Incident:
- Unauthorized access attempts in logs
- Unexpected queries or data modifications
- Suspicious connection sources
- Performance anomalies suggesting attack

Immediate Actions:
1. Do NOT investigate further (preserve evidence)
2. Note the time and nature of suspicious activity
3. Contact us immediately: jeremy@intentsolutions.io
4. Mark email subject: "SECURITY INCIDENT"

We'll:
- Review access logs
- Analyze PostgreSQL query logs
- Check firewall logs (fail2ban, UFW)
- Rotate credentials if needed
- Implement additional security measures
</pre>

<h2>Self-Service Diagnostic Tools</h2>

<h3>Emergency Database Export</h3>
<pre>
If you need an immediate backup while waiting for support:

pg_dump -h your-host.costplusdb.com \
        -U your-username \
        -d your-database \
        -F c \
        -f emergency-backup-$(date +%Y%m%d-%H%M%S).dump

This creates a compressed backup you can restore independently.
</pre>

<h3>Connection Test</h3>
<pre>
Test if database is reachable:

psql "postgresql://user@host.costplusdb.com:5432/dbname?sslmode=require"

Success: You see psql prompt
Failure: Connection refused → Database down (P0)
Timeout: Network/DNS issue → Check status page
</pre>

<h2>Status & Monitoring</h2>

<pre>
Public Status Page:  status.costplusdb.com
Internal Dashboard:  (link provided during onboarding)
Incident History:    /emergency.html#post-mortems
</pre>

<h2>Escalation Path</h2>

<pre>
Step 1: Email jeremy@intentsolutions.io
        ↓ (no response in 30 min for P0/P1)
Step 2: Slack channel (if enabled in your plan)
        ↓ (no response in 1 hour for P0)
Step 3: Phone alert triggers automatically
        ↓ (no resolution)
Step 4: Emergency Backup Operator activates
        (See: /emergency.html#emergency-backup-operator)
</pre>

<footer>
<p><strong>Not an active incident?</strong></p>
<ul>
  <li><a href="/reliability.html">Reliability & Recovery</a> - How we prevent and recover from failures</li>
  <li><a href="/emergency.html">Emergency Procedures</a> - Detailed technical procedures and post-mortems</li>
</ul>
</footer>

</body>
</html>
```

---

### 3. emergency.html - KEEP, REFOCUS ON DETAILED PROCEDURES

**Remove:**
- Move "Severity Levels" → incident-response.html
- Move "Emergency Scenarios" → incident-response.html
- Move "Contact Information" → incident-response.html

**Keep/Enhance:**
- Emergency Backup Operator System (detailed technical explanation)
- Open Source Emergency Tools (technical setup details)
- Incident Post-Mortems (historical learnings)
- Detailed recovery procedures for operators (internal SOPs reference)

**Refocus Purpose:**
- This becomes the "deep dive" for customers who want technical details
- Reference material during incident response
- Post-incident learning resource

---

## Summary: Is the Current Structure Confusing?

### YES, slightly confusing because:

1. ❌ **"When Things Break" on reliability.html sounds like incident response**
   - Should be: "Understanding Recovery: What to Expect"

2. ❌ **No clear "if you're in crisis, go here" signposting**
   - Need prominent links between pages

3. ❌ **Duplicate content in different formats**
   - Recovery scenarios in reliability.html
   - Emergency scenarios in emergency.html
   - No clear "this is planning" vs "this is active response"

### Recommended Fix:

**Create 3-page structure:**
1. **reliability.html** - Pre-sale trust building (keep mostly as-is, remove "When Things Break")
2. **incident-response.html** - NEW: Active incident guide (clear, actionable, immediate)
3. **emergency.html** - Deep technical details (keep EBO, tools, post-mortems)

**Add clear navigation:**
- Prominent "Active incident? Go here →" on reliability page
- "Not an emergency? Learn about reliability →" on incident response page
- Consistent nav links across all pages

---

## Decision Required

**Question for Jeremy:**

Do you want to:
1. ✅ **Option A:** Keep current 2-page structure, add clearer signposting and rename sections
2. ✅ **Option B:** Create 3-page structure (reliability, incident-response, emergency) - RECOMMENDED
3. ✅ **Option C:** Something else?

**My recommendation: Option B** - Clearest for customers, best UX during crisis, proper separation of concerns.

Should I create the new incident-response.html page?
