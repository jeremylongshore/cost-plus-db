# Adding Wasabi S3 Cloud Backups to pgBackRest

**Status:** Local encrypted backups currently working. Follow this guide when ready to add Wasabi S3.

## Current Setup

- ✅ pgBackRest installed and configured
- ✅ Local encrypted backups working (AES-256-CBC)
- ✅ Backup location: `/var/lib/pgbackrest`
- ✅ Encryption passphrase: Stored in `/root/pgbackrest-keys/encryption-passphrase.txt`

## Why Add Wasabi S3?

**Current (Local Backups):**
- ❌ Backups on same VPS as database
- ❌ If VPS dies, backups are lost
- ❌ Single point of failure

**With Wasabi S3:**
- ✅ Backups stored in cloud (separate from VPS)
- ✅ Multi-region redundancy
- ✅ VPS can die, backups are safe
- ✅ Cost: ~$5.99/month for 1TB

## Step 1: Sign Up for Wasabi

1. Go to https://wasabi.com/
2. Create account
3. Choose region (e.g., `us-east-1`)
4. Get your:
   - Access Key ID
   - Secret Access Key

## Step 2: Create Wasabi Bucket

```bash
# Install AWS CLI (Wasabi uses S3-compatible API)
sudo apt-get update
sudo apt-get install -y awscli

# Configure AWS CLI for Wasabi
aws configure
# Enter:
#   Access Key ID: <your_wasabi_access_key>
#   Secret Access Key: <your_wasabi_secret_key>
#   Region: us-east-1 (or your chosen region)
#   Output format: json

# Create bucket
aws s3 mb s3://costplusdb-backups --endpoint-url=https://s3.us-east-1.wasabisys.com

# Verify bucket
aws s3 ls --endpoint-url=https://s3.us-east-1.wasabisys.com
```

## Step 3: Update pgBackRest Configuration

Edit `/etc/pgbackrest.conf`:

```ini
[global]
# Keep existing local backup as repo1
repo1-path=/var/lib/pgbackrest
repo1-retention-full=2
repo1-retention-diff=4
repo1-cipher-type=aes-256-cbc
repo1-cipher-pass=tXoiSmzmMh67qJ/2iY7c/vSpLgUMfY4Vo0Bj2fmOx8fdQ+4svAFxQx8uljBT5yzF

# Add Wasabi S3 as repo2
repo2-type=s3
repo2-path=/pgbackrest
repo2-s3-bucket=costplusdb-backups
repo2-s3-endpoint=s3.us-east-1.wasabisys.com
repo2-s3-region=us-east-1
repo2-s3-key=<YOUR_WASABI_ACCESS_KEY>
repo2-s3-key-secret=<YOUR_WASABI_SECRET_KEY>
repo2-retention-full=4
repo2-retention-diff=7
repo2-cipher-type=aes-256-cbc
repo2-cipher-pass=tXoiSmzmMh67qJ/2iY7c/vSpLgUMfY4Vo0Bj2fmOx8fdQ+4svAFxQx8uljBT5yzF

log-level-console=info
log-level-file=debug

[main]
pg1-path=/var/lib/postgresql/16/main
pg1-port=5433
pg1-socket-path=/var/run/postgresql
```

## Step 4: Initialize Wasabi Repository

```bash
# Create stanza on Wasabi S3 (repo2)
sudo -u postgres pgbackrest --stanza=main --repo=2 stanza-create

# Verify configuration
sudo -u postgres pgbackrest --stanza=main --repo=2 check

# Take first backup to Wasabi
sudo -u postgres pgbackrest --stanza=main --repo=2 --type=full backup
```

## Step 5: Verify Wasabi Backups

```bash
# Check backup info
sudo -u postgres pgbackrest --stanza=main info

# Should show:
# - repo1: local backups
# - repo2: Wasabi S3 backups

# Verify in Wasabi
aws s3 ls s3://costplusdb-backups/pgbackrest/ --recursive --endpoint-url=https://s3.us-east-1.wasabisys.com
```

## Step 6: Update Backup Schedule

Once Wasabi is working, update your backup strategy:

**Daily Schedule:**
```bash
# Add to crontab for postgres user
sudo -u postgres crontab -e

# Backup to BOTH local and Wasabi every night at 2 AM
0 2 * * * pgbackrest --stanza=main --type=full backup
```

pgBackRest will automatically backup to **both** repo1 (local) and repo2 (Wasabi) when you run the backup command.

## Cost Impact

**Before (Local only):** Free
**After (Local + Wasabi):** ~$5.99/month

**Customer invoice will show:**
```
Infrastructure Costs:
├─ Contabo VPS          $12.00
├─ Wasabi S3 Backups    $ 5.99
└─ Total:               $17.99

Your Price: $17.99 × 1.25 = $22.49/month
```

## Rollback (If Needed)

If Wasabi causes issues, you can disable it:

1. Comment out `repo2-*` lines in `/etc/pgbackrest.conf`
2. Restart PostgreSQL: `sudo pg_ctlcluster 16 main restart`
3. Backups will continue to local only

## Monitoring

After enabling Wasabi, verify daily backups work:

```bash
# Check backup status
sudo -u postgres pgbackrest --stanza=main info

# Should show successful backups on both:
# - repo1: local
# - repo2: s3 (Wasabi)
```

## Important Notes

- ⚠️ **Keep the encryption passphrase safe!** Without it, Wasabi backups cannot be restored.
- ⚠️ Wasabi charges for storage. Monitor usage: `aws s3 ls s3://costplusdb-backups --recursive --summarize --endpoint-url=https://s3.us-east-1.wasabisys.com`
- ⚠️ Test restoration from Wasabi periodically to ensure it works

## Testing Restoration from Wasabi

```bash
# Restore from Wasabi to a test location
sudo -u postgres pgbackrest --stanza=main --repo=2 --delta restore

# Or restore specific backup:
sudo -u postgres pgbackrest --stanza=main --repo=2 --set=20251019-120521F restore
```

---

**Next Steps:**
1. Sign up for Wasabi account
2. Follow this guide to add S3 backups
3. Update customer invoices to reflect Wasabi cost + 25%
