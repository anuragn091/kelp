/**
 * Global error handling middleware
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Database errors
  if (err.code === '23505') {
    // Unique constraint violation
    return res.status(409).json({
      error: 'Duplicate entry',
      message: err.detail || 'A record with this identifier already exists',
    });
  }

  if (err.code === '23503') {
    // Foreign key constraint violation
    return res.status(400).json({
      error: 'Invalid reference',
      message: 'Referenced entity does not exist',
    });
  }

  if (err.code === '22P02') {
    // Invalid UUID format
    return res.status(400).json({
      error: 'Invalid UUID format',
      message: err.message,
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: err.message,
      details: err.details || {},
    });
  }

  // Default to 500 server error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Page not found handled
 */
function pageNotFoundHandler(req, res) {
  res.status(404).json({
    error: 'Page Not found',
    message: `Route ${req.method} ${req.url} not found`,
  });
}

module.exports = {
  errorHandler,
  pageNotFoundHandler,
};
