/**
 * Unit Tests - Billing Service
 *
 * Tests for billing calculations and invoice generation:
 * - Pricing calculations for all tiers
 * - Add-on pricing
 * - Infrastructure cost calculations
 * - Transparent pricing (our_cost vs your_price)
 * - Invoice generation and management
 * - Customer billing information
 *
 * @module tests/unit/services/billing.service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BillingService } from '../../../src/services/billing.service.js';
import { NotFoundError } from '../../../src/utils/errors.js';
import { getTestDb, seedCustomers } from '../../setup.js';

describe('BillingService', () => {
  let billingService: BillingService;
  let customerId: number;

  beforeEach(() => {
    const db = getTestDb();
    billingService = new BillingService(db);
  });

  // Helper to seed a customer when needed
  function seedTestCustomer(): number {
    const [id] = seedCustomers([
      {
        company_name: 'Test Company',
        email: 'test@example.com',
        tier: 'dedicated',
        status: 'active',
        contact_name: 'John Doe',
        phone: '+1-555-1234',
        website: 'https://test.com',
      },
    ]);
    return id;
  }

  describe('calculatePricing', () => {
    describe('tier pricing', () => {
      it('should calculate Shared tier pricing', () => {
        const result = billingService.calculatePricing('shared');

        expect(result.tier).toBe('shared');
        expect(result.tier_price).toBe(49);
        expect(result.subtotal).toBe(49);
        expect(result.total).toBe(49);
        expect(result.addons).toHaveLength(0);
        expect(result.infrastructure.provider).toBe('contabo');
        expect(result.infrastructure.cost).toBe(0);
      });

      it('should calculate Dedicated tier pricing', () => {
        const result = billingService.calculatePricing('dedicated');

        expect(result.tier).toBe('dedicated');
        expect(result.tier_price).toBe(89);
        expect(result.subtotal).toBe(89);
        expect(result.total).toBe(89);
      });

      it('should calculate Pro tier pricing', () => {
        const result = billingService.calculatePricing('pro');

        expect(result.tier).toBe('pro');
        expect(result.tier_price).toBe(129);
        expect(result.subtotal).toBe(129);
        expect(result.total).toBe(129);
      });

      it('should calculate Enterprise tier pricing', () => {
        const result = billingService.calculatePricing('enterprise');

        expect(result.tier).toBe('enterprise');
        expect(result.tier_price).toBe(149);
        expect(result.subtotal).toBe(149);
        expect(result.total).toBe(149);
      });
    });

    describe('add-on pricing', () => {
      it('should calculate High Availability addon', () => {
        const result = billingService.calculatePricing('dedicated', { ha: true });

        expect(result.addons).toHaveLength(1);
        expect(result.addons[0].name).toBe('High Availability');
        expect(result.addons[0].quantity).toBe(1);
        expect(result.addons[0].price_per_unit).toBe(99);
        expect(result.addons[0].total).toBe(99);
        expect(result.subtotal).toBe(188); // 89 + 99
      });

      it('should calculate Read Replicas addon', () => {
        const result = billingService.calculatePricing('dedicated', { replicas: 2 });

        expect(result.addons).toHaveLength(1);
        expect(result.addons[0].name).toBe('Read Replicas');
        expect(result.addons[0].quantity).toBe(2);
        expect(result.addons[0].price_per_unit).toBe(15);
        expect(result.addons[0].total).toBe(30);
        expect(result.subtotal).toBe(119); // 89 + 30
      });

      it('should calculate VPN addon', () => {
        const result = billingService.calculatePricing('dedicated', { vpn: true });

        expect(result.addons).toHaveLength(1);
        expect(result.addons[0].name).toBe('VPN Access');
        expect(result.addons[0].quantity).toBe(1);
        expect(result.addons[0].price_per_unit).toBe(15);
        expect(result.addons[0].total).toBe(15);
        expect(result.subtotal).toBe(104); // 89 + 15
      });

      it('should calculate Compliance addon', () => {
        const result = billingService.calculatePricing('dedicated', { compliance: true });

        expect(result.addons).toHaveLength(1);
        expect(result.addons[0].name).toBe('Compliance Package');
        expect(result.addons[0].quantity).toBe(1);
        expect(result.addons[0].price_per_unit).toBe(100);
        expect(result.addons[0].total).toBe(100);
        expect(result.subtotal).toBe(189); // 89 + 100
      });

      it('should calculate multiple addons combined', () => {
        const result = billingService.calculatePricing('pro', {
          ha: true,
          replicas: 3,
          vpn: true,
          compliance: true,
        });

        expect(result.addons).toHaveLength(4);
        expect(result.tier_price).toBe(129);

        const haAddon = result.addons.find(a => a.name === 'High Availability');
        expect(haAddon?.total).toBe(99);

        const replicasAddon = result.addons.find(a => a.name === 'Read Replicas');
        expect(replicasAddon?.quantity).toBe(3);
        expect(replicasAddon?.total).toBe(45);

        const vpnAddon = result.addons.find(a => a.name === 'VPN Access');
        expect(vpnAddon?.total).toBe(15);

        const complianceAddon = result.addons.find(a => a.name === 'Compliance Package');
        expect(complianceAddon?.total).toBe(100);

        expect(result.subtotal).toBe(388); // 129 + 99 + 45 + 15 + 100
      });

      it('should handle zero replicas', () => {
        const result = billingService.calculatePricing('dedicated', { replicas: 0 });

        expect(result.addons).toHaveLength(0);
        expect(result.subtotal).toBe(89);
      });

      it('should handle empty addons object', () => {
        const result = billingService.calculatePricing('shared', {});

        expect(result.addons).toHaveLength(0);
        expect(result.subtotal).toBe(49);
      });
    });

    describe('infrastructure costs', () => {
      it('should calculate Contabo infrastructure (default)', () => {
        const result = billingService.calculatePricing('dedicated', {}, 'contabo');

        expect(result.infrastructure.provider).toBe('contabo');
        expect(result.infrastructure.cost).toBe(0);
        expect(result.subtotal).toBe(89);
      });

      it('should calculate Hetzner infrastructure', () => {
        const result = billingService.calculatePricing('dedicated', {}, 'hetzner');

        expect(result.infrastructure.provider).toBe('hetzner');
        expect(result.infrastructure.cost).toBe(20);
        expect(result.subtotal).toBe(109); // 89 + 20
      });

      it('should calculate DigitalOcean infrastructure', () => {
        const result = billingService.calculatePricing('dedicated', {}, 'digitalocean');

        expect(result.infrastructure.provider).toBe('digitalocean');
        expect(result.infrastructure.cost).toBe(40);
        expect(result.subtotal).toBe(129); // 89 + 40
      });

      it('should calculate AWS infrastructure', () => {
        const result = billingService.calculatePricing('dedicated', {}, 'aws');

        expect(result.infrastructure.provider).toBe('aws');
        expect(result.infrastructure.cost).toBe(91);
        expect(result.subtotal).toBe(180); // 89 + 91
      });
    });

    describe('tax calculations', () => {
      it('should apply tax rate correctly', () => {
        const result = billingService.calculatePricing('dedicated', {}, 'contabo', 0.1);

        expect(result.subtotal).toBe(89);
        expect(result.tax).toBe(8.9);
        expect(result.total).toBe(97.9);
      });

      it('should handle zero tax rate', () => {
        const result = billingService.calculatePricing('dedicated', {}, 'contabo', 0);

        expect(result.tax).toBe(0);
        expect(result.total).toBe(result.subtotal);
      });

      it('should apply tax to subtotal including addons and infrastructure', () => {
        const result = billingService.calculatePricing(
          'pro',
          { ha: true, replicas: 2 },
          'hetzner',
          0.08
        );

        const expectedSubtotal = 129 + 99 + 30 + 20; // tier + ha + replicas + infra = 278
        const expectedTax = expectedSubtotal * 0.08; // 22.24
        const expectedTotal = expectedSubtotal + expectedTax; // 300.24

        expect(result.subtotal).toBe(expectedSubtotal);
        expect(result.tax).toBe(expectedTax);
        expect(result.total).toBe(expectedTotal);
      });
    });

    describe('transparent pricing calculations', () => {
      it('should calculate our cost at 60% of subtotal', () => {
        const result = billingService.calculatePricing('dedicated');

        expect(result.transparency.our_cost).toBe(53.4); // 89 * 0.6
        expect(result.transparency.our_markup).toBe(35.6); // 89 - 53.4
      });

      it('should calculate markup percentage correctly', () => {
        const result = billingService.calculatePricing('dedicated');

        // Markup % = (markup / our_cost) * 100 = (35.6 / 53.4) * 100 ≈ 66.67%
        expect(result.transparency.markup_percentage).toBeCloseTo(66.67, 1);
      });

      it('should round transparency values to 2 decimal places', () => {
        const result = billingService.calculatePricing('shared');

        // 49 * 0.6 = 29.4
        expect(result.transparency.our_cost).toBe(29.4);
        // 49 - 29.4 = 19.6
        expect(result.transparency.our_markup).toBe(19.6);
        // (19.6 / 29.4) * 100 ≈ 66.67
        expect(result.transparency.markup_percentage).toBeCloseTo(66.67, 2);
      });

      it('should maintain consistent margin across all tiers', () => {
        const tiers: Array<'shared' | 'dedicated' | 'pro' | 'enterprise'> = [
          'shared',
          'dedicated',
          'pro',
          'enterprise',
        ];

        for (const tier of tiers) {
          const result = billingService.calculatePricing(tier);

          // All should have ~66.67% markup
          expect(result.transparency.markup_percentage).toBeCloseTo(66.67, 1);

          // Our cost should be ~60% of subtotal
          const expectedCost = Math.round(result.subtotal * 0.6 * 100) / 100;
          expect(result.transparency.our_cost).toBe(expectedCost);
        }
      });

      it('should include addons in transparency calculations', () => {
        const result = billingService.calculatePricing('dedicated', { ha: true });

        const subtotal = 188; // 89 + 99
        const expectedCost = Math.round(subtotal * 0.6 * 100) / 100; // 112.8
        const expectedMarkup = Math.round((subtotal - expectedCost) * 100) / 100; // 75.2

        expect(result.transparency.our_cost).toBe(expectedCost);
        expect(result.transparency.our_markup).toBe(expectedMarkup);
      });
    });

    describe('complex pricing scenarios', () => {
      it('should handle enterprise with all addons and AWS infrastructure', () => {
        const result = billingService.calculatePricing(
          'enterprise',
          {
            ha: true,
            replicas: 5,
            vpn: true,
            compliance: true,
          },
          'aws',
          0.095 // 9.5% tax
        );

        // Breakdown:
        // - Enterprise tier: $149
        // - HA: $99
        // - 5 replicas: $75
        // - VPN: $15
        // - Compliance: $100
        // - AWS infra: $91
        // Subtotal: $529
        expect(result.subtotal).toBe(529);

        // Tax: $529 * 0.095 = $50.255
        expect(result.tax).toBeCloseTo(50.255, 2);

        // Total: $579.255
        expect(result.total).toBeCloseTo(579.255, 2);

        // Transparency
        expect(result.transparency.our_cost).toBe(317.4); // $529 * 0.6
        expect(result.transparency.our_markup).toBe(211.6); // $529 - $317.4
      });

      it('should handle minimum configuration', () => {
        const result = billingService.calculatePricing('shared', {}, 'contabo', 0);

        expect(result.subtotal).toBe(49);
        expect(result.tax).toBe(0);
        expect(result.total).toBe(49);
        expect(result.addons).toHaveLength(0);
        expect(result.infrastructure.cost).toBe(0);
      });
    });
  });

  describe('generateInvoice', () => {
    it('should create invoice with pricing breakdown', async () => {
      customerId = seedTestCustomer();
      const pricing = billingService.calculatePricing('dedicated', { ha: true });
      const start = new Date('2025-01-01');
      const end = new Date('2025-01-31T23:59:59');

      const invoice = await billingService.generateInvoice(customerId, pricing, start, end);

      expect(invoice.id).toBeDefined();
      expect(invoice.customer_id).toBe(customerId);
      expect(invoice.amount).toBe(188);
      expect(invoice.currency).toBe('USD');
      expect(invoice.status).toBe('pending');
      expect(invoice.billing_period_start).toBe('2025-01-01T00:00:00.000Z');
      expect(invoice.billing_period_end).toBe('2025-01-31T23:59:59.000Z');
      expect(invoice.line_items).toEqual(pricing);
      expect(invoice.created_at).toBeDefined();
    });

    it('should throw NotFoundError for non-existent customer', async () => {
      const pricing = billingService.calculatePricing('shared');
      const start = new Date('2025-01-01');
      const end = new Date('2025-01-31');

      await expect(
        billingService.generateInvoice(99999, pricing, start, end)
      ).rejects.toThrow(NotFoundError);
    });

    it('should create multiple invoices for same customer', async () => {
      customerId = seedTestCustomer();
      const pricing = billingService.calculatePricing('dedicated');

      const invoice1 = await billingService.generateInvoice(
        customerId,
        pricing,
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );

      const invoice2 = await billingService.generateInvoice(
        customerId,
        pricing,
        new Date('2025-02-01'),
        new Date('2025-02-28')
      );

      expect(invoice1.id).not.toBe(invoice2.id);
      expect(invoice1.customer_id).toBe(invoice2.customer_id);
    });

    it('should log activity when invoice is generated', async () => {
      customerId = seedTestCustomer();
      const db = getTestDb();
      const pricing = billingService.calculatePricing('pro');

      await billingService.generateInvoice(
        customerId,
        pricing,
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );

      // Check activity log
      const activity = db
        .prepare('SELECT * FROM activity_log WHERE customer_id = ? AND action = ?')
        .get(customerId, 'invoice_generated') as any;

      expect(activity).toBeDefined();
      expect(activity.resource_type).toBe('billing');

      const details = JSON.parse(activity.details);
      expect(details.amount).toBe(129);
    });
  });

  describe('createInvoice', () => {
    beforeEach(() => {
      customerId = seedTestCustomer();
    });

    it('should create invoice for valid billing period', async () => {
      const invoiceId = await billingService.createInvoice(customerId, '2025-01');

      expect(invoiceId).toBeGreaterThan(0);

      const invoice = await billingService.getBillingRecord(invoiceId);
      expect(invoice.customer_id).toBe(customerId);
      expect(invoice.amount).toBe(89); // Dedicated tier
      expect(invoice.billing_period_start).toBe('2025-01-01T00:00:00.000Z');
      expect(invoice.billing_period_end).toBe('2025-01-31T23:59:59.000Z');
    });

    it('should throw error for invalid billing period format', async () => {
      await expect(billingService.createInvoice(customerId, 'invalid')).rejects.toThrow(
        'Invalid billing period format'
      );
    });

    it('should throw error for invalid month', async () => {
      await expect(billingService.createInvoice(customerId, '2025-13')).rejects.toThrow(
        'Invalid billing period format'
      );

      await expect(billingService.createInvoice(customerId, '2025-00')).rejects.toThrow(
        'Invalid billing period format'
      );
    });

    it('should throw NotFoundError for non-existent customer', async () => {
      await expect(billingService.createInvoice(99999, '2025-01')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should handle different month lengths correctly', async () => {
      // February
      const febInvoiceId = await billingService.createInvoice(customerId, '2025-02');
      const febInvoice = await billingService.getBillingRecord(febInvoiceId);
      expect(febInvoice.billing_period_end).toBe('2025-02-28T23:59:59.000Z');

      // December
      const decInvoiceId = await billingService.createInvoice(customerId, '2025-12');
      const decInvoice = await billingService.getBillingRecord(decInvoiceId);
      expect(decInvoice.billing_period_end).toBe('2025-12-31T23:59:59.000Z');
    });
  });

  describe('getCustomerBilling', () => {
    beforeEach(() => {
      customerId = seedTestCustomer();
    });

    it('should return billing info for customer with no history', async () => {
      const billing = await billingService.getCustomerBilling(customerId);

      expect(billing.customer_id).toBe(customerId);
      expect(billing.tier).toBe('dedicated');
      expect(billing.monthly_amount).toBe(89);
      expect(billing.payment_method).toBeNull();
      expect(billing.billing_history).toHaveLength(0);
      expect(billing.next_billing_date).toBeDefined();

      // Should be ~30 days from now
      const nextDate = new Date(billing.next_billing_date!);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 30);

      expect(nextDate.getDate()).toBeCloseTo(expectedDate.getDate(), 0);
    });

    it('should return billing info with history', async () => {
      // Create some billing records
      await billingService.createInvoice(customerId, '2025-01');
      await billingService.createInvoice(customerId, '2025-02');

      const billing = await billingService.getCustomerBilling(customerId);

      expect(billing.billing_history).toHaveLength(2);
      expect(billing.billing_history[0].amount).toBe(89);
      expect(billing.billing_history[1].amount).toBe(89);
    });

    it('should calculate next billing date from last paid invoice', async () => {
      const db = getTestDb();

      // Create and pay an invoice
      const invoiceId = await billingService.createInvoice(customerId, '2025-01');
      await billingService.updateBillingStatus(invoiceId, 'paid');

      const billing = await billingService.getCustomerBilling(customerId);

      // Next billing should be day after period end (Feb 1)
      expect(billing.next_billing_date).toBe('2025-02-01T00:00:00.000Z');
    });

    it('should throw NotFoundError for non-existent customer', async () => {
      await expect(billingService.getCustomerBilling(99999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateBillingStatus', () => {
    let invoiceId: number;

    beforeEach(async () => {
      customerId = seedTestCustomer();
      invoiceId = await billingService.createInvoice(customerId, '2025-01');
    });

    it('should update status to paid', async () => {
      await billingService.updateBillingStatus(invoiceId, 'paid', 'in_123', 'pi_123');

      const invoice = await billingService.getBillingRecord(invoiceId);
      expect(invoice.status).toBe('paid');
      expect(invoice.stripe_invoice_id).toBe('in_123');
      expect(invoice.stripe_payment_intent_id).toBe('pi_123');
    });

    it('should update status to failed', async () => {
      await billingService.updateBillingStatus(invoiceId, 'failed');

      const invoice = await billingService.getBillingRecord(invoiceId);
      expect(invoice.status).toBe('failed');
    });

    it('should update status to refunded', async () => {
      await billingService.updateBillingStatus(invoiceId, 'refunded', 'in_123', 'pi_123');

      const invoice = await billingService.getBillingRecord(invoiceId);
      expect(invoice.status).toBe('refunded');
    });

    it('should not overwrite existing Stripe IDs if not provided', async () => {
      await billingService.updateBillingStatus(invoiceId, 'paid', 'in_original', 'pi_original');
      await billingService.updateBillingStatus(invoiceId, 'refunded');

      const invoice = await billingService.getBillingRecord(invoiceId);
      expect(invoice.stripe_invoice_id).toBe('in_original');
      expect(invoice.stripe_payment_intent_id).toBe('pi_original');
    });
  });

  describe('getPendingInvoices', () => {
    beforeEach(() => {
      customerId = seedTestCustomer();
    });

    it('should return empty array when no pending invoices', async () => {
      const pending = await billingService.getPendingInvoices();
      expect(pending).toHaveLength(0);
    });

    it('should return pending invoices', async () => {
      await billingService.createInvoice(customerId, '2025-01');
      await billingService.createInvoice(customerId, '2025-02');

      const pending = await billingService.getPendingInvoices();
      expect(pending).toHaveLength(2);
      expect(pending.every(inv => inv.status === 'pending')).toBe(true);
    });

    it('should not return paid invoices', async () => {
      const invoice1 = await billingService.createInvoice(customerId, '2025-01');
      await billingService.createInvoice(customerId, '2025-02');

      await billingService.updateBillingStatus(invoice1, 'paid');

      const pending = await billingService.getPendingInvoices();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).not.toBe(invoice1);
    });

    it('should order by created_at ascending', async () => {
      await billingService.createInvoice(customerId, '2025-01');
      await new Promise(resolve => setTimeout(resolve, 10));
      await billingService.createInvoice(customerId, '2025-02');

      const pending = await billingService.getPendingInvoices();

      expect(new Date(pending[0].created_at).getTime()).toBeLessThan(
        new Date(pending[1].created_at).getTime()
      );
    });
  });

  describe('calculateMRR', () => {
    it('should return zeros for no paid invoices', async () => {
      const mrr = await billingService.calculateMRR();

      expect(mrr.total_mrr).toBe(0);
      expect(mrr.active_customers).toBe(0);
      expect(mrr.average_revenue_per_customer).toBe(0);
    });

    it('should calculate MRR from paid invoices', async () => {
      customerId = seedTestCustomer();
      const invoice1 = await billingService.createInvoice(customerId, '2025-01');
      await billingService.updateBillingStatus(invoice1, 'paid');

      const mrr = await billingService.calculateMRR();

      expect(mrr.total_mrr).toBe(89);
      expect(mrr.active_customers).toBe(1);
      expect(mrr.average_revenue_per_customer).toBe(89);
    });

    it('should calculate MRR for multiple customers', async () => {
      customerId = seedTestCustomer();
      const [customer2Id] = seedCustomers([
        {
          company_name: 'Company 2',
          email: 'company2@example.com',
          tier: 'shared',
          status: 'active',
        },
      ]);

      const invoice1 = await billingService.createInvoice(customerId, '2025-01');
      const invoice2 = await billingService.createInvoice(customer2Id, '2025-01');

      await billingService.updateBillingStatus(invoice1, 'paid');
      await billingService.updateBillingStatus(invoice2, 'paid');

      const mrr = await billingService.calculateMRR();

      expect(mrr.total_mrr).toBe(138); // 89 + 49
      expect(mrr.active_customers).toBe(2);
      expect(mrr.average_revenue_per_customer).toBe(69); // 138 / 2
    });

    it('should not include pending or failed invoices', async () => {
      customerId = seedTestCustomer();
      const invoice1 = await billingService.createInvoice(customerId, '2025-01');
      await billingService.createInvoice(customerId, '2025-02');
      await billingService.updateBillingStatus(invoice1, 'paid');

      const mrr = await billingService.calculateMRR();

      expect(mrr.total_mrr).toBe(89);
      expect(mrr.active_customers).toBe(1);
    });

    it('should round values to 2 decimal places', async () => {
      customerId = seedTestCustomer();
      const [customer2Id] = seedCustomers([
        {
          company_name: 'Company 2',
          email: 'company2@example.com',
          tier: 'pro',
          status: 'active',
        },
      ]);
      const [customer3Id] = seedCustomers([
        {
          company_name: 'Company 3',
          email: 'company3@example.com',
          tier: 'shared',
          status: 'active',
        },
      ]);

      const invoice1 = await billingService.createInvoice(customerId, '2025-01');
      const invoice2 = await billingService.createInvoice(customer2Id, '2025-01');
      const invoice3 = await billingService.createInvoice(customer3Id, '2025-01');

      await billingService.updateBillingStatus(invoice1, 'paid');
      await billingService.updateBillingStatus(invoice2, 'paid');
      await billingService.updateBillingStatus(invoice3, 'paid');

      const mrr = await billingService.calculateMRR();

      // 89 + 129 + 49 = 267
      // 267 / 3 = 89
      expect(mrr.total_mrr).toBe(267);
      expect(mrr.active_customers).toBe(3);
      expect(mrr.average_revenue_per_customer).toBe(89);
    });
  });
});
