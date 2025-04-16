# CPI Hub Observability Framework

## Overview

The Observability Framework provides a comprehensive solution for monitoring the CPI Hub application. It includes three main components:

1. **Logging**: Advanced structured logging with context tracking
2. **Metrics**: Application metrics collection and reporting
3. **Tracing**: Distributed tracing for request flows

## Architecture

![Observability Architecture](assets/observability-architecture.png)

The observability framework is implemented as a modular system that can be gradually adopted through feature flags. This allows for controlled rollout and testing of advanced monitoring capabilities without disrupting existing functionality.

### Components

#### 1. Logging Service

The logging service provides structured logging with different severity levels and contextual information. Key features:

- Log levels: debug, info, warn, error, fatal
- Context tracking with request IDs
- Component-specific child loggers
- Formatted output for development
- JSON output for production (for log aggregation)

#### 2. Metrics Service

The metrics service collects and reports application metrics. Key features:

- Counter metrics (incrementing values)
- Gauge metrics (current state values)
- Histogram metrics (value distributions)
- Request duration tracking
- Automatic reporting at configurable intervals

#### 3. Tracing Service

The tracing service provides distributed tracing capabilities. Key features:

- Trace context propagation across service boundaries
- Span creation and management
- Event and attribute tracking
- Automatic tracing of HTTP requests
- Function/method tracing through decorators

## Integration

The framework integrates with Express through middleware functions:

- `requestLoggerMiddleware`: Logs HTTP requests and responses
- `requestDurationMiddleware`: Measures and records request durations
- `requestTracingMiddleware`: Traces request flows

These middlewares are applied at the application level through the `setupObservability` function.

## Feature Flag Control

The observability components can be enabled/disabled through feature flags:

- `enhanced-logging`: Controls advanced logging features
- `metrics-dashboard`: Controls metrics collection and reporting
- `distributed-tracing`: Controls distributed tracing

This allows for gradual rollout and A/B testing of monitoring capabilities.

## Usage Examples

### Logging

```typescript
import { logger, getComponentLogger } from '@/services/observability';

// General logging
logger.info('Application started');

// Component-specific logging
const authLogger = getComponentLogger('AuthService');
authLogger.info('User authenticated', { userId: user.id });

// Error logging with context
try {
  // Some operation
} catch (error) {
  logger.error('Failed to process request', { requestId }, error);
}
```

### Metrics

```typescript
import { metricsService, measureExecutionTime } from '@/services/observability';

// Increment a counter
metricsService.increment('api_calls_total', 1, { endpoint: '/api/users' });

// Set a gauge value
metricsService.setGauge('active_connections', activeConnections);

// Measure function execution time
const timedFunction = measureExecutionTime(originalFunction, 'function_duration');
```

### Tracing

```typescript
import { tracingService, Trace } from '@/services/observability';

// Manual tracing
function processDocument(document) {
  const spanId = tracingService.startSpan('processDocument', {
    attributes: { documentId: document.id }
  });
  
  try {
    // Processing steps
    tracingService.addSpanEvent(spanId, 'validation_completed');
    
    // More processing
    return result;
  } catch (error) {
    tracingService.setSpanStatus(spanId, 'error', error.message);
    throw error;
  } finally {
    tracingService.endSpan(spanId);
  }
}

// Decorator-based tracing
class DocumentService {
  @Trace('processDocument')
  async processDocument(document) {
    // Implementation
  }
}
```

## Health Check Endpoint

The framework provides a health check endpoint at `/api/health` that includes basic metrics:

```json
{
  "status": "UP",
  "timestamp": "2023-04-16T12:34:56.789Z",
  "metrics": {
    "counters": {
      "http_requests_total": 1245,
      "error_count": 12
    },
    "gauges": {
      "active_connections": 8
    }
  }
}
```

## Future Enhancements

1. **External Integration**: Connect to external monitoring systems (Prometheus, Grafana, Jaeger)
2. **Alerting**: Add alerting capabilities based on metrics and error patterns
3. **Dashboard**: Create a built-in metrics dashboard for real-time monitoring
4. **Log Aggregation**: Implement centralized log storage and search
5. **Performance Optimization**: Enhance the performance impact of observability components

## Best Practices

1. **Context Propagation**: Always propagate request IDs, trace IDs, and span IDs across service boundaries
2. **Meaningful Metrics**: Define metrics that provide actionable insights
3. **Selective Tracing**: Apply detailed tracing to critical paths only to reduce overhead
4. **Structured Logging**: Use structured logs with consistent field names
5. **Error Handling**: Ensure errors are properly captured and logged with context