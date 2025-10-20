# CostPlusDB API Documentation

**Version:** 1.0.0
**Base URL:** `https://api.costplusdb.dev` (production) or `http://localhost:3000` (development)
**Last Updated:** 2025-10-20

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Pagination](#pagination)
- [API Endpoints](#api-endpoints)
  - [Health Check](#health-check)
  - [Customer Intake](#customer-intake)
  - [Customers](#customers)
  - [Stripe Webhooks](#stripe-webhooks)
- [OpenAPI Specification](#openapi-specification)
- [Examples](#examples)
- [Support](#support)

---

## Overview

The CostPlusDB API provides programmatic access to customer management, database provisioning, and billing operations for the CostPlusDB transparent managed PostgreSQL service.

**Key Features:**
- RESTful API design
- JSON request/response format
- Webhook support for Stripe events
- Type-safe with runtime validation (Zod)
- Comprehensive error messages

**Supported HTTP Methods:**
- `GET` - Retrieve resources
- `POST` - Create resources
- `PUT` - Update resources (full replace)
- `PATCH` - Update resources (partial update)
- `DELETE` - Delete resources

---

## Authentication

**Current Implementation:** Internal API (no public authentication yet)

**Future:** API keys for programmatic access

All internal endpoints currently assume trusted origin (backend-to-backend communication or admin access). When public endpoints are added, they will use:

```http
Authorization: Bearer <api_key>
```

**Webhook Endpoints:** Use signature verification (e.g., Stripe webhook signatures)

---

## Error Handling

All API responses follow a consistent error format:

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "errors": {
      // Optional: Detailed validation errors
      "field_name": ["Error description"]
    }
  }
}
```

### HTTP Status Codes

| Status Code | Meaning | Usage |
|-------------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH requests |
| 201 | Created | Successful POST requests |
| 204 | No Content | Successful DELETE requests |
| 400 | Bad Request | Invalid request body or parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource already exists or state conflict |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Maintenance mode |

### Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Rate Limiting

**Default Limits:**
- 100 requests per 15-minute window per IP address
- Headers included in response:
  - `X-RateLimit-Limit` - Maximum requests allowed
  - `X-RateLimit-Remaining` - Remaining requests in window
  - `X-RateLimit-Reset` - Timestamp when limit resets

**Rate Limit Exceeded Response:**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later."
  }
}
```

**Configuration:** Adjust limits via environment variables:
- `RATE_LIMIT_WINDOW_MS` (default: 900000 = 15 minutes)
- `RATE_LIMIT_MAX_REQUESTS` (default: 100)

---

## Pagination

List endpoints support pagination via query parameters:

**Parameters:**
- `page` (default: 1) - Page number (1-indexed)
- `limit` (default: 50, max: 100) - Items per page

**Response Format:**

```json
{
  "success": true,
  "data": [
    // Array of resources
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

**Example:**

```bash
GET /api/customers?page=2&limit=25
```

---

## API Endpoints

### Health Check

**Endpoint:** `GET /health`
**Purpose:** Verify API is running
**Authentication:** None

**Response (200 OK):**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-10-20T14:30:00.000Z"
}
```

**cURL Example:**

```bash
curl -X GET http://localhost:3000/health
```

---

### Customer Intake

#### Submit Intake Form

**Endpoint:** `POST /api/intake`
**Purpose:** Submit customer onboarding form
**Authentication:** None (public endpoint)

**Request Body:**

```json
{
  "company_name": "Acme Corporation",
  "email": "john@acme.com",
  "contact_name": "John Doe",
  "phone": "+1-555-0123",
  "website": "https://acme.com",
  "tier": "shared",
  "business_description": "SaaS application for project management",
  "expected_traffic": "10,000 requests/day",
  "compliance_requirements": "None"
}
```

**Request Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `company_name` | string | Yes | Company name (1-100 chars) |
| `email` | string | Yes | Valid email address |
| `contact_name` | string | No | Primary contact name |
| `phone` | string | No | Phone number |
| `website` | string | No | Company website URL |
| `tier` | enum | Yes | Pricing tier: `shared`, `dedicated`, `pro`, `enterprise` |
| `business_description` | string | No | Brief description of business |
| `expected_traffic` | string | No | Expected traffic/usage |
| `compliance_requirements` | string | No | Compliance needs (HIPAA, SOC 2, etc.) |

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "customer_id": 42,
    "status": "prospect",
    "next_step": "consultation",
    "message": "Thank you! We will contact you within 2 hours to schedule a consultation."
  }
}
```

**Error Response (409 Conflict - Email already exists):**

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Customer with email john@acme.com already exists"
  }
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:3000/api/intake \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Acme Corporation",
    "email": "john@acme.com",
    "tier": "shared"
  }'
```

---

### Customers

#### List Customers

**Endpoint:** `GET /api/customers`
**Purpose:** Retrieve all customers with optional filtering
**Authentication:** Required (admin)

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | enum | - | Filter by customer status |
| `tier` | enum | - | Filter by pricing tier |
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Items per page (max 100) |

**Valid Status Values:**
- `prospect` - Initial form submitted
- `consultation` - Consultation scheduled/completed
- `approved` - Approved for provisioning
- `provisioning` - Database being provisioned
- `active` - Database active
- `suspended` - Service suspended
- `churned` - Customer cancelled

**Valid Tier Values:**
- `shared` - $49/mo
- `dedicated` - $89/mo
- `pro` - $129/mo
- `enterprise` - $149/mo

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "company_name": "Acme Corporation",
      "email": "john@acme.com",
      "tier": "shared",
      "status": "active",
      "contact_name": "John Doe",
      "phone": "+1-555-0123",
      "website": "https://acme.com",
      "created_at": "2025-10-01T10:00:00.000Z",
      "updated_at": "2025-10-15T14:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1
  }
}
```

**cURL Example:**

```bash
# List all active customers
curl -X GET "http://localhost:3000/api/customers?status=active&page=1&limit=25"

# List all shared tier customers
curl -X GET "http://localhost:3000/api/customers?tier=shared"
```

---

#### Get Customer by ID

**Endpoint:** `GET /api/customers/:id`
**Purpose:** Retrieve a specific customer
**Authentication:** Required (admin)

**Path Parameters:**
- `id` (number) - Customer ID

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "company_name": "Acme Corporation",
    "email": "john@acme.com",
    "tier": "shared",
    "status": "active",
    "contact_name": "John Doe",
    "phone": "+1-555-0123",
    "website": "https://acme.com",
    "created_at": "2025-10-01T10:00:00.000Z",
    "updated_at": "2025-10-15T14:30:00.000Z"
  }
}
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Customer with ID 999 not found"
  }
}
```

**cURL Example:**

```bash
curl -X GET http://localhost:3000/api/customers/1
```

---

#### Update Customer

**Endpoint:** `PATCH /api/customers/:id`
**Purpose:** Update customer information
**Authentication:** Required (admin)

**Path Parameters:**
- `id` (number) - Customer ID

**Request Body (all fields optional):**

```json
{
  "company_name": "Acme Corp (Updated)",
  "contact_name": "Jane Doe",
  "phone": "+1-555-9999",
  "tier": "dedicated",
  "status": "active"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "company_name": "Acme Corp (Updated)",
    "email": "john@acme.com",
    "tier": "dedicated",
    "status": "active",
    "contact_name": "Jane Doe",
    "phone": "+1-555-9999",
    "website": "https://acme.com",
    "created_at": "2025-10-01T10:00:00.000Z",
    "updated_at": "2025-10-20T16:45:00.000Z"
  }
}
```

**cURL Example:**

```bash
curl -X PATCH http://localhost:3000/api/customers/1 \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "dedicated",
    "status": "active"
  }'
```

---

#### Delete Customer

**Endpoint:** `DELETE /api/customers/:id`
**Purpose:** Delete a customer (use with caution)
**Authentication:** Required (admin)

**Path Parameters:**
- `id` (number) - Customer ID

**Response (204 No Content):**

```
(Empty response body)
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Customer with ID 999 not found"
  }
}
```

**cURL Example:**

```bash
curl -X DELETE http://localhost:3000/api/customers/1
```

**Warning:** Deleting a customer does not delete their database. Refer to offboarding procedures first.

---

#### Get Customer Statistics

**Endpoint:** `GET /api/customers/statistics`
**Purpose:** Get aggregate customer statistics
**Authentication:** Required (admin)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "total": 42,
    "byStatus": {
      "prospect": 5,
      "consultation": 3,
      "approved": 2,
      "provisioning": 1,
      "active": 28,
      "suspended": 2,
      "churned": 1
    }
  }
}
```

**cURL Example:**

```bash
curl -X GET http://localhost:3000/api/customers/statistics
```

---

### Stripe Webhooks

#### Stripe Webhook Handler

**Endpoint:** `POST /api/webhooks/stripe`
**Purpose:** Receive Stripe payment events
**Authentication:** Stripe signature verification

**Headers:**
- `stripe-signature` - Stripe webhook signature (required)

**Request Body:** Raw Stripe event JSON

**Handled Events:**
- `invoice.payment_succeeded` - Payment successful
- `invoice.payment_failed` - Payment failed
- `customer.subscription.created` - Subscription created
- `customer.subscription.updated` - Subscription updated
- `customer.subscription.deleted` - Subscription cancelled

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

**Error Response (400 Bad Request - Invalid Signature):**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid webhook signature"
  }
}
```

**Setup Instructions:**

1. Configure webhook in Stripe Dashboard
2. Set webhook URL: `https://api.costplusdb.dev/api/webhooks/stripe`
3. Select events to send
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET` env var

**Testing Locally with Stripe CLI:**

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test event
stripe trigger invoice.payment_succeeded
```

---

## OpenAPI Specification

Full OpenAPI 3.0 specification available at:

```
GET /api/docs/openapi.json
```

**OpenAPI Schema (YAML):**

```yaml
openapi: 3.0.0
info:
  title: CostPlusDB API
  version: 1.0.0
  description: Transparent managed PostgreSQL service API
  contact:
    name: CostPlusDB Support
    email: jeremy@intentsolutions.io
    url: https://costplusdb.dev

servers:
  - url: https://api.costplusdb.dev
    description: Production
  - url: http://localhost:3000
    description: Development

paths:
  /health:
    get:
      summary: Health check
      responses:
        '200':
          description: API is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: healthy
                  version:
                    type: string
                    example: 1.0.0
                  timestamp:
                    type: string
                    format: date-time

  /api/intake:
    post:
      summary: Submit customer intake form
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - company_name
                - email
                - tier
              properties:
                company_name:
                  type: string
                  minLength: 1
                  maxLength: 100
                email:
                  type: string
                  format: email
                contact_name:
                  type: string
                phone:
                  type: string
                website:
                  type: string
                  format: uri
                tier:
                  type: string
                  enum: [shared, dedicated, pro, enterprise]
                business_description:
                  type: string
                expected_traffic:
                  type: string
                compliance_requirements:
                  type: string
      responses:
        '201':
          description: Intake form submitted successfully
        '400':
          description: Validation error
        '409':
          description: Customer already exists

  /api/customers:
    get:
      summary: List customers
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [prospect, consultation, approved, provisioning, active, suspended, churned]
        - name: tier
          in: query
          schema:
            type: string
            enum: [shared, dedicated, pro, enterprise]
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 50
            maximum: 100
      responses:
        '200':
          description: List of customers

  /api/customers/{id}:
    get:
      summary: Get customer by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Customer details
        '404':
          description: Customer not found

    patch:
      summary: Update customer
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      requestBody:
        content:
          application/json:
            schema:
              type: object
      responses:
        '200':
          description: Customer updated
        '404':
          description: Customer not found

    delete:
      summary: Delete customer
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '204':
          description: Customer deleted
        '404':
          description: Customer not found

components:
  schemas:
    Customer:
      type: object
      properties:
        id:
          type: integer
        company_name:
          type: string
        email:
          type: string
          format: email
        tier:
          type: string
          enum: [shared, dedicated, pro, enterprise]
        status:
          type: string
          enum: [prospect, consultation, approved, provisioning, active, suspended, churned]
        contact_name:
          type: string
          nullable: true
        phone:
          type: string
          nullable: true
        website:
          type: string
          nullable: true
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time
```

---

## Examples

### Complete Customer Onboarding Flow

```bash
# Step 1: Customer submits intake form
curl -X POST http://localhost:3000/api/intake \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "TechStart Inc",
    "email": "admin@techstart.com",
    "contact_name": "Alice Smith",
    "tier": "shared",
    "business_description": "Early-stage SaaS startup"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "customer_id": 15,
#     "status": "prospect",
#     "next_step": "consultation"
#   }
# }

# Step 2: Admin retrieves customer details
curl -X GET http://localhost:3000/api/customers/15

# Step 3: Admin updates status after consultation
curl -X PATCH http://localhost:3000/api/customers/15 \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}'

# Step 4: Admin provisions database (manual SOP)
# ... database provisioning happens ...

# Step 5: Admin updates status to active
curl -X PATCH http://localhost:3000/api/customers/15 \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

### Filter Customers

```bash
# Get all active customers
curl -X GET "http://localhost:3000/api/customers?status=active"

# Get all enterprise tier customers
curl -X GET "http://localhost:3000/api/customers?tier=enterprise"

# Get page 2 with 10 results per page
curl -X GET "http://localhost:3000/api/customers?page=2&limit=10"

# Combine filters
curl -X GET "http://localhost:3000/api/customers?status=active&tier=shared&page=1&limit=25"
```

### Test Webhook Locally

```bash
# Terminal 1: Start development server
cd backend
npm run dev

# Terminal 2: Forward Stripe webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Terminal 3: Trigger test event
stripe trigger invoice.payment_succeeded
```

---

## Support

**Technical Support:**
- Email: jeremy@intentsolutions.io
- Response Time: 4 business hours (M-F 9am-6pm CT)

**Documentation:**
- Website: https://costplusdb.dev
- GitHub: https://github.com/jeremylongshore/cost-plus-db

**API Issues:**
- Check logs: `backend/logs/app.log`
- Review error responses for detailed messages
- Contact support with request ID (included in error responses)

---

**Last Updated:** 2025-10-20
**API Version:** 1.0.0
**Document Version:** 1.0.0
