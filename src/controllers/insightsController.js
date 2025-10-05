const insightsService = require('../services/insightsService');

class InsightsController {
  /**
   * Retrieves all pairs of events that have overlapping timeframes
   * Calls analytics service to find overlaps and returns results as JSON
   *
   * @param {Object} req - No parameters required
   * @returns {Array} 200 - Array of overlapping event pairs with overlap duration
   */
  async getOverlappingEvents(req, res, next) {
    try {
      const overlappingEvents = await insightsService.getOverlappingEvents();

      res.json(overlappingEvents);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Finds the largest temporal gap within a specified date range
   * Validates required query parameters (startDate, endDate) before processing
   *
   * @param {Object} req.query - startDate (ISO 8601, required), endDate (ISO 8601, required)
   * @returns {Object} 200 - Gap information with largestGap object and message
   * @returns {Object} 400 - Error if startDate or endDate missing
   */
  async getTemporalGaps(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'startDate and endDate query parameters are required',
        });
      }

      const result = await insightsService.getTemporalGaps(startDate, endDate);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculates the shortest temporal path between source and target events
   * Validates required query parameters (sourceEventId, targetEventId) before processing
   *
   * @param {Object} req.query - sourceEventId (UUID, required), targetEventId (UUID, required)
   * @returns {Object} 200 - Shortest path with events array and total duration
   * @returns {Object} 400 - Error if sourceEventId or targetEventId missing
   */
  async getEventInfluence(req, res, next) {
    try {
      const { sourceEventId, targetEventId } = req.query;

      if (!sourceEventId || !targetEventId) {
        return res.status(400).json({
          error: 'sourceEventId and targetEventId query parameters are required',
        });
      }

      const result = await insightsService.getEventInfluence(sourceEventId, targetEventId);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InsightsController();
