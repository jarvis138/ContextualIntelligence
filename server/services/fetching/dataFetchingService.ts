/**
 * Data Fetching Service
 * 
 * Main service for data fetching operations
 */

import { ConnectorType } from '../connectors/connectorFactory';
import { SchedulingService } from '../scheduling/schedulingService';
import { FetchingJob, ScheduleType, JobPriority, CreateFetchingJobOptions } from './fetchingJob';
import { FetchingRepository } from './fetchingRepository';
import { JobProcessor } from './jobProcessor';
import { DataStorageService } from './dataStorageService';
import { ApiTokenService } from '../connectors/apiTokenService';

/**
 * Data fetching service
 */
export class DataFetchingService {
  private static instance: DataFetchingService;
  private schedulingService: SchedulingService;
  private apiTokenService: ApiTokenService;
  private fetchingRepository: FetchingRepository;
  private dataStorageService: DataStorageService;
  private jobProcessor: JobProcessor;
  private initialized = false;
  
  private constructor() {
    this.schedulingService = SchedulingService.getInstance();
    this.apiTokenService = ApiTokenService.getInstance();
    this.fetchingRepository = new FetchingRepository();
    this.dataStorageService = DataStorageService.getInstance();
    
    // Create job processor with auth provider and data storage
    this.jobProcessor = new JobProcessor(
      // Auth provider function
      async (userId, connectorType) => {
        const auth = await this.apiTokenService.getConnectorAuth(userId, connectorType);
        
        if (!auth) {
          throw new Error(`No authentication found for user ${userId} and connector ${connectorType}`);
        }
        
        return auth;
      },
      // Data storage function
      async (userId, connectorType, dataType, data) => {
        await this.dataStorageService.storeData(userId, connectorType, dataType, data);
      }
    );
  }
  
  /**
   * Get singleton instance of the data fetching service
   */
  public static getInstance(): DataFetchingService {
    if (!DataFetchingService.instance) {
      DataFetchingService.instance = new DataFetchingService();
    }
    return DataFetchingService.instance;
  }
  
  /**
   * Initialize the data fetching service
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // Initialize the scheduling service
    await this.schedulingService.initialize(
      this.jobProcessor,
      {
        // Load jobs from the repository
        loadJobs: async () => await this.fetchingRepository.getAllJobs(),
        // Persist jobs to the repository
        persistJobs: async (jobs) => {
          for (const job of jobs) {
            await this.fetchingRepository.saveJob(job);
          }
        }
      }
    );
    
    this.initialized = true;
    console.log('Data fetching service initialized');
  }
  
  /**
   * Schedule a data fetching job
   */
  public async scheduleJob(options: CreateFetchingJobOptions): Promise<FetchingJob> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Use the scheduling service to create the job
    const job = await this.schedulingService.scheduleJob(options);
    
    // Save the job to the repository
    await this.fetchingRepository.saveJob(job);
    
    return job;
  }
  
  /**
   * Get a scheduled job by ID
   */
  public async getJob(jobId: string): Promise<FetchingJob | null> {
    return this.fetchingRepository.getJobById(jobId);
  }
  
  /**
   * Get all scheduled jobs
   */
  public async getAllJobs(): Promise<FetchingJob[]> {
    return this.fetchingRepository.getAllJobs();
  }
  
  /**
   * Get scheduled jobs for a user
   */
  public async getJobsByUser(userId: number): Promise<FetchingJob[]> {
    return this.fetchingRepository.getJobsByUser(userId);
  }
  
  /**
   * Cancel a scheduled job
   */
  public async cancelJob(jobId: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return this.schedulingService.cancelJob(jobId);
  }
  
  /**
   * Update a scheduled job's parameters
   */
  public async updateJobParameters(jobId: string, parameters: Record<string, any>): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return this.schedulingService.updateJobParameters(jobId, parameters);
  }
  
  /**
   * Run a job immediately (bypassing the schedule)
   */
  public async runJobNow(jobId: string): Promise<any> {
    const job = await this.fetchingRepository.getJobById(jobId);
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    // Set next run time to now
    job.nextRunAt = new Date();
    await this.fetchingRepository.saveJob(job);
    
    // Process the job directly
    return this.jobProcessor.processJob(job);
  }
  
  /**
   * Get data from storage
   */
  public async getData(
    userId: number,
    connectorType: ConnectorType,
    dataType: string,
    options: {
      filter?: Record<string, any>;
      limit?: number;
      offset?: number;
      sort?: string;
      sortDirection?: 'asc' | 'desc';
    } = {}
  ): Promise<any[]> {
    return this.dataStorageService.getData(userId, connectorType, dataType, options);
  }
  
  /**
   * Get a specific data item by ID
   */
  public async getDataById(userId: number, dataId: string): Promise<any | null> {
    return this.dataStorageService.getDataById(userId, dataId);
  }
  
  /**
   * Search stored data
   */
  public async searchData(
    userId: number,
    searchText: string,
    options: {
      connectorTypes?: ConnectorType[];
      dataTypes?: string[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<any[]> {
    return this.dataStorageService.searchData(userId, searchText, options);
  }
  
  /**
   * Delete stored data
   */
  public async deleteData(userId: number, dataId: string): Promise<boolean> {
    return this.dataStorageService.deleteData(userId, dataId);
  }
  
  /**
   * Check if a user has a valid API token for a connector
   */
  public async hasValidToken(userId: number, connectorType: ConnectorType): Promise<boolean> {
    const token = await this.apiTokenService.getToken(userId, connectorType);
    
    if (!token || !token.accessToken) {
      return false;
    }
    
    // Check if token is expired
    if (token.expiresAt && token.expiresAt < new Date()) {
      // Token is expired, but maybe we can refresh it
      if (token.refreshToken) {
        // We have a refresh token, so theoretically we can refresh
        // The actual refresh will happen when we try to use the connector
        return true;
      }
      return false;
    }
    
    return true;
  }
  
  /**
   * Create a scheduled job to fetch Google Drive files
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
   * Create a scheduled job to fetch Slack conversations
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
   * Create a scheduled job to fetch Gmail messages
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
   * Create a scheduled job to fetch Microsoft Graph messages
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
   * Create common schedules for all data sources (daily sync)
   */
  public async scheduleFullSync(userId: number): Promise<FetchingJob[]> {
    const jobs: FetchingJob[] = [];
    
    // Check if user has tokens for each source and schedule sync
    if (await this.hasValidToken(userId, ConnectorType.GOOGLE_DRIVE)) {
      try {
        const driveJob = await this.scheduleDriveFilesFetch(
          userId,
          ScheduleType.CRON,
          '0 2 * * *', // 2 AM every day
          { pageSize: 100 }
        );
        jobs.push(driveJob);
      } catch (error) {
        console.error('Error scheduling Google Drive fetch:', error);
      }
    }
    
    if (await this.hasValidToken(userId, ConnectorType.SLACK)) {
      try {
        const slackJob = await this.scheduleSlackConversationsFetch(
          userId,
          ScheduleType.CRON,
          '0 3 * * *', // 3 AM every day
          { limit: 100, types: 'public_channel,private_channel' }
        );
        jobs.push(slackJob);
      } catch (error) {
        console.error('Error scheduling Slack fetch:', error);
      }
    }
    
    if (await this.hasValidToken(userId, ConnectorType.GMAIL)) {
      try {
        const gmailJob = await this.scheduleGmailMessagesFetch(
          userId,
          ScheduleType.CRON,
          '0 4 * * *', // 4 AM every day
          { maxResults: 100, q: 'is:important' }
        );
        jobs.push(gmailJob);
      } catch (error) {
        console.error('Error scheduling Gmail fetch:', error);
      }
    }
    
    if (await this.hasValidToken(userId, ConnectorType.MICROSOFT_GRAPH)) {
      try {
        const msGraphJob = await this.scheduleMicrosoftGraphMessagesFetch(
          userId,
          ScheduleType.CRON,
          '0 5 * * *', // 5 AM every day
          { top: 100, filter: 'importance eq \'high\'' }
        );
        jobs.push(msGraphJob);
      } catch (error) {
        console.error('Error scheduling Microsoft Graph fetch:', error);
      }
    }
    
    return jobs;
  }
  
  /**
   * Stop the data fetching service
   */
  public stop(): void {
    this.schedulingService.stop();
    this.initialized = false;
  }
}