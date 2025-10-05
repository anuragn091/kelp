const HistoricalEvent = require('../models/HistoricalEvent');

class InsightsService {
  /**
   * Find all overlapping events
   */
  async getOverlappingEvents() {
    return await HistoricalEvent.findOverlappingEvents();
  }

  /**
   * Find the largest temporal gap within a date range
   */
  async getTemporalGaps(startDate, endDate) {
    const largestGap = await HistoricalEvent.findTemporalGaps(startDate, endDate);

    if (!largestGap) {
      return {
        largestGap: null,
        message: 'No significant temporal gaps found within the specified range, or too few events.',
      };
    }

    return {
      largestGap,
      message: 'Largest temporal gap identified.',
    };
  }

  /**
   * Find shortest path between two events
   */
  async getEventInfluence(sourceEventId, targetEventId) {
    const result = await HistoricalEvent.findShortestPath(sourceEventId, targetEventId);

    if (!result) {
      return {
        sourceEventId,
        targetEventId,
        shortestPath: [],
        totalDurationMinutes: 0,
        message: 'No temporal path found from source to target event.',
      };
    }

    return {
      sourceEventId,
      targetEventId,
      shortestPath: result.shortestPath,
      totalDurationMinutes: result.totalDurationMinutes,
      message: 'Shortest temporal path found from source to target event.',
    };
  }
}

module.exports = new InsightsService();
