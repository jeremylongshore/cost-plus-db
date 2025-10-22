# Website Inconsistencies Report - 2025-10-21

## CRITICAL: Prompt Contains Incorrect Information

### 1. PRICING - PROMPT IS WRONG ❌

**Prompt claims:**
- Shared: $79/month
- Dedicated: $149/month
- Pro: $199/month
- Enterprise: $299/month

**ACTUAL PRICING (from v1.1.0 released 2025-10-21):**
- Shared: $59/month ✅
- Dedicated: $119/month ✅
- Pro: $179/month ✅
- Enterprise: $299/month ✅

**Source:** website/calculator.html lines 143-146, v1.1.0 pricing update

---

## 2. SUPPORT RESPONSE TIMES - WEBSITE IS INCONSISTENT ⚠️

The website makes **FOUR DIFFERENT CLAIMS** about response times:

### Claims Found:

1. **"30 minutes, 7 days/week"**
   - index.html line 87: "I respond to all inquiries within 30 minutes, 7 days a week"
   - about.html line 179: "I actually respond to emails within 30 minutes, 7 days a week"
   - docs.html line 127: "Within 30 minutes, 7 days a week" (for first 5 customers)
   - docs.html line 183: "I respond within 30 minutes, 7 days a week (first 5 customers)"

2. **"4-hour response (business hours)"**
   - index.html line 80: "Email support: 4-hour response (business hours), 30-min for first 5 customers"
   - index.html line 183: "4-hour response (business hours), 30-min for first 5 customers"
   - docs.html line 61: "4-hour response time (business hours)"
   - about.html line 280: "Email (4-hour response)"

3. **"2 hours during business hours"**
   - docs.html line 70: "Response within 2 hours during business hours"
   - docs.html line 383: "Within 2 hours (business hours)"
   - about.html line 348: "Within 2 hours (business hours)"

4. **"Within 2 hours"** (no business hours qualification)
   - calculator.html line 103: "We review your request (typically within 2 hours)"

### Analysis:

The founder makes a **personal commitment** to 30-minute response, 7 days/week:
- "I actually respond to emails within 30 minutes, 7 days a week" (about.html)
- "I respond to all inquiries within 30 minutes, 7 days a week" (index.html)

But the **official SLA** appears to be:
- First 5 customers: 30 minutes, 7 days/week
- After first 5: 4-hour response, business hours (M-F 9am-6pm ET)

### RECOMMENDATION:

**Option A: Conservative (Underpromise, Overdeliver)**
- Official SLA: 4-hour response, business hours (M-F 9am-6pm ET)
- Actual practice: Founder typically responds in 30 minutes, 7 days/week
- Messaging: "SLA is 4 hours during business hours, but I typically respond within 30 minutes, 7 days/week"

**Option B: Aggressive (Match Founder's Personal Commitment)**
- Official SLA: 30-minute response, 7 days/week
- Puts pressure on solo founder
- Messaging: "30-minute response time, 7 days a week"

**Prompt wants Option B.**

---

## 3. INFRASTRUCTURE COSTS - CORRECT ✅

**Prompt claims:** Contabo VPS at $10.35/month

**Website states:**
- Contabo VPS-M: $10.35/month (various transparency pages)

**Status:** CORRECT ✅

---

## 4. UPTIME SLA - CORRECT ✅

**Prompt claims:** 99.9% uptime SLA

**Website states:**
- No explicit uptime SLA found on public pages
- Emergency page mentions monitoring but no specific SLA

**Status:** Prompt adds 99.9% SLA - this is NEW information, not inconsistent

---

## 5. BACKUP RETENTION - CORRECT ✅

**Prompt claims:**
- 7-day retention (Shared/Dedicated)
- 30-day retention (Pro/Enterprise)

**Website states:**
- index.html line 167: "7-day Shared/Dedicated, 30-day Pro/Enterprise"
- docs.html line 158: "7 days (Shared/Dedicated), 30 days (Pro/Enterprise)"

**Status:** CORRECT ✅

---

## 6. SLACK SUPPORT PRICING - CORRECT ✅

**Prompt claims:** +$29/mo (included with Pro/Enterprise)

**Website states:**
- index.html line 81: "+$29/mo (Shared/Dedicated) or included (Pro/Enterprise)"
- index.html line 183: "Slack: +$29/mo or included with Pro/Enterprise"

**Status:** CORRECT ✅

---

## REQUIRED FIXES BEFORE CREATING RELIABILITY PAGE:

### 1. Fix Pricing in Prompt (CRITICAL)
- [ ] Change Shared: $79 → $59
- [ ] Change Dedicated: $149 → $119
- [ ] Change Pro: $199 → $179
- [ ] Keep Enterprise: $299

### 2. Decide on Support Response Time Standard
- [ ] Option A: 4-hour SLA (business hours) with "typically 30-min" note
- [ ] Option B: 30-minute SLA (7 days/week) as official commitment
- [ ] Update ALL pages to match chosen standard

### 3. Fix Add-On Pricing in Prompt
Current prompt shows various add-ons. Verify these are correct:
- [ ] Slack support: +$29/mo ✅
- [ ] Extended backups: +$15/mo (need to verify)
- [ ] Hot standby replica: +$99/mo (need to verify - not found on site)
- [ ] Cross-region backup: +$25/mo (need to verify - not found on site)
- [ ] High availability: +$179/mo (need to verify - not found on site)
- [ ] Priority support: +$49/mo (need to verify - not found on site)

---

## NEXT STEPS:

1. Get user confirmation on:
   - Correct pricing ($59/$119/$179/$299)
   - Support response time standard (30-min vs 4-hour)
   - Add-on pricing accuracy

2. Create reliability.html with CORRECT information

3. Consider fixing inconsistencies across entire site in separate commit
