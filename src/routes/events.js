const express = require('express');
const router = express.Router();
const multer = require('multer');
const eventsController = require('../controllers/eventsController');

//  multer for file uploads
const upload = multer({
  dest: 'uploads/', // create a temporary directory for uploaded files
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size, extra comment: this can be a const which can be passed here
  },
});


/**
 * Endpoint: POST /api/events/ingest
 * Initiate file ingestion for historical events data
 * Supports both file upload (multipart/form-data) and server file path (application/json)
 */
router.post('/ingest', upload.single('file'), eventsController.ingest.bind(eventsController));

/**
 * Endpoint: GET /api/events/ingestion-status/:jobId
 * Retrieve the status and progress of an ingestion job
 */
router.get('/ingestion-status/:jobId', eventsController.getIngestionStatus.bind(eventsController));

/**
 * Endpoint: GET /api/timeline/:rootEventId
 * Retrieve complete hierarchical timeline for a root event with all nested children
 */
router.get('/timeline/:rootEventId', eventsController.getTimeline.bind(eventsController));

/**
 * Endpoint: GET /api/events/search
 * Search for events with filters (name, date range), sorting, and pagination
 */
router.get('/search', eventsController.search.bind(eventsController));

module.exports = router;
