/**
 * Create Admin Tables Script
 * 
 * This script creates the admin-related tables in the database.
 * Run this script when setting up the CPI Hub for the first time.
 */

import { db } from '../server/db';
import { 
  systemMetrics, 
  systemEvents, 
  auditLogs, 
  backups,
  userSessions
} from '../shared/schema';

async function createTables() {
  try {
    console.log('Creating admin tables...');
    
    // Create system_metrics table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS system_metrics (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        name VARCHAR(100) NOT NULL,
        value TEXT NOT NULL,
        unit VARCHAR(20),
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        metadata JSONB
      );
      CREATE INDEX IF NOT EXISTS metric_type_idx ON system_metrics(type);
      CREATE INDEX IF NOT EXISTS metric_name_idx ON system_metrics(name);
      CREATE INDEX IF NOT EXISTS metric_timestamp_idx ON system_metrics(timestamp);
    `);
    console.log('✓ Created system_metrics table');
    
    // Create system_events table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS system_events (
        id SERIAL PRIMARY KEY,
        severity TEXT NOT NULL DEFAULT 'info',
        source VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        details JSONB,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
        acknowledged_by INTEGER,
        acknowledged_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS event_severity_idx ON system_events(severity);
      CREATE INDEX IF NOT EXISTS event_source_idx ON system_events(source);
      CREATE INDEX IF NOT EXISTS event_timestamp_idx ON system_events(timestamp);
      CREATE INDEX IF NOT EXISTS event_acknowledged_idx ON system_events(acknowledged);
    `);
    console.log('✓ Created system_events table');
    
    // Create audit_logs table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER,
        old_value JSONB,
        new_value JSONB,
        ip_address VARCHAR(50),
        user_agent TEXT,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS audit_user_id_idx ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS audit_action_idx ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS audit_entity_idx ON audit_logs(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS audit_timestamp_idx ON audit_logs(timestamp);
    `);
    console.log('✓ Created audit_logs table');
    
    // Create backups table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS backups (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        size INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed',
        path TEXT NOT NULL,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        metadata JSONB,
        restored_at TIMESTAMP,
        restored_by INTEGER,
        notes TEXT
      );
      CREATE INDEX IF NOT EXISTS backup_status_idx ON backups(status);
      CREATE INDEX IF NOT EXISTS backup_created_at_idx ON backups(created_at);
      CREATE INDEX IF NOT EXISTS backup_created_by_idx ON backups(created_by);
    `);
    console.log('✓ Created backups table');
    
    // Create user_sessions table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
    `);
    console.log('✓ Created user_sessions table');
    
    console.log('All admin tables created successfully!');
  } catch (error) {
    console.error('Error creating admin tables:', error);
    process.exit(1);
  }
}

// Run the function
createTables();