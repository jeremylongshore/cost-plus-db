/**
 * Customer Routes
 *
 * Routes for customer CRUD operations.
 * All routes require admin authentication.
 *
 * @module api/routes/customers
 */

import { Router } from 'express';
import {
  listCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStats,
  searchCustomers,
} from '../controllers/customer.controller.js';
import { logger } from '../../utils/logger.js';

const router = Router();

/**
 * Authentication middleware placeholder
 *
 * TODO: Implement proper authentication middleware
 * - Verify JWT token
 * - Check admin role
 * - Attach user to req object
 */
const requireAuth = (_req: any, _res: any, next: any) => {
  // TODO: Implement authentication
  // For now, allow all requests (development only)
  next();
};

/**
 * Admin role middleware placeholder
 *
 * TODO: Implement role-based access control
 */
const requireAdmin = (_req: any, _res: any, next: any) => {
  // TODO: Implement admin check
  // For now, allow all requests (development only)
  next();
};

/**
 * Apply authentication and authorization to all customer routes
 */
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/customers
 *
 * List customers with filtering, pagination, and sorting
 *
 * Query parameters:
 * - status: Filter by customer status
 * - tier: Filter by pricing tier
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 100)
 * - sort_by: Sort field (created_at, updated_at, company_name)
 * - sort_order: Sort direction (asc, desc)
 * - search: Search by company name or email
 */
router.get('/', listCustomers);

/**
 * GET /api/customers/stats
 *
 * Get customer statistics (must be before /:id route)
 */
router.get('/stats', getCustomerStats);

/**
 * GET /api/customers/search
 *
 * Search customers by company name or email
 */
router.get('/search', searchCustomers);

/**
 * GET /api/customers/:id
 *
 * Get customer by ID
 */
router.get('/:id', getCustomer);

/**
 * PATCH /api/customers/:id
 *
 * Update customer
 *
 * Body: CustomerUpdateData
 */
router.patch('/:id', updateCustomer);

/**
 * DELETE /api/customers/:id
 *
 * Delete customer
 *
 * WARNING: Destructive operation
 * Only for test accounts or GDPR compliance
 */
router.delete('/:id', deleteCustomer);

logger.info('Customer routes registered');

export default router;
