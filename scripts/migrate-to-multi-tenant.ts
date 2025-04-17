/**
 * Migration Script for Multi-Tenant Architecture
 * 
 * This script applies the necessary database schema changes to convert
 * a single-tenant CPI Hub into a multi-tenant system.
 */

import { db } from '../server/db';
import readline from 'readline';
import { tenants, tenantFeatureFlags, tenantAdmins } from '../shared/tenant-schema';
import { tenantService } from '../server/tenant-service';
import { v4 as uuidv4 } from 'uuid';

// Create a readline interface for CLI prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function for prompting
function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Print a banner
console.log("\n=======================================================");
console.log("   CPI Hub - Migration to Multi-Tenant Architecture");
console.log("=======================================================\n");

async function migrateToMultiTenant() {
  try {
    console.log("Starting migration to multi-tenant architecture...\n");
    
    // 1. Check if the tenants table already exists
    console.log("Checking if migration has already been applied...");
    const tableExists = await db.execute(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tenants'
      )`
    );
    
    if (tableExists.rows?.[0]?.exists === true) {
      const continueAnyway = await askQuestion(
        "The tenants table already exists. Continue with migration anyway? (y/n): "
      );
      
      if (continueAnyway.toLowerCase() !== 'y') {
        console.log("Migration aborted by user.");
        return;
      }
    }
    
    // 2. Create the tenants, tenant_feature_flags, and tenant_admins tables
    console.log("\n(1/6) Creating tenant tables...");
    
    // Create PostgreSQL ENUMs first
    await db.execute(`
      CREATE TYPE IF NOT EXISTS tenant_status AS ENUM (
        'active', 'suspended', 'archived', 'pending'
      );
      
      CREATE TYPE IF NOT EXISTS tenant_tier AS ENUM (
        'free', 'standard', 'professional', 'enterprise'
      );
      
      CREATE TYPE IF NOT EXISTS tenant_schema_strategy AS ENUM (
        'row_level_security', 'schema_per_tenant'
      );
    `);
    
    // Create the tables using Drizzle push
    console.log("Running schema push...");
    const { execSync } = require('child_process');
    try {
      execSync('npm run db:push', { stdio: 'inherit' });
    } catch (error) {
      console.error("Error running schema push:", error);
      const continueAnyway = await askQuestion(
        "Error occurred during schema push. Continue with migration anyway? (y/n): "
      );
      
      if (continueAnyway.toLowerCase() !== 'y') {
        console.log("Migration aborted due to schema push error.");
        return;
      }
    }
    
    // 3. Create the PostgreSQL functions for RLS
    console.log("\n(2/6) Creating Row-Level Security functions...");
    await db.execute(`
      -- Function to get the current tenant ID
      CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS INT AS $$
      BEGIN
        RETURN current_setting('app.current_tenant_id', true)::INT;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Function to get the current tenant RLS ID (UUID)
      CREATE OR REPLACE FUNCTION current_tenant_rls_id() RETURNS UUID AS $$
      BEGIN
        RETURN current_setting('app.current_tenant_rls_id', true)::UUID;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Function to set the current tenant ID
      CREATE OR REPLACE FUNCTION set_tenant_id(tenant_id INT) RETURNS VOID AS $$
      BEGIN
        PERFORM set_config('app.current_tenant_id', tenant_id::TEXT, false);
      END;
      $$ LANGUAGE plpgsql;
      
      -- Function to set the current tenant RLS ID
      CREATE OR REPLACE FUNCTION set_tenant_rls_id(tenant_rls_id UUID) RETURNS VOID AS $$
      BEGIN
        PERFORM set_config('app.current_tenant_rls_id', tenant_rls_id::TEXT, false);
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // 4. Ask for the default tenant information
    console.log("\n(3/6) Setting up the default tenant...");
    const defaultTenantName = await askQuestion("Default tenant name (e.g., CPI Hub): ");
    const defaultTenantDisplayName = await askQuestion("Default tenant display name (e.g., CPI Hub Demo): ");
    const defaultTenantSubdomain = (await askQuestion("Default tenant subdomain (lowercase, no spaces): ")).toLowerCase();
    
    // 5. Create the default tenant
    console.log("\nCreating default tenant...");
    
    const defaultTenant = await tenantService.createTenant({
      name: defaultTenantName || 'CPI Hub',
      displayName: defaultTenantDisplayName || 'CPI Hub Demo',
      subdomain: defaultTenantSubdomain || 'demo',
      status: 'active',
      tier: 'enterprise',
      schemaStrategy: 'row_level_security',
    });
    
    console.log(`Default tenant created with ID: ${defaultTenant.id}`);
    
    // 6. Add tenant_id column to existing tables
    console.log("\n(4/6) Adding tenant_id column to existing tables...");
    
    // Get a list of tables that need the tenant_id column
    const tables = await db.execute(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('tenants', 'tenant_feature_flags', 'tenant_admins', '_prisma_migrations', 'schema_migrations', 'pgmigrations', 'schema_history', 'knex_migrations', 'knex_migrations_lock')
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE '\\_%'
    `);
    
    // Add tenant_id columns and foreign key constraints
    for (const table of tables.rows) {
      const tableName = table.table_name;
      
      console.log(`Adding tenant_id to ${tableName}...`);
      
      try {
        // Check if the column already exists
        const columnExists = await db.execute(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = '${tableName}' 
            AND column_name = 'tenant_id'
          )
        `);
        
        if (columnExists.rows?.[0]?.exists === true) {
          console.log(`  Column tenant_id already exists in ${tableName}`);
          continue;
        }
        
        // Add the tenant_id column
        await db.execute(`
          ALTER TABLE "${tableName}" 
          ADD COLUMN tenant_id INTEGER NULL 
          REFERENCES tenants(id) ON DELETE CASCADE;
        `);
        
        // Set the default tenant ID for all existing rows
        await db.execute(`
          UPDATE "${tableName}" 
          SET tenant_id = ${defaultTenant.id}
          WHERE tenant_id IS NULL;
        `);
        
        // Make tenant_id NOT NULL after populating it
        await db.execute(`
          ALTER TABLE "${tableName}" 
          ALTER COLUMN tenant_id SET NOT NULL;
        `);
        
        console.log(`  Successfully added tenant_id to ${tableName}`);
      } catch (error) {
        console.error(`  Error adding tenant_id to ${tableName}:`, error);
      }
    }
    
    // 7. Add RLS policies to tables
    console.log("\n(5/6) Adding Row-Level Security (RLS) policies to tables...");
    
    for (const table of tables.rows) {
      const tableName = table.table_name;
      
      console.log(`Adding RLS policy to ${tableName}...`);
      
      try {
        // Enable row level security on the table
        await db.execute(`ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;`);
        
        // Create the policy for the table
        await db.execute(`
          CREATE POLICY tenant_isolation_policy ON "${tableName}"
          USING (tenant_id = current_tenant_id() OR current_tenant_id() IS NULL);
        `);
        
        console.log(`  Successfully added RLS policy to ${tableName}`);
      } catch (error) {
        console.error(`  Error adding RLS policy to ${tableName}:`, error);
      }
    }
    
    // 8. Create feature flags for the default tenant
    console.log("\n(6/6) Creating default feature flags...");
    const defaultFeatureFlags = [
      { key: 'analytics_dashboard', enabled: true },
      { key: 'ai_insights', enabled: true },
      { key: 'slack_integration', enabled: true },
      { key: 'context_graph', enabled: true },
      { key: 'advanced_search', enabled: true },
      { key: 'document_processing', enabled: true },
      { key: 'email_notifications', enabled: true },
    ];
    
    for (const flag of defaultFeatureFlags) {
      console.log(`Creating feature flag: ${flag.key}`);
      await tenantService.setTenantFeatureFlag(
        defaultTenant.id,
        flag.key,
        flag.enabled,
        {}
      );
    }
    
    // Final message
    console.log("\n✅ Migration to multi-tenant architecture complete!");
    console.log(`\nDefault tenant information:`);
    console.log(`  ID: ${defaultTenant.id}`);
    console.log(`  Name: ${defaultTenant.name}`);
    console.log(`  Subdomain: ${defaultTenant.subdomain}`);
    console.log(`  RLS Tenant ID: ${defaultTenant.rlsTenantId}`);
    
    console.log("\nNext steps:");
    console.log("1. Restart your application");
    console.log("2. Update your application to use the tenant middleware");
    console.log("3. Use the tenant management UI to create additional tenants");
    
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    rl.close();
  }
}

// Run the migration
migrateToMultiTenant().catch(console.error);