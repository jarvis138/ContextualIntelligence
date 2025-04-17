import { pgTable, text, serial, integer, boolean, timestamp, jsonb, index, foreignKey, uniqueIndex, varchar, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// This file contains schema updates to implement multi-tenancy in CPI Hub
// These updates should be applied to the existing schema.ts

// Import tenant schemas
import { tenants } from './tenant-schema';

// Add tenant_id column to User table
export const usersWithTenant = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull(),
  password: text("password"),
  fullName: varchar("full_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull(),
  avatar: text("avatar"),
  role: userRoleEnum("role").notNull().default("user"),
  authMethod: authMethodEnum("auth_method").notNull().default("local"),
  externalId: varchar("external_id", { length: 255 }),
  // Add tenant ID column
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  // Add current flag for users with accounts in multiple tenants
  isPrimaryTenant: boolean("is_primary_tenant").notNull().default(true),
}, (table) => {
  return {
    emailIdx: index("user_email_tenant_idx").on(table.email, table.tenantId),
    usernameIdx: index("user_username_tenant_idx").on(table.username, table.tenantId),
    tenantIdx: index("user_tenant_idx").on(table.tenantId),
  };
});

// Add tenant_id column to Projects table
export const projectsWithTenant = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  status: projectStatusEnum("status").notNull().default("active"),
  progress: integer("progress").notNull().default(0),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  ownerId: integer("owner_id").references(() => users.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Add tenant ID column
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
}, (table) => {
  return {
    nameIdx: index("project_name_tenant_idx").on(table.name, table.tenantId),
    statusIdx: index("project_status_idx").on(table.status),
    ownerIdx: index("project_owner_idx").on(table.ownerId),
    tenantIdx: index("project_tenant_idx").on(table.tenantId),
  };
});

// Add tenant_id column to Teams table
export const teamsWithTenant = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: text("icon"),
  progress: integer("progress").notNull().default(0),
  // Add tenant ID column
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
}, (table) => {
  return {
    nameIdx: index("team_name_tenant_idx").on(table.name, table.tenantId),
    tenantIdx: index("team_tenant_idx").on(table.tenantId),
  };
});

// Add tenant_id column to Documents table
export const documentsWithTenant = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content"),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  createdBy: integer("created_by").notNull().references(() => users.id),
  updatedBy: integer("updated_by").notNull().references(() => users.id),
  description: text("description"),
  metadata: jsonb("metadata"),
  fileSize: integer("file_size"),
  pageCount: integer("page_count"),
  wordCount: integer("word_count"),
  language: varchar("language", { length: 10 }),
  tags: jsonb("tags"),
  thumbnailPath: text("thumbnail_path"),
  previewPath: text("preview_path"),
  processingStatus: processingStatusEnum("processing_status").default("completed"),
  lifecycleState: documentLifecycleStateEnum("lifecycle_state").default("active"),
  accessLevel: documentAccessLevelEnum("access_level").default("private"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Add tenant ID column
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
}, (table) => {
  return {
    projectIdx: index("document_project_idx").on(table.projectId),
    creatorIdx: index("document_creator_idx").on(table.createdBy),
    updaterIdx: index("document_updater_idx").on(table.updatedBy),
    fileTypeIdx: index("document_type_idx").on(table.fileType),
    titleIdx: index("document_title_tenant_idx").on(table.title, table.tenantId),
    contentIdx: index("document_content_idx").on(table.content),
    statusIdx: index("document_status_idx").on(table.processingStatus),
    lifecycleIdx: index("document_lifecycle_idx").on(table.lifecycleState),
    tenantIdx: index("document_tenant_idx").on(table.tenantId),
  };
});

// Add tenant_id column to Tasks table
export const tasksWithTenant = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  assigneeId: integer("assignee_id").references(() => users.id),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  teamId: integer("team_id").references(() => teams.id),
  dueDate: timestamp("due_date"),
  // Add tenant ID column
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
}, (table) => {
  return {
    statusIdx: index("task_status_idx").on(table.status),
    assigneeIdx: index("task_assignee_idx").on(table.assigneeId),
    projectIdx: index("task_project_idx").on(table.projectId),
    teamIdx: index("task_team_idx").on(table.teamId),
    dueDateIdx: index("task_due_date_idx").on(table.dueDate),
    tenantIdx: index("task_tenant_idx").on(table.tenantId),
  };
});

// Add tenant_id column to Comments table
export const commentsWithTenant = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  entityType: entityTypeEnum("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  parentCommentId: integer("parent_comment_id").references(() => comments.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Add tenant ID column
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
}, (table) => {
  return {
    entityIdx: index("comment_entity_idx").on(table.entityType, table.entityId),
    userIdx: index("comment_user_idx").on(table.userId),
    parentCommentIdx: index("comment_parent_idx").on(table.parentCommentId),
    tenantIdx: index("comment_tenant_idx").on(table.tenantId),
  };
});

// Create migration functions for SQL updates
export const createMultiTenancyMigration = () => {
  // SQL to add tenant_id column to all tables
  return `
  -- Create tenants table
  CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'pending', 'archived');
  CREATE TYPE tenant_tier AS ENUM ('free', 'standard', 'professional', 'enterprise', 'custom');
  CREATE TYPE schema_separation_strategy AS ENUM ('schema_per_tenant', 'row_level_security', 'combined');
  
  CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    subdomain VARCHAR(100) NOT NULL UNIQUE,
    custom_domain VARCHAR(255),
    status tenant_status NOT NULL DEFAULT 'active',
    tier tenant_tier NOT NULL DEFAULT 'standard',
    schema_strategy schema_separation_strategy NOT NULL DEFAULT 'row_level_security', 
    schema_name VARCHAR(50),
    rls_tenant_id VARCHAR(36) NOT NULL UNIQUE,
    settings JSONB,
    metadata JSONB,
    branding JSONB,
    billing_email VARCHAR(255),
    billing_name VARCHAR(255),
    billing_address JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  
  -- Create indexes for tenants
  CREATE UNIQUE INDEX tenant_subdomain_idx ON tenants (subdomain);
  CREATE INDEX tenant_custom_domain_idx ON tenants (custom_domain);
  CREATE INDEX tenant_status_idx ON tenants (status);
  CREATE INDEX tenant_tier_idx ON tenants (tier);
  
  -- Create tenant feature flags table
  CREATE TABLE IF NOT EXISTS tenant_feature_flags (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    configuration JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, feature_key)
  );
  
  -- Create tenant API keys table
  CREATE TABLE IF NOT EXISTS tenant_api_keys (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    prefix VARCHAR(10) NOT NULL,
    hashed_key TEXT NOT NULL,
    scopes JSONB NOT NULL,
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    created_by INTEGER NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  
  CREATE INDEX api_key_prefix_idx ON tenant_api_keys (prefix);
  CREATE INDEX api_key_tenant_idx ON tenant_api_keys (tenant_id);
  
  -- Create tenant admins table
  CREATE TABLE IF NOT EXISTS tenant_admins (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, user_id)
  );
  
  -- Add tenant_id to users table
  ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS is_primary_tenant BOOLEAN NOT NULL DEFAULT TRUE;
  CREATE INDEX IF NOT EXISTS user_tenant_idx ON users (tenant_id);
  DROP INDEX IF EXISTS user_email_idx;
  DROP INDEX IF EXISTS user_username_idx;
  CREATE INDEX IF NOT EXISTS user_email_tenant_idx ON users (email, tenant_id);
  CREATE INDEX IF NOT EXISTS user_username_tenant_idx ON users (username, tenant_id);
  
  -- Add tenant_id to projects table
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS project_tenant_idx ON projects (tenant_id);
  DROP INDEX IF EXISTS project_name_idx;
  CREATE INDEX IF NOT EXISTS project_name_tenant_idx ON projects (name, tenant_id);
  
  -- Add tenant_id to teams table
  ALTER TABLE teams ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS team_tenant_idx ON teams (tenant_id);
  DROP INDEX IF EXISTS team_name_idx;
  CREATE INDEX IF NOT EXISTS team_name_tenant_idx ON teams (name, tenant_id);
  
  -- Add tenant_id to documents table
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS document_tenant_idx ON documents (tenant_id);
  DROP INDEX IF EXISTS document_title_idx;
  CREATE INDEX IF NOT EXISTS document_title_tenant_idx ON documents (title, tenant_id);
  
  -- Add tenant_id to tasks table
  ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS task_tenant_idx ON tasks (tenant_id);
  
  -- Add tenant_id to comments table
  ALTER TABLE comments ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
  CREATE INDEX IF NOT EXISTS comment_tenant_idx ON comments (tenant_id);
  
  -- Create row-level security policies
  -- First enable RLS on the tables
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
  ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
  ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
  ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
  
  -- Create policies that enforce tenant isolation
  CREATE POLICY users_tenant_isolation ON users
    USING (tenant_id = current_setting('app.current_tenant_id')::integer);
  
  CREATE POLICY projects_tenant_isolation ON projects
    USING (tenant_id = current_setting('app.current_tenant_id')::integer);
  
  CREATE POLICY teams_tenant_isolation ON teams
    USING (tenant_id = current_setting('app.current_tenant_id')::integer);
  
  CREATE POLICY documents_tenant_isolation ON documents
    USING (tenant_id = current_setting('app.current_tenant_id')::integer);
  
  CREATE POLICY tasks_tenant_isolation ON tasks
    USING (tenant_id = current_setting('app.current_tenant_id')::integer);
    
  CREATE POLICY comments_tenant_isolation ON comments
    USING (tenant_id = current_setting('app.current_tenant_id')::integer);
  
  -- Function to set the current tenant ID
  CREATE OR REPLACE FUNCTION set_tenant_id(tenant_id integer)
  RETURNS void AS $$
  BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_id::text, false);
  END;
  $$ LANGUAGE plpgsql;
  `;
};