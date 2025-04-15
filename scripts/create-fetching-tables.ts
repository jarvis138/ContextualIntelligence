/**
 * Create Fetching Tables Script
 * 
 * This script creates the data fetching related tables in the database.
 * Run this script when setting up the CPI Hub data fetching system for the first time.
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure neon to use websockets
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a PostgreSQL client
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Log function for better output
function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function createTables() {
  const client = await pool.connect();
  
  try {
    log('Starting transaction...');
    await client.query('BEGIN');

    // Create connector_type enum if it doesn't exist
    log('Creating connector_type enum...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connector_type') THEN
          CREATE TYPE connector_type AS ENUM (
            'google_drive',
            'slack',
            'gmail',
            'microsoft_graph'
          );
        END IF;
      END
      $$;
    `);

    // Create schedule_type enum if it doesn't exist
    log('Creating schedule_type enum...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_type') THEN
          CREATE TYPE schedule_type AS ENUM (
            'once',
            'interval',
            'cron',
            'manual'
          );
        END IF;
      END
      $$;
    `);

    // Create job_priority enum if it doesn't exist
    log('Creating job_priority enum...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_priority') THEN
          CREATE TYPE job_priority AS ENUM (
            'low',
            'normal',
            'high',
            'urgent'
          );
        END IF;
      END
      $$;
    `);

    // Create job_status enum if it doesn't exist
    log('Creating job_status enum...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
          CREATE TYPE job_status AS ENUM (
            'pending',
            'scheduled',
            'running',
            'completed',
            'failed',
            'cancelled'
          );
        END IF;
      END
      $$;
    `);

    // Create api_tokens table if it doesn't exist
    log('Creating api_tokens table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        connector_type connector_type NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        token_secret TEXT,
        expires_at TIMESTAMP,
        scope TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, connector_type)
      );
      
      CREATE INDEX IF NOT EXISTS api_token_user_idx ON api_tokens(user_id);
    `);

    // Create fetching_jobs table if it doesn't exist
    log('Creating fetching_jobs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS fetching_jobs (
        id SERIAL PRIMARY KEY,
        job_id TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        connector_type connector_type NOT NULL,
        data_type TEXT NOT NULL,
        parameters JSONB NOT NULL DEFAULT '{}',
        schedule_type schedule_type NOT NULL,
        schedule_value TEXT,
        priority job_priority NOT NULL DEFAULT 'normal',
        status job_status NOT NULL DEFAULT 'pending',
        last_run_at TIMESTAMP,
        next_run_at TIMESTAMP,
        last_result JSONB,
        last_error TEXT,
        run_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS job_id_idx ON fetching_jobs(job_id);
      CREATE INDEX IF NOT EXISTS fetching_jobs_user_idx ON fetching_jobs(user_id);
      CREATE INDEX IF NOT EXISTS connector_type_idx ON fetching_jobs(connector_type);
      CREATE INDEX IF NOT EXISTS job_status_idx ON fetching_jobs(status);
      CREATE INDEX IF NOT EXISTS next_run_at_idx ON fetching_jobs(next_run_at);
    `);

    // Create fetched_data table if it doesn't exist
    log('Creating fetched_data table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS fetched_data (
        id SERIAL PRIMARY KEY,
        data_id TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        job_id TEXT REFERENCES fetching_jobs(job_id),
        connector_type connector_type NOT NULL,
        data_type TEXT NOT NULL,
        title TEXT,
        content TEXT,
        metadata JSONB,
        source_url TEXT,
        source_id TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        fetched_at TIMESTAMP NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS data_id_idx ON fetched_data(data_id);
      CREATE INDEX IF NOT EXISTS fetched_data_user_idx ON fetched_data(user_id);
      CREATE INDEX IF NOT EXISTS job_id_rel_idx ON fetched_data(job_id);
      CREATE INDEX IF NOT EXISTS fetched_connector_type_idx ON fetched_data(connector_type);
      CREATE INDEX IF NOT EXISTS data_type_idx ON fetched_data(data_type);
      CREATE INDEX IF NOT EXISTS fetched_at_idx ON fetched_data(fetched_at);
    `);

    log('Committing transaction...');
    await client.query('COMMIT');
    log('Data fetching tables created successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    log(`Error creating tables: ${error}`);
    throw error;
  } finally {
    client.release();
  }
}

// Main function to run the script
async function run() {
  try {
    await createTables();
    log('Database setup completed successfully.');
  } catch (error) {
    log(`Script execution failed: ${error}`);
    process.exit(1);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the script
run();