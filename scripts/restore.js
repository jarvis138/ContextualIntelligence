/**
 * Database Restore Utility
 * 
 * This script restores a PostgreSQL database from a backup file.
 * It can be used for disaster recovery or migrating to a new environment.
 * 
 * Usage: node scripts/restore.js <backup-file> [--force]
 * 
 * Options:
 *   --force    Proceed without confirmation (use with caution)
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');

// Parse command line arguments
const args = process.argv.slice(2);
const backupFile = args[0];
const forceRestore = args.includes('--force');

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// Configuration
const logFile = path.join(process.cwd(), 'logs', 'restore.log');
const tempDir = path.join(process.cwd(), 'tmp');

// Ensure logs and temp directories exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
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

// Ask for confirmation before proceeding
function confirmRestore() {
  if (forceRestore) {
    return Promise.resolve(true);
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('WARNING: This will overwrite the current database. Are you sure? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

// Download from S3 if the backup is stored there
async function getBackupFile(backupPath) {
  if (backupPath.startsWith('s3://')) {
    log(`Downloading backup from S3: ${backupPath}...`);
    
    // Parse S3 path
    const s3Path = backupPath.replace('s3://', '');
    const [bucket, ...keyParts] = s3Path.split('/');
    const key = keyParts.join('/');
    
    // Check for required environment variables
    if (!process.env.AWS_REGION) {
      throw new Error('AWS_REGION environment variable must be set for S3 storage');
    }
    
    // Create S3 client
    const s3Client = new S3Client({ region: process.env.AWS_REGION });
    
    // Download from S3
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });
    
    const response = await s3Client.send(command);
    
    // Save to temporary file
    const localFile = path.join(tempDir, path.basename(key));
    const fileStream = fs.createWriteStream(localFile);
    
    return new Promise((resolve, reject) => {
      response.Body.pipe(fileStream);
      fileStream.on('finish', () => {
        log(`Backup downloaded to ${localFile}`);
        resolve(localFile);
      });
      fileStream.on('error', (err) => {
        reject(new Error(`Failed to save backup file: ${err.message}`));
      });
    });
  }
  
  // Local file
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }
  
  return backupPath;
}

// Restore database from backup
async function restoreDatabase(filePath) {
  try {
    log(`Starting database restore from ${filePath}...`);
    
    const dbConfig = parseDbUrl(process.env.DATABASE_URL);
    
    // psql command arguments
    const args = [
      '-h', dbConfig.host,
      '-p', dbConfig.port,
      '-U', dbConfig.user,
      '-d', dbConfig.database,
      '-f', filePath
    ];
    
    // Run psql
    const psql = spawn('psql', args, {
      env: { ...process.env, PGPASSWORD: dbConfig.password }
    });
    
    return new Promise((resolve, reject) => {
      psql.stdout.on('data', (data) => {
        log(`psql output: ${data}`);
      });
      
      psql.stderr.on('data', (data) => {
        log(`psql error: ${data}`);
      });
      
      psql.on('close', (code) => {
        if (code === 0) {
          log('Database restore completed successfully');
          resolve();
        } else {
          reject(new Error(`psql exited with code ${code}`));
        }
      });
      
      psql.on('error', (err) => {
        reject(new Error(`Failed to start psql: ${err.message}`));
      });
    });
  } catch (error) {
    log(`Database restore failed: ${error.message}`);
    throw error;
  }
}

// Clean up temporary files
function cleanup(filePath) {
  if (filePath.startsWith(tempDir)) {
    try {
      fs.unlinkSync(filePath);
      log(`Cleaned up temporary file: ${filePath}`);
    } catch (error) {
      log(`Failed to clean up temporary file: ${error.message}`);
    }
  }
}

// Run the restore process
async function run() {
  if (!backupFile) {
    log('Error: No backup file specified');
    console.error('Usage: node scripts/restore.js <backup-file> [--force]');
    process.exit(1);
  }
  
  try {
    const confirmed = await confirmRestore();
    
    if (!confirmed) {
      log('Restore canceled by user');
      process.exit(0);
    }
    
    const localBackupFile = await getBackupFile(backupFile);
    await restoreDatabase(localBackupFile);
    cleanup(localBackupFile);
    
    log('Restore process completed successfully');
  } catch (error) {
    log(`Restore process failed: ${error.message}`);
    process.exit(1);
  }
}

// Execute the script
run();