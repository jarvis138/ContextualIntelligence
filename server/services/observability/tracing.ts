/**
 * Distributed Tracing Service
 * 
 * Provides basic tracing capability for tracking requests across services.
 * In a production environment, this would integrate with solutions like
 * Jaeger, Zipkin, or AWS X-Ray.
 */

import { randomBytes } from 'crypto';
import { logger } from './logger';

// Define trace span interface
interface TraceSpan {
  id: string;
  parentId?: string;
  traceId: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  attributes: Record<string, any>;
  events: Array<{
    name: string;
    timestamp: number;
    attributes?: Record<string, any>;
  }>;
  status: 'unset' | 'ok' | 'error';
  statusMessage?: string;
}

// Async local storage would be used in a real implementation to maintain context
// For simplicity, we're using a more basic approach here

/**
 * TracingService for distributed tracing
 */
class TracingService {
  private static instance: TracingService;
  private activeSpans: Map<string, TraceSpan> = new Map();
  private completedSpans: TraceSpan[] = [];
  private logger = logger.createChildLogger({ component: 'TracingService' });
  private reporter: NodeJS.Timeout | null = null;
  private reportInterval: number = 60000; // 1 minute by default
  private maxBufferSize: number = 1000; // Maximum spans to keep in memory
  
  constructor() {
    this.logger.info('Tracing service initialized');
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): TracingService {
    if (!TracingService.instance) {
      TracingService.instance = new TracingService();
    }
    return TracingService.instance;
  }
  
  /**
   * Start periodic reporting of traces
   */
  public startReporting(intervalMs: number = 60000): void {
    this.reportInterval = intervalMs;
    
    if (this.reporter) {
      clearInterval(this.reporter);
    }
    
    this.reporter = setInterval(() => {
      this.reportTraces();
    }, this.reportInterval);
    
    this.logger.info(`Started trace reporting every ${intervalMs}ms`);
  }
  
  /**
   * Stop periodic reporting
   */
  public stopReporting(): void {
    if (this.reporter) {
      clearInterval(this.reporter);
      this.reporter = null;
      this.logger.info('Stopped trace reporting');
    }
  }
  
  /**
   * Report all completed traces
   */
  public reportTraces(): void {
    if (this.completedSpans.length === 0) {
      return;
    }
    
    this.logger.info(`Reporting ${this.completedSpans.length} completed trace spans`);
    
    // In a real implementation, this would send traces to a tracing system
    // For now, we just log them in batches to avoid overwhelming the console
    const batchSize = 20;
    for (let i = 0; i < this.completedSpans.length; i += batchSize) {
      const batch = this.completedSpans.slice(i, i + batchSize);
      this.logger.debug(`Trace batch ${i / batchSize + 1}`, { count: batch.length }, batch);
    }
    
    // Clear completed spans
    this.completedSpans = [];
  }
  
  /**
   * Generate a new trace ID
   */
  public generateTraceId(): string {
    return randomBytes(16).toString('hex');
  }
  
  /**
   * Generate a new span ID
   */
  public generateSpanId(): string {
    return randomBytes(8).toString('hex');
  }
  
  /**
   * Start a new trace span
   */
  public startSpan(name: string, options: {
    parentId?: string;
    traceId?: string;
    attributes?: Record<string, any>;
  } = {}): string {
    const traceId = options.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();
    
    const span: TraceSpan = {
      id: spanId,
      parentId: options.parentId,
      traceId,
      name,
      startTime: Date.now(),
      attributes: options.attributes || {},
      events: [],
      status: 'unset',
    };
    
    this.activeSpans.set(spanId, span);
    
    return spanId;
  }
  
  /**
   * End a trace span
   */
  public endSpan(spanId: string, options: {
    status?: 'ok' | 'error';
    statusMessage?: string;
    attributes?: Record<string, any>;
  } = {}): void {
    const span = this.activeSpans.get(spanId);
    
    if (!span) {
      this.logger.warn(`Attempted to end non-existent span: ${spanId}`);
      return;
    }
    
    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = options.status || 'ok';
    
    if (options.statusMessage) {
      span.statusMessage = options.statusMessage;
    }
    
    if (options.attributes) {
      span.attributes = { ...span.attributes, ...options.attributes };
    }
    
    this.activeSpans.delete(spanId);
    this.completedSpans.push(span);
    
    // Trim completed spans if we exceed the buffer size
    if (this.completedSpans.length > this.maxBufferSize) {
      this.completedSpans = this.completedSpans.slice(
        this.completedSpans.length - this.maxBufferSize
      );
    }
  }
  
  /**
   * Add an event to a span
   */
  public addSpanEvent(spanId: string, name: string, attributes?: Record<string, any>): void {
    const span = this.activeSpans.get(spanId);
    
    if (!span) {
      this.logger.warn(`Attempted to add event to non-existent span: ${spanId}`);
      return;
    }
    
    span.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
  }
  
  /**
   * Add attributes to a span
   */
  public setSpanAttributes(spanId: string, attributes: Record<string, any>): void {
    const span = this.activeSpans.get(spanId);
    
    if (!span) {
      this.logger.warn(`Attempted to add attributes to non-existent span: ${spanId}`);
      return;
    }
    
    span.attributes = { ...span.attributes, ...attributes };
  }
  
  /**
   * Set span status
   */
  public setSpanStatus(spanId: string, status: 'ok' | 'error', message?: string): void {
    const span = this.activeSpans.get(spanId);
    
    if (!span) {
      this.logger.warn(`Attempted to set status for non-existent span: ${spanId}`);
      return;
    }
    
    span.status = status;
    
    if (message) {
      span.statusMessage = message;
    }
  }
  
  /**
   * Get active span by ID
   */
  public getSpan(spanId: string): TraceSpan | undefined {
    return this.activeSpans.get(spanId);
  }
  
  /**
   * Middleware for tracing HTTP requests
   */
  public requestTracingMiddleware(req: any, res: any, next: any): void {
    // Extract trace context from headers if present
    const traceId = req.headers['x-trace-id'] || this.generateTraceId();
    const parentSpanId = req.headers['x-span-id'];
    
    // Start a span for this request
    const spanId = this.startSpan(`HTTP ${req.method} ${req.path}`, {
      traceId,
      parentId: parentSpanId,
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.path': req.path,
        'http.route': req.route?.path,
        'http.host': req.headers.host,
        'http.user_agent': req.headers['user-agent'],
      },
    });
    
    // Add trace context to request object
    req.traceId = traceId;
    req.spanId = spanId;
    
    // Set trace context headers on response
    res.setHeader('X-Trace-ID', traceId);
    
    // Patch end method to complete the span
    const originalEnd = res.end;
    
    res.end = function(...args: any[]) {
      // End the span with the response status
      tracingService.endSpan(spanId, {
        status: res.statusCode >= 400 ? 'error' : 'ok',
        attributes: {
          'http.status_code': res.statusCode,
          'http.response_content_length': res.getHeader('content-length'),
        },
      });
      
      // Call original end method
      return originalEnd.apply(res, args);
    };
    
    next();
  }
  
  /**
   * Trace a function execution
   * Returns a wrapped function that is automatically traced
   */
  public traceFunction<T>(
    fn: (...args: any[]) => T,
    name: string,
    options: {
      attributes?: Record<string, any>;
      parentSpanId?: string;
      traceId?: string;
    } = {}
  ): (...args: any[]) => T {
    return (...args: any[]) => {
      const spanId = this.startSpan(name, {
        parentId: options.parentSpanId,
        traceId: options.traceId,
        attributes: options.attributes,
      });
      
      try {
        const result = fn(...args);
        
        // Handle both regular returns and promises
        if (result instanceof Promise) {
          return result
            .then((value) => {
              this.endSpan(spanId, { status: 'ok' });
              return value;
            })
            .catch((error) => {
              this.endSpan(spanId, {
                status: 'error',
                statusMessage: error.message,
                attributes: { 'error.type': error.constructor.name },
              });
              throw error;
            }) as any;
        } else {
          this.endSpan(spanId, { status: 'ok' });
          return result;
        }
      } catch (error: any) {
        this.endSpan(spanId, {
          status: 'error',
          statusMessage: error.message,
          attributes: { 'error.type': error.constructor.name },
        });
        throw error;
      }
    };
  }
}

// Export singleton instance
export const tracingService = TracingService.getInstance();

// Helper decorators for class methods (would be used in TypeScript with decorators)
export function Trace(name?: string, options: { attributes?: Record<string, any> } = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const spanName = name || `${target.constructor.name}.${propertyKey}`;
    
    descriptor.value = function(...args: any[]) {
      // Get trace context from this if it exists (for request handlers)
      const traceId = (this.req && this.req.traceId) || undefined;
      const parentSpanId = (this.req && this.req.spanId) || undefined;
      
      return tracingService.traceFunction(
        originalMethod.bind(this),
        spanName,
        {
          attributes: {
            'class.name': target.constructor.name,
            'method.name': propertyKey,
            ...options.attributes,
          },
          traceId,
          parentSpanId,
        }
      )(...args);
    };
    
    return descriptor;
  };
}