# Sudo NOPASSWD Configuration for CostPlusDB Monitoring Scripts

**Purpose:** Allow monitoring scripts to run privileged commands without prompting for password.

**Security Note:** This is MORE secure than hardcoding passwords in scripts. The sudoers file allows fine-grained control over which commands can be run without a password.

---

## Quick Setup

Run these commands on your Contabo VPS:

```bash
# Create sudoers configuration file
sudo tee /etc/sudoers.d/costplusdb-monitoring > /dev/null <<'EOF'
# CostPlusDB Security Monitoring - Sudo NOPASSWD Rules
# Created: 2025-10-19
# User: admincostplus
#
# These rules allow monitoring scripts to run specific commands without password prompts
# while maintaining security by limiting the exact commands that can be run.

# Failed login monitoring
admincostplus ALL=(ALL) NOPASSWD: /usr/bin/grep /var/log/postgresql/*

# Security events monitoring
admincostplus ALL=(ALL) NOPASSWD: /usr/bin/fail2ban-client
admincostplus ALL=(ALL) NOPASSWD: /usr/bin/grep /var/log/postgresql/*

# SSL certificate expiry monitoring
admincostplus ALL=(ALL) NOPASSWD: /usr/bin/openssl

# Lynis security scanning
admincostplus ALL=(ALL) NOPASSWD: /usr/bin/lynis
admincostplus ALL=(ALL) NOPASSWD: /usr/bin/apt-get

# Backup security configs
admincostplus ALL=(ALL) NOPASSWD: /usr/sbin/ufw status*
admincostplus ALL=(ALL) NOPASSWD: /bin/cp /etc/fail2ban/* *
admincostplus ALL=(ALL) NOPASSWD: /bin/cp /etc/pgbackrest.conf *
admincostplus ALL=(ALL) NOPASSWD: /bin/cp /etc/postgresql/* *

EOF

# Set correct permissions (CRITICAL!)
sudo chmod 0440 /etc/sudoers.d/costplusdb-monitoring

# Validate sudoers syntax
sudo visudo -c
```

---

## Verification

Test that sudo commands work without password:

```bash
# Test fail2ban (should NOT prompt for password)
sudo fail2ban-client status

# Test grep logs (should NOT prompt for password)
sudo grep "FATAL" /var/log/postgresql/postgresql-16-main.log | tail -5

# Test openssl (should NOT prompt for password)
sudo openssl version

# Test lynis (should NOT prompt for password)
sudo lynis show version
```

If any command prompts for a password, review the sudoers file.

---

## Security Considerations

### Why This Is Secure

1. **Command Whitelisting:** Only specific commands can run without password
2. **Path Restrictions:** Commands must be at exact paths (e.g., `/usr/bin/grep`)
3. **No Wildcards on Commands:** Can't run arbitrary programs
4. **Audit Trail:** All sudo commands are logged to `/var/log/auth.log`

### What This Prevents

- ✅ Prevents password exposure in git history
- ✅ Prevents password in process list (`ps aux`)
- ✅ Prevents unauthorized privilege escalation
- ✅ Limits blast radius if monitoring account is compromised

### What Attackers CAN'T Do

Even with the `admincostplus` account compromised, attackers cannot:

- ❌ Run arbitrary sudo commands
- ❌ Install packages (except via approved apt-get path)
- ❌ Modify system files (except approved copy operations)
- ❌ Access other users' data
- ❌ Escalate to full root access

---

## Troubleshooting

### Scripts Still Ask for Password

**Check sudoers file syntax:**
```bash
sudo visudo -c -f /etc/sudoers.d/costplusdb-monitoring
```

**Check file permissions:**
```bash
ls -l /etc/sudoers.d/costplusdb-monitoring
# Should show: -r--r----- 1 root root
```

**Check if rules are loaded:**
```bash
sudo cat /etc/sudoers.d/costplusdb-monitoring
```

### Permission Denied Errors

If you see `permission denied`, the command path may be wrong. Find the correct path:

```bash
which fail2ban-client
which grep
which openssl
which lynis
```

Update the sudoers file with the correct paths.

---

## Removing Old Password-Based Scripts

After setting up NOPASSWD rules, remove any scripts that use hardcoded passwords:

```bash
# Search for any remaining password usage
cd /home/admincostplus/projects/costplusdb
grep -r "echo.*sudo -S" 001-security/scripts/

# Should return: (no matches)
```

---

## Alternative: Run Scripts as Root via Systemd

If you prefer not to use NOPASSWD, you can run monitoring scripts as root user via systemd timers:

```bash
# Example: Create systemd service for security monitoring
sudo tee /etc/systemd/system/costplusdb-security-check.service > /dev/null <<EOF
[Unit]
Description=CostPlusDB Security Event Monitoring
After=postgresql.service

[Service]
Type=oneshot
User=root
ExecStart=/home/admincostplus/projects/costplusdb/001-security/scripts/monitoring/check-security-events.sh
EOF

# Create timer to run hourly
sudo tee /etc/systemd/system/costplusdb-security-check.timer > /dev/null <<EOF
[Unit]
Description=CostPlusDB Security Check Timer

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Enable and start timer
sudo systemctl daemon-reload
sudo systemctl enable costplusdb-security-check.timer
sudo systemctl start costplusdb-security-check.timer
```

---

## Best Practices

1. **Review sudoers rules quarterly** - Remove unused rules
2. **Monitor auth.log** - Check for unexpected sudo usage
3. **Limit NOPASSWD rules** - Only add what's absolutely necessary
4. **Use absolute paths** - Never use wildcards on command names
5. **Test after changes** - Always run `sudo visudo -c` before deploying

---

## References

- [Sudoers Manual](https://www.sudo.ws/man/1.8.15/sudoers.man.html)
- [Ubuntu Server Guide - Sudo](https://ubuntu.com/server/docs/security-users)
- [How To Secure A Linux Server](https://github.com/imthenachoman/How-To-Secure-A-Linux-Server)

---

**Created:** 2025-10-19
**Last Updated:** 2025-10-19
**Owner:** Jeremy Longshore (admincostplus)
