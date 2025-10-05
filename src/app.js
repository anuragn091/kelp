const express = require('express');
const cors = require('cors');
require('dotenv').config();

const eventsRoutes = require('./routes/events');
const insightsRoutes = require('./routes/insights');
const { errorHandler, pageNotFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Chronologicon Engine',
  });
});

// All API Routes
app.use('/api/events', eventsRoutes);
app.use('/api', eventsRoutes);
app.use('/api/insights', insightsRoutes);

// 404 handler
app.use(pageNotFoundHandler);

// Error handler
app.use(errorHandler);

module.exports = app;
