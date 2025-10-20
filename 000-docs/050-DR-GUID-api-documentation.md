# CostPlusDB API Documentation

**Document ID:** 050-DR-GUID-api-documentation.md
**Version:** 1.0.0
**Status:** Production Ready
**Last Updated:** 2025-10-20
**Base URL:** `https://api.costplusdb.dev` (production) | `http://localhost:3000` (development)

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Error Handling](#error-handling)
5. [API Endpoints](#api-endpoints)
   - [Intake API](#intake-api)
   - [Customer API](#customer-api)
   - [Admin API](#admin-api)
   - [Webhook API](#webhook-api)
   - [Health Check API](#health-check-api)
6. [Data Models](#data-models)
7. [Status Codes](#status-codes)
8. [Examples](#examples)

---

## Overview

The CostPlusDB API provides programmatic access to customer onboarding, database management, billing, and administrative operations. The API follows RESTful conventions and returns JSON responses.

### Base URL

**Production:**
```
https://api.costplusdb.dev
```

**Development:**
```
http://localhost:3000
```

### API Version

Current version: **v1**

All endpoints are prefixed with `/api/` for clarity and future versioning.

### Content Type

All requests and responses use `application/json` content type.

```http
Content-Type: application/json
Accept: application/json
```

---

## Authentication

### Current State: No Authentication (Placeholder)

**⚠️ WARNING:** The current API implementation does NOT require authentication. This is intentional for Phase 1 launch with manual customer onboarding.

**Future Implementation (Month 2-3):**
- JWT token-based authentication
- Admin role required for admin endpoints
- API keys for programmatic access
- OAuth2 for customer portal

### Future Authentication Headers

```http
Authorization: Bearer <jwt_token>
```

### Future Admin Authentication

Admin endpoints will require:
1. Valid JWT token
2. Admin role claim in token
3. IP whitelist verification (optional)

**Example Token Payload:**
```json
{
  "sub": "admin@costplusdb.dev",
  "role": "admin",
  "iat": 1609459200,
  "exp": 1609545600
}
```

---

## Rate Limiting

### Global Rate Limits

To prevent abuse and ensure fair usage:

| Endpoint Type | Rate Limit | Window |
|---------------|------------|--------|
| **Global** | 100 requests | 15 minutes |
| **Intake Form** | 10 requests | 1 hour |
| **Webhooks** | 1000 requests | 1 hour |
| **Admin API** | 500 requests | 15 minutes |

### Rate Limit Headers

All responses include rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

### Rate Limit Exceeded Response

**Status Code:** `429 Too Many Requests`

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retry_after": 900
  }
}
```

---

## Error Handling

### Standard Error Response Format

All errors follow this consistent structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "details": {}
  }
}
```

### Validation Error Format

Field-level validation errors include detailed information:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "errors": [
      {
        "field": "contact_email",
        "message": "Invalid email format",
        "received": "not-an-email"
      },
      {
        "field": "tier",
        "message": "Must be one of: Shared, Dedicated, Pro, Enterprise",
        "received": "invalid-tier"
      }
    ]
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request body failed validation |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Resource already exists (e.g., duplicate email) |
| `UNAUTHORIZED` | Authentication required or invalid |
| `FORBIDDEN` | Insufficient permissions |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_SERVER_ERROR` | Unexpected server error |

---

## API Endpoints

---

## Intake API

### POST /api/intake

Submit a customer intake form to begin the onboarding process.

**Authentication:** None (public endpoint)
**Rate Limit:** 10 requests per hour

#### Request Body

```json
{
  "company_name": "Acme Corp",
  "contact_name": "John Smith",
  "contact_email": "john@acme.com",
  "contact_phone": "+1-555-123-4567",
  "company_website": "https://acme.com",
  "timezone": "America/New_York",

  "database_name": "acme_production",
  "database_user": "acme_admin",
  "database_size": "1-5 GB",
  "expected_growth": "~500 MB/month",
  "database_purpose": "production",

  "tier": "Dedicated",

  "application_description": "SaaS project management tool",
  "traffic_level": "medium",
  "peak_usage_times": "Business hours 9 AM - 5 PM ET",

  "postgresql_version": "16",
  "required_extensions": "pg_stat_statements, uuid-ossp",
  "enable_pgbouncer": true,
  "ip_whitelist": "",

  "backup_frequency": "daily",
  "pitr_retention_days": 7,
  "needs_restore": false,
  "restore_details": "",

  "support_channel": "email",
  "alert_notifications": true,
  "monthly_reports": true,

  "billing_email": "billing@acme.com",
  "billing_address": "123 Main St\nNew York, NY 10001\nUSA",
  "payment_method": "stripe",
  "po_number": "",

  "requires_baa": false,
  "requires_soc2": false,
  "special_security_requirements": "",

  "referral_source": "Hacker News",
  "special_requests": "",
  "is_migration": true,
  "migration_source": "Heroku",
  "needs_migration_assistance": true,

  "agreed_to_terms": true,
  "agreed_to_privacy": true,
  "agreed_to_aup": true,
  "agreed_to_backup_policy": true,
  "agreed_to_billing_terms": true,
  "signature": "John Smith",
  "signature_date": "2025-10-20"
}
```

#### Response (Success)

**Status Code:** `201 Created`

```json
{
  "success": true,
  "data": {
    "customer_id": "acme-corp-20251020",
    "status": "prospect",
    "current_stage": "form_submitted",
    "next_step": "consultation",
    "message": "Thank you for your interest in CostPlusDB! We've received your onboarding request and will contact you within 2 hours to schedule a consultation call.",
    "created_at": "2025-10-20T14:30:00Z"
  },
  "meta": {
    "estimated_consultation_time": "2 hours",
    "next_contact_method": "email"
  }
}
```

#### Response (Validation Error)

**Status Code:** `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "errors": [
      {
        "field": "contact_email",
        "message": "Invalid email format",
        "received": "not-an-email"
      }
    ]
  }
}
```

#### Response (Duplicate Email)

**Status Code:** `409 Conflict`

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "A customer with this email address already exists. Please contact support@intentsolutions.io if you need assistance.",
    "details": {
      "field": "contact_email",
      "existing_customer_id": "acme-corp-20251015"
    }
  }
}
```

#### Example curl Command

```bash
curl -X POST https://api.costplusdb.dev/api/intake \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Acme Corp",
    "contact_name": "John Smith",
    "contact_email": "john@acme.com",
    "tier": "Dedicated",
    "database_name": "acme_production",
    "agreed_to_terms": true,
    "signature": "John Smith",
    "signature_date": "2025-10-20"
  }'
```

---

### GET /api/intake/schema

Get the validation schema for the intake form (useful for frontend validation).

**Authentication:** None
**Rate Limit:** 100 requests per 15 minutes

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "schema": {
      "company_name": {
        "type": "string",
        "required": true,
        "min_length": 2,
        "max_length": 100
      },
      "contact_email": {
        "type": "string",
        "required": true,
        "format": "email"
      },
      "tier": {
        "type": "string",
        "required": true,
        "enum": ["Shared", "Dedicated", "Pro", "Enterprise"]
      }
    }
  }
}
```

---

## Customer API

### GET /api/customers

List all customers with filtering, sorting, and pagination.

**Authentication:** Admin (future)
**Rate Limit:** 100 requests per 15 minutes

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `status` | string | Filter by status | `?status=active` |
| `tier` | string | Filter by tier | `?tier=Enterprise` |
| `search` | string | Search company name or email | `?search=acme` |
| `limit` | integer | Results per page (default: 50) | `?limit=25` |
| `offset` | integer | Pagination offset | `?offset=50` |
| `sort` | string | Sort field | `?sort=created_at` |
| `order` | string | Sort order (asc/desc) | `?order=desc` |

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": 1,
        "customer_id": "acme-corp-20251020",
        "company_name": "Acme Corp",
        "contact_email": "john@acme.com",
        "tier": "Dedicated",
        "status": "active",
        "monthly_rate": 89.00,
        "created_at": "2025-10-20T14:30:00Z",
        "activated_at": "2025-10-21T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0,
      "has_more": true
    }
  }
}
```

#### Example curl Command

```bash
curl -X GET "https://api.costplusdb.dev/api/customers?status=active&tier=Enterprise&limit=25" \
  -H "Authorization: Bearer <token>"
```

---

### GET /api/customers/:id

Get detailed information about a specific customer.

**Authentication:** Admin (future)
**Rate Limit:** 100 requests per 15 minutes

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Customer database ID |

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "customer": {
      "id": 1,
      "customer_id": "acme-corp-20251020",
      "company_name": "Acme Corp",
      "contact_name": "John Smith",
      "contact_email": "john@acme.com",
      "contact_phone": "+1-555-123-4567",
      "tier": "Dedicated",
      "status": "active",
      "created_at": "2025-10-20T14:30:00Z",
      "activated_at": "2025-10-21T10:00:00Z"
    },
    "billing": {
      "billing_cycle": "monthly",
      "total_monthly_rate": 89.00,
      "next_billing_date": "2025-11-20",
      "payment_status": "current",
      "stripe_customer_id": "cus_xxxxxxxxxxxxx"
    },
    "databases": [
      {
        "database_name": "acme_production",
        "provision_status": "active",
        "health_status": "healthy",
        "vps_hostname": "vps-contabo-01.costplusdb.dev",
        "allocated_ram_gb": 8,
        "allocated_storage_gb": 200
      }
    ],
    "workflow": {
      "current_stage": "go_live",
      "form_submitted": true,
      "database_provisioned": true,
      "customer_confirmed_access": true,
      "go_live": true
    }
  }
}
```

#### Response (Not Found)

**Status Code:** `404 Not Found`

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Customer not found"
  }
}
```

---

### PATCH /api/customers/:id

Update customer information.

**Authentication:** Admin (future)
**Rate Limit:** 100 requests per 15 minutes

#### Request Body (Partial Update)

```json
{
  "status": "active",
  "tier": "Pro",
  "contact_phone": "+1-555-999-8888"
}
```

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "customer": {
      "id": 1,
      "customer_id": "acme-corp-20251020",
      "status": "active",
      "tier": "Pro",
      "updated_at": "2025-10-21T15:30:00Z"
    }
  },
  "message": "Customer updated successfully"
}
```

---

### DELETE /api/customers/:id

Soft-delete a customer (sets `is_active = 0`).

**Authentication:** Admin (future)
**Rate Limit:** 100 requests per 15 minutes

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Customer deactivated successfully"
}
```

---

### GET /api/customers/search

Search customers by company name, email, or customer ID.

**Authentication:** Admin (future)
**Rate Limit:** 100 requests per 15 minutes

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query |
| `limit` | integer | No | Results limit (default: 25) |

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": 1,
        "customer_id": "acme-corp-20251020",
        "company_name": "Acme Corp",
        "contact_email": "john@acme.com",
        "status": "active",
        "tier": "Dedicated"
      }
    ],
    "count": 1
  }
}
```

---

### GET /api/customers/stats

Get customer statistics and metrics.

**Authentication:** Admin (future)
**Rate Limit:** 100 requests per 15 minutes

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "total_customers": 150,
    "active_customers": 142,
    "prospects": 8,
    "mrr": 12450.00,
    "avg_revenue_per_customer": 87.68,
    "by_tier": {
      "Shared": 45,
      "Dedicated": 75,
      "Pro": 20,
      "Enterprise": 10
    },
    "by_status": {
      "prospect": 8,
      "consultation": 2,
      "approved": 3,
      "provisioning": 5,
      "active": 132,
      "suspended": 0,
      "churned": 0
    }
  }
}
```

---

## Admin API

### GET /api/admin/dashboard

Get dashboard metrics for admin panel.

**Authentication:** Admin (future)
**Rate Limit:** 500 requests per 15 minutes

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "overview": {
      "total_customers": 150,
      "active_customers": 142,
      "mrr": 12450.00,
      "new_this_month": 15
    },
    "onboarding_pipeline": {
      "prospects": 8,
      "in_consultation": 2,
      "approved": 3,
      "provisioning": 5
    },
    "support": {
      "open_tickets": 12,
      "sla_breaches": 1,
      "avg_response_time_hours": 1.5
    },
    "health": {
      "healthy_databases": 138,
      "warning_databases": 4,
      "critical_databases": 0
    }
  }
}
```

---

### GET /api/admin/activity

Get recent activity log for audit trail.

**Authentication:** Admin (future)
**Rate Limit:** 500 requests per 15 minutes

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Results limit (default: 50) |
| `offset` | integer | Pagination offset |
| `entity_type` | string | Filter by entity (customer, database, billing) |
| `action_type` | string | Filter by action (created, updated, deleted) |

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": 1234,
        "entity_type": "customer",
        "entity_id": 1,
        "action_type": "status_changed",
        "action_description": "Customer status changed from prospect to active",
        "old_values": {
          "status": "prospect"
        },
        "new_values": {
          "status": "active"
        },
        "performed_by": "jeremy@intentsolutions.io",
        "created_at": "2025-10-21T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 5432,
      "limit": 50,
      "offset": 0,
      "has_more": true
    }
  }
}
```

---

### POST /api/admin/customers/:id/approve

Approve a customer and prepare for provisioning.

**Authentication:** Admin (future)
**Rate Limit:** 100 requests per 15 minutes

#### Request Body

```json
{
  "tier": "Dedicated",
  "monthly_rate": 89.00,
  "notes": "Approved after consultation call"
}
```

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "customer_id": "acme-corp-20251020",
    "status": "approved",
    "next_step": "send_payment_link"
  },
  "message": "Customer approved successfully"
}
```

---

### POST /api/admin/customers/:id/send-payment-link

Generate and send Stripe payment link to customer.

**Authentication:** Admin (future)
**Rate Limit:** 100 requests per 15 minutes

#### Request Body

```json
{
  "monthly_rate": 89.00,
  "billing_cycle": "monthly",
  "send_email": true
}
```

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "payment_link": "https://checkout.stripe.com/pay/cs_test_xxxxxxxxxxxxx",
    "payment_link_id": "plink_xxxxxxxxxxxxx",
    "email_sent": true,
    "expires_at": "2025-10-27T14:30:00Z"
  },
  "message": "Payment link created and sent to customer"
}
```

---

### POST /api/admin/customers/:id/provision

Trigger database provisioning for approved customer.

**Authentication:** Admin (future)
**Rate Limit:** 100 requests per 15 minutes

#### Request Body

```json
{
  "database_name": "acme_production",
  "database_user": "acme_admin",
  "tier": "Dedicated",
  "vps_hostname": "vps-contabo-01.costplusdb.dev"
}
```

#### Response

**Status Code:** `202 Accepted`

```json
{
  "success": true,
  "data": {
    "provisioning_job_id": "job-20251020-001",
    "status": "provisioning",
    "estimated_completion": "15-30 minutes"
  },
  "message": "Database provisioning started"
}
```

---

### POST /api/admin/customers/:id/suspend

Suspend customer access (non-payment or policy violation).

**Authentication:** Admin (future)
**Rate Limit:** 100 requests per 15 minutes

#### Request Body

```json
{
  "reason": "payment_failure",
  "notes": "Payment failed 3 times. Suspended pending resolution.",
  "notify_customer": true
}
```

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "customer_id": "acme-corp-20251020",
    "status": "suspended",
    "suspended_at": "2025-10-21T14:30:00Z"
  },
  "message": "Customer suspended successfully"
}
```

---

### POST /api/admin/customers/:id/reactivate

Reactivate suspended customer.

**Authentication:** Admin (future)
**Rate Limit:** 100 requests per 15 minutes

#### Request Body

```json
{
  "notes": "Payment received. Reactivating access."
}
```

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "customer_id": "acme-corp-20251020",
    "status": "active",
    "reactivated_at": "2025-10-22T09:00:00Z"
  },
  "message": "Customer reactivated successfully"
}
```

---

## Webhook API

### POST /api/webhooks/stripe

Handle Stripe webhook events (payments, subscriptions).

**Authentication:** Stripe webhook signature verification
**Rate Limit:** 1000 requests per hour

#### Headers

```http
Stripe-Signature: t=1609459200,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd
```

#### Request Body (Example: Payment Success)

```json
{
  "id": "evt_xxxxxxxxxxxxx",
  "object": "event",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_xxxxxxxxxxxxx",
      "customer": "cus_xxxxxxxxxxxxx",
      "customer_email": "john@acme.com",
      "payment_status": "paid",
      "amount_total": 8900,
      "metadata": {
        "customer_id": "acme-corp-20251020"
      }
    }
  }
}
```

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

#### Supported Stripe Events

| Event Type | Description | Action |
|------------|-------------|--------|
| `checkout.session.completed` | Payment completed | Update payment status, trigger provisioning |
| `customer.subscription.created` | Subscription created | Create billing record |
| `customer.subscription.updated` | Subscription updated | Update billing record |
| `customer.subscription.deleted` | Subscription cancelled | Suspend customer |
| `invoice.payment_succeeded` | Invoice paid | Mark invoice as paid |
| `invoice.payment_failed` | Payment failed | Send notification, retry |

---

### POST /api/webhooks/github

Handle GitHub webhook events (for automation triggers).

**Authentication:** GitHub webhook secret verification
**Rate Limit:** 1000 requests per hour

#### Headers

```http
X-Hub-Signature-256: sha256=xxxxxxxxxxxxx
X-GitHub-Event: push
```

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

---

### GET /api/webhooks/health

Health check endpoint for webhook monitoring.

**Authentication:** None
**Rate Limit:** 100 requests per 15 minutes

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "webhooks": {
      "stripe": "operational",
      "github": "operational"
    },
    "last_stripe_event": "2025-10-21T14:25:00Z",
    "last_github_event": "2025-10-21T13:15:00Z"
  }
}
```

---

## Health Check API

### GET /health

General health check for API monitoring.

**Authentication:** None
**Rate Limit:** 100 requests per 15 minutes

#### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": 86400,
    "timestamp": "2025-10-21T14:30:00Z",
    "database": {
      "status": "connected",
      "latency_ms": 2
    }
  }
}
```

---

## Data Models

### Customer Object

```typescript
interface Customer {
  id: number;
  customer_id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  company_website: string | null;
  timezone: string;
  tier: 'Shared' | 'Dedicated' | 'Pro' | 'Enterprise';
  status: 'prospect' | 'consultation' | 'approved' | 'provisioning' | 'active' | 'suspended' | 'churned';
  is_active: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  activated_at: string | null; // ISO 8601
}
```

---

### Database Object

```typescript
interface Database {
  id: number;
  customer_id: number;
  database_name: string;
  database_user: string;
  vps_hostname: string;
  provision_status: 'pending' | 'provisioning' | 'active' | 'maintenance' | 'suspended' | 'deprovisioned';
  health_status: 'healthy' | 'warning' | 'critical' | 'unknown';
  allocated_ram_gb: number;
  allocated_storage_gb: number;
  allocated_cpu_cores: number;
  max_connections: number;
  current_size_gb: number | null;
  current_connections: number | null;
  last_health_check: string | null; // ISO 8601
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}
```

---

### Billing Object

```typescript
interface Billing {
  id: number;
  customer_id: number;
  billing_cycle: 'monthly' | 'annual' | 'custom';
  base_tier_price: number;
  infrastructure_addon_price: number;
  feature_addons_price: number;
  extra_storage_price: number;
  total_monthly_rate: number;
  next_billing_date: string; // ISO 8601
  payment_method: 'stripe' | 'bank_transfer' | 'paypal' | 'invoice';
  payment_status: 'current' | 'past_due' | 'suspended' | 'cancelled';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}
```

---

### Workflow Object

```typescript
interface Workflow {
  id: number;
  customer_id: number;
  current_stage: string;
  form_submitted: boolean;
  form_submitted_at: string | null; // ISO 8601
  consultation_scheduled: boolean;
  consultation_scheduled_at: string | null;
  consultation_completed: boolean;
  consultation_completed_at: string | null;
  pricing_approved: boolean;
  pricing_approved_at: string | null;
  payment_received: boolean;
  payment_received_at: string | null;
  database_provisioning_started: boolean;
  database_provisioning_started_at: string | null;
  database_provisioned: boolean;
  database_provisioned_at: string | null;
  credentials_sent: boolean;
  credentials_sent_at: string | null;
  customer_confirmed_access: boolean;
  customer_confirmed_access_at: string | null;
  migration_started: boolean;
  migration_started_at: string | null;
  migration_completed: boolean;
  migration_completed_at: string | null;
  go_live: boolean;
  go_live_at: string | null;
  blocked: boolean;
  blocker_reason: string | null;
  workflow_notes: string | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}
```

---

### Invoice Object

```typescript
interface Invoice {
  id: number;
  customer_id: number;
  invoice_number: string;
  invoice_date: string; // ISO 8601
  due_date: string; // ISO 8601
  payment_status: 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'refunded';
  base_amount: number;
  addons_amount: number;
  discounts_amount: number;
  tax_amount: number;
  total_amount: number;
  line_items: LineItem[];
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  invoice_pdf_path: string | null;
  invoice_sent: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

interface LineItem {
  description: string;
  our_cost: number;
  your_price: number;
  quantity: number;
}
```

---

## Status Codes

### Success Codes

| Code | Description |
|------|-------------|
| `200 OK` | Request succeeded |
| `201 Created` | Resource created successfully |
| `202 Accepted` | Request accepted for processing |
| `204 No Content` | Request succeeded with no response body |

### Client Error Codes

| Code | Description |
|------|-------------|
| `400 Bad Request` | Invalid request body or parameters |
| `401 Unauthorized` | Authentication required or invalid |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Resource not found |
| `409 Conflict` | Resource already exists |
| `422 Unprocessable Entity` | Request understood but cannot be processed |
| `429 Too Many Requests` | Rate limit exceeded |

### Server Error Codes

| Code | Description |
|------|-------------|
| `500 Internal Server Error` | Unexpected server error |
| `502 Bad Gateway` | Upstream service error |
| `503 Service Unavailable` | Server temporarily unavailable |
| `504 Gateway Timeout` | Upstream service timeout |

---

## Examples

### Complete Onboarding Workflow

**1. Submit Intake Form**

```bash
curl -X POST https://api.costplusdb.dev/api/intake \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Acme Corp",
    "contact_name": "John Smith",
    "contact_email": "john@acme.com",
    "tier": "Dedicated",
    "database_name": "acme_production",
    "agreed_to_terms": true,
    "signature": "John Smith",
    "signature_date": "2025-10-20"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customer_id": "acme-corp-20251020",
    "status": "prospect"
  }
}
```

---

**2. Admin Approves Customer**

```bash
curl -X POST https://api.costplusdb.dev/api/admin/customers/1/approve \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "Dedicated",
    "monthly_rate": 89.00,
    "notes": "Approved after consultation"
  }'
```

---

**3. Send Payment Link**

```bash
curl -X POST https://api.costplusdb.dev/api/admin/customers/1/send-payment-link \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "monthly_rate": 89.00,
    "billing_cycle": "monthly",
    "send_email": true
  }'
```

---

**4. Stripe Webhook: Payment Success**

Stripe automatically sends webhook when customer pays:

```bash
# Simulated webhook (Stripe sends this automatically)
curl -X POST https://api.costplusdb.dev/api/webhooks/stripe \
  -H "Stripe-Signature: t=1609459200,v1=xxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "customer_email": "john@acme.com",
        "payment_status": "paid",
        "metadata": {
          "customer_id": "acme-corp-20251020"
        }
      }
    }
  }'
```

---

**5. Provision Database**

```bash
curl -X POST https://api.costplusdb.dev/api/admin/customers/1/provision \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "database_name": "acme_production",
    "database_user": "acme_admin",
    "tier": "Dedicated",
    "vps_hostname": "vps-contabo-01.costplusdb.dev"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "provisioning_job_id": "job-20251020-001",
    "status": "provisioning",
    "estimated_completion": "15-30 minutes"
  }
}
```

---

**6. Check Customer Status**

```bash
curl -X GET https://api.costplusdb.dev/api/customers/1 \
  -H "Authorization: Bearer <admin_token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customer": {
      "status": "active",
      "tier": "Dedicated"
    },
    "databases": [
      {
        "database_name": "acme_production",
        "provision_status": "active",
        "health_status": "healthy"
      }
    ],
    "workflow": {
      "current_stage": "go_live",
      "database_provisioned": true
    }
  }
}
```

---

### Searching and Filtering Customers

**Search by company name:**
```bash
curl -X GET "https://api.costplusdb.dev/api/customers/search?q=acme" \
  -H "Authorization: Bearer <admin_token>"
```

**Filter active Enterprise customers:**
```bash
curl -X GET "https://api.costplusdb.dev/api/customers?status=active&tier=Enterprise" \
  -H "Authorization: Bearer <admin_token>"
```

**Paginate results:**
```bash
curl -X GET "https://api.costplusdb.dev/api/customers?limit=25&offset=50&sort=created_at&order=desc" \
  -H "Authorization: Bearer <admin_token>"
```

---

### Handling Webhooks

**Verify Stripe webhook signature (Node.js example):**

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_SIGNATURE', message: err.message }
    });
  }

  // Handle event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      await handlePaymentSuccess(session);
      break;

    case 'invoice.payment_failed':
      const invoice = event.data.object;
      await handlePaymentFailure(invoice);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ success: true, message: 'Webhook processed' });
});
```

---

## Idempotency

### Stripe Webhook Idempotency

To handle duplicate webhook events (Stripe may retry):

```javascript
// Store processed event IDs in database
const processedEvents = new Set();

async function handleWebhook(event) {
  // Check if already processed
  if (await isEventProcessed(event.id)) {
    console.log('Event already processed:', event.id);
    return;
  }

  // Process event
  await processEvent(event);

  // Mark as processed
  await markEventProcessed(event.id);
}
```

---

## Security Best Practices

### 1. Validate Webhook Signatures

Always verify webhook signatures before processing:
- **Stripe:** Use `stripe.webhooks.constructEvent()`
- **GitHub:** Verify `X-Hub-Signature-256` header

### 2. Rate Limiting

Implement rate limiting on all endpoints to prevent abuse.

### 3. Input Validation

Use Zod schemas to validate all request bodies:

```typescript
const intakeFormSchema = z.object({
  company_name: z.string().min(2).max(100),
  contact_email: z.string().email(),
  tier: z.enum(['Shared', 'Dedicated', 'Pro', 'Enterprise']),
  agreed_to_terms: z.literal(true)
});
```

### 4. Parameterized Queries

Always use parameterized queries to prevent SQL injection:

```typescript
// ✅ Good (parameterized)
db.prepare('SELECT * FROM customers WHERE email = ?').get(email);

// ❌ Bad (vulnerable to SQL injection)
db.prepare(`SELECT * FROM customers WHERE email = '${email}'`).get();
```

---

## Versioning Strategy

### Current: No Versioning (v1 implicit)

All endpoints currently use `/api/` prefix without version number.

### Future: Version in URL Path

When breaking changes are introduced:

```
/api/v2/intake
/api/v2/customers
```

### Backwards Compatibility

- Old `/api/` routes will continue to work
- New features in v2 only
- Deprecation warnings in v1 responses
- Minimum 6 months before removing v1

---

## Support

### Questions?

**Email:** jeremy@intentsolutions.io
**Documentation:** https://costplusdb.dev/docs
**Status Page:** https://status.costplusdb.dev

### Reporting API Issues

Include:
1. HTTP method and endpoint
2. Request body (sanitized, no credentials)
3. Response status code and body
4. Timestamp of request
5. Expected vs actual behavior

---

**Document Version:** 1.0.0
**Last Updated:** 2025-10-20
**Maintained By:** Jeremy Longshore (jeremy@intentsolutions.io)
