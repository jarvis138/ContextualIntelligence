import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';
import { config } from '../config';
import { logger } from '../utils/logger';

// Configure Neon database
neonConfig.webSocketConstructor = ws;

// Create connection pool
const pool = new Pool({ 
  connectionString: config.database.url,
  max: config.database.poolMax,
  min: config.database.poolMin,
  idleTimeoutMillis: 30000
});

// Log pool events
pool.on('connect', () => {
  logger.debug('New database connection established');
});

pool.on('error', (err) => {
  logger.error('Database pool error', { error: err.message });
});

// Create Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Export schema
export * from './schema';import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';
import { config } from '../config';
import { logger } from '../utils/logger';

// Configure Neon database
neonConfig.webSocketConstructor = ws;

// Create connection pool
const pool = new Pool({ 
  connectionString: config.database.url,
  max: config.database.poolMax,
  min: config.database.poolMin,
  idleTimeoutMillis: 30000
});

// Log pool events
pool.on('connect', () => {
  logger.debug('New database connection established');
});

pool.on('error', (err) => {
  logger.error('Database pool error', { error: err.message });
});

// Create Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Export schema
export * from './schema';