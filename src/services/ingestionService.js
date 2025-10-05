const fs = require('fs');
const readline = require('readline');
const { v4: uuidv4 } = require('uuid');
const HistoricalEvent = require('../models/HistoricalEvent');
const IngestionJob = require('../models/IngestionJob');
const { parseEventLine } = require('../utils/validators');

class IngestionService {
  constructor() {
    this.activeJobs = new Map();
  }

  /**
   * Start file ingestion asynchronously
   */
  async startIngestion(filePath) {
    const jobId = `ingest-job-${uuidv4().split('-').join('').slice(0, 10)}`;

    // Count total lines first
    const totalLines = await this.countFileLines(filePath);

    // Create job record
    await IngestionJob.create({
      job_id: jobId,
      file_path: filePath,
      total_lines: totalLines,
    });

    // Start processing asynchronously
    this.processFile(jobId, filePath).catch((error) => {
      console.error(`Job ${jobId} failed:`, error);
      IngestionJob.markFailed(jobId, error.message);
    });

    return jobId;
  }

  /**
   * Count total lines in file
   */
  async countFileLines(filePath) {
    return new Promise((resolve, reject) => {
      let lineCount = 0;
      const stream = fs.createReadStream(filePath);
      const rl = readline.createInterface({ input: stream });

      rl.on('line', () => lineCount++);
      rl.on('close', () => resolve(lineCount));
      rl.on('error', reject);
    });
  }

  /**
   * Process file line by line
   */
  async processFile(jobId, filePath) {
    // Update status to PROCESSING
    await IngestionJob.updateStatus(jobId, 'PROCESSING');

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let lineNumber = 0;
    let processedCount = 0;
    let errorCount = 0;
    const errors = [];

    for await (const line of rl) {
      lineNumber++;

      // Skip empty lines
      if (!line.trim()) {
        continue;
      }

      try {
        // Parse and validate the line
        const eventData = parseEventLine(line, lineNumber);

        // Insert into database
        await HistoricalEvent.create(eventData);

        processedCount++;
        await IngestionJob.incrementProcessedLines(jobId);
      } catch (error) {
        errorCount++;
        const errorMessage = `Line ${lineNumber}: ${error.message}`;
        errors.push(errorMessage);
        await IngestionJob.addError(jobId, errorMessage);

        console.error(errorMessage);
      }
    }

    // Mark job as completed
    await IngestionJob.updateStatus(jobId, 'COMPLETED', {
      end_time: new Date(),
    });

    console.log(`Job ${jobId} completed. Processed: ${processedCount}, Errors: ${errorCount}`);
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId) {
    const job = await IngestionJob.findById(jobId);

    if (!job) {
      return null;
    }

    return {
      jobId: job.job_id,
      status: job.status,
      processedLines: job.processed_lines,
      errorLines: job.error_lines,
      totalLines: job.total_lines,
      errors: job.errors || [],
      startTime: job.start_time,
      endTime: job.end_time,
    };
  }
}

module.exports = new IngestionService();
