/**
 * Customer Service
 *
 * Business logic for customer operations including:
 * - Customer intake processing
 * - Customer approval and provisioning workflows
 * - Customer lifecycle management
 *
 * @module services/customer
 */

import { CustomersRepository } from '../database/repositories/customers.repository.js';
import { Customer, CustomerCreateInput, CustomerStatus } from '../database/schema.js';
import { ConflictError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Customer intake form data
 */
export interface IntakeFormData extends CustomerCreateInput {
  // Additional fields from intake form that aren't in database
  business_description?: string;
  expected_traffic?: string;
  compliance_requirements?: string;
}

/**
 * Customer onboarding result
 */
export interface CustomerOnboarding {
  customer_id: number;
  status: CustomerStatus;
  next_step: string;
  message: string;
}

/**
 * Customer service class
 */
export class CustomerService {
  constructor(
    private customersRepo: CustomersRepository
    // TODO: Add EmailService, StripeService when implemented
  ) {}

  /**
   * Process customer intake form submission
   *
   * Workflow:
   * 1. Validate no duplicate email
   * 2. Create customer record with 'prospect' status
   * 3. Send confirmation email to customer
   * 4. Send notification to admin
   * 5. Return onboarding status
   */
  async processIntakeForm(formData: IntakeFormData): Promise<CustomerOnboarding> {
    logger.info('Processing customer intake form', { email: formData.email });

    // Check for existing customer
    const existing = await this.customersRepo.findByEmail(formData.email);
    if (existing) {
      throw new ConflictError(`Customer with email ${formData.email} already exists`);
    }

    // Create customer record
    const customer = await this.customersRepo.create({
      company_name: formData.company_name,
      email: formData.email,
      tier: formData.tier,
      status: 'prospect',
      contact_name: formData.contact_name || null,
      phone: formData.phone || null,
      website: formData.website || null,
    });

    logger.info('Customer created', { customerId: customer.id });

    // TODO: Send confirmation email to customer
    // await this.emailService.sendIntakeConfirmation(customer);

    // TODO: Send internal notification
    // await this.emailService.sendInternalNotification('New customer intake', customer);

    // TODO: Log activity
    // await this.activityLog.log('customer_created', customer.id, 'system');

    return {
      customer_id: customer.id,
      status: 'prospect',
      next_step: 'consultation',
      message: 'Thank you! We will contact you within 2 hours to schedule a consultation.',
    };
  }

  /**
   * Approve customer and move to provisioning
   *
   * Workflow:
   * 1. Update status to 'approved'
   * 2. Calculate transparent pricing
   * 3. Create Stripe payment link
   * 4. Send payment request email
   */
  async approveCustomer(customerId: number): Promise<void> {
    logger.info('Approving customer', { customerId });

    const customer = await this.customersRepo.findById(customerId);

    if (customer.status !== 'consultation') {
      throw new ConflictError(`Customer must be in consultation status to approve`);
    }

    // Update status
    await this.customersRepo.updateStatus(customerId, 'approved');

    // TODO: Calculate pricing based on tier and addons
    // TODO: Create Stripe payment link
    // TODO: Send payment request email

    logger.info('Customer approved', { customerId });
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: number): Promise<Customer> {
    return this.customersRepo.findById(customerId);
  }

  /**
   * List customers with optional filters
   */
  async listCustomers(filters?: {
    status?: CustomerStatus;
    tier?: string;
    page?: number;
    limit?: number;
  }): Promise<{ customers: Customer[]; total: number }> {
    const limit = filters?.limit || 50;
    const page = filters?.page || 1;
    const offset = (page - 1) * limit;

    const customers = await this.customersRepo.list({
      ...(filters?.status && { status: filters.status }),
      ...(filters?.tier && { tier: filters.tier }),
      limit,
      offset,
    });

    const total = await this.customersRepo.count(filters?.status);

    return { customers, total };
  }

  /**
   * Update customer information
   */
  async updateCustomer(
    customerId: number,
    updates: Partial<Customer>
  ): Promise<Customer> {
    logger.info('Updating customer', { customerId, updates });

    // Validate customer exists
    await this.customersRepo.findById(customerId);

    // Perform update
    const updated = await this.customersRepo.update(customerId, updates);

    logger.info('Customer updated', { customerId });
    return updated;
  }

  /**
   * Delete customer
   *
   * WARNING: This is a destructive operation that should only be used
   * for test accounts or GDPR compliance requests.
   */
  async deleteCustomer(customerId: number): Promise<void> {
    logger.warn('Deleting customer', { customerId });

    // Validate customer exists
    await this.customersRepo.findById(customerId);

    // TODO: Check if customer has active databases
    // TODO: Prevent deletion if active services exist

    await this.customersRepo.delete(customerId);

    logger.warn('Customer deleted', { customerId });
  }

  /**
   * Get customer statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<CustomerStatus, number>;
  }> {
    const statuses: CustomerStatus[] = [
      'prospect',
      'consultation',
      'approved',
      'provisioning',
      'active',
      'suspended',
      'churned',
    ];

    const total = await this.customersRepo.count();
    const byStatus: Partial<Record<CustomerStatus, number>> = {};

    for (const status of statuses) {
      byStatus[status] = await this.customersRepo.count(status);
    }

    return {
      total,
      byStatus: byStatus as Record<CustomerStatus, number>,
    };
  }
}
