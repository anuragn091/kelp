/**
 * Validate if a string is a valid UUID
 */
function validateUUID(uuid) {
  // UUID v4 regex pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(uuid);
}

/**
 * Validate if a string is a valid ISO 8601 date
 */
function validateISODate(dateString) {
  const date = new Date(dateString);
  // Check if valid date and matches ISO 8601 format with Z or timezone
  const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  return !isNaN(date.getTime()) && isoPattern.test(dateString);
}

/**
 * Parse a line from the historical data file
 * Format: EVENT_ID|EVENT_NAME|START_DATE_ISO|END_DATE_ISO|PARENT_ID_OR_NULL|RESEARCH_VALUE|DESCRIPTION
 */
function parseEventLine(line, lineNumber) {
  const parts = line.split('|');

  if (parts.length < 7) {
    throw new Error(`Insufficient fields. Expected 7, got ${parts.length}`);
  }

  const [
    event_id,
    event_name,
    start_date,
    end_date,
    parent_id,
    research_value,
    description,
  ] = parts;

  // Validate event_id
  if (!validateUUID(event_id)) {
    throw new Error(`Invalid UUID format for event_id: '${event_id}'`);
  }

  // Validate dates
  if (!validateISODate(start_date)) {
    throw new Error(`Invalid date format for start_date: '${start_date}'`);
  }

  if (!validateISODate(end_date)) {
    throw new Error(`Invalid date format for end_date: '${end_date}'`);
  }

  // Validate date range
  const startDateTime = new Date(start_date);
  const endDateTime = new Date(end_date);

  if (endDateTime <= startDateTime) {
    throw new Error(`end_date must be after start_date`);
  }

  // Calculate duration in minutes
  const duration_minutes = Math.floor((endDateTime - startDateTime) / (1000 * 60));

  // Validate parent_id
  let parent_event_id = null;
  if (parent_id && parent_id.toUpperCase() !== 'NULL') {
    if (!validateUUID(parent_id)) {
      throw new Error(`Invalid UUID format for parent_id: '${parent_id}'`);
    }
    parent_event_id = parent_id;
  }

  // Validate research_value
  const researchValue = parseInt(research_value, 10);
  if (isNaN(researchValue)) {
    throw new Error(`Invalid research_value: '${research_value}'`);
  }

  if (researchValue < 0) {
    throw new Error(`research_value cannot be negative: ${researchValue}`);
  }

  return {
    event_id,
    event_name: event_name.trim(),
    description: description.trim(),
    start_date: startDateTime,
    end_date: endDateTime,
    duration_minutes,
    parent_event_id,
    research_value: researchValue,
    metadata: {
      line_number: lineNumber,
    },
  };
}

module.exports = {
  validateUUID,
  validateISODate,
  parseEventLine,
};
