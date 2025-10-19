# Customer Backup Calendar - Transparency in Action

**Purpose:** Give customers a public calendar they can subscribe to showing scheduled backups and maintenance windows.

**Why This Is Great:**
- ✅ Builds trust (customers see backups actually happening)
- ✅ Transparency (they know your schedule)
- ✅ Professional (shows you're organized)
- ✅ Self-service (reduces "did my backup run?" emails)

---

## Option 1: Google Calendar (Recommended - Free & Easy)

### Setup (One-Time)

1. **Create a Google Calendar for CostPlusDB Operations**
   - Go to https://calendar.google.com
   - Click "+" next to "Other calendars"
   - Select "Create new calendar"
   - Name: "CostPlusDB Operations"
   - Description: "Scheduled backups and maintenance windows for CostPlusDB customers"
   - Time zone: Central Time (US)
   - Click "Create calendar"

2. **Make Calendar Public**
   - Click the 3 dots next to your new calendar
   - Select "Settings and sharing"
   - Under "Access permissions for events":
     - Check "Make available to public"
     - Set to "See all event details"
   - Click "Save"

3. **Add Recurring Backup Event**
   - Click "Create" → "Event"
   - Title: "🔒 Automated Database Backups (All Customers)"
   - Date: Today
   - Time: 2:00 AM - 2:30 AM CST
   - Repeat: Daily
   - Description:
     ```
     Daily encrypted backups for all CostPlusDB databases.

     - Backs up to local storage (repo1)
     - Backs up to Wasabi S3 cloud (repo2)
     - Encrypted with AES-256-CBC
     - Retention: 30 days full backups, 7 days point-in-time recovery

     Backup logs: Available upon request
     Status: You'll receive email if YOUR backup fails

     Questions? jeremy@intentsolutions.io
     ```
   - Click "Save"

4. **Get Shareable Link**
   - Go to calendar settings
   - Scroll to "Integrate calendar"
   - Copy the "Public address in iCal format" (this is the subscribe link)
   - It looks like: `https://calendar.google.com/calendar/ical/[long_id]/public/basic.ics`

5. **Get Public URL**
   - Also copy the "Public URL to this calendar"
   - It looks like: `https://calendar.google.com/calendar/embed?src=[id]`

---

## What Customers See

When they subscribe to your calendar, they see:

**Recurring Events:**
- 🔒 Daily Automated Backups (2:00 AM CST)
- 🔧 Weekly Security Updates (Sundays 3:00 AM CST)
- 📊 Monthly Backup Restoration Test (First Saturday 10:00 AM CST)

**Ad-Hoc Events:**
- ⚠️ Scheduled Maintenance: PostgreSQL Update (with 7-day advance notice)
- 🚨 Emergency Maintenance: [if needed]

---

## Add Calendar Link to Customer Welcome Email

Update your welcome email template (in 009-DR-GUID-client-onboarding-process.md):

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BACKUP SCHEDULE (Subscribe to Calendar!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your database is backed up daily at 2:00 AM CST.

📅 Subscribe to our operations calendar to see:
- Daily backup schedule
- Scheduled maintenance windows
- System updates

🔗 Add to your calendar (choose one):

Apple Calendar / Outlook:
[Paste iCal URL here]

Google Calendar:
1. Click this link: [Paste public URL here]
2. Click "+ Google Calendar" button (bottom right)

You'll see all scheduled backups and maintenance in your calendar app!
```

---

## Automatically Update Calendar When Backups Complete

### Option A: Manual Updates (Simple)

After each backup completes, add a one-time event:

**Title:** `✅ Backup Completed - [Date]`
**Description:**
```
All databases backed up successfully.

Repo1 (Local): ✅ Complete
Repo2 (Wasabi S3): ✅ Complete

Backup size: [X GB]
Duration: [X minutes]

Next backup: Tomorrow at 2:00 AM CST
```

### Option B: Automated via Google Calendar API (Advanced)

Create a script that posts to Google Calendar when backup completes.

**Prerequisites:**
- Google Calendar API enabled
- OAuth credentials
- Python with google-api-python-client

**Python Script: `post-backup-to-calendar.py`**

```python
#!/usr/bin/env python3
import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Service account credentials
SCOPES = ['https://www.googleapis.com/auth/calendar']
SERVICE_ACCOUNT_FILE = '/root/.google-calendar-key.json'
CALENDAR_ID = 'your-calendar-id@group.calendar.google.com'

credentials = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=SCOPES)

service = build('calendar', 'v3', credentials=credentials)

# Create event
event = {
    'summary': '✅ Backup Completed',
    'description': 'All CostPlusDB databases backed up successfully.\n\n'
                   'Repo1 (Local): ✅\n'
                   'Repo2 (Wasabi S3): ✅\n\n'
                   'Next backup: Tomorrow at 2:00 AM CST',
    'start': {
        'dateTime': datetime.datetime.utcnow().isoformat() + 'Z',
        'timeZone': 'America/Chicago',
    },
    'end': {
        'dateTime': (datetime.datetime.utcnow() + datetime.timedelta(minutes=30)).isoformat() + 'Z',
        'timeZone': 'America/Chicago',
    },
}

event = service.events().insert(calendarId=CALENDAR_ID, body=event).execute()
print(f'Event created: {event.get("htmlLink")}')
```

**Update backup script to call this:**

```bash
# At end of backup-to-both-repos.sh
if [ $? -eq 0 ]; then
    /usr/bin/python3 /home/admincostplus/scripts/post-backup-to-calendar.py
fi
```

---

## What to Put on Calendar

### Recurring Events (Always Visible)

**Daily:**
- 🔒 2:00 AM CST - Automated Database Backups

**Weekly:**
- 🔧 Sunday 3:00 AM CST - Security Updates
- 📊 Saturday 10:00 AM CST - Backup Verification

**Monthly:**
- 🧪 First Saturday 10:00 AM CST - Backup Restoration Test
- 📈 Last day of month - Monthly Invoices Sent

### Ad-Hoc Events (As Needed)

**Maintenance:**
- ⚠️ [Date/Time] - Scheduled Maintenance: [Reason]
  - Add 7+ days in advance
  - Include expected duration
  - Note if downtime expected

**Incidents:**
- 🚨 [Date/Time] - Incident Response: [Description]
  - Real-time updates during outages
  - Post-mortem after resolution

---

## Customer Instructions (Add to Docs Page)

Add this to `website/docs.html`:

```html
<details>
<summary><strong>How do I see when backups run?</strong></summary>
<p>Subscribe to our public operations calendar! You'll see:</p>
<ul>
<li>✅ Daily backup schedule (2:00 AM CST)</li>
<li>✅ Scheduled maintenance windows</li>
<li>✅ Security updates</li>
<li>✅ System status</li>
</ul>

<p><strong>Subscribe to calendar:</strong></p>

<p><strong>Apple Calendar / Outlook:</strong><br>
Add calendar by URL: <code>[Your iCal URL]</code></p>

<p><strong>Google Calendar:</strong><br>
<a href="[Your public URL]" target="_blank">Click here to add to Google Calendar</a></p>

<p>The calendar updates automatically. You'll always know what's happening with your database!</p>
</details>
```

---

## Alternative: Simple Status Page

If you don't want to use Google Calendar, create a simple status page:

**`website/status.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CostPlusDB System Status</title>
  <meta http-equiv="refresh" content="300"> <!-- Refresh every 5 min -->
  <link rel="stylesheet" href="src/reset.css">
  <link rel="stylesheet" href="src/index.css">
  <link rel="stylesheet" href="src/theme.css">
</head>
<body>

<h1>CostPlusDB System Status</h1>

<h2>Current Status</h2>
<p><strong>All Systems:</strong> ✅ Operational</p>
<p><strong>Last Updated:</strong> <span id="last-update">2025-10-19 12:00 CST</span></p>

<hr>

<h2>Last Backup</h2>
<table>
<tr><th>Date</th><td>2025-10-19 02:00 CST</td></tr>
<tr><th>Local (repo1)</th><td>✅ Complete (4.2 MB)</td></tr>
<tr><th>Cloud (repo2)</th><td>✅ Complete (4.2 MB)</td></tr>
<tr><th>Duration</th><td>2 minutes 15 seconds</td></tr>
</table>

<hr>

<h2>Next Scheduled Backup</h2>
<p>Tomorrow at 2:00 AM CST (Daily)</p>

<hr>

<h2>Upcoming Maintenance</h2>
<p>No maintenance scheduled. We'll notify you 7 days in advance.</p>

<hr>

<h2>Subscribe to Calendar</h2>
<p>Get backup schedule and maintenance windows in your calendar:</p>
<p><a href="[Your calendar URL]">Add CostPlusDB Operations Calendar</a></p>

</body>
</html>
```

**Update this page automatically via script:**

```bash
# Generate status page
cat > /var/www/html/status.html <<EOF
<!-- Auto-generated at $(date) -->
Last Backup: $(date)
Status: ✅ Operational
EOF
```

---

## Comparison: Calendar vs Status Page

| Feature | Google Calendar | Status Page |
|---------|----------------|-------------|
| Setup Time | 10 minutes | 30 minutes |
| Customer UX | Subscribe once, always updated | Must visit page |
| Maintenance | Auto-updates | Manual updates |
| Cost | Free | Free |
| Integration | Works in all calendar apps | Standalone page |
| Transparency | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

**Recommendation:** Start with Google Calendar (easier, better UX)

---

## Sample Calendar Events

**Daily Backup (Recurring)**
```
Title: 🔒 Automated Database Backups
Time: 2:00 AM - 2:30 AM CST
Repeat: Daily
Description:
  Daily encrypted backups for all CostPlusDB databases.
  - Local repo (repo1): Fast recovery
  - Cloud repo (repo2): Disaster recovery via Wasabi S3

  Your database is included in this backup.

  Questions? jeremy@intentsolutions.io
```

**Scheduled Maintenance (Ad-Hoc)**
```
Title: ⚠️ Scheduled Maintenance: PostgreSQL Security Update
Time: 2025-10-26 at 3:00 AM - 3:30 AM CST
Description:
  Applying PostgreSQL 16.4 security update.

  Expected downtime: 10-15 minutes
  Impact: Brief connection interruption

  Your database will be backed up before maintenance.
  We'll email you when complete.

  Questions? jeremy@intentsolutions.io
```

**Incident (Real-Time)**
```
Title: 🚨 INCIDENT: Investigating Database Connection Issues
Time: 2025-10-20 at 10:45 AM CST
Description:
  We're investigating reports of slow connections.

  Impact: Degraded performance (queries taking 2-3x longer)
  Status: Investigating

  Updates:
  - 10:45 AM: Issue detected, investigating
  - 10:52 AM: Root cause identified (network congestion)
  - 11:05 AM: Fix applied, monitoring
  - 11:20 AM: RESOLVED

  Post-mortem: [Link to incident report]
```

---

## Customer Communication

**In welcome email:**
> 📅 Want to see when your backups run? Subscribe to our operations calendar! You'll see all scheduled backups, maintenance windows, and system updates. [Add Calendar Link]

**On website:**
> All CostPlusDB operations are transparent. Subscribe to our public calendar to see scheduled backups and maintenance windows.

**In monthly invoice email:**
> 📅 Reminder: Subscribe to our operations calendar to see your backup schedule: [Calendar Link]

---

## Next Steps

1. **Today:** Create Google Calendar and add recurring backup event
2. **Before first customer:** Add calendar link to welcome email template
3. **After first customer:** Test that they can subscribe and see events
4. **Optional:** Set up automated calendar updates via API

---

**This is a GREAT idea for transparency. Customers will love seeing the actual backup schedule in their calendar!**

Jeremy Longshore
CostPlusDB
jeremy@intentsolutions.io
