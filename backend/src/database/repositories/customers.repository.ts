/**
 * Customers Repository
 *
 * Data access layer for customers table.
 * Provides CRUD operations and queries for customer records.
 *
 * @module database/repositories/customers
 */

import Database from 'better-sqlite3';
import { Customer, CustomerCreateInput, CustomerUpdateInput, CustomerStatus } from '../schema.js';
import { NotFoundError } from '../../utils/errors.js';

/**
 * Customers repository class
 */
export class CustomersRepository {
  constructor(private db: Database.Database) {}

  /**
   * Create a new customer
   */
  async create(data: CustomerCreateInput): Promise<Customer> {
    const stmt = this.db.prepare(`
      INSERT INTO customers (company_name, email, tier, status, contact_name, phone, website)
      VALUES (@company_name, @email, @tier, @status, @contact_name, @phone, @website)
    `);

    const result = stmt.run(data);
    return this.findById(Number(result.lastInsertRowid));
  }

  /**
   * Find customer by ID
   */
  async findById(id: number): Promise<Customer> {
    const stmt = this.db.prepare('SELECT * FROM customers WHERE id = ?');
    const customer = stmt.get(id) as Customer | undefined;

    if (!customer) {
      throw new NotFoundError(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  /**
   * Find customer by email
   */
  async findByEmail(email: string): Promise<Customer | null> {
    const stmt = this.db.prepare('SELECT * FROM customers WHERE email = ?');
    return (stmt.get(email) as Customer) || null;
  }

  /**
   * Update customer
   */
  async update(id: number, data: CustomerUpdateInput): Promise<Customer> {
    // Build dynamic update query
    const fields = Object.keys(data)
      .map(key => `${key} = @${key}`)
      .join(', ');

    if (fields.length === 0) {
      return this.findById(id);
    }

    const stmt = this.db.prepare(`
      UPDATE customers
      SET ${fields}, updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `);

    stmt.run({ ...data, id });
    return this.findById(id);
  }

  /**
   * Update customer status
   */
  async updateStatus(id: number, status: CustomerStatus): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE customers
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(status, id);
  }

  /**
   * Delete customer
   */
  async delete(id: number): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM customers WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      throw new NotFoundError(`Customer with ID ${id} not found`);
    }
  }

  /**
   * List all customers with optional filtering
   */
  async list(filters?: {
    status?: CustomerStatus;
    tier?: string;
    limit?: number;
    offset?: number;
  }): Promise<Customer[]> {
    let query = 'SELECT * FROM customers WHERE 1=1';
    const params: any = {};

    if (filters?.status) {
      query += ' AND status = @status';
      params.status = filters.status;
    }

    if (filters?.tier) {
      query += ' AND tier = @tier';
      params.tier = filters.tier;
    }

    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ' LIMIT @limit';
      params.limit = filters.limit;
    }

    if (filters?.offset) {
      query += ' OFFSET @offset';
      params.offset = filters.offset;
    }

    const stmt = this.db.prepare(query);
    return stmt.all(params) as Customer[];
  }

  /**
   * Count customers by status
   */
  async count(status?: CustomerStatus): Promise<number> {
    let query = 'SELECT COUNT(*) as count FROM customers';

    if (status) {
      query += ' WHERE status = ?';
      const stmt = this.db.prepare(query);
      const result = stmt.get(status) as { count: number };
      return result.count;
    }

    const stmt = this.db.prepare(query);
    const result = stmt.get() as { count: number };
    return result.count;
  }

  /**
   * Check if customer exists by email
   */
  async existsByEmail(email: string): Promise<boolean> {
    const stmt = this.db.prepare('SELECT 1 FROM customers WHERE email = ? LIMIT 1');
    return stmt.get(email) !== undefined;
  }
}
