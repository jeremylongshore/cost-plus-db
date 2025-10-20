/**
 * Unit Tests - Customer Service
 *
 * Tests for customer service business logic including:
 * - Customer intake form processing
 * - Customer approval workflow
 * - Customer CRUD operations
 * - Statistics and reporting
 *
 * @module tests/unit/services/customer.service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CustomerService } from '../../../src/services/customer.service.js';
import { CustomersRepository } from '../../../src/database/repositories/customers.repository.js';
import { ConflictError, NotFoundError } from '../../../src/utils/errors.js';
import { getTestDb } from '../../setup.js';
import { sampleCustomers, sampleIntakeForms } from '../../fixtures/customers.js';

describe('CustomerService', () => {
  let customerService: CustomerService;
  let customersRepo: CustomersRepository;

  beforeEach(() => {
    const db = getTestDb();
    customersRepo = new CustomersRepository(db);
    customerService = new CustomerService(customersRepo);
  });

  describe('processIntakeForm', () => {
    it('should create a new customer from intake form', async () => {
      const formData = sampleIntakeForms[0];

      const result = await customerService.processIntakeForm(formData);

      expect(result).toMatchObject({
        customer_id: expect.any(Number),
        status: 'prospect',
        next_step: 'consultation',
        message: expect.stringContaining('Thank you'),
      });

      // Verify customer was created in database
      const customer = await customersRepo.findById(result.customer_id);
      expect(customer.email).toBe(formData.email);
      expect(customer.company_name).toBe(formData.company_name);
      expect(customer.tier).toBe(formData.tier);
      expect(customer.status).toBe('prospect');
    });

    it('should throw ConflictError for duplicate email', async () => {
      const formData = sampleIntakeForms[0];

      // Create first customer
      await customerService.processIntakeForm(formData);

      // Try to create duplicate
      await expect(customerService.processIntakeForm(formData)).rejects.toThrow(ConflictError);
      await expect(customerService.processIntakeForm(formData)).rejects.toThrow(
        `Customer with email ${formData.email} already exists`
      );
    });

    it('should handle form with all optional fields', async () => {
      const formData = {
        ...sampleIntakeForms[0],
        contact_name: 'Full Name',
        phone: '+1-555-1234',
        website: 'https://example.com',
      };

      const result = await customerService.processIntakeForm(formData);

      const customer = await customersRepo.findById(result.customer_id);
      expect(customer.contact_name).toBe('Full Name');
      expect(customer.phone).toBe('+1-555-1234');
      expect(customer.website).toBe('https://example.com');
    });

    it('should handle form with missing optional fields', async () => {
      const formData = {
        company_name: 'Minimal Company',
        email: 'minimal@example.com',
        tier: 'shared' as const,
        status: 'prospect' as const,
      };

      const result = await customerService.processIntakeForm(formData);

      const customer = await customersRepo.findById(result.customer_id);
      expect(customer.contact_name).toBeNull();
      expect(customer.phone).toBeNull();
      expect(customer.website).toBeNull();
    });

    it('should set correct initial status as prospect', async () => {
      const formData = sampleIntakeForms[0];

      const result = await customerService.processIntakeForm(formData);

      const customer = await customersRepo.findById(result.customer_id);
      expect(customer.status).toBe('prospect');
    });
  });

  describe('approveCustomer', () => {
    it('should approve customer in consultation status', async () => {
      // Create customer in consultation status
      const customer = await customersRepo.create({
        company_name: 'Test Company',
        email: 'test@example.com',
        tier: 'dedicated',
        status: 'consultation',
        contact_name: null,
        phone: null,
        website: null,
      });

      await customerService.approveCustomer(customer.id);

      const updated = await customersRepo.findById(customer.id);
      expect(updated.status).toBe('approved');
    });

    it('should throw ConflictError for customer not in consultation status', async () => {
      const customer = await customersRepo.create({
        company_name: 'Test Company',
        email: 'test@example.com',
        tier: 'dedicated',
        status: 'prospect',
        contact_name: null,
        phone: null,
        website: null,
      });

      await expect(customerService.approveCustomer(customer.id)).rejects.toThrow(ConflictError);
      await expect(customerService.approveCustomer(customer.id)).rejects.toThrow(
        'Customer must be in consultation status to approve'
      );
    });

    it('should throw NotFoundError for non-existent customer', async () => {
      await expect(customerService.approveCustomer(99999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getCustomer', () => {
    it('should retrieve customer by ID', async () => {
      const created = await customersRepo.create({
        company_name: 'Test Company',
        email: 'test@example.com',
        tier: 'dedicated',
        status: 'prospect',
        contact_name: null,
        phone: null,
        website: null,
      });

      const customer = await customerService.getCustomer(created.id);

      expect(customer).toMatchObject({
        id: created.id,
        company_name: 'Test Company',
        email: 'test@example.com',
      });
    });

    it('should throw NotFoundError for non-existent customer', async () => {
      await expect(customerService.getCustomer(99999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('listCustomers', () => {
    beforeEach(async () => {
      // Create multiple customers with different statuses and tiers
      await customersRepo.create({
        company_name: 'Company A',
        email: 'a@example.com',
        tier: 'shared',
        status: 'prospect',
        contact_name: null,
        phone: null,
        website: null,
      });

      await customersRepo.create({
        company_name: 'Company B',
        email: 'b@example.com',
        tier: 'dedicated',
        status: 'active',
        contact_name: null,
        phone: null,
        website: null,
      });

      await customersRepo.create({
        company_name: 'Company C',
        email: 'c@example.com',
        tier: 'pro',
        status: 'active',
        contact_name: null,
        phone: null,
        website: null,
      });
    });

    it('should list all customers without filters', async () => {
      const result = await customerService.listCustomers();

      expect(result.customers).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should filter customers by status', async () => {
      const result = await customerService.listCustomers({ status: 'active' });

      expect(result.customers).toHaveLength(2);
      expect(result.customers.every((c) => c.status === 'active')).toBe(true);
    });

    it('should filter customers by tier', async () => {
      const result = await customerService.listCustomers({ tier: 'dedicated' });

      expect(result.customers).toHaveLength(1);
      expect(result.customers[0].tier).toBe('dedicated');
    });

    it('should paginate results', async () => {
      const page1 = await customerService.listCustomers({ page: 1, limit: 2 });
      expect(page1.customers).toHaveLength(2);

      const page2 = await customerService.listCustomers({ page: 2, limit: 2 });
      expect(page2.customers).toHaveLength(1);
    });

    it('should use default pagination values', async () => {
      const result = await customerService.listCustomers();

      expect(result.customers.length).toBeLessThanOrEqual(50); // Default limit
    });
  });

  describe('updateCustomer', () => {
    it('should update customer information', async () => {
      const customer = await customersRepo.create({
        company_name: 'Old Name',
        email: 'test@example.com',
        tier: 'shared',
        status: 'prospect',
        contact_name: null,
        phone: null,
        website: null,
      });

      const updated = await customerService.updateCustomer(customer.id, {
        company_name: 'New Name',
        contact_name: 'John Doe',
      });

      expect(updated.company_name).toBe('New Name');
      expect(updated.contact_name).toBe('John Doe');
      expect(updated.email).toBe('test@example.com'); // Unchanged
    });

    it('should throw NotFoundError for non-existent customer', async () => {
      await expect(
        customerService.updateCustomer(99999, { company_name: 'New Name' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should allow partial updates', async () => {
      const customer = await customersRepo.create({
        company_name: 'Test Company',
        email: 'test@example.com',
        tier: 'shared',
        status: 'prospect',
        contact_name: 'Original Name',
        phone: '+1-555-0000',
        website: null,
      });

      const updated = await customerService.updateCustomer(customer.id, {
        phone: '+1-555-9999',
      });

      expect(updated.phone).toBe('+1-555-9999');
      expect(updated.contact_name).toBe('Original Name'); // Unchanged
      expect(updated.company_name).toBe('Test Company'); // Unchanged
    });
  });

  describe('deleteCustomer', () => {
    it('should delete customer', async () => {
      const customer = await customersRepo.create({
        company_name: 'Test Company',
        email: 'test@example.com',
        tier: 'shared',
        status: 'prospect',
        contact_name: null,
        phone: null,
        website: null,
      });

      await customerService.deleteCustomer(customer.id);

      await expect(customersRepo.findById(customer.id)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for non-existent customer', async () => {
      await expect(customerService.deleteCustomer(99999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getStatistics', () => {
    beforeEach(async () => {
      // Create customers with various statuses
      await customersRepo.create({
        company_name: 'Company A',
        email: 'a@example.com',
        tier: 'shared',
        status: 'prospect',
        contact_name: null,
        phone: null,
        website: null,
      });

      await customersRepo.create({
        company_name: 'Company B',
        email: 'b@example.com',
        tier: 'dedicated',
        status: 'prospect',
        contact_name: null,
        phone: null,
        website: null,
      });

      await customersRepo.create({
        company_name: 'Company C',
        email: 'c@example.com',
        tier: 'pro',
        status: 'active',
        contact_name: null,
        phone: null,
        website: null,
      });

      await customersRepo.create({
        company_name: 'Company D',
        email: 'd@example.com',
        tier: 'enterprise',
        status: 'active',
        contact_name: null,
        phone: null,
        website: null,
      });
    });

    it('should return correct total count', async () => {
      const stats = await customerService.getStatistics();

      expect(stats.total).toBe(4);
    });

    it('should return correct counts by status', async () => {
      const stats = await customerService.getStatistics();

      expect(stats.byStatus.prospect).toBe(2);
      expect(stats.byStatus.active).toBe(2);
      expect(stats.byStatus.consultation).toBe(0);
      expect(stats.byStatus.approved).toBe(0);
      expect(stats.byStatus.provisioning).toBe(0);
      expect(stats.byStatus.suspended).toBe(0);
      expect(stats.byStatus.churned).toBe(0);
    });

    it('should return zero counts for empty database', async () => {
      // Clear all customers
      const db = getTestDb();
      db.exec('DELETE FROM customers');

      const stats = await customerService.getStatistics();

      expect(stats.total).toBe(0);
      expect(stats.byStatus.prospect).toBe(0);
      expect(stats.byStatus.active).toBe(0);
    });
  });
});
