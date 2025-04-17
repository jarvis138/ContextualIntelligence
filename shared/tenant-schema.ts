import { pgTable, text, serial, integer, boolean, timestamp, jsonb, index, foreignKey, uniqueIndex, varchar, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// Tenant status enum for tracking tenant lifecycle
export const tenantStatusEnum = pgEnum("tenant_status", [
  "active", 
  "suspended", 
  "pending", 
  "archived"
]);

// Tenant tier enum for different service levels
export const tenantTierEnum = pgEnum("tenant_tier", [
  "free", 
  "standard", 
  "professional", 
  "enterprise", 
  "custom"
]);

// Schema separation strategy enum
export const schemaSeparationStrategyEnum = pgEnum("schema_separation_strategy", [
  "schema_per_tenant", 
  "row_level_security", 
  "combined"
]);

// Tenant schema - core tenant configuration
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  subdomain: varchar("subdomain", { length: 100 }).notNull().unique(),
  // Optional custom domain
  customDomain: varchar("custom_domain", { length: 255 }),
  status: tenantStatusEnum("status").notNull().default("active"),
  tier: tenantTierEnum("tier").notNull().default("standard"),
  // Schema separation strategy
  schemaStrategy: schemaSeparationStrategyEnum("schema_strategy").notNull().default("row_level_security"),
  // For schema_per_tenant, this is the PostgreSQL schema name
  schemaName: varchar("schema_name", { length: 50 }),
  // For row_level_security, we'll use this ID in RLS policies
  rlsTenantId: varchar("rls_tenant_id", { length: 36 }).notNull().unique(),
  // Tenant settings/configuration as JSON
  settings: jsonb("settings"),
  // Tenant metadata for custom fields
  metadata: jsonb("metadata"),
  // Tenant branding information
  branding: jsonb("branding"),
  // Billing information
  billingEmail: varchar("billing_email", { length: 255 }),
  billingName: varchar("billing_name", { length: 255 }),
  billingAddress: jsonb("billing_address"),
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    subdomainIdx: uniqueIndex("tenant_subdomain_idx").on(table.subdomain),
    customDomainIdx: index("tenant_custom_domain_idx").on(table.customDomain),
    statusIdx: index("tenant_status_idx").on(table.status),
    tierIdx: index("tenant_tier_idx").on(table.tier),
  };
});

// Tenant Type
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// Create a Zod schema for tenant insertion
export const insertTenantSchema = createInsertSchema(tenants)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    subdomain: z.string().min(3).max(63).regex(/^[a-z0-9-]+$/, {
      message: "Subdomain can only contain lowercase letters, numbers, and hyphens"
    }),
    customDomain: z.string().url().optional(),
    settings: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional(),
    branding: z.record(z.unknown()).optional(),
  });

// Tenant feature flags table
export const tenantFeatureFlags = pgTable("tenant_feature_flags", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  featureKey: varchar("feature_key", { length: 100 }).notNull(),
  enabled: boolean("enabled").notNull().default(false),
  configuration: jsonb("configuration"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    tenantFeatureIdx: uniqueIndex("tenant_feature_idx").on(table.tenantId, table.featureKey),
  };
});

// Tenant Feature Flag Type
export type TenantFeatureFlag = typeof tenantFeatureFlags.$inferSelect;
export type InsertTenantFeatureFlag = typeof tenantFeatureFlags.$inferInsert;

// Feature Flag Zod Schema
export const insertTenantFeatureFlagSchema = createInsertSchema(tenantFeatureFlags)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Tenant relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  tenantFeatureFlags: many(tenantFeatureFlags),
  tenantApiKeys: many(tenantApiKeys),
  tenantAdmins: many(tenantAdmins),
}));

// Tenant feature flags relations
export const tenantFeatureFlagsRelations = relations(tenantFeatureFlags, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantFeatureFlags.tenantId],
    references: [tenants.id],
  }),
}));

// Tenant API keys for programmatic access
export const tenantApiKeys = pgTable("tenant_api_keys", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  prefix: varchar("prefix", { length: 10 }).notNull(),
  hashedKey: text("hashed_key").notNull(),
  scopes: jsonb("scopes").notNull(),
  expiresAt: timestamp("expires_at"),
  lastUsedAt: timestamp("last_used_at"),
  createdBy: integer("created_by").notNull(),
  revoked: boolean("revoked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    prefixIdx: index("api_key_prefix_idx").on(table.prefix),
    tenantIdIdx: index("api_key_tenant_idx").on(table.tenantId),
  };
});

// Tenant API Key Type
export type TenantApiKey = typeof tenantApiKeys.$inferSelect;
export type InsertTenantApiKey = typeof tenantApiKeys.$inferInsert;

// Tenant API keys relations
export const tenantApiKeysRelations = relations(tenantApiKeys, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantApiKeys.tenantId],
    references: [tenants.id],
  }),
}));

// Tenant admins (users who can manage tenant settings)
export const tenantAdmins = pgTable("tenant_admins", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("admin"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    tenantUserIdx: uniqueIndex("tenant_user_idx").on(table.tenantId, table.userId),
  };
});

// Tenant Admin Type
export type TenantAdmin = typeof tenantAdmins.$inferSelect;
export type InsertTenantAdmin = typeof tenantAdmins.$inferInsert;

// Tenant admins relations
export const tenantAdminsRelations = relations(tenantAdmins, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantAdmins.tenantId],
    references: [tenants.id],
  }),
}));