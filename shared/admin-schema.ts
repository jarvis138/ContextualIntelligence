import { pgTable, text, serial, integer, boolean, timestamp, jsonb, index, foreignKey, uniqueIndex, varchar, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import { users, teams, projects } from "./schema";

// Enums for admin-specific functionality
export const organizationStatusEnum = pgEnum("organization_status", ["active", "suspended", "trial", "archived"]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", ["free", "starter", "business", "enterprise", "custom"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "past_due", "unpaid", "canceled", "trialing"]);
export const subscriptionIntervalEnum = pgEnum("subscription_interval", ["monthly", "quarterly", "annual"]);
export const permissionScopeEnum = pgEnum("permission_scope", ["global", "organization", "team", "project"]);
export const auditActionEnum = pgEnum("audit_action", ["create", "read", "update", "delete", "login", "logout", "export", "import", "share", "invite", "admin_action"]);

// Organizations (companies or tenants)
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 200 }),
  logo: text("logo"),
  status: organizationStatusEnum("status").notNull().default("active"),
  domain: varchar("domain", { length: 255 }),
  primaryContactEmail: varchar("primary_contact_email", { length: 255 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }),
  address: jsonb("address"),
  metadata: jsonb("metadata"),
  settings: jsonb("settings"),
  maxUsers: integer("max_users").default(5),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    nameIdx: index("org_name_idx").on(table.name),
    statusIdx: index("org_status_idx").on(table.status),
    domainIdx: index("org_domain_idx").on(table.domain),
  };
});

// Insert schema for organizations
export const insertOrganizationSchema = createInsertSchema(organizations, {
  name: z.string().min(2).max(100),
  primaryContactEmail: z.string().email(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

// Organization relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  subscriptions: many(subscriptions),
  teams: many(teams),
  apiKeys: many(apiKeys),
}));

// Organization members (users belonging to organizations)
export const organizationMembers = pgTable("organization_members", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }).notNull().default("member"),
  invitedBy: integer("invited_by").references(() => users.id),
  invitedAt: timestamp("invited_at").defaultNow(),
  joinedAt: timestamp("joined_at").defaultNow(),
  isOwner: boolean("is_owner").default(false),
  isAdmin: boolean("is_admin").default(false),
  isBillingAdmin: boolean("is_billing_admin").default(false),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  metadata: jsonb("metadata"),
}, (table) => {
  return {
    orgUserIdx: uniqueIndex("org_user_idx").on(table.organizationId, table.userId),
    orgIdx: index("org_member_org_idx").on(table.organizationId),
    userIdx: index("org_member_user_idx").on(table.userId),
    roleIdx: index("org_member_role_idx").on(table.role),
  };
});

// Insert schema for organization members
export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers)
  .omit({ id: true });

export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = z.infer<typeof insertOrganizationMemberSchema>;

// Organization member relations
export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
  inviter: one(users, {
    fields: [organizationMembers.invitedBy],
    references: [users.id],
    relationName: "inviter",
  }),
}));

// Subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  plan: subscriptionPlanEnum("plan").notNull(),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date"),
  billingInterval: subscriptionIntervalEnum("billing_interval").notNull().default("monthly"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  quantity: integer("quantity").default(1),
  price: integer("price"),
  currency: varchar("currency", { length: 3 }).default("USD"),
  metadata: jsonb("metadata"),
  externalId: varchar("external_id", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    orgIdx: index("subscription_org_idx").on(table.organizationId),
    planIdx: index("subscription_plan_idx").on(table.plan),
    statusIdx: index("subscription_status_idx").on(table.status),
  };
});

// Insert schema for subscriptions
export const insertSubscriptionSchema = createInsertSchema(subscriptions)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

// Subscription relations
export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
  invoices: many(invoices),
}));

// Invoices
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  invoiceDate: timestamp("invoice_date").notNull().defaultNow(),
  dueDate: timestamp("due_date"),
  paidDate: timestamp("paid_date"),
  invoiceNumber: varchar("invoice_number", { length: 50 }),
  description: text("description"),
  metadata: jsonb("metadata"),
  receiptUrl: text("receipt_url"),
  externalId: varchar("external_id", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    subIdx: index("invoice_subscription_idx").on(table.subscriptionId),
    orgIdx: index("invoice_org_idx").on(table.organizationId),
    statusIdx: index("invoice_status_idx").on(table.status),
  };
});

// Insert schema for invoices
export const insertInvoiceSchema = createInsertSchema(invoices)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

// Invoice relations
export const invoicesRelations = relations(invoices, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [invoices.subscriptionId],
    references: [subscriptions.id],
  }),
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
}));

// API Keys
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  key: text("key").notNull(),
  hashedKey: text("hashed_key").notNull(),
  expiresAt: timestamp("expires_at"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  lastUsedAt: timestamp("last_used_at"),
  revokedAt: timestamp("revoked_at"),
  scopes: jsonb("scopes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    orgIdx: index("api_key_org_idx").on(table.organizationId),
    nameIdx: index("api_key_name_idx").on(table.name),
    hashedKeyIdx: index("api_key_hashed_idx").on(table.hashedKey),
  };
});

// Insert schema for API keys
export const insertApiKeySchema = createInsertSchema(apiKeys)
  .omit({ id: true, createdAt: true, updatedAt: true, lastUsedAt: true, revokedAt: true });

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

// API Key relations
export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  organization: one(organizations, {
    fields: [apiKeys.organizationId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [apiKeys.createdBy],
    references: [users.id],
  }),
}));

// Permissions
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  scope: permissionScopeEnum("scope").notNull().default("global"),
  action: varchar("action", { length: 100 }).notNull(),
  resource: varchar("resource", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    nameIdx: index("permission_name_idx").on(table.name),
    actionResourceIdx: uniqueIndex("permission_action_resource_idx").on(table.action, table.resource),
  };
});

// Insert schema for permissions
export const insertPermissionSchema = createInsertSchema(permissions)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

// Role-based permissions
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  isSystemRole: boolean("is_system_role").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    nameIdx: index("role_name_idx").on(table.name),
    orgIdx: index("role_org_idx").on(table.organizationId),
  };
});

// Insert schema for roles
export const insertRoleSchema = createInsertSchema(roles)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

// Role relations
export const rolesRelations = relations(roles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [roles.organizationId],
    references: [organizations.id],
  }),
  permissions: many(rolePermissions),
}));

// Role permissions (many-to-many)
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: integer("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    rolePermissionIdx: uniqueIndex("role_permission_idx").on(table.roleId, table.permissionId),
  };
});

// Role permission relations
export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

// User roles (many-to-many)
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  teamId: integer("team_id").references(() => teams.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    userRoleIdx: uniqueIndex("user_role_context_idx").on(
      table.userId, 
      table.roleId, 
      table.organizationId || 0, 
      table.teamId || 0, 
      table.projectId || 0
    ),
  };
});

// User role relations
export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
  organization: one(organizations, {
    fields: [userRoles.organizationId],
    references: [organizations.id],
  }),
  team: one(teams, {
    fields: [userRoles.teamId],
    references: [teams.id],
  }),
  project: one(projects, {
    fields: [userRoles.projectId],
    references: [projects.id],
  }),
}));

// Feature flags
export const featureFlags = pgTable("feature_flags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isEnabled: boolean("is_enabled").default(true),
  planRequired: subscriptionPlanEnum("plan_required"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    nameIdx: uniqueIndex("feature_flag_name_idx").on(table.name),
  };
});

// Organization feature overrides
export const organizationFeatures = pgTable("organization_features", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  featureId: integer("feature_id").notNull().references(() => featureFlags.id, { onDelete: "cascade" }),
  isEnabled: boolean("is_enabled").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    orgFeatureIdx: uniqueIndex("org_feature_idx").on(table.organizationId, table.featureId),
  };
});

// Audit log for tracking admin actions
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: auditActionEnum("action").notNull(),
  resourceType: varchar("resource_type", { length: 100 }).notNull(),
  resourceId: varchar("resource_id", { length: 255 }),
  organizationId: integer("organization_id").references(() => organizations.id),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => {
  return {
    userIdx: index("audit_user_idx").on(table.userId),
    actionIdx: index("audit_action_idx").on(table.action),
    resourceIdx: index("audit_resource_idx").on(table.resourceType, table.resourceId),
    orgIdx: index("audit_org_idx").on(table.organizationId),
    timestampIdx: index("audit_timestamp_idx").on(table.timestamp),
  };
});

// Audit log relations
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
}));