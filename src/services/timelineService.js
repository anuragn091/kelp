const HistoricalEvent = require('../models/HistoricalEvent');

class TimelineService {
  /**
   * Build complete hierarchical timeline for a root event
   */
  async getTimeline(rootEventId) {
    const timeline = await HistoricalEvent.buildTreeHierarchy(rootEventId);

    if (!timeline) {
      throw new Error('Event not found');
    }

    return timeline;
  }

  /**
   * Search events with filters
   */
  async searchEvents(filters) {
    return await HistoricalEvent.searchEventsWithFilters(filters);
  }
}

module.exports = new TimelineService();
