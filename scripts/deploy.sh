#!/bin/bash
# CPI Hub Deployment Script
# This script automates the deployment process for the CPI Hub application
# Usage: ./deploy.sh [environment] (default: production)

set -e  # Exit on any error

# Default environment is production
ENVIRONMENT=${1:-production}
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
PROJECT_ROOT=$(dirname "$SCRIPT_DIR")
ENV_FILE="$PROJECT_ROOT/.env.${ENVIRONMENT}"
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
BACKUP_DIR="$PROJECT_ROOT/backups"
DIST_DIR="$PROJECT_ROOT/dist"
LOGS_DIR="$PROJECT_ROOT/logs"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting CPI Hub deployment for ${ENVIRONMENT} environment...${NC}"

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}Error: Environment file $ENV_FILE not found${NC}"
  exit 1
fi

# Load environment variables
echo -e "${YELLOW}Loading environment variables from $ENV_FILE...${NC}"
set -a
source "$ENV_FILE"
set +a

# Ensure directories exist
mkdir -p "$BACKUP_DIR"
mkdir -p "$LOGS_DIR"

# Database backup before deployment
if [ -n "$DATABASE_URL" ]; then
  echo -e "${YELLOW}Creating database backup...${NC}"
  BACKUP_FILE="$BACKUP_DIR/backup-${TIMESTAMP}.sql"
  
  # Extract database connection details from DATABASE_URL
  DB_USER=$(echo $DATABASE_URL | sed -E 's/^postgres:\/\/([^:]+).*/\1/')
  DB_PASS=$(echo $DATABASE_URL | sed -E 's/^postgres:\/\/[^:]+:([^@]+).*/\1/')
  DB_HOST=$(echo $DATABASE_URL | sed -E 's/^postgres:\/\/[^@]+@([^:]+).*/\1/')
  DB_PORT=$(echo $DATABASE_URL | sed -E 's/^postgres:\/\/[^:]+:[^@]+@[^:]+:([0-9]+).*/\1/')
  DB_NAME=$(echo $DATABASE_URL | sed -E 's/^postgres:\/\/[^:]+:[^@]+@[^:]+:[0-9]+\/([^?]+).*/\1/')
  
  PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F p -f "$BACKUP_FILE" || {
    echo -e "${RED}Error: Database backup failed${NC}"
    exit 1
  }
  echo -e "${GREEN}Database backup created at $BACKUP_FILE${NC}"
fi

# Update code from repository
if [ -d "$PROJECT_ROOT/.git" ]; then
  echo -e "${YELLOW}Updating code from repository...${NC}"
  cd "$PROJECT_ROOT"
  git pull || {
    echo -e "${RED}Error: Failed to pull latest code${NC}"
    exit 1
  }
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
cd "$PROJECT_ROOT"
npm ci || {
  echo -e "${RED}Error: Failed to install dependencies${NC}"
  exit 1
}

# Build the application
echo -e "${YELLOW}Building the application...${NC}"
npm run build || {
  echo -e "${RED}Error: Build failed${NC}"
  exit 1
}

# Run database migrations
if [ -n "$DATABASE_URL" ]; then
  echo -e "${YELLOW}Running database migrations...${NC}"
  npm run db:migrate || {
    echo -e "${RED}Error: Database migration failed${NC}"
    echo -e "${YELLOW}Attempting to restore from backup...${NC}"
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE"
    exit 1
  }
fi

# Start or restart the application
# This assumes you're using PM2 or a similar process manager
if command -v pm2 &> /dev/null; then
  echo -e "${YELLOW}Restarting application with PM2...${NC}"
  pm2 startOrRestart ecosystem.config.js --env "$ENVIRONMENT" || {
    echo -e "${RED}Error: Failed to restart application${NC}"
    exit 1
  }
else
  echo -e "${YELLOW}PM2 not found. Please start the application manually.${NC}"
  echo -e "Run: NODE_ENV=$ENVIRONMENT npm run start"
fi

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "Application is now running in $ENVIRONMENT mode."

# Cleanup old backups (keep last 10)
if [ -d "$BACKUP_DIR" ]; then
  echo -e "${YELLOW}Cleaning up old backups (keeping the 10 most recent)...${NC}"
  cd "$BACKUP_DIR"
  ls -t | grep 'backup-.*\.sql' | tail -n +11 | xargs -r rm
fi

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  CPI Hub Deployment Complete${NC}"
echo -e "${GREEN}  Environment: $ENVIRONMENT${NC}"
echo -e "${GREEN}  Timestamp: $(date)${NC}"
echo -e "${GREEN}  Backup: $BACKUP_FILE${NC}"
echo -e "${GREEN}=========================================${NC}"