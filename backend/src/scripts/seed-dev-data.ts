/**
 * Development Data Seeding Script
 *
 * Seeds the database with sample data for development and testing.
 * Run this after database initialization to populate test data.
 *
 * Usage: npm run db:seed
 *
 * @module scripts/seed-dev-data
 */

import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

/**
 * Seed development data
 */
async function seedDatabase(): Promise<void> {
  try {
    logger.info('Starting database seeding...');

    const dbPath = config.DATABASE_URL.replace('file:', '');
    const db = new Database(dbPath);

    // Check if data already exists
    const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number };

    if (customerCount.count > 0) {
      logger.warn('Database already contains data. Skipping seed.');
      logger.warn('To re-seed, delete existing data first.');
      db.close();
      return;
    }

    logger.info('Seeding sample customers...');

    // Sample customers
    const customers = [
      {
        company_name: 'Acme Corporation',
        email: 'admin@acme.example.com',
        tier: 'dedicated',
        status: 'active',
        contact_name: 'John Doe',
        phone: '+1-555-0100',
        website: 'https://acme.example.com',
      },
      {
        company_name: 'Tech Startup Inc',
        email: 'cto@techstartup.example.com',
        tier: 'shared',
        status: 'active',
        contact_name: 'Jane Smith',
        phone: '+1-555-0200',
        website: 'https://techstartup.example.com',
      },
      {
        company_name: 'Enterprise Solutions LLC',
        email: 'ops@enterprise.example.com',
        tier: 'enterprise',
        status: 'provisioning',
        contact_name: 'Bob Wilson',
        phone: '+1-555-0300',
        website: 'https://enterprise.example.com',
      },
    ];

    const insertCustomer = db.prepare(`
      INSERT INTO customers (company_name, email, tier, status, contact_name, phone, website)
      VALUES (@company_name, @email, @tier, @status, @contact_name, @phone, @website)
    `);

    const insertMany = db.transaction((customers) => {
      for (const customer of customers) {
        insertCustomer.run(customer);
      }
    });

    insertMany(customers);

    logger.info(`✓ Seeded ${customers.length} sample customers`);

    // TODO: Seed other tables (databases, billing, support tickets)

    db.close();
    logger.info('Database seeding complete');

  } catch (error) {
    logger.error('Database seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding
seedDatabase()
  .then(() => {
    logger.info('✓ Seeding complete');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Seeding error:', error);
    process.exit(1);
  });
