/**
 * Webhooks Routes
 *
 * Routes for handling webhook events from external services.
 * Uses raw body parser for signature verification.
 *
 * @module api/routes/webhooks
 */

import { Router } from 'express';
import { handleStripeWebhook, handleGitHubWebhook } from '../controllers/webhook.controller.js';
import { logger } from '../../utils/logger.js';

const router = Router();

/**
 * POST /api/webhooks/stripe
 *
 * Handle Stripe webhook events
 *
 * IMPORTANT: This route requires raw body for signature verification.
 * The Express app must be configured with express.raw() middleware
 * for webhook routes before express.json() middleware.
 *
 * No rate limiting - webhooks should always be accepted
 */
router.post('/stripe', handleStripeWebhook);

/**
 * POST /api/webhooks/github
 *
 * Handle GitHub webhook events
 *
 * No rate limiting - webhooks should always be accepted
 */
router.post('/github', handleGitHubWebhook);

/**
 * GET /api/webhooks/health
 *
 * Health check for webhook endpoints
 */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Webhook endpoints are operational',
    endpoints: {
      stripe: '/api/webhooks/stripe',
      github: '/api/webhooks/github',
    },
  });
});

logger.info('Webhook routes registered');

export default router;
