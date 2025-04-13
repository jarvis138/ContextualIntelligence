/**
 * Environment Variable Configuration
 * 
 * This module loads and validates environment variables based on the current environment (development/production).
 */
import { config } from 'dotenv';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';

// Load environment-specific .env file
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
const envPath = path.resolve(process.cwd(), envFile);

if (fs.existsSync(envPath)) {
  config({ path: envPath });
} else {
  console.warn(`Environment file ${envPath} not found, using existing environment variables.`);
}

// Environment variable schema for validation
const envSchema = z.object({
  // Server configuration
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  HOST: z.string().default('0.0.0.0'),
  
  // Database configuration - required in production
  DATABASE_URL: z.string({
    required_error: 'DATABASE_URL is required in production',
  }),
  
  // Security configuration
  JWT_SECRET: z.string().default('development_jwt_secret_not_for_production'),
  JWT_EXPIRY: z.coerce.number().default(86400), // 24 hours
  
  // Rate limiting
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000), // 1 minute
  
  // Caching
  CACHE_TTL: z.coerce.number().default(60), // 1 minute
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  
  // External services - OpenAI is required
  OPENAI_API_KEY: z.string({
    required_error: 'OPENAI_API_KEY is required for AI functionality',
  }),
  
  // Optional external services
  SLACK_BOT_TOKEN: z.string().optional(),
  SLACK_CHANNEL_ID: z.string().optional(),
});

// Specific validation for production environment
const productionEnvSchema = process.env.NODE_ENV === 'production' 
  ? envSchema 
  : envSchema.partial({
      DATABASE_URL: true,
      OPENAI_API_KEY: true
    });

// Parse and validate environment variables
try {
  const env = productionEnvSchema.parse(process.env);
  
  if (process.env.NODE_ENV === 'production') {
    // In production, warn about missing optional integrations
    if (!env.SLACK_BOT_TOKEN || !env.SLACK_CHANNEL_ID) {
      console.warn('Slack integration is not fully configured: missing SLACK_BOT_TOKEN or SLACK_CHANNEL_ID');
    }
  }
  
  export default env;
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Environment validation failed:');
    console.error(error.errors);
    process.exit(1);
  }
  throw error;
}