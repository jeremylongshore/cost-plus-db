# Slack Notifications for Form Submissions

**Goal:** Get notified in Slack when someone submits the database request form on costplusdb.dev

---

## Option 1: Netlify Built-In Slack Integration (Recommended)

### Step 1: Get Slack Webhook URL

1. Go to your Slack workspace
2. Click your workspace name → Settings & administration → Manage apps
3. Search for "Incoming Webhooks" and add it
4. Click "Add to Slack"
5. Choose a channel (e.g., #costplusdb-leads or #notifications)
6. Copy the Webhook URL (looks like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`)

### Step 2: Configure Netlify

1. Log into Netlify (https://app.netlify.com)
2. Go to your CostPlusDB site
3. Click **Site settings** → **Forms** → **Form notifications**
4. Click **Add notification** → **Slack**
5. Paste your Slack Webhook URL
6. Choose the form: `database-request`
7. Save

**Done!** Now when someone submits the form, you'll get a Slack message.

---

## Option 2: Zapier (More Control, Requires Free Account)

### Step 1: Create Zapier Account

1. Go to https://zapier.com and sign up (free plan is fine)

### Step 2: Create Zap

1. Click **Create Zap**
2. **Trigger:** Search for "Netlify" → Choose "New Form Submission"
3. Connect your Netlify account
4. Select your site: `cost-plus-db`
5. Select form: `database-request`
6. Test trigger (submit a test form first)

### Step 3: Configure Slack Action

1. **Action:** Search for "Slack" → Choose "Send Channel Message"
2. Connect your Slack account
3. Choose channel: `#costplusdb-leads` (or wherever you want notifications)
4. Customize message:

```
🚀 New Database Request!

Email: {{email}}
Company: {{company}}
Config: {{config}}

Time: {{submission_time}}
```

5. Test the action
6. Turn on the Zap

**Done!** You'll get formatted Slack messages when someone submits the form.

---

## Option 3: Custom Netlify Function + Slack (Advanced)

If you want custom logic (e.g., parse the config JSON, different channels for different tiers), you can create a Netlify Function.

**Steps:**

1. Create `netlify/functions/form-submission.js`:

```javascript
const fetch = require('node-fetch');

exports.handler = async (event) => {
  // Only run on form submissions
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Parse form data
  const data = JSON.parse(event.body);
  const payload = data.payload;

  // Parse config JSON if present
  let config = {};
  try {
    config = JSON.parse(payload.data.config);
  } catch (e) {
    config = { raw: payload.data.config };
  }

  // Format Slack message
  const slackMessage = {
    text: '🚀 New Database Request!',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🚀 New Database Request!*`
        }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Email:*\n${payload.data.email}` },
          { type: 'mrkdwn', text: `*Company:*\n${payload.data.company || 'N/A'}` },
          { type: 'mrkdwn', text: `*Tier:*\n${config.tier || 'Unknown'}` },
          { type: 'mrkdwn', text: `*Price:*\n$${config.pricing?.totalPrice || 'Unknown'}/mo` }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Notes:*\n${payload.data.notes || 'None'}`
        }
      }
    ]
  };

  // Send to Slack
  const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

  await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(slackMessage)
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Notification sent' })
  };
};
```

2. Add Slack Webhook URL to Netlify environment variables:
   - Site settings → Build & deploy → Environment variables
   - Add: `SLACK_WEBHOOK_URL` = `https://hooks.slack.com/services/...`

3. Configure form notification to trigger this function:
   - Site settings → Forms → Form notifications
   - Add notification → **Outgoing webhook**
   - URL: `https://costplusdb.dev/.netlify/functions/form-submission`

**Done!** You get rich, formatted Slack notifications with parsed config data.

---

## Recommended Setup (Easiest)

**Start with Option 1 (Netlify Built-In Slack Integration)**

It's the fastest and requires zero code. You can always upgrade to Zapier or custom functions later if you want more control.

---

## What You'll Get

When someone submits the form, you'll receive:

```
New form submission from database-request

email: customer@example.com
company: ACME Corp
notes: Need HIPAA compliance
config: {"tier":"dedicated","tierSpecs":"8GB RAM, 200GB storage",...}
```

Then you can respond to them within your 4-hour SLA!

---

## Next Steps

1. Choose which option above (I recommend Option 1)
2. Follow the steps
3. Submit a test form at costplusdb.dev/calculator.html
4. Verify you get the Slack notification
5. Done!

Let me know if you need help with any of these steps.
