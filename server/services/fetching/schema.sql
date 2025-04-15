-- Data fetching schema

-- Connector type enum
CREATE TYPE connector_type AS ENUM (
  'googleDrive',
  'slack',
  'gmail',
  'microsoftGraph'
);

-- Job status enum
CREATE TYPE job_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled'
);

-- Schedule type enum
CREATE TYPE schedule_type AS ENUM (
  'once',
  'interval',
  'cron',
  'manual'
);

-- Job priority enum
CREATE TYPE job_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);

-- Fetching jobs table
CREATE TABLE IF NOT EXISTS fetching_jobs (
  id VARCHAR(36) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connector_type connector_type NOT NULL,
  data_type VARCHAR(100) NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  status job_status NOT NULL DEFAULT 'pending',
  priority job_priority NOT NULL DEFAULT 'normal',
  schedule_type schedule_type NOT NULL,
  schedule_value VARCHAR(255),
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  retries_left INTEGER NOT NULL DEFAULT 3,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error TEXT,
  result JSONB,
  progress INTEGER
);

CREATE INDEX IF NOT EXISTS fetching_jobs_user_id_idx ON fetching_jobs(user_id);
CREATE INDEX IF NOT EXISTS fetching_jobs_connector_type_idx ON fetching_jobs(connector_type);
CREATE INDEX IF NOT EXISTS fetching_jobs_status_idx ON fetching_jobs(status);
CREATE INDEX IF NOT EXISTS fetching_jobs_schedule_type_idx ON fetching_jobs(schedule_type);
CREATE INDEX IF NOT EXISTS fetching_jobs_next_run_at_idx ON fetching_jobs(next_run_at);

-- Fetched data table
CREATE TABLE IF NOT EXISTS fetched_data (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connector_type connector_type NOT NULL,
  data_type VARCHAR(100) NOT NULL,
  data_source_id VARCHAR(255) NOT NULL,
  content JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fetched_data_user_id_idx ON fetched_data(user_id);
CREATE INDEX IF NOT EXISTS fetched_data_connector_type_idx ON fetched_data(connector_type);
CREATE INDEX IF NOT EXISTS fetched_data_data_type_idx ON fetched_data(data_type);
CREATE UNIQUE INDEX IF NOT EXISTS fetched_data_source_idx ON fetched_data(user_id, connector_type, data_type, data_source_id);
CREATE INDEX IF NOT EXISTS fetched_data_updated_at_idx ON fetched_data(updated_at);

-- Add GIN index for JSON content search
CREATE INDEX IF NOT EXISTS fetched_data_content_idx ON fetched_data USING GIN (content jsonb_path_ops);
CREATE INDEX IF NOT EXISTS fetched_data_metadata_idx ON fetched_data USING GIN (metadata jsonb_path_ops);

-- API tokens table for external services
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
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS api_tokens_user_connector_idx ON api_tokens(user_id, connector_type);
CREATE INDEX IF NOT EXISTS api_tokens_expires_at_idx ON api_tokens(expires_at);

-- Mapping table for fetched data to entities
CREATE TABLE IF NOT EXISTS fetched_data_entities (
  id SERIAL PRIMARY KEY,
  fetched_data_id INTEGER NOT NULL REFERENCES fetched_data(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  confidence FLOAT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS fetched_data_entity_idx ON fetched_data_entities(fetched_data_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS entity_reference_idx ON fetched_data_entities(entity_type, entity_id);