const ingestionService = require('../services/ingestionService');
const timelineService = require('../services/timelineService');
const path = require('path');
const fs = require('fs');

class EventsController {
  /**
   * Initiates file ingestion for historical events data
   * Supports both multipart file upload and server file path modes
   * Validates input and starts async ingestion job
   *
   * @param {Object} req.file - Uploaded file (multipart mode, optional)
   * @param {Object} req.body - filePath (server path mode, optional)
   * @returns {Object} 202 - Ingestion job initiated with jobId
   * @returns {Object} 400 - Error if no file or filePath provided, or file not found
   */
  async ingest(req, res, next) {
    try {
      let filePath;
      let isUploadedFile = false;

      // Option 1: File upload (multipart/form-data)
      if (req.file) {
        filePath = req.file.path;
        isUploadedFile = true;
      }
      // Option 2: Server file path (application/json)
      else if (req.body && req.body.filePath) {
        const requestedPath = req.body.filePath;

        const resolvedPath = path.resolve(requestedPath);

        // Check if file exists
        if (!fs.existsSync(resolvedPath)) {
          return res.status(400).json({
            error: 'File not found on server',
            detail: `No file exists at path: ${requestedPath}`,
          });
        }

        // Security Note: This endpoint allows reading any file on the server
        // See README.md for security recommendations

        filePath = resolvedPath;
        isUploadedFile = false;
      }
      else {
        return res.status(400).json({
          error: 'File is required',
          detail: 'Either upload a file (multipart/form-data) or provide a server filePath (application/json).',
        });
      }

      const jobId = await ingestionService.startIngestion(filePath);

      res.status(202).json({
        status: 'Ingestion initiated',
        jobId,
        message: `Check /api/events/ingestion-status/${jobId} for updates.`,
        ingestionMode: isUploadedFile ? 'file-upload' : 'server-file-path',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves the current status and progress of an ingestion job
   * Returns job details including processed lines, errors, and completion status
   *
   * @param {Object} req.params - jobId (UUID, required)
   * @returns {Object} 200 - Job status with progress details and errors
   * @returns {Object} 404 - Error if job not found
   */
  async getIngestionStatus(req, res, next) {
    try {
      const { jobId } = req.params;

      const status = await ingestionService.getJobStatus(jobId);

      if (!status) {
        return res.status(404).json({
          error: 'Job not found',
        });
      }

      res.json(status);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves complete hierarchical timeline for a root event
   * Returns nested structure with all child events recursively included
   *
   * @param {Object} req.params - rootEventId (UUID, required)
   * @returns {Object} 200 - Hierarchical timeline with nested children
   * @returns {Object} 404 - Error if event not found
   */
  async getTimeline(req, res, next) {
    try {
      const { rootEventId } = req.params;

      const timeline = await timelineService.getTimeline(rootEventId);

      res.json(timeline);
    } catch (error) {
      if (error.message === 'Event not found') {
        return res.status(404).json({ error: 'Event not found' });
      }
      next(error);
    }
  }

  /**
   * Searches for events with filters, sorting, and pagination
   * Supports name matching, date range filtering, and customizable sort order
   *
   * @param {Object} req.query - name (optional), start_date_after (ISO 8601, optional), end_date_before (ISO 8601, optional), sortBy (optional), sortOrder (asc/desc, optional), page (number, optional), limit (number, optional)
   * @returns {Object} 200 - Search results with pagination metadata
   */
  async search(req, res, next) {
    try {
      const {
        name,
        start_date_after,
        end_date_before,
        sortBy,
        sortOrder,
        page,
        limit,
      } = req.query;

      const filters = {
        name,
        start_date_after,
        end_date_before,
        sortBy,
        sortOrder,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
      };

      const results = await timelineService.searchEvents(filters);

      res.json(results);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EventsController();
