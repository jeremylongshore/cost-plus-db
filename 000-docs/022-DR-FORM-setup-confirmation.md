# CostPlusDB - Database Setup Confirmation

**Customer:** {COMPANY_NAME}
**Database:** {DATABASE_NAME}
**Setup Date:** {SETUP_DATE}
**Customer ID:** {CUSTOMER_ID}

---

## ✅ Your Database is Ready!

Your PostgreSQL database has been provisioned and is ready to use. Below are your connection details and important information.

---

## 🔐 Database Credentials

**⚠️ IMPORTANT: Store these credentials securely. Do not commit to version control.**

```
Database Host:     costplusdb.dev
Database Port:     5432
Database Name:     {DATABASE_NAME}
Database User:     {DATABASE_USER}
Database Password: {DATABASE_PASSWORD}
SSL Mode:          require (mandatory)
```

### Connection String

```
postgresql://{DATABASE_USER}:{DATABASE_PASSWORD}@costplusdb.dev:5432/{DATABASE_NAME}?sslmode=require
```

**Copy-paste ready for your app config:**

```bash
# .env file format
DATABASE_URL=postgresql://{DATABASE_USER}:{DATABASE_PASSWORD}@costplusdb.dev:5432/{DATABASE_NAME}?sslmode=require
```

---

## 🧪 Test Your Connection

**Using psql (PostgreSQL CLI):**

```bash
psql "postgresql://{DATABASE_USER}:{DATABASE_PASSWORD}@costplusdb.dev:5432/{DATABASE_NAME}?sslmode=require"
```

**Using TablePlus, DBeaver, or pgAdmin:**

```
Host:     costplusdb.dev
Port:     5432
Database: {DATABASE_NAME}
Username: {DATABASE_USER}
Password: {DATABASE_PASSWORD}
SSL Mode: Require
```

**Quick test query:**

```sql
SELECT version();
```

You should see: `PostgreSQL 16.x on x86_64-pc-linux-gnu`

---

## 📦 Your Plan Details

**Tier:** {PLAN_TIER}
**Monthly Cost:** ${PLAN_PRICE}
**Storage Limit:** {STORAGE_LIMIT}
**Included Features:**
- {FEATURE_1}
- {FEATURE_2}
- {FEATURE_3}

**Billing Cycle:** Monthly on the {BILLING_DAY}
**First Invoice Date:** {FIRST_INVOICE_DATE}
**Payment Method:** {PAYMENT_METHOD}

---

## 💾 Backup Information

**Your database is backed up automatically:**

| Feature | Details |
|---------|---------|
| Backup Schedule | Daily at 1:00 AM CT |
| Retention Period | 30 days (rolling) |
| Storage Locations | Local server + Wasabi S3 (encrypted) |
| Point-in-Time Recovery | {PITR_DAYS} days |
| Encryption | AES-256-CBC |
| Next Backup | {NEXT_BACKUP_DATE} at 1:00 AM CT |

**How to request a restore:**
1. Email jeremy@intentsolutions.io
2. Subject: "RESTORE REQUEST - {CUSTOMER_ID}"
3. Specify date/time to restore to
4. We'll restore within 30 minutes during business hours

---

## 🔒 Security Features Enabled

**Your database includes these security features:**

✅ **SSL/TLS Encryption** - All connections encrypted in transit
✅ **Encrypted Backups** - AES-256-CBC encryption at rest
✅ **Failed Login Protection** - 5 failed attempts = automatic IP ban for 1 hour
✅ **Connection Logging** - All connection attempts logged
✅ **Intrusion Prevention** - fail2ban monitors PostgreSQL authentication
✅ **Daily Security Scans** - Automated security monitoring
{PGBOUNCER_STATUS}

**Connection Security Notes:**
- SSL/TLS is **required** - you cannot connect without it
- Your database user has restricted permissions (cannot drop the database itself)
- All failed login attempts are logged and monitored
- After 5 failed login attempts, your IP will be banned for 1 hour automatically

---

## 📊 Monitoring & Alerts

**You will receive email alerts for:**
- Database downtime (if unreachable for > 2 minutes)
- Disk space warnings (at 85% capacity)
- Backup failures
- Security events (unusual activity detected)

**Alert email:** {CUSTOMER_EMAIL}

{SLACK_INTEGRATION_STATUS}

---

## 📞 Support Information

**Email Support:** jeremy@intentsolutions.io

**Response Times:**
- **Critical Issues (P0):** 30 minutes during business hours, 2 hours after hours
- **Urgent Issues (P1):** 4 business hours
- **General Questions (P2):** 24 business hours

**Business Hours:** Monday-Friday, 9 AM - 5 PM CT (excluding US holidays)

**How to mark as urgent:** Include "URGENT:" in email subject

**What qualifies as critical (P0):**
- Database completely unreachable
- Data loss or corruption
- Security breach

---

## 📋 Next Steps

**1. Test your connection**
   - Use the connection string above to connect from your application
   - Run a test query to verify connectivity
   - Check that SSL is working (should see encrypted connection in logs)

**2. Import your data (if applicable)**
   - If you have an existing database dump, import it now
   - We can assist with imports during business hours if needed

**3. Update your application config**
   - Add DATABASE_URL to your environment variables
   - Update any database connection settings
   - Test your app in staging before production

**4. Set up monitoring (optional)**
   - Configure your own application-level monitoring
   - Set up query performance monitoring if needed
   - Consider adding pgBouncer connection pooling if high traffic

**5. Review security best practices**
   - Never commit database credentials to git
   - Use environment variables for connection strings
   - Rotate passwords every 90 days (we can help)
   - Limit database access to only necessary team members

---

## 🔄 Common Connection Issues

**"Connection refused" or "could not connect"**
- Check firewall allows outbound connections on port 5432
- Verify you're using the correct hostname: `costplusdb.dev`
- Ensure SSL mode is set to `require`

**"Password authentication failed"**
- Double-check password (copy-paste from this email)
- Verify username is `{DATABASE_USER}`
- Check for extra spaces in credentials

**"SSL connection error"**
- Make sure `sslmode=require` is in connection string
- Update PostgreSQL client libraries (need 9.5+)
- Check that your client supports TLS 1.2+

**Still having issues?**
- Email jeremy@intentsolutions.io with error message
- Include your application/client information
- We'll respond within 30 minutes during business hours

---

## 💳 Billing Details

**Your first invoice:**

| Item | Amount |
|------|--------|
| {PLAN_TIER} Plan ({BILLING_PERIOD}) | ${PLAN_PRICE} |
| {ADDON_1} | ${ADDON_1_PRICE} |
| {ADDON_2} | ${ADDON_2_PRICE} |
| **Total** | **${TOTAL_AMOUNT}** |

**Payment due:** {PAYMENT_DUE_DATE}
**Payment method:** {PAYMENT_METHOD}

{PAYMENT_INSTRUCTIONS}

**Invoices:** You'll receive invoices via email on the {BILLING_DAY} of each month.

---

## 📖 Useful Resources

**Documentation:**
- Security Practices: https://costplusdb.dev/security.html
- Pricing Calculator: https://costplusdb.dev/calculator.html
- Operations Manual: https://costplusdb.dev/transparency/operations-manual.html

**PostgreSQL Resources:**
- Official Docs: https://www.postgresql.org/docs/current/
- Connection Strings: https://www.postgresql.org/docs/current/libpq-connect.html
- Best Practices: https://wiki.postgresql.org/wiki/Don%27t_Do_This

**Need a GUI client?**
- TablePlus: https://tableplus.com (Mac/Windows/Linux)
- DBeaver: https://dbeaver.io (free, open source)
- pgAdmin: https://www.pgadmin.org (free, official PostgreSQL GUI)

---

## 🎉 Welcome to CostPlusDB!

Thank you for choosing CostPlusDB for your PostgreSQL hosting. We're committed to providing transparent, affordable, and reliable database service.

**Our Promise:**
- ✅ Daily backups (you saw the exact schedule above)
- ✅ 24/7 monitoring (you saw the exact thresholds)
- ✅ Fast support (you saw the response times)
- ✅ No surprise fees (you saw the full cost breakdown)
- ✅ Full transparency (all our SOPs are public)

**Questions or feedback?**
Email jeremy@intentsolutions.io anytime. We read and respond to every message.

**Ready to help us improve?**
We're a new service and constantly improving. If you encounter any issues or have suggestions, please let us know!

---

**Setup completed by:** Jeremy Longshore
**Date:** {SETUP_DATE}
**Customer ID:** {CUSTOMER_ID}

---

## 🔐 SECURITY REMINDER

**Store these credentials securely:**

1. ✅ Save in password manager (1Password, LastPass, etc.)
2. ✅ Use environment variables in your app (never hardcode)
3. ✅ Add `.env` to `.gitignore` (never commit credentials)
4. ❌ Do not share credentials via Slack/email/SMS
5. ❌ Do not commit to version control
6. ❌ Do not store in plaintext files

**Need to rotate credentials?** Email us anytime and we'll generate new credentials within 15 minutes.

---

**This confirmation email contains sensitive information. Please store securely and delete from email after saving credentials.**
