/**
 * Authentication Service
 *
 * Uses battle-tested libraries:
 * - jsonwebtoken: JWT creation and verification (27M+ downloads/week)
 * - argon2: Password hashing (1M+ downloads/week, recommended by OWASP)
 *
 * @module services/auth
 */

import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import Database from 'better-sqlite3';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Login Response Interface
 */
export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
  error?: string;
  message?: string;
}

/**
 * Admin User Interface
 */
interface AdminUser {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'super_admin';
  is_active: number;
  failed_login_attempts: number;
  locked_until: string | null;
}

/**
 * Authentication Service
 */
export class AuthService {
  private dbPath: string;

  constructor() {
    this.dbPath = config.DATABASE_URL.replace('file:', '');
  }

  /**
   * Login with email and password
   *
   * Uses Argon2 for password verification (OWASP recommended)
   * Returns JWT token on success
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const db = new Database(this.dbPath);

    try {
      // Find user by email
      const user = db.prepare(`
        SELECT id, email, password_hash, name, role, is_active,
               failed_login_attempts, locked_until
        FROM admin_users
        WHERE email = ?
      `).get(email) as AdminUser | undefined;

      if (!user) {
        logger.warn(`Login attempt with non-existent email: ${email}`);
        return {
          success: false,
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        };
      }

      // Check if account is locked
      if (user.locked_until) {
        const lockedUntil = new Date(user.locked_until);
        if (lockedUntil > new Date()) {
          logger.warn(`Login attempt on locked account: ${email}`);
          return {
            success: false,
            error: 'Account locked',
            message: `Account locked until ${lockedUntil.toISOString()}`
          };
        }
      }

      // Check if account is active
      if (user.is_active === 0) {
        logger.warn(`Login attempt on inactive account: ${email}`);
        return {
          success: false,
          error: 'Account inactive',
          message: 'Your account has been suspended. Contact support.'
        };
      }

      // Verify password using Argon2
      const isValidPassword = await argon2.verify(user.password_hash, password);

      if (!isValidPassword) {
        // Increment failed login attempts
        const newAttempts = user.failed_login_attempts + 1;
        let lockedUntil = null;

        // Lock account after 5 failed attempts (30 minutes)
        if (newAttempts >= 5) {
          lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
          logger.warn(`Account locked due to failed login attempts: ${email}`);
        }

        db.prepare(`
          UPDATE admin_users
          SET failed_login_attempts = ?,
              locked_until = ?
          WHERE id = ?
        `).run(newAttempts, lockedUntil, user.id);

        return {
          success: false,
          error: 'Invalid credentials',
          message: newAttempts >= 5
            ? 'Account locked due to too many failed login attempts'
            : 'Email or password is incorrect'
        };
      }

      // Reset failed login attempts on successful login
      db.prepare(`
        UPDATE admin_users
        SET failed_login_attempts = 0,
            locked_until = NULL,
            last_login_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(user.id);

      // Generate JWT token
      const token = this.generateToken({
        sub: user.id.toString(),
        email: user.email,
        role: user.role
      });

      logger.info(`Successful login: ${email}`);

      return {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      };

    } catch (error) {
      logger.error('Login error:', error);
      return {
        success: false,
        error: 'Server error',
        message: 'An error occurred during login'
      };
    } finally {
      db.close();
    }
  }

  /**
   * Generate JWT token
   *
   * Uses jsonwebtoken library (battle-tested, 27M+ downloads/week)
   */
  generateToken(payload: { sub: string; email: string; role: string }): string {
    return jwt.sign(
      payload,
      config.JWT_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: '24h', // Token expires in 24 hours
        issuer: 'costplusdb-backend'
      }
    );
  }

  /**
   * Verify JWT token
   *
   * Returns decoded token payload or null if invalid
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, config.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'costplusdb-backend'
      });
    } catch (error) {
      logger.warn('Invalid token verification attempt');
      return null;
    }
  }

  /**
   * Create new admin user
   *
   * Hashes password with Argon2id (OWASP recommended)
   */
  async createAdminUser(
    email: string,
    password: string,
    name: string,
    role: 'admin' | 'super_admin' = 'admin'
  ): Promise<{ success: boolean; userId?: number; error?: string }> {
    const db = new Database(this.dbPath);

    try {
      // Check if user already exists
      const existingUser = db.prepare('SELECT id FROM admin_users WHERE email = ?').get(email);

      if (existingUser) {
        return {
          success: false,
          error: 'User already exists with this email'
        };
      }

      // Hash password with Argon2id
      const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536, // 64 MB
        timeCost: 3,
        parallelism: 4
      });

      // Insert user
      const result = db.prepare(`
        INSERT INTO admin_users (email, password_hash, name, role, is_active)
        VALUES (?, ?, ?, ?, 1)
      `).run(email, passwordHash, name, role);

      logger.info(`New admin user created: ${email} (role: ${role})`);

      return {
        success: true,
        userId: Number(result.lastInsertRowid)
      };

    } catch (error) {
      logger.error('Error creating admin user:', error);
      return {
        success: false,
        error: 'Failed to create user'
      };
    } finally {
      db.close();
    }
  }

  /**
   * Change user password
   *
   * Verifies old password before changing to new password
   */
  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const db = new Database(this.dbPath);

    try {
      // Get current password hash
      const user = db.prepare(`
        SELECT password_hash FROM admin_users WHERE id = ?
      `).get(userId) as { password_hash: string } | undefined;

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Verify old password
      const isValidPassword = await argon2.verify(user.password_hash, oldPassword);

      if (!isValidPassword) {
        return {
          success: false,
          error: 'Current password is incorrect'
        };
      }

      // Hash new password
      const newPasswordHash = await argon2.hash(newPassword, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4
      });

      // Update password
      db.prepare(`
        UPDATE admin_users
        SET password_hash = ?,
            password_changed_at = CURRENT_TIMESTAMP,
            require_password_change = 0
        WHERE id = ?
      `).run(newPasswordHash, userId);

      logger.info(`Password changed for user ID: ${userId}`);

      return { success: true };

    } catch (error) {
      logger.error('Error changing password:', error);
      return {
        success: false,
        error: 'Failed to change password'
      };
    } finally {
      db.close();
    }
  }

  /**
   * Get user by ID
   */
  getUserById(userId: number): any {
    const db = new Database(this.dbPath);

    try {
      const user = db.prepare(`
        SELECT id, email, name, role, is_active, last_login_at, created_at
        FROM admin_users
        WHERE id = ?
      `).get(userId);

      return user;
    } finally {
      db.close();
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
