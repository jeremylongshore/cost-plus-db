# Incident Postmortem: Netlify Deployment Failure (2025-10-26)

**Document ID:** 078-PM-INCI
**Category:** Project Management - Incident
**Incident Date:** 2025-10-22 through 2025-10-26
**Resolution Date:** 2025-10-26 12:15 AM
**Severity:** P2 (High) - Site serving stale content, new features not deployed
**Status:** Resolved

---

## Executive Summary

CostPlusDB website deployment pipeline broke on October 22, 2025, causing the live site to serve stale content (v1.2.0) for 4 days while new features (benchmarks page, form security) remained undeployed. The incident affected the launch of the benchmark transparency page and prevented 6 git commits from reaching production.

**Impact:**
- Live site frozen at v1.2.0 (October 22)
- Benchmarks page showed 404 (file existed in repo but not deployed)
- Form security enhancements not live
- No auto-deploys triggered from GitHub pushes
- Duration: 4 days (96 hours)

**Root Causes:**
1. Missing `.gitmodules` file for git submodule (sysbench-tpcc)
2. Double base directory configuration (Netlify dashboard + netlify.toml conflict)

**Resolution:**
- Created `.gitmodules` with proper submodule URL
- Fixed netlify.toml to use relative paths (compatible with dashboard base directory)
- Cleared Netlify build cache
- Manual deploy succeeded

---

## Timeline

### October 22, 2025 (Last Successful Deploy)

**8:29 PM UTC** - Deploy succeeded with commit `56ef244` (v1.2.0 release)
- Configuration: `website/netlify.toml` with `publish = "."`
- Netlify dashboard: `base directory = "website"`
- Result: Deployed successfully from `website/` directory

### October 25, 2025 (Deployments Begin Failing - Undetected)

**Commit 6126155** - Add benchmark transparency page
- Added `website/benchmarks/index.html`
- Added benchmark data files
- Updated navigation with benchmarks link
- **Expected:** Auto-deploy to production
- **Actual:** No deploy triggered (webhook missing - undetected)

**Commits 75b2a63, ba528c1, eb06f70** - Attempted deployment fixes
- Created ROOT `netlify.toml` with `base = "website"`
- Deleted `website/netlify.toml`
- Fixed CSS paths to absolute
- **Problem Introduced:** Double base directory (`website/website/`)
- **Expected:** Fix deployment
- **Actual:** Broke deployment (would fail if triggered)

**Commit c3cc1c6** - Force redeploy attempt
- Empty commit to trigger Netlify
- **Actual:** No deploy triggered (webhook still missing)

### October 26, 2025 12:00 AM - 12:15 AM (Active Troubleshooting)

**12:00 AM** - User reports: "Site not updating, benchmark page 404"

**12:05 AM** - Investigation reveals:
- GitHub webhook missing (`gh api repos/.../hooks` returns `[]`)
- Live site serves v1.2.0 (4 days old)
- ETag unchanged, age header showing cached content

**12:06 AM** - Hypothesis: Netlify not connected to GitHub
- Attempted Netlify CLI login (failed - not authenticated)
- Confirmed all commits pushed to GitHub successfully

**12:07 AM** - User attempts manual deploy in Netlify dashboard

**12:08 AM** - **DEPLOY FAILURE #1:**
```
Failed during stage 'preparing repo': Error checking out submodules:
fatal: No url found for submodule path 'testing/benchmarks/sysbench-tpcc'
in .gitmodules: exit status 128
```

**Analysis:**
- `testing/benchmarks/sysbench-tpcc` is a git submodule (mode `160000`)
- Points to: `https://github.com/Percona-Lab/sysbench-tpcc.git`
- `.gitmodules` file missing from repository
- Netlify cannot clone submodule without URL mapping

**12:08 AM** - **FIX #1 APPLIED:**
- Created `.gitmodules` file with proper configuration:
```
[submodule "testing/benchmarks/sysbench-tpcc"]
	path = testing/benchmarks/sysbench-tpcc
	url = https://github.com/Percona-Lab/sysbench-tpcc.git
```
- Committed as `76ceb07`
- Pushed to GitHub

**12:10 AM** - User attempts manual deploy again

**12:11 AM** - **DEPLOY FAILURE #2:**
```
Failed during stage 'building site': Deploy directory 'website/website'
does not exist
Custom publish path detected: 'website/website'
```

**Analysis:**
- Netlify dashboard has: `base directory = "website"`
- netlify.toml has: `publish = "website"`
- Netlify concatenates: `website/` + `website/` = `website/website/` ❌
- Directory doesn't exist

**12:12 AM** - **FIX #2 APPLIED:**
- Changed netlify.toml to relative paths:
```toml
[build]
  publish = "."  # Relative to dashboard base (website/)

[functions]
  directory = "netlify/functions"  # Relative to base
```
- Committed as `d18f760`
- Pushed to GitHub

**12:13 AM** - User clears Netlify cache and triggers manual deploy

**12:15 AM** - **DEPLOY SUCCESS:**
```
✓ Preparing repo
✓ Cloning submodule 'testing/benchmarks/sysbench-tpcc'
✓ Publishing from website/ directory
✓ Deploy succeeded!
```

**12:16 AM** - **VERIFICATION PASSED:**
- https://costplusdb.dev/ shows benchmarks link ✅
- https://costplusdb.dev/benchmarks/ returns HTTP 200 ✅
- Form security (reCAPTCHA) live ✅

---

## Root Cause Analysis

### Root Cause #1: Missing `.gitmodules` File

**What Happened:**
- `testing/benchmarks/sysbench-tpcc` was added as a git submodule
- Git requires `.gitmodules` file to map submodule path → URL
- `.gitmodules` file was missing (never committed or accidentally deleted)
- Netlify failed at "preparing repo" stage when trying to clone submodules

**How It Happened:**
- Likely scenarios:
  1. Ran `git submodule add` but `.gitmodules` got gitignored
  2. Cloned repo with `--recursive` but never committed `.gitmodules`
  3. `.gitmodules` deleted accidentally in cleanup

**Evidence:**
```bash
$ git ls-files -s testing/benchmarks/sysbench-tpcc
160000 f110afa8023c7924b1ba00177232a9090624acb5 0 testing/benchmarks/sysbench-tpcc

$ cat .gitmodules
cat: .gitmodules: No such file or directory

$ git submodule status
fatal: no submodule mapping found in .gitmodules for path 'testing/benchmarks/sysbench-tpcc'
```

**Why It Broke Netlify:**
- Netlify runs `git submodule update --init --recursive` during checkout
- Without `.gitmodules`, git doesn't know the URL to clone from
- Deploy fails before build even starts

### Root Cause #2: Double Base Directory Configuration

**What Happened:**
- Netlify dashboard has `base directory = "website"` (from initial setup)
- ROOT `netlify.toml` (created Oct 25) had `base = "website"` AND `publish = "website"`
- Netlify combined both: `website/` (dashboard) + `website/` (netlify.toml) = `website/website/`
- Directory doesn't exist → deploy fails

**Configuration History:**

| Date | Configuration | Result |
|------|---------------|--------|
| **Oct 22 (working)** | Dashboard: `base=website`<br>`website/netlify.toml`: `publish="."` | ✅ Deploys from `website/` |
| **Oct 25 (broken)** | Dashboard: `base=website`<br>ROOT `netlify.toml`: `base=website`, `publish="website"` | ❌ Tries `website/website/` |
| **Oct 26 (fixed)** | Dashboard: `base=website`<br>ROOT `netlify.toml`: `publish="."` | ✅ Deploys from `website/` |

**Why It Happened:**
- Moved `netlify.toml` from `website/` to ROOT for better configuration management
- Added `base = "website"` to netlify.toml (trying to make it self-contained)
- Didn't realize dashboard ALSO had base directory setting
- Settings combined instead of overriding

**Evidence from Deploy Log:**
```
Custom publish path detected. Proceeding with the specified path: 'website/website'
Custom functions path detected: 'website/website/netlify/functions'
Failed: Deploy directory 'website/website' does not exist
```

---

## Contributing Factors

### 1. Missing GitHub Webhook

**Issue:** No GitHub → Netlify webhook configured

**Evidence:**
```bash
$ gh api repos/jeremylongshore/cost-plus-db/hooks
[]
```

**Impact:**
- Auto-deploy never worked
- Git pushes didn't trigger builds
- Manual deploys were required to update site
- Delayed detection of deployment issues

**How It Should Work:**
- GitHub sends webhook to Netlify on git push to `main`
- Netlify receives webhook and triggers build
- Changes deploy automatically within 2-3 minutes

**Why It Was Missing:**
- Repository made public on Oct 25
- Webhook may have been removed during visibility change
- Or never configured when initially connecting to Netlify

**Status:** Still unresolved (user needs to configure in Netlify dashboard)

### 2. Netlify Dashboard Base Directory Not Visible

**Issue:** Netlify dashboard had `base directory = "website"` setting that wasn't obvious

**Impact:**
- Created conflicting configuration when adding `base =` to netlify.toml
- Assumed netlify.toml would be the source of truth
- Didn't check dashboard settings before making changes

**Lesson:** Always check Netlify dashboard settings before modifying netlify.toml

### 3. No Deploy Verification After Changes

**Issue:** Made multiple configuration changes without verifying deploys succeeded

**Timeline:**
- Oct 25: Created ROOT netlify.toml (commit ba528c1)
- Oct 25: Deleted website/netlify.toml (commit eb06f70)
- Oct 25: Force redeploy commit (c3cc1c6)
- **No verification that these deployed**
- Oct 26: Discovered site still on v1.2.0

**Impact:**
- Configuration changes sat in repo for days without being deployed
- Breaking changes (double base directory) went undetected
- Assumed changes were live when they weren't

**Lesson:** Verify deployments succeed after configuration changes

---

## Detection & Diagnosis

### How Was It Detected?

**User Observation:**
- Pushed multiple commits to GitHub
- Expected auto-deploy within 2-3 minutes
- Checked live site, still showing old version
- Benchmarks page returned 404

**Diagnostic Steps:**

1. **Confirmed git state:**
   ```bash
   $ git log -1 --oneline
   42eb0a6 Add comprehensive anti-phishing & anti-spam form security

   $ git push origin main
   Everything up-to-date  # Confirmed pushed
   ```

2. **Checked live site:**
   ```bash
   $ curl -s "https://costplusdb.dev/" | grep "v1\."
   <td class="width-min">v1.2.0</td>  # Still old version

   $ curl -sI "https://costplusdb.dev/benchmarks/"
   HTTP/2 404  # Page doesn't exist
   ```

3. **Checked GitHub webhooks:**
   ```bash
   $ gh api repos/jeremylongshore/cost-plus-db/hooks
   []  # No webhooks! Root cause identified
   ```

4. **Attempted Netlify CLI:**
   ```bash
   $ netlify status
   Not logged in. Please log in to see project status.
   ```

5. **User triggered manual deploy in Netlify dashboard**
   - First deploy: Submodule error
   - Second deploy: Double base directory error
   - Third deploy: Success (after fixes)

### Diagnosis Timeline

- **10 minutes:** Identified no webhooks → no auto-deploy
- **2 minutes:** Manual deploy attempt → submodule error
- **3 minutes:** Created `.gitmodules`, committed, pushed
- **2 minutes:** Second deploy attempt → double base directory error
- **3 minutes:** Fixed netlify.toml paths, committed, pushed
- **2 minutes:** Cleared cache, third deploy → SUCCESS

**Total diagnosis time:** 22 minutes

---

## Impact Assessment

### User Impact

**Severity:** P2 (High) - Site operational but serving stale content

**Affected Users:**
- Website visitors saw old content (v1.2.0 from Oct 22)
- Benchmarks page showed 404 (mentioned in marketing, not accessible)
- Form submissions worked (v1.2.0 form functional, but without new security features)

**Duration:** 4 days (96 hours)

**Blast Radius:**
- **0 customers** (pre-launch, no paying customers yet)
- **~20-50 estimated visitors** (public repository announcement on Oct 25)
- **1 major feature launch blocked** (benchmarks transparency page)

### Business Impact

**Reputation:**
- Published GitHub repository with broken deployment pipeline
- Announced benchmarks page on Oct 25, but page was 404 until Oct 26
- Credibility issue: "transparent database company can't deploy own website"

**Launch Impact:**
- Benchmarks page delayed 4 days
- Form security delayed 4 days
- Pre-launch momentum slowed

**Cost:**
- Engineering time: ~2 hours total (diagnosis + fixes)
- Opportunity cost: Delayed first customer outreach (benchmarks page needed for credibility)

---

## Resolution

### Immediate Fixes

**Fix #1: Created `.gitmodules` File**
```bash
# File: .gitmodules
[submodule "testing/benchmarks/sysbench-tpcc"]
	path = testing/benchmarks/sysbench-tpcc
	url = https://github.com/Percona-Lab/sysbench-tpcc.git
```

**Commit:** `76ceb07`
**Result:** Netlify can now clone submodule during checkout

---

**Fix #2: Corrected netlify.toml Paths**
```toml
# Before (broken):
[build]
  base = "website"
  publish = "website"

# After (fixed):
[build]
  publish = "."  # Relative to dashboard base (website/)

[functions]
  directory = "netlify/functions"  # Relative to base
```

**Commit:** `d18f760`
**Result:** Publishes from correct directory (`website/`, not `website/website/`)

---

**Fix #3: Cleared Netlify Cache**
- Netlify dashboard → Site settings → Build & deploy
- Clear cache and retry deploy
- **Result:** Fresh build without cached submodule errors

---

### Verification

**Post-Fix Checks (All Passed):**

```bash
# Benchmarks link visible on homepage
$ curl -s "https://costplusdb.dev/" | grep -i benchmark
<a href="/benchmarks/">Benchmarks</a>........Real multi-tenant performance, brutally honest
✅ PASS

# Benchmarks page accessible
$ curl -sI "https://costplusdb.dev/benchmarks/"
HTTP/2 200
✅ PASS

# Form security deployed
$ curl -s "https://costplusdb.dev/calculator.html" | grep recaptcha
data-netlify-recaptcha="true"
✅ PASS

# New ETag (fresh deploy)
$ curl -sI "https://costplusdb.dev/" | grep etag
etag: "84fb865d805eaf020743ab604ef300e5-ssl"
✅ PASS (changed from 1760856235-ssl)
```

---

## Lessons Learned

### What Went Well

1. **Comprehensive investigation:** Used systematic debugging (git status, curl, GitHub API)
2. **Clear error messages:** Netlify deploy logs pinpointed exact failures
3. **Quick fixes:** Once root causes identified, fixes took <5 minutes each
4. **Documentation:** This postmortem captures all details for future reference

### What Went Poorly

1. **No deploy verification:** Made 6 commits without checking if they deployed
2. **Assumed webhooks existed:** Didn't verify auto-deploy was working
3. **Configuration conflicts:** Didn't check Netlify dashboard settings before changing netlify.toml
4. **No monitoring:** No alerts for failed deploys or stale content

### Action Items

#### Immediate (Completed)

- [x] Fix `.gitmodules` (commit 76ceb07)
- [x] Fix netlify.toml paths (commit d18f760)
- [x] Clear Netlify cache
- [x] Verify deployment succeeded
- [x] Update CHANGELOG.md with incident
- [x] Create this postmortem (078-PM-INCI)

#### Short-Term (This Week)

- [ ] **Configure GitHub webhook in Netlify dashboard**
  - Verify auto-deploy works on next git push
  - Test with empty commit
  - Document webhook URL in internal docs

- [ ] **Add deploy verification to workflow**
  - After git push, wait 2-3 minutes
  - Check live site for changes
  - Verify ETag changed

- [ ] **Enable Netlify deploy notifications**
  - Email on successful deploy
  - Email on failed deploy
  - Slack webhook (optional)

- [ ] **Document Netlify dashboard settings**
  - Screenshot current settings
  - Add to `000-docs/OD-DEPL` document
  - Include in deployment checklist

#### Long-Term (Next Month)

- [ ] **Add automated deployment tests**
  - CI/CD step to verify site is accessible
  - Check for 404s on known pages
  - Validate forms render correctly

- [ ] **Implement deployment monitoring**
  - Uptime Robot to check site every 5 minutes
  - Alert on version number change (or lack thereof)
  - Dashboard to track deploy frequency

- [ ] **Create `.gitmodules` validation**
  - Pre-commit hook to validate `.gitmodules` syntax
  - CI check to ensure submodules can be cloned
  - Documentation on proper submodule management

- [ ] **Netlify configuration best practices**
  - Research Netlify toml vs dashboard precedence
  - Document "single source of truth" approach
  - Add to CLAUDE.md for future reference

---

## Prevention

### How to Prevent Similar Incidents

**1. Always Verify Webhooks Exist:**
```bash
# Check for webhooks before assuming auto-deploy works
gh api repos/jeremylongshore/cost-plus-db/hooks | jq '.[].config.url'

# Expected output:
# "https://api.netlify.com/hooks/github"
```

**2. Verify Deployments After Configuration Changes:**
```bash
# After changing netlify.toml or .gitmodules:
git push origin main
sleep 180  # Wait 3 minutes
curl -I "https://costplusdb.dev/?_ts=$(date +%s)" | grep etag
# ETag should change
```

**3. Check Netlify Dashboard Settings Before Modifying netlify.toml:**
- Go to: Site settings → Build & deploy → Continuous Deployment
- Note: Base directory, Build command, Publish directory
- Ensure netlify.toml paths are RELATIVE to dashboard base directory

**4. Enable Deploy Notifications:**
- Netlify → Site settings → Build & deploy → Deploy notifications
- Add email notification for successful/failed deploys
- Set up Slack webhook for team visibility

**5. Add Submodule Management to Workflow:**
```bash
# When adding submodules, always commit .gitmodules
git submodule add <URL> <path>
git add .gitmodules
git commit -m "Add submodule: <name>"

# Verify .gitmodules is committed
git ls-files .gitmodules  # Should show .gitmodules
```

---

## Related Documentation

- **CHANGELOG.md** - Incident summary and fixes
- **netlify.toml** - Current correct configuration
- **.gitmodules** - Submodule mapping
- **GITHUB-REPO-SETUP.md** - Repository public release guide
- **000-docs/057-OD-DEPL-production-deployment-checklist.md** - Deployment procedures

---

## Appendix: Full Error Logs

### Deploy Failure #1 (12:08 AM) - Missing .gitmodules

```
12:08:07 AM: Failed during stage 'preparing repo': Error checking out submodules:
fatal: No url found for submodule path 'testing/benchmarks/sysbench-tpcc' in .gitmodules
: exit status 128: fatal: No url found for submodule path 'testing/benchmarks/sysbench-tpcc'
in .gitmodules: exit status 128

12:08:05 AM: build-image version: 7aa2b696d8640ee8ab8ada4b1f870982d7bd596d (noble)
12:08:05 AM: buildbot version: 11482adeb7bc8b39b970c0c529cdaed99bb59394
12:08:05 AM: Fetching cached dependencies
12:08:05 AM: Starting to download cache of 100.1MB
12:08:06 AM: Finished downloading cache in 394ms
12:08:06 AM: Starting to extract cache
12:08:06 AM: Finished extracting cache in 442ms
12:08:06 AM: Finished fetching cache in 873ms
12:08:06 AM: Starting to prepare the repo for build
12:08:06 AM: Preparing Git Reference refs/heads/main
12:08:07 AM: Error checking out submodules
12:08:07 AM: Failing build: Failed to prepare repo
12:08:07 AM: Finished processing build request in 1.897s
```

### Deploy Failure #2 (12:11 AM) - Double Base Directory

```
12:11:22 AM: Failed during stage 'building site': Deploy directory 'website/website'
does not exist

12:11:18 AM: build-image version: 7aa2b696d8640ee8ab8ada4b1f870982d7bd596d (noble)
12:11:18 AM: buildbot version: 11482adeb7bc8b39b970c0c529cdaed99bb59394
12:11:18 AM: Building without cache
12:11:18 AM: Starting to prepare the repo for build
12:11:18 AM: No cached dependencies found. Cloning fresh repo
12:11:18 AM: git clone --filter=blob:none https://github.com/jeremylongshore/cost-plus-db
12:11:18 AM: Preparing Git Reference refs/heads/main
12:11:20 AM: Custom publish path detected. Proceeding with the specified path: 'website/website'
12:11:20 AM: Custom functions path detected: 'website/website/netlify/functions'
12:11:20 AM: Starting to install dependencies
12:11:21 AM: v22.21.0 is already installed.
12:11:21 AM: Now using node v22.21.0 (npm v10.9.4)
12:11:21 AM: Enabling Node.js Corepack
12:11:21 AM: Started restoring cached build plugins
12:11:21 AM: Finished restoring cached build plugins
12:11:22 AM: Successfully installed dependencies
12:11:22 AM: No build steps found, continuing to publishing
12:11:22 AM: Failing build: Failed to build site
12:11:22 AM: Finished processing build request in 4.157s
```

### Deploy Success (12:15 AM) - After Fixes

```
12:15:XX AM: Starting to prepare the repo for build
12:15:XX AM: Cloning into '/opt/build/repo'...
12:15:XX AM: Preparing Git Reference refs/heads/main
12:15:XX AM: Submodule 'testing/benchmarks/sysbench-tpcc' registered for path 'testing/benchmarks/sysbench-tpcc'
12:15:XX AM: Cloning into '/opt/build/repo/testing/benchmarks/sysbench-tpcc'...
12:15:XX AM: Submodule path 'testing/benchmarks/sysbench-tpcc': checked out 'f110afa8023c7924b1ba00177232a9090624acb5'
12:15:XX AM: Custom publish path detected. Proceeding with the specified path: 'website'
12:15:XX AM: Custom functions path detected: 'website/netlify/functions'
12:15:XX AM: Starting to install dependencies
12:15:XX AM: v22.21.0 is already installed
12:15:XX AM: Successfully installed dependencies
12:15:XX AM: No build steps found, continuing to publishing
12:15:XX AM: Deploy succeeded!
```

---

**Document Status:** Complete
**Next Review:** 2025-11-26 (1 month)
**Owner:** Jeremy Longshore (jeremy@intentsolutions.io)

---

**Last Updated:** 2025-10-26
