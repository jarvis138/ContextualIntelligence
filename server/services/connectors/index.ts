/**
 * Data Connector Service
 * 
 * This service manages the connections to external data sources and handles the
 * data fetching and synchronization process.
 */

import { db } from '../../db';
import { logger } from '../observability';
import { 
  apiTokens, 
  fetchingJobs, 
  fetchedData, 
  connectorTypeEnum,
  type InsertFetchingJob,
  type InsertApiToken,
  type InsertFetchedData
} from '@shared/schema';
import { eq, and, or, gt, lt, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { SlackConnector } from './slack';
import { GoogleDriveConnector } from './google-drive';
import { GmailConnector } from './gmail';
import { MicrosoftGraphConnector } from './microsoft-graph';
import { encryptToken, decryptToken } from '../tokenStorage';

// Map of connector types to their implementation classes
const connectorMap = {
  slack: SlackConnector,
  google_drive: GoogleDriveConnector,
  gmail: GmailConnector,
  microsoft_graph: MicrosoftGraphConnector
};

/**
 * Connector Service Class
 * 
 * Provides a unified interface for managing data connectors and their operations
 */
export class ConnectorService {
  /**
   * Store an API token for a specific connector type
   */
  async storeApiToken(tokenData: InsertApiToken): Promise<number> {
    try {
      // Encrypt sensitive token data
      const encryptedToken = { ...tokenData };
      
      if (encryptedToken.accessToken) {
        encryptedToken.accessToken = encryptToken(encryptedToken.accessToken);
      }
      
      if (encryptedToken.refreshToken) {
        encryptedToken.refreshToken = encryptToken(encryptedToken.refreshToken);
      }
      
      if (encryptedToken.tokenSecret) {
        encryptedToken.tokenSecret = encryptToken(encryptedToken.tokenSecret);
      }

      // Check if token already exists for this user and connector type
      const existingToken = await db.select()
        .from(apiTokens)
        .where(
          and(
            eq(apiTokens.userId, tokenData.userId),
            eq(apiTokens.connectorType, tokenData.connectorType)
          )
        )
        .limit(1);

      if (existingToken.length > 0) {
        // Update existing token
        const [updated] = await db.update(apiTokens)
          .set({
            ...encryptedToken,
            updatedAt: new Date()
          })
          .where(eq(apiTokens.id, existingToken[0].id))
          .returning();
        
        return updated.id;
      } else {
        // Insert new token
        const [created] = await db.insert(apiTokens)
          .values({
            ...encryptedToken,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        return created.id;
      }
    } catch (error) {
      logger.error('Error storing API token', {
        error,
        userId: tokenData.userId,
        connectorType: tokenData.connectorType
      });
      throw new Error(`Failed to store API token: ${error.message}`);
    }
  }

  /**
   * Get a stored API token
   */
  async getApiToken(userId: number, connectorType: string) {
    try {
      const token = await db.select()
        .from(apiTokens)
        .where(
          and(
            eq(apiTokens.userId, userId),
            eq(apiTokens.connectorType, connectorType)
          )
        )
        .limit(1);

      if (!token.length) {
        return null;
      }

      const decryptedToken = { ...token[0] };
      
      // Decrypt sensitive token data
      if (decryptedToken.accessToken) {
        decryptedToken.accessToken = decryptToken(decryptedToken.accessToken);
      }
      
      if (decryptedToken.refreshToken) {
        decryptedToken.refreshToken = decryptToken(decryptedToken.refreshToken);
      }
      
      if (decryptedToken.tokenSecret) {
        decryptedToken.tokenSecret = decryptToken(decryptedToken.tokenSecret);
      }

      return decryptedToken;
    } catch (error) {
      logger.error('Error retrieving API token', {
        error,
        userId,
        connectorType
      });
      throw new Error(`Failed to retrieve API token: ${error.message}`);
    }
  }

  /**
   * Create a new fetching job
   */
  async createFetchingJob(jobData: InsertFetchingJob): Promise<string> {
    try {
      // Generate a unique job ID
      const jobId = uuidv4();
      
      // Default nextRunAt based on schedule type
      let nextRunAt = null;
      if (jobData.scheduleType === 'once') {
        nextRunAt = new Date();
      } else if (jobData.scheduleType === 'interval' && jobData.scheduleValue) {
        // Simple interval scheduling - scheduleValue is in minutes
        const intervalMinutes = parseInt(jobData.scheduleValue);
        if (!isNaN(intervalMinutes)) {
          nextRunAt = new Date();
          nextRunAt.setMinutes(nextRunAt.getMinutes() + intervalMinutes);
        }
      }
      
      const [created] = await db.insert(fetchingJobs)
        .values({
          ...jobData,
          jobId,
          nextRunAt,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return created.jobId;
    } catch (error) {
      logger.error('Error creating fetching job', {
        error,
        userId: jobData.userId,
        connectorType: jobData.connectorType,
        dataType: jobData.dataType
      });
      throw new Error(`Failed to create fetching job: ${error.message}`);
    }
  }

  /**
   * Get pending jobs that need to be executed
   */
  async getPendingJobs() {
    try {
      const now = new Date();
      
      const pendingJobs = await db.select()
        .from(fetchingJobs)
        .where(
          and(
            or(
              eq(fetchingJobs.status, 'pending'),
              eq(fetchingJobs.status, 'scheduled')
            ),
            or(
              lt(fetchingJobs.nextRunAt, now),
              eq(fetchingJobs.nextRunAt, null)
            )
          )
        )
        .orderBy(fetchingJobs.priority)
        .limit(20);
      
      return pendingJobs;
    } catch (error) {
      logger.error('Error getting pending jobs', { error });
      throw new Error(`Failed to get pending jobs: ${error.message}`);
    }
  }

  /**
   * Update a job's status
   */
  async updateJobStatus(jobId: string, status: string, result?: any, error?: string) {
    try {
      const updateData: any = {
        status,
        lastRunAt: new Date(),
        updatedAt: new Date(),
        runCount: db.raw('run_count + 1')
      };
      
      if (result) {
        updateData.lastResult = result;
      }
      
      if (error) {
        updateData.lastError = error;
      }
      
      // Update next run time if job is scheduled with an interval
      const job = await db.select()
        .from(fetchingJobs)
        .where(eq(fetchingJobs.jobId, jobId))
        .limit(1);
      
      if (job.length && job[0].scheduleType === 'interval' && job[0].scheduleValue) {
        const intervalMinutes = parseInt(job[0].scheduleValue);
        if (!isNaN(intervalMinutes)) {
          const nextRunAt = new Date();
          nextRunAt.setMinutes(nextRunAt.getMinutes() + intervalMinutes);
          updateData.nextRunAt = nextRunAt;
          updateData.status = 'scheduled';
        }
      }
      
      await db.update(fetchingJobs)
        .set(updateData)
        .where(eq(fetchingJobs.jobId, jobId));
      
      return true;
    } catch (error) {
      logger.error('Error updating job status', { error, jobId, status });
      throw new Error(`Failed to update job status: ${error.message}`);
    }
  }

  /**
   * Store fetched data
   */
  async storeFetchedData(dataItems: InsertFetchedData[]) {
    try {
      if (!dataItems.length) {
        return [];
      }
      
      const result = await db.insert(fetchedData)
        .values(dataItems.map(item => ({
          ...item,
          dataId: uuidv4(),
          createdAt: new Date(),
          updatedAt: new Date(),
          fetchedAt: item.fetchedAt || new Date()
        })))
        .returning();
      
      return result;
    } catch (error) {
      logger.error('Error storing fetched data', { 
        error, 
        items: dataItems.length 
      });
      throw new Error(`Failed to store fetched data: ${error.message}`);
    }
  }

  /**
   * Get recent fetched data for a user
   */
  async getRecentUserData(userId: number, limit = 50) {
    try {
      const data = await db.select()
        .from(fetchedData)
        .where(eq(fetchedData.userId, userId))
        .orderBy(desc(fetchedData.fetchedAt))
        .limit(limit);
        
      return data;
    } catch (error) {
      logger.error('Error getting recent user data', { error, userId });
      throw new Error(`Failed to get recent user data: ${error.message}`);
    }
  }

  /**
   * Execute a connector operation
   */
  async executeConnector(connectorType: string, operation: string, params: any) {
    try {
      // Find the appropriate connector implementation
      const ConnectorClass = connectorMap[connectorType];
      if (!ConnectorClass) {
        throw new Error(`Unsupported connector type: ${connectorType}`);
      }
      
      // Instantiate the connector
      const connector = new ConnectorClass();
      
      // Verify the operation exists
      if (typeof connector[operation] !== 'function') {
        throw new Error(`Unsupported operation: ${operation}`);
      }
      
      // Execute the operation
      return await connector[operation](params);
    } catch (error) {
      logger.error('Error executing connector operation', { 
        error, 
        connectorType, 
        operation 
      });
      throw new Error(`Connector operation failed: ${error.message}`);
    }
  }
}

export const connectorService = new ConnectorService();

// Export connector types
export { SlackConnector, GoogleDriveConnector, GmailConnector, MicrosoftGraphConnector };