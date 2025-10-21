/**
 * Authentication Middleware
 *
 * Uses express-jwt for JWT validation (battle-tested library with millions of downloads)
 * Uses jsonwebtoken for token generation
 *
 * @module api/middleware/auth
 */

import { expressjwt as jwt, GetVerificationKey } from 'express-jwt';
import { Request, Response, NextFunction } from 'express';
import { config } from '../../config/index.js';
import Database from 'better-sqlite3';

/**
 * JWT Payload Interface
 */
export interface JWTPayload {
  sub: string;      // User ID
  email: string;
  role: 'admin' | 'super_admin';
  iat: number;      // Issued at
  exp: number;      // Expires at
}

/**
 * Extend Express Request to include user from JWT
 */
declare global {
  namespace Express {
    interface Request {
      auth?: JWTPayload;
    }
  }
}

/**
 * JWT Authentication Middleware
 *
 * Uses express-jwt to validate JWT tokens from Authorization header
 */
export const authenticateJWT = jwt({
  secret: config.JWT_SECRET,
  algorithms: ['HS256'],
  requestProperty: 'auth',
  getToken: (req) => {
    // Extract token from Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }
});

/**
 * Require specific role
 *
 * Must be used AFTER authenticateJWT middleware
 */
export const requireRole = (requiredRole: 'admin' | 'super_admin') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No valid JWT token found'
      });
    }

    // Super admin has access to everything
    if (req.auth.role === 'super_admin') {
      return next();
    }

    // Check if user has required role
    if (req.auth.role !== requiredRole) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This endpoint requires ${requiredRole} role`,
        yourRole: req.auth.role
      });
    }

    next();
  };
};

/**
 * Verify user is active (not suspended/locked)
 *
 * Must be used AFTER authenticateJWT middleware
 */
export const requireActive = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.auth) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  try {
    // Check database for user status
    const dbPath = config.DATABASE_URL.replace('file:', '');
    const db = new Database(dbPath);

    const user = db.prepare(`
      SELECT is_active, locked_until
      FROM admin_users
      WHERE id = ?
    `).get(req.auth.sub);

    db.close();

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        message: 'Your account no longer exists'
      });
    }

    // Check if account is active
    if (user.is_active === 0) {
      return res.status(403).json({
        error: 'Account suspended',
        message: 'Your account has been suspended. Contact support.'
      });
    }

    // Check if account is locked
    if (user.locked_until) {
      const lockedUntil = new Date(user.locked_until);
      if (lockedUntil > new Date()) {
        return res.status(403).json({
          error: 'Account locked',
          message: `Account locked until ${lockedUntil.toISOString()}`,
          lockedUntil: lockedUntil.toISOString()
        });
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication
 *
 * Validates JWT if present, but doesn't require it
 * Useful for endpoints that work differently for authenticated users
 */
export const optionalAuth = jwt({
  secret: config.JWT_SECRET,
  algorithms: ['HS256'],
  requestProperty: 'auth',
  credentialsRequired: false,
  getToken: (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }
});
