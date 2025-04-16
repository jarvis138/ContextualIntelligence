/**
 * Data Scheduling Service
 * 
 * This service manages the scheduling and execution of data fetching jobs.
 * It periodically checks for jobs that need to be executed and processes them.
 */

import { logger } from './observability';
import { metrics } from './observability/metrics-util';
import { connectorService } from './connectors';
import { elasticsearchService } from './elasticsearch';
import { relationshipDiscoveryService } from './relationshipDiscovery';
import { FetchingJob } from '@shared/schema';

/**
 * Data Scheduler Service Class
 */
export class DataSchedulerService {
  private isRunning: boolean = false;
  private pollingInterval: number = 60000; // 1 minute
  private timer: NodeJS.Timeout | null = null;

  /**
   * Start the scheduler
   */
  start(pollingIntervalMs?: number): void {
    if (this.isRunning) {
      logger.warn('Data scheduler is already running');
      return;
    }

    if (pollingIntervalMs) {
      this.pollingInterval = pollingIntervalMs;
    }

    this.isRunning = true;
    logger.info('Starting data scheduler', { pollingInterval: this.pollingInterval });

    // Run immediately on start
    this.processJobs();

    // Set up polling
    this.timer = setInterval(() => {
      this.processJobs();
    }, this.pollingInterval);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Data scheduler is not running');
      return;
    }

    logger.info('Stopping data scheduler');

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.isRunning = false;
  }

  /**
   * Check for and process pending jobs
   */
  async processJobs(): Promise<number> {
    if (!this.isRunning) {
      return 0;
    }

    const startTime = Date.now();
    let processedJobs = 0;

    try {
      // Get pending jobs
      const pendingJobs = await connectorService.getPendingJobs();
      
      if (pendingJobs.length === 0) {
        return 0;
      }
      
      logger.info('Processing pending jobs', { count: pendingJobs.length });
      metrics.increment('scheduler_job_batches_total');

      // Process each job
      for (const job of pendingJobs) {
        try {
          // Update job status to in_progress
          await connectorService.updateJobStatus(job.jobId, 'in_progress');

          // Execute the job
          const result = await this.executeJob(job);

          // Update job status based on result
          if (result.success) {
            await connectorService.updateJobStatus(
              job.jobId, 
              job.scheduleType === 'interval' ? 'scheduled' : 'completed', 
              result.summary
            );
          } else {
            await connectorService.updateJobStatus(
              job.jobId, 
              'failed', 
              null, 
              result.error
            );
          }

          processedJobs++;
        } catch (error) {
          logger.error('Error processing job', { 
            error, 
            jobId: job.jobId, 
            connectorType: job.connectorType 
          });
          
          // Update job status to failed
          await connectorService.updateJobStatus(
            job.jobId, 
            'failed', 
            null, 
            error.message || 'Unknown error'
          );
          
          metrics.increment('scheduler_job_errors_total');
        }
      }

      metrics.increment('scheduler_jobs_processed_total', { count: processedJobs });
      metrics.histogram('scheduler_processing_duration', Date.now() - startTime);

      return processedJobs;
    } catch (error) {
      logger.error('Error in job processing', { error });
      metrics.increment('scheduler_errors_total');
      return processedJobs;
    }
  }

  /**
   * Execute a specific job
   */
  private async executeJob(job: FetchingJob): Promise<{ success: boolean; summary?: any; error?: string }> {
    try {
      logger.info('Executing job', { 
        jobId: job.jobId, 
        connectorType: job.connectorType, 
        dataType: job.dataType 
      });
      
      // Execute the connector operation
      const result = await connectorService.executeConnector(
        job.connectorType, 
        `fetch${job.dataType.charAt(0).toUpperCase() + job.dataType.slice(1)}`, 
        {
          userId: job.userId,
          jobId: job.jobId,
          ...job.parameters
        }
      );
      
      // Process data items if available
      if (result.items && result.items.length > 0) {
        // Index data in Elasticsearch
        await elasticsearchService.indexFetchedData(result.items);
        
        // Discover relationships
        await relationshipDiscoveryService.discoverRelationships(result.items);
        
        // Store fetched data
        await connectorService.storeFetchedData(result.items);
      }
      
      metrics.increment('scheduler_job_success_total', { 
        connectorType: job.connectorType, 
        dataType: job.dataType 
      });
      
      return { 
        success: true, 
        summary: {
          itemCount: result.items?.length || 0,
          totalSize: result.totalSize || 0,
          executionTime: result.executionTime || 0
        }
      };
    } catch (error) {
      logger.error('Error executing job', { 
        error, 
        jobId: job.jobId, 
        connectorType: job.connectorType 
      });
      
      metrics.increment('scheduler_job_errors_total', { 
        connectorType: job.connectorType, 
        dataType: job.dataType
      });
      
      return { 
        success: false, 
        error: error.message || 'Unknown error during job execution' 
      };
    }
  }

  /**
   * Get current scheduler status
   */
  getStatus(): { 
    isRunning: boolean; 
    pollingInterval: number;
    uptime?: number;
    startTime?: number;
  } {
    return {
      isRunning: this.isRunning,
      pollingInterval: this.pollingInterval,
      uptime: this.isRunning ? Date.now() - this.startTime : undefined,
      startTime: this.isRunning ? this.startTime : undefined
    };
  }

  private startTime: number = 0;
}

export const dataSchedulerService = new DataSchedulerService();