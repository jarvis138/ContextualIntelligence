/**
 * Scheduling Service
 * 
 * Manages scheduling for data fetching jobs
 */

import cron from 'node-cron';
import { FetchingJob, FetchingJobImpl, CreateFetchingJobOptions, ScheduleType } from '../fetching/fetchingJob';
import { FetchingQueue } from '../fetching/fetchingQueue';
import { JobProcessor } from '../fetching/jobProcessor';
import { ConnectorType } from '../connectors/connectorFactory';

/**
 * Service for managing scheduled data fetching
 */
export class SchedulingService {
  private static instance: SchedulingService;
  private queue: FetchingQueue;
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private initialized = false;
  
  /**
   * Get singleton instance of the scheduling service
   */
  public static getInstance(): SchedulingService {
    if (!SchedulingService.instance) {
      SchedulingService.instance = new SchedulingService();
    }
    return SchedulingService.instance;
  }
  
  /**
   * Initialize the scheduling service
   */
  public async initialize(
    jobProcessor: JobProcessor,
    options: {
      loadJobs?: () => Promise<FetchingJob[]>;
      persistJobs?: (jobs: FetchingJob[]) => Promise<void>;
      maxConcurrentJobs?: number;
    } = {}
  ): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // Create the fetching queue
    this.queue = new FetchingQueue(
      (job) => jobProcessor.processJob(job),
      {
        maxConcurrentJobs: options.maxConcurrentJobs || 5,
        loadJobs: options.loadJobs,
        persistJobs: options.persistJobs
      }
    );
    
    // Initialize the queue
    await this.queue.initialize();
    
    // Setup cron jobs for CRON-type schedules
    const allJobs = this.queue.getAllJobs();
    for (const job of allJobs) {
      if (job.scheduleType === ScheduleType.CRON && job.scheduleValue) {
        this.setupCronJob(job);
      }
    }
    
    this.initialized = true;
  }
  
  /**
   * Set up a cron job for a fetching job
   */
  private setupCronJob(job: FetchingJob): void {
    if (job.scheduleType !== ScheduleType.CRON || !job.scheduleValue) {
      return;
    }
    
    // Check if cron expression is valid
    if (!cron.validate(job.scheduleValue)) {
      console.error(`Invalid cron expression: ${job.scheduleValue}`);
      return;
    }
    
    // Cancel existing cron job if it exists
    if (this.cronJobs.has(job.id)) {
      this.cronJobs.get(job.id)?.stop();
      this.cronJobs.delete(job.id);
    }
    
    // Create new cron job
    const cronJob = cron.schedule(job.scheduleValue, async () => {
      // Get the job from the queue (it might have been updated)
      const currentJob = this.queue.getJob(job.id);
      if (!currentJob) {
        // Job has been removed, stop the cron job
        this.cronJobs.get(job.id)?.stop();
        this.cronJobs.delete(job.id);
        return;
      }
      
      // Update the job to be due now
      currentJob.nextRunAt = new Date();
      
      // Fetching queue will process the job on its next cycle
    });
    
    // Store the cron job
    this.cronJobs.set(job.id, cronJob);
  }
  
  /**
   * Schedule a data fetching job
   */
  public async scheduleJob(options: CreateFetchingJobOptions): Promise<FetchingJob> {
    // Create the job
    const job = await this.queue.addJob(options);
    
    // Set up cron job if needed
    if (job.scheduleType === ScheduleType.CRON && job.scheduleValue) {
      this.setupCronJob(job);
    }
    
    return job;
  }
  
  /**
   * Get a scheduled job by ID
   */
  public getJob(jobId: string): FetchingJob | undefined {
    return this.queue.getJob(jobId);
  }
  
  /**
   * Get all scheduled jobs
   */
  public getAllJobs(): FetchingJob[] {
    return this.queue.getAllJobs();
  }
  
  /**
   * Get scheduled jobs for a user
   */
  public getJobsByUser(userId: number): FetchingJob[] {
    return this.queue.getJobsByUser(userId);
  }
  
  /**
   * Cancel a scheduled job
   */
  public async cancelJob(jobId: string): Promise<boolean> {
    // Cancel cron job if it exists
    if (this.cronJobs.has(jobId)) {
      this.cronJobs.get(jobId)?.stop();
      this.cronJobs.delete(jobId);
    }
    
    // Cancel the job in the queue
    return this.queue.cancelJob(jobId);
  }
  
  /**
   * Update a scheduled job's parameters
   */
  public async updateJobParameters(jobId: string, parameters: Record<string, any>): Promise<boolean> {
    return this.queue.updateJobParameters(jobId, parameters);
  }
  
  /**
   * Create a schedule to fetch Google Drive files
   */
  public async scheduleDriveFilesFetch(
    userId: number,
    scheduleType: ScheduleType,
    scheduleValue: string,
    parameters: Record<string, any> = {}
  ): Promise<FetchingJob> {
    return this.scheduleJob({
      userId,
      connectorType: ConnectorType.GOOGLE_DRIVE,
      dataType: 'files',
      parameters,
      scheduleType,
      scheduleValue
    });
  }
  
  /**
   * Create a schedule to fetch Slack conversations
   */
  public async scheduleSlackConversationsFetch(
    userId: number,
    scheduleType: ScheduleType,
    scheduleValue: string,
    parameters: Record<string, any> = {}
  ): Promise<FetchingJob> {
    return this.scheduleJob({
      userId,
      connectorType: ConnectorType.SLACK,
      dataType: 'conversations',
      parameters,
      scheduleType,
      scheduleValue
    });
  }
  
  /**
   * Create a schedule to fetch Gmail messages
   */
  public async scheduleGmailMessagesFetch(
    userId: number,
    scheduleType: ScheduleType,
    scheduleValue: string,
    parameters: Record<string, any> = {}
  ): Promise<FetchingJob> {
    return this.scheduleJob({
      userId,
      connectorType: ConnectorType.GMAIL,
      dataType: 'messages',
      parameters,
      scheduleType,
      scheduleValue
    });
  }
  
  /**
   * Create a schedule to fetch Microsoft Graph messages
   */
  public async scheduleMicrosoftGraphMessagesFetch(
    userId: number,
    scheduleType: ScheduleType,
    scheduleValue: string,
    parameters: Record<string, any> = {}
  ): Promise<FetchingJob> {
    return this.scheduleJob({
      userId,
      connectorType: ConnectorType.MICROSOFT_GRAPH,
      dataType: 'messages',
      parameters,
      scheduleType,
      scheduleValue
    });
  }
  
  /**
   * Create a common schedule for all data sources
   */
  public async scheduleAllSourcesFetch(
    userId: number,
    scheduleType: ScheduleType,
    scheduleValue: string
  ): Promise<FetchingJob[]> {
    const jobs: FetchingJob[] = [];
    
    // Schedule Google Drive files fetch
    try {
      const driveJob = await this.scheduleDriveFilesFetch(userId, scheduleType, scheduleValue);
      jobs.push(driveJob);
    } catch (error) {
      console.error('Error scheduling Google Drive fetch:', error);
    }
    
    // Schedule Slack conversations fetch
    try {
      const slackJob = await this.scheduleSlackConversationsFetch(userId, scheduleType, scheduleValue);
      jobs.push(slackJob);
    } catch (error) {
      console.error('Error scheduling Slack fetch:', error);
    }
    
    // Schedule Gmail messages fetch
    try {
      const gmailJob = await this.scheduleGmailMessagesFetch(userId, scheduleType, scheduleValue);
      jobs.push(gmailJob);
    } catch (error) {
      console.error('Error scheduling Gmail fetch:', error);
    }
    
    // Schedule Microsoft Graph messages fetch
    try {
      const msGraphJob = await this.scheduleMicrosoftGraphMessagesFetch(userId, scheduleType, scheduleValue);
      jobs.push(msGraphJob);
    } catch (error) {
      console.error('Error scheduling Microsoft Graph fetch:', error);
    }
    
    return jobs;
  }
  
  /**
   * Stop the scheduling service
   */
  public stop(): void {
    // Stop all cron jobs
    for (const cronJob of this.cronJobs.values()) {
      cronJob.stop();
    }
    this.cronJobs.clear();
    
    // Stop the queue
    this.queue.stop();
    
    this.initialized = false;
  }
}