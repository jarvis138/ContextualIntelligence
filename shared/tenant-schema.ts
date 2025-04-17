import {
  pgTable,
  serial,
  varchar,
  timestamp,
  jsonb,
  boolean,
  integer,
  uuid,
  unique,
  pgEnum
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { type InferSelectModel } from 'drizzle-orm';

/**
 * Define enum for tenant status values
 */
export const tenantStatusEnum = pgEnum('tenant_status', [
  'active',
  'suspended',
  'archived',
  'pending'
]);

/**
 * Define enum for tenant tier values
 */
export const tenantTierEnum = pgEnum('tenant_tier', [
  'free',
  'standard',
  'professional',
  'enterprise'
]);

/**
 * Define enum for tenant schema strategy values
 */
export const tenantSchemaStrategyEnum = pgEnum('tenant_schema_strategy', [
  'row_level_security',
  'schema_per_tenant'
]);

/**
 * Define the tenants table schema
 */
export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  subdomain: varchar('subdomain', { length: 255 }).notNull().unique(),
  customDomain: varchar('custom_domain', { length: 255 }).unique(),
  status: tenantStatusEnum('status').notNull().default('active'),
  tier: tenantTierEnum('tier').notNull().default('standard'),
  schemaStrategy: tenantSchemaStrategyEnum('schema_strategy').notNull().default('row_level_security'),
  schemaName: varchar('schema_name', { length: 255 }),
  rlsTenantId: uuid('rls_tenant_id').notNull().defaultRandom(),
  settings: jsonb('settings').notNull().default({}),
  metadata: jsonb('metadata').notNull().default({}),
  branding: jsonb('branding').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

/**
 * Define the tenant_feature_flags table schema
 */
export const tenantFeatureFlags = pgTable('tenant_feature_flags', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  featureKey: varchar('feature_key', { length: 255 }).notNull(),
  enabled: boolean('enabled').notNull().default(false),
  configuration: jsonb('configuration'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => {
  return {
    // Add a unique constraint for tenantId + featureKey
    unq: unique().on(table.tenantId, table.featureKey)
  };
});

/**
 * Define the tenant_admins table schema
 */
export const tenantAdmins = pgTable('tenant_admins', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull(),
  role: varchar('role', { length: 50 }).notNull().default('admin'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, (table) => {
  return {
    // Add a unique constraint for tenantId + userId
    unq: unique().on(table.tenantId, table.userId)
  };
});

/**
 * Define relationships between tables
 */
export const tenantsRelations = relations(tenants, ({ many }) => ({
  featureFlags: many(tenantFeatureFlags),
  tenantAdmins: many(tenantAdmins)
}));

export const tenantFeatureFlagsRelations = relations(tenantFeatureFlags, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantFeatureFlags.tenantId],
    references: [tenants.id],
  })
}));

export const tenantAdminsRelations = relations(tenantAdmins, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantAdmins.tenantId],
    references: [tenants.id],
  })
}));

/**
 * Define TypeScript types from the schemas
 */
export type Tenant = InferSelectModel<typeof tenants>;
export type TenantFeatureFlag = InferSelectModel<typeof tenantFeatureFlags>;
export type TenantAdmin = InferSelectModel<typeof tenantAdmins>;

/**
 * Define Zod validation schemas for insertions
 */
export const insertTenantSchema = createInsertSchema(tenants, {
  // Custom validations
  name: z.string().min(2).max(255),
  displayName: z.string().min(2).max(255),
  subdomain: z.string().min(2).max(63).regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
    message: "Subdomain must consist of lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen"
  }),
  customDomain: z.string().max(255).nullable().optional(),
  status: z.enum(['active', 'suspended', 'archived', 'pending']).optional(),
  tier: z.enum(['free', 'standard', 'professional', 'enterprise']).optional(),
  schemaStrategy: z.enum(['row_level_security', 'schema_per_tenant']).optional(),
  schemaName: z.string().max(255).nullable().optional(),
  settings: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  branding: z.record(z.any()).optional(),
}).omit({ 
  id: true, 
  rlsTenantId: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertTenantFeatureFlagSchema = createInsertSchema(tenantFeatureFlags, {
  // Custom validations
  featureKey: z.string().min(1).max(255),
  enabled: z.boolean(),
  configuration: z.record(z.any()).nullable().optional(),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertTenantAdminSchema = createInsertSchema(tenantAdmins, {
  // Custom validations
  role: z.string().min(1).max(50),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

/**
 * Define TypeScript types for insertions
 */
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type InsertTenantFeatureFlag = z.infer<typeof insertTenantFeatureFlagSchema>;
export type InsertTenantAdmin = z.infer<typeof insertTenantAdminSchema>;