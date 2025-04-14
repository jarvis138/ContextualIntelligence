/**
 * Fetch Manager
 * 
 * This class manages all the fetchers, handling scheduling, priorities,
 * and resource allocation.
 */

import { FetcherBase, FetchConfig, FetchPriority } from './FetcherBase';
import { GoogleDriveFetcher } from './GoogleDriveFetcher';
import { EmailFetcher } from './EmailFetcher';
import { logAuditEvent, AuditEventType } from '../../utils/auditLogger';
import { db } from '../../db';

interface FetcherRegistry {
  [id: string]: FetcherBase;
}

export class FetchManager {
  private static instance: FetchManager;
  private fetchers: FetcherRegistry = {};
  private activeFetchCount: number = 0;
  private maxConcurrentFetches: number = 5; // Default max concurrent fetches
  private priorityQueue: string[] = []; // Queue of fetcher IDs ordered by priority
  
  private constructor() {
    // Private constructor for singleton pattern
  }
  
  /**
   * Get the singleton instance of the FetchManager
   */
  public static getInstance(): FetchManager {
    if (!FetchManager.instance) {
      FetchManager.instance = new FetchManager();
    }
    return FetchManager.instance;
  }
  
  /**
   * Initialize the fetch manager with all registered fetchers
   */
  public async initialize(): Promise<void> {
    try {
      // Load all fetcher configurations from database
      // For now, we'll just log that initialization is happening
      console.log('Initializing Fetch Manager');
      
      // Load existing configurations and create fetchers
      await this.loadFetchConfigurations();
      
      // Start all enabled fetchers
      this.startAllFetchers();
      
      // Log successful initialization
      console.log(`Fetch Manager initialized with ${Object.keys(this.fetchers).length} fetchers`);
    } catch (error) {
      console.error('Error initializing Fetch Manager:', error);
    }
  }
  
  /**
   * Load existing fetch configurations from the database
   */
  private async loadFetchConfigurations(): Promise<void> {
    // In a real implementation, this would load configs from the database
    // For now, this is just a placeholder
    console.log('Loading fetch configurations from database');
  }
  
  /**
   * Register a new fetcher with the manager
   */
  public registerFetcher(config: FetchConfig, type: string): FetcherBase {
    let fetcher: FetcherBase;
    
    // Create the appropriate fetcher type
    switch (type.toLowerCase()) {
      case 'googledrive':
        fetcher = new GoogleDriveFetcher(config);
        break;
      case 'email':
        fetcher = new EmailFetcher(config);
        break;
      default:
        throw new Error(`Unknown fetcher type: ${type}`);
    }
    
    // Add to registry
    this.fetchers[config.id] = fetcher;
    
    // Add to priority queue
    this.addToPriorityQueue(config.id, config.priority);
    
    // Log registration
    logAuditEvent({
      userId: config.userId,
      eventType: AuditEventType.ACCOUNT_CREATED,
      description: `Registered new ${type} fetcher`,
      metadata: {
        integrationId: config.integrationId,
        fetcherId: config.id,
        type
      }
    });
    
    return fetcher;
  }
  
  /**
   * Add a fetcher to the priority queue
   */
  private addToPriorityQueue(fetcherId: string, priority: FetchPriority): void {
    // Remove if already in queue
    this.priorityQueue = this.priorityQueue.filter(id => id !== fetcherId);
    
    // Find the right position based on priority
    let insertIndex = this.priorityQueue.length;
    
    for (let i = 0; i < this.priorityQueue.length; i++) {
      const queuedFetcherId = this.priorityQueue[i];
      const queuedFetcher = this.fetchers[queuedFetcherId];
      
      if (queuedFetcher.config.priority > priority) {
        insertIndex = i;
        break;
      }
    }
    
    // Insert at the right position
    this.priorityQueue.splice(insertIndex, 0, fetcherId);
  }
  
  /**
   * Start all enabled fetchers
   */
  public startAllFetchers(): void {
    for (const fetcherId of Object.keys(this.fetchers)) {
      const fetcher = this.fetchers[fetcherId];
      if (fetcher.config.enabled) {
        fetcher.start();
      }
    }
    
    console.log(`Started ${Object.keys(this.fetchers).length} fetchers`);
  }
  
  /**
   * Stop all fetchers
   */
  public stopAllFetchers(): void {
    for (const fetcherId of Object.keys(this.fetchers)) {
      const fetcher = this.fetchers[fetcherId];
      fetcher.stop();
    }
    
    console.log('Stopped all fetchers');
  }
  
  /**
   * Get a fetcher by ID
   */
  public getFetcher(id: string): FetcherBase | undefined {
    return this.fetchers[id];
  }
  
  /**
   * Remove a fetcher from the manager
   */
  public removeFetcher(id: string): boolean {
    if (!this.fetchers[id]) {
      return false;
    }
    
    // Stop the fetcher first
    this.fetchers[id].stop();
    
    // Remove from registry
    delete this.fetchers[id];
    
    // Remove from priority queue
    this.priorityQueue = this.priorityQueue.filter(fetcherId => fetcherId !== id);
    
    return true;
  }
  
  /**
   * Get all fetchers for a specific user
   */
  public getUserFetchers(userId: number): FetcherBase[] {
    return Object.values(this.fetchers).filter(
      fetcher => fetcher.config.userId === userId
    );
  }
  
  /**
   * Get all fetchers for a specific integration
   */
  public getIntegrationFetchers(integrationId: number): FetcherBase[] {
    return Object.values(this.fetchers).filter(
      fetcher => fetcher.config.integrationId === integrationId
    );
  }
  
  /**
   * Update the maximum number of concurrent fetches
   */
  public setMaxConcurrentFetches(max: number): void {
    this.maxConcurrentFetches = max;
    console.log(`Updated max concurrent fetches to ${max}`);
  }
  
  /**
   * Get the current setting for maximum concurrent fetches
   */
  public getMaxConcurrentFetches(): number {
    return this.maxConcurrentFetches;
  }
  
  /**
   * Get the current active fetch count
   */
  public getActiveFetchCount(): number {
    return this.activeFetchCount;
  }
  
  /**
   * Get statistics about the fetch system
   */
  public getStats(): any {
    const fetchers = Object.values(this.fetchers);
    
    const stats = {
      totalFetchers: fetchers.length,
      enabledFetchers: fetchers.filter(f => f.config.enabled).length,
      activeFetches: this.activeFetchCount,
      maxConcurrentFetches: this.maxConcurrentFetches,
      byPriority: {
        [FetchPriority.CRITICAL]: fetchers.filter(f => f.config.priority === FetchPriority.CRITICAL).length,
        [FetchPriority.HIGH]: fetchers.filter(f => f.config.priority === FetchPriority.HIGH).length,
        [FetchPriority.NORMAL]: fetchers.filter(f => f.config.priority === FetchPriority.NORMAL).length,
        [FetchPriority.LOW]: fetchers.filter(f => f.config.priority === FetchPriority.LOW).length,
        [FetchPriority.IDLE]: fetchers.filter(f => f.config.priority === FetchPriority.IDLE).length,
      },
      byType: {
        googleDrive: fetchers.filter(f => f instanceof GoogleDriveFetcher).length,
        email: fetchers.filter(f => f instanceof EmailFetcher).length,
      }
    };
    
    return stats;
  }
}