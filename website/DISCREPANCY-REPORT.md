# CostPlusDB Website Discrepancy Report
**Generated:** 2025-10-21
**Purpose:** Document all support response time and table formatting inconsistencies before standardization

---

## 1. SUPPORT RESPONSE TIME DISCREPANCIES

### Standard (from reliability.html - our source of truth):
```
- Critical outages (database down): IMMEDIATE response (automated alerts 24/7)
- Regular support (questions, requests): 4-hour SLA (business hours: M-F 9am-6pm ET)
- Reality: I typically respond to everything within 30 minutes, 7 days/week
```

### File-by-File Discrepancies:

#### about.html (Line 280)
**Current Text:**
```
Email (4-hour response). Slack: +$29/mo (Shared/Dedicated) or included (Pro/Enterprise)
```
**Issue:** Missing critical outage distinction and "SLA" terminology
**Should Be:**
```
Email: 4-hour SLA (business hours), typically 30-min response. Critical outages: IMMEDIATE. Slack: +$29/mo or included with Pro/Enterprise
```

#### about.html (Line 348)
**Current Text:**
```
Response time: Within 2 hours (business hours)
```
**Issue:** Says "2 hours" instead of "4-hour SLA"
**Should Be:**
```
Response time: 4-hour SLA (business hours), typically 30-min response
```

#### about.html (Line 215)
**Current Text:**
```
I offer email/Slack only (30-minute response, 7 days/week for first 5 customers). Slack included with Pro/Enterprise
```
**Issue:** Says "30-minute response" as guarantee instead of SLA + typical response
**Should Be:**
```
I offer email/Slack only. Email: 4-hour SLA (business hours), typically 30-min response, 7 days/week. Critical outages: IMMEDIATE. Slack: +$29/mo or included with Pro/Enterprise
```

#### activity.html (Line 57)
**Current Text:**
```
Response times: 4-hour (business hours), 30-min for first 5 customers
```
**Issue:** Implies different SLA for first 5 customers vs later customers
**Should Be:**
```
Response times: 4-hour SLA (business hours), typically 30-min for everyone, 7 days/week. Critical outages: IMMEDIATE
```

#### docs.html (Line 61)
**Current Text:**
```
Support: 4-hour response time (business hours)
```
**Issue:** Missing critical outage distinction and typical response time
**Should Be:**
```
Support: 4-hour SLA (business hours), typically 30-min response. Critical outages: IMMEDIATE
```

#### docs.html (Line 70)
**Current Text:**
```
I'm Jeremy - founder, operator, and the person who'll set up your database. Response within 2 hours during business hours.
```
**Issue:** Says "2 hours" instead of "4-hour SLA"
**Should Be:**
```
I'm Jeremy - founder, operator, and the person who'll set up your database. Response: 4-hour SLA (business hours), typically 30-min, 7 days/week.
```

#### docs.html (Line 127)
**Current Text:**
```
Response time: Within 30 minutes, 7 days a week
```
**Issue:** Says "30 minutes" as guarantee instead of typical response
**Should Be:**
```
Response time: 4-hour SLA (business hours), typically 30-min, 7 days/week
```

#### docs.html (Line 183)
**Current Text:**
```
Questions? Email jeremy@intentsolutions.io - I respond within 30 minutes, 7 days a week (first 5 customers).
```
**Issue:** Implies 30-min is guarantee only for first 5 customers
**Should Be:**
```
Questions? Email jeremy@intentsolutions.io - 4-hour SLA (business hours), typically 30-min response, 7 days/week for everyone.
```

#### docs.html (Line 383)
**Current Text:**
```
Response time: Within 2 hours (business hours)
```
**Issue:** Says "2 hours" instead of "4-hour SLA"
**Should Be:**
```
Response time: 4-hour SLA (business hours), typically 30-min, 7 days/week
```

#### index.html (Line 81)
**Current Text:**
```
Email support: 4-hour response (business hours), 30-min for first 5 customers
```
**Issue:** Implies 30-min only for first 5 customers
**Should Be:**
```
Email support: 4-hour SLA (business hours), typically 30-min response for everyone, 7 days/week
```

#### index.html (Line 88)
**Current Text:**
```
I respond to all inquiries within 30 minutes, 7 days a week.
```
**Issue:** Says "30 minutes" as guarantee instead of typical response
**Should Be:**
```
Official SLA: 4-hour response (business hours). Reality: I typically respond within 30 minutes, 7 days/week.
```

#### calculator.html (Line 103)
**Current Text:**
```
We review your request (typically within 2 hours)
```
**Issue:** Should clarify this is consultation response, not support SLA
**Recommendation:** Leave as-is (this is about consultation scheduling, not support SLA)

#### calculator.html (Line 164)
**Current Text:**
```
We'll review your information and reach out within 2 hours to schedule a brief call.
```
**Issue:** Should clarify this is consultation response, not support SLA
**Recommendation:** Leave as-is (this is about consultation scheduling, not support SLA)

---

## 2. TABLE FORMATTING ISSUES (Bold Tags in Content Cells)

### CSS Rule Currently Applied:
```css
/* Override any stray bold tags in table content - FORCE normal weight */
table td strong,
table td b {
  font-weight: 400 !important;
}
```

**Issue:** CSS is overriding bold tags, but HTML still contains `<strong>` tags which violates user requirement: "nothing in the table should font and or szie wise be the same as the headers"

**User Requirement:** Remove ALL `<strong>` and `<b>` tags from table content cells (not just override with CSS)

### calculator.html (Lines 60, 65, 70, 75)

**Current HTML:**
```html
<td><strong>Shared</strong></td>          <!-- Line 60 -->
<td><strong>Dedicated</strong></td>       <!-- Line 65 -->
<td><strong>Pro</strong></td>             <!-- Line 70 -->
<td><strong>Enterprise</strong></td>      <!-- Line 75 -->
```

**Should Be:**
```html
<td>Shared</td>
<td>Dedicated</td>
<td>Pro</td>
<td>Enterprise</td>
```

### emergency.html (Lines 70, 73, 76, 79, 82, 85, 88, 91)

**Current HTML:**
```html
<td><strong>P0 - CRITICAL</strong></td>      <!-- Line 70 -->
<td><strong>30 minutes</strong></td>         <!-- Line 73 -->
<td><strong>P1 - HIGH</strong></td>          <!-- Line 76 -->
<td><strong>2 hours</strong></td>            <!-- Line 79 -->
<td><strong>P2 - MEDIUM</strong></td>        <!-- Line 82 -->
<td><strong>4 hours</strong></td>            <!-- Line 85 -->
<td><strong>P3 - LOW</strong></td>           <!-- Line 88 -->
<td><strong>Next business day</strong></td>  <!-- Line 91 -->
```

**Should Be:**
```html
<td>P0 - CRITICAL</td>
<td>30 minutes</td>
<td>P1 - HIGH</td>
<td>2 hours</td>
<td>P2 - MEDIUM</td>
<td>4 hours</td>
<td>P3 - LOW</td>
<td>Next business day</td>
```

---

## 3. PROPOSED STANDARDIZATION

### Support Response Time Standard Text (Three Variants)

**Variant 1: Full Detail (for main pages like index.html, about.html, reliability.html)**
```
Email: 4-hour SLA (business hours), typically 30-min response. Critical outages: IMMEDIATE. Slack: +$29/mo or included with Pro/Enterprise
```

**Variant 2: Medium Detail (for sections like docs.html)**
```
Support: 4-hour SLA (business hours), typically 30-min response, 7 days/week. Critical outages: IMMEDIATE
```

**Variant 3: Short Form (for contact sections)**
```
Response time: 4-hour SLA (business hours), typically 30-min, 7 days/week
```

### Files to Update (Support Times)

1. **about.html:**
   - Line 280: Use Variant 1
   - Line 348: Use Variant 3
   - Line 215: Use Variant 2

2. **activity.html:**
   - Line 57: Use Variant 2

3. **docs.html:**
   - Line 61: Use Variant 2
   - Line 70: Use Variant 3
   - Line 127: Use Variant 3
   - Line 183: Use Variant 3
   - Line 383: Use Variant 3

4. **index.html:**
   - Line 81: Use Variant 2
   - Line 88: Replace with "Official SLA: 4-hour response (business hours). Reality: I typically respond within 30 minutes, 7 days/week."

### Files to Update (Table Bold Tags)

1. **calculator.html:**
   - Lines 60, 65, 70, 75: Remove `<strong>` tags from tier names

2. **emergency.html:**
   - Lines 70, 73, 76, 79, 82, 85, 88, 91: Remove `<strong>` tags from priority levels and response times

---

## 4. VERIFICATION CHECKLIST

After making changes:

- [ ] Search all HTML files for "2 hours" or "2-hour" in support context
- [ ] Search all HTML files for "30 minutes" or "30-min" as guaranteed response
- [ ] Search all HTML files for "first 5 customers" in support response context
- [ ] Verify all table cells (`<td>`) have NO `<strong>` or `<b>` tags
- [ ] Verify support SLA is consistent: "4-hour SLA (business hours)"
- [ ] Verify typical response is consistent: "typically 30-min"
- [ ] Verify critical outage response is consistent: "IMMEDIATE"
- [ ] Test website locally to verify table formatting looks correct

---

## 5. KEY PRINCIPLES

1. **Official SLA:** 4-hour response (business hours: M-F 9am-6pm ET)
2. **Typical Reality:** 30-minute response, 7 days/week
3. **Critical Outages:** IMMEDIATE response (automated alerts 24/7)
4. **Underpromise, Overdeliver:** Never guarantee 30-min as SLA, show it as typical behavior
5. **Table Formatting:** Headers visually different from content (CSS + no HTML bold tags in cells)

---

**END OF REPORT**
