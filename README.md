# Chronologicon Engine - ArchaeoData Inc.

A Node.js backend service for ingesting, managing, and querying historical event data. This system reconstructs complete hierarchical timelines from fragmented historical records.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Design Choices](#design-choices)
- [Testing the Application](#testing-the-application)

## Features

- ✅ **Asynchronous File Ingestion**: Process large historical event files with job tracking
- ✅ **Hierarchical Timeline Reconstruction**: Build complete event timelines with parent-child relationships
- ✅ **Advanced Search**: Filter events by name, date range with pagination and sorting
- ✅ **Temporal Gap Detection**: Identify missing periods in historical records
- ✅ **Overlap Analysis**: Find events with overlapping timeframes
- ✅ **Event Influence Tracking**: Calculate shortest path between events based on duration
- ✅ **Robust Error Handling**: Validate data, log errors, continue processing valid records

## Tech Stack

- **Runtime**: Node.js v18+
- **Framework**: Express.js 5.x
- **Database**: PostgreSQL 14+
- **File Processing**: Node.js streams (readline)

## Prerequisites

- Node.js v18 or higher
- PostgreSQL 14 or higher
- npm or yarn

## Installation

**1. Clone the repository**
```bash
cd kelp
```

**2. Install dependencies**
```bash
npm install
```

**3. Create environment file**
```bash
cp .env.example .env
```

**4. Configure environment variables** (see [Configuration](#configuration))

## Database Setup

**1. Create PostgreSQL database**
```bash
createdb chronologicon
```

**2. Run schema file**
```bash
psql -U postgres -d chronologicon -f schema.sql
```

Or use the npm script:
```bash
npm run db:setup
```

**3. Verify setup**
```bash
psql -U postgres -d chronologicon -c "\dt"
```

You should see:
- `historical_events` table
- `ingestion_jobs` table

## Configuration

Edit the `.env` file with your settings:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chronologicon
DB_USER=postgres
DB_PASSWORD=your_password_here

# Database Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10
```

## Running the Application

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT)

## API Documentation

Base URL: `http://localhost:3000`

> 📦 **Complete API examples and detailed request/response schemas available in [Postman Collection](Chronologicon_API.postman_collection.json)**

### **1. POST /api/events/ingest**
Initiate asynchronous file ingestion (supports file upload or server path).

**Modes:**
- **File Upload** (multipart/form-data): `file` field
- **Server Path** (application/json): `{"filePath": "path/to/file.txt"}`

⚠️ **Security Note**: Server path mode allows reading any accessible file. Implement authentication and path allowlist for production.

**Response (202):**
```json
{
  "status": "Ingestion initiated",
  "jobId": "ingest-job-12345-abcde",
  "message": "Check /api/events/ingestion-status/ingest-job-12345-abcde for updates."
}
```

---

### **2. GET /api/events/ingestion-status/:jobId**
Get ingestion job status and progress.

**Response (200):**
```json
{
  "jobId": "ingest-job-12345-abcde",
  "status": "COMPLETED",
  "processedLines": 10,
  "errorLines": 2,
  "totalLines": 12,
  "errors": ["Line 7: Invalid UUID format..."],
  "startTime": "2023-06-25T10:00:00Z",
  "endTime": "2023-06-25T10:00:05Z"
}
```

---

### **3. GET /api/timeline/:rootEventId**
Get hierarchical timeline for an event with nested children.

**Response (200):** Event object with recursive `children` array containing full event hierarchy.

---

### **4. GET /api/events/search**
Search events with filters, pagination, and sorting.

**Query Parameters:**
- `name` (optional): Partial match (case-insensitive)
- `start_date_after` (optional): ISO 8601 date
- `end_date_before` (optional): ISO 8601 date
- `sortBy` (optional): `start_date`, `end_date`, `event_name`, `duration_minutes`
- `sortOrder` (optional): `asc` or `desc` (default: `asc`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10)

**Response (200):**
```json
{
  "totalEvents": 2,
  "page": 1,
  "limit": 10,
  "events": [...]
}
```

---

### **5. GET /api/insights/overlapping-events**
Find all events with overlapping timeframes.

**Response (200):** Array of overlapping event pairs with overlap duration in minutes.

---

### **6. GET /api/insights/temporal-gaps**
Find largest temporal gap in a date range.

**Query Parameters:**
- `startDate` (required): ISO 8601 date
- `endDate` (required): ISO 8601 date

**Response (200):** Gap object with `precedingEvent` and `succeedingEvent` details.

---

### **7. GET /api/insights/event-influence**
Find shortest path between two events based on parent-child relationships.

**Query Parameters:**
- `sourceEventId` (required): UUID
- `targetEventId` (required): UUID

**Response (200):**
```json
{
  "sourceEventId": "...",
  "targetEventId": "...",
  "shortestPath": [...],
  "totalDurationMinutes": 1680,
  "message": "Shortest temporal path found..."
}
```

---

## Design Choices

**1. Database Design**
- **PostgreSQL with Recursive CTEs**: Chosen for powerful hierarchical queries and temporal data handling
- **Self-referencing Foreign Key**: `parent_event_id` enables tree structure for event relationships
- **JSONB Metadata Field**: Flexible storage for parsing details (source file, line number, flags)
- **Strategic Indexes**: On `start_date`, `end_date`, `parent_event_id` for query performance
- **Generated Columns Alternative**: `duration_minutes` calculated in application logic for compatibility

**2. File Processing**
- **Streaming with readline**: Handles large files efficiently without loading into memory
- **Asynchronous Job Processing**: Non-blocking ingestion with job tracking
- **Error Tolerance**: Invalid lines are logged but don't halt processing
- **Line-by-line Validation**: UUID format, ISO 8601 dates, positive values, date ranges

**3. API Architecture**
- **RESTful Design**: Clear resource-based endpoints
- **Async/Await Pattern**: Clean asynchronous code throughout
- **Centralized Error Handling**: Consistent error responses with middleware
- **Separation of Concerns**: Controllers → Services → Models architecture
- **Query Optimization**: Efficient SQL with CTEs, JOINs, and window functions

**4. Error Handling Strategy**
- **Validation Layer**: Input validation before database operations
- **Database Constraints**: Enforce data integrity at DB level
- **Graceful Degradation**: Log errors, continue processing valid records
- **Detailed Error Messages**: Include line numbers and specific issues

**5. Performance Optimizations**
- **Connection Pooling**: Reuse database connections (2-10 pool size)
- **Indexed Queries**: Strategic indexes on frequently queried columns
- **Stream Processing**: Handle large files without memory issues
- **Pagination**: Limit result sets for search endpoints
- **Query Optimization**: Use CTEs and efficient JOINs

## Testing the Application

**1. Start PostgreSQL**
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

**2. Run database setup**
```bash
npm run db:setup
```

**3. Start the server**
```bash
npm run dev
```

**4. Test ingestion with sample data**
```bash
curl -X POST http://localhost:3000/api/events/ingest \
  -H "Content-Type: application/json" \
  -d '{"filePath": "/Users/anurag/Projects/kelp/sample-data-kelp.csv"}'
```

**5. Check job status** (use jobId from response)
```bash
curl http://localhost:3000/api/events/ingestion-status/{jobId}
```

**6. Query timeline**
```bash
curl http://localhost:3000/api/timeline/a1b2c3d4-e5f6-7890-1234-567890abcdef
```
