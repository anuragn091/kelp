const express = require('express');
const router = express.Router();
const insightsController = require('../controllers/insightsController');

/**
 * Endpoint: GET /api/insights/overlapping-events
 * Find all pairs of events that have overlapping timeframes with overlap duration
 */
router.get('/overlapping-events', insightsController.getOverlappingEvents.bind(insightsController));

/**
 * Endpoint: GET /api/insights/temporal-gaps
 * Identify the largest temporal gap in recorded events within a specified date range
 */
router.get('/temporal-gaps', insightsController.getTemporalGaps.bind(insightsController));

/**
 * Endpoint: GET /api/insights/event-influence
 * Calculate shortest temporal path between source and target events following parent-child relationships
 */
router.get('/event-influence', insightsController.getEventInfluence.bind(insightsController));

module.exports = router;
