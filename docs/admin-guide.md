# CPI Hub Administrator Guide

## Introduction

This guide is intended for system administrators responsible for deploying, configuring, and maintaining the Contextual Project Intelligence (CPI) Hub. It covers installation, configuration, user management, and troubleshooting.

## System Requirements

### Minimum Requirements

- **Processor**: 2 CPU cores
- **Memory**: 4GB RAM
- **Storage**: 20GB available space
- **Database**: PostgreSQL 14+
- **Node.js**: v20+
- **Network**: Broadband connection (10+ Mbps)

### Recommended Requirements

- **Processor**: 4+ CPU cores
- **Memory**: 8GB+ RAM
- **Storage**: 50GB+ available space
- **Database**: PostgreSQL 15+
- **Node.js**: v20+
- **Network**: High-speed connection (50+ Mbps)

## Installation

### Docker Deployment (Recommended)

1. Ensure Docker and Docker Compose are installed
2. Clone the repository:
   ```
   git clone https://github.com/your-organization/cpi-hub.git
   cd cpi-hub
   ```
3. Configure environment variables in `.env.production`
4. Build and start containers:
   ```
   docker-compose -f docker-compose.production.yml up -d
   ```

### Manual Deployment

1. Ensure Node.js (v20+) and PostgreSQL (14+) are installed
2. Clone the repository:
   ```
   git clone https://github.com/your-organization/cpi-hub.git
   cd cpi-hub
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Configure environment variables in `.env.production`
5. Build the application:
   ```
   npm run build
   ```
6. Run database migrations:
   ```
   npm run db:migrate
   ```
7. Start the server:
   ```
   npm run start
   ```

## Configuration

### Environment Variables

All configuration is managed through environment variables in `.env.production`:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| NODE_ENV | Environment mode | Yes | `production` |
| PORT | Server port | No | 5000 |
| HOST | Server host | No | 0.0.0.0 |
| DATABASE_URL | PostgreSQL connection URL | Yes | - |
| JWT_SECRET | Secret for JWT token signing | Yes | - |
| JWT_EXPIRY | JWT token expiry in seconds | No | 86400 |
| RATE_LIMIT_MAX_REQUESTS | Rate limit requests per window | No | 200 |
| RATE_LIMIT_WINDOW_MS | Rate limit window in milliseconds | No | 60000 |
| CACHE_TTL | Cache time-to-live in seconds | No | 300 |
| LOG_LEVEL | Logging level | No | info |
| OPENAI_API_KEY | OpenAI API key for AI features | Yes | - |
| SLACK_BOT_TOKEN | Slack bot token for integration | No | - |
| SLACK_CHANNEL_ID | Default Slack channel ID | No | - |

### Database Configuration

The database connection is configured using the `DATABASE_URL` environment variable:

```
DATABASE_URL=postgres://username:password@host:port/database
```

For production, it's recommended to:
- Use a dedicated database user with limited permissions
- Enable SSL for database connections
- Set up regular database backups
- Configure connection pooling appropriately

### Security Configuration

Security settings can be configured through environment variables:

- `JWT_SECRET`: A strong, unique secret for signing JWT tokens
- `JWT_EXPIRY`: Token expiry time in seconds (default: 86400, or 24 hours)

It's recommended to:
- Use a strong, randomly generated JWT secret
- Rotate the JWT secret periodically
- Set an appropriate token expiry time based on security requirements

## User Management

### User Roles

The system supports the following user roles:

- **Administrator**: Full system access
- **Manager**: Project and team management across the organization
- **Team Lead**: Management of specific projects and teams
- **Member**: Basic access to assigned projects and teams

### Creating Administrator Users

New administrator users can be created in two ways:

1. **Through the API**:
   ```
   POST /api/admin/users
   {
     "username": "admin",
     "password": "secure-password",
     "fullName": "Admin User",
     "email": "admin@example.com",
     "role": "administrator"
   }
   ```

2. **Using the command-line tool**:
   ```
   npm run create-admin -- --username=admin --password=secure-password --email=admin@example.com
   ```

### Managing Users

Administrators can manage users through the Admin panel:

1. Navigate to Admin > Users
2. From here, you can:
   - View all users
   - Create new users
   - Edit existing users
   - Disable/enable user accounts
   - Reset user passwords

## Backup and Recovery

### Database Backups

#### Automated Backups

The system includes a built-in backup system that can be configured to run automatically:

1. Configure the backup schedule in `.env.production`:
   ```
   BACKUP_ENABLED=true
   BACKUP_SCHEDULE=0 0 * * *  # Daily at midnight (cron format)
   BACKUP_RETENTION_DAYS=30
   ```

2. Backups are stored in the `backups` directory by default

3. To change the backup location:
   ```
   BACKUP_DIR=/path/to/backup/directory
   ```

#### Manual Backups

To create a manual backup:

```
npm run backup
```

### Recovery

To restore from a backup:

1. Using the provided script:
   ```
   npm run restore -- --file=backups/backup-2025-04-13T00-00-00Z.sql
   ```

2. Directly with PostgreSQL:
   ```
   psql -U username -d database -f backups/backup-2025-04-13T00-00-00Z.sql
   ```

## Monitoring and Maintenance

### Health Checks

The system provides a health check endpoint at `/api/health` that returns:

- System status
- Database connection status
- Memory usage
- CPU usage
- Uptime

This endpoint can be used with monitoring tools like Prometheus, Grafana, or simple HTTP checks.

### Log Management

Logs are stored in the `logs` directory with different files for different log levels:

- `error.log`: Error-level logs
- `combined.log`: All logs
- `access.log`: HTTP access logs

In production, it's recommended to use a log management system like ELK Stack (Elasticsearch, Logstash, Kibana) or a cloud-based solution.

### Performance Tuning

#### Database Performance

- Regularly run `ANALYZE` and `VACUUM` on the PostgreSQL database
- Monitor slow queries and create appropriate indexes
- Consider using PostgreSQL connection pooling

#### Application Performance

- Adjust the `CACHE_TTL` environment variable to optimize caching
- Tune `RATE_LIMIT_MAX_REQUESTS` and `RATE_LIMIT_WINDOW_MS` based on traffic
- Consider using a reverse proxy like Nginx for SSL termination and static assets

## Troubleshooting

### Common Issues

#### Server Won't Start

1. Check environment variables are correctly set
2. Verify database connection is working
3. Check for port conflicts
4. Review logs in `logs/error.log`

#### Database Connection Issues

1. Confirm PostgreSQL is running
2. Verify `DATABASE_URL` is correct
3. Check database user permissions
4. Ensure firewall rules allow the connection

#### Authentication Problems

1. Verify JWT_SECRET is set and consistent
2. Check token expiry settings
3. Clear browser cookies and try again
4. Verify user credentials in the database

#### Performance Issues

1. Check server resource usage (CPU, memory, disk)
2. Review database performance (slow queries, missing indexes)
3. Analyze application logs for errors or bottlenecks
4. Consider scaling up server resources

### Getting Support

For additional support:

1. Check the documentation in the `docs` directory
2. Review the project's GitHub repository for issues and solutions
3. Contact technical support at support@cpihub.example.com