/**
 * Data Storage Service
 * 
 * Manages storage of fetched data from different sources
 */

import { ConnectorType } from '../connectors/connectorFactory';
import { pool, db } from '../../db';
import { eq, and, desc } from 'drizzle-orm';
import { executeWithRetry } from '../../utils/rateLimiting';

/**
 * Base interface for stored data
 */
export interface StoredData {
  id: string;
  userId: number;
  connectorType: ConnectorType;
  dataType: string;
  dataSourceId: string;
  content: any;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service for storing and retrieving fetched data
 */
export class DataStorageService {
  private static instance: DataStorageService;
  
  /**
   * Get singleton instance of the data storage service
   */
  public static getInstance(): DataStorageService {
    if (!DataStorageService.instance) {
      DataStorageService.instance = new DataStorageService();
    }
    return DataStorageService.instance;
  }
  
  /**
   * Store fetched data
   */
  public async storeData(
    userId: number,
    connectorType: ConnectorType,
    dataType: string,
    data: any,
    options: {
      dataSourceId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    try {
      const { dataSourceId = '', metadata = {} } = options;
      
      // For array data, store each item separately
      if (Array.isArray(data)) {
        // Use a transaction to ensure all items are stored together
        await executeWithRetry(async () => {
          await db.transaction(async (tx) => {
            for (const item of data) {
              // Generate an ID for the item if it doesn't have one
              const itemId = item.id || crypto.randomUUID();
              
              // Extract metadata from the item
              const itemMetadata = this.extractMetadata(connectorType, dataType, item, metadata);
              
              // Store the item
              await this.storeDataItem(
                userId,
                connectorType,
                dataType,
                itemId,
                item,
                itemMetadata,
                tx
              );
            }
          });
        });
      } else {
        // Single item, store it directly
        // Generate an ID for the data if it doesn't have one
        const itemId = data.id || dataSourceId || crypto.randomUUID();
        
        // Extract metadata from the data
        const itemMetadata = this.extractMetadata(connectorType, dataType, data, metadata);
        
        // Store the item
        await this.storeDataItem(
          userId,
          connectorType,
          dataType,
          itemId,
          data,
          itemMetadata
        );
      }
    } catch (error) {
      console.error(`Error storing data for ${connectorType}/${dataType}:`, error);
      throw error;
    }
  }
  
  /**
   * Store a single data item
   */
  private async storeDataItem(
    userId: number,
    connectorType: ConnectorType,
    dataType: string,
    dataSourceId: string,
    data: any,
    metadata: Record<string, any>,
    tx?: any
  ): Promise<void> {
    try {
      // Check if the data already exists
      const existingData = await this.findData(userId, connectorType, dataType, dataSourceId);
      
      if (existingData) {
        // Update existing data
        await executeWithRetry(async () => {
          // Use custom SQL for update to handle JSON data properly
          const query = `
            UPDATE fetched_data
            SET 
              content = $1,
              metadata = $2,
              updated_at = NOW()
            WHERE 
              user_id = $3 AND
              connector_type = $4 AND
              data_type = $5 AND
              data_source_id = $6
          `;
          
          const params = [
            JSON.stringify(data),
            JSON.stringify(metadata),
            userId,
            connectorType,
            dataType,
            dataSourceId
          ];
          
          if (tx) {
            await tx.execute(query, params);
          } else {
            await pool.query(query, params);
          }
        });
      } else {
        // Insert new data
        await executeWithRetry(async () => {
          // Use custom SQL for insert to handle JSON data properly
          const query = `
            INSERT INTO fetched_data (
              user_id,
              connector_type,
              data_type,
              data_source_id,
              content,
              metadata,
              created_at,
              updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, NOW(), NOW()
            )
          `;
          
          const params = [
            userId,
            connectorType,
            dataType,
            dataSourceId,
            JSON.stringify(data),
            JSON.stringify(metadata)
          ];
          
          if (tx) {
            await tx.execute(query, params);
          } else {
            await pool.query(query, params);
          }
        });
      }
    } catch (error) {
      console.error(`Error storing data item ${dataSourceId} for ${connectorType}/${dataType}:`, error);
      throw error;
    }
  }
  
  /**
   * Extract metadata from data based on connector type and data type
   */
  private extractMetadata(
    connectorType: ConnectorType,
    dataType: string,
    data: any,
    additionalMetadata: Record<string, any> = {}
  ): Record<string, any> {
    const metadata: Record<string, any> = { ...additionalMetadata };
    
    try {
      // Extract common metadata fields based on connector type
      switch (connectorType) {
        case ConnectorType.GOOGLE_DRIVE:
          // Extract Google Drive metadata
          if (data.name) metadata.name = data.name;
          if (data.mimeType) metadata.mimeType = data.mimeType;
          if (data.createdTime) metadata.createdTime = data.createdTime;
          if (data.modifiedTime) metadata.modifiedTime = data.modifiedTime;
          if (data.owners && data.owners.length > 0) {
            metadata.owner = data.owners[0].displayName || data.owners[0].emailAddress;
          }
          if (data.size) metadata.size = data.size;
          break;
          
        case ConnectorType.SLACK:
          // Extract Slack metadata based on data type
          if (dataType === 'messages' || dataType === 'thread') {
            if (data.user) metadata.user = data.user;
            if (data.ts) metadata.timestamp = data.ts;
            if (data.thread_ts) metadata.threadTimestamp = data.thread_ts;
            if (data.type) metadata.type = data.type;
            if (data.subtype) metadata.subtype = data.subtype;
          } else if (dataType === 'conversations') {
            if (data.name) metadata.name = data.name;
            if (data.created) metadata.createdAt = new Date(data.created * 1000).toISOString();
            if (data.creator) metadata.creator = data.creator;
            if (data.is_private) metadata.isPrivate = data.is_private;
            if (data.is_channel) metadata.isChannel = data.is_channel;
          } else if (dataType === 'files') {
            if (data.name) metadata.name = data.name;
            if (data.title) metadata.title = data.title;
            if (data.mimetype) metadata.mimeType = data.mimetype;
            if (data.filetype) metadata.fileType = data.filetype;
            if (data.size) metadata.size = data.size;
            if (data.created) metadata.createdAt = new Date(data.created * 1000).toISOString();
            if (data.user) metadata.user = data.user;
          }
          break;
          
        case ConnectorType.GMAIL:
        case ConnectorType.MICROSOFT_GRAPH:
          // Extract email metadata
          if (dataType === 'messages' || dataType === 'message') {
            if (data.subject) metadata.subject = data.subject;
            if (data.from) metadata.from = data.from;
            if (data.to) metadata.to = data.to;
            if (data.date || data.receivedDateTime) metadata.date = data.date || data.receivedDateTime;
            if (data.hasAttachments) metadata.hasAttachments = data.hasAttachments;
          } else if (dataType === 'threads' || dataType === 'thread' || dataType === 'conversation') {
            if (data.subject) metadata.subject = data.subject;
            if (data.messages && data.messages.length > 0) metadata.messageCount = data.messages.length;
          }
          break;
      }
      
      // Add last fetched timestamp
      metadata.fetchedAt = new Date().toISOString();
      
    } catch (error) {
      console.warn('Error extracting metadata:', error);
      // Continue with the metadata we have
    }
    
    return metadata;
  }
  
  /**
   * Find stored data by user, connector type, data type, and source ID
   */
  private async findData(
    userId: number,
    connectorType: ConnectorType,
    dataType: string,
    dataSourceId: string
  ): Promise<StoredData | null> {
    try {
      // Use a simple query to check if data exists
      const query = `
        SELECT * FROM fetched_data
        WHERE 
          user_id = $1 AND
          connector_type = $2 AND
          data_type = $3 AND
          data_source_id = $4
        LIMIT 1
      `;
      
      const params = [userId, connectorType, dataType, dataSourceId];
      
      const result = await pool.query(query, params);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      // Parse JSON data
      const row = result.rows[0];
      const data: StoredData = {
        id: row.id,
        userId: row.user_id,
        connectorType: row.connector_type as ConnectorType,
        dataType: row.data_type,
        dataSourceId: row.data_source_id,
        content: JSON.parse(row.content),
        metadata: JSON.parse(row.metadata),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
      
      return data;
    } catch (error) {
      console.error(`Error finding data for ${connectorType}/${dataType}/${dataSourceId}:`, error);
      return null;
    }
  }
  
  /**
   * Get stored data by connector type and data type
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
  ): Promise<StoredData[]> {
    try {
      const { limit = 100, offset = 0, sort = 'updated_at', sortDirection = 'desc' } = options;
      
      // Build query with filters
      let query = `
        SELECT * FROM fetched_data
        WHERE 
          user_id = $1 AND
          connector_type = $2 AND
          data_type = $3
      `;
      
      const params: any[] = [userId, connectorType, dataType];
      let paramIndex = 4;
      
      // Add filters to the query
      if (options.filter) {
        for (const [key, value] of Object.entries(options.filter)) {
          // For metadata filters
          if (key.startsWith('metadata.')) {
            const metadataKey = key.substring(9);
            query += ` AND metadata->>'${metadataKey}' = $${paramIndex}`;
            params.push(value);
            paramIndex++;
          }
          // For content filters (only for simple properties)
          else if (key.startsWith('content.')) {
            const contentKey = key.substring(8);
            query += ` AND content->>'${contentKey}' = $${paramIndex}`;
            params.push(value);
            paramIndex++;
          }
        }
      }
      
      // Add sorting and pagination
      query += ` ORDER BY ${sort} ${sortDirection === 'asc' ? 'ASC' : 'DESC'}`;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
      
      const result = await pool.query(query, params);
      
      // Parse JSON data for each row
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        connectorType: row.connector_type as ConnectorType,
        dataType: row.data_type,
        dataSourceId: row.data_source_id,
        content: JSON.parse(row.content),
        metadata: JSON.parse(row.metadata),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      console.error(`Error getting data for ${connectorType}/${dataType}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a specific data item by ID
   */
  public async getDataById(
    userId: number,
    dataId: string
  ): Promise<StoredData | null> {
    try {
      const query = `
        SELECT * FROM fetched_data
        WHERE 
          id = $1 AND
          user_id = $2
        LIMIT 1
      `;
      
      const result = await pool.query(query, [dataId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      // Parse JSON data
      const row = result.rows[0];
      const data: StoredData = {
        id: row.id,
        userId: row.user_id,
        connectorType: row.connector_type as ConnectorType,
        dataType: row.data_type,
        dataSourceId: row.data_source_id,
        content: JSON.parse(row.content),
        metadata: JSON.parse(row.metadata),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
      
      return data;
    } catch (error) {
      console.error(`Error getting data by ID ${dataId}:`, error);
      return null;
    }
  }
  
  /**
   * Delete stored data
   */
  public async deleteData(
    userId: number,
    dataId: string
  ): Promise<boolean> {
    try {
      const query = `
        DELETE FROM fetched_data
        WHERE 
          id = $1 AND
          user_id = $2
      `;
      
      const result = await pool.query(query, [dataId, userId]);
      
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting data ${dataId}:`, error);
      return false;
    }
  }
  
  /**
   * Search stored data across all connector types and data types
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
  ): Promise<StoredData[]> {
    try {
      const { limit = 100, offset = 0 } = options;
      
      // Build query
      let query = `
        SELECT * FROM fetched_data
        WHERE 
          user_id = $1 AND
          (
            content::text ILIKE $2 OR
            metadata::text ILIKE $2
          )
      `;
      
      const params: any[] = [userId, `%${searchText}%`];
      let paramIndex = 3;
      
      // Add connector type filter if specified
      if (options.connectorTypes && options.connectorTypes.length > 0) {
        query += ` AND connector_type IN (`;
        
        const placeholders = options.connectorTypes.map((_, i) => `$${paramIndex + i}`).join(',');
        query += placeholders + ')';
        
        params.push(...options.connectorTypes);
        paramIndex += options.connectorTypes.length;
      }
      
      // Add data type filter if specified
      if (options.dataTypes && options.dataTypes.length > 0) {
        query += ` AND data_type IN (`;
        
        const placeholders = options.dataTypes.map((_, i) => `$${paramIndex + i}`).join(',');
        query += placeholders + ')';
        
        params.push(...options.dataTypes);
        paramIndex += options.dataTypes.length;
      }
      
      // Add sorting and pagination
      query += ` ORDER BY updated_at DESC`;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
      
      const result = await pool.query(query, params);
      
      // Parse JSON data for each row
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        connectorType: row.connector_type as ConnectorType,
        dataType: row.data_type,
        dataSourceId: row.data_source_id,
        content: JSON.parse(row.content),
        metadata: JSON.parse(row.metadata),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      console.error(`Error searching data for "${searchText}":`, error);
      throw error;
    }
  }
}