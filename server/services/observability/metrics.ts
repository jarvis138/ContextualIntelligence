/**
 * Metrics Service
 * 
 * Provides a framework for collecting and reporting application metrics.
 * In a production environment, this would integrate with a proper metrics
 * solution like Prometheus, DataDog, or CloudWatch.
 */

import { logger } from './logger';

// Define metric types
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

// Interface for metric options
interface MetricOptions {
  name: string;
  description: string;
  labels?: Record<string, string>;
  type: MetricType;
}

// Interface for counter metric
interface CounterMetric extends MetricOptions {
  type: 'counter';
  value: number;
}

// Interface for gauge metric
interface GaugeMetric extends MetricOptions {
  type: 'gauge';
  value: number;
}

// Interface for histogram metric
interface HistogramMetric extends MetricOptions {
  type: 'histogram';
  buckets: number[];
  values: number[];
  sum: number;
  count: number;
}

// Interface for summary metric
interface SummaryMetric extends MetricOptions {
  type: 'summary';
  quantiles: number[];
  values: number[];
  sum: number;
  count: number;
}

// Union type for all metrics
type Metric = CounterMetric | GaugeMetric | HistogramMetric | SummaryMetric;

/**
 * MetricsService class for collecting and reporting metrics
 */
class MetricsService {
  private static instance: MetricsService;
  private metrics: Record<string, Metric> = {};
  private logger = logger.createChildLogger({ component: 'MetricsService' });
  private reporter: NodeJS.Timeout | null = null;
  private reportInterval: number = 60000; // 1 minute by default
  
  constructor() {
    this.logger.info('Metrics service initialized');
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }
  
  /**
   * Start periodic reporting of metrics
   */
  public startReporting(intervalMs: number = 60000): void {
    this.reportInterval = intervalMs;
    
    if (this.reporter) {
      clearInterval(this.reporter);
    }
    
    this.reporter = setInterval(() => {
      this.reportMetrics();
    }, this.reportInterval);
    
    this.logger.info(`Started metrics reporting every ${intervalMs}ms`);
  }
  
  /**
   * Stop periodic reporting
   */
  public stopReporting(): void {
    if (this.reporter) {
      clearInterval(this.reporter);
      this.reporter = null;
      this.logger.info('Stopped metrics reporting');
    }
  }
  
  /**
   * Report all current metrics
   */
  public reportMetrics(): void {
    this.logger.info('Reporting metrics', {}, this.metrics);
    
    // In a real implementation, this would send metrics to a monitoring system
    // For now, we just log them
  }
  
  /**
   * Create a new counter metric or get an existing one
   */
  public counter(options: Omit<CounterMetric, 'type' | 'value'>): CounterMetric {
    const name = this.formatMetricName(options.name);
    
    if (!this.metrics[name]) {
      this.metrics[name] = {
        ...options,
        name,
        type: 'counter',
        value: 0
      };
    }
    
    return this.metrics[name] as CounterMetric;
  }
  
  /**
   * Increment a counter metric
   */
  public increment(name: string, value: number = 1, labels?: Record<string, string>): void {
    const metricName = this.formatMetricName(name);
    const metric = this.metrics[metricName] as CounterMetric;
    
    if (!metric || metric.type !== 'counter') {
      this.logger.warn(`Attempted to increment non-existent counter metric: ${name}`);
      return;
    }
    
    metric.value += value;
    
    if (labels) {
      metric.labels = { ...metric.labels, ...labels };
    }
  }
  
  /**
   * Create a new gauge metric or get an existing one
   */
  public gauge(options: Omit<GaugeMetric, 'type' | 'value'>): GaugeMetric {
    const name = this.formatMetricName(options.name);
    
    if (!this.metrics[name]) {
      this.metrics[name] = {
        ...options,
        name,
        type: 'gauge',
        value: 0
      };
    }
    
    return this.metrics[name] as GaugeMetric;
  }
  
  /**
   * Set a gauge metric value
   */
  public setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const metricName = this.formatMetricName(name);
    const metric = this.metrics[metricName] as GaugeMetric;
    
    if (!metric || metric.type !== 'gauge') {
      this.logger.warn(`Attempted to set non-existent gauge metric: ${name}`);
      return;
    }
    
    metric.value = value;
    
    if (labels) {
      metric.labels = { ...metric.labels, ...labels };
    }
  }
  
  /**
   * Record a value for timing operations
   */
  public recordTiming(name: string, value: number, labels?: Record<string, string>): void {
    const metricName = this.formatMetricName(name);
    
    // Create a histogram if it doesn't exist
    if (!this.metrics[metricName]) {
      this.metrics[metricName] = {
        name: metricName,
        description: `Timing histogram for ${name}`,
        type: 'histogram',
        buckets: [10, 50, 100, 200, 500, 1000, 5000], // millisecond buckets
        values: [],
        sum: 0,
        count: 0
      };
    }
    
    const metric = this.metrics[metricName] as HistogramMetric;
    
    if (metric.type !== 'histogram') {
      this.logger.warn(`Attempted to record timing for non-histogram metric: ${name}`);
      return;
    }
    
    metric.values.push(value);
    metric.sum += value;
    metric.count++;
    
    if (labels) {
      metric.labels = { ...metric.labels, ...labels };
    }
    
    // Keep only the last 1000 values to prevent memory issues
    if (metric.values.length > 1000) {
      const removed = metric.values.shift();
      if (removed) {
        metric.sum -= removed;
        metric.count--;
      }
    }
  }
  
  /**
   * Helper to format metric names (remove spaces, lowercase, etc.)
   */
  private formatMetricName(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '_');
  }
  
  /**
   * Get all metrics (for reporting or API endpoints)
   */
  public getAllMetrics(): Record<string, Metric> {
    return { ...this.metrics };
  }
  
  /**
   * Clear all metrics (for testing)
   */
  public clearMetrics(): void {
    this.metrics = {};
    this.logger.info('Cleared all metrics');
  }
  
  /**
   * Create a timer for measuring operation duration
   * Returns a function that, when called, stops the timer and records the duration
   */
  public startTimer(name: string, labels?: Record<string, string>): () => number {
    const start = Date.now();
    
    return () => {
      const duration = Date.now() - start;
      this.recordTiming(name, duration, labels);
      return duration;
    };
  }
  
  /**
   * Middleware for measuring API request durations
   */
  public requestDurationMiddleware(req: any, res: any, next: any): void {
    const endTimer = this.startTimer('http_request_duration', {
      method: req.method,
      path: req.route?.path || req.path
    });
    
    // Increment request counter
    this.increment('http_requests_total', 1, {
      method: req.method,
      path: req.route?.path || req.path
    });
    
    // Patch end method to record duration and status
    const originalEnd = res.end;
    
    res.end = function(...args: any[]) {
      const duration = endTimer();
      
      // Record response status
      metricsService.increment('http_responses_total', 1, {
        method: req.method,
        path: req.route?.path || req.path,
        status: res.statusCode.toString()
      });
      
      // Call original end method
      return originalEnd.apply(res, args);
    };
    
    next();
  }
}

// Export singleton instance
export const metricsService = MetricsService.getInstance();

// Export function for measuring function execution time
export function measureExecutionTime<T>(
  fn: (...args: any[]) => T,
  metricName: string,
  labels?: Record<string, string>
): (...args: any[]) => T {
  return (...args: any[]) => {
    const endTimer = metricsService.startTimer(metricName, labels);
    const result = fn(...args);
    
    // Handle both regular returns and promises
    if (result instanceof Promise) {
      return result
        .then((value) => {
          endTimer();
          return value;
        })
        .catch((error) => {
          endTimer();
          throw error;
        }) as any;
    } else {
      endTimer();
      return result;
    }
  };
}