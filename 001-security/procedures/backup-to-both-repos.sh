#!/bin/bash

# Automated Backup Script - Backs up to BOTH local and Wasabi S3
# Usage: Run as postgres user or with sudo
# Schedule: Daily at 2 AM via cron

set -e

LOG_FILE="/var/log/pgbackrest/dual-backup.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting dual-repository backup..." | sudo tee -a $LOG_FILE

# Backup to repo1 (local)
echo "[$DATE] Backing up to repo1 (local)..." | sudo tee -a $LOG_FILE
if sudo -u postgres pgbackrest --stanza=main --repo=1 --type=full backup 2>&1 | sudo tee -a $LOG_FILE; then
    echo "[$DATE] ✅ repo1 (local) backup successful" | sudo tee -a $LOG_FILE
else
    echo "[$DATE] ❌ repo1 (local) backup FAILED" | sudo tee -a $LOG_FILE
    exit 1
fi

# Backup to repo2 (Wasabi S3)
echo "[$DATE] Backing up to repo2 (Wasabi S3)..." | sudo tee -a $LOG_FILE
if sudo -u postgres pgbackrest --stanza=main --repo=2 --type=full backup 2>&1 | sudo tee -a $LOG_FILE; then
    echo "[$DATE] ✅ repo2 (Wasabi S3) backup successful" | sudo tee -a $LOG_FILE
else
    echo "[$DATE] ❌ repo2 (Wasabi S3) backup FAILED" | sudo tee -a $LOG_FILE
    exit 1
fi

# Verify both backups
echo "[$DATE] Verifying backups..." | sudo tee -a $LOG_FILE
sudo -u postgres pgbackrest --stanza=main info | sudo tee -a $LOG_FILE

echo "[$DATE] ✅ All backups completed successfully" | sudo tee -a $LOG_FILE
echo "========================================" | sudo tee -a $LOG_FILE
