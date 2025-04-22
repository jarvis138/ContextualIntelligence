import pino from 'pino';
import { config } from '../config';

// Configure logger based on environment
const loggerConfig = {
  level: process.env.LOG_LEVEL || (config.server.env === 'production' ? 'info' : 'debug'),
  transport: config.server.env !== 'production' 
    ? { target: 'pino-pretty' } 
    : undefined,
  formatters: {
    level: (label: string) => {
      return { level: label };
    },
  },
  base: {
    service: 'auth-service',
    env: config.server.env
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