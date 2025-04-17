import { sql } from 'drizzle-orm';
import { tenants } from './tenant-schema';

/**
 * Creates the SQL migration script for multi-tenancy
 * 
 * This function generates the SQL statements required to:
 * 1. Create tenant-related tables
 * 2. Add tenant_id columns to existing tables
 * 3. Add database functions for row-level security
 * 4. Add row-level security policies to tables
 */
export function createMultiTenancyMigration(): string {
  return `
-- Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create function to set and get the current tenant ID
CREATE OR REPLACE FUNCTION set_tenant_id(id integer)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', id::text, false);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS integer AS $$
BEGIN
  RETURN nullif(current_setting('app.current_tenant_id', true), '')::integer;
END;
$$ LANGUAGE plpgsql;

-- Create function to set and get the current tenant UUID for RLS
CREATE OR REPLACE FUNCTION set_tenant_rls_id(id uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_rls_id', id::text, false);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_current_tenant_rls_id()
RETURNS uuid AS $$
BEGIN
  RETURN nullif(current_setting('app.current_tenant_rls_id', true), '')::uuid;
END;
$$ LANGUAGE plpgsql;

-- Create Tenant tables
CREATE TABLE IF NOT EXISTS ${tenants._.name} (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(255) NOT NULL UNIQUE,
  custom_domain VARCHAR(255) UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  tier VARCHAR(50) NOT NULL DEFAULT 'standard',
  schema_strategy VARCHAR(50) NOT NULL DEFAULT 'row_level_security',
  schema_name VARCHAR(255),
  rls_tenant_id UUID NOT NULL DEFAULT uuid_generate_v4(),
  settings JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  branding JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create Tenant Feature Flags table
CREATE TABLE IF NOT EXISTS tenant_feature_flags (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES ${tenants._.name}(id) ON DELETE CASCADE,
  feature_key VARCHAR(255) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  configuration JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, feature_key)
);

-- Create Tenant Admins join table
CREATE TABLE IF NOT EXISTS tenant_admins (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES ${tenants._.name}(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- Add tenant_id column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS tenant_id INTEGER,
ADD COLUMN IF NOT EXISTS rls_tenant_id UUID;

-- Add tenant_id column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS tenant_id INTEGER,
ADD COLUMN IF NOT EXISTS rls_tenant_id UUID;

-- Add tenant_id column to teams table
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS tenant_id INTEGER,
ADD COLUMN IF NOT EXISTS rls_tenant_id UUID;

-- Add tenant_id column to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS tenant_id INTEGER,
ADD COLUMN IF NOT EXISTS rls_tenant_id UUID;

-- Add tenant_id column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS tenant_id INTEGER,
ADD COLUMN IF NOT EXISTS rls_tenant_id UUID;

-- Add tenant_id column to comments table
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS tenant_id INTEGER,
ADD COLUMN IF NOT EXISTS rls_tenant_id UUID;

-- Add tenant_id column to activities table
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS tenant_id INTEGER,
ADD COLUMN IF NOT EXISTS rls_tenant_id UUID;

-- Add tenant_id column to insights table
ALTER TABLE insights 
ADD COLUMN IF NOT EXISTS tenant_id INTEGER,
ADD COLUMN IF NOT EXISTS rls_tenant_id UUID;

-- Add tenant_id column to integrations table
ALTER TABLE integrations 
ADD COLUMN IF NOT EXISTS tenant_id INTEGER,
ADD COLUMN IF NOT EXISTS rls_tenant_id UUID;

-- Add tenant_id column to other tables as needed
-- (Add similar ALTER TABLE statements for any other tables in your schema)

-- Add foreign key constraints (after data migration)
-- These will be added separately after existing data is migrated

-- Create a trigger function to automatically set rls_tenant_id
CREATE OR REPLACE FUNCTION set_rls_tenant_id()
RETURNS TRIGGER AS $$
DECLARE
  tenant_rls_id UUID;
BEGIN
  -- Get the RLS tenant ID from the tenants table
  SELECT rls_tenant_id INTO tenant_rls_id
  FROM ${tenants._.name}
  WHERE id = NEW.tenant_id;
  
  -- Set the rls_tenant_id if found
  IF tenant_rls_id IS NOT NULL THEN
    NEW.rls_tenant_id := tenant_rls_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each table to set rls_tenant_id automatically
CREATE TRIGGER set_users_rls_tenant_id
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_rls_tenant_id();

CREATE TRIGGER set_projects_rls_tenant_id
BEFORE INSERT OR UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION set_rls_tenant_id();

CREATE TRIGGER set_teams_rls_tenant_id
BEFORE INSERT OR UPDATE ON teams
FOR EACH ROW
EXECUTE FUNCTION set_rls_tenant_id();

CREATE TRIGGER set_documents_rls_tenant_id
BEFORE INSERT OR UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION set_rls_tenant_id();

CREATE TRIGGER set_tasks_rls_tenant_id
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION set_rls_tenant_id();

CREATE TRIGGER set_comments_rls_tenant_id
BEFORE INSERT OR UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION set_rls_tenant_id();

CREATE TRIGGER set_activities_rls_tenant_id
BEFORE INSERT OR UPDATE ON activities
FOR EACH ROW
EXECUTE FUNCTION set_rls_tenant_id();

CREATE TRIGGER set_insights_rls_tenant_id
BEFORE INSERT OR UPDATE ON insights
FOR EACH ROW
EXECUTE FUNCTION set_rls_tenant_id();

CREATE TRIGGER set_integrations_rls_tenant_id
BEFORE INSERT OR UPDATE ON integrations
FOR EACH ROW
EXECUTE FUNCTION set_rls_tenant_id();

-- RLS Policy Setup (will be enabled after data migration)
-- These commented lines will be executed manually after the migration script

/*
-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for each table
CREATE POLICY tenant_isolation_policy ON users
  USING (rls_tenant_id = get_current_tenant_rls_id());

CREATE POLICY tenant_isolation_policy ON projects
  USING (rls_tenant_id = get_current_tenant_rls_id());

CREATE POLICY tenant_isolation_policy ON teams
  USING (rls_tenant_id = get_current_tenant_rls_id());

CREATE POLICY tenant_isolation_policy ON documents
  USING (rls_tenant_id = get_current_tenant_rls_id());

CREATE POLICY tenant_isolation_policy ON tasks
  USING (rls_tenant_id = get_current_tenant_rls_id());

CREATE POLICY tenant_isolation_policy ON comments
  USING (rls_tenant_id = get_current_tenant_rls_id());

CREATE POLICY tenant_isolation_policy ON activities
  USING (rls_tenant_id = get_current_tenant_rls_id());

CREATE POLICY tenant_isolation_policy ON insights
  USING (rls_tenant_id = get_current_tenant_rls_id());

CREATE POLICY tenant_isolation_policy ON integrations
  USING (rls_tenant_id = get_current_tenant_rls_id());
*/

-- Create indexes on tenant_id and rls_tenant_id columns for better performance
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_rls_tenant_id ON users(rls_tenant_id);

CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_rls_tenant_id ON projects(rls_tenant_id);

CREATE INDEX IF NOT EXISTS idx_teams_tenant_id ON teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_teams_rls_tenant_id ON teams(rls_tenant_id);

CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_rls_tenant_id ON documents(rls_tenant_id);

CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_rls_tenant_id ON tasks(rls_tenant_id);

CREATE INDEX IF NOT EXISTS idx_comments_tenant_id ON comments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comments_rls_tenant_id ON comments(rls_tenant_id);

CREATE INDEX IF NOT EXISTS idx_activities_tenant_id ON activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activities_rls_tenant_id ON activities(rls_tenant_id);

CREATE INDEX IF NOT EXISTS idx_insights_tenant_id ON insights(tenant_id);
CREATE INDEX IF NOT EXISTS idx_insights_rls_tenant_id ON insights(rls_tenant_id);

CREATE INDEX IF NOT EXISTS idx_integrations_tenant_id ON integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_rls_tenant_id ON integrations(rls_tenant_id);
`;
}