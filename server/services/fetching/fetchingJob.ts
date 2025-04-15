/**
 * Data Fetching Job Class
 * 
 * Defines the structure and behavior of a data fetching job
 */

import { ConnectorType } from '../connectors/connectorFactory';

/**
 * Status of a fetching job
 */
export enum FetchingJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Type of fetching schedule
 */
export enum ScheduleType {
  ONCE = 'once',
  INTERVAL = 'interval',
  CRON = 'cron',
  MANUAL = 'manual'
}

/**
 * Priority level for fetching jobs
 */
export enum JobPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Fetching job interface
 */
export interface FetchingJob {
  id: string;
  userId: number;
  connectorType: ConnectorType;
  dataType: string;
  parameters: Record<string, any>;
  status: FetchingJobStatus;
  priority: JobPriority;
  scheduleType: ScheduleType;
  scheduleValue?: string;
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  retriesLeft: number;
  maxRetries: number;
  error?: string;
  result?: any;
  progress?: number;
}

/**
 * Options for creating a fetching job
 */
export interface CreateFetchingJobOptions {
  userId: number;
  connectorType: ConnectorType;
  dataType: string;
  parameters: Record<string, any>;
  priority?: JobPriority;
  scheduleType: ScheduleType;
  scheduleValue?: string;
  maxRetries?: number;
}

/**
 * Class representing a data fetching job
 */
export class FetchingJobImpl implements FetchingJob {
  public id: string;
  public userId: number;
  public connectorType: ConnectorType;
  public dataType: string;
  public parameters: Record<string, any>;
  public status: FetchingJobStatus;
  public priority: JobPriority;
  public scheduleType: ScheduleType;
  public scheduleValue?: string;
  public lastRunAt?: Date;
  public nextRunAt?: Date;
  public createdAt: Date;
  public updatedAt: Date;
  public retriesLeft: number;
  public maxRetries: number;
  public error?: string;
  public result?: any;
  public progress?: number;
  
  constructor(options: CreateFetchingJobOptions) {
    // Generate a unique ID
    this.id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    this.userId = options.userId;
    this.connectorType = options.connectorType;
    this.dataType = options.dataType;
    this.parameters = options.parameters;
    this.status = FetchingJobStatus.PENDING;
    this.priority = options.priority || JobPriority.NORMAL;
    this.scheduleType = options.scheduleType;
    this.scheduleValue = options.scheduleValue;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.maxRetries = options.maxRetries || 3;
    this.retriesLeft = this.maxRetries;
    
    // Calculate next run time
    this.calculateNextRunTime();
  }
  
  /**
   * Calculate the next run time based on the schedule
   */
  public calculateNextRunTime(): void {
    // For manual jobs, there's no next run time
    if (this.scheduleType === ScheduleType.MANUAL) {
      this.nextRunAt = undefined;
      return;
    }
    
    // For one-time jobs, use the schedule value as the next run time
    if (this.scheduleType === ScheduleType.ONCE) {
      if (this.scheduleValue) {
        this.nextRunAt = new Date(this.scheduleValue);
      } else {
        // If no schedule value is provided, run immediately
        this.nextRunAt = new Date();
      }
      return;
    }
    
    // For interval jobs, calculate the next run time based on the interval
    if (this.scheduleType === ScheduleType.INTERVAL) {
      const now = new Date();
      
      if (!this.scheduleValue) {
        this.nextRunAt = now;
        return;
      }
      
      // Parse interval (format: number + unit, e.g., "5m", "1h", "1d")
      const match = this.scheduleValue.match(/^(\d+)([mhd])$/);
      if (!match) {
        throw new Error(`Invalid interval format: ${this.scheduleValue}`);
      }
      
      const amount = parseInt(match[1], 10);
      const unit = match[2];
      
      // Calculate next run time based on the last run time or now
      const baseTime = this.lastRunAt || now;
      const nextRunAt = new Date(baseTime);
      
      switch (unit) {
        case 'm': // minutes
          nextRunAt.setMinutes(nextRunAt.getMinutes() + amount);
          break;
        case 'h': // hours
          nextRunAt.setHours(nextRunAt.getHours() + amount);
          break;
        case 'd': // days
          nextRunAt.setDate(nextRunAt.getDate() + amount);
          break;
        default:
          throw new Error(`Unknown interval unit: ${unit}`);
      }
      
      this.nextRunAt = nextRunAt;
      return;
    }
    
    // For CRON jobs, the nextRunAt will be calculated by the scheduler
    // using node-cron or similar library
  }
  
  /**
   * Mark the job as running
   */
  public markAsRunning(): void {
    this.status = FetchingJobStatus.RUNNING;
    this.updatedAt = new Date();
  }
  
  /**
   * Mark the job as completed
   */
  public markAsCompleted(result?: any): void {
    this.status = FetchingJobStatus.COMPLETED;
    this.lastRunAt = new Date();
    this.updatedAt = new Date();
    this.result = result;
    
    // Calculate next run time for recurring jobs
    if (this.scheduleType === ScheduleType.INTERVAL || this.scheduleType === ScheduleType.CRON) {
      this.calculateNextRunTime();
    } else {
      // For one-time jobs, there's no next run
      this.nextRunAt = undefined;
    }
  }
  
  /**
   * Mark the job as failed
   */
  public markAsFailed(error: Error | string): void {
    this.retriesLeft--;
    this.updatedAt = new Date();
    
    if (this.retriesLeft <= 0) {
      // No more retries
      this.status = FetchingJobStatus.FAILED;
      this.error = typeof error === 'string' ? error : error.message;
    } else {
      // Retry later
      this.status = FetchingJobStatus.PENDING;
      // Add exponential backoff for retries: 1min, 5min, 30min
      const backoffMinutes = Math.pow(5, this.maxRetries - this.retriesLeft);
      const nextRun = new Date();
      nextRun.setMinutes(nextRun.getMinutes() + backoffMinutes);
      this.nextRunAt = nextRun;
    }
  }
  
  /**
   * Mark the job as cancelled
   */
  public markAsCancelled(): void {
    this.status = FetchingJobStatus.CANCELLED;
    this.updatedAt = new Date();
    this.nextRunAt = undefined;
  }
  
  /**
   * Update job progress
   */
  public updateProgress(progress: number): void {
    this.progress = Math.min(100, Math.max(0, progress));
    this.updatedAt = new Date();
  }
  
  /**
   * Check if the job is due to run
   */
  public isDue(): boolean {
    if (this.status !== FetchingJobStatus.PENDING) {
      return false;
    }
    
    if (!this.nextRunAt) {
      return false;
    }
    
    return this.nextRunAt <= new Date();
  }
  
  /**
   * Serialize the job to a plain object
   */
  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      userId: this.userId,
      connectorType: this.connectorType,
      dataType: this.dataType,
      parameters: this.parameters,
      status: this.status,
      priority: this.priority,
      scheduleType: this.scheduleType,
      scheduleValue: this.scheduleValue,
      lastRunAt: this.lastRunAt?.toISOString(),
      nextRunAt: this.nextRunAt?.toISOString(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      retriesLeft: this.retriesLeft,
      maxRetries: this.maxRetries,
      error: this.error,
      result: this.result,
      progress: this.progress
    };
  }
  
  /**
   * Create a job from a JSON object
   */
  public static fromJSON(json: Record<string, any>): FetchingJobImpl {
    const job = new FetchingJobImpl({
      userId: json.userId,
      connectorType: json.connectorType,
      dataType: json.dataType,
      parameters: json.parameters,
      priority: json.priority,
      scheduleType: json.scheduleType,
      scheduleValue: json.scheduleValue,
      maxRetries: json.maxRetries
    });
    
    job.id = json.id;
    job.status = json.status;
    job.lastRunAt = json.lastRunAt ? new Date(json.lastRunAt) : undefined;
    job.nextRunAt = json.nextRunAt ? new Date(json.nextRunAt) : undefined;
    job.createdAt = new Date(json.createdAt);
    job.updatedAt = new Date(json.updatedAt);
    job.retriesLeft = json.retriesLeft;
    job.error = json.error;
    job.result = json.result;
    job.progress = json.progress;
    
    return job;
  }
}