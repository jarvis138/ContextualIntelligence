/**
 * Logger Utility
 * 
 * Provides structured logging for the application with different log levels and formats
 * based on the environment (development vs production).
 */
import fs from 'fs';
import path from 'path';
import env from './env';

// Define log levels and their numeric values
enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  HTTP = 3,
  DEBUG = 4,
}

// Convert string log level to enum
const getLogLevelValue = (level: string): LogLevel => {
  switch (level.toLowerCase()) {
    case 'error': return LogLevel.ERROR;
    case 'warn': return LogLevel.WARN;
    case 'info': return LogLevel.INFO;
    case 'http': return LogLevel.HTTP;
    case 'debug': return LogLevel.DEBUG;
    default: return LogLevel.INFO;
  }
};

// Current log level from environment
const currentLogLevel = getLogLevelValue(env.LOG_LEVEL);

// Ensure logs directory exists in production
const logsDir = path.join(process.cwd(), 'logs');
if (env.NODE_ENV === 'production') {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

// File paths for different log types
const errorLogPath = path.join(logsDir, 'error.log');
const combinedLogPath = path.join(logsDir, 'combined.log');
const accessLogPath = path.join(logsDir, 'access.log');

// Format log message with timestamp and metadata
const formatLogMessage = (level: string, message: string, meta?: Record<string, any>): string => {
  const timestamp = new Date().toISOString();
  const metaString = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;
};

// Write log to file in production
const writeToFile = (filePath: string, message: string): void => {
  if (env.NODE_ENV === 'production') {
    fs.appendFileSync(filePath, message + '\n');
  }
};

/**
 * Logger object with methods for different log levels
 */
const logger = {
  error: (message: string, meta?: Record<string, any>): void => {
    if (currentLogLevel >= LogLevel.ERROR) {
      const formattedMessage = formatLogMessage('error', message, meta);
      console.error(formattedMessage);
      writeToFile(errorLogPath, formattedMessage);
      writeToFile(combinedLogPath, formattedMessage);
    }
  },
  
  warn: (message: string, meta?: Record<string, any>): void => {
    if (currentLogLevel >= LogLevel.WARN) {
      const formattedMessage = formatLogMessage('warn', message, meta);
      console.warn(formattedMessage);
      writeToFile(combinedLogPath, formattedMessage);
    }
  },
  
  info: (message: string, meta?: Record<string, any>): void => {
    if (currentLogLevel >= LogLevel.INFO) {
      const formattedMessage = formatLogMessage('info', message, meta);
      console.log(formattedMessage);
      writeToFile(combinedLogPath, formattedMessage);
    }
  },
  
  http: (message: string, meta?: Record<string, any>): void => {
    if (currentLogLevel >= LogLevel.HTTP) {
      const formattedMessage = formatLogMessage('http', message, meta);
      console.log(formattedMessage);
      writeToFile(accessLogPath, formattedMessage);
      writeToFile(combinedLogPath, formattedMessage);
    }
  },
  
  debug: (message: string, meta?: Record<string, any>): void => {
    if (currentLogLevel >= LogLevel.DEBUG) {
      const formattedMessage = formatLogMessage('debug', message, meta);
      console.log(formattedMessage);
      writeToFile(combinedLogPath, formattedMessage);
    }
  },
};

export default logger;