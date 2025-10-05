const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'chronologicon',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  min: parseInt(process.env.DB_POOL_MIN) || 2,
  max: parseInt(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// FIrst test database connection
pool.on('connect', () => {
  console.log('✓ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Execute a SQL query against the database pool
 *
 * This helper function wrapper for pool.query() that can be used for query performance logging
 * in development/prod mode. It measures execution time and logs query details.
 *
 * @param {string} text - The SQL query string (can include $1, $2 placeholders)
 * @param {Array} params - Array of parameter values to safely inject into the query
 * @returns {Promise<Object>} PostgreSQL query result object containing:
 *   - rows: Array of result rows
 *   - rowCount: Number of rows affected/returned
 *   - command: SQL command that was executed (SELECT, INSERT, etc.)
 *
 * @example
 * const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
 * console.log(result.rows); // Array of matching rows
 */
const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === 'development') {
    console.log('Executed query', { text, duration, rows: res.rowCount });
  }

  return res;
};

/**
 * Execute multiple database operations within a transaction
 *
 * This helper function manages database transactions with automatic BEGIN, COMMIT,
 * and ROLLBACK handling. It acquires a dedicated client from the pool, starts a
 * transaction, executes the callback, and commits if successful. On any error,
 * it automatically rolls back all changes and re-throws the error.
 *
 * @param {Function} callback - Async function that receives a database client and
 *   performs transactional operations. Must return the final result.
 * @returns {Promise<*>} The value returned by the callback function
 * @throws {Error} Re-throws any error from the callback after rolling back
 *
 * @example
 * const result = await transaction(async (client) => {
 *   await client.query('INSERT INTO users (name) VALUES ($1)', ['Alice']);
 *   await client.query('INSERT INTO logs (action) VALUES ($1)', ['user_created']);
 *   return { success: true };
 * });
 */
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  transaction,
};
