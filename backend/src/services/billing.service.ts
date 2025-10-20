/**
 * Billing Service
 *
 * Handles transparent pricing calculations and invoice generation:
 * - Transparent pricing breakdown (our cost vs. your price)
 * - Tier pricing with add-ons
 * - Infrastructure cost calculations
 * - Invoice generation and billing records
 *
 * @module services/billing
 */

import Database from 'better-sqlite3';
import { BillingRecord } from '../database/schema.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Pricing tier definitions
 */
const TIER_PRICES = {
  shared: 49,
  dedicated: 89,
  pro: 129,
  enterprise: 149,
} as const;

/**
 * Add-on pricing
 */
const ADDON_PRICES = {
  ha: 99,           // High availability
  replicas: 15,     // Per replica
  vpn: 15,          // VPN access
  compliance: 100,  // Compliance package
} as const;

/**
 * Infrastructure provider costs
 */
const INFRASTRUCTURE_COSTS = {
  contabo: 0,       // Base (included in tier)
  hetzner: 20,      // +$20/mo
  digitalocean: 40, // +$40/mo
  aws: 91,          // +$91/mo
} as const;

/**
 * Pricing breakdown with transparency
 */
export interface PricingBreakdown {
  tier: string;
  tier_price: number;
  addons: Array<{
    name: string;
    quantity: number;
    price_per_unit: number;
    total: number;
  }>;
  infrastructure: {
    provider: string;
    cost: number;
  };
  subtotal: number;
  tax: number;
  total: number;
  transparency: {
    our_cost: number;
    our_markup: number;
    markup_percentage: number;
  };
}

/**
 * Invoice data
 */
export interface Invoice {
  id: number;
  customer_id: number;
  amount: number;
  currency: string;
  status: string;
  billing_period_start: string;
  billing_period_end: string;
  line_items: PricingBreakdown;
  created_at: string;
}

/**
 * Add-on configuration
 */
export interface AddonConfig {
  ha?: boolean;
  replicas?: number;
  vpn?: boolean;
  compliance?: boolean;
}

/**
 * Billing service class
 */
export class BillingService {
  constructor(private db: Database.Database) {}

  /**
   * Calculate transparent pricing breakdown
   *
   * Shows both customer price and our costs for full transparency.
   *
   * @param tier - Pricing tier
   * @param addons - Add-on configuration
   * @param infrastructure - Infrastructure provider
   * @param taxRate - Tax rate (default 0)
   * @returns Detailed pricing breakdown
   */
  calculatePricing(
    tier: keyof typeof TIER_PRICES,
    addons: AddonConfig = {},
    infrastructure: keyof typeof INFRASTRUCTURE_COSTS = 'contabo',
    taxRate: number = 0
  ): PricingBreakdown {
    logger.debug('Calculating pricing', { tier, addons, infrastructure });

    // Tier base price
    const tierPrice = TIER_PRICES[tier];

    // Calculate add-ons
    const addonItems: PricingBreakdown['addons'] = [];
    let addonsTotal = 0;

    if (addons.ha) {
      const haPrice = ADDON_PRICES.ha;
      addonItems.push({
        name: 'High Availability',
        quantity: 1,
        price_per_unit: haPrice,
        total: haPrice,
      });
      addonsTotal += haPrice;
    }

    if (addons.replicas && addons.replicas > 0) {
      const replicaPrice = ADDON_PRICES.replicas * addons.replicas;
      addonItems.push({
        name: 'Read Replicas',
        quantity: addons.replicas,
        price_per_unit: ADDON_PRICES.replicas,
        total: replicaPrice,
      });
      addonsTotal += replicaPrice;
    }

    if (addons.vpn) {
      const vpnPrice = ADDON_PRICES.vpn;
      addonItems.push({
        name: 'VPN Access',
        quantity: 1,
        price_per_unit: vpnPrice,
        total: vpnPrice,
      });
      addonsTotal += vpnPrice;
    }

    if (addons.compliance) {
      const compliancePrice = ADDON_PRICES.compliance;
      addonItems.push({
        name: 'Compliance Package',
        quantity: 1,
        price_per_unit: compliancePrice,
        total: compliancePrice,
      });
      addonsTotal += compliancePrice;
    }

    // Infrastructure cost
    const infrastructureCost = INFRASTRUCTURE_COSTS[infrastructure];

    // Calculate subtotal
    const subtotal = tierPrice + addonsTotal + infrastructureCost;

    // Calculate tax
    const tax = subtotal * taxRate;

    // Calculate total
    const total = subtotal + tax;

    // Transparency calculations (estimate our costs at 40% margin)
    const ourCost = subtotal * 0.60; // We keep 40% margin
    const ourMarkup = subtotal - ourCost;
    const markupPercentage = (ourMarkup / ourCost) * 100;

    return {
      tier,
      tier_price: tierPrice,
      addons: addonItems,
      infrastructure: {
        provider: infrastructure,
        cost: infrastructureCost,
      },
      subtotal,
      tax,
      total,
      transparency: {
        our_cost: Math.round(ourCost * 100) / 100,
        our_markup: Math.round(ourMarkup * 100) / 100,
        markup_percentage: Math.round(markupPercentage * 100) / 100,
      },
    };
  }

  /**
   * Generate invoice for customer
   *
   * Creates a billing record and returns invoice details.
   *
   * @param customerId - Customer ID
   * @param pricing - Pricing breakdown
   * @param billingPeriodStart - Start of billing period
   * @param billingPeriodEnd - End of billing period
   * @returns Invoice details
   */
  async generateInvoice(
    customerId: number,
    pricing: PricingBreakdown,
    billingPeriodStart: Date,
    billingPeriodEnd: Date
  ): Promise<Invoice> {
    logger.info('Generating invoice', {
      customerId,
      amount: pricing.total,
      period: `${billingPeriodStart.toISOString()} - ${billingPeriodEnd.toISOString()}`,
    });

    // Verify customer exists
    await this.getCustomer(customerId);

    // Create billing record
    const stmt = this.db.prepare(`
      INSERT INTO billing_records (
        customer_id, amount, currency, status,
        billing_period_start, billing_period_end
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      customerId,
      pricing.total,
      'USD',
      'pending',
      billingPeriodStart.toISOString(),
      billingPeriodEnd.toISOString()
    );

    const billingRecordId = Number(result.lastInsertRowid);

    // Log activity
    await this.logActivity(customerId, 'invoice_generated', {
      billing_record_id: billingRecordId,
      amount: pricing.total,
    });

    // Return invoice
    const billingRecord = await this.getBillingRecord(billingRecordId);

    return {
      id: billingRecord.id,
      customer_id: billingRecord.customer_id,
      amount: billingRecord.amount,
      currency: billingRecord.currency,
      status: billingRecord.status,
      billing_period_start: billingRecord.billing_period_start,
      billing_period_end: billingRecord.billing_period_end,
      line_items: pricing,
      created_at: billingRecord.created_at,
    };
  }

  /**
   * Get billing record by ID
   */
  async getBillingRecord(id: number): Promise<BillingRecord> {
    const stmt = this.db.prepare('SELECT * FROM billing_records WHERE id = ?');
    const record = stmt.get(id) as BillingRecord | undefined;

    if (!record) {
      throw new NotFoundError(`Billing record with ID ${id} not found`);
    }

    return record;
  }

  /**
   * Update billing record status
   */
  async updateBillingStatus(
    id: number,
    status: 'pending' | 'paid' | 'failed' | 'refunded',
    stripeInvoiceId?: string,
    stripePaymentIntentId?: string
  ): Promise<void> {
    logger.info('Updating billing status', { id, status });

    const stmt = this.db.prepare(`
      UPDATE billing_records
      SET status = ?,
          stripe_invoice_id = COALESCE(?, stripe_invoice_id),
          stripe_payment_intent_id = COALESCE(?, stripe_payment_intent_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(status, stripeInvoiceId || null, stripePaymentIntentId || null, id);
  }

  /**
   * Get customer billing history
   */
  async getCustomerBillingHistory(customerId: number): Promise<BillingRecord[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM billing_records
      WHERE customer_id = ?
      ORDER BY created_at DESC
    `);

    return stmt.all(customerId) as BillingRecord[];
  }

  /**
   * Get pending invoices
   */
  async getPendingInvoices(): Promise<BillingRecord[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM billing_records
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `);

    return stmt.all() as BillingRecord[];
  }

  /**
   * Calculate monthly recurring revenue (MRR)
   */
  async calculateMRR(): Promise<{
    total_mrr: number;
    active_customers: number;
    average_revenue_per_customer: number;
  }> {
    const stmt = this.db.prepare(`
      SELECT
        SUM(amount) as total_mrr,
        COUNT(DISTINCT customer_id) as active_customers
      FROM billing_records
      WHERE status = 'paid'
        AND billing_period_start >= date('now', '-30 days')
    `);

    const result = stmt.get() as {
      total_mrr: number;
      active_customers: number;
    };

    const totalMRR = result.total_mrr || 0;
    const activeCustomers = result.active_customers || 0;
    const arpc = activeCustomers > 0 ? totalMRR / activeCustomers : 0;

    return {
      total_mrr: Math.round(totalMRR * 100) / 100,
      active_customers: activeCustomers,
      average_revenue_per_customer: Math.round(arpc * 100) / 100,
    };
  }

  /**
   * Get customer record (helper)
   */
  private async getCustomer(customerId: number): Promise<any> {
    const stmt = this.db.prepare('SELECT * FROM customers WHERE id = ?');
    const customer = stmt.get(customerId);

    if (!customer) {
      throw new NotFoundError(`Customer with ID ${customerId} not found`);
    }

    return customer;
  }

  /**
   * Log activity to audit trail
   */
  private async logActivity(
    customerId: number,
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO activity_log (customer_id, actor, action, resource_type, details)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      customerId,
      'system',
      action,
      'billing',
      JSON.stringify(details)
    );
  }
}
