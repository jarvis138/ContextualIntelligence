import pino from 'pino';

// Default log level based on environment
const defaultLogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Configure logger
const loggerConfig = {
  level: process.env.LOG_LEVEL || defaultLogLevel,
  transport: process.env.NODE_ENV !== 'production' 
    ? { target: 'pino-pretty' } 
    : undefined,
  formatters: {
    level: (label: string) => {
      return { level: label };
    },
  },
  base: {
    env: process.env.NODE_ENV || 'development'
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'password', 
      'token', 
      'accessToken', 
      'refreshToken', 
      'authorization', 
      'cookie', 
      '*.password', 
      '*.token', 
      '*.accessToken', 
      '*.refreshToken'
    ],
    censor: '[REDACTED]'
  }
};

// Create logger instance
export const logger = pino(loggerConfig);

// Create a child logger with service name
export const createServiceLogger = (serviceName: string) => {
  return logger.child({ service: serviceName });
};