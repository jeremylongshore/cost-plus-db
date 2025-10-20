/**
 * Customer Controller
 *
 * Handles CRUD operations for customers including listing,
 * retrieval, updates, and deletion.
 *
 * @module api/controllers/customer
 */

import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../../services/customer.service.js';
import { CustomersRepository } from '../../database/repositories/customers.repository.js';
import { Customer } from '../../database/schema.js';
import {
  validateCustomerUpdate,
  validateCustomerListFilters,
  validateStatusTransition,
} from '../../validators/customer.validator.js';
import { logger } from '../../utils/logger.js';
import { ValidationError, ForbiddenError } from '../../utils/errors.js';
import { getLocalDb } from '../../database/index.js';

/**
 * List customers with filtering, pagination, and sorting
 *
 * GET /api/customers
 *
 * Query parameters:
 * - status: Filter by customer status
 * - tier: Filter by pricing tier
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 100)
 * - sort_by: Sort field (created_at, updated_at, company_name)
 * - sort_order: Sort direction (asc, desc)
 * - search: Search by company name or email
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export async function listCustomers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate query parameters
    const filters = validateCustomerListFilters(req.query);

    logger.info('Listing customers', { filters });

    // Initialize services
    const customersRepo = new CustomersRepository(getLocalDb());
    const customerService = new CustomerService(customersRepo);

    // Get customers
    // Build filter object conditionally to avoid undefined values (TypeScript exactOptionalPropertyTypes)
    const listFilters: any = {
      page: filters.page,
      limit: filters.limit,
    };
    if (filters.status) listFilters.status = filters.status;
    if (filters.tier) listFilters.tier = filters.tier;

    const { customers, total } = await customerService.listCustomers(listFilters);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / filters.limit);

    res.json({
      success: true,
      data: customers,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages,
        hasNextPage: filters.page < totalPages,
        hasPrevPage: filters.page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get customer by ID
 *
 * GET /api/customers/:id
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export async function getCustomer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const customerIdStr = req.params.id;
    if (!customerIdStr) {
      throw new ValidationError("Customer ID is required");
    }

    const customerId = parseInt(customerIdStr, 10);

    if (isNaN(customerId)) {
      throw new ValidationError('Invalid customer ID');
    }

    logger.info('Getting customer', { customerId });

    // Initialize services
    const customersRepo = new CustomersRepository(getLocalDb());
    const customerService = new CustomerService(customersRepo);

    // Get customer
    const customer = await customerService.getCustomer(customerId);

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update customer
 *
 * PUT /api/customers/:id
 *
 * Validates updates and handles special cases like status transitions
 * and tier changes.
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export async function updateCustomer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const customerIdStr = req.params.id;
    if (!customerIdStr) {
      throw new ValidationError("Customer ID is required");
    }

    const customerId = parseInt(customerIdStr, 10);

    if (isNaN(customerId)) {
      throw new ValidationError('Invalid customer ID');
    }

    // Validate update data
    const updates = validateCustomerUpdate(req.body);

    logger.info('Updating customer', { customerId, updates });

    // Initialize services
    const customersRepo = new CustomersRepository(getLocalDb());
    const customerService = new CustomerService(customersRepo);

    // Get current customer for validation
    const currentCustomer = await customerService.getCustomer(customerId);

    // Validate status transition if status is being changed
    if (updates.status && updates.status !== currentCustomer.status) {
      const transition = validateStatusTransition(
        currentCustomer.status,
        updates.status
      );

      if (!transition.valid) {
        throw new ValidationError(transition.error || 'Invalid status transition');
      }
    }

    // Perform update (filter out undefined values)
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    ) as Partial<Customer>;

    const updatedCustomer = await customerService.updateCustomer(customerId, filteredUpdates);

    logger.info('Customer updated successfully', { customerId });

    res.json({
      success: true,
      data: updatedCustomer,
      message: 'Customer updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete customer
 *
 * DELETE /api/customers/:id
 *
 * WARNING: This is a destructive operation that should only be used
 * for test accounts or GDPR compliance requests.
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export async function deleteCustomer(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const customerIdStr = req.params.id;
    if (!customerIdStr) {
      throw new ValidationError("Customer ID is required");
    }

    const customerId = parseInt(customerIdStr, 10);

    if (isNaN(customerId)) {
      throw new ValidationError('Invalid customer ID');
    }

    logger.warn('Deleting customer', { customerId });

    // Initialize services
    const customersRepo = new CustomersRepository(getLocalDb());
    const customerService = new CustomerService(customersRepo);

    // Get customer to check if deletion is allowed
    const customer = await customerService.getCustomer(customerId);

    // Prevent deletion of active customers with running databases
    if (customer.status === 'active') {
      throw new ForbiddenError(
        'Cannot delete active customer. Please suspend or cancel services first.'
      );
    }

    // Perform deletion
    await customerService.deleteCustomer(customerId);

    logger.warn('Customer deleted successfully', { customerId });

    res.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get customer statistics
 *
 * GET /api/customers/stats
 *
 * Returns aggregate statistics about customers.
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export async function getCustomerStats(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    logger.info('Getting customer statistics');

    // Initialize services
    const customersRepo = new CustomersRepository(getLocalDb());
    const customerService = new CustomerService(customersRepo);

    // Get statistics
    const stats = await customerService.getStatistics();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Search customers
 *
 * GET /api/customers/search
 *
 * Search customers by company name or email.
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export async function searchCustomers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const searchQuery = req.query.q as string;

    if (!searchQuery || searchQuery.trim().length < 2) {
      throw new ValidationError('Search query must be at least 2 characters');
    }

    logger.info('Searching customers', { query: searchQuery });

    // Initialize repository
    const customersRepo = new CustomersRepository(getLocalDb());

    // Search by email
    const byEmail = await customersRepo.findByEmail(searchQuery);

    // TODO: Add full-text search by company name
    // For now, return email match only
    const results = byEmail ? [byEmail] : [];

    res.json({
      success: true,
      data: results,
      query: searchQuery,
    });
  } catch (error) {
    next(error);
  }
}
