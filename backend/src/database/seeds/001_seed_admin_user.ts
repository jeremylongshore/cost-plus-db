/**
 * Seed Initial Admin User
 *
 * Creates the first admin user with a secure password.
 * Password is hashed using Argon2id.
 *
 * Usage: npm run db:seed
 *
 * @module database/seeds/001_seed_admin_user
 */

import argon2 from 'argon2';
import Database from 'better-sqlite3';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Seed initial admin user
 */
export async function seedAdminUser(): Promise<void> {
  try {
    logger.info('Seeding initial admin user...');

    // Open database
    const dbPath = config.DATABASE_URL.replace('file:', '');
    const db = new Database(dbPath);

    // Check if admin user already exists
    const existingAdmin = db.prepare('SELECT id FROM admin_users WHERE email = ?').get('admin@costplusdb.com');

    if (existingAdmin) {
      logger.info('Admin user already exists. Skipping seed.');
      db.close();
      return;
    }

    // Default admin credentials
    const adminEmail = 'admin@costplusdb.com';
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'ChangeMe123!'; // MUST be changed in production
    const adminName = 'System Administrator';
    const adminRole = 'super_admin';

    // Hash password using Argon2id
    logger.info('Hashing password with Argon2id...');
    const passwordHash = await argon2.hash(adminPassword, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4,
    });

    // Insert admin user
    const stmt = db.prepare(`
      INSERT INTO admin_users (email, password_hash, name, role, is_active, created_by)
      VALUES (?, ?, ?, ?, 1, 'seed')
    `);

    const result = stmt.run(adminEmail, passwordHash, adminName, adminRole);

    logger.info(`✅ Admin user created successfully (ID: ${result.lastInsertRowid})`);
    logger.info(`   Email: ${adminEmail}`);
    logger.info(`   Password: ${adminPassword}`);
    logger.warn('⚠️  IMPORTANT: Change the default password immediately after first login!');

    db.close();
  } catch (error) {
    logger.error('Failed to seed admin user:', error);
    throw error;
  }
}

// Run seed if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAdminUser()
    .then(() => {
      logger.info('Seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seed failed:', error);
      process.exit(1);
    });
}
