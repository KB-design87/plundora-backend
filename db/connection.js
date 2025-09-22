const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) a connection after it has been used this many times
};

// Alternative configuration using individual environment variables
if (!process.env.DATABASE_URL) {
  dbConfig.host = process.env.DB_HOST || 'localhost';
  dbConfig.port = process.env.DB_PORT || 5432;
  dbConfig.database = process.env.DB_NAME || 'plundora';
  dbConfig.user = process.env.DB_USER;
  dbConfig.password = process.env.DB_PASSWORD;
  delete dbConfig.connectionString;
}

// Create the connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test the connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT. Graceful shutdown...');
  pool.end(() => {
    console.log('Database pool has ended');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Graceful shutdown...');
  pool.end(() => {
    console.log('Database pool has ended');
    process.exit(0);
  });
});

// Database helper functions
const db = {
  // Execute a query with parameters
  query: async (text, params) => {
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },

  // Get a client from the pool (for transactions)
  getClient: async () => {
    return await pool.connect();
  },

  // Execute a transaction
  transaction: async (callback) => {
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
  },

  // Health check
  healthCheck: async () => {
    try {
      const result = await pool.query('SELECT NOW()');
      return { healthy: true, timestamp: result.rows[0].now };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  },

  // Get pool status
  getPoolStatus: () => {
    return {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };
  }
};

module.exports = db;