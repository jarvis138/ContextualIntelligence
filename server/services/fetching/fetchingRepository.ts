/**
 * Fetching Repository
 * 
 * Database repository for storing and retrieving fetching jobs
 */

import { pool, db } from '../../db';
import { FetchingJob, FetchingJobImpl, FetchingJobStatus, JobPriority, ScheduleType } from './fetchingJob';
import { ConnectorType } from '../connectors/connectorFactory';
import { executeWithRetry } from '../../utils/rateLimiting';

/**
 * Repository for fetching jobs
 */
export class FetchingRepository {
  /**
   * Save a fetching job to the database
   */
  public async saveJob(job: FetchingJob): Promise<void> {
    try {
      const existingJob = await this.getJobById(job.id);
      
      if (existingJob) {
        // Update existing job
        await executeWithRetry(async () => {
          await pool.query(
            `UPDATE fetching_jobs
            SET 
              connector_type = $1,
              data_type = $2,
              parameters = $3,
              status = $4,
              priority = $5,
              schedule_type = $6,
              schedule_value = $7,
              last_run_at = $8,
              next_run_at = $9,
              updated_at = NOW(),
              retries_left = $10,
              max_retries = $11,
              error = $12,
              result = $13,
              progress = $14
            WHERE id = $15`,
            [
              job.connectorType,
              job.dataType,
              JSON.stringify(job.parameters),
              job.status,
              job.priority,
              job.scheduleType,
              job.scheduleValue,
              job.lastRunAt,
              job.nextRunAt,
              job.retriesLeft,
              job.maxRetries,
              job.error,
              job.result ? JSON.stringify(job.result) : null,
              job.progress,
              job.id
            ]
          );
        });
      } else {
        // Insert new job
        await executeWithRetry(async () => {
          await pool.query(
            `INSERT INTO fetching_jobs (
              id, 
              user_id, 
              connector_type, 
              data_type, 
              parameters, 
              status, 
              priority, 
              schedule_type, 
              schedule_value, 
              last_run_at, 
              next_run_at, 
              created_at, 
              updated_at, 
              retries_left, 
              max_retries, 
              error, 
              result, 
              progress
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
            )`,
            [
              job.id,
              job.userId,
              job.connectorType,
              job.dataType,
              JSON.stringify(job.parameters),
              job.status,
              job.priority,
              job.scheduleType,
              job.scheduleValue,
              job.lastRunAt,
              job.nextRunAt,
              job.createdAt,
              job.updatedAt,
              job.retriesLeft,
              job.maxRetries,
              job.error,
              job.result ? JSON.stringify(job.result) : null,
              job.progress
            ]
          );
        });
      }
    } catch (error) {
      console.error('Error saving fetching job:', error);
      throw error;
    }
  }
  
  /**
   * Get a fetching job by ID
   */
  public async getJobById(jobId: string): Promise<FetchingJob | null> {
    try {
      const result = await executeWithRetry(async () => {
        return await pool.query(
          `SELECT * FROM fetching_jobs WHERE id = $1`,
          [jobId]
        );
      });
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToJob(result.rows[0]);
    } catch (error) {
      console.error(`Error getting fetching job ${jobId}:`, error);
      return null;
    }
  }
  
  /**
   * Get all fetching jobs
   */
  public async getAllJobs(): Promise<FetchingJob[]> {
    try {
      const result = await executeWithRetry(async () => {
        return await pool.query(`SELECT * FROM fetching_jobs`);
      });
      
      return result.rows.map(row => this.mapRowToJob(row));
    } catch (error) {
      console.error('Error getting all fetching jobs:', error);
      return [];
    }
  }
  
  /**
   * Get fetching jobs by user ID
   */
  public async getJobsByUser(userId: number): Promise<FetchingJob[]> {
    try {
      const result = await executeWithRetry(async () => {
        return await pool.query(
          `SELECT * FROM fetching_jobs WHERE user_id = $1`,
          [userId]
        );
      });
      
      return result.rows.map(row => this.mapRowToJob(row));
    } catch (error) {
      console.error(`Error getting fetching jobs for user ${userId}:`, error);
      return [];
    }
  }
  
  /**
   * Get pending jobs
   */
  public async getPendingJobs(): Promise<FetchingJob[]> {
    try {
      const result = await executeWithRetry(async () => {
        return await pool.query(
          `SELECT * FROM fetching_jobs 
          WHERE 
            status = $1 AND 
            (next_run_at IS NULL OR next_run_at <= NOW())
          ORDER BY 
            CASE 
              WHEN priority = 'urgent' THEN 0
              WHEN priority = 'high' THEN 1
              WHEN priority = 'normal' THEN 2
              ELSE 3
            END,
            next_run_at ASC NULLS FIRST`,
          [FetchingJobStatus.PENDING]
        );
      });
      
      return result.rows.map(row => this.mapRowToJob(row));
    } catch (error) {
      console.error('Error getting pending fetching jobs:', error);
      return [];
    }
  }
  
  /**
   * Delete a fetching job
   */
  public async deleteJob(jobId: string): Promise<boolean> {
    try {
      const result = await executeWithRetry(async () => {
        return await pool.query(
          `DELETE FROM fetching_jobs WHERE id = $1`,
          [jobId]
        );
      });
      
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting fetching job ${jobId}:`, error);
      return false;
    }
  }
  
  /**
   * Map a database row to a FetchingJob object
   */
  private mapRowToJob(row: any): FetchingJob {
    const job = new FetchingJobImpl({
      userId: row.user_id,
      connectorType: row.connector_type as ConnectorType,
      dataType: row.data_type,
      parameters: typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters,
      priority: row.priority as JobPriority,
      scheduleType: row.schedule_type as ScheduleType,
      scheduleValue: row.schedule_value,
      maxRetries: row.max_retries
    });
    
    // Override properties from the constructor
    job.id = row.id;
    job.status = row.status as FetchingJobStatus;
    job.lastRunAt = row.last_run_at ? new Date(row.last_run_at) : undefined;
    job.nextRunAt = row.next_run_at ? new Date(row.next_run_at) : undefined;
    job.createdAt = new Date(row.created_at);
    job.updatedAt = new Date(row.updated_at);
    job.retriesLeft = row.retries_left;
    job.error = row.error;
    job.result = row.result ? (typeof row.result === 'string' ? JSON.parse(row.result) : row.result) : undefined;
    job.progress = row.progress;
    
    return job;
  }
}