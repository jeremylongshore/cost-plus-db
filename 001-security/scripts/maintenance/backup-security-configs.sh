#!/bin/bash
# Backup all security configurations daily
# Runs at 2 AM daily (after database backup)

BACKUP_DIR="/home/admincostplus/projects/costplusdb/001-security/backups/daily/$(date +%Y-%m-%d)"
OUTPUT_LOG="/home/admincostplus/projects/costplusdb/001-security/logs/backups/config-backups.log"

echo "[$(date)] Starting security config backup" >> "$OUTPUT_LOG"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup firewall rules
echo "TheCitadel2003" | sudo -S ufw status verbose > "$BACKUP_DIR/ufw-rules.txt" 2>&1

# Backup fail2ban config
echo "TheCitadel2003" | sudo -S cp /etc/fail2ban/jail.d/postgresql.local "$BACKUP_DIR/fail2ban-postgresql.conf" 2>/dev/null

# Backup pgbackrest config
echo "TheCitadel2003" | sudo -S cp /etc/pgbackrest.conf "$BACKUP_DIR/pgbackrest.conf" 2>/dev/null

# Backup PostgreSQL pg_hba.conf
echo "TheCitadel2003" | sudo -S cp /etc/postgresql/16/main/pg_hba.conf "$BACKUP_DIR/pg_hba.conf" 2>/dev/null

# Backup PostgreSQL config
echo "TheCitadel2003" | sudo -S cp /etc/postgresql/16/main/postgresql.conf "$BACKUP_DIR/postgresql.conf" 2>/dev/null

# Compress backup
tar -czf "$BACKUP_DIR.tar.gz" -C "$(dirname $BACKUP_DIR)" "$(basename $BACKUP_DIR)" 2>&1 >> "$OUTPUT_LOG"
rm -rf "$BACKUP_DIR"

# Keep only last 30 days
find /home/admincostplus/projects/costplusdb/001-security/backups/daily/ -name "*.tar.gz" -mtime +30 -delete

echo "[$(date)] Security config backup complete: $BACKUP_DIR.tar.gz" >> "$OUTPUT_LOG"
