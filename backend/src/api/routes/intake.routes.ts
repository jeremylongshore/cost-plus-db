/**
 * Intake Routes
 *
 * Routes for customer intake form submission and schema retrieval.
 * Includes rate limiting to prevent abuse.
 *
 * @module api/routes/intake
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  handleIntakeSubmission,
  getIntakeFormSchema,
} from '../controllers/intake.controller.js';
import { logger } from '../../utils/logger.js';

const router = Router();

/**
 * Rate limiter for intake form submissions
 *
 * Limits to 10 submissions per hour per IP address
 * to prevent spam and abuse.
 */
const intakeRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many intake form submissions. Please try again later.',
    },
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Intake rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many intake form submissions. Please try again in an hour.',
      },
    });
  },
});

/**
 * POST /api/intake
 *
 * Submit customer intake form
 * Rate limited to 10 submissions per hour per IP
 */
router.post('/', intakeRateLimiter, handleIntakeSubmission);

/**
 * GET /api/intake/schema
 *
 * Get intake form schema for client-side validation
 * No rate limiting (read-only)
 */
router.get('/schema', getIntakeFormSchema);

export default router;
