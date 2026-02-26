import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Connection pool for user sandbox schemas.
 *
 * In production, point SANDBOX_DATABASE_URL to a separate PostgreSQL database
 * (different from DATABASE_URL) so arbitrary user SQL cannot access app tables.
 * In development, it can fall back to DATABASE_URL.
 */
export const sandboxPool = new Pool({
  connectionString: process.env.SANDBOX_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

sandboxPool.on('error', (err) => {
  console.error('Unexpected error on idle sandbox client', err);
});

