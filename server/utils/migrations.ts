/**
 * Database Migration Utility
 * 
 * This module provides functions for managing database migrations in production.
 * It supports:
 * - Creating database tables from the Drizzle schema
 * - Running safe schema updates using Drizzle Kit
 * - Backing up database before migrations
 */
import { db } from '../db';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { pool } from '../db';

const execAsync = promisify(exec);

/**
 * Run database migrations from SQL files in the migrations directory
 */
export async function runMigrations(): Promise<void> {
  try {
    console.log('Running database migrations...');
    
    // Create migrations directory if it doesn't exist
    const migrationsDir = path.join(process.cwd(), 'migrations');
    try {
      await fs.access(migrationsDir);
    } catch (error) {
      console.log('Creating migrations directory...');
      await fs.mkdir(migrationsDir, { recursive: true });
    }
    
    // Run migrations
    await migrate(db, { migrationsFolder: migrationsDir });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Generate database migrations from schema
 */
export async function generateMigrations(name: string): Promise<void> {
  try {
    console.log(`Generating migration: ${name}...`);
    await execAsync(`npx drizzle-kit generate:pg --schema=./shared/schema.ts --out=./migrations --name=${name}`);
    console.log('Migration generated successfully');
  } catch (error) {
    console.error('Failed to generate migration:', error);
    throw error;
  }
}

/**
 * Backup database before running migrations
 */
export async function backupDatabase(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);
  
  try {
    // Create backups directory if it doesn't exist
    try {
      await fs.access(backupDir);
    } catch (error) {
      console.log('Creating backups directory...');
      await fs.mkdir(backupDir, { recursive: true });
    }
    
    console.log(`Backing up database to ${backupFile}...`);
    
    // Get connection details from pool
    const client = await pool.connect();
    try {
      const dbConfig = {
        host: client.connection.host,
        port: client.connection.port,
        database: client.connection.database,
        user: client.connection.user,
        password: client.connection.password,
      };
      
      // Use pg_dump to create a backup
      const pgDumpCommand = `PGPASSWORD="${dbConfig.password}" pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -F p -f ${backupFile}`;
      await execAsync(pgDumpCommand);
      
      console.log('Database backup completed successfully');
      return backupFile;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database backup failed:', error);
    throw error;
  }
}

/**
 * Restore database from a backup file
 */
export async function restoreDatabase(backupFile: string): Promise<void> {
  try {
    console.log(`Restoring database from ${backupFile}...`);
    
    // Get connection details from pool
    const client = await pool.connect();
    try {
      const dbConfig = {
        host: client.connection.host,
        port: client.connection.port,
        database: client.connection.database,
        user: client.connection.user,
        password: client.connection.password,
      };
      
      // Use psql to restore from backup
      const psqlCommand = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f ${backupFile}`;
      await execAsync(psqlCommand);
      
      console.log('Database restore completed successfully');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database restore failed:', error);
    throw error;
  }
}

/**
 * List all available backups
 */
export async function listBackups(): Promise<string[]> {
  const backupDir = path.join(process.cwd(), 'backups');
  
  try {
    // Create backups directory if it doesn't exist
    try {
      await fs.access(backupDir);
    } catch (error) {
      await fs.mkdir(backupDir, { recursive: true });
      return [];
    }
    
    const files = await fs.readdir(backupDir);
    return files
      .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
      .map(file => path.join(backupDir, file));
  } catch (error) {
    console.error('Failed to list backups:', error);
    throw error;
  }
}