import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// Request logger middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Generate request ID if not present
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.headers['x-request-id'] = requestId as string;
  res.setHeader('x-request-id', requestId);

  // Get tenant ID from header or subdomain
  const tenantId = req.headers['x-tenant-id'] || 
                  (req.hostname.includes('.') ? req.hostname.split('.')[0] : undefined);
  
  // Log request start
  const startTime = Date.now();
  const logData = {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    tenantId
  };

  logger.info({ ...logData, event: 'request_start' });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info({
      ...logData,
      event: 'request_end',
      statusCode: res.statusCode,
      duration,
      contentLength: res.getHeader('content-length')
    });
  });

  next();
};