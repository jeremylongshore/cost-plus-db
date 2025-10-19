# CostPlusDB Deployment Guide

**One-time setup. After this, you just `git push` and it auto-deploys.**

---

## 🚀 Step 1: Push to GitHub

```bash
# Make sure you're in the project directory
cd /home/admincostplus/projects/costplusdb

# Push to GitHub (you'll need to do this manually)
git push -u origin main
```

**If you get authentication error:**

### Option A: Use GitHub CLI (Recommended)
```bash
# Install gh (if not installed)
# Ubuntu/Debian:
type -p curl >/dev/null || sudo apt install curl -y
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
&& sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
&& echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
&& sudo apt update \
&& sudo apt install gh -y

# Login
gh auth login

# Push
git push -u origin main
```

### Option B: Use Personal Access Token
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name: "CostPlusDB Deploy"
4. Check scope: `repo` (full control of private repositories)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)
7. When git asks for password, paste the token

---

## 🌐 Step 2: Deploy to Netlify (5 minutes)

### A. Connect Netlify to GitHub

1. **Go to:** https://app.netlify.com
2. **Sign up** (if needed) - use your GitHub account for easy auth
3. **Click:** "Add new site" → "Import an existing project"
4. **Choose:** GitHub
5. **Authorize** Netlify (allow access to your repos)
6. **Select repository:** `jeremylongshore/cost-plus-db`

### B. Configure Build Settings

```
Base directory:    website
Build command:     (leave empty)
Publish directory: .
```

**Why `website`?** That's where your HTML files are.

7. **Click:** "Deploy site"

Wait 30-60 seconds for first deploy to complete.

---

## ⚙️ Step 3: Configure Site Settings

### A. Change Site Name

1. Go to: **Site settings** → **General** → **Site details**
2. Click **"Change site name"**
3. Enter: `costplusdb`
4. Now your site is: `https://costplusdb.netlify.app`

### B. Set Up Form Notifications (IMPORTANT!)

1. Go to: **Site settings** → **Forms**
2. Click **"Form notifications"** → **"Add notification"**
3. Choose: **"Email notification"**
4. Configure:
   ```
   Email to notify: hello@intentsolutions.io
   Form: database-request
   ```
5. **Save**

Now when someone submits the calculator form, you get an email instantly!

### C. Test the Form

1. Go to: `https://costplusdb.netlify.app/calculator.html`
2. Fill out the form with test data
3. Submit
4. Check your email at `hello@intentsolutions.io`
5. Check Netlify dashboard: **Forms** → You'll see the submission

---

## 🔒 Step 4: Add Custom Domain (Optional)

If you own `costplusdb.dev` or another domain:

### A. In Netlify

1. **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Enter: `costplusdb.dev`
4. Click **"Verify"** → **"Add domain"**

### B. In Your Domain Registrar

Add these DNS records:

```
Type: A
Name: @
Value: 75.2.60.5
TTL: 3600

Type: CNAME
Name: www
Value: costplusdb.netlify.app
TTL: 3600
```

### C. Wait & Verify

- DNS propagation: 5-60 minutes
- Netlify auto-provisions SSL (Let's Encrypt)
- Check: `https://costplusdb.dev` should work with green lock

---

## ✅ Step 5: Test Auto-Deploy

Now test that pushing to GitHub auto-deploys:

```bash
# Make a small change
echo "<!-- test auto-deploy -->" >> website/index.html

# Commit
git add -A
git commit -m "Test auto-deploy"

# Push
git push

# Watch it deploy automatically!
# Check: https://app.netlify.com/sites/costplusdb/deploys
# Should show: Building → Published (30-60 seconds)
```

---

## 🎯 Your Workflow Going Forward

### Daily Development

```bash
# 1. Make changes
vim website/calculator.html

# 2. Test locally (server should still be running)
# Open: http://localhost:8000/calculator.html

# 3. Commit and push
git add -A
git commit -m "Update calculator pricing"
git push

# 4. Netlify auto-deploys in 30 seconds
# Live at: https://costplusdb.netlify.app
```

### Stop Local Server (if needed)

```bash
# Find the process
ps aux | grep "python3 -m http.server"

# Kill it
kill <PID>

# Or just close the terminal
```

### Restart Local Server

```bash
cd /home/admincostplus/projects/costplusdb/website
python3 -m http.server 8000
```

---

## 📧 How Forms Work

### When Customer Submits Form

1. **Customer fills out:** Calculator form on your site
2. **Netlify receives:** Form data automatically
3. **You get email:** Instant notification at `hello@intentsolutions.io`
4. **Customer sees:** Thank you page
5. **You review:**
   - Check Netlify Forms dashboard
   - See: email, company, config (RAM, storage, provider)
   - Decide: Accept or decline customer

### Email You'll Receive

```
Subject: New form submission - database-request

From: Netlify

email: customer@example.com
company: Acme Corp
notes: Need HIPAA compliance
config: {"ram":8,"storage":200,"provider":"contabo",...}
```

### Your Response Workflow

1. **Review request** (is this a good fit customer?)
2. **If YES:**
   - Create Stripe payment link (manual for now)
   - Email customer with payment link + welcome
   - After payment: Follow SOP-103 to provision
3. **If NO:**
   - Reply politely: "Thanks for interest, not a good fit right now"

---

## 🔧 Netlify Features You Get Automatically

✅ **Auto-deploy on push** - Every `git push` triggers deploy
✅ **Deploy previews** - Branch deploys get preview URLs
✅ **Atomic deploys** - All files update at once
✅ **Instant rollback** - Click to revert to any version
✅ **HTTPS/SSL** - Auto with Let's Encrypt
✅ **CDN** - Global edge network
✅ **Form handling** - Zero backend code needed
✅ **Spam protection** - Honeypot + Akismet

---

## 🐛 Troubleshooting

### "Failed to deploy"

Check build logs in Netlify:
- **Deploys** → Click failed deploy → **Deploy log**
- Common issues:
  - Wrong base directory (should be `website`)
  - Missing files
  - Syntax errors in HTML

### "Form not showing up in dashboard"

Make sure form has:
```html
<form name="database-request" method="POST" data-netlify="true">
```

Netlify scans HTML for `data-netlify="true"` attribute.

### "Not getting email notifications"

1. Check **Site settings** → **Forms** → **Form notifications**
2. Verify email address is correct
3. Check spam folder
4. Test with a form submission

### "Changes not showing up"

1. Check deploy status: https://app.netlify.com/sites/costplusdb/deploys
2. Clear browser cache (Ctrl+Shift+R)
3. Wait 30-60 seconds for deploy to complete

---

## 📊 Monitor Your Site

### Netlify Analytics (Optional - $9/month)

- **Site settings** → **Analytics** → **Enable**
- Privacy-friendly (no cookies)
- Shows: Page views, unique visitors, top pages
- Alternative free option: Plausible (self-hosted)

### Form Submissions

- **Forms** tab in Netlify dashboard
- See all submissions
- Download as CSV
- Set up Zapier integration (optional)

---

## 🎉 You're Done!

Your workflow is now:

1. **Edit files** locally
2. **Test** at `http://localhost:8000`
3. **Commit** changes
4. **Push** to GitHub
5. **Netlify auto-deploys** (30 seconds)
6. **Live** at `https://costplusdb.netlify.app`

**No GitHub Actions. No complicated CI/CD. Just works.**

---

## 📝 Next Steps

- [ ] Push code to GitHub
- [ ] Connect Netlify
- [ ] Set up form notifications
- [ ] Test a form submission
- [ ] Add custom domain (optional)
- [ ] Replace privacy/terms placeholders
- [ ] Convert transparency docs to HTML
- [ ] Launch! 🚀

---

## 📧 Need Help?

If you get stuck:
1. Check Netlify docs: https://docs.netlify.com
2. Check deploy logs in Netlify dashboard
3. Google the error message
4. Email: support@netlify.com (they're very responsive)

---

**Built with ❤️ using:**
- Netlify (hosting + forms)
- GitHub (code repository)
- Fira Code font
- Monospace Web framework
