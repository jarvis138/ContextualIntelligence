/**
 * Database Backup Utility
 * 
 * This script creates a backup of the PostgreSQL database used by the CPI Hub.
 * It can be scheduled as a cron job for regular backups.
 * 
 * Usage: node scripts/backup.js [--full] [--storage=local|s3]
 * 
 * Options:
 *   --full        Create a full backup (data + schema)
 *   --storage     Backup storage location (local or s3)
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');

// Parse command line arguments
const args = process.argv.slice(2);
const fullBackup = args.includes('--full');
const storageArg = args.find(arg => arg.startsWith('--storage='));
const storage = storageArg ? storageArg.split('=')[1] : 'local';

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// Configuration
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(process.cwd(), 'backups');
const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);
const logFile = path.join(process.cwd(), 'logs', 'backup.log');

// Ensure backup and logs directories exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Logger function
function log(message) {
  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(logFile, logMessage);
}

// Extract database connection details from DATABASE_URL
function parseDbUrl(url) {
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  const regex = /postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/;
  const match = url.match(regex);
  
  if (!match) {
    throw new Error('Invalid DATABASE_URL format');
  }
  
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: match[4],
    database: match[5]
  };
}

// Create database backup
async function createBackup() {
  try {
    log(`Starting ${fullBackup ? 'full' : 'standard'} backup to ${storage}...`);
    
    const dbConfig = parseDbUrl(process.env.DATABASE_URL);
    
    // pg_dump command arguments
    const args = [
      '-h', dbConfig.host,
      '-p', dbConfig.port,
      '-U', dbConfig.user,
      '-d', dbConfig.database,
      '-F', 'p', // plain text format
      '-f', backupFile
    ];
    
    if (!fullBackup) {
      args.push('-a'); // data only, no schema
    }
    
    // Run pg_dump
    const pgDump = spawn('pg_dump', args, {
      env: { ...process.env, PGPASSWORD: dbConfig.password }
    });
    
    return new Promise((resolve, reject) => {
      pgDump.stdout.on('data', (data) => {
        log(`pg_dump output: ${data}`);
      });
      
      pgDump.stderr.on('data', (data) => {
        log(`pg_dump error: ${data}`);
      });
      
      pgDump.on('close', (code) => {
        if (code === 0) {
          log(`Backup created successfully at ${backupFile}`);
          
          // Store in S3 if selected
          if (storage === 's3') {
            uploadToS3(backupFile).then(resolve).catch(reject);
          } else {
            resolve(backupFile);
          }
        } else {
          reject(new Error(`pg_dump exited with code ${code}`));
        }
      });
      
      pgDump.on('error', (err) => {
        reject(new Error(`Failed to start pg_dump: ${err.message}`));
      });
    });
  } catch (error) {
    log(`Backup failed: ${error.message}`);
    throw error;
  }
}

// Upload backup to S3
async function uploadToS3(filePath) {
  try {
    log('Uploading backup to S3...');
    
    // Check for required environment variables
    if (!process.env.AWS_S3_BUCKET || !process.env.AWS_REGION) {
      throw new Error('AWS_S3_BUCKET and AWS_REGION environment variables must be set for S3 storage');
    }
    
    const bucketName = process.env.AWS_S3_BUCKET;
    const key = `backups/${path.basename(filePath)}`;
    
    // Create S3 client
    const s3Client = new S3Client({ region: process.env.AWS_REGION });
    
    // Read file content
    const fileContent = fs.readFileSync(filePath);
    
    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileContent,
      ContentType: 'application/sql'
    });
    
    await s3Client.send(command);
    
    log(`Backup uploaded to S3: s3://${bucketName}/${key}`);
    return `s3://${bucketName}/${key}`;
  } catch (error) {
    log(`S3 upload failed: ${error.message}`);
    log('Keeping local backup...');
    return filePath;
  }
}

// Clean up old backups (keep the 10 most recent)
function cleanupOldBackups() {
  try {
    log('Cleaning up old backups...');
    
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
      .map(file => path.join(backupDir, file))
      .sort((a, b) => fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime());
    
    // Keep only the 10 most recent backups
    if (files.length > 10) {
      const filesToDelete = files.slice(10);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file);
        log(`Deleted old backup: ${file}`);
      });
    }
    
    log(`Backup cleanup completed. Keeping ${Math.min(files.length, 10)} recent backups.`);
  } catch (error) {
    log(`Backup cleanup failed: ${error.message}`);
  }
}

// Run the backup process
async function run() {
  try {
    await createBackup();
    cleanupOldBackups();
    log('Backup process completed successfully.');
  } catch (error) {
    log(`Backup process failed: ${error.message}`);
    process.exit(1);
  }
}

// Execute the script
run();