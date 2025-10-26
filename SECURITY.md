# Security Policy

## Supported Versions

CostPlusDB is currently in pre-launch. All security updates will be applied to the main branch.

| Version | Supported          |
| ------- | ------------------ |
| main    | ✅ Yes             |
| < 1.0   | ⚠️  Pre-launch     |

---

## Reporting a Vulnerability

**Email:** jeremy@intentsolutions.io

**Subject line:** `SECURITY: [brief description]`

### What to Include

Please provide:
- **Description** of the vulnerability
- **Steps to reproduce** (as detailed as possible)
- **Potential impact** (data exposure, service disruption, etc.)
- **Affected components** (backend API, website, scripts, infrastructure)
- **Suggested fix** (if you have one)

### What to Expect

1. **Acknowledgment:** Within 24 hours
2. **Initial assessment:** Within 72 hours
3. **Fix timeline:** Provided within 1 week
4. **Resolution update:** You'll be kept in the loop
5. **Credit:** We'll credit you in our security log (if desired)

### Our Commitments

- ✅ We will not take legal action against good-faith security researchers
- ✅ We will keep you updated on our progress
- ✅ We will publicly acknowledge your contribution (with your permission)
- ✅ We will fix the issue promptly
- ✅ We will publish a transparent post-mortem (without exposing the vulnerability details until fixed)

### What We Ask

- 🙏 Give us reasonable time to fix the issue before public disclosure
- 🙏 Don't exploit the vulnerability beyond what's needed to demonstrate it
- 🙏 Don't access, modify, or delete customer data
- 🙏 Report the issue to us first, not publicly

---

## Out of Scope

The following are **not eligible** for security reports:

### Not Security Issues
- ❌ Social engineering, phishing, or physical attacks
- ❌ Denial of Service (DoS/DDoS) attacks
- ❌ Brute force attacks that don't bypass rate limiting
- ❌ Issues requiring MITM or physical access to infrastructure
- ❌ Issues in third-party services (please report to them directly)

### Known Limitations (Pre-Launch)
- ⚠️  Default admin credentials (documented in README, must be changed in production)
- ⚠️  Self-signed certificates in development environment
- ⚠️  Lack of WAF (planned for production)

---

## Security Transparency

Unlike most providers, we publish our entire security model:

### Published Security Documentation

- **[Complete Security Audit](./000-docs/059-DR-AUDIT-comprehensive-security-audit.md)** - 800-line pre-launch security review
- **[PostgreSQL Operations SOP](./000-docs/005-DR-SOPS-postgresql-operations.md)** - Complete infrastructure security
- **[Emergency Response SOP](./000-docs/006-DR-SOPS-emergency-response.md)** - Incident handling procedures
- **[Customer Provisioning SOP](./000-docs/004-DR-SOPS-customer-provisioning.md)** - Secure onboarding process

### Security Measures in Production

**Network Security:**
- UFW firewall (default deny, explicit allow only required ports)
- fail2ban intrusion prevention
- SSH key authentication only (password auth disabled)
- SSL/TLS enforced (Let's Encrypt certificates)

**Database Security:**
- PostgreSQL 16 with SSL/TLS required
- Connection pooling via pgBouncer
- Daily encrypted backups (pgBackRest + AES-256-CBC)
- Multi-region backup redundancy (Wasabi S3)

**Application Security:**
- JWT authentication (HS256, 24-hour expiration)
- Argon2id password hashing (OWASP recommended)
- Account lockout after 5 failed attempts (30-minute lock)
- Input validation (Zod schemas)
- CORS policy enforcement

**Monitoring:**
- 24/7 uptime monitoring (Betterstack)
- Security event logging
- Automated alerts for critical issues
- Daily backup verification

---

## Vulnerability Disclosure Timeline

When a security issue is reported:

1. **Day 0:** Acknowledgment within 24 hours
2. **Day 1-3:** Initial assessment and severity rating
3. **Day 4-7:** Fix developed and tested
4. **Day 7-14:** Fix deployed to production
5. **Day 14+:** Public disclosure (coordinated with reporter)

### Severity Levels

| Severity | Response Time | Examples |
|----------|---------------|----------|
| **Critical** | 24-48 hours | RCE, authentication bypass, data exposure |
| **High** | 3-5 days | Privilege escalation, SQL injection |
| **Medium** | 1-2 weeks | XSS, CSRF, information disclosure |
| **Low** | 2-4 weeks | Minor information leaks, non-critical misconfigurations |

---

## Security Best Practices (For Customers)

If you're a CostPlusDB customer:

### Do:
- ✅ Use strong, unique passwords for database users
- ✅ Rotate credentials regularly
- ✅ Use SSL/TLS for all connections
- ✅ Restrict database access to known IP ranges
- ✅ Enable audit logging for sensitive tables
- ✅ Report suspicious activity immediately

### Don't:
- ❌ Share database credentials in plaintext
- ❌ Commit credentials to git repositories
- ❌ Use the same password across services
- ❌ Expose your database publicly without proper authentication
- ❌ Ignore security update notifications

---

## Hall of Fame

We'll recognize security researchers who help make CostPlusDB more secure:

<!-- No entries yet - we're pre-launch! -->

*Become our first security contributor by reporting a vulnerability.*

---

## Contact

**Security issues:** jeremy@intentsolutions.io (subject: SECURITY)
**General security questions:** jeremy@intentsolutions.io
**Urgent critical issues:** Same email, mark CRITICAL in subject

**Response time:** Within 24 hours (usually much faster)

---

## Our Philosophy

Most database providers hide their security model behind NDAs and vague "military-grade encryption" claims. We believe transparency makes us more secure:

1. **Public SOPs** mean our procedures are peer-reviewed
2. **Published audits** show we've done the work
3. **Documented incidents** prove we learn from mistakes
4. **Open architecture** invites expert scrutiny

Security through obscurity doesn't work. Security through transparency does.

---

**Last Updated:** 2025-10-25
**Security Audit:** [059-DR-AUDIT-comprehensive-security-audit.md](./000-docs/059-DR-AUDIT-comprehensive-security-audit.md)
