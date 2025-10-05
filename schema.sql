-- Drop existing tables if they exist --
DROP TABLE IF EXISTS ingestion_jobs CASCADE;
DROP TABLE IF EXISTS historical_events CASCADE;

-- Extension for UUID support --
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Historical Events Table --
CREATE TABLE historical_events (
    event_id UUID PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    parent_event_id UUID REFERENCES historical_events(event_id) ON DELETE SET NULL,
    research_value INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints --
    CONSTRAINT positive_duration CHECK (duration_minutes >= 0),
    CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Ingestion Jobs Table --
CREATE TABLE ingestion_jobs (
    job_id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    file_path TEXT NOT NULL,
    processed_lines INTEGER DEFAULT 0,
    error_lines INTEGER DEFAULT 0,
    total_lines INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints --
    CONSTRAINT non_negative_lines CHECK (
        processed_lines >= 0 AND
        error_lines >= 0 AND
        total_lines >= 0
    )
);

-- Indexes for Historical Events --
CREATE INDEX idx_historical_events_start_date ON historical_events(start_date);
CREATE INDEX idx_historical_events_end_date ON historical_events(end_date);
CREATE INDEX idx_historical_events_parent_id ON historical_events(parent_event_id);
CREATE INDEX idx_historical_events_event_name ON historical_events(event_name);
CREATE INDEX idx_historical_events_date_range ON historical_events(start_date, end_date);
CREATE INDEX idx_historical_events_metadata ON historical_events USING GIN(metadata);

-- Indexes for Ingestion Jobs --
CREATE INDEX idx_ingestion_jobs_status ON ingestion_jobs(status);
CREATE INDEX idx_ingestion_jobs_created_at ON ingestion_jobs(created_at);

-- Function to automatically update updated_at timestamp --
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on historical_events --
CREATE TRIGGER update_historical_events_updated_at
    BEFORE UPDATE ON historical_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE historical_events IS 'Stores historical event data with hierarchical parent-child relationships';
COMMENT ON TABLE ingestion_jobs IS 'Tracks asynchronous file ingestion jobs and their status';

COMMENT ON COLUMN historical_events.event_id IS 'Unique identifier for the event (UUID)';
COMMENT ON COLUMN historical_events.parent_event_id IS 'Reference to parent event for hierarchical relationships';
COMMENT ON COLUMN historical_events.duration_minutes IS 'Calculated duration in minutes (end_date - start_date)';
COMMENT ON COLUMN historical_events.metadata IS 'Additional unstructured data (source file, line number, etc.)';
COMMENT ON COLUMN historical_events.research_value IS 'Research importance value from source data';

COMMENT ON COLUMN ingestion_jobs.job_id IS 'Unique identifier for the ingestion job';
COMMENT ON COLUMN ingestion_jobs.errors IS 'Array of error messages encountered during ingestion';
