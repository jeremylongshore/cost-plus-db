# Production Deployment Checklist

**Project:** CostPlusDB Backend
**Version:** 1.0.0
**Date Created:** 2025-10-20
**Last Updated:** 2025-10-20

## Pre-Deployment Security Checklist

### 1. Secrets Management ✅

- [x] dotenv-vault installed
- [ ] **CRITICAL:** Change default admin password from `Admin123!ChangeMe`
- [ ] **CRITICAL:** Generate production JWT_SECRET (64+ characters)
- [ ] **CRITICAL:** Rotate Wasabi S3 credentials if making repo public
- [ ] Set production Resend API key
- [ ] Set production Stripe API keys
- [ ] Set production Turso database URL and token
- [ ] Encrypt .env file with dotenv-vault
- [ ] Store vault key in secure location (password manager)
- [ ] Delete .env file from production server (use .env.vault)

**Generate Production Secrets:**
```bash
# Generate JWT Secret (64 bytes, base64 encoded)
openssl rand -base64 64

# Generate Encryption Key (32 bytes, hex encoded)
openssl rand -hex 32
```

### 2. Authentication Security ✅

- [x] Argon2id password hashing configured
- [x] Account lockout after 5 failed attempts
- [x] 30-minute lockout duration
- [x] Role-based access control implemented
- [x] JWT token expiration (24 hours)
- [ ] Change default admin credentials on first login
- [ ] Create additional admin users (avoid single point of failure)
- [ ] Document password requirements for team

### 3. Database Security

- [ ] **CRITICAL:** Run all migrations on production database
- [ ] **CRITICAL:** Seed admin user with STRONG password
- [ ] Set up automated backups (cron job)
- [ ] Test backup restoration procedure
- [ ] Configure database file permissions (0600)
- [ ] Set up database monitoring
- [ ] Document database connection string securely

**Run Migrations:**
```bash
cd backend
npm run db:migrate
```

**Seed Admin User:**
```bash
# Edit password in seed script FIRST
npm run db:seed
```

### 4. Git History Cleanup (ONLY IF MAKING REPO PUBLIC)

- [ ] **BLOCKER:** Clean git history to remove Wasabi credentials
- [ ] Use BFG Repo-Cleaner or git-filter-repo
- [ ] Verify credentials removed with Gitleaks scan
- [ ] Force push cleaned history
- [ ] Rotate all exposed credentials

**Git History Cleanup:**
See: `001-security/procedures/git-history-cleanup.md`

### 5. Rate Limiting & DDoS Protection

- [ ] Configure rate limiting middleware
- [ ] Set reasonable limits (100 requests per 15 minutes)
- [ ] Configure Cloudflare or similar CDN
- [ ] Enable Cloudflare DDoS protection
- [ ] Configure fail2ban on server
- [ ] Set up IP whitelisting for admin routes (optional)

**Rate Limiting Configuration:**
```typescript
// Already configured in .env
RATE_LIMIT_WINDOW_MS=900000      // 15 minutes
RATE_LIMIT_MAX_REQUESTS=100      // 100 requests per window
```

### 6. CORS Configuration

- [ ] Update CORS_ORIGIN to production domain
- [ ] Remove localhost from CORS_ORIGIN
- [ ] Test CORS with production frontend
- [ ] Verify preflight requests work

**Production CORS:**
```bash
CORS_ORIGIN="https://costplusdb.com,https://www.costplusdb.com,https://costplusdb.netlify.app"
```

### 7. SSL/TLS Configuration

- [ ] Obtain SSL certificate (Let's Encrypt)
- [ ] Configure HTTPS on web server (Nginx/Apache)
- [ ] Force HTTPS redirect (HTTP → HTTPS)
- [ ] Enable HSTS headers
- [ ] Test SSL configuration (SSL Labs)
- [ ] Set up automatic certificate renewal

**Nginx SSL Configuration:**
```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/costplusdb.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/costplusdb.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

## Infrastructure Checklist

### 8. Server Hardening

- [ ] Update all packages (apt update && apt upgrade)
- [ ] Configure UFW firewall (allow 22, 80, 443)
- [ ] Install and configure fail2ban
- [ ] Disable root SSH login
- [ ] Use SSH keys only (disable password auth)
- [ ] Configure automatic security updates
- [ ] Set up log rotation
- [ ] Configure system monitoring (htop, netdata)

**UFW Firewall:**
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 9. Process Management (PM2)

- [x] PM2 installed
- [x] PM2 ecosystem.config.js created
- [ ] Test PM2 start/stop/restart
- [ ] Configure PM2 startup script
- [ ] Set up PM2 log rotation
- [ ] Configure PM2 monitoring
- [ ] Test PM2 auto-restart on crash

**PM2 Setup:**
```bash
cd backend
npm run build
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 10. Automated Backups

- [x] Backup script created (scripts/backup-database.sh)
- [ ] Test backup script manually
- [ ] Configure cron job for daily backups
- [ ] Set up Wasabi S3 credentials for s3cmd
- [ ] Test cloud backup upload
- [ ] Test backup restoration
- [ ] Document backup restoration procedure
- [ ] Set up backup monitoring/alerts

**Cron Job Setup:**
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/costplusdb/backend/scripts/backup-database.sh >> /path/to/costplusdb/backend/logs/cron.log 2>&1
```

### 11. Monitoring & Alerting

- [ ] Set up UptimeRobot monitoring
- [ ] Configure health check endpoint (/health)
- [ ] Set up email alerts for downtime
- [ ] Configure PM2 monitoring
- [ ] Set up error tracking (Sentry or similar)
- [ ] Monitor disk space usage
- [ ] Monitor database size
- [ ] Set up log aggregation

**UptimeRobot Setup:**
1. Create account at uptimerobot.com
2. Add HTTP monitor: https://costplusdb.com/health
3. Set check interval: 5 minutes
4. Add alert contacts (email, SMS)

## Application Checklist

### 12. Build & Deploy

- [ ] Install production dependencies only
- [ ] Run TypeScript build
- [ ] Test production build locally
- [ ] Verify all environment variables set
- [ ] Test database connection
- [ ] Test authentication endpoints
- [ ] Test admin endpoints
- [ ] Run integration tests (if available)

**Production Build:**
```bash
cd backend
npm ci --production
npm run build
NODE_ENV=production node dist/index.js
```

### 13. Environment Configuration

- [ ] NODE_ENV set to "production"
- [ ] LOG_LEVEL set to "info" (not "debug")
- [ ] Disable development features
- [ ] Set production API_BASE_URL
- [ ] Configure production PORT
- [ ] Verify all API keys set
- [ ] Test feature flags

**Production .env:**
```bash
NODE_ENV=production
LOG_LEVEL=info
PORT=3000
API_BASE_URL=https://api.costplusdb.com
ENABLE_TURSO_SYNC=false
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_STRIPE_WEBHOOKS=true
```

### 14. Logging Configuration

- [ ] Configure log rotation
- [ ] Set up centralized logging (optional)
- [ ] Verify log file permissions
- [ ] Test error logging
- [ ] Configure log retention policy
- [ ] Set up log monitoring/alerts

**Log Rotation (logrotate):**
```
/path/to/costplusdb/backend/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 deploy deploy
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

## Testing Checklist

### 15. Smoke Tests

- [ ] Test health check endpoint
- [ ] Test login with admin credentials
- [ ] Test protected admin routes
- [ ] Test unauthorized access (should fail)
- [ ] Test invalid credentials (should fail)
- [ ] Test account lockout mechanism
- [ ] Test JWT token expiration
- [ ] Test CORS from production domain
- [ ] Test rate limiting

**Smoke Test Script:**
```bash
# Health check
curl https://api.costplusdb.com/health

# Login
curl -X POST https://api.costplusdb.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@costplusdb.com","password":"PRODUCTION_PASSWORD"}'

# Protected route
curl https://api.costplusdb.com/api/admin/dashboard \
  -H "Authorization: Bearer <token>"
```

### 16. Load Testing (Optional)

- [ ] Run load tests with k6 or Artillery
- [ ] Test with 100 concurrent users
- [ ] Verify response times < 200ms
- [ ] Verify no memory leaks
- [ ] Monitor CPU usage
- [ ] Monitor database performance

## Post-Deployment Checklist

### 17. Verification

- [ ] Verify application is running (pm2 status)
- [ ] Verify health check returns 200 OK
- [ ] Verify logs are being written
- [ ] Verify backups are running
- [ ] Verify monitoring is active
- [ ] Verify SSL certificate is valid
- [ ] Verify CORS is working
- [ ] Test all critical user flows

### 18. Documentation

- [ ] Document production environment variables
- [ ] Document deployment procedure
- [ ] Document rollback procedure
- [ ] Document backup restoration procedure
- [ ] Document incident response procedure
- [ ] Update README with production info
- [ ] Share credentials with team (via password manager)

### 19. Team Communication

- [ ] Notify team of deployment
- [ ] Share production URL
- [ ] Share monitoring dashboard
- [ ] Document on-call rotation
- [ ] Create incident response plan
- [ ] Schedule post-deployment review

## Rollback Procedure

If deployment fails:

1. **Stop PM2 process:**
   ```bash
   pm2 stop costplusdb-backend
   ```

2. **Restore database backup:**
   ```bash
   cd backend/backups
   gunzip costplusdb_backup_YYYYMMDD_HHMMSS.db.gz
   cp costplusdb_backup_YYYYMMDD_HHMMSS.db ../002-clients/database/costplusdb.db
   ```

3. **Revert to previous code version:**
   ```bash
   git checkout <previous-commit-hash>
   npm ci
   npm run build
   ```

4. **Restart PM2:**
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

5. **Verify rollback:**
   ```bash
   curl https://api.costplusdb.com/health
   ```

## Critical Security Reminders

### BEFORE GOING PUBLIC:

1. ⚠️  **Change default admin password**
2. ⚠️  **Generate production JWT_SECRET**
3. ⚠️  **Rotate Wasabi credentials if making repo public**
4. ⚠️  **Clean git history if making repo public**
5. ⚠️  **Set all production API keys**
6. ⚠️  **Enable HTTPS**
7. ⚠️  **Configure rate limiting**
8. ⚠️  **Set up automated backups**
9. ⚠️  **Configure monitoring**
10. ⚠️ **Review all environment variables**

## Deployment Sign-Off

- [ ] Security checklist complete
- [ ] Infrastructure checklist complete
- [ ] Application checklist complete
- [ ] Testing checklist complete
- [ ] Post-deployment checklist complete
- [ ] Team notified
- [ ] Monitoring active
- [ ] Backups verified

**Deployed By:** _______________
**Deployment Date:** _______________
**Deployment Version:** _______________
**Sign-Off:** _______________

---

**Last Updated:** 2025-10-20
**Next Review:** Before production deployment
