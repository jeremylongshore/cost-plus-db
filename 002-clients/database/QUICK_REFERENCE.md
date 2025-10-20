# CostPlusDB Database - Quick Reference

**Schema Version:** 1.0.0
**Last Updated:** 2025-10-20
**Database Type:** SQLite 3 (Turso Compatible)

---

## Schema Files

| File | Purpose | Size |
|------|---------|------|
| `schema.sql` | Complete database schema (SQL) | 30KB |
| `README.md` | Usage guide and examples | 14KB |
| `SCHEMA_SUMMARY.txt` | Statistics and overview | 15KB |
| `ER_DIAGRAM.txt` | Entity relationship diagram | 25KB |
| `QUICK_REFERENCE.md` | This file | - |

**Full Documentation:** `/home/admincostplus/projects/costplusdb/000-docs/033-DR-ARCH-customer-database-schema.md`

---

## Tables at a Glance

| # | Table Name | Purpose | Key Fields |
|---|------------|---------|------------|
| 1 | `customers` | Core customer data | customer_id, email, tier, status |
| 2 | `databases` | Provisioned databases | database_name, vps_hostname, provision_status |
| 3 | `billing` | Billing cycles | total_monthly_rate, payment_status, next_billing_date |
| 4 | `invoices` | Invoice history | invoice_number, total_amount, payment_status |
| 5 | `support_tickets` | Support requests | ticket_number, priority, status, sla_met |
| 6 | `support_messages` | Ticket conversations | ticket_id, sender_type, message_text |
| 7 | `customer_workflow` | Onboarding pipeline | current_stage, blocked, workflow checkpoints |
| 8 | `notes` | Internal notes | note_type, subject, created_by |
| 9 | `activity_log` | Audit trail | action_type, entity_type, performed_by |
| 10 | `schema_migrations` | Version tracking | version, description, applied_at |

---

## Views at a Glance

| View | Purpose | Use Case |
|------|---------|----------|
| `v_active_customers` | Active customers + billing + database | Dashboard overview |
| `v_customers_by_revenue` | Sorted by revenue with LTV | Revenue analysis |
| `v_open_support_tickets` | Open tickets with SLA tracking | Support queue |
| `v_onboarding_pipeline` | Customers in onboarding | Sales pipeline |
| `v_mrr_summary` | Revenue metrics by tier | Financial reporting |

---

## Common Queries

### Get Active Customers
```sql
SELECT * FROM v_active_customers;
```

### Find Customer by Email
```sql
SELECT * FROM customers WHERE contact_email = 'john@example.com';
```

### Get Customer's Databases
```sql
SELECT d.* FROM databases d
JOIN customers c ON d.customer_id = c.id
WHERE c.customer_id = 'acme-corp-20251020';
```

### Check Overdue Invoices
```sql
SELECT * FROM invoices
WHERE payment_status IN ('pending', 'overdue')
  AND due_date < DATE('now')
ORDER BY due_date ASC;
```

### Support Ticket Queue (High Priority)
```sql
SELECT * FROM v_open_support_tickets
WHERE priority IN ('high', 'critical')
ORDER BY created_at ASC;
```

### Calculate MRR
```sql
SELECT * FROM v_mrr_summary;
```

---

## Key Relationships

```
CUSTOMERS (parent)
 ├── DATABASES (1:N) - CASCADE DELETE
 ├── BILLING (1:N) - CASCADE DELETE
 ├── INVOICES (1:N) - CASCADE DELETE
 ├── SUPPORT_TICKETS (1:N) - CASCADE DELETE
 ├── CUSTOMER_WORKFLOW (1:1) - CASCADE DELETE
 ├── NOTES (1:N) - CASCADE DELETE
 └── ACTIVITY_LOG (1:N) - SET NULL

SUPPORT_TICKETS (parent)
 └── SUPPORT_MESSAGES (1:N) - CASCADE DELETE
```

---

## Customer Status Flow

```
prospect → consultation → approved → provisioning → active → suspended → churned
```

---

## Workflow Stages (12 checkpoints)

1. form_submitted
2. consultation_scheduled
3. consultation_completed
4. pricing_approved
5. payment_received
6. database_provisioning_started
7. database_provisioned
8. credentials_sent
9. customer_confirmed_access
10. migration_started
11. migration_completed
12. go_live

---

## Tier Options

- **Shared** ($49/mo) - 2GB RAM, 20GB storage, shared CPU
- **Dedicated** ($89/mo) - 8GB RAM, 200GB storage, 4 vCPU
- **Pro** ($129/mo) - 16GB RAM, 400GB storage, 6 vCPU
- **Enterprise** ($149/mo) - 32GB RAM, 800GB storage, 8 vCPU

---

## Add-ons (Boolean Flags)

- `addon_high_availability` - Auto-failover ($99/mo)
- `addon_read_replicas` - Number of replicas ($15-38/mo each)
- `addon_vpn_access` - Private VPN ($15/mo)
- `addon_compliance_package` - HIPAA/SOC2 ($100/mo)
- `addon_custom_monitoring` - Custom dashboards ($50/mo)

---

## Infrastructure Providers

- **Contabo** (default) - Included in base price
- **Hetzner** - +$20/mo
- **DigitalOcean** - +$40/mo
- **AWS** - Cost + 25%
- **GCP** - Cost + 25%

---

## Important Constraints

### UNIQUE Constraints
- `customers.customer_id`
- `customers.contact_email`
- `databases.database_name`
- `invoices.invoice_number`
- `support_tickets.ticket_number`
- `customer_workflow.customer_id` (1:1 relationship)

### CHECK Constraints
- `tier IN ('Shared', 'Dedicated', 'Pro', 'Enterprise')`
- `status IN ('prospect', 'consultation', 'approved', 'provisioning', 'active', 'suspended', 'churned')`
- `payment_status IN ('current', 'past_due', 'suspended', 'cancelled')`
- `priority IN ('low', 'normal', 'high', 'critical')`
- All boolean fields: `IN (0, 1)`

---

## Security Notes

### Password Storage
**CRITICAL:** `databases.database_password_hash` must use:
- Argon2id (recommended)
- bcrypt
- scrypt

**NEVER store plaintext passwords!**

### Sensitive Fields
- `customers.contact_email` (PII)
- `customers.contact_phone` (PII)
- `databases.database_password_hash` (hashed)
- `billing.stripe_customer_id` (payment info)
- `billing.stripe_subscription_id` (payment info)

### Best Practices
- Encrypt database at rest
- Use SSL/TLS for connections
- Limit access to authorized users
- Log all access in activity_log
- Regular security audits

---

## Indexes (41 total)

### Primary Lookups
- `customers.customer_id`
- `customers.contact_email`
- `databases.database_name`
- `invoices.invoice_number`
- `support_tickets.ticket_number`

### Foreign Keys (all indexed)
- All `customer_id` columns
- `support_messages.ticket_id`

### Query Optimization
- `customers.status`
- `customers.tier`
- `databases.provision_status`
- `databases.health_status`
- `invoices.payment_status`
- `invoices.due_date`
- `support_tickets.priority`
- `activity_log.action_type`

---

## Triggers (7 total)

All tables have automatic `updated_at` timestamp triggers:
- `update_customers_timestamp`
- `update_databases_timestamp`
- `update_billing_timestamp`
- `update_invoices_timestamp`
- `update_support_tickets_timestamp`
- `update_workflow_timestamp`
- `update_notes_timestamp`

---

## JSON Fields

### invoices.line_items
```json
[
  {
    "description": "Enterprise Tier",
    "our_cost": 30.00,
    "your_price": 149.00,
    "quantity": 1
  }
]
```

### activity_log.old_values / new_values
```json
{
  "status": "prospect",
  "tier": "Dedicated"
}
```

---

## Quick Commands

### Deploy Schema
```bash
# Local SQLite
sqlite3 costplusdb.db < schema.sql

# Turso Cloud
turso db create costplusdb
turso db shell costplusdb < schema.sql
```

### Backup Database
```bash
sqlite3 costplusdb.db ".backup backup_$(date +%Y%m%d).db"
```

### Verify Schema
```bash
sqlite3 costplusdb.db ".tables"
sqlite3 costplusdb.db ".schema customers"
```

### Count Records
```bash
sqlite3 costplusdb.db "SELECT COUNT(*) FROM customers WHERE status = 'active';"
```

---

## SLA Response Times

| Tier | SLA Response Hours | Availability |
|------|-------------------|--------------|
| Shared | 4 hours | M-F 9am-6pm ET |
| Dedicated | 4 hours | M-F 9am-6pm ET |
| Pro | 2 hours | M-F 9am-6pm ET |
| Enterprise | 1 hour | 24/7 |

---

## Migration Workflow

1. Create migration file: `migrations/NNN_description.sql`
2. Apply migration: `sqlite3 costplusdb.db < migrations/NNN_description.sql`
3. Record in schema_migrations table
4. Test on staging before production
5. Verify data integrity after migration

---

## Useful Statistics

- **Total Tables:** 10 (9 core + 1 utility)
- **Total Views:** 5
- **Total Triggers:** 7
- **Total Indexes:** 41
- **Foreign Keys:** 9
- **Schema File:** 876 lines

---

## Resources

### Documentation
- Full Schema Docs: `000-docs/033-DR-ARCH-customer-database-schema.md`
- Database README: `002-clients/database/README.md`
- Schema Summary: `002-clients/database/SCHEMA_SUMMARY.txt`
- ER Diagram: `002-clients/database/ER_DIAGRAM.txt`

### External Links
- SQLite Docs: https://www.sqlite.org/docs.html
- Turso Docs: https://docs.turso.tech/
- Turso CLI: https://docs.turso.tech/reference/turso-cli

### Support
- Email: jeremy@intentsolutions.io

---

## Next Steps

1. ✅ Schema designed and documented
2. ☐ Deploy to Turso Cloud
3. ☐ Build API layer
4. ☐ Create admin dashboard
5. ☐ Integrate with Stripe
6. ☐ Build customer portal
7. ☐ Set up automated billing
8. ☐ Implement support system
9. ☐ Launch to first customers

---

**Generated:** 2025-10-20
**Version:** 1.0.0
**Maintained by:** CostPlusDB Team
