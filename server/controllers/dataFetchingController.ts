/**
 * Data Fetching Controller
 * 
 * Handles HTTP requests for data fetching operations
 */

import { Request, Response } from 'express';
import { DataFetchingService } from '../services/fetching/dataFetchingService';
import { ConnectorType } from '../services/connectors/connectorFactory';
import { ScheduleType, JobPriority } from '../services/fetching/fetchingJob';
import { ApiTokenService } from '../services/connectors/apiTokenService';
import { z } from 'zod';
import { AuthUser } from '../auth';

/**
 * Data fetching controller
 */
export class DataFetchingController {
  private dataFetchingService: DataFetchingService;
  private apiTokenService: ApiTokenService;
  
  constructor() {
    this.dataFetchingService = DataFetchingService.getInstance();
    this.apiTokenService = ApiTokenService.getInstance();
  }
  
  /**
   * Initialize the controller and its services
   */
  public async initialize(): Promise<void> {
    await this.dataFetchingService.initialize();
  }
  
  /**
   * Schedule a data fetching job
   */
  public async scheduleJob(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthUser;
      
      // Validation schema
      const schema = z.object({
        connectorType: z.enum([
          ConnectorType.GOOGLE_DRIVE, 
          ConnectorType.SLACK, 
          ConnectorType.GMAIL, 
          ConnectorType.MICROSOFT_GRAPH
        ]),
        dataType: z.string(),
        parameters: z.record(z.any()).optional().default({}),
        scheduleType: z.enum([
          ScheduleType.ONCE, 
          ScheduleType.INTERVAL, 
          ScheduleType.CRON, 
          ScheduleType.MANUAL
        ]),
        scheduleValue: z.string().optional(),
        priority: z.enum([
          JobPriority.LOW, 
          JobPriority.NORMAL, 
          JobPriority.HIGH, 
          JobPriority.URGENT
        ]).optional()
      });
      
      // Validate request body
      const validatedData = schema.parse(req.body);
      
      // Check if user has a valid token for this connector
      const hasToken = await this.dataFetchingService.hasValidToken(
        user.id,
        validatedData.connectorType
      );
      
      if (!hasToken) {
        return res.status(400).json({
          error: {
            code: 'INVALID_TOKEN',
            message: `You don't have a valid token for ${validatedData.connectorType}. Please connect to this service first.`
          }
        });
      }
      
      // Schedule the job
      const job = await this.dataFetchingService.scheduleJob({
        userId: user.id,
        connectorType: validatedData.connectorType,
        dataType: validatedData.dataType,
        parameters: validatedData.parameters,
        scheduleType: validatedData.scheduleType,
        scheduleValue: validatedData.scheduleValue,
        priority: validatedData.priority
      });
      
      // Return the created job
      res.status(201).json({
        job: job.toJSON()
      });
    } catch (error: any) {
      console.error('Error scheduling data fetching job:', error);
      
      res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: error.message || 'Invalid request'
        }
      });
    }
  }
  
  /**
   * Get all jobs for the current user
   */
  public async getJobs(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthUser;
      
      // Get all jobs for the user
      const jobs = await this.dataFetchingService.getJobsByUser(user.id);
      
      // Return the jobs
      res.status(200).json({
        jobs: jobs.map(job => job.toJSON())
      });
    } catch (error: any) {
      console.error('Error getting data fetching jobs:', error);
      
      res.status(500).json({
        error: {
          code: 'SERVER_ERROR',
          message: 'Error retrieving data fetching jobs'
        }
      });
    }
  }
  
  /**
   * Get a specific job
   */
  public async getJob(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthUser;
      const jobId = req.params.id;
      
      // Get the job
      const job = await this.dataFetchingService.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({
          error: {
            code: 'JOB_NOT_FOUND',
            message: 'Job not found'
          }
        });
      }
      
      // Check if job belongs to user
      if (job.userId !== user.id) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You don\'t have permission to access this job'
          }
        });
      }
      
      // Return the job
      res.status(200).json({
        job: job.toJSON()
      });
    } catch (error: any) {
      console.error('Error getting data fetching job:', error);
      
      res.status(500).json({
        error: {
          code: 'SERVER_ERROR',
          message: 'Error retrieving data fetching job'
        }
      });
    }
  }
  
  /**
   * Cancel a job
   */
  public async cancelJob(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthUser;
      const jobId = req.params.id;
      
      // Get the job
      const job = await this.dataFetchingService.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({
          error: {
            code: 'JOB_NOT_FOUND',
            message: 'Job not found'
          }
        });
      }
      
      // Check if job belongs to user
      if (job.userId !== user.id) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You don\'t have permission to access this job'
          }
        });
      }
      
      // Cancel the job
      const success = await this.dataFetchingService.cancelJob(jobId);
      
      if (!success) {
        return res.status(400).json({
          error: {
            code: 'CANCEL_FAILED',
            message: 'Failed to cancel job'
          }
        });
      }
      
      // Return success
      res.status(200).json({
        success: true
      });
    } catch (error: any) {
      console.error('Error cancelling data fetching job:', error);
      
      res.status(500).json({
        error: {
          code: 'SERVER_ERROR',
          message: 'Error cancelling data fetching job'
        }
      });
    }
  }
  
  /**
   * Run a job immediately
   */
  public async runJob(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthUser;
      const jobId = req.params.id;
      
      // Get the job
      const job = await this.dataFetchingService.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({
          error: {
            code: 'JOB_NOT_FOUND',
            message: 'Job not found'
          }
        });
      }
      
      // Check if job belongs to user
      if (job.userId !== user.id) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You don\'t have permission to access this job'
          }
        });
      }
      
      // Run the job
      try {
        await this.dataFetchingService.runJobNow(jobId);
        
        // Return success
        res.status(200).json({
          success: true,
          message: 'Job execution started'
        });
      } catch (error: any) {
        return res.status(400).json({
          error: {
            code: 'EXECUTION_FAILED',
            message: error.message || 'Failed to execute job'
          }
        });
      }
    } catch (error: any) {
      console.error('Error running data fetching job:', error);
      
      res.status(500).json({
        error: {
          code: 'SERVER_ERROR',
          message: 'Error running data fetching job'
        }
      });
    }
  }
  
  /**
   * Get connector authentication status for a user
   */
  public async getConnectorStatus(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthUser;
      
      // Get status for all connectors
      const statuses = await Promise.all(
        Object.values(ConnectorType).map(async (connectorType) => {
          const hasToken = await this.dataFetchingService.hasValidToken(user.id, connectorType);
          return { connectorType, connected: hasToken };
        })
      );
      
      // Return statuses
      res.status(200).json({
        connectors: statuses
      });
    } catch (error: any) {
      console.error('Error getting connector statuses:', error);
      
      res.status(500).json({
        error: {
          code: 'SERVER_ERROR',
          message: 'Error retrieving connector statuses'
        }
      });
    }
  }
  
  /**
   * Save a token for a connector
   */
  public async saveToken(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthUser;
      
      // Validation schema
      const schema = z.object({
        connectorType: z.enum([
          ConnectorType.GOOGLE_DRIVE, 
          ConnectorType.SLACK, 
          ConnectorType.GMAIL, 
          ConnectorType.MICROSOFT_GRAPH
        ]),
        accessToken: z.string(),
        refreshToken: z.string().optional(),
        tokenSecret: z.string().optional(),
        expiresAt: z.number().optional(),
        scope: z.string().optional()
      });
      
      // Validate request body
      const validatedData = schema.parse(req.body);
      
      // Save the token
      await this.apiTokenService.saveToken(user.id, validatedData.connectorType, {
        accessToken: validatedData.accessToken,
        refreshToken: validatedData.refreshToken,
        tokenSecret: validatedData.tokenSecret,
        expiresAt: validatedData.expiresAt,
        scope: validatedData.scope
      });
      
      // Return success
      res.status(200).json({
        success: true
      });
    } catch (error: any) {
      console.error('Error saving connector token:', error);
      
      res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: error.message || 'Invalid request'
        }
      });
    }
  }
  
  /**
   * Delete a token for a connector
   */
  public async deleteToken(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthUser;
      
      // Validation schema
      const schema = z.object({
        connectorType: z.enum([
          ConnectorType.GOOGLE_DRIVE, 
          ConnectorType.SLACK, 
          ConnectorType.GMAIL, 
          ConnectorType.MICROSOFT_GRAPH
        ])
      });
      
      // Validate request body
      const validatedData = schema.parse(req.body);
      
      // Delete the token
      const success = await this.apiTokenService.deleteToken(user.id, validatedData.connectorType);
      
      if (!success) {
        return res.status(404).json({
          error: {
            code: 'TOKEN_NOT_FOUND',
            message: 'Token not found'
          }
        });
      }
      
      // Return success
      res.status(200).json({
        success: true
      });
    } catch (error: any) {
      console.error('Error deleting connector token:', error);
      
      res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: error.message || 'Invalid request'
        }
      });
    }
  }
  
  /**
   * Set up a full sync schedule for a user
   */
  public async setupFullSync(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthUser;
      
      // Schedule full sync
      const jobs = await this.dataFetchingService.scheduleFullSync(user.id);
      
      // Return the created jobs
      res.status(201).json({
        jobs: jobs.map(job => job.toJSON())
      });
    } catch (error: any) {
      console.error('Error setting up full sync:', error);
      
      res.status(500).json({
        error: {
          code: 'SERVER_ERROR',
          message: 'Error setting up full sync'
        }
      });
    }
  }
  
  /**
   * Get fetched data for a user
   */
  public async getData(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthUser;
      
      // Validation schema
      const schema = z.object({
        connectorType: z.enum([
          ConnectorType.GOOGLE_DRIVE, 
          ConnectorType.SLACK, 
          ConnectorType.GMAIL, 
          ConnectorType.MICROSOFT_GRAPH
        ]),
        dataType: z.string(),
        filter: z.record(z.any()).optional(),
        limit: z.number().min(1).max(100).optional().default(20),
        offset: z.number().min(0).optional().default(0),
        sort: z.string().optional().default('updated_at'),
        sortDirection: z.enum(['asc', 'desc']).optional().default('desc')
      });
      
      // Validate query parameters
      const validatedData = schema.parse({
        connectorType: req.query.connectorType,
        dataType: req.query.dataType,
        filter: req.query.filter ? JSON.parse(req.query.filter as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
        sort: req.query.sort,
        sortDirection: req.query.sortDirection
      });
      
      // Get data
      const data = await this.dataFetchingService.getData(
        user.id,
        validatedData.connectorType,
        validatedData.dataType,
        {
          filter: validatedData.filter,
          limit: validatedData.limit,
          offset: validatedData.offset,
          sort: validatedData.sort,
          sortDirection: validatedData.sortDirection
        }
      );
      
      // Return the data
      res.status(200).json({
        data,
        pagination: {
          limit: validatedData.limit,
          offset: validatedData.offset,
          total: data.length // This is not accurate for total count, just a placeholder
        }
      });
    } catch (error: any) {
      console.error('Error getting fetched data:', error);
      
      res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: error.message || 'Invalid request'
        }
      });
    }
  }
  
  /**
   * Get a specific data item
   */
  public async getDataById(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthUser;
      const dataId = req.params.id;
      
      // Get the data
      const data = await this.dataFetchingService.getDataById(user.id, dataId);
      
      if (!data) {
        return res.status(404).json({
          error: {
            code: 'DATA_NOT_FOUND',
            message: 'Data not found'
          }
        });
      }
      
      // Return the data
      res.status(200).json({
        data
      });
    } catch (error: any) {
      console.error('Error getting data by ID:', error);
      
      res.status(500).json({
        error: {
          code: 'SERVER_ERROR',
          message: 'Error retrieving data'
        }
      });
    }
  }
  
  /**
   * Search fetched data
   */
  public async searchData(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthUser;
      
      // Validation schema
      const schema = z.object({
        query: z.string().min(1),
        connectorTypes: z.array(z.enum([
          ConnectorType.GOOGLE_DRIVE, 
          ConnectorType.SLACK, 
          ConnectorType.GMAIL, 
          ConnectorType.MICROSOFT_GRAPH
        ])).optional(),
        dataTypes: z.array(z.string()).optional(),
        limit: z.number().min(1).max(100).optional().default(20),
        offset: z.number().min(0).optional().default(0)
      });
      
      // Validate query parameters
      const validatedData = schema.parse({
        query: req.query.query,
        connectorTypes: req.query.connectorTypes 
          ? JSON.parse(req.query.connectorTypes as string) 
          : undefined,
        dataTypes: req.query.dataTypes 
          ? JSON.parse(req.query.dataTypes as string) 
          : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined
      });
      
      // Search data
      const results = await this.dataFetchingService.searchData(
        user.id,
        validatedData.query,
        {
          connectorTypes: validatedData.connectorTypes,
          dataTypes: validatedData.dataTypes,
          limit: validatedData.limit,
          offset: validatedData.offset
        }
      );
      
      // Return the search results
      res.status(200).json({
        results,
        pagination: {
          limit: validatedData.limit,
          offset: validatedData.offset,
          total: results.length // This is not accurate for total count, just a placeholder
        }
      });
    } catch (error: any) {
      console.error('Error searching data:', error);
      
      res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: error.message || 'Invalid request'
        }
      });
    }
  }
  
  /**
   * Delete a data item
   */
  public async deleteData(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthUser;
      const dataId = req.params.id;
      
      // Delete the data
      const success = await this.dataFetchingService.deleteData(user.id, dataId);
      
      if (!success) {
        return res.status(404).json({
          error: {
            code: 'DATA_NOT_FOUND',
            message: 'Data not found'
          }
        });
      }
      
      // Return success
      res.status(200).json({
        success: true
      });
    } catch (error: any) {
      console.error('Error deleting data:', error);
      
      res.status(500).json({
        error: {
          code: 'SERVER_ERROR',
          message: 'Error deleting data'
        }
      });
    }
  }
}