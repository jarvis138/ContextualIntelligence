import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define configuration schema with validation
const configSchema = z.object({
  server: z.object({
    port: z.coerce.number().default(3002),
    env: z.enum(['development', 'test', 'production']).default('development'),
    apiPrefix: z.string().default('/api/v1')
  }),
  database: z.object({
    url: z.string().min(1),
    poolMin: z.coerce.number().default(2),
    poolMax: z.coerce.number().default(10)
  }),
  redis: z.object({
    url: z.string().default('redis://localhost:6379'),
    ttl: z.coerce.number().default(3600) // 1 hour in seconds
  }),
  elasticsearch: z.object({
    url: z.string().default('http://localhost:9200'),
    username: z.string().optional(),
    password: z.string().optional(),
    indexPrefix: z.string().default('documents')
  }),
  storage: z.object({
    type: z.enum(['s3', 'local']).default('local'),
    s3: z.object({
      bucket: z.string().optional(),
      region: z.string().optional(),
      accessKey: z.string().optional(),
      secretKey: z.string().optional()
    }),
    local: z.object({
      path: z.string().default('./uploads')
    })
  }),
  auth: z.object({
    jwtSecret: z.string().min(1),
    jwtAudience: z.string().default('contextual-intelligence'),
    jwtIssuer: z.string().default('auth-service')
  }),
  messageQueue: z.object({
    url: z.string().default('amqp://localhost'),
    exchange: z.string().default('contextual-intelligence'),
    queues: z.object({
      documentProcessing: z.string().default('document-processing'),
      documentIndexing: z.string().default('document-indexing'),
      documentEvents: z.string().default('document-events')
    })
  }),
  cors: z.object({
    allowedOrigins: z.union([
      z.string(),
      z.array(z.string())
    ]).transform(val => {
      if (typeof val === 'string') {
        return val.split(',').map(origin => origin.trim());
      }
      return val;
    })
  }),
  security: z.object({
    rateLimitWindow: z.coerce.number().default(60000), // 1 minute
    rateLimitMax: z.coerce.number().default(100)
  }),
  fileUpload: z.object({
    maxSize: z.coerce.number().default(10 * 1024 * 1024), // 10MB
    allowedTypes: z.array(z.string()).default([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'application/json',
      'image/jpeg',
      'image/png'
    ])
  })
});

// Parse environment variables
const config = {
  server: {
    port: process.env.PORT || 3002,
    env: process.env.NODE_ENV || 'development',
    apiPrefix: process.env.API_PREFIX || '/api/v1'
  },
  database: {
    url: process.env.DATABASE_URL || '',
    poolMin: process.env.DB_POOL_MIN || 2,
    poolMax: process.env.DB_POOL_MAX || 10
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: process.env.REDIS_TTL || 3600
  },
  elasticsearch: {
    url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
    indexPrefix: process.env.ELASTICSEARCH_INDEX_PREFIX || 'documents'
  },
  storage: {
    type: (process.env.STORAGE_TYPE as 's3' | 'local') || 'local',
    s3: {
      bucket: process.env.S3_BUCKET,
      region: process.env.AWS_REGION,
      accessKey: process.env.AWS_ACCESS_KEY_ID,
      secretKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    local: {
      path: process.env.LOCAL_STORAGE_PATH || './uploads'
    }
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || '',
    jwtAudience: process.env.JWT_AUDIENCE || 'contextual-intelligence',
    jwtIssuer: process.env.JWT_ISSUER || 'auth-service'
  },
  messageQueue: {
    url: process.env.MESSAGE_QUEUE_URL || 'amqp://localhost',
    exchange: process.env.MESSAGE_QUEUE_EXCHANGE || 'contextual-intelligence',
    queues: {
      documentProcessing: process.env.DOCUMENT_PROCESSING_QUEUE || 'document-processing',
      documentIndexing: process.env.DOCUMENT_INDEXING_QUEUE || 'document-indexing',
      documentEvents: process.env.DOCUMENT_EVENTS_QUEUE || 'document-events'
    }
  },
  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS || '*'
  },
  security: {
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW || 60000,
    rateLimitMax: process.env.RATE_LIMIT_MAX || 100
  },
  fileUpload: {
    maxSize: process.env.MAX_FILE_SIZE || 10 * 1024 * 1024,
    allowedTypes: process.env.ALLOWED_FILE_TYPES ? 
      process.env.ALLOWED_FILE_TYPES.split(',') : 
      [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv',
        'application/json',
        'image/jpeg',
        'image/png'
      ]
  }
};

// Validate configuration
export const validatedConfig = configSchema.parse(config);

export { validatedConfig as config };import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define configuration schema with validation
const configSchema = z.object({
  server: z.object({
    port: z.coerce.number().default(3002),
    env: z.enum(['development', 'test', 'production']).default('development'),
    apiPrefix: z.string().default('/api/v1')
  }),
  database: z.object({
    url: z.string().min(1),
    poolMin: z.coerce.number().default(2),
    poolMax: z.coerce.number().default(10)
  }),
  redis: z.object({
    url: z.string().default('redis://localhost:6379'),
    ttl: z.coerce.number().default(3600) // 1 hour in seconds
  }),
  elasticsearch: z.object({
    url: z.string().default('http://localhost:9200'),
    username: z.string().optional(),
    password: z.string().optional(),
    indexPrefix: z.string().default('documents')
  }),
  storage: z.object({
    type: z.enum(['s3', 'local']).default('local'),
    s3: z.object({
      bucket: z.string().optional(),
      region: z.string().optional(),
      accessKey: z.string().optional(),
      secretKey: z.string().optional()
    }),
    local: z.object({
      path: z.string().default('./uploads')
    })
  }),
  auth: z.object({
    jwtSecret: z.string().min(1),
    jwtAudience: z.string().default('contextual-intelligence'),
    jwtIssuer: z.string().default('auth-service')
  }),
  messageQueue: z.object({
    url: z.string().default('amqp://localhost'),
    exchange: z.string().default('contextual-intelligence'),
    queues: z.object({
      documentProcessing: z.string().default('document-processing'),
      documentIndexing: z.string().default('document-indexing'),
      documentEvents: z.string().default('document-events')
    })
  }),
  cors: z.object({
    allowedOrigins: z.union([
      z.string(),
      z.array(z.string())
    ]).transform(val => {
      if (typeof val === 'string') {
        return val.split(',').map(origin => origin.trim());
      }
      return val;
    })
  }),
  security: z.object({
    rateLimitWindow: z.coerce.number().default(60000), // 1 minute
    rateLimitMax: z.coerce.number().default(100)
  }),
  fileUpload: z.object({
    maxSize: z.coerce.number().default(10 * 1024 * 1024), // 10MB
    allowedTypes: z.array(z.string()).default([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'application/json',
      'image/jpeg',
      'image/png'
    ])
  })
});

// Parse environment variables
const config = {
  server: {
    port: process.env.PORT || 3002,
    env: process.env.NODE_ENV || 'development',
    apiPrefix: process.env.API_PREFIX || '/api/v1'
  },
  database: {
    url: process.env.DATABASE_URL || '',
    poolMin: process.env.DB_POOL_MIN || 2,
    poolMax: process.env.DB_POOL_MAX || 10
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: process.env.REDIS_TTL || 3600
  },
  elasticsearch: {
    url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
    indexPrefix: process.env.ELASTICSEARCH_INDEX_PREFIX || 'documents'
  },
  storage: {
    type: (process.env.STORAGE_TYPE as 's3' | 'local') || 'local',
    s3: {
      bucket: process.env.S3_BUCKET,
      region: process.env.AWS_REGION,
      accessKey: process.env.AWS_ACCESS_KEY_ID,
      secretKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    local: {
      path: process.env.LOCAL_STORAGE_PATH || './uploads'
    }
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || '',
    jwtAudience: process.env.JWT_AUDIENCE || 'contextual-intelligence',
    jwtIssuer: process.env.JWT_ISSUER || 'auth-service'
  },
  messageQueue: {
    url: process.env.MESSAGE_QUEUE_URL || 'amqp://localhost',
    exchange: process.env.MESSAGE_QUEUE_EXCHANGE || 'contextual-intelligence',
    queues: {
      documentProcessing: process.env.DOCUMENT_PROCESSING_QUEUE || 'document-processing',
      documentIndexing: process.env.DOCUMENT_INDEXING_QUEUE || 'document-indexing',
      documentEvents: process.env.DOCUMENT_EVENTS_QUEUE || 'document-events'
    }
  },
  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS || '*'
  },
  security: {
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW || 60000,
    rateLimitMax: process.env.RATE_LIMIT_MAX || 100
  },
  fileUpload: {
    maxSize: process.env.MAX_FILE_SIZE || 10 * 1024 * 1024,
    allowedTypes: process.env.ALLOWED_FILE_TYPES ? 
      process.env.ALLOWED_FILE_TYPES.split(',') : 
      [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv',
        'application/json',
        'image/jpeg',
        'image/png'
      ]
  }
};

// Validate configuration
export const validatedConfig = configSchema.parse(config);

export { validatedConfig as config };