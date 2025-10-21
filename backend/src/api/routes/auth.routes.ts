/**
 * Authentication Routes
 *
 * Provides login, logout, token refresh, and user info endpoints
 *
 * @module api/routes/auth
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../../services/auth.service.js';
import { authenticateJWT, requireActive } from '../middleware/auth.middleware.js';
import { logger } from '../../utils/logger.js';

const router = Router();

/**
 * Login Request Schema
 */
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

/**
 * Change Password Schema
 */
const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
});

/**
 * POST /api/auth/login
 *
 * Authenticate user with email and password
 * Returns JWT token on success
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: validation.error.issues
      });
    }

    const { email, password } = validation.data;

    // Attempt login
    const result = await authService.login(email, password);

    if (!result.success) {
      return res.status(401).json({
        error: result.error,
        message: result.message
      });
    }

    // Return token and user info
    res.json({
      success: true,
      token: result.token,
      user: result.user
    });

  } catch (error) {
    logger.error('Login endpoint error:', error);
    next(error);
  }
});

/**
 * POST /api/auth/logout
 *
 * Logout endpoint (JWT is stateless, so client just discards token)
 * Included for completeness and potential future refresh token implementation
 */
router.post('/logout', authenticateJWT, (req: Request, res: Response) => {
  logger.info(`User logged out: ${req.auth?.email}`);

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * GET /api/auth/me
 *
 * Get current authenticated user information
 */
router.get('/me', authenticateJWT, requireActive, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) {
      return res.status(401).json({
        error: 'Not authenticated'
      });
    }

    // Get full user info from database
    const user = authService.getUserById(parseInt(req.auth.sub));

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    logger.error('Get user info error:', error);
    next(error);
  }
});

/**
 * POST /api/auth/change-password
 *
 * Change current user's password
 */
router.post('/change-password', authenticateJWT, requireActive, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) {
      return res.status(401).json({
        error: 'Not authenticated'
      });
    }

    // Validate request body
    const validation = changePasswordSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: validation.error.issues
      });
    }

    const { oldPassword, newPassword } = validation.data;

    // Change password
    const result = await authService.changePassword(
      parseInt(req.auth.sub),
      oldPassword,
      newPassword
    );

    if (!result.success) {
      return res.status(400).json({
        error: result.error
      });
    }

    logger.info(`Password changed for user: ${req.auth.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.error('Change password error:', error);
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 *
 * Refresh JWT token (extends expiration)
 * Currently just generates a new token with same claims
 */
router.post('/refresh', authenticateJWT, requireActive, (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) {
      return res.status(401).json({
        error: 'Not authenticated'
      });
    }

    // Generate new token with extended expiration
    const newToken = authService.generateToken({
      sub: req.auth.sub,
      email: req.auth.email,
      role: req.auth.role
    });

    logger.info(`Token refreshed for user: ${req.auth.email}`);

    res.json({
      success: true,
      token: newToken
    });

  } catch (error) {
    logger.error('Token refresh error:', error);
    next(error);
  }
});

export default router;
