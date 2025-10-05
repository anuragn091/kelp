const { query } = require('../config/database');

class HistoricalEvent {
  /**
   * Inserts or updates event using UPSERT pattern (ON CONFLICT DO UPDATE)
   * Returns the created/updated event record from database
   */
  static async create(eventData) {
    const {
      event_id,
      event_name,
      description,
      start_date,
      end_date,
      duration_minutes,
      parent_event_id,
      research_value,
      metadata = {},
    } = eventData;

    const sql = `
      INSERT INTO historical_events (
        event_id, event_name, description, start_date, end_date,
        duration_minutes, parent_event_id, research_value, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (event_id) DO UPDATE SET
        event_name = EXCLUDED.event_name,
        description = EXCLUDED.description,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        duration_minutes = EXCLUDED.duration_minutes,
        parent_event_id = EXCLUDED.parent_event_id,
        research_value = EXCLUDED.research_value,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await query(sql, [
      event_id,
      event_name,
      description,
      start_date,
      end_date,
      duration_minutes,
      parent_event_id,
      research_value,
      metadata,
    ]);

    return result.rows[0];
  }

  /**
   * Retrieves single event by UUID primary key
   * Returns undefined if not found
   */
  static async findEventById(eventId) {
    const sql = 'SELECT * FROM historical_events WHERE event_id = $1';
    const result = await query(sql, [eventId]);
    return result.rows[0];
  }

  /**
   * Fetches all events with pagination, ordered by start_date ASC
   * Default limit 10, offset 0
   */
  static async findAllEvents(options = {}) {
    const { limit = 10, offset = 0 } = options;
    const sql = `
      SELECT * FROM historical_events
      ORDER BY start_date ASC
      LIMIT $1 OFFSET $2
    `;
    const result = await query(sql, [limit, offset]);
    return result.rows;
  }

  /**
   * Retrieves all direct children of a parent event using parent_event_id FK
   * Ordered by start_date ASC
   */
  static async findAllDirectChildren(parentId) {
    const sql = `
      SELECT * FROM historical_events
      WHERE parent_event_id = $1
      ORDER BY start_date ASC
    `;
    const result = await query(sql, [parentId]);
    return result.rows;
  }

  /**
   * Recursively builds complete event tree from given root event
   * Uses in-memory tree construction with async recursion
   */
  static async buildTreeHierarchy(eventId) {
    const event = await this.findEventById(eventId);
    if (!event) return null;

    const children = await this.findAllDirectChildren(eventId);
    const childrenWithHierarchy = await Promise.all(
      children.map((child) => this.buildTreeHierarchy(child.event_id))
    );

    return {
      ...event,
      children: childrenWithHierarchy,
    };
  }

  /**
   * Dynamic search with filters (name ILIKE, date range), pagination, and sorting
   * Builds WHERE clause dynamically, executes COUNT query for pagination metadata
   */
  static async searchEventsWithFilters(filters = {}) {
    const {
      name,
      start_date_after,
      end_date_before,
      sortBy = 'start_date',
      sortOrder = 'ASC',
      page = 1,
      limit = 10,
    } = filters;

    const conditions = [];
    const params = [];
    let paramCount = 1;

    if (name) {
      conditions.push(`event_name ILIKE $${paramCount}`);
      params.push(`%${name}%`);
      paramCount++;
    }

    if (start_date_after) {
      conditions.push(`start_date >= $${paramCount}`);
      params.push(start_date_after);
      paramCount++;
    }

    if (end_date_before) {
      conditions.push(`end_date <= $${paramCount}`);
      params.push(end_date_before);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSortFields = ['start_date', 'end_date', 'event_name', 'duration_minutes'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'start_date';
    const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const offset = (page - 1) * limit;

    const countSql = `SELECT COUNT(*) FROM historical_events ${whereClause}`;
    const countResult = await query(countSql, params);
    const totalEvents = parseInt(countResult.rows[0].count);

    const sql = `
      SELECT event_id, event_name, start_date, end_date, duration_minutes
      FROM historical_events
      ${whereClause}
      ORDER BY ${sortField} ${order}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(limit, offset);
    const result = await query(sql, params);

    return {
      totalEvents,
      page,
      limit,
      events: result.rows,
    };
  }

  /**
   * Finds overlapping event pairs using self-join and temporal range comparison
   * Returns pairs sorted by overlap duration DESC with calculated overlap in minutes
   */
  static async findOverlappingEvents() {
    const sql = `
      WITH event_pairs AS (
        SELECT
          e1.event_id as event1_id,
          e1.event_name as event1_name,
          e1.start_date as event1_start,
          e1.end_date as event1_end,
          e2.event_id as event2_id,
          e2.event_name as event2_name,
          e2.start_date as event2_start,
          e2.end_date as event2_end,
          EXTRACT(EPOCH FROM (
            LEAST(e1.end_date, e2.end_date) - GREATEST(e1.start_date, e2.start_date)
          )) / 60 AS overlap_minutes
        FROM historical_events e1
        JOIN historical_events e2 ON e1.event_id < e2.event_id
        WHERE e1.start_date < e2.end_date
          AND e2.start_date < e1.end_date
      )
      SELECT * FROM event_pairs
      WHERE overlap_minutes > 0
      ORDER BY overlap_minutes DESC
    `;

    const result = await query(sql);
    return result.rows.map((row) => ({
      overlappingEventPairs: [
        {
          event_id: row.event1_id,
          event_name: row.event1_name,
          start_date: row.event1_start,
          end_date: row.event1_end,
        },
        {
          event_id: row.event2_id,
          event_name: row.event2_name,
          start_date: row.event2_start,
          end_date: row.event2_end,
        },
      ],
      overlap_duration_minutes: Math.round(row.overlap_minutes),
    }));
  }

  /**
   * Identifies largest temporal gap using CTEs and self-join to find consecutive events
   * Returns gap with preceding/succeeding event details, null if no gaps
   */
  static async findTemporalGaps(startDate, endDate) {
    const sql = `
      WITH ordered_events AS (
        SELECT event_id, event_name, start_date, end_date
        FROM historical_events
        WHERE start_date >= $1 AND end_date <= $2
        ORDER BY end_date
      ),
      gaps AS (
        SELECT
          e1.event_id as preceding_event_id,
          e1.event_name as preceding_event_name,
          e1.end_date as gap_start,
          e2.start_date as gap_end,
          e2.event_id as succeeding_event_id,
          e2.event_name as succeeding_event_name,
          EXTRACT(EPOCH FROM (e2.start_date - e1.end_date)) / 60 AS gap_minutes
        FROM ordered_events e1
        JOIN ordered_events e2 ON e2.start_date > e1.end_date
        WHERE NOT EXISTS (
          SELECT 1 FROM ordered_events e3
          WHERE e3.start_date > e1.end_date
            AND e3.start_date < e2.start_date
        )
      )
      SELECT * FROM gaps
      WHERE gap_minutes > 0
      ORDER BY gap_minutes DESC
      LIMIT 1
    `;

    const result = await query(sql, [startDate, endDate]);

    if (result.rows.length === 0) {
      return null;
    }

    const gap = result.rows[0];
    return {
      startOfGap: gap.gap_start,
      endOfGap: gap.gap_end,
      durationMinutes: Math.round(gap.gap_minutes),
      precedingEvent: {
        event_id: gap.preceding_event_id,
        event_name: gap.preceding_event_name,
        end_date: gap.gap_start,
      },
      succeedingEvent: {
        event_id: gap.succeeding_event_id,
        event_name: gap.succeeding_event_name,
        start_date: gap.gap_end,
      },
    };
  }

  /**
   * Calculates shortest path using recursive CTE graph traversal on parent-child edges
   * Tracks cumulative duration and prevents cycles, returns null if no path exists
   */
  static async findShortestPath(sourceEventId, targetEventId) {
    // Build adjacency graph using parent-child relationships
    const sql = `
      WITH RECURSIVE event_graph AS (
        -- Start from source event
        SELECT
          event_id,
          event_name,
          duration_minutes,
          parent_event_id,
          ARRAY[event_id] as path,
          duration_minutes as total_duration
        FROM historical_events
        WHERE event_id = $1

        UNION ALL

        -- Traverse to children
        SELECT
          he.event_id,
          he.event_name,
          he.duration_minutes,
          he.parent_event_id,
          eg.path || he.event_id,
          eg.total_duration + he.duration_minutes
        FROM historical_events he
        INNER JOIN event_graph eg ON he.parent_event_id = eg.event_id
        WHERE NOT he.event_id = ANY(eg.path) -- Prevent cycles
      )
      SELECT * FROM event_graph
      WHERE event_id = $2
      ORDER BY total_duration ASC
      LIMIT 1
    `;

    const result = await query(sql, [sourceEventId, targetEventId]);

    if (result.rows.length === 0) {
      return null;
    }

    const pathData = result.rows[0];

    // Fetch full details for each event in the path
    const pathIds = pathData.path;
    const eventsSql = `
      SELECT event_id, event_name, duration_minutes
      FROM historical_events
      WHERE event_id = ANY($1)
    `;
    const eventsResult = await query(eventsSql, [pathIds]);

    // Sort events according to the path order
    const eventsMap = {};
    eventsResult.rows.forEach((event) => {
      eventsMap[event.event_id] = event;
    });

    const shortestPath = pathIds.map((id) => eventsMap[id]);

    return {
      shortestPath,
      totalDurationMinutes: pathData.total_duration,
    };
  }
}

module.exports = HistoricalEvent;
