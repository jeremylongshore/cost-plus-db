/**
 * Admin Routes
 *
 * Routes for administrative operations including customer approval,
 * database provisioning, and dashboard statistics.
 * All routes require admin authentication.
 *
 * @module api/routes/admin
 */

import { Router } from 'express';
import {
  approveCustomer,
  sendPaymentLink,
  provisionDatabase,
  getDashboard,
  getActivityLog,
  suspendCustomer,
  reactivateCustomer,
} from '../controllers/admin.controller.js';
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
 * Apply authentication and authorization to all admin routes
 */
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/dashboard
 *
 * Get admin dashboard statistics including:
 * - Total customers
 * - Customers by status
 * - MRR (Monthly Recurring Revenue)
 * - Active databases
 * - Open support tickets
 */
router.get('/dashboard', getDashboard);

/**
 * GET /api/admin/activity
 *
 * Get recent activity log
 *
 * Query parameters:
 * - limit: Number of records (default: 50)
 * - offset: Pagination offset (default: 0)
 */
router.get('/activity', getActivityLog);

/**
 * POST /api/admin/customers/:id/approve
 *
 * Approve customer and move to provisioning
 *
 * Workflow:
 * 1. Verify customer is in 'consultation' status
 * 2. Update status to 'approved'
 * 3. Calculate transparent pricing
 * 4. Create Stripe payment link
 * 5. Send payment request email
 */
router.post('/customers/:id/approve', approveCustomer);

/**
 * POST /api/admin/customers/:id/send-payment-link
 *
 * Send payment link to customer
 *
 * Workflow:
 * 1. Verify customer is in 'approved' status
 * 2. Generate Stripe payment link with transparent pricing
 * 3. Send payment link email to customer
 * 4. Log payment link sent event
 */
router.post('/customers/:id/send-payment-link', sendPaymentLink);

/**
 * POST /api/admin/customers/:id/provision
 *
 * Provision database for customer
 *
 * Workflow:
 * 1. Verify customer is in 'approved' status
 * 2. Update status to 'provisioning'
 * 3. Trigger database provisioning workflow
 * 4. Create database credentials
 * 5. Configure backups
 * 6. Update status to 'active'
 * 7. Send connection details email
 */
router.post('/customers/:id/provision', provisionDatabase);

/**
 * POST /api/admin/customers/:id/suspend
 *
 * Suspend customer service (typically due to payment issues)
 *
 * Body:
 * - reason: Reason for suspension (optional)
 */
router.post('/customers/:id/suspend', suspendCustomer);

/**
 * POST /api/admin/customers/:id/reactivate
 *
 * Reactivate suspended customer service
 */
router.post('/customers/:id/reactivate', reactivateCustomer);

logger.info('Admin routes registered');

export default router;
