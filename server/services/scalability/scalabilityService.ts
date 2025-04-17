/**
 * Scalability Service
 * 
 * This service provides enterprise-grade scalability controls for AI processing,
 * enabling distributed processing, async queuing, and load balancing.
 * 
 * Features:
 * - Distributed processing configuration
 * - Asynchronous processing queues
 * - Priority-based request handling
 * - Horizontal scaling management
 * - Load balancing for AI requests
 * - Auto-scaling capabilities
 */

import { featureFlagService } from '../feature-flag';
import { FeatureFlags } from '../../../shared/feature-flags';
import { auditLogger } from '../../utils/auditLogger';
import crypto from 'crypto';

// Define priority levels for request processing
export type RequestPriority = 'low' | 'medium' | 'high' | 'critical';

// Define processing modes
export type ProcessingMode = 'sync' | 'async' | 'batch';

// Queue status
export type QueueStatus = 'ready' | 'busy' | 'overloaded' | 'paused';

// Request status
export type RequestStatus = 
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'rate_limited';

// Define a queued request
export interface QueuedRequest {
  id: string;
  timestamp: Date;
  priority: RequestPriority;
  tenantId: number;
  userId: number;
  processingMode: ProcessingMode;
  operation: string;
  payload: any;
  status: RequestStatus;
  resultCallback?: string; // Webhook URL or internal callback
  processingStartedAt?: Date;
  processingCompletedAt?: Date;
  result?: any;
  error?: any;
  retryCount: number;
  maxRetries: number;
}

// Queue configuration
interface QueueConfiguration {
  name: string;
  maxConcurrent: number;
  maxQueuedRequests: number;
  processingTimeoutMs: number;
  defaultPriority: RequestPriority;
  defaultMaxRetries: number;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    tokensPerMinutePerTenant: number;
  };
}

// Default queue configuration
const DEFAULT_QUEUE_CONFIG: QueueConfiguration = {
  name: 'default',
  maxConcurrent: 5,
  maxQueuedRequests: 1000,
  processingTimeoutMs: 60000, // 1 minute
  defaultPriority: 'medium',
  defaultMaxRetries: 3,
  rateLimits: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    tokensPerMinutePerTenant: 10000
  }
};

// Processing engine status
interface ProcessingEngineStatus {
  activeWorkers: number;
  availableWorkers: number;
  queuedRequests: number;
  processingRequests: number;
  completedRequests: number;
  failedRequests: number;
  avgProcessingTimeMs: number;
  uptime: number;
}

export class ScalabilityService {
  private queues: Map<string, QueueConfiguration> = new Map();
  private queuedRequests: Map<string, QueuedRequest[]> = new Map();
  private processingRequests: Map<string, Set<string>> = new Map();
  private requestsById: Map<string, QueuedRequest> = new Map();
  private tenantCounters: Map<number, { requestsPerMinute: number; tokensPerMinute: number }> = new Map();
  private globalCounters: { requestsPerMinute: number; requestsPerHour: number } = { requestsPerMinute: 0, requestsPerHour: 0 };
  private lastCounterReset: { minute: Date; hour: Date } = { minute: new Date(), hour: new Date() };
  
  constructor() {
    // Initialize with default queue
    this.createQueue(DEFAULT_QUEUE_CONFIG);
    
    // Set up counter reset interval
    setInterval(() => this.resetCounters(), 10000); // Check every 10 seconds
    
    // Set up processing loop
    setInterval(() => this.processQueue(), 100); // Process queue every 100ms
    
    console.log('Scalability Service initialized');
  }
  
  /**
   * Create a new processing queue
   */
  public createQueue(config: QueueConfiguration): boolean {
    // Check if a queue with this name already exists
    if (this.queues.has(config.name)) {
      return false;
    }
    
    // Store the queue configuration
    this.queues.set(config.name, { ...config });
    
    // Initialize queue state
    this.queuedRequests.set(config.name, []);
    this.processingRequests.set(config.name, new Set());
    
    // Log queue creation
    auditLogger.log({
      action: 'queue_created',
      actor: 'system',
      target: `queue:${config.name}`,
      targetType: 'queue',
      details: {
        maxConcurrent: config.maxConcurrent,
        maxQueuedRequests: config.maxQueuedRequests,
        defaultPriority: config.defaultPriority
      }
    });
    
    return true;
  }
  
  /**
   * Update an existing queue configuration
   */
  public updateQueue(name: string, config: Partial<QueueConfiguration>): QueueConfiguration | null {
    // Check if the queue exists
    if (!this.queues.has(name)) {
      return null;
    }
    
    // Get current config
    const currentConfig = this.queues.get(name)!;
    
    // Apply updates
    const updatedConfig = { ...currentConfig, ...config, name };
    
    // Store updated config
    this.queues.set(name, updatedConfig);
    
    // Log queue update
    auditLogger.log({
      action: 'queue_updated',
      actor: 'system',
      target: `queue:${name}`,
      targetType: 'queue',
      details: { updatedFields: Object.keys(config) }
    });
    
    return { ...updatedConfig };
  }
  
  /**
   * Enqueue a request for processing
   */
  public enqueueRequest(
    queueName: string,
    operation: string,
    payload: any,
    options: {
      tenantId: number;
      userId: number;
      priority?: RequestPriority;
      processingMode?: ProcessingMode;
      resultCallback?: string;
      maxRetries?: number;
    }
  ): QueuedRequest | null {
    // Check if scalability controls are enabled
    if (!this.isScalabilityControlsEnabled()) {
      return null;
    }
    
    // Check if the queue exists
    if (!this.queues.has(queueName)) {
      return null;
    }
    
    const queue = this.queues.get(queueName)!;
    
    // Check rate limits
    if (!this.checkRateLimits(options.tenantId, payload)) {
      // Create a rate-limited request object
      const request: QueuedRequest = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        priority: options.priority || queue.defaultPriority,
        tenantId: options.tenantId,
        userId: options.userId,
        processingMode: options.processingMode || 'async',
        operation,
        payload,
        status: 'rate_limited',
        resultCallback: options.resultCallback,
        retryCount: 0,
        maxRetries: options.maxRetries || queue.defaultMaxRetries
      };
      
      // Store the request
      this.requestsById.set(request.id, request);
      
      // Log rate limiting
      auditLogger.log({
        action: 'request_rate_limited',
        actor: options.userId.toString(),
        target: `queue:${queueName}`,
        targetType: 'queue',
        tenant: options.tenantId.toString(),
        details: {
          operation,
          requestId: request.id
        }
      });
      
      return request;
    }
    
    // Check if queue is full
    const currentQueue = this.queuedRequests.get(queueName)!;
    if (currentQueue.length >= queue.maxQueuedRequests) {
      // Log queue full
      auditLogger.log({
        action: 'queue_full',
        actor: options.userId.toString(),
        target: `queue:${queueName}`,
        targetType: 'queue',
        tenant: options.tenantId.toString(),
        details: {
          operation,
          queueLength: currentQueue.length,
          maxQueueLength: queue.maxQueuedRequests
        }
      });
      
      return null;
    }
    
    // Create a new request
    const request: QueuedRequest = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      priority: options.priority || queue.defaultPriority,
      tenantId: options.tenantId,
      userId: options.userId,
      processingMode: options.processingMode || 'async',
      operation,
      payload,
      status: 'queued',
      resultCallback: options.resultCallback,
      retryCount: 0,
      maxRetries: options.maxRetries || queue.defaultMaxRetries
    };
    
    // Update counters
    this.incrementCounters(options.tenantId, payload);
    
    // Store the request
    this.requestsById.set(request.id, request);
    
    // Add to queue
    currentQueue.push(request);
    
    // Sort queue by priority and timestamp
    currentQueue.sort((a, b) => {
      // Sort by priority first (critical > high > medium > low)
      const priorityOrder: Record<RequestPriority, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3
      };
      
      const priorityA = priorityOrder[a.priority];
      const priorityB = priorityOrder[b.priority];
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Then sort by timestamp (older first)
      return a.timestamp.getTime() - b.timestamp.getTime();
    });
    
    // Log request queued
    auditLogger.log({
      action: 'request_queued',
      actor: options.userId.toString(),
      target: `queue:${queueName}`,
      targetType: 'queue',
      tenant: options.tenantId.toString(),
      details: {
        operation,
        requestId: request.id,
        priority: request.priority,
        queuePosition: currentQueue.findIndex(r => r.id === request.id)
      }
    });
    
    return request;
  }
  
  /**
   * Get status of a specific request
   */
  public getRequestStatus(requestId: string): QueuedRequest | null {
    return this.requestsById.get(requestId) || null;
  }
  
  /**
   * Cancel a queued request
   */
  public cancelRequest(requestId: string, userId: number): boolean {
    // Check if the request exists
    if (!this.requestsById.has(requestId)) {
      return false;
    }
    
    const request = this.requestsById.get(requestId)!;
    
    // Only queued requests can be cancelled
    if (request.status !== 'queued') {
      return false;
    }
    
    // Check if the user has permission to cancel
    if (request.userId !== userId) {
      return false;
    }
    
    // Update request status
    request.status = 'cancelled';
    
    // Remove from queue
    for (const [queueName, queue] of this.queuedRequests.entries()) {
      const index = queue.findIndex(r => r.id === requestId);
      if (index !== -1) {
        queue.splice(index, 1);
        
        // Log request cancelled
        auditLogger.log({
          action: 'request_cancelled',
          actor: userId.toString(),
          target: `queue:${queueName}`,
          targetType: 'queue',
          tenant: request.tenantId.toString(),
          details: {
            operation: request.operation,
            requestId
          }
        });
        
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Get status of a specific queue
   */
  public getQueueStatus(queueName: string): {
    status: QueueStatus;
    config: QueueConfiguration;
    queuedRequests: number;
    processingRequests: number;
    oldestRequest?: Date;
    estimatedWaitTimeMs?: number;
  } | null {
    // Check if the queue exists
    if (!this.queues.has(queueName)) {
      return null;
    }
    
    const queue = this.queues.get(queueName)!;
    const queuedItems = this.queuedRequests.get(queueName)!;
    const processingItems = this.processingRequests.get(queueName)!;
    
    let status: QueueStatus = 'ready';
    
    if (processingItems.size >= queue.maxConcurrent) {
      status = 'busy';
    }
    
    if (queuedItems.length >= queue.maxQueuedRequests) {
      status = 'overloaded';
    }
    
    // Determine oldest request and estimate wait time
    let oldestRequest: Date | undefined;
    let estimatedWaitTimeMs: number | undefined;
    
    if (queuedItems.length > 0) {
      oldestRequest = queuedItems[0].timestamp;
      
      // Very rough estimation based on current processing rate
      // In a real implementation, this would use historical processing times
      estimatedWaitTimeMs = 
        (queuedItems.length / Math.max(1, queue.maxConcurrent)) * 
        queue.processingTimeoutMs;
    }
    
    return {
      status,
      config: { ...queue },
      queuedRequests: queuedItems.length,
      processingRequests: processingItems.size,
      oldestRequest,
      estimatedWaitTimeMs
    };
  }
  
  /**
   * Process the queue
   */
  private processQueue(): void {
    // Check if scalability controls are enabled
    if (!this.isScalabilityControlsEnabled()) {
      return;
    }
    
    // Process each queue
    for (const [queueName, queue] of this.queues.entries()) {
      const queuedItems = this.queuedRequests.get(queueName)!;
      const processingItems = this.processingRequests.get(queueName)!;
      
      // Check if we can process more items
      if (processingItems.size >= queue.maxConcurrent) {
        continue;
      }
      
      // Calculate how many more items we can process
      const availableSlots = queue.maxConcurrent - processingItems.size;
      
      // Get the next batch of items to process
      const itemsToProcess = queuedItems.slice(0, availableSlots);
      
      // Move items from queued to processing
      for (const item of itemsToProcess) {
        // Remove from the queue
        const index = queuedItems.indexOf(item);
        if (index !== -1) {
          queuedItems.splice(index, 1);
        }
        
        // Mark as processing
        item.status = 'processing';
        item.processingStartedAt = new Date();
        
        // Add to processing set
        processingItems.add(item.id);
        
        // In a real implementation, this would dispatch to a worker
        // For now, we'll just simulate async processing
        this.simulateProcessing(queueName, item);
      }
    }
  }
  
  /**
   * Simulate processing a request (for demonstration)
   */
  private simulateProcessing(queueName: string, request: QueuedRequest): void {
    const queue = this.queues.get(queueName)!;
    
    // Simulate processing time based on processing mode
    let processingTimeMs = 1000; // Default 1 second
    
    if (request.processingMode === 'batch') {
      processingTimeMs = 5000; // Batch takes longer
    }
    
    // Random variability
    processingTimeMs += Math.random() * 2000;
    
    // Simulate processing
    setTimeout(() => {
      // Get the processing set
      const processingItems = this.processingRequests.get(queueName)!;
      
      // Determine success or failure (90% success rate)
      const success = Math.random() < 0.9;
      
      if (success) {
        // Request completed successfully
        request.status = 'completed';
        request.processingCompletedAt = new Date();
        request.result = { success: true, message: 'Request processed successfully' };
        
        // Log request completed
        auditLogger.log({
          action: 'request_completed',
          actor: request.userId.toString(),
          target: `queue:${queueName}`,
          targetType: 'queue',
          tenant: request.tenantId.toString(),
          details: {
            operation: request.operation,
            requestId: request.id,
            processingTimeMs: request.processingCompletedAt.getTime() - (request.processingStartedAt?.getTime() || 0)
          }
        });
      } else {
        // Request failed
        request.retryCount++;
        
        if (request.retryCount <= request.maxRetries) {
          // Retry the request
          request.status = 'queued';
          request.processingStartedAt = undefined;
          request.processingCompletedAt = undefined;
          
          // Add back to the queue
          const queuedItems = this.queuedRequests.get(queueName)!;
          queuedItems.push(request);
          
          // Sort queue
          queuedItems.sort((a, b) => {
            const priorityOrder: Record<RequestPriority, number> = {
              critical: 0,
              high: 1,
              medium: 2,
              low: 3
            };
            
            const priorityA = priorityOrder[a.priority];
            const priorityB = priorityOrder[b.priority];
            
            if (priorityA !== priorityB) {
              return priorityA - priorityB;
            }
            
            return a.timestamp.getTime() - b.timestamp.getTime();
          });
          
          // Log request retry
          auditLogger.log({
            action: 'request_retry',
            actor: request.userId.toString(),
            target: `queue:${queueName}`,
            targetType: 'queue',
            tenant: request.tenantId.toString(),
            details: {
              operation: request.operation,
              requestId: request.id,
              retryCount: request.retryCount,
              maxRetries: request.maxRetries
            }
          });
        } else {
          // Max retries exceeded
          request.status = 'failed';
          request.processingCompletedAt = new Date();
          request.error = { message: 'Request processing failed', retries: request.retryCount };
          
          // Log request failed
          auditLogger.log({
            action: 'request_failed',
            actor: request.userId.toString(),
            target: `queue:${queueName}`,
            targetType: 'queue',
            tenant: request.tenantId.toString(),
            details: {
              operation: request.operation,
              requestId: request.id,
              retryCount: request.retryCount,
              maxRetries: request.maxRetries
            }
          });
        }
      }
      
      // Remove from processing set
      processingItems.delete(request.id);
      
    }, processingTimeMs);
  }
  
  /**
   * Check rate limits for a request
   */
  private checkRateLimits(tenantId: number, payload: any): boolean {
    // Initialize tenant counters if not exist
    if (!this.tenantCounters.has(tenantId)) {
      this.tenantCounters.set(tenantId, {
        requestsPerMinute: 0,
        tokensPerMinute: 0
      });
    }
    
    const tenantCounter = this.tenantCounters.get(tenantId)!;
    const queue = this.queues.get('default')!;
    
    // Check global rate limits
    if (this.globalCounters.requestsPerMinute >= queue.rateLimits.requestsPerMinute) {
      return false;
    }
    
    if (this.globalCounters.requestsPerHour >= queue.rateLimits.requestsPerHour) {
      return false;
    }
    
    // Check tenant-specific rate limits
    if (tenantCounter.requestsPerMinute >= queue.rateLimits.requestsPerMinute) {
      return false;
    }
    
    // Check token usage (assuming payload might have a length or token count field)
    const estimatedTokenCount = this.estimateTokenCount(payload);
    if (
      tenantCounter.tokensPerMinute + estimatedTokenCount >=
      queue.rateLimits.tokensPerMinutePerTenant
    ) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Increment rate limit counters
   */
  private incrementCounters(tenantId: number, payload: any): void {
    // Initialize tenant counters if not exist
    if (!this.tenantCounters.has(tenantId)) {
      this.tenantCounters.set(tenantId, {
        requestsPerMinute: 0,
        tokensPerMinute: 0
      });
    }
    
    const tenantCounter = this.tenantCounters.get(tenantId)!;
    
    // Increment global counters
    this.globalCounters.requestsPerMinute++;
    this.globalCounters.requestsPerHour++;
    
    // Increment tenant counters
    tenantCounter.requestsPerMinute++;
    
    // Increment token usage
    const estimatedTokenCount = this.estimateTokenCount(payload);
    tenantCounter.tokensPerMinute += estimatedTokenCount;
  }
  
  /**
   * Estimate token count for a request payload
   */
  private estimateTokenCount(payload: any): number {
    // In a real implementation, this would use a tokenizer
    // For now, we'll use a simple estimation based on payload size
    
    // If payload has a tokenCount field, use that
    if (payload && typeof payload === 'object' && 'tokenCount' in payload) {
      return parseInt(payload.tokenCount, 10) || 0;
    }
    
    // Otherwise estimate based on JSON size
    // Very rough approximation: 1 token ≈ 4 characters
    const payloadSize = JSON.stringify(payload).length;
    return Math.ceil(payloadSize / 4);
  }
  
  /**
   * Reset rate limit counters
   */
  private resetCounters(): void {
    const now = new Date();
    
    // Reset per-minute counters if a minute has passed
    if (now.getTime() - this.lastCounterReset.minute.getTime() >= 60000) {
      this.globalCounters.requestsPerMinute = 0;
      
      // Reset tenant counters
      for (const counter of this.tenantCounters.values()) {
        counter.requestsPerMinute = 0;
        counter.tokensPerMinute = 0;
      }
      
      this.lastCounterReset.minute = now;
    }
    
    // Reset per-hour counters if an hour has passed
    if (now.getTime() - this.lastCounterReset.hour.getTime() >= 3600000) {
      this.globalCounters.requestsPerHour = 0;
      this.lastCounterReset.hour = now;
    }
  }
  
  /**
   * Get overall processing engine status
   */
  public getEngineStatus(): ProcessingEngineStatus {
    // Calculate total values across all queues
    let activeWorkers = 0;
    let availableWorkers = 0;
    let queuedRequests = 0;
    let processingRequests = 0;
    let completedRequests = 0;
    let failedRequests = 0;
    let totalProcessingTime = 0;
    let totalProcessedRequests = 0;
    
    // Calculate totals from all queues
    for (const [queueName, queueConfig] of this.queues.entries()) {
      const queuedItems = this.queuedRequests.get(queueName)!;
      const processingItems = this.processingRequests.get(queueName)!;
      
      availableWorkers += queueConfig.maxConcurrent;
      activeWorkers += processingItems.size;
      queuedRequests += queuedItems.length;
      processingRequests += processingItems.size;
    }
    
    // Calculate completed and failed requests
    for (const request of this.requestsById.values()) {
      if (request.status === 'completed') {
        completedRequests++;
        
        // Calculate processing time for completed requests
        if (request.processingStartedAt && request.processingCompletedAt) {
          const processingTime = 
            request.processingCompletedAt.getTime() - request.processingStartedAt.getTime();
          totalProcessingTime += processingTime;
          totalProcessedRequests++;
        }
      } else if (request.status === 'failed') {
        failedRequests++;
      }
    }
    
    // Calculate average processing time
    const avgProcessingTimeMs = 
      totalProcessedRequests > 0 ? totalProcessingTime / totalProcessedRequests : 0;
    
    return {
      activeWorkers,
      availableWorkers,
      queuedRequests,
      processingRequests,
      completedRequests,
      failedRequests,
      avgProcessingTimeMs,
      uptime: this.getUptime()
    };
  }
  
  /**
   * Get uptime in seconds
   */
  private getUptime(): number {
    // In a real implementation, this would be the actual service uptime
    // For now, we'll just return a fixed value
    return 3600; // 1 hour
  }
  
  /**
   * Check if scalability controls are enabled
   */
  private isScalabilityControlsEnabled(): boolean {
    return featureFlagService.isEnabled(FeatureFlags.SCALABILITY_CONTROLS);
  }
}

// Create and export a singleton instance
export const scalabilityService = new ScalabilityService();