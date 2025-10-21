/**
 * API Routes Registration
 *
 * Central registration point for all API routes.
 * Organizes routes by feature/domain.
 *
 * @module api/routes
 */

import { Router } from 'express';
import { logger } from '../../utils/logger.js';

// Import route modules
import authRoutes from './auth.routes.js';
import intakeRoutes from './intake.routes.js';
import webhooksRoutes from './webhooks.routes.js';
import customersRoutes from './customers.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

/**
 * Health check route
 */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      intake: '/api/intake',
      webhooks: '/api/webhooks',
      customers: '/api/customers',
      admin: '/api/admin',
    },
  });
});

/**
 * Register route modules
 */

// Authentication routes (public - login, logout, token refresh)
router.use('/auth', authRoutes);

// Customer intake form (public)
router.use('/intake', intakeRoutes);

// Webhooks from external services (public, but signature-verified)
router.use('/webhooks', webhooksRoutes);

// Customer management (requires authentication)
router.use('/customers', customersRoutes);

// Administrative operations (requires admin authentication)
router.use('/admin', adminRoutes);

logger.info('API routes registered', {
  routes: ['/auth', '/intake', '/webhooks', '/customers', '/admin'],
});

export default router;
