# Emergency Credential Rotation Guide

**Document ID:** 030-DR-GUID-credential-rotation-emergency
**Created:** 2025-10-19
**Status:** ACTIVE - SECURITY INCIDENT RESPONSE
**Severity:** HIGH - Credentials exposed in git history

## Executive Summary

This guide provides step-by-step instructions for rotating credentials that were accidentally committed to git history in commit `3f05c90`. Multiple sensitive credentials were exposed and must be rotated immediately.

**Exposed Credentials:**
- Wasabi S3 Access Key ID
- Wasabi S3 Secret Access Key
- Backup Encryption Passphrase
- Sudo password (in multiple scripts)

**Timeline:**
- Priority 1 (TODAY): Rotate all credentials and test backups
- Priority 2 (THIS WEEK): Clean git history

---

## Priority 1: Immediate Credential Rotation

### Step 1: Change Sudo Password (15 minutes)

**Rationale:** The sudo password was exposed in multiple scripts and must be changed immediately.

**STATUS:** ✅ Hardcoded passwords have been REMOVED from all scripts. Password should still be rotated as a precaution.

#### 1.1 Change Password

```bash
# SSH into the production server
ssh admincostplus@your-server-ip

# Change the password
sudo passwd admincostplus
```

**Expected Output:**
```
[sudo] password for admincostplus: [enter current password]
New password: [enter new strong password]
Retype new password: [re-enter new password]
passwd: password updated successfully
```

#### 1.2 Generate Strong Password

Use a password manager (1Password, Bitwarden, etc.) to generate a strong password:
- Minimum 20 characters
- Include uppercase, lowercase, numbers, and symbols
- Store in 1Password under "CostPlusDB - Server Admin Password"

#### 1.3 Test Sudo Access

```bash
# Test sudo access with new password
sudo ls -la /root

# Verify you can still access system
sudo systemctl status postgresql
```

#### 1.4 Verify No Scripts Use Hardcoded Password

```bash
# Check if any scripts still have hardcoded passwords
cd /home/admincostplus/projects/costplusdb
grep -r "echo.*sudo -S" scripts/ || echo "No hardcoded password patterns found"
```

**Action Required:** If any scripts still contain the old password, update them immediately or remove password automation entirely (recommended).

---

### Step 2: Rotate Wasabi S3 Credentials (30 minutes)

#### 2.1 Generate New Access Keys in Wasabi Console

1. Log into Wasabi Console: https://console.wasabisys.com/
2. Navigate to **Access Keys** (top right menu)
3. Click **Create New Access Key**
4. Copy and save both keys immediately:
   - Access Key ID: `[NEW_ACCESS_KEY]`
   - Secret Access Key: `[NEW_SECRET_KEY]`
5. Store in 1Password under "CostPlusDB - Wasabi S3 Credentials"

**DO NOT delete old keys yet** - we need to update configuration first.

#### 2.2 Update pgBackRest Configuration

```bash
# SSH into server
ssh admincostplus@your-server-ip

# Backup current configuration
sudo cp /etc/pgbackrest.conf /etc/pgbackrest.conf.backup-$(date +%Y%m%d-%H%M%S)

# Edit pgBackRest configuration
sudo nano /etc/pgbackrest.conf
```

Update the following lines in the `[global:archive-push]` section:

```ini
[global:archive-push]
repo1-s3-key=NEW_ACCESS_KEY_HERE
repo1-s3-key-secret=NEW_SECRET_KEY_HERE
```

**Example:**
```ini
[global:archive-push]
repo1-s3-key=7BW9FK2M18E5QP3CJ7LX
repo1-s3-key-secret=x92H8mplRVWnZfG7hgQXspOqTEWd1YL9oTzVPuYr
```

#### 2.3 Set Correct Permissions

```bash
# Ensure configuration file has correct permissions
sudo chown postgres:postgres /etc/pgbackrest.conf
sudo chmod 640 /etc/pgbackrest.conf
```

#### 2.4 Test New Credentials

```bash
# Test S3 connectivity with new credentials
sudo -u postgres pgbackrest --stanza=main --log-level-console=info info
```

**Expected Output:**
```
stanza: main
    status: ok
    cipher: aes-256-cbc

    db (current)
        wal archive min/max (16): 000000010000000000000001/000000010000000000000023

        full backup: 20251019-120000F
            timestamp start/stop: 2025-10-19 12:00:00 / 2025-10-19 12:15:00
            wal start/stop: 000000010000000000000020 / 000000010000000000000020
            database size: 500MB, database backup size: 500MB
            repo1: backup size: 50MB
```

**If you see errors:** Check the credentials were copied correctly and try again.

#### 2.5 Perform Test Backup

```bash
# Run a full backup to verify everything works
sudo -u postgres pgbackrest --stanza=main --type=full backup
```

**Expected Output:**
```
WARN: no prior backup exists, incr backup has been changed to full
INFO: backup command begin...
INFO: execute non-exclusive pg_start_backup()...
INFO: backup start archive = 000000010000000000000024, lsn = 0/24000000
INFO: full backup size = 500MB
INFO: execute non-exclusive pg_stop_backup()...
INFO: backup command end: completed successfully
```

#### 2.6 Delete Old Wasabi Credentials

**ONLY after confirming backups work with new credentials:**

1. Log into Wasabi Console
2. Navigate to **Access Keys**
3. Find old key: `49S2EH8V84D0JO6DH5MV`
4. Click **Delete** and confirm

---

### Step 3: Rotate Backup Encryption Passphrase (45 minutes)

#### 3.1 Generate New Encryption Passphrase

```bash
# Generate a new 64-character passphrase
openssl rand -base64 48
```

**Example Output:**
```
yW9pXmzlKi82nV/5jY3d/wTqMhVOGfZ7vo5Dm8npY2geR+9twBFyCy3vmkCX8zaH
```

**Store this in 1Password immediately** under "CostPlusDB - Backup Encryption Passphrase"

#### 3.2 Important Decision: Re-encryption Strategy

You have two options:

**Option A: Create New Backup Stanza (RECOMMENDED)**
- Faster and safer
- Start fresh with new encryption
- Keep old backups available during transition
- Requires more storage temporarily

**Option B: Re-encrypt Existing Backups**
- More complex
- Requires downloading and re-uploading all backups
- Higher risk of data loss if something goes wrong

**Recommendation:** Use Option A unless storage cost is prohibitive.

#### 3.3 Option A: Create New Backup Stanza

```bash
# Backup current configuration
sudo cp /etc/pgbackrest.conf /etc/pgbackrest.conf.before-passphrase-rotation

# Edit configuration
sudo nano /etc/pgbackrest.conf
```

Update the configuration to use a new stanza name and new passphrase:

```ini
[global]
repo1-type=s3
repo1-s3-bucket=costplusdb-backups
repo1-s3-endpoint=s3.us-east-1.wasabisys.com
repo1-s3-region=us-east-1
repo1-s3-key=NEW_ACCESS_KEY_FROM_STEP_2
repo1-s3-key-secret=NEW_SECRET_KEY_FROM_STEP_2
repo1-cipher-type=aes-256-cbc
repo1-cipher-pass=NEW_PASSPHRASE_HERE
repo1-retention-full=7
repo1-retention-diff=4
repo1-path=/pgbackrest-v2
log-level-console=info
log-level-file=debug
start-fast=y
process-max=4

[main-v2]
pg1-path=/var/lib/postgresql/16/main
pg1-port=5432

[global:archive-push]
compress-type=lz4
compress-level=3
```

**Key Changes:**
- New stanza name: `main-v2` (instead of `main`)
- New repo path: `/pgbackrest-v2` (instead of `/pgbackrest`)
- New cipher passphrase

#### 3.4 Create and Configure New Stanza

```bash
# Create the new stanza
sudo -u postgres pgbackrest --stanza=main-v2 stanza-create

# Verify stanza creation
sudo -u postgres pgbackrest --stanza=main-v2 check
```

**Expected Output:**
```
INFO: check command begin...
INFO: check repo1 configuration (primary)
INFO: check repo1 archive for WAL (primary)
INFO: WAL segment 000000010000000000000025 successfully archived to...
INFO: check command end: completed successfully
```

#### 3.5 Perform Initial Backup with New Encryption

```bash
# Create first full backup with new encryption
sudo -u postgres pgbackrest --stanza=main-v2 --type=full backup
```

**Expected Output:**
```
INFO: backup command begin...
INFO: execute non-exclusive pg_start_backup()...
INFO: backup start archive = 000000010000000000000026, lsn = 0/26000000
INFO: full backup size = 500MB
INFO: execute non-exclusive pg_stop_backup()...
INFO: backup command end: completed successfully
```

#### 3.6 Update PostgreSQL Archive Command

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/16/main/postgresql.conf
```

Update the archive command to use new stanza:

```ini
# OLD (comment out):
# archive_command = 'pgbackrest --stanza=main archive-push %p'

# NEW:
archive_command = 'pgbackrest --stanza=main-v2 archive-push %p'
```

Reload PostgreSQL configuration:

```bash
# Reload PostgreSQL (does not restart, no downtime)
sudo systemctl reload postgresql
```

#### 3.7 Verify Archive Command Works

```bash
# Force a WAL switch to test archiving
sudo -u postgres psql -c "SELECT pg_switch_wal();"

# Check that new WAL was archived
sudo -u postgres pgbackrest --stanza=main-v2 info
```

#### 3.8 Update Monitoring and Backup Scripts

```bash
# Find all scripts referencing old stanza
cd /home/admincostplus/projects/costplusdb
grep -r "stanza=main" scripts/

# Update each script to use main-v2
# Example for monitoring script:
sudo nano /usr/local/bin/check_backup_health.sh
```

Replace all instances of `--stanza=main` with `--stanza=main-v2`

#### 3.9 Option B: Re-encrypt Existing Backups (Advanced)

**WARNING:** This option is complex and risky. Only use if absolutely necessary.

```bash
# This requires:
# 1. Downloading all backups from S3
# 2. Decrypting with old passphrase
# 3. Re-encrypting with new passphrase
# 4. Re-uploading to S3

# NOT RECOMMENDED - Use Option A instead
```

If you must use this option, contact pgBackRest support or a PostgreSQL consultant.

---

### Step 4: Verification and Testing (30 minutes)

#### 4.1 Verify All Credentials Updated

```bash
# Check pgBackRest configuration
sudo cat /etc/pgbackrest.conf | grep -E "(s3-key|cipher-pass)"

# Verify no old credentials remain
sudo grep -r "49S2EH8V84D0JO6DH5MV" /etc/
sudo grep -r "tXoiSmzmMh67qJ" /etc/
```

**Expected:** No results found for old credentials.

#### 4.2 Test Complete Backup Cycle

```bash
# Run differential backup
sudo -u postgres pgbackrest --stanza=main-v2 --type=diff backup

# Verify backup completed
sudo -u postgres pgbackrest --stanza=main-v2 info
```

#### 4.3 Test Restore (Critical Step)

```bash
# Create test restore location
sudo mkdir -p /tmp/restore-test
sudo chown postgres:postgres /tmp/restore-test

# Perform test restore
sudo -u postgres pgbackrest --stanza=main-v2 \
    --delta \
    --pg1-path=/tmp/restore-test \
    restore

# Verify restore completed
ls -la /tmp/restore-test

# Clean up
sudo rm -rf /tmp/restore-test
```

**Expected Output:**
```
INFO: restore command begin...
INFO: restore backup set 20251019-140000F
INFO: restore file /tmp/restore-test/PG_VERSION (3B, 100%)
INFO: restore file /tmp/restore-test/base/... [multiple files]
INFO: restore command end: completed successfully
```

#### 4.4 Test Monitoring Scripts

```bash
# Run backup monitoring script
sudo /usr/local/bin/check_backup_health.sh

# Check output for errors
echo $?  # Should return 0 (success)
```

#### 4.5 Verify Automated Backups

```bash
# Check cron jobs are configured
sudo crontab -u postgres -l

# Verify timing of next scheduled backup
sudo systemctl list-timers
```

---

### Step 5: Update Credential Storage (15 minutes)

#### 5.1 Store All New Credentials in 1Password

Create or update these entries in 1Password:

1. **CostPlusDB - Server Admin Password**
   - Username: `admincostplus`
   - Password: `[new sudo password]`
   - Notes: Changed 2025-10-19 due to git exposure

2. **CostPlusDB - Wasabi S3 Credentials**
   - Access Key ID: `[new access key]`
   - Secret Access Key: `[new secret key]`
   - Notes: Rotated 2025-10-19, old key deleted from Wasabi

3. **CostPlusDB - Backup Encryption Passphrase**
   - Passphrase: `[new 64-char passphrase]`
   - Notes: New stanza main-v2 created 2025-10-19

#### 5.2 Document Rotation in Security Log

Create a security incident log entry:

```bash
# Create incident log
cat >> ~/security-incidents.log <<EOF
[2025-10-19] SECURITY INCIDENT - Credentials Exposed in Git
- Commit: 3f05c90
- Exposed: Wasabi S3 keys, backup passphrase, sudo password
- Action: All credentials rotated
- New backup stanza: main-v2
- Wasabi old key deleted
- Verified: Backups and restore working
- Status: RESOLVED
EOF
```

---

## Priority 2: Git History Cleanup

**Timeline:** Complete within 1 week after credential rotation.

### Understanding the Problem

The exposed credentials exist in git history (commit `3f05c90`). Even though they've been rotated, the old credentials remain in:
- Local git repository
- GitHub repository history
- Any clones others may have made

### Option A: BFG Repo-Cleaner (RECOMMENDED)

**Pros:** Fast, safe, designed for this purpose
**Cons:** Requires Java, rewrites history (breaks existing clones)

#### Install BFG Repo-Cleaner

```bash
# On Ubuntu/Debian
sudo apt-get update
sudo apt-get install default-jre

# Download BFG
cd ~/Downloads
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar
```

#### Create Backup of Repository

```bash
# Create complete backup
cd /home/admincostplus/projects
tar -czf costplusdb-backup-$(date +%Y%m%d).tar.gz costplusdb/

# Verify backup
tar -tzf costplusdb-backup-$(date +%Y%m%d).tar.gz | head
```

#### Create Replacements File

```bash
cd /home/admincostplus/projects/costplusdb

# Create file with patterns to search for (replace with your actual exposed values)
cat > ~/passwords.txt <<EOF
[WASABI_ACCESS_KEY]
[WASABI_SECRET_KEY]
[BACKUP_ENCRYPTION_PASSPHRASE]
[REDACTED]
EOF
```

#### Run BFG to Remove Credentials

```bash
# Run BFG (replace passwords in all history)
java -jar ~/Downloads/bfg-1.14.0.jar \
    --replace-text ~/passwords.txt \
    /home/admincostplus/projects/costplusdb

# Clean up repository
cd /home/admincostplus/projects/costplusdb
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**Expected Output:**
```
Using repo : /home/admincostplus/projects/costplusdb/.git

Found 15 commits
Cleaned commits: 15

BFG run is complete! When ready, run: git reflog expire --expire=now --all && git gc --prune=now --aggressive
```

#### Force Push to GitHub

```bash
# Verify changes look correct
git log --oneline | head -10

# Force push to GitHub (rewrites history)
git push --force origin main
```

**WARNING:** This will rewrite GitHub history. Anyone with clones must re-clone.

#### Clean Up Sensitive Files

```bash
# Securely delete passwords file
shred -u ~/passwords.txt

# Verify deletion
ls -la ~/passwords.txt  # Should show "No such file"
```

---

### Option B: Git Filter-Branch (Manual)

**Pros:** No external tools required
**Cons:** Slower, more error-prone, complex syntax

```bash
# Backup first
cd /home/admincostplus/projects
tar -czf costplusdb-backup-$(date +%Y%m%d).tar.gz costplusdb/

cd costplusdb

# Filter all commits to remove sensitive data
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch scripts/*.sh" \
  --prune-empty --tag-name-filter cat -- --all

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push --force origin main
```

**Note:** This removes entire files. Use BFG for text replacement.

---

### Option C: Create New Repository (Nuclear Option)

**Pros:** Completely clean slate, simple
**Cons:** Loses all history, breaks links, most disruptive

```bash
# Export current state (no history)
cd /home/admincostplus/projects/costplusdb
git archive --format=tar.gz --output=../costplusdb-clean.tar.gz HEAD

# Create new repository
cd /home/admincostplus/projects
mkdir costplusdb-new
cd costplusdb-new
tar -xzf ../costplusdb-clean.tar.gz

# Initialize new git repo
git init
git add .
git commit -m "Initial commit - clean repository"

# Create new GitHub repository
# Then push:
git remote add origin https://github.com/jeremylongshore/cost-plus-db-new.git
git push -u origin main
```

**Important:** Update all documentation, links, and references to new repository URL.

---

### Post-Cleanup Actions

#### Notify Collaborators

If anyone else has cloned this repository:

```
Subject: URGENT - Repository History Rewritten - Re-clone Required

Team,

Due to a security incident, we have rewritten the git history of the
costplusdb repository. All credentials have been rotated and are now safe.

ACTION REQUIRED:
1. Delete your local clone
2. Re-clone from GitHub: git clone https://github.com/jeremylongshore/cost-plus-db.git
3. Do NOT merge old branches - they contain exposed credentials

Questions? Contact Jeremy immediately.
```

#### Verify GitHub History Clean

```bash
# Clone repository fresh
cd /tmp
git clone https://github.com/jeremylongshore/cost-plus-db.git test-clone
cd test-clone

# Search for old credentials (replace with your actual exposed values)
git log -p -S "[WASABI_ACCESS_KEY]"  # Should return nothing
git log -p -S "echo.*sudo -S"        # Should return nothing
```

**Expected:** No results found.

---

## Troubleshooting

### Issue: pgBackRest Cannot Connect to S3

**Symptoms:**
```
ERROR: [056] unable to connect to S3: 403 Forbidden
```

**Solution:**
1. Verify new credentials copied correctly (no extra spaces)
2. Check Wasabi console that new key is active
3. Verify old key was not deleted prematurely
4. Check S3 endpoint is correct: `s3.us-east-1.wasabisys.com`

---

### Issue: Backup Fails with Encryption Error

**Symptoms:**
```
ERROR: [057] unable to decrypt: cipher pass invalid
```

**Solution:**
1. Verify new passphrase was copied correctly
2. Check passphrase has no trailing newline or spaces
3. Confirm passphrase is exactly as generated by openssl
4. Try regenerating passphrase and updating again

---

### Issue: PostgreSQL Cannot Archive WALs

**Symptoms:**
```
ERROR: archive command failed with exit code 1
```

**Solution:**
1. Check archive_command uses correct stanza name
2. Verify pgbackrest.conf has correct permissions (640)
3. Test manually: `sudo -u postgres pgbackrest --stanza=main-v2 archive-push /var/lib/postgresql/16/main/pg_wal/000000010000000000000001`
4. Check PostgreSQL logs: `sudo tail -100 /var/log/postgresql/postgresql-16-main.log`

---

### Issue: BFG Repo-Cleaner Fails

**Symptoms:**
```
ERROR: Could not read object...
```

**Solution:**
1. Ensure you're running BFG outside the repository directory
2. Verify Java is installed: `java -version`
3. Try cleaning git first: `git gc --aggressive`
4. Use absolute paths in BFG command

---

### Issue: Force Push Rejected by GitHub

**Symptoms:**
```
! [remote rejected] main -> main (protected branch)
```

**Solution:**
1. Go to GitHub repository settings
2. Navigate to Branches > Branch protection rules
3. Temporarily disable protection for main branch
4. Force push
5. Re-enable branch protection

---

## Final Verification Checklist

Use this checklist to confirm all steps completed successfully:

### Credential Rotation

- [ ] Sudo password changed
- [ ] New sudo password stored in 1Password
- [ ] Tested sudo access with new password
- [ ] Wasabi new access keys generated
- [ ] New Wasabi keys stored in 1Password
- [ ] pgbackrest.conf updated with new S3 credentials
- [ ] New backup encryption passphrase generated
- [ ] New passphrase stored in 1Password
- [ ] New backup stanza created (main-v2) or backups re-encrypted
- [ ] pgbackrest.conf updated with new passphrase
- [ ] PostgreSQL archive_command updated to new stanza
- [ ] Old Wasabi access key deleted from console

### Testing

- [ ] Full backup completed with new credentials
- [ ] Differential backup completed successfully
- [ ] Test restore performed and verified
- [ ] pgbackrest info shows correct backup status
- [ ] WAL archiving working (check with pg_switch_wal)
- [ ] Monitoring scripts updated and tested
- [ ] Cron jobs verified and running

### Git History Cleanup

- [ ] Repository backup created before cleanup
- [ ] BFG Repo-Cleaner run (or alternative method)
- [ ] Git history cleaned locally
- [ ] Force push to GitHub completed
- [ ] Fresh clone verified no exposed credentials
- [ ] Collaborators notified to re-clone (if applicable)
- [ ] Old repository backup secured or deleted

### Documentation

- [ ] Security incident logged
- [ ] All credentials documented in 1Password
- [ ] Team notified of credential rotation
- [ ] This guide marked as completed
- [ ] Next rotation scheduled (12 months)

---

## Post-Incident Review

### Lessons Learned

1. **Never commit credentials to git** - Even in test/script files
2. **Use environment variables** - All credentials should be in .env files
3. **Add .env to .gitignore** - Before first commit
4. **Use git hooks** - Pre-commit hooks can scan for secrets
5. **Regular security audits** - Review git history monthly

### Prevention Measures

#### Install git-secrets

```bash
# Install git-secrets to prevent future incidents
cd /home/admincostplus/projects/costplusdb

# Install git-secrets
git clone https://github.com/awslabs/git-secrets.git /tmp/git-secrets
cd /tmp/git-secrets
sudo make install

# Configure for repository
cd /home/admincostplus/projects/costplusdb
git secrets --install
git secrets --register-aws
```

#### Create .gitignore for Credentials

```bash
# Add to .gitignore
cat >> .gitignore <<EOF

# Credentials and secrets
.env
.env.*
*.pem
*.key
*-credentials.json
*password*.txt
*secret*.txt
backup-passphrase.txt
EOF

git add .gitignore
git commit -m "Add credential patterns to gitignore"
```

#### Use Environment Variables

Example for scripts:

```bash
# Instead of hardcoded credentials in scripts
# BAD:
WASABI_KEY="49S2EH8V84D0JO6DH5MV"

# GOOD:
# Load from environment file
if [ -f ~/.env-costplusdb ]; then
    source ~/.env-costplusdb
else
    echo "ERROR: Credentials file not found"
    exit 1
fi

# Use $WASABI_KEY variable
```

Create environment file:

```bash
# Create secure environment file
cat > ~/.env-costplusdb <<EOF
export WASABI_ACCESS_KEY="your-key-here"
export WASABI_SECRET_KEY="your-secret-here"
export BACKUP_PASSPHRASE="your-passphrase-here"
EOF

# Secure it
chmod 600 ~/.env-costplusdb
```

---

## Schedule Next Rotation

**Best Practice:** Rotate credentials every 90-180 days, or immediately if:
- Employee leaves with access
- Credential exposure suspected
- Security audit recommendation
- Compliance requirement

Set calendar reminder for: **January 19, 2026**

```bash
# Add to calendar or cron
echo "2026-01-19: Rotate CostPlusDB credentials (quarterly)" >> ~/security-schedule.txt
```

---

## Contact Information

**Security Issues:**
- Primary: Jeremy Longshore (jeremy@costplusdb.com)
- Escalation: [Security Team Contact]

**Technical Support:**
- pgBackRest: https://pgbackrest.org/support.html
- Wasabi Support: https://wasabi.com/support/
- PostgreSQL: https://www.postgresql.org/support/

---

## Document History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-19 | 1.0 | Initial creation - Emergency response to credential exposure | Claude Code |

---

**END OF DOCUMENT**

This guide should be reviewed and updated after each credential rotation to reflect any process improvements or lessons learned.