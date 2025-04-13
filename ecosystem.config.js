/**
 * PM2 Ecosystem Configuration
 * 
 * This file configures PM2 process manager for running the application in different environments.
 * It supports development, staging, and production environments with different settings.
 */
module.exports = {
  apps: [{
    name: 'cpi-hub',
    script: 'dist/server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: 'logs/error.log',
    out_file: 'logs/output.log',
    pid_file: 'logs/process.pid',
    merge_logs: true
  }],

  // Deployment configuration
  // This can be used with PM2 deploy feature for remote deployments
  deploy: {
    production: {
      user: 'deploy',
      host: 'cpihub-production',
      ref: 'origin/main',
      repo: 'git@github.com:your-organization/cpi-hub.git',
      path: '/opt/cpi-hub',
      'post-deploy': 'scripts/deploy.sh production'
    },
    staging: {
      user: 'deploy',
      host: 'cpihub-staging',
      ref: 'origin/develop',
      repo: 'git@github.com:your-organization/cpi-hub.git',
      path: '/opt/cpi-hub-staging',
      'post-deploy': 'scripts/deploy.sh staging'
    }
  }
};