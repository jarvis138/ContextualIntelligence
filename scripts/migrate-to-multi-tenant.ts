#!/usr/bin/env ts-node
/**
 * Migration Script for Multi-Tenant Architecture
 * 
 * This script applies the necessary database schema changes to convert
 * a single-tenant CPI Hub into a multi-tenant system.
 */

import { db } from '../server/db';
import { createMultiTenancyMigration } from '../shared/schema-updates';
import { v4 as uuidv4 } from 'uuid';
import * as readline from 'readline';
import { tenants } from '../shared/tenant-schema';

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ask a question and get user input
function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function migrateToMultiTenant() {
  try {
    console.log('CPI Hub Multi-Tenant Migration Tool');
    console.log('==================================');
    console.log('This script will migrate your database to a multi-tenant architecture.');
    console.log('WARNING: This is a one-way operation. Make sure you have a backup of your database.');
    
    const confirm = await askQuestion('Do you want to proceed? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('Migration aborted.');
      process.exit(0);
    }
    
    // 1. Run the migration SQL
    console.log('\nStep 1: Creating tenant tables and modifying existing tables...');
    const migrationSql = createMultiTenancyMigration();
    await db.execute(migrationSql);
    console.log('✅ Database schema updated successfully.');
    
    // 2. Create the default tenant
    console.log('\nStep 2: Creating default tenant...');
    const tenantName = await askQuestion('Enter the name for your default tenant: ');
    const subdomain = await askQuestion('Enter subdomain for the default tenant (e.g., "main"): ');
    
    // Insert the default tenant
    const rlsTenantId = uuidv4();
    const [defaultTenant] = await db.insert(tenants).values({
      name: tenantName,
      displayName: tenantName,
      subdomain: subdomain,
      status: 'active',
      tier: 'professional',
      schemaStrategy: 'row_level_security',
      rlsTenantId: rlsTenantId,
      settings: {},
      metadata: {},
      branding: {
        primaryColor: '#4f46e5',
        logo: '/logo.svg',
        favicon: '/favicon.ico'
      }
    }).returning();
    
    console.log(`✅ Default tenant created with ID: ${defaultTenant.id}`);
    
    // 3. Update existing data to associate with the default tenant
    console.log('\nStep 3: Associating existing data with the default tenant...');
    
    // Set the PostgreSQL session variable for the current tenant
    await db.execute(`SELECT set_tenant_id(${defaultTenant.id})`);
    
    // Update tables with tenant_id
    await db.execute(`UPDATE users SET tenant_id = ${defaultTenant.id} WHERE tenant_id IS NULL`);
    await db.execute(`UPDATE projects SET tenant_id = ${defaultTenant.id} WHERE tenant_id IS NULL`);
    await db.execute(`UPDATE teams SET tenant_id = ${defaultTenant.id} WHERE tenant_id IS NULL`);
    await db.execute(`UPDATE documents SET tenant_id = ${defaultTenant.id} WHERE tenant_id IS NULL`);
    await db.execute(`UPDATE tasks SET tenant_id = ${defaultTenant.id} WHERE tenant_id IS NULL`);
    await db.execute(`UPDATE comments SET tenant_id = ${defaultTenant.id} WHERE tenant_id IS NULL`);
    
    console.log('✅ Existing data migrated to the default tenant.');
    
    // 4. Make tenant_id not nullable (now that all existing data has a tenant_id)
    console.log('\nStep 4: Finalizing schema...');
    
    await db.execute(`
      ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;
      ALTER TABLE projects ALTER COLUMN tenant_id SET NOT NULL;
      ALTER TABLE teams ALTER COLUMN tenant_id SET NOT NULL;
      ALTER TABLE documents ALTER COLUMN tenant_id SET NOT NULL;
      ALTER TABLE tasks ALTER COLUMN tenant_id SET NOT NULL;
      ALTER TABLE comments ALTER COLUMN tenant_id SET NOT NULL;
    `);
    
    console.log('✅ Schema finalized.');
    
    // 5. Create admin user for the tenant
    console.log('\nStep 5: Creating tenant admin...');
    const adminEmail = await askQuestion('Enter email for the tenant admin: ');
    
    // Find user with this email
    const users = await db.execute(`
      SELECT id FROM users WHERE email = '${adminEmail}' AND tenant_id = ${defaultTenant.id}
    `);
    
    if (users.rows.length > 0) {
      const userId = users.rows[0].id;
      await db.execute(`
        INSERT INTO tenant_admins (tenant_id, user_id, role)
        VALUES (${defaultTenant.id}, ${userId}, 'admin')
      `);
      console.log(`✅ User with ID ${userId} set as tenant admin.`);
    } else {
      console.log('⚠️ User not found. Please manually add a tenant admin later.');
    }
    
    console.log('\nMigration completed successfully!');
    console.log(`Your CPI Hub is now multi-tenant with '${tenantName}' as the default tenant.`);
    console.log(`Subdomain: ${subdomain}`);
    console.log('\nNext steps:');
    console.log('1. Update your application to use the tenant middleware');
    console.log('2. Test tenant isolation by creating additional tenants');
    console.log('3. Consider setting up custom domains for your tenants');
    
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the migration
migrateToMultiTenant().catch(console.error);