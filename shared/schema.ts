import { pgTable, text, serial, integer, boolean, timestamp, jsonb, index, foreignKey, uniqueIndex, varchar, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// Search filter schema for frontend to backend communication
export const searchFilterSchema = z.object({
  field: z.string(),
  operator: z.enum(["equals", "contains", "startsWith", "endsWith", "greaterThan", "lessThan", "between"]),
  value: z.union([z.string(), z.number(), z.array(z.string()), z.array(z.number())])
});

export type SearchFilter = z.infer<typeof searchFilterSchema>;

// Search result types for consistent type checking
export const searchResultSchema = z.object({
  id: z.string(),
  documentId: z.number().optional(),
  title: z.string(),
  type: z.enum(["document", "comment", "task", "user", "project"]),
  snippet: z.string(),
  relevance: z.number(),
  date: z.string().optional(),
  author: z.string().optional(),
  fileType: z.string().optional(),
  url: z.string().optional(),
  entities: z.array(z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    confidence: z.number()
  })).optional(),
  highlights: z.array(z.object({
    field: z.string(),
    snippet: z.string()
  })).optional()
});

export type SearchResult = z.infer<typeof searchResultSchema>;

// Enums for consistent values across the application
export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "user", "viewer"]);
export const authMethodEnum = pgEnum("auth_method", ["local", "google", "microsoft", "slack", "github"]);
export const taskStatusEnum = pgEnum("task_status", ["pending", "in_progress", "review", "completed", "blocked"]);
export const projectStatusEnum = pgEnum("project_status", ["planning", "active", "on_hold", "completed", "archived"]);
export const documentTypeEnum = pgEnum("document_type", ["text", "requirements", "design", "code", "meeting", "summary", "report"]);
export const entityTypeEnum = pgEnum("entity_type", ["project", "task", "document", "user", "team", "integration", "insight", "slack_message", "email", "email_thread", "attachment", "comment"]);
export const activityTypeEnum = pgEnum("activity_type", ["create", "update", "delete", "comment", "assign", "complete", "ai", "search"]);
export const integrationTypeEnum = pgEnum("integration_type", ["slack", "github", "jira", "google", "microsoft", "trello", "asana", "custom"]);
export const insightTypeEnum = pgEnum("insight_type", ["warning", "info", "success", "alert"]);

// System monitoring related enums
export const systemMetricTypeEnum = pgEnum("system_metric_type", ["cpu", "memory", "disk", "network", "api", "database", "queue", "custom"]);
export const systemEventSeverityEnum = pgEnum("system_event_severity", ["critical", "error", "warning", "info", "debug"]);
export const backupStatusEnum = pgEnum("backup_status", ["pending", "in_progress", "completed", "failed", "restored"]);

// Document processing related enums
export const documentSourceEnum = pgEnum("document_source", [
  "google_drive", 
  "sharepoint", 
  "email_attachment", 
  "local_upload", 
  "external_url"
]);

export const documentLifecycleStateEnum = pgEnum("document_lifecycle_state", [
  "draft",
  "active",
  "archived",
  "deleted"
]);

export const documentAccessLevelEnum = pgEnum("document_access_level", [
  "public",
  "internal",
  "restricted",
  "private"
]);

export const processingStatusEnum = pgEnum("processing_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "pending_revision"
]);

// User schema - modified to match actual database structure
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: text("password"),  // Making password optional to support OAuth
  fullName: varchar("full_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull(),
  avatar: text("avatar"),
  role: userRoleEnum("role").notNull().default("user"),
  authMethod: authMethodEnum("auth_method").notNull().default("local"),
  externalId: varchar("external_id", { length: 255 }),  // External provider ID
  // createdAt and updatedAt columns don't exist in the actual database
}, (table) => {
  return {
    emailIdx: index("user_email_idx").on(table.email),
    usernameIdx: index("user_username_idx").on(table.username),
  };
});

// User insert schema for validation
// InsertUser type and insertUserSchema are defined further down in this file
export type User = typeof users.$inferSelect;

// User relations
export const usersRelations = relations(users, ({ many, one }) => ({
  teamMembers: many(teamMembers),
  tasks: many(tasks, { relationName: "assignee" }),
  activities: many(activities),
  documents: many(documents, { relationName: "creator" }),
  updatedDocuments: many(documents, { relationName: "updater" }),
  integrations: many(integrations),
  oauthTokens: many(oauthTokens),
}));

// OAuth provider tokens
export const oauthTokens = pgTable("oauth_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 50 }).notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  tokenData: jsonb("token_data"),  // Additional token data
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    userProviderIdx: uniqueIndex("user_provider_idx").on(table.userId, table.provider),
  };
});

// OAuth token relations
export const oauthTokensRelations = relations(oauthTokens, ({ one }) => ({
  user: one(users, {
    fields: [oauthTokens.userId],
    references: [users.id],
  }),
}));

// Project schema
export const projects = pgTable("projects", {
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
}, (table) => {
  return {
    nameIdx: index("project_name_idx").on(table.name),
    statusIdx: index("project_status_idx").on(table.status),
    ownerIdx: index("project_owner_idx").on(table.ownerId),
  };
});

// Project relations
export const projectsRelations = relations(projects, ({ many, one }) => ({
  tasks: many(tasks),
  documents: many(documents),
  activities: many(activities),
  insights: many(insights),
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  projectTeams: many(projectTeams),
}));

// Team schema
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: text("icon"),
  progress: integer("progress").notNull().default(0),
  // No leaderId, createdAt, or updatedAt fields in the actual database
}, (table) => {
  return {
    nameIdx: index("team_name_idx").on(table.name),
  };
});

// Team relations
export const teamsRelations = relations(teams, ({ many }) => ({
  members: many(teamMembers),
  tasks: many(tasks),
  projectTeams: many(projectTeams),
  // Leader relation removed because leaderId column doesn't exist in the actual database
}));

// Team members schema - updated to match actual database structure
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // 'role' and 'joined_at' columns don't exist in the actual database
}, (table) => {
  return {
    teamUserIdx: uniqueIndex("team_user_idx").on(table.teamId, table.userId),
  };
});

// Team members relations
export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

// Project Teams (many-to-many relationship)
export const projectTeams = pgTable("project_teams", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  teamId: integer("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
}, (table) => {
  return {
    projectTeamIdx: uniqueIndex("project_team_idx").on(table.projectId, table.teamId),
  };
});

// Project Teams relations
export const projectTeamsRelations = relations(projectTeams, ({ one }) => ({
  project: one(projects, {
    fields: [projectTeams.projectId],
    references: [projects.id],
  }),
  team: one(teams, {
    fields: [projectTeams.teamId],
    references: [teams.id],
  }),
}));

// Tasks schema
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  // priority column doesn't exist in the actual database
  assigneeId: integer("assignee_id").references(() => users.id),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  teamId: integer("team_id").references(() => teams.id),
  // Simplified schema to match actual database
  dueDate: timestamp("due_date"),
  // No createdAt or updatedAt in the actual database
}, (table) => {
  return {
    statusIdx: index("task_status_idx").on(table.status),
    assigneeIdx: index("task_assignee_idx").on(table.assigneeId),
    projectIdx: index("task_project_idx").on(table.projectId),
    teamIdx: index("task_team_idx").on(table.teamId),
    dueDateIdx: index("task_due_date_idx").on(table.dueDate),
  };
});

// Tasks relations
export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  team: one(teams, {
    fields: [tasks.teamId],
    references: [teams.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
    relationName: "assignee",
  }),
  // Task hierarchies not currently supported in actual database
  // but we'll keep the relation for future implementation
  comments: many(comments, { relationName: "taskComments" }),
}));

// Comments schema
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  entityType: entityTypeEnum("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  parentCommentId: integer("parent_comment_id").references(() => comments.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    entityIdx: index("comment_entity_idx").on(table.entityType, table.entityId),
    userIdx: index("comment_user_idx").on(table.userId),
    parentCommentIdx: index("comment_parent_idx").on(table.parentCommentId),
  };
});

// Comments relations
export const commentsRelations = relations(comments, ({ one, many }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  parentComment: one(comments, {
    fields: [comments.parentCommentId],
    references: [comments.id],
  }),
  replies: many(comments, { relationName: "replies" }),
}));

// Documents schema - extended with processing fields
export const documents = pgTable("documents", {
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
}, (table) => {
  return {
    projectIdx: index("document_project_idx").on(table.projectId),
    creatorIdx: index("document_creator_idx").on(table.createdBy),
    updaterIdx: index("document_updater_idx").on(table.updatedBy),
    fileTypeIdx: index("document_type_idx").on(table.fileType),
    titleIdx: index("document_title_idx").on(table.title),
    contentIdx: index("document_content_idx").on(table.content),
    statusIdx: index("document_status_idx").on(table.processingStatus),
    lifecycleIdx: index("document_lifecycle_idx").on(table.lifecycleState),
  };
});

// Document Versions schema
export const documentVersions = pgTable("document_versions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  versionId: varchar("version_id", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  contentHash: text("content_hash").notNull(),
  changes: text("changes"),
  source: documentSourceEnum("source").notNull(),
  sourceReference: text("source_reference"),
  fileSize: integer("file_size").notNull(),
  metadata: jsonb("metadata").notNull(),
}, (table) => {
  return {
    documentVersionIdx: uniqueIndex("document_version_idx").on(table.documentId, table.versionId),
    documentIdIdx: index("version_document_idx").on(table.documentId),
    createdByIdx: index("version_created_by_idx").on(table.createdBy),
    createdAtIdx: index("version_created_at_idx").on(table.createdAt)
  };
});

// Document versions relations
export const documentVersionsRelations = relations(documentVersions, ({ one }) => ({
  document: one(documents, {
    fields: [documentVersions.documentId],
    references: [documents.id],
  }),
  creator: one(users, {
    fields: [documentVersions.createdBy],
    references: [users.id],
  }),
}));

// Documents relations
export const documentsRelations = relations(documents, ({ one, many }) => ({
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [documents.createdBy],
    references: [users.id],
    relationName: "creator",
  }),
  updater: one(users, {
    fields: [documents.updatedBy],
    references: [users.id],
    relationName: "updater",
  }),
  versions: many(documentVersions),
  comments: many(comments, { relationName: "documentComments" }),
  activities: many(activities, { relationName: "documentActivities" }),
}));

// Activities schema
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  timestamp: timestamp("timestamp").notNull().defaultNow(), // Using timestamp instead of createdAt
}, (table) => {
  return {
    typeIdx: index("activity_type_idx").on(table.type),
    userIdx: index("activity_user_idx").on(table.userId),
    projectIdx: index("activity_project_idx").on(table.projectId),
    entityIdx: index("activity_entity_idx").on(table.entityType, table.entityId),
    timestampIdx: index("activity_timestamp_idx").on(table.timestamp),
  };
});

// Activities relations
export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [activities.projectId],
    references: [projects.id],
  }),
}));

// Refresh Tokens schema for handling token rotation and revocation
export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenId: varchar("token_id", { length: 255 }).notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  revokedAt: timestamp("revoked_at"),
}, (table) => {
  return {
    userTokenIdIdx: uniqueIndex("user_token_id_idx").on(table.userId, table.tokenId),
    tokenIdx: index("token_idx").on(table.token),
    expiryIdx: index("token_expiry_idx").on(table.expiresAt),
  };
});

// Define refresh token relations
export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

// PKCE Code Verifiers schema for OAuth 2.0 with PKCE flow
export const pkceCodeVerifiers = pgTable("pkce_code_verifiers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  codeChallenge: varchar("code_challenge", { length: 128 }).notNull(),
  codeVerifier: varchar("code_verifier", { length: 128 }).notNull(),
  state: varchar("state", { length: 255 }).notNull().unique(),
  provider: varchar("provider", { length: 50 }).notNull(),
  redirectUri: text("redirect_uri").notNull(),
  scope: text("scope").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
}, (table) => {
  return {
    stateIdx: index("state_idx").on(table.state),
    challengeIdx: index("code_challenge_idx").on(table.codeChallenge),
    providerIdx: index("provider_idx").on(table.provider),
    expiryIdx: index("pkce_expiry_idx").on(table.expiresAt),
  };
});

// Define PKCE Code Verifiers relations
export const pkceCodeVerifiersRelations = relations(pkceCodeVerifiers, ({ one }) => ({
  user: one(users, {
    fields: [pkceCodeVerifiers.userId],
    references: [users.id],
  }),
}));

// System monitoring tables
export const systemMetrics = pgTable("system_metrics", {
  id: serial("id").primaryKey(),
  type: systemMetricTypeEnum("type").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  value: text("value").notNull(),
  unit: varchar("unit", { length: 20 }),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  metadata: jsonb("metadata"),
}, (table) => {
  return {
    typeIdx: index("metric_type_idx").on(table.type),
    nameIdx: index("metric_name_idx").on(table.name),
    timestampIdx: index("metric_timestamp_idx").on(table.timestamp),
  };
});

export const systemEvents = pgTable("system_events", {
  id: serial("id").primaryKey(),
  severity: systemEventSeverityEnum("severity").notNull().default("info"),
  source: varchar("source", { length: 100 }).notNull(),
  message: text("message").notNull(),
  details: jsonb("details"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  acknowledged: boolean("acknowledged").notNull().default(false),
  acknowledgedBy: integer("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
}, (table) => {
  return {
    severityIdx: index("event_severity_idx").on(table.severity),
    sourceIdx: index("event_source_idx").on(table.source),
    timestampIdx: index("event_timestamp_idx").on(table.timestamp),
    acknowledgedIdx: index("event_acknowledged_idx").on(table.acknowledged),
  };
});

export const systemEventsRelations = relations(systemEvents, ({ one }) => ({
  acknowledgedByUser: one(users, {
    fields: [systemEvents.acknowledgedBy],
    references: [users.id],
  }),
}));

// Backup and restore tables
export const backups = pgTable("backups", {
  id: serial("id").primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  size: integer("size").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // full, incremental, etc.
  status: backupStatusEnum("status").notNull().default("completed"),
  path: text("path").notNull(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  metadata: jsonb("metadata"),
  restoredAt: timestamp("restored_at"),
  restoredBy: integer("restored_by").references(() => users.id),
  notes: text("notes"),
}, (table) => {
  return {
    statusIdx: index("backup_status_idx").on(table.status),
    createdAtIdx: index("backup_created_at_idx").on(table.createdAt),
    createdByIdx: index("backup_created_by_idx").on(table.createdBy),
  };
});

export const backupsRelations = relations(backups, ({ one }) => ({
  creator: one(users, {
    fields: [backups.createdBy],
    references: [users.id],
  }),
  restorer: one(users, {
    fields: [backups.restoredBy],
    references: [users.id],
  }),
}));

// User sessions for tracking active users (matching actual db schema)
export const userSessions = pgTable("user_sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Audit logs for tracking admin actions
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: integer("entity_id"),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("audit_user_id_idx").on(table.userId),
    actionIdx: index("audit_action_idx").on(table.action),
    entityIdx: index("audit_entity_idx").on(table.entityType, table.entityId),
    timestampIdx: index("audit_timestamp_idx").on(table.timestamp),
  };
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Integrations schema - updated to match actual database structure
export const integrations = pgTable("integrations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // Using text instead of enum to match actual DB
  config: jsonb("config").notNull(),
  active: boolean("active").notNull().default(true),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Removed lastSyncAt, syncStatus, syncMessage, createdAt, updatedAt that don't exist in actual DB
}, (table) => {
  return {
    userTypeIdx: uniqueIndex("integration_user_type_idx").on(table.userId, table.type),
    typeIdx: index("integration_type_idx").on(table.type),
    activeIdx: index("integration_active_idx").on(table.active),
  };
});

// Integrations relations
export const integrationsRelations = relations(integrations, ({ one }) => ({
  user: one(users, {
    fields: [integrations.userId],
    references: [users.id],
  }),
}));

// AI Insights schema
export const insights = pgTable("insights", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // Changed from enum to text based on actual schema
  content: text("content").notNull(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  // entity_type and entity_id columns don't exist in the actual database
  confidence: integer("confidence").notNull().default(100),
  // metadata doesn't exist in the actual database
  timestamp: timestamp("timestamp").notNull().defaultNow(), // Using timestamp instead of createdAt/updatedAt
  // createdAt and updatedAt don't exist in the actual database
}, (table) => {
  return {
    projectIdx: index("insight_project_idx").on(table.projectId),
    typeIdx: index("insight_type_idx").on(table.type),
    // entityIdx removed as these columns don't exist
    timestampIdx: index("insight_timestamp_idx").on(table.timestamp),
  };
});

// Insights relations
export const insightsRelations = relations(insights, ({ one }) => ({
  project: one(projects, {
    fields: [insights.projectId],
    references: [projects.id],
  }),
}));

// Project relationships schema
export const relationships = pgTable("relationships", {
  id: serial("id").primaryKey(),
  sourceType: entityTypeEnum("source_type").notNull(),
  sourceId: integer("source_id").notNull(),
  targetType: entityTypeEnum("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  strength: integer("strength").notNull().default(1),
  description: text("description"),
  // No metadata, createdAt, or updatedAt columns in the actual database
}, (table) => {
  return {
    sourceEntityIdx: index("relationship_source_idx").on(table.sourceType, table.sourceId),
    targetEntityIdx: index("relationship_target_idx").on(table.targetType, table.targetId),
    uniqueRelationshipIdx: uniqueIndex("unique_relationship_idx").on(
      table.sourceType, 
      table.sourceId, 
      table.targetType, 
      table.targetId
    ),
  };
});

// Embeddings for semantic search
export const embeddings = pgTable("embeddings", {
  id: serial("id").primaryKey(),
  entityType: entityTypeEnum("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  chunk: text("chunk").notNull(), // Text chunk for embedding
  chunkIndex: integer("chunk_index").notNull(), // Order of chunk within entity
  embedding: text("embedding").notNull(), // Vector embedding as text
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    entityIdx: uniqueIndex("embedding_entity_chunk_idx").on(table.entityType, table.entityId, table.chunkIndex),
    embeddingIdx: index("embedding_idx").on(table.embedding),
  };
});

// Notifications schema
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  read: boolean("read").notNull().default(false),
  type: varchar("type", { length: 50 }).notNull(),
  entityType: entityTypeEnum("entity_type"),
  entityId: integer("entity_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    userIdx: index("notification_user_idx").on(table.userId),
    readIdx: index("notification_read_idx").on(table.read),
    typeIdx: index("notification_type_idx").on(table.type),
    createdAtIdx: index("notification_created_at_idx").on(table.createdAt),
  };
});

// Notifications relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Export insert schemas
export const insertRefreshTokenSchema = createInsertSchema(refreshTokens).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  // No createdAt or updatedAt to omit because they don't exist in the schema
});

export const insertOAuthTokenSchema = createInsertSchema(oauthTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  // No joinedAt field to omit since it doesn't exist in the actual schema
});

export const insertProjectTeamSchema = createInsertSchema(projectTeams).omit({
  id: true,
  assignedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentVersionSchema = createInsertSchema(documentVersions).omit({
  id: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  timestamp: true,
});

export const insertIntegrationSchema = createInsertSchema(integrations).omit({
  id: true,
  // No createdAt/updatedAt fields to omit since they don't exist in the actual schema
});

export const insertInsightSchema = createInsertSchema(insights).omit({
  id: true,
  timestamp: true,
});

export const insertRelationshipSchema = createInsertSchema(relationships).omit({
  id: true,
});

export const insertEmbeddingSchema = createInsertSchema(embeddings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Admin feature insert schemas
export const insertSystemMetricSchema = createInsertSchema(systemMetrics).omit({
  id: true,
  timestamp: true,
});

export const insertSystemEventSchema = createInsertSchema(systemEvents).omit({
  id: true,
  timestamp: true,
  acknowledged: true,
  acknowledgedBy: true,
  acknowledgedAt: true,
});

export const insertBackupSchema = createInsertSchema(backups).omit({
  id: true,
  createdAt: true,
  restoredAt: true,
  restoredBy: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions);

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

export type ProjectTeam = typeof projectTeams.$inferSelect;
export type InsertProjectTeam = z.infer<typeof insertProjectTeamSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

// Updated Document type to match the enhanced schema
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

// Document version type
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentVersion = z.infer<typeof insertDocumentVersionSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;

export type Insight = typeof insights.$inferSelect;
export type InsertInsight = z.infer<typeof insertInsightSchema>;

export type Relationship = typeof relationships.$inferSelect;
export type InsertRelationship = z.infer<typeof insertRelationshipSchema>;

export type Embedding = typeof embeddings.$inferSelect;
export type InsertEmbedding = z.infer<typeof insertEmbeddingSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;

// Admin feature types
export type SystemMetric = typeof systemMetrics.$inferSelect;
export type InsertSystemMetric = z.infer<typeof insertSystemMetricSchema>;

export type SystemEvent = typeof systemEvents.$inferSelect;
export type InsertSystemEvent = z.infer<typeof insertSystemEventSchema>;

export type Backup = typeof backups.$inferSelect;
export type InsertBackup = z.infer<typeof insertBackupSchema>;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
