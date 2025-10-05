const app = require('./app');
const { pool } = require('./config/database');

const PORT = process.env.PORT || 3000;

// Test database connection before starting server
async function startServer() {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✓ Database connection successful');

    // Start server
    app.listen(PORT, () => {
      console.log(`
Server running on http://localhost:${PORT}
Environment: ${process.env.NODE_ENV || 'development'}
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing server gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Closing server gracefully...');
  await pool.end();
  process.exit(0);
});

startServer();
