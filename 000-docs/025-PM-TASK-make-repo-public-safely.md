# Make GitHub Repo Public Safely - Action Plan

**Created:** 2025-10-19
**Status:** CRITICAL - Secrets currently in git history
**Goal:** Make repo public for transparency without exposing credentials

---

## 🚨 CURRENT SECURITY STATUS

### ❌ Secrets Currently Exposed in Git History

**Found in commit `3f05c90` (and possibly others):**

1. **Wasabi S3 Credentials:**
   - Access Key: `49S2EH8V84D0JO6DH5MV`
   - Secret Key: `q46A3zvsEITqXeB3cbQTnyPnCFRe8XI6mSyVZuQy`
   - Bucket: `costplusdb-backups`

2. **pgBackRest Encryption Key:**
   - AES-256 passphrase: `tXoiSmzmMh67qJ/2iY7c/vSpLgUMfY4Vo0Bj2fmOx8fdQ+4svAFxQx8uljBT5yzF`

3. **Resend API Key (recent commits):**
   - May be in recent commit history

4. **Server Sudo Password:**
   - Embedded in monitoring scripts: `TheCitadel2003`

**Commits with secrets:**
- `3f05c90` - Complete automation setup
- `bc490dc` - Earlier backup config
- Potentially more in history

---

## 📋 COMPREHENSIVE ACTION PLAN

### Phase 1: Audit & Document (30 minutes)

**1.1 Find ALL secrets in git history:**
```bash
# Search entire git history for potential secrets
git log --all --full-history -p | grep -i "password\|key\|secret\|token" > /tmp/secret-audit.txt

# Check specific sensitive files
git log --all --full-history -- 001-security/config/backup/pgbackrest.conf
git log --all --full-history -- 001-security/keys/
git log --all --full-history -- 001-security/scripts/
```

**1.2 List all credentials that need rotation:**
- [ ] Wasabi S3 access keys
- [ ] pgBackRest encryption passphrase
- [ ] Resend API key
- [ ] Server sudo password (in scripts)
- [ ] Any PostgreSQL passwords in configs
- [ ] SSH keys (if any in repo)

---

### Phase 2: Create Clean Repository Structure (1 hour)

**2.1 Create comprehensive .gitignore:**

```gitignore
# === SECRETS & CREDENTIALS ===
# NEVER commit these!

# API Keys and Tokens
001-security/keys/
*.key
*-credentials
*-credentials.txt
api-key*
*.token

# Backup encryption
master.key
encryption-key*
*passphrase*

# Configuration with secrets
001-security/config/backup/pgbackrest.conf
001-security/config/fail2ban/jail.local
/etc/pgbackrest.conf

# Logs (may contain sensitive data)
001-security/logs/
*.log
logs/

# Customer data
001-security/customers/
customer-data/

# Environment files
.env
.env.*
!.env.example

# Temporary files
*.tmp
*.bak
*.swp
*~

# === CLAUDE CODE ===
.claude/

# === NODE/NPM ===
node_modules/
package-lock.json

# === PYTHON ===
__pycache__/
*.pyc
*.pyo
venv/

# === OS FILES ===
.DS_Store
Thumbs.db
```

**2.2 Create template files with placeholders:**

Create template versions of sensitive files:
- `001-security/config/backup/pgbackrest.conf.template`
- `001-security/keys/api-tokens/resend-api-key.template`
- `001-security/keys/backup-encryption/README.md` (instructions only)

---

### Phase 3: Scrub Git History (30 minutes)

**⚠️ WARNING: This rewrites git history and breaks anyone who has cloned the repo!**

**Option A: Use BFG Repo-Cleaner (Recommended)**

```bash
# Install BFG
cd ~
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar

# Clone fresh copy
git clone --mirror https://github.com/jeremylongshore/cost-plus-db.git cost-plus-db-clean.git

# Remove sensitive files from ALL history
java -jar ~/bfg-1.14.0.jar --delete-files pgbackrest.conf cost-plus-db-clean.git
java -jar ~/bfg-1.14.0.jar --delete-files master.key cost-plus-db-clean.git
java -jar ~/bfg-1.14.0.jar --delete-files wasabi-credentials cost-plus-db-clean.git
java -jar ~/bfg-1.14.0.jar --delete-files resend-api-key cost-plus-db-clean.git

# Clean up
cd cost-plus-db-clean.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (DESTRUCTIVE!)
git push --force
```

**Option B: Use git-filter-repo**

```bash
# Install
pip3 install git-filter-repo

# Remove sensitive paths from entire history
git filter-repo --path 001-security/config/backup/pgbackrest.conf --invert-paths
git filter-repo --path 001-security/keys/ --invert-paths
git filter-repo --path 001-security/logs/ --invert-paths

# Force push
git push --force
```

**Option C: Nuclear Option - Start Fresh Repository**

If history is too polluted:
1. Create new repo: `cost-plus-db-clean`
2. Copy only documentation and scripts (templates only)
3. Never migrate git history
4. Archive old repo as private

---

### Phase 4: Rotate ALL Exposed Credentials (2 hours)

**4.1 Rotate Wasabi S3 Credentials:**

1. Go to: https://console.wasabisys.com/access-keys
2. Create new access key pair
3. Update `/etc/pgbackrest.conf` with new keys
4. Update `001-security/config/backup/pgbackrest.conf.template` (with placeholders)
5. Test backup: `sudo pgbackrest backup --type=full`
6. Delete old access key in Wasabi console

**4.2 Rotate pgBackRest Encryption Key:**

⚠️ **CRITICAL:** Cannot rotate without losing ability to restore old backups!

**Options:**
- **Keep old key** (for old backups), generate new for future backups
- **Re-encrypt all backups** with new key (complex, risky)
- **Accept risk** that old backups are exposed (not recommended)

**Recommended:** Keep old key in secure location (1Password), use new key going forward.

**4.3 Rotate Resend API Key:**

1. Go to: https://resend.com/api-keys
2. Create new key: "CostPlusDB Security Alerts v2"
3. Update `001-security/keys/api-tokens/resend-api-key`
4. Test: `./001-security/alerts/scripts/send-alert-email.sh "Test" "Testing new key"`
5. Delete old key in Resend dashboard

**4.4 Remove Sudo Password from Scripts:**

Option 1: Use sudoers NOPASSWD rules
```bash
# Add to /etc/sudoers.d/costplusdb-monitoring
admincostplus ALL=(ALL) NOPASSWD: /usr/bin/fail2ban-client
admincostplus ALL=(ALL) NOPASSWD: /usr/bin/grep
```

Option 2: Use sudo credential cache (timeout)

Option 3: Run scripts as root via systemd timers instead of cron

---

### Phase 5: Create Public-Safe Repository Structure (1 hour)

**5.1 What SHOULD be public (transparency):**

✅ **Documentation:**
- `000-docs/` - All SOP documentation
- `README.md` - Project overview
- `CLAUDE.md` - AI assistant instructions
- `LICENSE` - Open source license

✅ **Website code:**
- `website/` - All HTML/CSS/JS (no secrets)

✅ **Scripts (templates only):**
- `001-security/scripts/` - Monitoring scripts
  - Remove hardcoded `echo "TheCitadel2003" | sudo -S`
  - Add comments: `# Configure sudo NOPASSWD or use credential cache`

✅ **Configuration templates:**
- `001-security/config/backup/pgbackrest.conf.template`
- `001-security/config/logrotate-costplusdb.conf` (no secrets)

✅ **Tools:**
- `001-security/tools/password-generator/` (no secrets)

**5.2 What MUST stay private:**

❌ **Actual credentials:**
- `001-security/keys/` - ALL keys and credentials
- `001-security/config/backup/pgbackrest.conf` (with real keys)
- `001-security/customers/` - Customer data

❌ **Logs:**
- `001-security/logs/` - May contain IPs, errors, sensitive data

❌ **Active configuration:**
- Any file with real passwords, keys, tokens

---

### Phase 6: Update Scripts to Use Environment Variables (2 hours)

**Instead of hardcoded secrets, scripts should:**

```bash
# Load credentials from external file (gitignored)
source /home/admincostplus/projects/costplusdb/001-security/keys/api-tokens/resend-api-key

# Or use environment variables
RESEND_API_KEY="${RESEND_API_KEY}"

# For sudo, use sudoers NOPASSWD instead of password in script
sudo fail2ban-client status postgresql
```

**Update all monitoring scripts:**
- Remove `echo "TheCitadel2003" | sudo -S`
- Add `source` statement to load credentials
- Add error handling if credentials missing

---

### Phase 7: Add Public README with Setup Instructions (30 minutes)

Create `001-security/README.md`:

```markdown
# CostPlusDB Security Infrastructure

This directory contains the security automation and monitoring infrastructure for CostPlusDB.

## 🔐 Security Notice

**This repository contains templates only.**

Actual credentials, keys, and configuration files are NOT committed to git.
Before running scripts, you must:

1. Create credential files (see `keys/README.md`)
2. Configure sudo NOPASSWD rules (see `config/README.md`)
3. Set up pgBackRest with your S3 credentials
4. Configure Resend API key for alerts

## 📁 Directory Structure

- `config/` - Configuration templates (DO NOT commit actual configs)
- `keys/` - Credential storage (NEVER commit, always gitignored)
- `scripts/` - Monitoring and maintenance scripts
- `logs/` - Log files (gitignored)
- `alerts/` - Alert delivery scripts
- `tools/` - Utility scripts

## 🚀 Setup

See `000-docs/019-DR-TASK-complete-automation-setup.md` for complete setup instructions.

## ⚠️ Important

- Never commit files with actual passwords or API keys
- Always use `.template` versions for public repo
- Store real credentials in password manager (1Password)
- Rotate credentials if accidentally committed
```

---

### Phase 8: Testing Before Going Public (1 hour)

**8.1 Test clean repository:**

```bash
# Clone to fresh directory
cd /tmp
git clone https://github.com/jeremylongshore/cost-plus-db.git test-public

# Search for any remaining secrets
cd test-public
grep -r "TheCitadel2003" .
grep -r "49S2EH8V84D0JO6DH5MV" .
grep -r "re_RgaDN3Rd" .
grep -r "tXoiSmzmMh67qJ" .

# If any found: STOP and scrub more
```

**8.2 Verify .gitignore works:**

```bash
# Try to add a secret file
echo "SECRET_KEY=test123" > 001-security/keys/test.key
git add .
git status

# Should show: nothing to commit (file ignored)
```

**8.3 Test scripts still work with external credentials:**

```bash
# Scripts should fail gracefully if credentials missing
./001-security/scripts/monitoring/check-failed-logins.sh
# Should show: "Error: Credentials file not found" (not crash)
```

---

## 🎯 DECISION POINTS

### Option 1: Clean Current Repo (Recommended)

**Pros:**
- Keep existing GitHub URL
- Preserve stars/forks (if any)
- Clean history shows evolution

**Cons:**
- Complex history rewrite
- Must rotate ALL credentials
- Risk of missing secrets

**Steps:**
1. Scrub git history with BFG
2. Rotate all exposed credentials
3. Add comprehensive .gitignore
4. Force push cleaned history
5. Make repo public

---

### Option 2: Fresh Repository

**Pros:**
- 100% guarantee no secrets
- Clean slate
- Simple migration

**Cons:**
- Lose commit history
- New GitHub URL
- More work to migrate

**Steps:**
1. Create new repo: `costplusdb-public`
2. Copy only safe files (templates, docs, website)
3. Never migrate git history
4. Make new repo public
5. Archive old repo (keep private)

---

### Option 3: Hybrid Approach

**Pros:**
- Best of both worlds
- Keep history for docs/website
- Fresh start for security configs

**Cons:**
- Most complex
- Requires careful file management

**Steps:**
1. Keep current repo for internal use (private)
2. Create public repo with curated content
3. Set up git subtree/submodule sync
4. Automate sync of safe files only

---

## 📊 RECOMMENDATION

**I recommend Option 1: Clean Current Repo**

**Timeline:**
- Phase 1-2: 1.5 hours (audit + setup)
- Phase 3: 30 minutes (scrub history)
- Phase 4: 2 hours (rotate credentials)
- Phase 5-7: 3.5 hours (restructure + docs)
- Phase 8: 1 hour (testing)
- **Total: ~8 hours work**

**Why:**
- Maintains transparency narrative
- Shows real evolution of project
- Keeps GitHub URL/branding
- Sets good security practices going forward

**Critical before going public:**
1. ✅ Rotate ALL exposed credentials
2. ✅ Scrub git history completely
3. ✅ Test clean repo thoroughly
4. ✅ Add comprehensive .gitignore
5. ✅ Create template files
6. ✅ Update all scripts to use external credentials

---

## 🚀 READY TO START?

Say "yes" and I'll begin with Phase 1: Complete audit of all secrets in git history.

Or ask questions about any phase first.
