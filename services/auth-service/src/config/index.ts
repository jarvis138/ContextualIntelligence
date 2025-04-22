import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define configuration schema with validation
const configSchema = z.object({
  server: z.object({
    port: z.coerce.number().default(3001),
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
    ttl: z.coerce.number().default(86400) // 24 hours in seconds
  }),
  jwt: z.object({
    secret: z.string().min(1),
    accessTokenExpiry: z.string().default('15m'),
    refreshTokenExpiry: z.string().default('7d')
  }),
  session: z.object({
    secret: z.string().min(1),
    maxAge: z.coerce.number().default(86400000) // 24 hours in milliseconds
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
  oauth: z.object({
    google: z.object({
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      callbackUrl: z.string().optional()
    }),
    microsoft: z.object({
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      callbackUrl: z.string().optional()
    }),
    slack: z.object({
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      callbackUrl: z.string().optional()
    })
  }),
  saml: z.object({
    enabled: z.coerce.boolean().default(false),
    entryPoint: z.string().optional(),
    issuer: z.string().optional(),
    callbackUrl: z.string().optional(),
    cert: z.string().optional()
  }),
  security: z.object({
    bcryptRounds: z.coerce.number().default(12),
    rateLimitWindow: z.coerce.number().default(60000), // 1 minute
    rateLimitMax: z.coerce.number().default(100)
  })
});

// Parse environment variables
const config = {
  server: {
    port: process.env.PORT || 3001,
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
    ttl: process.env.REDIS_TTL || 86400
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d'
  },
  session: {
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || '',
    maxAge: process.env.SESSION_MAX_AGE || 86400000
  },
  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS || '*'
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      callbackUrl: process.env.MICROSOFT_CALLBACK_URL
    },
    slack: {
      clientId: process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
      callbackUrl: process.env.SLACK_CALLBACK_URL
    }
  },
  saml: {
    enabled: process.env.SAML_ENABLED === 'true',
    entryPoint: process.env.SAML_ENTRY_POINT,
    issuer: process.env.SAML_ISSUER,
    callbackUrl: process.env.SAML_CALLBACK_URL,
    cert: process.env.SAML_CERT
  },
  security: {
    bcryptRounds: process.env.BCRYPT_ROUNDS || 12,
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW || 60000,
    rateLimitMax: process.env.RATE_LIMIT_MAX || 100
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
    port: z.coerce.number().default(3001),
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
    ttl: z.coerce.number().default(86400) // 24 hours in seconds
  }),
  jwt: z.object({
    secret: z.string().min(1),
    accessTokenExpiry: z.string().default('15m'),
    refreshTokenExpiry: z.string().default('7d')
  }),
  session: z.object({
    secret: z.string().min(1),
    maxAge: z.coerce.number().default(86400000) // 24 hours in milliseconds
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
  oauth: z.object({
    google: z.object({
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      callbackUrl: z.string().optional()
    }),
    microsoft: z.object({
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      callbackUrl: z.string().optional()
    }),
    slack: z.object({
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      callbackUrl: z.string().optional()
    })
  }),
  saml: z.object({
    enabled: z.coerce.boolean().default(false),
    entryPoint: z.string().optional(),
    issuer: z.string().optional(),
    callbackUrl: z.string().optional(),
    cert: z.string().optional()
  }),
  security: z.object({
    bcryptRounds: z.coerce.number().default(12),
    rateLimitWindow: z.coerce.number().default(60000), // 1 minute
    rateLimitMax: z.coerce.number().default(100)
  })
});

// Parse environment variables
const config = {
  server: {
    port: process.env.PORT || 3001,
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
    ttl: process.env.REDIS_TTL || 86400
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d'
  },
  session: {
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || '',
    maxAge: process.env.SESSION_MAX_AGE || 86400000
  },
  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS || '*'
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      callbackUrl: process.env.MICROSOFT_CALLBACK_URL
    },
    slack: {
      clientId: process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
      callbackUrl: process.env.SLACK_CALLBACK_URL
    }
  },
  saml: {
    enabled: process.env.SAML_ENABLED === 'true',
    entryPoint: process.env.SAML_ENTRY_POINT,
    issuer: process.env.SAML_ISSUER,
    callbackUrl: process.env.SAML_CALLBACK_URL,
    cert: process.env.SAML_CERT
  },
  security: {
    bcryptRounds: process.env.BCRYPT_ROUNDS || 12,
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW || 60000,
    rateLimitMax: process.env.RATE_LIMIT_MAX || 100
  }
};

// Validate configuration
export const validatedConfig = configSchema.parse(config);

export { validatedConfig as config };