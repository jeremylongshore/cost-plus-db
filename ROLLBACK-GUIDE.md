# CostPlusDB Rollback Guide

## Safe Rollback Points

This document describes all available rollback points for the CostPlusDB project.

---

## 🚨 GOLDEN SNAPSHOT: v1.1.0-rollback

**Use this tag for emergency rollback to pre-customer baseline.**

### When to Use
- Before acquiring first customer
- After any failed deployment
- For testing purposes
- As reference implementation

### What's Included
✅ Complete pricing model (v1.1.0)
✅ All contradictions resolved (44 pricing, 8 backup, 5 Slack)
✅ Emergency procedures and activity log
✅ Backend authentication (85% production-ready)
✅ Security audit completion
✅ CHANGELOG.md

### What's NOT Included
❌ Real customer data
❌ Production API keys
❌ Real payment processing
❌ Customer databases

### Rollback Command
```bash
git checkout v1.1.0-rollback
```

---

## 📦 Available Versions

### v1.1.0 (2025-10-21) - LATEST
**Base + Add-Ons Pricing Model**

- **Pricing:** $59/$119/$179/$299
- **Breaking:** Tier-specific backups and Slack support
- **Status:** Zero customers, safe to rollback FROM or TO
- **Tag:** `v1.1.0`
- **GitHub Release:** https://github.com/jeremylongshore/cost-plus-db/releases/tag/v1.1.0

**Rollback Command:**
```bash
git checkout v1.1.0
```

---

### v1.1.0-rollback (2025-10-21) - GOLDEN SNAPSHOT
**Safe Pre-Customer Baseline**

- **Purpose:** Emergency rollback point
- **Identical to:** v1.1.0 (same commit)
- **Use When:** You need guaranteed safe state
- **Tag:** `v1.1.0-rollback`

**Rollback Command:**
```bash
git checkout v1.1.0-rollback
```

---

### v1.0.0 (2025-10-19)
**Emergency Procedures + Activity Log**

- **Pricing:** $49/$89/$129/$149 (OLD)
- **Features:** Emergency procedures page, activity log
- **Breaking:** Migration policy ($500), emoji removal
- **Tag:** `v1.0.0` (if created)

**Rollback Command:**
```bash
git checkout v1.0.0
```

---

## 🔀 Backup Branch

### backup/pre-customer-v1.1.0
**Dedicated branch for rollback safety**

- **Purpose:** Named branch (easier to reference than tags)
- **Identical to:** v1.1.0 and v1.1.0-rollback
- **Use When:** You prefer branches over tags
- **Branch:** `backup/pre-customer-v1.1.0`

**Rollback Command:**
```bash
git checkout backup/pre-customer-v1.1.0
```

---

## 🛠️ Rollback Procedures

### Simple Rollback (View Only)
```bash
# View available tags
git tag -l

# Checkout specific version (read-only)
git checkout v1.1.0-rollback

# Return to main
git checkout main
```

### Emergency Rollback to Main Branch
**⚠️ DANGER: Only use if zero customers**

```bash
# Create recovery branch from rollback point
git checkout -b recovery-from-rollback v1.1.0-rollback

# Test thoroughly
npm test
# ... verify everything works ...

# Force push to main (DESTROYS CURRENT MAIN)
git push origin recovery-from-rollback:main --force

# Cleanup
git checkout main
git pull
git branch -D recovery-from-rollback
```

### Partial Rollback (Specific Files)
```bash
# Rollback specific files from tag
git checkout v1.1.0-rollback -- website/index.html
git checkout v1.1.0-rollback -- website/calculator.html

# Commit the partial rollback
git commit -m "Partial rollback: restore pricing from v1.1.0-rollback"
git push origin main
```

---

## 📋 Verification Checklist

After any rollback:

- [ ] Run `git log --oneline -5` to verify commit history
- [ ] Run `git tag` to list all tags
- [ ] Check `git status` for clean working directory
- [ ] Verify website loads: https://costplusdb.dev
- [ ] Check pricing: Should match expected version
- [ ] Test calculator: https://costplusdb.dev/calculator.html
- [ ] Review activity log: https://costplusdb.dev/activity.html
- [ ] Check CHANGELOG.md for version info
- [ ] Run backend tests: `cd backend && npm test` (if applicable)
- [ ] Verify Netlify deployment status

---

## 🔗 Quick Reference

### View Current Version
```bash
git describe --tags
git log --oneline -1
```

### List All Rollback Points
```bash
# Tags
git tag -l

# Branches
git branch -a | grep backup
```

### Show Differences Between Versions
```bash
# Compare tags
git diff v1.0.0..v1.1.0

# Compare to rollback point
git diff v1.1.0-rollback..HEAD
```

---

## 🆘 Emergency Contacts

**GitHub Repository:** https://github.com/jeremylongshore/cost-plus-db
**Live Website:** https://costplusdb.dev
**Owner:** Jeremy Longshore (jeremy@intentsolutions.io)

---

## 📝 Notes

- **All rollback points are safe:** Zero customers at time of creation
- **Tags are immutable:** Once created, they cannot change
- **Branches can be updated:** Use tags for guaranteed snapshots
- **Always test rollbacks:** In a separate branch first
- **Document rollback reasons:** In CHANGELOG.md

---

**Last Updated:** 2025-10-21
**Version:** 1.0
