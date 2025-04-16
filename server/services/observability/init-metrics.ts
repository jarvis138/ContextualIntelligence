/**
 * Initialize Metrics
 * 
 * This module initializes default metrics that are used throughout the application.
 * Having predefined metrics helps avoid the "non-existent metric" warnings.
 */

import { metricsService } from './metrics';
import { logger } from './logger';

/**
 * Initialize all default metrics used in the application
 */
export function initializeMetrics(): void {
  const metricsLogger = logger.createChildLogger({ component: 'MetricsInit' });

  // HTTP request metrics
  metricsService.counter({
    name: 'http_requests_total',
    description: 'Total number of HTTP requests'
  });
  
  metricsService.counter({
    name: 'http_responses_total',
    description: 'Total number of HTTP responses'
  });
  
  // Error metrics
  metricsService.counter({
    name: 'error_count',
    description: 'Total number of errors'
  });
  
  // API metrics
  metricsService.counter({
    name: 'api_calls_total',
    description: 'Total number of API calls'
  });
  
  // Database metrics
  metricsService.counter({
    name: 'db_queries_total',
    description: 'Total number of database queries'
  });
  
  metricsService.gauge({
    name: 'db_active_connections',
    description: 'Number of active database connections'
  });
  
  // External API metrics
  metricsService.counter({
    name: 'external_api_calls_total',
    description: 'Total number of external API calls'
  });
  
  metricsService.counter({
    name: 'external_api_errors_total',
    description: 'Total number of external API errors'
  });
  
  // Authentication metrics
  metricsService.counter({
    name: 'auth_success_total',
    description: 'Total number of successful authentication attempts'
  });
  
  metricsService.counter({
    name: 'auth_failure_total',
    description: 'Total number of failed authentication attempts'
  });
  
  // Feature usage metrics
  metricsService.counter({
    name: 'feature_usage_total',
    description: 'Total number of feature usages'
  });
  
  // Resource metrics
  metricsService.gauge({
    name: 'active_users',
    description: 'Number of active users'
  });
  
  metricsService.gauge({
    name: 'active_sessions',
    description: 'Number of active sessions'
  });
  
  metricsService.gauge({
    name: 'memory_usage',
    description: 'Memory usage in MB'
  });
  
  // Create timing metrics for key operations
  metricsService.recordTiming('http_request_duration', 0);
  metricsService.recordTiming('db_query_duration', 0);
  metricsService.recordTiming('external_api_duration', 0);
  
  metricsLogger.info('Default metrics initialized');
}