import { relations } from "drizzle-orm";
import { pgTable, serial, varchar, text, timestamp, integer, pgEnum, uuid, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tenant status enum
export const tenantStatusEnum = pgEnum("tenant_status", [
  "active",
  "suspended",
  "archived",
  "pending"
]);

// Tenant tier enum
export const tenantTierEnum = pgEnum("tenant_tier", [
  "free",
  "standard",
  "professional",
  "enterprise"
]);

// Tenant schema strategy enum
export const schemaStrategyEnum = pgEnum("tenant_schema_strategy", [
  "row_level_security",
  "schema_per_tenant"
]);

// Tenants table
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 150 }),
  description: text("description"),
  subdomain: varchar("subdomain", { length: 100 }).notNull().unique(),
  customDomain: varchar("custom_domain", { length: 255 }),
  rlsTenantId: uuid("rls_tenant_id").defaultRandom().notNull().unique(),
  schemaName: varchar("schema_name", { length: 100 }),
  status: tenantStatusEnum("status").notNull().default("pending"),
  tier: tenantTierEnum("tier").notNull().default("free"),
  schemaStrategy: schemaStrategyEnum("schema_strategy").notNull().default("row_level_security"),
  logoUrl: text("logo_url"),
  primaryColor: varchar("primary_color", { length: 20 }).default("#6366F1"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  settings: jsonb("settings").default({})
});

// Tenant feature flags
export const tenantFeatureFlags = pgTable("tenant_feature_flags", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 100 }).notNull(),
  enabled: boolean("enabled").notNull().default(false),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Tenant admins
export const tenantAdmins = pgTable("tenant_admins", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  featureFlags: many(tenantFeatureFlags),
  admins: many(tenantAdmins)
}));

export const tenantFeatureFlagsRelations = relations(tenantFeatureFlags, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantFeatureFlags.tenantId],
    references: [tenants.id]
  })
}));

export const tenantAdminsRelations = relations(tenantAdmins, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantAdmins.tenantId],
    references: [tenants.id]
  })
}));

// Zod schemas for validation
export const insertTenantSchema = createInsertSchema(tenants, {
  name: z.string().min(2).max(100),
  subdomain: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  customDomain: z.string().max(255).optional(),
  status: z.enum(["active", "suspended", "archived", "pending"]),
  tier: z.enum(["free", "standard", "professional", "enterprise"]),
  schemaStrategy: z.enum(["row_level_security", "schema_per_tenant"]),
  primaryColor: z.string().max(20).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true, rlsTenantId: true });

export const updateTenantSchema = insertTenantSchema.partial();

export const insertTenantFeatureFlagSchema = createInsertSchema(tenantFeatureFlags, {
  key: z.string().min(2).max(100),
  enabled: z.boolean(),
  settings: z.record(z.any()).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertTenantAdminSchema = createInsertSchema(tenantAdmins, {
  role: z.enum(["admin", "manager", "support"]),
}).omit({ id: true, createdAt: true, updatedAt: true });

// TypeScript types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type UpdateTenant = z.infer<typeof updateTenantSchema>;

export type TenantFeatureFlag = typeof tenantFeatureFlags.$inferSelect;
export type InsertTenantFeatureFlag = z.infer<typeof insertTenantFeatureFlagSchema>;

export type TenantAdmin = typeof tenantAdmins.$inferSelect;
export type InsertTenantAdmin = z.infer<typeof insertTenantAdminSchema>;