# Git History Cleanup Procedure

**Created:** 2025-10-20
**Purpose:** Remove exposed Wasabi S3 credentials from git history before making repository public
**Status:** 📋 DOCUMENTED (not executed - repository is currently private)
**Required Before:** Making repository public on GitHub

---

## Background

**Issue:** Real Wasabi S3 credentials were committed to git history in commit `3f05c90` (2025-10-20 03:34:26).

**Exposed Credentials:**
- **File:** `001-security/config/backup/pgbackrest.conf`
- **Commit:** `3f05c90143b3f504b1b343e02063ab10d201c540`
- **Wasabi Access Key:** `49S2EH8V84D0JO6DH5MV`
- **Wasabi Secret Key:** `q46A3zvsEITqXeB3cbQTnyPnCFRe8XI6mSyVZuQy`

**Current Status:**
- Repository is **PRIVATE** (only team members have access)
- Credentials have been rotated (old keys invalidated)
- File is now in `.gitignore`
- Git history cleanup is **DEFERRED** until repository goes public

---

## When to Execute This Procedure

**Trigger:** Before changing repository visibility from PRIVATE to PUBLIC

**DO NOT execute this procedure until:**
1. ✅ All team members have committed and pushed their work
2. ✅ No one has unpushed commits
3. ✅ Wasabi S3 credentials have been rotated
4. ✅ Backup of repository created
5. ✅ Team is prepared to re-clone repository after cleanup

---

## Prerequisites

### 1. Install BFG Repo-Cleaner

**On macOS:**
```bash
brew install bfg
```

**On Linux:**
```bash
# Download latest release
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar -O ~/bin/bfg.jar

# Create alias
echo 'alias bfg="java -jar ~/bin/bfg.jar"' >> ~/.bashrc
source ~/.bashrc
```

**Verify installation:**
```bash
bfg --version
# Should output: bfg 1.14.0
```

### 2. Create Complete Backup

**CRITICAL:** This is a destructive operation. Create backup first.

```bash
# Create mirror backup (preserves all refs)
cd /tmp
git clone --mirror https://github.com/jeremylongshore/cost-plus-db.git costplusdb-backup-$(date +%Y%m%d).git

# Verify backup
cd costplusdb-backup-$(date +%Y%m%d).git
git log --all --oneline | wc -l  # Should show 110+ commits

# Archive backup
cd /tmp
tar -czf costplusdb-backup-$(date +%Y%m%d).tar.gz costplusdb-backup-$(date +%Y%m%d).git
mv costplusdb-backup-$(date +%Y%m%d).tar.gz ~/backups/

echo "Backup created at: ~/backups/costplusdb-backup-$(date +%Y%m%d).tar.gz"
```

### 3. Notify Team

Send notification to all team members:

```
Subject: IMPORTANT: Git Repository Cleanup Scheduled

We will be cleaning sensitive data from the git history of cost-plus-db
repository on [DATE] at [TIME].

REQUIRED ACTIONS:
1. Commit and push all your work BEFORE [DATE TIME]
2. After cleanup completes, DELETE your local repository
3. Re-clone the repository from GitHub

DO NOT:
- Pull or push during the cleanup window
- Keep working in your old local repository after cleanup

Timeline:
- [DATE TIME]: Cleanup begins
- [DATE TIME + 30 min]: Force push to GitHub
- [DATE TIME + 30 min]: Safe to re-clone

Backup location: ~/backups/costplusdb-backup-[DATE].tar.gz
```

---

## Cleanup Procedure

### Step 1: Prepare Working Directory

```bash
cd /home/admincostplus/projects/costplusdb

# Ensure you're on main branch with latest changes
git checkout main
git pull origin main

# Verify no uncommitted changes
git status
# Should show: "nothing to commit, working tree clean"
```

### Step 2: Remove File from Git History

**Target file:** `001-security/config/backup/pgbackrest.conf`

```bash
# Use BFG to remove file from all commits
bfg --delete-files pgbackrest.conf .git

# BFG will rewrite history, removing the file from all commits
# but preserving all other changes
```

**Expected output:**
```
Using repo : /home/admincostplus/projects/costplusdb/.git

Found XX commits
Cleaning commits:   100% (XX/XX)
Cleaning commits completed in XXX ms.

BFG run is complete! When ready, run: git reflog expire --expire=now --all && git gc --prune=now --aggressive
```

### Step 3: Clean Up Repository

```bash
# Expire all reflog entries
git reflog expire --expire=now --all

# Aggressive garbage collection
git gc --prune=now --aggressive
```

**Expected output:**
```
Enumerating objects: XXXX, done.
Counting objects: 100% (XXXX/XXXX), done.
Delta compression using up to 8 threads
Compressing objects: 100% (XXXX/XXXX), done.
Writing objects: 100% (XXXX/XXXX), done.
Total XXXX (delta XXXX), reused XXXX (delta XXXX), pack-reused 0
```

### Step 4: Verify Cleanup

```bash
# Search for exposed credentials in history
git log --all --full-history --source --all -- '*pgbackrest.conf'
# Should return: (empty - file no longer in history)

# Search for credential strings
git log --all -S "49S2EH8V84D0JO6DH5MV" --oneline
# Should return: (empty)

git log --all -S "q46A3zvsEITqXeB3cbQTnyPnCFRe8XI6mSyVZuQy" --oneline
# Should return: (empty)

# Run gitleaks scan again
~/bin/gitleaks detect --verbose --report-path=001-security/scans/gitleaks-post-cleanup-scan.json
# Should find 0 Wasabi credentials in 001-security/config/backup/pgbackrest.conf
```

### Step 5: Force Push to GitHub

**⚠️ WARNING:** This rewrites public git history. All team members must re-clone.

```bash
# Force push all branches
git push origin --force --all

# Force push all tags
git push origin --force --tags
```

**Expected output:**
```
+ 3f05c90...a1b2c3d main -> main (forced update)
```

### Step 6: Verify on GitHub

1. Go to: https://github.com/jeremylongshore/cost-plus-db
2. Navigate to commit history
3. Search for commit `3f05c90` - **should not exist**
4. Check file `001-security/config/backup/pgbackrest.conf` - **should not exist in any commit**

### Step 7: Notify Team to Re-Clone

Send notification:

```
Subject: Git Repository Cleanup Complete - Action Required

The cost-plus-db repository cleanup is complete.

REQUIRED ACTIONS (by all team members):

1. DELETE your local repository:
   cd ~/projects
   rm -rf costplusdb

2. Re-clone from GitHub:
   git clone https://github.com/jeremylongshore/cost-plus-db.git costplusdb

3. Verify:
   cd costplusdb
   git log --all --oneline | wc -l
   # Should show approximately 110 commits (same as before)

DO NOT attempt to push from old local repository.
```

---

## Rollback Procedure

If something goes wrong during cleanup:

### Option 1: Restore from Backup (Safest)

```bash
# Delete corrupted repository
cd ~/projects
rm -rf costplusdb

# Restore from backup
cd /tmp
tar -xzf ~/backups/costplusdb-backup-YYYYMMDD.tar.gz
cd costplusdb-backup-YYYYMMDD.git

# Push backup to GitHub (force)
git push --mirror https://github.com/jeremylongshore/cost-plus-db.git

# Re-clone fresh copy
cd ~/projects
git clone https://github.com/jeremylongshore/cost-plus-db.git costplusdb
```

### Option 2: Abort Mid-Process

If you haven't force-pushed yet:

```bash
# Reset to origin/main (undo local history rewrite)
git fetch origin
git reset --hard origin/main

# You're back to original state
```

---

## Post-Cleanup Verification Checklist

After cleanup completes:

- [ ] Searched git history for `pgbackrest.conf` - not found
- [ ] Searched git history for Wasabi access key - not found
- [ ] Searched git history for Wasabi secret key - not found
- [ ] Gitleaks scan shows 0 Wasabi credentials in pgbackrest.conf
- [ ] Force pushed to GitHub successfully
- [ ] Verified commit `3f05c90` does not exist on GitHub
- [ ] All team members notified to re-clone
- [ ] At least one team member successfully re-cloned
- [ ] Backup archived in `~/backups/`

---

## Files Removed from History

| File | Reason | Commit |
|------|--------|--------|
| `001-security/config/backup/pgbackrest.conf` | Contains real Wasabi S3 credentials | `3f05c90` |

**Note:** Only this file contains actual exposed credentials. Other findings in gitleaks scan are:
- Documentation examples (safe placeholders)
- Security audit reports (documenting the exposure)
- Test fixtures (fake test values)

---

## Alternative: Selective Commit Rewriting

If BFG removes too much, use git-filter-repo for surgical removal:

```bash
# Install git-filter-repo
pip3 install git-filter-repo

# Remove only specific file from specific commits
git filter-repo --path 001-security/config/backup/pgbackrest.conf --invert-paths

# This removes ONLY pgbackrest.conf, preserving all other files
```

---

## Prevention Measures

After cleanup, ensure this doesn't happen again:

### 1. Add to .gitignore

```bash
# Add to .gitignore
echo '# Security configs with real credentials' >> .gitignore
echo '001-security/config/backup/pgbackrest.conf' >> .gitignore
echo '001-security/keys/api-tokens/*' >> .gitignore
echo '!001-security/keys/api-tokens/.gitkeep' >> .gitignore

git add .gitignore
git commit -m "security: add sensitive config files to .gitignore"
git push origin main
```

### 2. Install Pre-Commit Hook

```bash
# Install pre-commit framework
pip3 install pre-commit

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml <<'EOF'
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.2
    hooks:
      - id: gitleaks
EOF

# Install hook
pre-commit install

# Test
pre-commit run --all-files
```

### 3. Create .gitleaksignore

```bash
# Exclude known safe patterns
cat > .gitleaksignore <<'EOF'
# Documentation examples (placeholder values)
000-docs/**/*-GUID-*.md:generic-api-key
000-docs/**/*-ARCH-*.md:generic-api-key
backend/.env.example:stripe-access-token

# Test fixtures
backend/tests/**/*.test.ts:generic-api-key

# AWS documentation examples
000-docs/005-DR-SOPS-postgresql-operations.md:aws-access-token

# Security audit documentation
000-docs/028-DR-AUDIT-security-pre-launch.md
000-docs/030-DR-GUID-credential-rotation-emergency.md
000-docs/025-PM-TASK-make-repo-public-safely.md
EOF

git add .gitleaksignore
git commit -m "security: configure gitleaks to ignore safe patterns"
git push origin main
```

---

## References

- **Gitleaks Scan Report:** `001-security/scans/gitleaks-scan-report.md`
- **BFG Documentation:** https://rtyley.github.io/bfg-repo-cleaner/
- **Git Filter-Repo:** https://github.com/newren/git-filter-repo
- **GitHub Removing Sensitive Data:** https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository

---

## Timeline Estimate

| Step | Duration |
|------|----------|
| Prerequisites (install BFG, create backup) | 10 minutes |
| Notify team | 5 minutes |
| Run BFG cleanup | 2 minutes |
| Verify cleanup | 5 minutes |
| Force push to GitHub | 1 minute |
| Team re-clones (parallel) | 5 minutes |
| **Total** | **~30 minutes** |

---

## Execution Log

**When this procedure is executed, document here:**

```
Date: [YYYY-MM-DD]
Executed by: [Name]
Backup location: [Path]
Commits before: [Count]
Commits after: [Count]
Force push time: [HH:MM:SS]
Team members notified: [Count]
Issues encountered: [None / Description]
Status: [SUCCESS / FAILED / ROLLED BACK]
```

---

**Procedure Status:** 📋 DOCUMENTED (not executed)
**Next Action:** Execute when ready to make repository public
**Owner:** Security Team
**Last Updated:** 2025-10-20
