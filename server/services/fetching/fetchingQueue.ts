/**
 * Data Fetching Queue
 * 
 * Manages and executes data fetching jobs
 */

import { FetchingJob, FetchingJobImpl, FetchingJobStatus, JobPriority, CreateFetchingJobOptions } from './fetchingJob';

/**
 * Comparison function for sorting jobs by priority and due time
 */
function compareJobs(a: FetchingJob, b: FetchingJob): number {
  // Get numeric priority values (higher value = higher priority)
  const priorityValues: Record<JobPriority, number> = {
    [JobPriority.LOW]: 0,
    [JobPriority.NORMAL]: 1,
    [JobPriority.HIGH]: 2,
    [JobPriority.URGENT]: 3
  };
  
  // First compare by priority
  const priorityDiff = priorityValues[b.priority] - priorityValues[a.priority];
  if (priorityDiff !== 0) {
    return priorityDiff;
  }
  
  // If priority is the same, compare by next run time
  if (a.nextRunAt && b.nextRunAt) {
    return a.nextRunAt.getTime() - b.nextRunAt.getTime();
  } else if (a.nextRunAt) {
    return -1; // a has a nextRunAt but b doesn't, so a comes first
  } else if (b.nextRunAt) {
    return 1; // b has a nextRunAt but a doesn't, so b comes first
  }
  
  // If both don't have nextRunAt, compare by creation time
  return a.createdAt.getTime() - b.createdAt.getTime();
}

/**
 * Data fetching queue for managing and executing jobs
 */
export class FetchingQueue {
  private jobs: Map<string, FetchingJob> = new Map();
  private runningJobs: Set<string> = new Set();
  private maxConcurrentJobs: number;
  private processingInterval: NodeJS.Timeout | null = null;
  private jobProcessor: (job: FetchingJob) => Promise<any>;
  private persistJobs: (jobs: FetchingJob[]) => Promise<void>;
  private loadJobs: () => Promise<FetchingJob[]>;
  
  /**
   * Create a new fetching queue
   * 
   * @param jobProcessor - Function to process a job
   * @param options - Queue options
   */
  constructor(
    jobProcessor: (job: FetchingJob) => Promise<any>,
    options: {
      maxConcurrentJobs?: number;
      processingIntervalMs?: number;
      persistJobs?: (jobs: FetchingJob[]) => Promise<void>;
      loadJobs?: () => Promise<FetchingJob[]>;
    } = {}
  ) {
    this.jobProcessor = jobProcessor;
    this.maxConcurrentJobs = options.maxConcurrentJobs || 5;
    this.persistJobs = options.persistJobs || (async () => {});
    this.loadJobs = options.loadJobs || (async () => []);
    
    // Start processing jobs at the specified interval
    const processingIntervalMs = options.processingIntervalMs || 5000;
    this.processingInterval = setInterval(() => this.processJobs(), processingIntervalMs);
  }
  
  /**
   * Initialize the queue by loading saved jobs
   */
  public async initialize(): Promise<void> {
    try {
      const savedJobs = await this.loadJobs();
      
      // Add all loaded jobs to the queue
      for (const job of savedJobs) {
        this.jobs.set(job.id, job);
      }
      
      console.log(`Loaded ${savedJobs.length} jobs from storage`);
    } catch (error) {
      console.error('Error loading saved jobs:', error);
    }
  }
  
  /**
   * Add a job to the queue
   */
  public async addJob(options: CreateFetchingJobOptions): Promise<FetchingJob> {
    const job = new FetchingJobImpl(options);
    this.jobs.set(job.id, job);
    
    // Persist jobs
    await this.persistJobs(Array.from(this.jobs.values()));
    
    return job;
  }
  
  /**
   * Get a job by ID
   */
  public getJob(jobId: string): FetchingJob | undefined {
    return this.jobs.get(jobId);
  }
  
  /**
   * Get all jobs
   */
  public getAllJobs(): FetchingJob[] {
    return Array.from(this.jobs.values());
  }
  
  /**
   * Get jobs by user ID
   */
  public getJobsByUser(userId: number): FetchingJob[] {
    return Array.from(this.jobs.values()).filter(job => job.userId === userId);
  }
  
  /**
   * Get pending jobs due for processing
   */
  public getPendingJobs(): FetchingJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.status === FetchingJobStatus.PENDING && job.isDue())
      .sort(compareJobs);
  }
  
  /**
   * Process jobs in the queue
   */
  private async processJobs(): Promise<void> {
    // Check if we can process more jobs
    const availableSlots = this.maxConcurrentJobs - this.runningJobs.size;
    if (availableSlots <= 0) {
      return;
    }
    
    // Get pending jobs sorted by priority
    const pendingJobs = this.getPendingJobs();
    
    // Process up to available slots
    const jobsToProcess = pendingJobs.slice(0, availableSlots);
    
    for (const job of jobsToProcess) {
      // Mark as running and add to running set
      job.markAsRunning();
      this.runningJobs.add(job.id);
      
      // Process the job
      this.processJob(job).catch(error => {
        console.error(`Error processing job ${job.id}:`, error);
      });
    }
    
    // If any jobs were started, save the updated state
    if (jobsToProcess.length > 0) {
      await this.persistJobs(Array.from(this.jobs.values()));
    }
  }
  
  /**
   * Process a single job
   */
  private async processJob(job: FetchingJob): Promise<void> {
    try {
      // Execute the job
      const result = await this.jobProcessor(job);
      
      // Mark as completed
      job.markAsCompleted(result);
    } catch (error) {
      // Mark as failed with error
      job.markAsFailed(error as Error);
    } finally {
      // Remove from running jobs
      this.runningJobs.delete(job.id);
      
      // Clean up completed one-time jobs
      if (job.status === FetchingJobStatus.COMPLETED && !job.nextRunAt) {
        this.jobs.delete(job.id);
      }
      
      // Persist updated jobs
      await this.persistJobs(Array.from(this.jobs.values()));
    }
  }
  
  /**
   * Cancel a job
   */
  public async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }
    
    // Can't cancel running jobs
    if (job.status === FetchingJobStatus.RUNNING) {
      return false;
    }
    
    job.markAsCancelled();
    
    // Remove from queue if it's not running
    if (!this.runningJobs.has(jobId)) {
      this.jobs.delete(jobId);
    }
    
    // Persist updated jobs
    await this.persistJobs(Array.from(this.jobs.values()));
    
    return true;
  }
  
  /**
   * Update a job's parameters
   */
  public async updateJobParameters(jobId: string, parameters: Record<string, any>): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }
    
    // Can't update running jobs
    if (job.status === FetchingJobStatus.RUNNING) {
      return false;
    }
    
    // Update parameters
    job.parameters = { ...job.parameters, ...parameters };
    job.updatedAt = new Date();
    
    // Persist updated jobs
    await this.persistJobs(Array.from(this.jobs.values()));
    
    return true;
  }
  
  /**
   * Stop the queue
   */
  public stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}