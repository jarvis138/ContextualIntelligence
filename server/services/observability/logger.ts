/**
 * Advanced Logging Service
 * 
 * Provides structured logging capabilities with different log levels,
 * context tracking, and support for various output formats.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogContext {
  requestId?: string;
  userId?: number;
  sessionId?: string;
  traceId?: string;
  component?: string;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  data?: any;
}

class Logger {
  private static instance: Logger;
  private environment: string;
  private serviceName: string = 'cpi-hub';
  
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  /**
   * Set the service name for all logs
   */
  public setServiceName(name: string): void {
    this.serviceName = name;
  }
  
  /**
   * Create a child logger with fixed context
   */
  public createChildLogger(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.setServiceName(this.serviceName);
    
    // Override the log method to include the fixed context
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level: LogLevel, message: string, logContext: LogContext = {}, data?: any) => {
      originalLog(level, message, { ...context, ...logContext }, data);
    };
    
    return childLogger;
  }
  
  /**
   * Core logging method
   */
  public log(level: LogLevel, message: string, context: LogContext = {}, data?: any): void {
    const timestamp = new Date().toISOString();
    
    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      context: {
        service: this.serviceName,
        env: this.environment,
        ...context
      }
    };
    
    if (data !== undefined) {
      logEntry.data = data;
    }
    
    this.writeLog(logEntry);
  }
  
  /**
   * Debug level logging
   */
  public debug(message: string, context: LogContext = {}, data?: any): void {
    this.log('debug', message, context, data);
  }
  
  /**
   * Info level logging
   */
  public info(message: string, context: LogContext = {}, data?: any): void {
    this.log('info', message, context, data);
  }
  
  /**
   * Warning level logging
   */
  public warn(message: string, context: LogContext = {}, data?: any): void {
    this.log('warn', message, context, data);
  }
  
  /**
   * Error level logging
   */
  public error(message: string, context: LogContext = {}, data?: any): void {
    this.log('error', message, context, data);
  }
  
  /**
   * Fatal level logging
   */
  public fatal(message: string, context: LogContext = {}, data?: any): void {
    this.log('fatal', message, context, data);
  }
  
  /**
   * Write log to the appropriate destination
   */
  private writeLog(logEntry: LogEntry): void {
    // In production, you might want to write to a log service or file
    // For development, console is fine
    
    let consoleMethod: 'log' | 'info' | 'warn' | 'error';
    
    switch (logEntry.level) {
      case 'debug':
        consoleMethod = 'log';
        break;
      case 'info':
        consoleMethod = 'info';
        break;
      case 'warn':
        consoleMethod = 'warn';
        break;
      case 'error':
      case 'fatal':
        consoleMethod = 'error';
        break;
      default:
        consoleMethod = 'log';
    }
    
    // In production, logs should be in JSON format for easier parsing
    if (this.environment === 'production') {
      console[consoleMethod](JSON.stringify(logEntry));
    } else {
      // For development, format logs for readability
      const contextStr = Object.keys(logEntry.context).length
        ? ` [${Object.entries(logEntry.context)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ')}]`
        : '';
      
      const formattedMessage = `${logEntry.timestamp} ${logEntry.level.toUpperCase()} ${logEntry.message}${contextStr}`;
      
      console[consoleMethod](formattedMessage);
      
      if (logEntry.data) {
        console[consoleMethod]('Data:', logEntry.data);
      }
    }
  }
  
  /**
   * Log HTTP request information
   */
  public logRequest(req: any, context: LogContext = {}): void {
    this.info(
      `HTTP ${req.method} ${req.url}`,
      {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        ...context
      }
    );
  }
  
  /**
   * Log HTTP response information
   */
  public logResponse(req: any, res: any, responseTime: number, context: LogContext = {}): void {
    this.info(
      `HTTP ${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms`,
      {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime,
        ...context
      }
    );
  }
  
  /**
   * Log database query information
   */
  public logQuery(query: string, params: any[], duration: number, context: LogContext = {}): void {
    this.debug(
      `DB Query (${duration}ms)`,
      {
        query: this.truncateIfTooLong(query),
        ...context
      },
      { params }
    );
  }
  
  /**
   * Helper to truncate very long strings in logs
   */
  private truncateIfTooLong(str: string, maxLength = 200): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Middleware for Express to log requests and responses
export const requestLoggerMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  
  // Generate request ID if not present
  req.id = req.id || req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.id);
  
  // Log request
  logger.logRequest(req, { requestId: req.id });
  
  // Capture original end method to patch it
  const originalEnd = res.end;
  
  // Override end method to log response
  res.end = function(...args: any[]) {
    const responseTime = Date.now() - startTime;
    
    logger.logResponse(req, res, responseTime, { requestId: req.id });
    
    // Call original end method
    return originalEnd.apply(res, args);
  };
  
  next();
};

// Export a factory function to create loggers for different components
export function getComponentLogger(component: string, context: LogContext = {}): Logger {
  return logger.createChildLogger({
    component,
    ...context
  });
}