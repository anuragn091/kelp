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
Initiate asynchronous file ingestion for historical events data.

**Supports Two Modes:**

#### **Option A: File Upload** (multipart/form-data)
For external clients uploading files directly.

**Request:**
- Content-Type: `multipart/form-data`
- Field: `file` (file upload)

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/events/ingest \
  -F "file=@sample-data-kelp.txt"
```

#### **Option B: Server File Path** (application/json)
For testing/admin when file already exists on server.

**Request Body:**
```json
{
  "filePath": "uploads/sample-data-kelp.txt"
}
```

Or with absolute path:
```json
{
  "filePath": "/data/events/historical-data.txt"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/events/ingest \
  -H "Content-Type: application/json" \
  -d '{"filePath": "uploads/sample-data-kelp.txt"}'
```

**Response (202 Accepted):**
```json
{
  "status": "Ingestion initiated",
  "jobId": "ingest-job-12345-abcde",
  "message": "Check /api/events/ingestion-status/ingest-job-12345-abcde for updates.",
  "ingestionMode": "file-upload"
}
```

**Error Responses:**
- `400 Bad Request`: No file provided or file not found on server

**Security Note:**

⚠️ **IMPORTANT**: The server file path mode allows reading **any file** accessible to the Node.js process. This is intentionally flexible but has security implications:

**Risks:**
- Path Traversal: Anyone can request any file (`/etc/passwd`, `/app/.env`, database files)
- Data Exposure: Sensitive configuration, credentials, or user data could be exposed
- No Authentication: Current implementation has no access control

**Recommended Mitigations:**
- Implement authentication and authorization
- Use path allowlist to restrict accessible directories
- Add input validation and sanitization

---

### **2. GET /api/events/ingestion-status/:jobId**
Get ingestion job status and progress tracking.

**Parameters:**
- `jobId` (path parameter): Job identifier from ingestion response

**cURL Example:**
```bash
curl http://localhost:3000/api/events/ingestion-status/ingest-job-12345-abcde
```

**Response (200 OK):**
```json
{
  "jobId": "ingest-job-12345-abcde",
  "status": "COMPLETED",
  "processedLines": 10,
  "errorLines": 2,
  "totalLines": 12,
  "errors": [
    "Line 7: Invalid UUID format for event_id: 'malformed-id-1'",
    "Line 21: Invalid date format for start_date: '2023/01/03 10:00'"
  ],
  "startTime": "2023-06-25T10:00:00Z",
  "endTime": "2023-06-25T10:00:05Z"
}
```

**Status Values:**
- `PENDING`: Job created, not yet started
- `PROCESSING`: Currently processing file
- `COMPLETED`: Successfully completed
- `FAILED`: Job failed with errors

---

### **3. GET /api/timeline/:rootEventId**
Get hierarchical timeline for an event with nested children.

**Parameters:**
- `rootEventId` (path parameter): UUID of root event

**cURL Example:**
```bash
curl http://localhost:3000/api/timeline/a1b2c3d4-e5f6-7890-1234-567890abcdef
```

**Response (200 OK):**
```json
{
  "event_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "event_name": "Founding of ArchaeoData",
  "description": "Initial establishment of the company, focusing on data salvage.",
  "start_date": "2023-01-01T10:00:00.000Z",
  "end_date": "2023-01-01T11:30:00.000Z",
  "duration_minutes": 90,
  "parent_event_id": null,
  "children": [
    {
      "event_id": "f7e6d5c4-b3a2-1098-7654-3210fedcba98",
      "event_name": "Phase 1 Research",
      "description": "Early research on data fragmentation techniques.",
      "start_date": "2023-01-01T10:30:00.000Z",
      "end_date": "2023-01-01T11:00:00.000Z",
      "duration_minutes": 30,
      "parent_event_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "children": []
    }
  ]
}
```

**Error Responses:**
- `404 Not Found`: Event with specified ID does not exist

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

**cURL Examples:**
```bash
# Search by name
curl "http://localhost:3000/api/events/search?name=phase&sortBy=start_date&sortOrder=asc"

# Search by date range
curl "http://localhost:3000/api/events/search?start_date_after=2023-01-05T00:00:00Z&end_date_before=2023-01-10T23:59:59Z"

# With pagination
curl "http://localhost:3000/api/events/search?page=2&limit=20"
```

**Response (200 OK):**
```json
{
  "totalEvents": 2,
  "page": 1,
  "limit": 5,
  "events": [
    {
      "event_id": "f7e6d5c4-b3a2-1098-7654-3210fedcba98",
      "event_name": "Phase 1 Research",
      "start_date": "2023-01-01T10:30:00.000Z",
      "end_date": "2023-01-01T11:00:00.000Z",
      "duration_minutes": 30
    }
  ]
}
```

---

### **5. GET /api/insights/overlapping-events**
Find all events with overlapping timeframes.

**cURL Example:**
```bash
curl http://localhost:3000/api/insights/overlapping-events
```

**Response (200 OK):**
```json
[
  {
    "overlappingEventPairs": [
      {
        "event_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
        "event_name": "Founding of ArchaeoData",
        "start_date": "2023-01-01T10:00:00.000Z",
        "end_date": "2023-01-01T11:30:00.000Z"
      },
      {
        "event_id": "f7e6d5c4-b3a2-1098-7654-3210fedcba98",
        "event_name": "Phase 1 Research",
        "start_date": "2023-01-01T10:30:00.000Z",
        "end_date": "2023-01-01T11:00:00.000Z"
      }
    ],
    "overlap_duration_minutes": 30
  }
]
```

**Returns:** Array of overlapping event pairs, sorted by overlap duration (descending)

---

### **6. GET /api/insights/temporal-gaps**
Find the largest temporal gap in recorded events within a specified date range.

**Query Parameters:**
- `startDate` (required): Start of analysis range (ISO 8601)
- `endDate` (required): End of analysis range (ISO 8601)

**cURL Example:**
```bash
curl "http://localhost:3000/api/insights/temporal-gaps?startDate=2023-01-01T00:00:00Z&endDate=2023-01-20T00:00:00Z"
```

**Response (200 OK):**
```json
{
  "largestGap": {
    "startOfGap": "2023-01-10T16:00:00.000Z",
    "endOfGap": "2023-01-15T09:00:00.000Z",
    "durationMinutes": 6780,
    "precedingEvent": {
      "event_id": "9b8a7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
      "event_name": "Marketing Campaign Launch",
      "end_date": "2023-01-10T16:00:00.000Z"
    },
    "succeedingEvent": {
      "event_id": "0d9e8f7a-6b5c-4d3e-2f1a-0b9c8d7e6f5a",
      "event_name": "Customer Onboarding Phase",
      "start_date": "2023-01-15T09:00:00.000Z"
    }
  },
  "message": "Largest temporal gap identified."
}
```

**Error Responses:**
- `400 Bad Request`: Missing required parameters (startDate or endDate)

---

### **7. GET /api/insights/event-influence**
Find shortest path between two events based on parent-child relationships and cumulative duration.

**Query Parameters:**
- `sourceEventId` (required): Starting event UUID
- `targetEventId` (required): Target event UUID

**cURL Example:**
```bash
curl "http://localhost:3000/api/insights/event-influence?sourceEventId=d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a&targetEventId=c6d7e8f9-a0b1-c2d3-e4f5-a6b7c8d9e0f1"
```

**Response (200 OK - Path Found):**
```json
{
  "sourceEventId": "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a",
  "targetEventId": "c6d7e8f9-a0b1-c2d3-e4f5-a6b7c8d9e0f1",
  "shortestPath": [
    {
      "event_id": "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a",
      "event_name": "Project Gaia Initiation",
      "duration_minutes": 60
    },
    {
      "event_id": "a4b5c6d7-e8f9-a0b1-c2d3-e4f5a6b7c8d9",
      "event_name": "Algorithm Development",
      "duration_minutes": 480
    },
    {
      "event_id": "b5c6d7e8-f9a0-b1c2-d3e4-f5a6b7c8d9e0",
      "event_name": "Model Training",
      "duration_minutes": 960
    },
    {
      "event_id": "c6d7e8f9-a0b1-c2d3-e4f5-a6b7c8d9e0f1",
      "event_name": "Deployment Planning",
      "duration_minutes": 180
    }
  ],
  "totalDurationMinutes": 1680,
  "message": "Shortest temporal path found from source to target event."
}
```

**Response (200 OK - No Path):**
```json
{
  "sourceEventId": "9b8a7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
  "targetEventId": "c8d7e6f5-a4b3-2109-8765-4321fedcba98",
  "shortestPath": [],
  "totalDurationMinutes": 0,
  "message": "No temporal path found from source to target event."
}
```

**Error Responses:**
- `400 Bad Request`: Missing required parameters (sourceEventId or targetEventId)

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
