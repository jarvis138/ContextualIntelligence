# CPI Hub Production Deployment Guide

This guide provides detailed instructions for deploying the Contextual Project Intelligence (CPI) Hub to a production environment. It covers both traditional server deployment and container-based deployment using Docker.

## Prerequisites

Before deploying, ensure you have the following:

- Node.js 20.x or later
- PostgreSQL 14.x or later
- npm 9.x or later
- Docker and Docker Compose (for container deployment)
- SSL certificates for HTTPS

## Deployment Options

CPI Hub can be deployed in multiple ways:

1. **Traditional Server Deployment**
   - Manual deployment on a server
   - Managed with PM2 process manager

2. **Container Deployment**
   - Docker Compose for single-server deployment
   - Kubernetes for scalable multi-server deployment

3. **Cloud Deployment**
   - Compatible with major cloud platforms (AWS, Google Cloud, Azure)

## Environment Configuration

1. Copy the template environment file:
   ```
   cp .env.production.example .env.production
   ```

2. Edit `.env.production` with your production settings:
   - Database connection details
   - JWT secret (use a strong, random value)
   - API keys for external services
   - Logging level

3. Ensure sensitive values like `JWT_SECRET` and API keys are kept secure and never committed to version control.

## Traditional Server Deployment

### 1. Set Up the Server

1. Install dependencies:
   ```
   sudo apt update
   sudo apt install -y git nodejs npm postgresql nginx
   ```

2. Create a PostgreSQL database:
   ```
   sudo -u postgres createdb cpihub
   sudo -u postgres createuser -P cpihub_user
   ```

3. Grant privileges:
   ```
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE cpihub TO cpihub_user;"
   ```

### 2. Deploy the Application

1. Clone the repository:
   ```
   git clone https://github.com/your-organization/cpi-hub.git
   cd cpi-hub
   ```

2. Install dependencies:
   ```
   npm ci
   ```

3. Set up environment variables:
   ```
   cp .env.production.example .env.production
   ```
   Edit `.env.production` with your production settings.

4. Build the application:
   ```
   npm run build
   ```

5. Run database migrations:
   ```
   node scripts/migrate.js
   ```

### 3. Set Up Process Manager (PM2)

1. Install PM2 globally:
   ```
   npm install -g pm2
   ```

2. Start the application with PM2:
   ```
   pm2 start ecosystem.config.js --env production
   ```

3. Set up PM2 to start on boot:
   ```
   pm2 startup
   pm2 save
   ```

### 4. Configure Nginx

1. Create an Nginx configuration:
   ```
   sudo cp nginx/conf.d/default.conf /etc/nginx/sites-available/cpihub
   ```

2. Create symbolic link:
   ```
   sudo ln -s /etc/nginx/sites-available/cpihub /etc/nginx/sites-enabled/
   ```

3. Test and restart Nginx:
   ```
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### 5. Using the Deployment Script

For subsequent deployments, you can use the provided deployment script:

1. Make the script executable:
   ```
   chmod +x scripts/deploy.sh
   ```

2. Run the deployment:
   ```
   ./scripts/deploy.sh production
   ```

This script will:
- Create a database backup
- Pull the latest code
- Install dependencies
- Build the application
- Run database migrations
- Restart the application with PM2

## Docker Deployment

### 1. Prepare the Environment

1. Install Docker and Docker Compose:
   ```
   sudo apt update
   sudo apt install -y docker.io docker-compose
   ```

2. Create SSL certificates directory:
   ```
   mkdir -p nginx/ssl
   ```

3. Place your SSL certificates in the `nginx/ssl` directory:
   - `server.crt` (certificate)
   - `server.key` (private key)

### 2. Configure Environment Variables

Create a `.env` file for Docker Compose:

```
DATABASE_URL=postgres://postgres:postgres@db:5432/cpihub
JWT_SECRET=your-secure-jwt-secret
OPENAI_API_KEY=your-openai-api-key
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=cpihub
PGHOST=db
PGPORT=5432
```

### 3. Deploy with Docker Compose

1. Build the Docker images:
   ```
   docker-compose -f docker-compose.production.yml build
   ```

2. Start the services:
   ```
   docker-compose -f docker-compose.production.yml up -d
   ```

3. View logs:
   ```
   docker-compose -f docker-compose.production.yml logs -f
   ```

### 4. Docker Compose Management

- Stop the services:
  ```
  docker-compose -f docker-compose.production.yml down
  ```

- Restart the services:
  ```
  docker-compose -f docker-compose.production.yml restart
  ```

- View container status:
  ```
  docker-compose -f docker-compose.production.yml ps
  ```

## Database Backup and Recovery

### Automated Backups

The system includes automatic backup functionality:

1. In Docker deployment, the backup service runs daily at 2 AM.

2. For traditional deployment, set up a cron job:
   ```
   0 2 * * * cd /path/to/cpi-hub && node scripts/backup.js >> logs/backup.log 2>&1
   ```

### Manual Backups

You can create manual backups using the backup script:

```
node scripts/backup.js [--full] [--storage=local|s3]
```

Options:
- `--full`: Create a full backup (data + schema)
- `--storage`: Backup storage location (local or S3)

For S3 storage, set the following environment variables:
- `AWS_REGION`
- `AWS_S3_BUCKET`
- AWS credentials (set via environment or credentials file)

### Database Recovery

To restore from a backup:

```
node scripts/restore.js <backup-file>
```

Example:
```
node scripts/restore.js backups/backup-2025-04-13T12-00-00Z.sql
```

For S3 backups:
```
node scripts/restore.js s3://your-bucket/backups/backup-2025-04-13T12-00-00Z.sql
```

## Monitoring and Maintenance

### Health Check

The application provides a health check endpoint at `/api/health`. You can configure monitoring tools to check this endpoint regularly.

### Log Management

Logs are stored in the `logs` directory:
- `error.log`: Error-level logs
- `combined.log`: All logs
- `access.log`: HTTP access logs

For Docker deployment, logs are stored in Docker volumes.

### Updating the Application

To update the application:

1. Traditional deployment:
   ```
   ./scripts/deploy.sh production
   ```

2. Docker deployment:
   ```
   docker-compose -f docker-compose.production.yml down
   git pull
   docker-compose -f docker-compose.production.yml build
   docker-compose -f docker-compose.production.yml up -d
   ```

## Troubleshooting

### Common Issues

#### Database Connection Problems

- Check database credentials in `.env.production`
- Verify PostgreSQL is running
- Check network connectivity and firewall rules

#### Application Won't Start

- Check logs in `logs/error.log`
- Verify Node.js version is 20.x or later
- Check for port conflicts

#### SSL/TLS Issues

- Verify SSL certificates are valid and correctly configured
- Check Nginx configuration for SSL settings

## Security Best Practices

1. **Keep dependencies updated**:
   ```
   npm audit
   npm update
   ```

2. **Secure environment variables**:
   - Store secrets securely
   - Rotate credentials regularly
   - Use different credentials for each environment

3. **Enable firewall**:
   - Allow only necessary ports (80, 443, 22)
   - Block direct access to database port

4. **Regular backups**:
   - Test backup restoration periodically
   - Store backups in multiple locations