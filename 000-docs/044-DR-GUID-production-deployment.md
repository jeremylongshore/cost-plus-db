# Production Deployment Guide

**Document Type:** DR-GUID (Daily Routine - Guide)
**Created:** 2025-10-20
**Owner:** Intent Solutions (CostPlusDB)
**Purpose:** Complete guide for deploying CostPlusDB backend to production VPS

---

## Overview

This guide covers deploying the CostPlusDB backend application to a production VPS server with proper security, monitoring, and best practices.

**Deployment Stack:**
- **Server:** Ubuntu 24.04 LTS (Contabo VPS or similar)
- **Runtime:** Node.js 18+
- **Database:** SQLite (local) or Turso (cloud)
- **Process Manager:** PM2
- **Reverse Proxy:** Nginx
- **SSL/TLS:** Let's Encrypt (Certbot)
- **Monitoring:** PM2 + logs

**Time Required:** 60-90 minutes (first time)
**Prerequisites:** VPS server with root/sudo access, domain name configured

---

## Prerequisites

### What You Need

- [ ] VPS server running Ubuntu 24.04 LTS
- [ ] SSH access to the server
- [ ] Domain name (e.g., `costplusdb.dev`)
- [ ] DNS configured (A record pointing to VPS IP)
- [ ] GitHub repository access
- [ ] Production environment variables ready

### Server Specifications

**Minimum Requirements:**
- 2 vCPU cores
- 2 GB RAM
- 20 GB SSD storage
- 100 Mbps network

**Recommended (for production):**
- 4 vCPU cores
- 4 GB RAM
- 50 GB SSD storage
- 1 Gbps network

---

## Part 1: Server Setup

### Step 1: Connect to Server

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Or with a specific user
ssh -i ~/.ssh/id_rsa username@YOUR_SERVER_IP
```

### Step 2: Update System

```bash
# Update package lists
sudo apt update

# Upgrade all packages
sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl git wget build-essential ufw
```

### Step 3: Create Application User

```bash
# Create dedicated user for the application
sudo adduser --disabled-password --gecos "" costplusdb

# Add user to sudo group (optional, for admin tasks)
sudo usermod -aG sudo costplusdb

# Switch to application user
sudo su - costplusdb
```

### Step 4: Set Up SSH Key Authentication (Optional)

```bash
# As costplusdb user, create .ssh directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add your public key to authorized_keys
echo "YOUR_PUBLIC_SSH_KEY" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Exit and test SSH login as costplusdb user
exit
ssh costplusdb@YOUR_SERVER_IP
```

---

## Part 2: Install Node.js

### Step 1: Install Node.js 18 LTS

```bash
# Download and install NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version
# Should output: v18.x.x

npm --version
# Should output: 9.x.x or higher
```

### Step 2: Install PM2 Process Manager

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version

# Set up PM2 startup script
sudo pm2 startup systemd -u costplusdb --hp /home/costplusdb
```

---

## Part 3: Clone and Configure Application

### Step 1: Clone Repository

```bash
# As costplusdb user, navigate to home directory
cd /home/costplusdb

# Clone repository
git clone https://github.com/jeremylongshore/cost-plus-db.git

# Navigate to backend directory
cd cost-plus-db/backend

# Verify directory structure
ls -la
```

**Alternative: Use SSH for git clone**

```bash
# Generate SSH key on server
ssh-keygen -t ed25519 -C "costplusdb-production"

# Display public key
cat ~/.ssh/id_ed25519.pub

# Add this public key to GitHub as a deploy key
# GitHub: Repository Settings → Deploy keys → Add deploy key

# Clone using SSH
git clone git@github.com:jeremylongshore/cost-plus-db.git
```

### Step 2: Install Dependencies

```bash
# Install production dependencies only
npm ci --production

# Or install all dependencies (including dev)
npm install

# Verify installation
npm list --depth=0
```

---

## Part 4: Environment Configuration

### Step 1: Create Production .env File

```bash
# Create .env file
nano /home/costplusdb/cost-plus-db/backend/.env
```

**Production Environment Variables:**

```bash
# Database Configuration
DATABASE_URL="file:../002-clients/database/costplusdb-production.db"

# Turso Cloud Database (Optional - Recommended for production)
TURSO_DATABASE_URL="libsql://your-production-db.turso.io"
TURSO_AUTH_TOKEN="your-production-auth-token"

# Email Configuration (Resend)
RESEND_API_KEY="re_PRODUCTION_KEY_HERE"
RESEND_FROM_EMAIL="costplusdb@intentsolutions.io"
RESEND_ADMIN_EMAIL="jeremy@intentsolutions.io"

# Stripe Configuration (PRODUCTION KEYS)
STRIPE_SECRET_KEY="sk_live_PRODUCTION_KEY_HERE"
STRIPE_WEBHOOK_SECRET="whsec_PRODUCTION_WEBHOOK_SECRET_HERE"
STRIPE_PUBLISHABLE_KEY="pk_live_PRODUCTION_KEY_HERE"

# API Configuration
NODE_ENV="production"
PORT="3000"
API_BASE_URL="https://api.costplusdb.dev"

# Security - GENERATE UNIQUE PRODUCTION SECRETS
JWT_SECRET="PRODUCTION_JWT_SECRET_64_CHARS_LONG"
ENCRYPTION_KEY="PRODUCTION_ENCRYPTION_KEY_32_CHARS"

# CORS Configuration
CORS_ORIGIN="https://costplusdb.dev,https://www.costplusdb.dev"

# Rate Limiting
RATE_LIMIT_WINDOW_MS="900000"
RATE_LIMIT_MAX_REQUESTS="100"

# Logging
LOG_LEVEL="info"
LOG_FILE_PATH="/home/costplusdb/logs/app.log"

# Feature Flags
ENABLE_TURSO_SYNC="true"
ENABLE_EMAIL_NOTIFICATIONS="true"
ENABLE_STRIPE_WEBHOOKS="true"
```

### Step 2: Generate Production Secrets

```bash
# Generate JWT_SECRET (64 characters)
openssl rand -base64 64 | tr -d '\n' && echo

# Generate ENCRYPTION_KEY (32 characters)
openssl rand -base64 32 | cut -c1-32 && echo

# Copy these values into .env file
```

### Step 3: Set Secure Permissions

```bash
# Set .env file permissions (owner read/write only)
chmod 600 /home/costplusdb/cost-plus-db/backend/.env

# Verify permissions
ls -la /home/costplusdb/cost-plus-db/backend/.env
# Should show: -rw------- (600)
```

---

## Part 5: Database Setup

### Step 1: Create Database Directory

```bash
# Create database directory
mkdir -p /home/costplusdb/cost-plus-db/002-clients/database

# Set permissions
chmod 750 /home/costplusdb/cost-plus-db/002-clients/database
```

### Step 2: Initialize Database

```bash
# Navigate to backend directory
cd /home/costplusdb/cost-plus-db/backend

# Initialize database
npm run db:init

# Verify database created
ls -la ../002-clients/database/
# Should show: costplusdb-production.db
```

### Step 3: Run Migrations

```bash
# Run database migrations
npm run db:migrate

# Verify migrations
sqlite3 ../002-clients/database/costplusdb-production.db ".tables"
# Should show: customers, customer_databases, billing_records, etc.
```

---

## Part 6: Build Application

### Step 1: Compile TypeScript

```bash
# Build TypeScript to JavaScript
npm run build

# Verify build output
ls -la dist/
# Should show compiled .js files
```

### Step 2: Test Production Build

```bash
# Test starting the production build
npm start

# Should see output:
# Server listening on http://localhost:3000

# Test health endpoint (in another terminal)
curl http://localhost:3000/health

# Stop the server (Ctrl+C)
```

---

## Part 7: PM2 Process Management

### Step 1: Create PM2 Ecosystem File

```bash
# Create PM2 configuration
nano /home/costplusdb/cost-plus-db/backend/ecosystem.config.js
```

**PM2 Configuration:**

```javascript
module.exports = {
  apps: [
    {
      name: 'costplusdb-api',
      script: './dist/index.js',
      cwd: '/home/costplusdb/cost-plus-db/backend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/home/costplusdb/logs/pm2-error.log',
      out_file: '/home/costplusdb/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '500M',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
```

### Step 2: Create Log Directory

```bash
# Create logs directory
mkdir -p /home/costplusdb/logs

# Set permissions
chmod 750 /home/costplusdb/logs
```

### Step 3: Start Application with PM2

```bash
# Start application
pm2 start ecosystem.config.js

# Verify application is running
pm2 status

# Should show:
# ┌─────┬────────────────────┬─────────────┬─────────┬─────────┬──────────┐
# │ id  │ name               │ mode        │ status  │ cpu     │ memory   │
# ├─────┼────────────────────┼─────────────┼─────────┼─────────┼──────────┤
# │ 0   │ costplusdb-api     │ cluster     │ online  │ 0%      │ 45.0mb   │
# │ 1   │ costplusdb-api     │ cluster     │ online  │ 0%      │ 45.0mb   │
# └─────┴────────────────────┴─────────────┴─────────┴─────────┴──────────┘

# View logs
pm2 logs costplusdb-api

# Save PM2 configuration
pm2 save
```

### Step 4: Useful PM2 Commands

```bash
# Restart application
pm2 restart costplusdb-api

# Stop application
pm2 stop costplusdb-api

# Delete application from PM2
pm2 delete costplusdb-api

# Monitor resources
pm2 monit

# View logs
pm2 logs costplusdb-api --lines 100

# Clear logs
pm2 flush

# Show application info
pm2 show costplusdb-api
```

---

## Part 8: Nginx Reverse Proxy

### Step 1: Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Verify installation
nginx -v

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### Step 2: Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/costplusdb-api
```

**Nginx Configuration:**

```nginx
# Upstream to Node.js backend
upstream costplusdb_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

# HTTP server (redirect to HTTPS)
server {
    listen 80;
    listen [::]:80;
    server_name api.costplusdb.dev;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.costplusdb.dev;

    # SSL certificates (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/api.costplusdb.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.costplusdb.dev/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/costplusdb-api-access.log;
    error_log /var/log/nginx/costplusdb-api-error.log;

    # Proxy to Node.js backend
    location / {
        proxy_pass http://costplusdb_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (bypass proxy for faster response)
    location /health {
        proxy_pass http://costplusdb_backend/health;
        proxy_http_version 1.1;
        access_log off;
    }

    # Block common attack patterns
    location ~ /\. {
        deny all;
    }
}
```

### Step 3: Enable Site

```bash
# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/costplusdb-api /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Should output:
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Reload Nginx
sudo systemctl reload nginx
```

---

## Part 9: SSL/TLS with Let's Encrypt

### Step 1: Install Certbot

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

### Step 2: Obtain SSL Certificate

```bash
# Obtain certificate for api.costplusdb.dev
sudo certbot --nginx -d api.costplusdb.dev

# Follow prompts:
# - Enter email address
# - Agree to Terms of Service
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)

# Certbot will automatically:
# 1. Obtain certificate from Let's Encrypt
# 2. Update Nginx configuration
# 3. Reload Nginx
```

### Step 3: Test SSL Configuration

```bash
# Test HTTPS endpoint
curl https://api.costplusdb.dev/health

# Should return:
# {
#   "status": "healthy",
#   "version": "1.0.0",
#   "timestamp": "2025-10-20T14:30:00.000Z"
# }
```

### Step 4: Set Up Auto-Renewal

```bash
# Test certificate renewal (dry run)
sudo certbot renew --dry-run

# Should output:
# Congratulations, all simulated renewals succeeded

# Certbot automatically sets up a systemd timer for renewal
# Verify timer is active
sudo systemctl status certbot.timer
```

---

## Part 10: Firewall Configuration

### Step 1: Configure UFW Firewall

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow PostgreSQL (if needed for customer databases)
sudo ufw allow 5432/tcp

# Deny all other incoming traffic
sudo ufw default deny incoming

# Allow all outgoing traffic
sudo ufw default allow outgoing

# Verify firewall rules
sudo ufw status verbose
```

**Expected Output:**

```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
5432/tcp                   ALLOW       Anywhere
```

---

## Part 11: Monitoring and Logging

### Step 1: Set Up Log Rotation

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/costplusdb
```

**Logrotate Configuration:**

```
/home/costplusdb/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 costplusdb costplusdb
    sharedscripts
    postrotate
        pm2 reload costplusdb-api > /dev/null 2>&1 || true
    endscript
}
```

### Step 2: Monitor Application with PM2

```bash
# View real-time logs
pm2 logs costplusdb-api

# Monitor CPU/Memory usage
pm2 monit

# View application metrics
pm2 show costplusdb-api

# Enable PM2 web dashboard (optional)
pm2 web
# Access at: http://YOUR_SERVER_IP:9615
```

### Step 3: Set Up PM2 Monitoring (Optional)

```bash
# Link PM2 to PM2.io for advanced monitoring
pm2 link YOUR_SECRET_KEY YOUR_PUBLIC_KEY

# View metrics at: https://app.pm2.io
```

---

## Part 12: Deployment Automation

### Create Deployment Script

```bash
# Create deployment script
nano /home/costplusdb/deploy.sh
```

**Deployment Script:**

```bash
#!/bin/bash

# CostPlusDB Backend Deployment Script
# Run as: ./deploy.sh

set -e

echo "========================================="
echo "CostPlusDB Backend Deployment"
echo "========================================="

# Navigate to project directory
cd /home/costplusdb/cost-plus-db

# Pull latest changes from git
echo "Pulling latest changes from GitHub..."
git pull origin main

# Navigate to backend
cd backend

# Install dependencies
echo "Installing dependencies..."
npm ci --production

# Run database migrations
echo "Running database migrations..."
npm run db:migrate

# Build TypeScript
echo "Building application..."
npm run build

# Reload PM2 application
echo "Reloading application..."
pm2 reload costplusdb-api

# Wait for application to start
sleep 5

# Verify application is running
echo "Verifying application..."
pm2 status costplusdb-api

# Test health endpoint
echo "Testing health endpoint..."
curl -s http://localhost:3000/health | jq '.'

echo "========================================="
echo "Deployment complete!"
echo "========================================="
```

**Make Script Executable:**

```bash
chmod +x /home/costplusdb/deploy.sh
```

**Run Deployment:**

```bash
./deploy.sh
```

---

## Part 13: Backup Configuration

### Step 1: Create Backup Script

```bash
# Create backup script
nano /home/costplusdb/backup-database.sh
```

**Backup Script:**

```bash
#!/bin/bash

# Database Backup Script
BACKUP_DIR="/home/costplusdb/backups/database"
DB_PATH="/home/costplusdb/cost-plus-db/002-clients/database/costplusdb-production.db"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/costplusdb-$TIMESTAMP.db"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Copy database file
cp $DB_PATH $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.db.gz" -mtime +30 -delete

echo "Backup complete: $BACKUP_FILE.gz"
```

**Make Script Executable:**

```bash
chmod +x /home/costplusdb/backup-database.sh
```

### Step 2: Schedule Automated Backups

```bash
# Edit crontab
crontab -e

# Add daily backup at 2:00 AM
0 2 * * * /home/costplusdb/backup-database.sh >> /home/costplusdb/logs/backup.log 2>&1
```

---

## Part 14: Verification Checklist

After deployment, verify everything is working:

- [ ] Application running in PM2 (`pm2 status`)
- [ ] Health endpoint responds (`curl https://api.costplusdb.dev/health`)
- [ ] SSL certificate valid (check in browser)
- [ ] Nginx reverse proxy working
- [ ] Firewall configured correctly (`sudo ufw status`)
- [ ] Logs being written (`tail -f /home/costplusdb/logs/app.log`)
- [ ] Database accessible and migrations applied
- [ ] PM2 startup script configured
- [ ] Log rotation configured
- [ ] Backups scheduled

---

## Troubleshooting

### Issue: Application won't start

```bash
# Check PM2 logs
pm2 logs costplusdb-api --err

# Check application logs
tail -f /home/costplusdb/logs/app.log

# Verify environment variables
cat /home/costplusdb/cost-plus-db/backend/.env

# Test build manually
cd /home/costplusdb/cost-plus-db/backend
npm start
```

### Issue: Nginx 502 Bad Gateway

```bash
# Check if Node.js application is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/costplusdb-api-error.log

# Verify port 3000 is listening
sudo netstat -tulpn | grep 3000

# Test backend directly
curl http://localhost:3000/health
```

### Issue: SSL Certificate Error

```bash
# Verify certificate files exist
sudo ls -la /etc/letsencrypt/live/api.costplusdb.dev/

# Test Nginx configuration
sudo nginx -t

# Renew certificate manually
sudo certbot renew --force-renewal
```

### Issue: Database Permission Errors

```bash
# Check database file permissions
ls -la /home/costplusdb/cost-plus-db/002-clients/database/

# Fix permissions if needed
chmod 640 /home/costplusdb/cost-plus-db/002-clients/database/*.db
chown costplusdb:costplusdb /home/costplusdb/cost-plus-db/002-clients/database/*.db
```

---

## Related Documentation

- **043-DR-GUID-local-development-setup.md** - Local development setup
- **045-DR-GUID-cloudflare-workers-deployment.md** - Alternative deployment to Cloudflare
- **backend/docs/API.md** - API documentation
- **005-DR-SOPS-postgresql-operations.md** - PostgreSQL operations

---

**Document Owner:** Jeremy Longshore (jeremy@intentsolutions.io)
**Last Updated:** 2025-10-20
**Review Frequency:** Quarterly
