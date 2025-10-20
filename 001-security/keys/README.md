# Encryption Keys and Credentials

⚠️ **CRITICAL: This folder should NEVER contain actual keys in git!**

All keys and passphrases are stored **on the server only**, not in the git repository.

---

## Key Locations on Server

### pgBackRest Encryption Passphrase
**Location:** `/root/pgbackrest-keys/encryption-passphrase.txt`
**Permissions:** `600` (root only)
**Cipher:** AES-256-CBC
**Purpose:** Encrypts all database backups

⚠️ **Without this passphrase, backups CANNOT be restored!**

**Backup this passphrase to:**
- [ ] Password manager (1Password, Bitwarden, LastPass)
- [ ] Printed copy in safe location
- [ ] Encrypted USB drive (offline storage)

### Customer Database Credentials
**Location:** `/root/customer-credentials/`
**Permissions:** `700` (root only)
**Format:** One file per customer: `{customer_name}.txt`

**Each credential file contains:**
- Customer name
- Database name
- PostgreSQL user
- Password (secure random 25-character)
- Connection string
- Creation date

### PostgreSQL SSL Certificates
**Location:** `/var/lib/postgresql/16/main/ssl/`
**Permissions:** `600` for keys, `644` for certs
**Files:**
- `server.key` - Private key
- `server.crt` - Certificate
- `server.csr` - Certificate signing request

**Valid for:** 365 days from 2025-10-19
**Renewal due:** 2026-10-19

### Sudo Password
**Location:** Memory only (not stored on disk)
**Current:** [REDACTED - Store in password manager]

⚠️ **SECURITY:** Never commit sudo password to git! Store in password manager only.

---

## Key Rotation Schedule

### pgBackRest Encryption Passphrase
**Frequency:** Never (rotating breaks existing backups)
**Alternative:** Create new stanza with new passphrase for future backups

### Customer Passwords
**Frequency:** On request or annually
**Process:** Use provisioning script to generate new password

### SSL Certificates
**Frequency:** Annually (before expiration)
**Renewal date:** 2026-10-19
**Process:**
```bash
cd /var/lib/postgresql/16/main/ssl
sudo openssl genrsa -out server.key 2048
sudo openssl req -new -key server.key -out server.csr -subj "/C=US/ST=Texas/L=Houston/O=CostPlusDB/OU=Database/CN=costplusdb.com"
sudo openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt
sudo chown postgres:postgres server.*
sudo chmod 600 server.key
sudo pg_ctlcluster 16 main restart
```

---

## Backup Procedures

### Daily (Automated)
- Customer credentials backed up with server backups
- pgBackRest handles backup encryption automatically

### Manual (Required)
1. **Export encryption passphrase:**
   ```bash
   sudo cat /root/pgbackrest-keys/encryption-passphrase.txt
   ```
   Store in password manager

2. **Export customer credentials (when needed):**
   ```bash
   sudo tar -czf customer-creds-backup-$(date +%Y%m%d).tar.gz /root/customer-credentials/
   ```
   Store encrypted archive offline

---

## Emergency Recovery

### If Server Dies

**You need these to recover:**
1. ✅ pgBackRest encryption passphrase (from password manager)
2. ✅ Wasabi S3 credentials (when configured)
3. ✅ Customer credentials backup (to notify customers of new connection details)

**Recovery steps:**
1. Provision new VPS
2. Install PostgreSQL 16
3. Install pgBackRest
4. Configure pgBackRest with saved passphrase
5. Restore from Wasabi S3: `sudo -u postgres pgbackrest --stanza=main --repo=2 restore`
6. Update DNS/IP addresses
7. Notify customers of new connection details

### If Encryption Passphrase Is Lost

⚠️ **All backups are permanently unrecoverable!**

There is no way to decrypt backups without the passphrase.

**Prevention:**
- Store passphrase in multiple secure locations
- Test recovery procedure monthly
- Never rotate encryption passphrase

---

## Security Best Practices

### DO:
✅ Store encryption passphrase in password manager
✅ Keep offline backup of all keys
✅ Rotate customer passwords annually
✅ Use unique passwords per customer
✅ Test recovery procedures monthly
✅ Renew SSL certificates before expiration

### DON'T:
❌ Commit keys to git (this folder is .gitignored)
❌ Email keys/passwords in plain text
❌ Store keys in Slack/Discord/messaging apps
❌ Rotate encryption passphrase (breaks backups)
❌ Reuse passwords across customers
❌ Store keys on shared drives

---

## Audit Trail

| Date | Action | Who | Notes |
|------|--------|-----|-------|
| 2025-10-19 | Initial passphrase generated | System | AES-256-CBC, 64-char base64 |
| 2025-10-19 | SSL certificates created | System | Valid until 2026-10-19 |
| 2025-10-19 | Test customer created | System | testcustomer_user (to be removed) |

---

## Questions?

**Email:** jeremy@intentsolutions.io
**Subject:** "SECURITY: Key Management"
