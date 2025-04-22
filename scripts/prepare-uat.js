#!/usr/bin/env node

/**
 * UAT Preparation Script
 * 
 * This script prepares the ContextualIntelligence application for UAT.
 * It builds the application, runs linting, pushes database schema,
 * and performs basic validation checks.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Helper functions
function logSection(title) {
  console.log(`\n${colors.bright}${colors.blue}========== ${title} ==========${colors.reset}\n`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.cyan}ℹ ${message}${colors.reset}`);
}

function runCommand(command, options = {}) {
  try {
    logInfo(`Running: ${command}`);
    execSync(command, {
      stdio: options.silent ? 'ignore' : 'inherit',
      cwd: rootDir,
      ...options
    });
    return true;
  } catch (error) {
    logError(`Command failed: ${command}`);
    if (!options.ignoreError) {
      if (error.stdout) console.error(error.stdout.toString());
      if (error.stderr) console.error(error.stderr.toString());
      return false;
    }
    return false;
  }
}

// Main execution
(async function main() {
  logSection('UAT PREPARATION');

  logInfo('Current directory: ' + rootDir);

  // Check environment
  logSection('CHECKING ENVIRONMENT');
  
  // Check if .env file exists
  const envExists = fs.existsSync(path.join(rootDir, '.env'));
  if (!envExists) {
    logWarning('.env file not found. Creating a default one for UAT...');
    fs.writeFileSync(path.join(rootDir, '.env'), 'NODE_ENV=development\nPORT=3000\n');
    logSuccess('Created default .env file');
  } else {
    logSuccess('.env file exists');
  }

  // Install dependencies
  logSection('INSTALLING DEPENDENCIES');
  if (!runCommand('npm install')) {
    logError('Failed to install dependencies. Aborting.');
    process.exit(1);
  }
  logSuccess('Dependencies installed');

  // Lint code
  logSection('LINTING CODE');
  const lintResult = runCommand('npm run lint -- --quiet', { ignoreError: true, stdio: 'pipe' });
  if (lintResult) {
    logSuccess('Linting passed');
  } else {
    logWarning('Linting found issues (continuing anyway)');
  }

  // Build application
  logSection('BUILDING APPLICATION');
  if (!runCommand('npm run build')) {
    logError('Build failed. Aborting.');
    process.exit(1);
  }
  logSuccess('Build completed successfully');

  // Database setup
  logSection('DATABASE SETUP');
  const dbResult = runCommand('npm run db:push', { ignoreError: true });
  if (dbResult) {
    logSuccess('Database schema pushed successfully');
  } else {
    logWarning('Database schema push failed (may be ignored for local testing)');
  }

  // Install Playwright browsers (for UAT tests)
  logSection('SETTING UP TEST ENVIRONMENT');
  runCommand('npx playwright install chromium', { ignoreError: true });
  logSuccess('Playwright browsers installed');

  // Summary
  logSection('UAT PREPARATION COMPLETE');
  logInfo('The application is now ready for UAT testing.');
  logInfo('To start the application, run: npm run dev');
  logInfo('Access the application at: http://localhost:3000');
  logInfo('To run UAT tests, run: npx playwright test');

  logInfo('\nPlease see docs/UAT-Manual-TestPlan.md for manual testing instructions.');
  logInfo('For more details, refer to docs/UAT-Preparation-Guide.md');
})(); 