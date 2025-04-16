/**
 * Observability Module
 * 
 * Centralizes and exports all observability components:
 * - Logging
 * - Metrics
 * - Tracing
 * 
 * This module provides a unified interface for application monitoring
 * and observability.
 */

import { logger, requestLoggerMiddleware, getComponentLogger } from './logger';
import { metricsService, measureExecutionTime } from './metrics';
import { tracingService, Trace } from './tracing';
import { initializeMetrics } from './init-metrics';
import { Express, Request, Response, NextFunction } from 'express';

// Re-export individual components
export {
  logger,
  requestLoggerMiddleware,
  getComponentLogger,
  metricsService,
  measureExecutionTime,
  tracingService,
  Trace,
  initializeMetrics
};

/**
 * Setup observability middleware for Express
 */
export function setupObservability(app: Express): void {
  // Initialize metrics
  initializeMetrics();
  
  // Add request logging middleware
  app.use(requestLoggerMiddleware);
  
  // Add metrics middleware
  app.use(metricsService.requestDurationMiddleware.bind(metricsService));
  
  // Add tracing middleware
  app.use(tracingService.requestTracingMiddleware.bind(tracingService));
  
  // Start metrics reporting
  metricsService.startReporting();
  
  // Start trace reporting
  tracingService.startReporting();
  
  // Add a clean shutdown handler
  const cleanShutdown = () => {
    logger.info('Application shutting down, stopping observability services');
    metricsService.stopReporting();
    tracingService.stopReporting();
    
    // Final reports before exit
    metricsService.reportMetrics();
    tracingService.reportTraces();
    
    process.exit(0);
  };
  
  // Register shutdown handlers
  process.on('SIGTERM', cleanShutdown);
  process.on('SIGINT', cleanShutdown);
  
  // Add health check endpoint that includes metrics
  app.get('/api/health', (req: Request, res: Response) => {
    const health = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      metrics: {
        counters: Object.entries(metricsService.getAllMetrics())
          .filter(([_, metric]) => metric.type === 'counter')
          .reduce((acc, [name, metric]) => {
            acc[name] = metric.value;
            return acc;
          }, {} as Record<string, number>),
        gauges: Object.entries(metricsService.getAllMetrics())
          .filter(([_, metric]) => metric.type === 'gauge')
          .reduce((acc, [name, metric]) => {
            acc[name] = metric.value;
            return acc;
          }, {} as Record<string, number>)
      }
    };
    
    res.json(health);
  });
  
  // Add an error tracking middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    // Log the error
    logger.error(`Uncaught error: ${err.message}`, {
      requestId: req.id,
      traceId: req.traceId,
      spanId: req.spanId,
      url: req.url,
      method: req.method
    }, err);
    
    // Increment error counter
    metricsService.increment('error_count', 1, {
      type: err.name || 'Unknown',
      path: req.path
    });
    
    // If there's an active span, mark it as error
    if (req.spanId) {
      tracingService.setSpanStatus(req.spanId, 'error', err.message);
    }
    
    // Continue to the next error handler
    next(err);
  });
  
  logger.info('Observability framework initialized');
}