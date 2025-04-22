import { pgTable, serial, varchar, text, timestamp, boolean, pgEnum, uuid, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// User role enum
export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'user',
  'manager',
  'support',
  'readonly'
]);

// Authentication provider enum
export const authProviderEnum = pgEnum('auth_provider', [
  'local',
  'google',
  'microsoft',
  'slack',
  'saml'
]);

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash'),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: userRoleEnum('role').notNull().default('user'),
  isActive: boolean('is_active').notNull().default(true),
  isEmailVerified: boolean('is_email_verified').notNull().default(false),
  tenantId: serial('tenant_id').notNull(),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  metadata: jsonb('metadata').default({})
});

// OAuth profiles table
export const oauthProfiles = pgTable('oauth_profiles', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: authProviderEnum('provider').notNull(),
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: timestamp('token_expires_at'),
  profile: jsonb('profile').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Refresh tokens table
export const refreshTokens = pgTable('refresh_tokens', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: uuid('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  isRevoked: boolean('is_revoked').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdByIp: varchar('created_by_ip', { length: 100 }),
  revokedByIp: varchar('revoked_by_ip', { length: 100 }),
  replacedByToken: uuid('replaced_by_token')
});

// Email verification tokens table
export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: uuid('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Password reset tokens table
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: uuid('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  oauthProfiles: many(oauthProfiles),
  refreshTokens: many(refreshTokens),
  emailVerificationTokens: many(emailVerificationTokens),
  passwordResetTokens: many(passwordResetTokens)
}));

export const oauthProfilesRelations = relations(oauthProfiles, ({ one }) => ({
  user: one(users, {
    fields: [oauthProfiles.userId],
    references: [users.id]
  })
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id]
  })
}));

export const emailVerificationTokensRelations = relations(emailVerificationTokens, ({ one }) => ({
  user: one(users, {
    fields: [emailVerificationTokens.userId],
    references: [users.id]
  })
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id]
  })
}));