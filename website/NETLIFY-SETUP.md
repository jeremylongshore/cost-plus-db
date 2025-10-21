# Netlify Form Notifications - Quick Setup

## ✅ What's Already Done

1. **Netlify Function Created**: `netlify/functions/form-notify.js`
   - Sends email via **your existing Resend API**
   - Sends Slack notification (optional)
   - Beautiful HTML email template

2. **Form Updated**: `calculator.html`
   - Form now submits to: `/.netlify/functions/form-notify`
   - Netlify automatically collects form data

3. **Configuration**: `netlify.toml`
   - Functions directory configured
   - Instructions for environment variables

---

## 🚀 Setup Steps (5 minutes)

### Step 1: Add Resend API Key to Netlify

1. Go to: **Netlify Dashboard** → your site → **Site settings**
2. Navigate to: **Build & deploy** → **Environment variables**
3. Click: **Add a variable**
4. Add:
   - **Key**: `RESEND_API_KEY`
   - **Value**: (your actual Resend API key from backend/.env)
5. Click: **Save**

### Step 2: (Optional) Add Slack Webhook

1. Create Slack webhook:
   - Go to: https://api.slack.com/apps
   - Create New App → Incoming Webhooks → Enable
   - Add to workspace → Copy webhook URL

2. Add to Netlify:
   - Same place as Step 1
   - **Key**: `SLACK_WEBHOOK_URL`
   - **Value**: `https://hooks.slack.com/services/YOUR/WEBHOOK/URL`

### Step 3: Deploy to Netlify

```bash
cd website
git add .
git commit -m "Add form notifications via Resend and Slack"
git push origin main
```

Netlify will auto-deploy.

### Step 4: Test the Form

1. Go to: https://your-site.netlify.app/calculator.html
2. Fill out the form
3. Submit
4. Check email: jeremy@intentsolutions.io (should arrive within seconds)
5. Check Slack: (if configured)

---

## 📧 What You'll Receive

### Email Notification (via Resend)

**To**: jeremy@intentsolutions.io
**Subject**: 🔔 New Consultation Request - CostPlusDB

Beautiful HTML email with:
- Customer name, email, company
- Tier of interest
- Timeline
- Current database details
- Requirements/questions
- Next steps checklist

### Slack Notification (optional)

Formatted message in your chosen Slack channel with all form data.

---

## 🔧 Troubleshooting

**Email not arriving?**
- Check Netlify Deploy logs for errors
- Verify RESEND_API_KEY is set correctly
- Check spam folder
- Test Resend API key separately

**Slack not working?**
- Verify SLACK_WEBHOOK_URL is correct
- Test webhook with:
  ```bash
  curl -X POST -H 'Content-Type: application/json' \
    -d '{"text":"Test from CostPlusDB"}' \
    YOUR_WEBHOOK_URL
  ```

**Function not triggering?**
- Check Netlify Functions tab in dashboard
- View function logs
- Ensure form action is: `/.netlify/functions/form-notify`

---

## 📁 Files Created

```
website/
├── netlify/
│   └── functions/
│       ├── form-notify.js     # Notification function
│       └── package.json       # Dependencies
├── netlify.toml               # Updated with functions config
└── calculator.html            # Updated form action
```

---

## 🎯 Next Steps

1. Add RESEND_API_KEY to Netlify
2. (Optional) Create Slack webhook + add to Netlify
3. Deploy to Netlify
4. Test form submission
5. Celebrate! 🎉

---

**Questions?** See full guide: `000-docs/055-DR-GUID-netlify-form-notifications-setup.md`
