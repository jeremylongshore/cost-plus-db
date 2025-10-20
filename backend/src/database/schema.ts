/**
 * Database Schema Definitions
 *
 * TypeScript interfaces matching the SQLite database schema.
 * These types ensure type safety when working with database records.
 *
 * @module database/schema
 */

/**
 * Customer status lifecycle
 */
export type CustomerStatus =
  | 'prospect'       // Initial intake form submitted
  | 'consultation'   // Consultation scheduled/completed
  | 'approved'       // Approved for provisioning
  | 'provisioning'   // Database being provisioned
  | 'active'         // Database active and running
  | 'suspended'      // Service suspended (payment issue)
  | 'churned';       // Customer cancelled

/**
 * Pricing tiers
 */
export type PricingTier =
  | 'shared'         // $49/mo - Shared infrastructure
  | 'dedicated'      // $89/mo - Dedicated VPS
  | 'pro'            // $129/mo - High-performance dedicated
  | 'enterprise';    // $149/mo - Enterprise features

/**
 * Add-on services
 */
export type Addon =
  | 'ha'             // High availability ($99/mo)
  | 'replicas'       // Read replicas ($15/replica/mo)
  | 'vpn'            // VPN access ($15/mo)
  | 'compliance';    // Compliance package ($100/mo)

/**
 * Customers table
 */
export interface Customer {
  id: number;
  company_name: string;
  email: string;
  tier: PricingTier;
  status: CustomerStatus;
  contact_name: string | null;
  phone: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Customer databases table
 */
export interface CustomerDatabase {
  id: number;
  customer_id: number;
  database_name: string;
  host: string;
  port: number;
  username: string;
  password_hash: string;
  ssl_enabled: boolean;
  connection_limit: number;
  storage_gb: number;
  backup_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Billing records table
 */
export interface BillingRecord {
  id: number;
  customer_id: number;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  billing_period_start: string;
  billing_period_end: string;
  created_at: string;
  updated_at: string;
}

/**
 * Support tickets table
 */
export interface SupportTicket {
  id: number;
  customer_id: number;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

/**
 * Activity log table (audit trail)
 */
export interface ActivityLog {
  id: number;
  customer_id: number | null;
  actor: string;
  action: string;
  resource_type: string;
  resource_id: number | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

/**
 * Customer workflow checkpoints
 */
export interface CustomerWorkflow {
  id: number;
  customer_id: number;
  current_stage: string;

  // 12 Checkpoint timestamps
  form_submitted: string | null;
  consultation_scheduled: string | null;
  consultation_completed: string | null;
  payment_link_sent: string | null;
  payment_received: string | null;
  provisioning_started: string | null;
  database_created: string | null;
  backups_configured: string | null;
  credentials_sent: string | null;
  onboarding_completed: string | null;
  first_month_milestone: string | null;
  three_month_milestone: string | null;

  // Blocker tracking
  is_blocked: boolean;
  blocker_type: string | null;
  blocker_reason: string | null;
  blocker_set_at: string | null;

  created_at: string;
  updated_at: string;
}

/**
 * Schema migrations tracking
 */
export interface SchemaMigration {
  version: number;
  description: string;
  applied_at: string;
}

/**
 * Type for creating new customers (without auto-generated fields)
 */
export type CustomerCreateInput = Omit<Customer, 'id' | 'created_at' | 'updated_at'>;

/**
 * Type for updating customers (partial, without id/timestamps)
 */
export type CustomerUpdateInput = Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at'>>;
