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

const router = Router();

/**
 * API routes will be registered here
 *
 * TODO: Import and register route modules:
 * - import intakeRoutes from './intake.routes.js';
 * - import webhooksRoutes from './webhooks.routes.js';
 * - import customersRoutes from './customers.routes.js';
 */

// Health check route (already defined in app.ts, but here for API versioning)
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * TODO: Register route modules
 *
 * Example:
 * router.use('/intake', intakeRoutes);
 * router.use('/webhooks', webhooksRoutes);
 * router.use('/customers', customersRoutes);
 */

logger.info('API routes registered');

export default router;
