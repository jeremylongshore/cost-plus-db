# pgBouncer Connection Pooling Setup Guide

**Document ID:** 014-DR-GUID-pgbouncer-setup
**Category:** Infrastructure Guide
**Owner:** Jeremy Longshore
**Last Updated:** 2025-10-19
**Status:** Implementation Guide

---

## Purpose

Implement pgBouncer connection pooling for efficient PostgreSQL connection management. Based on official PostgreSQL and pgBouncer documentation.

**Why pgBouncer:**
- Reduces PostgreSQL connection overhead
- Allows more clients to connect (connection limit multiplier)
- Improves performance for applications with many short connections
- Industry-standard connection pooler

**References:**
- https://www.pgbouncer.org/usage.html
- https://www.postgresql.org/docs/current/runtime-config-connection.html
- https://wiki.postgresql.org/wiki/PgBouncer

---

## Prerequisites

- PostgreSQL 16 installed and running on port 5433
- Root or sudo access to server
- PostgreSQL users already created

---

## Installation Steps

### Step 1: Install pgBouncer

```bash
# Update package list
sudo apt update

# Install pgBouncer
sudo apt install pgbouncer -y

# Verify installation
pgbouncer --version
# Expected: pgBouncer 1.21.0 (or later)
```

---

### Step 2: Configure pgBouncer

**Create pgBouncer configuration:**

```bash
# Backup original config
sudo cp /etc/pgbouncer/pgbouncer.ini /etc/pgbouncer/pgbouncer.ini.backup

# Edit configuration
sudo nano /etc/pgbouncer/pgbouncer.ini
```

**Configuration file (`/etc/pgbouncer/pgbouncer.ini`):**

```ini
[databases]
; Format: dbname = host=hostname port=port dbname=database
; * means "use the same database name as requested"
* = host=127.0.0.1 port=5433 dbname=*

[pgbouncer]
;;;
;;; Administrative settings
;;;

logfile = /var/log/postgresql/pgbouncer.log
pidfile = /var/run/postgresql/pgbouncer.pid

;;;
;;; Where to listen for connections
;;;

; Listen on all interfaces (change to specific IP in production)
listen_addr = *
listen_port = 6432

; Unix socket is also used for local connections
unix_socket_dir = /var/run/postgresql

;;;
;;; Authentication settings
;;;

; Use auth_file for password authentication
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

;;;
;;; Connection pooling settings
;;;

; Pool mode:
; session - connection persists for client session (default, safest)
; transaction - connection returned after each transaction (more efficient)
; statement - connection returned after each statement (most efficient, breaks some features)
pool_mode = transaction

; Maximum number of client connections allowed
max_client_conn = 1000

; Default pool size per user/database pair
default_pool_size = 25

; Minimum pool size
min_pool_size = 5

; Reserve pool - how many additional connections to allow in case of emergency
reserve_pool_size = 5

; How long to wait before giving up on a server connection
server_connect_timeout = 15

; How long idle server connections are kept
server_idle_timeout = 600

;;;
;;; Logging
;;;

; Log all queries (use for debugging only, performance impact)
; log_connections = 1
; log_disconnections = 1

; Syslog support
syslog = 0

;;;
;;; TLS settings (for client connections to pgBouncer)
;;;

; Uncomment to enable TLS
; client_tls_sslmode = require
; client_tls_key_file = /etc/pgbouncer/pgbouncer-key.pem
; client_tls_cert_file = /etc/pgbouncer/pgbouncer-cert.pem

;;;
;;; Dangerous timeouts
;;;

; Do not set these too low
query_timeout = 0
query_wait_timeout = 120
client_idle_timeout = 0
idle_transaction_timeout = 0
```

---

### Step 3: Create Authentication File

pgBouncer needs a separate password file for authentication.

**Option A: Extract from PostgreSQL (Recommended)**

```bash
# Create script to extract passwords
cat > /tmp/extract_pgbouncer_auth.sh <<'EOF'
#!/bin/bash

# Output file
AUTH_FILE="/etc/pgbouncer/userlist.txt"

# Extract usernames and passwords from PostgreSQL
sudo -u postgres psql -p 5433 -t -A -c \
  "SELECT usename, passwd FROM pg_shadow WHERE passwd IS NOT NULL" \
  | sed 's/|/ /' > "$AUTH_FILE"

# Set proper permissions
sudo chmod 640 "$AUTH_FILE"
sudo chown postgres:postgres "$AUTH_FILE"

echo "Created $AUTH_FILE with $(wc -l < $AUTH_FILE) users"
EOF

chmod +x /tmp/extract_pgbouncer_auth.sh
sudo /tmp/extract_pgbouncer_auth.sh
```

**Option B: Manual Entry**

```bash
# Edit userlist.txt
sudo nano /etc/pgbouncer/userlist.txt
```

Format:
```
"username" "SCRAM-SHA-256$<hash>"
```

Example:
```
"postgres" "SCRAM-SHA-256$4096:salt$hash"
"testcustomer_user" "SCRAM-SHA-256$4096:salt$hash"
```

**Get password hash from PostgreSQL:**
```bash
sudo -u postgres psql -p 5433 -c "SELECT usename, passwd FROM pg_shadow WHERE usename = 'testcustomer_user';"
```

---

### Step 4: Set Permissions

```bash
# Set ownership
sudo chown postgres:postgres /etc/pgbouncer/pgbouncer.ini
sudo chown postgres:postgres /etc/pgbouncer/userlist.txt

# Set permissions (read-only for non-owner)
sudo chmod 640 /etc/pgbouncer/pgbouncer.ini
sudo chmod 640 /etc/pgbouncer/userlist.txt

# Create log directory if needed
sudo mkdir -p /var/log/postgresql
sudo chown postgres:postgres /var/log/postgresql
```

---

### Step 5: Enable and Start pgBouncer

```bash
# Enable on boot
sudo systemctl enable pgbouncer

# Start pgBouncer
sudo systemctl start pgbouncer

# Check status
sudo systemctl status pgbouncer
```

**Expected output:**
```
● pgbouncer.service - connection pooler for PostgreSQL
     Loaded: loaded
     Active: active (running)
```

---

### Step 6: Verify Installation

**Test connection through pgBouncer:**

```bash
# Test with postgres user
psql -h localhost -p 6432 -U postgres -d postgres

# Test with customer user
psql -h localhost -p 6432 -U testcustomer_user -d testcustomer_db
```

**Check pgBouncer stats:**

```bash
# Connect to pgBouncer admin console
psql -h localhost -p 6432 -U postgres -d pgbouncer

# Inside console:
SHOW POOLS;
SHOW DATABASES;
SHOW STATS;
SHOW CLIENTS;
```

**Check logs:**
```bash
sudo tail -f /var/log/postgresql/pgbouncer.log
```

---

## Firewall Configuration

**Update UFW to allow pgBouncer port:**

```bash
# Allow pgBouncer port (6432)
sudo ufw allow 6432/tcp comment 'pgBouncer connection pooling'

# Verify
sudo ufw status numbered
```

**IMPORTANT:** If you use pgBouncer, clients should connect to port 6432, NOT 5433.

---

## Customer Connection Strings

**Before pgBouncer (direct PostgreSQL):**
```
postgresql://username:password@server_ip:5433/database?sslmode=require
```

**After pgBouncer (connection pooling):**
```
postgresql://username:password@server_ip:6432/database?sslmode=require
```

**Note:** Port changes from 5433 → 6432

---

## Provisioning Script Updates

**Update `provision-customer-database.sh` to add user to pgBouncer:**

```bash
# After creating PostgreSQL user, add to pgBouncer auth file

# Extract password hash
PG_HASH=$(sudo -u postgres psql -p 5433 -t -A -c \
  "SELECT passwd FROM pg_shadow WHERE usename = '$DB_USER'")

# Add to pgBouncer userlist
echo "\"$DB_USER\" \"$PG_HASH\"" | sudo tee -a /etc/pgbouncer/userlist.txt > /dev/null

# Reload pgBouncer to pick up new user
sudo systemctl reload pgbouncer
```

---

## Monitoring

**Check pgBouncer performance:**

```bash
# Connect to admin console
psql -h localhost -p 6432 -U postgres -d pgbouncer

# Show pool usage
SHOW POOLS;

# Show statistics
SHOW STATS;

# Show active clients
SHOW CLIENTS;

# Show server connections
SHOW SERVERS;
```

**Add to monitoring alerts:**
- Alert if pgBouncer service stops
- Alert if connection pool exhausted (max_client_conn reached)
- Alert if server connections fail

---

## Troubleshooting

### pgBouncer won't start

```bash
# Check configuration syntax
pgbouncer -t /etc/pgbouncer/pgbouncer.ini

# Check logs
sudo journalctl -u pgbouncer -n 50
sudo tail -50 /var/log/postgresql/pgbouncer.log
```

### Authentication fails

```bash
# Verify userlist.txt has correct hash
sudo cat /etc/pgbouncer/userlist.txt

# Re-extract from PostgreSQL
sudo /tmp/extract_pgbouncer_auth.sh

# Reload pgBouncer
sudo systemctl reload pgbouncer
```

### Connection refused

```bash
# Check if pgBouncer is listening
sudo netstat -tlnp | grep 6432

# Check firewall
sudo ufw status | grep 6432

# Check pgBouncer status
sudo systemctl status pgbouncer
```

### Pool exhausted

```bash
# Increase pool size in /etc/pgbouncer/pgbouncer.ini
default_pool_size = 50

# Reload
sudo systemctl reload pgbouncer
```

---

## Security Considerations

1. **TLS/SSL:** Consider enabling client_tls_sslmode for encrypted connections to pgBouncer
2. **Auth file permissions:** Keep userlist.txt chmod 640, owned by postgres
3. **Pool limits:** Set max_client_conn to prevent DOS
4. **Firewall:** Only allow port 6432 from trusted IPs (if possible)
5. **Logging:** Enable connection logging for security audits (performance impact)

---

## Maintenance

**When adding new customer:**
1. Create PostgreSQL user (as usual)
2. Extract password hash and add to /etc/pgbouncer/userlist.txt
3. Reload pgBouncer: `sudo systemctl reload pgbouncer`

**When removing customer:**
1. Drop PostgreSQL user (as usual)
2. Remove from /etc/pgbouncer/userlist.txt
3. Reload pgBouncer: `sudo systemctl reload pgbouncer`

**Weekly maintenance:**
- Check pgBouncer logs for errors
- Verify pool sizes are adequate (SHOW POOLS)
- Ensure no connection leaks (SHOW CLIENTS vs SHOW SERVERS)

---

## Performance Benefits

**Before pgBouncer:**
- Each client = 1 PostgreSQL connection
- PostgreSQL max_connections = 100
- Can handle ~100 concurrent clients

**After pgBouncer:**
- pgBouncer max_client_conn = 1000
- pgBouncer default_pool_size = 25 per database
- Can handle ~1000 concurrent clients with only 25 PostgreSQL connections

**Result:** 40x more concurrent connections possible

---

## References

- Official pgBouncer docs: https://www.pgbouncer.org/
- PostgreSQL connection pooling: https://wiki.postgresql.org/wiki/PgBouncer
- Ubuntu pgBouncer guide: https://ubuntu.com/server/docs/databases-pgbouncer
- Security best practices: https://www.cybertec-postgresql.com/en/pgbouncer-overview/

---

## Next Steps

After implementing:
1. ✅ Update website to re-add "Connection pooling (pgBouncer)" feature
2. ✅ Update customer welcome emails with port 6432 connection strings
3. ✅ Update provisioning scripts to add users to pgBouncer
4. ✅ Add pgBouncer monitoring to Betterstack
5. ✅ Document in operations manual

---

**Status:** Ready to implement
**Estimated time:** 30 minutes
**Risk:** Low (can run alongside direct PostgreSQL connections during testing)
