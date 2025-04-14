/**
 * Base Fetcher Class
 * 
 * This abstract class provides the foundation for all data fetchers
 * with common functionality for scheduling, rate limiting, and error handling.
 */

import { logAuditEvent, AuditEventType } from '../../utils/auditLogger';
import { db } from '../../db';
import crypto from 'crypto';

// Priority levels for fetching tasks
export enum FetchPriority {
  CRITICAL = 0,  // Immediate fetch, highest priority
  HIGH = 1,      // High priority fetch
  NORMAL = 2,    // Normal priority fetch
  LOW = 3,       // Low priority, background fetch
  IDLE = 4       // Only fetch when system is idle
}

// Status of a fetch operation
export enum FetchStatus {
  PENDING = 'pending',      // Waiting to be processed
  IN_PROGRESS = 'in_progress', // Currently being processed
  COMPLETED = 'completed',  // Successfully completed
  FAILED = 'failed',        // Failed with error
  RATE_LIMITED = 'rate_limited', // Delayed due to rate limiting
  CANCELLED = 'cancelled'   // Cancelled before execution
}

// Fetch task configuration
export interface FetchConfig {
  id: string;               // Unique identifier for this fetch task
  userId: number;           // User who owns this fetch task
  integrationId: number;    // ID of the integration this fetch belongs to
  priority: FetchPriority;  // Priority level
  intervalMinutes: number;  // How often to run this fetch (in minutes)
  enabled: boolean;         // Whether this fetch is enabled
  lastFetchedAt?: Date;     // When this was last fetched
  nextFetchAt?: Date;       // When to fetch next
  retryCount: number;       // Number of consecutive failures
  maxRetries: number;       // Maximum number of retries before disabling
  lastError?: string;       // Last error message
  backoffExponent: number;  // For exponential backoff calculation
  baseDelayMs: number;      // Base delay for backoff (in milliseconds)
}

// Result of a fetch operation
export interface FetchResult {
  status: FetchStatus;
  items?: any[];           // Items fetched (if successful)
  count?: number;          // Number of items fetched
  hasMore?: boolean;       // Whether there are more items to fetch
  nextCursor?: string;     // Cursor for pagination
  error?: Error;           // Error object (if failed)
  errorMessage?: string;   // Human-readable error message
  retryAfter?: number;     // Retry after this many milliseconds (for rate limiting)
  hash?: string;           // Hash of the fetched data for consistency checks
}

// Change record for incremental updates
export interface ChangeRecord {
  entityId: string;         // ID of the entity that changed
  entityType: string;       // Type of entity
  operation: 'create' | 'update' | 'delete'; // Type of change
  timestamp: Date;          // When the change occurred
  data?: any;               // New data (for create/update)
  previousHash?: string;    // Hash of previous version (for updates)
  currentHash?: string;     // Hash of current version
}

/**
 * Abstract base class for all data fetchers
 */
export abstract class FetcherBase {
  protected config: FetchConfig;
  protected isRunning: boolean = false;
  protected abortController: AbortController | null = null;
  protected changes: ChangeRecord[] = [];
  
  constructor(config: FetchConfig) {
    this.config = config;
  }
  
  /**
   * Start the fetcher according to its schedule
   */
  public start(): void {
    if (!this.config.enabled) {
      console.log(`Fetcher ${this.config.id} is disabled and will not run`);
      return;
    }
    
    // Calculate next fetch time if not set
    if (!this.config.nextFetchAt) {
      this.calculateNextFetchTime();
    }
    
    this.scheduleFetch();
  }
  
  /**
   * Stop the fetcher and cancel any pending operations
   */
  public stop(): void {
    this.isRunning = false;
    
    // Cancel any in-progress fetch
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    
    // Log the stop event
    logAuditEvent({
      userId: this.config.userId,
      eventType: AuditEventType.ACCOUNT_UPDATED,
      description: `Fetcher ${this.config.id} stopped`,
      metadata: {
        integrationId: this.config.integrationId,
        fetcherId: this.config.id
      }
    });
  }
  
  /**
   * Update the fetcher configuration
   */
  public updateConfig(newConfig: Partial<FetchConfig>): void {
    const oldIntervalMinutes = this.config.intervalMinutes;
    
    // Update the config
    this.config = { ...this.config, ...newConfig };
    
    // If interval changed, recalculate next fetch time
    if (oldIntervalMinutes !== this.config.intervalMinutes) {
      this.calculateNextFetchTime();
    }
    
    // Log the config update
    logAuditEvent({
      userId: this.config.userId,
      eventType: AuditEventType.ACCOUNT_UPDATED,
      description: `Fetcher ${this.config.id} configuration updated`,
      metadata: {
        integrationId: this.config.integrationId,
        fetcherId: this.config.id,
        changes: Object.keys(newConfig)
      }
    });
  }
  
  /**
   * Calculate when the next fetch should run
   */
  protected calculateNextFetchTime(): void {
    const now = new Date();
    
    // If there have been recent failures, use exponential backoff
    if (this.config.retryCount > 0) {
      const delay = this.calculateBackoffDelay();
      this.config.nextFetchAt = new Date(now.getTime() + delay);
      return;
    }
    
    // Otherwise, schedule based on the configured interval
    const intervalMs = this.config.intervalMinutes * 60 * 1000;
    
    // If we've never fetched before, schedule immediately
    if (!this.config.lastFetchedAt) {
      // Add a small random delay (0-5 seconds) to prevent all fetchers starting simultaneously
      const randomDelay = Math.floor(Math.random() * 5000);
      this.config.nextFetchAt = new Date(now.getTime() + randomDelay);
      return;
    }
    
    // Calculate next fetch time based on last fetch plus interval
    const lastFetchTime = this.config.lastFetchedAt.getTime();
    const nextFetchTime = lastFetchTime + intervalMs;
    
    // If next fetch time is in the past, schedule immediately with a small random delay
    if (nextFetchTime <= now.getTime()) {
      const randomDelay = Math.floor(Math.random() * 5000);
      this.config.nextFetchAt = new Date(now.getTime() + randomDelay);
    } else {
      this.config.nextFetchAt = new Date(nextFetchTime);
    }
  }
  
  /**
   * Calculate delay time using exponential backoff
   */
  protected calculateBackoffDelay(): number {
    // Base formula: baseDelay * (2 ^ (currentRetry * backoffExponent))
    // with jitter to prevent synchronized retries
    const exponent = this.config.retryCount * this.config.backoffExponent;
    const backoffMs = this.config.baseDelayMs * Math.pow(2, exponent);
    
    // Add jitter: random value between 0.5 and 1.5 of calculated backoff
    const jitterFactor = 0.5 + Math.random();
    const withJitter = Math.floor(backoffMs * jitterFactor);
    
    // Cap maximum delay at 1 hour
    const maxDelayMs = 60 * 60 * 1000;
    return Math.min(withJitter, maxDelayMs);
  }
  
  /**
   * Schedule the next fetch operation
   */
  protected scheduleFetch(): void {
    if (!this.config.enabled || !this.config.nextFetchAt) {
      return;
    }
    
    const now = new Date();
    const nextFetchTime = this.config.nextFetchAt.getTime();
    const delay = Math.max(0, nextFetchTime - now.getTime());
    
    setTimeout(() => this.executeFetch(), delay);
  }
  
  /**
   * Execute the fetch operation
   */
  protected async executeFetch(): Promise<void> {
    if (this.isRunning || !this.config.enabled) {
      this.scheduleFetch();
      return;
    }
    
    this.isRunning = true;
    this.abortController = new AbortController();
    
    try {
      // Log fetch start
      logAuditEvent({
        userId: this.config.userId,
        eventType: AuditEventType.ACCESS_GRANTED,
        description: `Fetcher ${this.config.id} started`,
        metadata: {
          integrationId: this.config.integrationId,
          fetcherId: this.config.id
        }
      });
      
      // Execute the actual fetch operation
      const result = await this.fetch(this.abortController.signal);
      
      // Update last fetched time
      this.config.lastFetchedAt = new Date();
      
      // Handle the result
      if (result.status === FetchStatus.COMPLETED) {
        // Success case
        this.config.retryCount = 0;
        this.config.lastError = undefined;
        
        // Process any changes for incremental fetching
        if (this.changes.length > 0) {
          await this.processChanges(this.changes);
          this.changes = [];
        }
        
        // Log successful fetch
        logAuditEvent({
          userId: this.config.userId,
          eventType: AuditEventType.ACCESS_GRANTED,
          description: `Fetcher ${this.config.id} completed successfully`,
          metadata: {
            integrationId: this.config.integrationId,
            fetcherId: this.config.id,
            itemCount: result.count || 0
          }
        });
      } else if (result.status === FetchStatus.RATE_LIMITED) {
        // Rate limited case
        this.config.retryCount++;
        this.config.lastError = result.errorMessage || 'Rate limited';
        
        // Use the suggested retry time from the API if available
        if (result.retryAfter) {
          this.config.nextFetchAt = new Date(Date.now() + result.retryAfter);
        } else {
          // Otherwise use exponential backoff
          this.calculateNextFetchTime();
        }
        
        // Log rate limiting
        logAuditEvent({
          userId: this.config.userId,
          eventType: AuditEventType.ACCESS_DENIED,
          description: `Fetcher ${this.config.id} rate limited`,
          metadata: {
            integrationId: this.config.integrationId,
            fetcherId: this.config.id,
            retryAfter: result.retryAfter,
            nextFetchAt: this.config.nextFetchAt
          }
        });
      } else if (result.status === FetchStatus.FAILED) {
        // Failure case
        this.config.retryCount++;
        this.config.lastError = result.errorMessage || 'Unknown error';
        
        // Check if we've exceeded max retries
        if (this.config.retryCount > this.config.maxRetries) {
          this.config.enabled = false;
          
          // Log disabled due to too many failures
          logAuditEvent({
            userId: this.config.userId,
            eventType: AuditEventType.ACCESS_DENIED,
            description: `Fetcher ${this.config.id} disabled due to too many failures`,
            metadata: {
              integrationId: this.config.integrationId,
              fetcherId: this.config.id,
              lastError: this.config.lastError,
              retryCount: this.config.retryCount
            }
          });
        } else {
          // Calculate next fetch time with backoff
          this.calculateNextFetchTime();
          
          // Log failure
          logAuditEvent({
            userId: this.config.userId,
            eventType: AuditEventType.ACCESS_DENIED,
            description: `Fetcher ${this.config.id} failed`,
            metadata: {
              integrationId: this.config.integrationId,
              fetcherId: this.config.id,
              error: this.config.lastError,
              retryCount: this.config.retryCount,
              nextFetchAt: this.config.nextFetchAt
            }
          });
        }
      }
    } catch (error) {
      // Unexpected error
      this.config.retryCount++;
      this.config.lastError = error.message || 'Unexpected error';
      this.calculateNextFetchTime();
      
      // Log the error
      logAuditEvent({
        userId: this.config.userId,
        eventType: AuditEventType.ACCESS_DENIED,
        description: `Fetcher ${this.config.id} encountered an unexpected error`,
        metadata: {
          integrationId: this.config.integrationId,
          fetcherId: this.config.id,
          error: this.config.lastError,
          retryCount: this.config.retryCount
        }
      });
    } finally {
      this.isRunning = false;
      this.abortController = null;
      
      // Save the updated configuration
      await this.saveConfig();
      
      // Schedule the next fetch
      this.calculateNextFetchTime();
      this.scheduleFetch();
    }
  }
  
  /**
   * Save the current configuration to the database
   */
  protected async saveConfig(): Promise<void> {
    // Implementation will depend on how configs are stored
    // This is a placeholder
    console.log(`Saving configuration for fetcher ${this.config.id}`);
  }
  
  /**
   * Process detected changes from incremental fetching
   */
  protected async processChanges(changes: ChangeRecord[]): Promise<void> {
    // Base implementation just logs the changes
    console.log(`Processing ${changes.length} changes for fetcher ${this.config.id}`);
    
    // Subclasses should override this to actually process the changes
  }
  
  /**
   * Calculate a hash for data consistency checks
   */
  protected calculateHash(data: any): string {
    const stringifiedData = JSON.stringify(data);
    return crypto.createHash('sha256').update(stringifiedData).digest('hex');
  }
  
  /**
   * Validate that data consistency using hash comparison
   */
  protected validateDataConsistency(data: any, expectedHash?: string): boolean {
    if (!expectedHash) return true;
    
    const actualHash = this.calculateHash(data);
    return actualHash === expectedHash;
  }
  
  /**
   * Track changes for incremental updates
   */
  protected trackChange(change: ChangeRecord): void {
    this.changes.push(change);
  }
  
  /**
   * Abstract method that each fetcher must implement to fetch data
   */
  protected abstract fetch(signal: AbortSignal): Promise<FetchResult>;
}