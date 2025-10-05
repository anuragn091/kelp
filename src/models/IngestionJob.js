const { query } = require('../config/database');

class IngestionJob {
  /**
   * Creates new ingestion job with PENDING status
   * Inserts job_id, file_path, and total_lines into database
   */
  static async create(jobData) {
    const { job_id, file_path, total_lines = 0 } = jobData;

    const sql = `
      INSERT INTO ingestion_jobs (job_id, status, file_path, total_lines)
      VALUES ($1, 'PENDING', $2, $3)
      RETURNING *
    `;

    const result = await query(sql, [job_id, file_path, total_lines]);
    return result.rows[0];
  }

  /**
   * Retrieves single ingestion job by UUID primary key
   * Returns undefined if not found
   */
  static async findById(jobId) {
    const sql = 'SELECT * FROM ingestion_jobs WHERE job_id = $1';
    const result = await query(sql, [jobId]);
    return result.rows[0];
  }

  /**
   * Updates job status and optionally other fields dynamically
   * Builds UPDATE query with variable field list based on additionalData provided
   */
  static async updateStatus(jobId, status, additionalData = {}) {
    const { processed_lines, error_lines, total_lines, errors, end_time } = additionalData;

    const updates = ['status = $2'];
    const params = [jobId, status];
    let paramCount = 3;

    if (processed_lines !== undefined) {
      updates.push(`processed_lines = $${paramCount}`);
      params.push(processed_lines);
      paramCount++;
    }

    if (error_lines !== undefined) {
      updates.push(`error_lines = $${paramCount}`);
      params.push(error_lines);
      paramCount++;
    }

    if (total_lines !== undefined) {
      updates.push(`total_lines = $${paramCount}`);
      params.push(total_lines);
      paramCount++;
    }

    if (errors !== undefined) {
      updates.push(`errors = $${paramCount}`);
      params.push(JSON.stringify(errors));
      paramCount++;
    }

    if (end_time !== undefined) {
      updates.push(`end_time = $${paramCount}`);
      params.push(end_time);
      paramCount++;
    }

    const sql = `
      UPDATE ingestion_jobs
      SET ${updates.join(', ')}
      WHERE job_id = $1
      RETURNING *
    `;

    const result = await query(sql, params);
    return result.rows[0];
  }

  /**
   * Appends error message to errors array and increments error_lines counter
   * Fetches current errors, appends new error, updates as JSON
   */
  static async addError(jobId, errorMessage) {
    const job = await this.findById(jobId);
    if (!job) return null;

    const errors = job.errors || [];
    errors.push(errorMessage);

    const sql = `
      UPDATE ingestion_jobs
      SET errors = $2, error_lines = error_lines + 1
      WHERE job_id = $1
      RETURNING *
    `;

    const result = await query(sql, [jobId, JSON.stringify(errors)]);
    return result.rows[0];
  }

  /**
   * Atomically increments processed_lines counter by 1
   * Uses SQL increment to avoid race conditions
   */
  static async incrementProcessedLines(jobId) {
    const sql = `
      UPDATE ingestion_jobs
      SET processed_lines = processed_lines + 1
      WHERE job_id = $1
      RETURNING *
    `;

    const result = await query(sql, [jobId]);
    return result.rows[0];
  }

  /**
   * Marks job as COMPLETED and sets end_time to current timestamp
   * Wrapper around updateStatus for convenience
   */
  static async markCompleted(jobId) {
    return this.updateStatus(jobId, 'COMPLETED', { end_time: new Date() });
  }

  /**
   * Marks job as FAILED, adds error message, and sets end_time
   * Combines addError and updateStatus operations
   */
  static async markFailed(jobId, errorMessage) {
    await this.addError(jobId, errorMessage);
    return this.updateStatus(jobId, 'FAILED', { end_time: new Date() });
  }
}

module.exports = IngestionJob;
