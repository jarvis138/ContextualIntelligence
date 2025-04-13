# Dockerfile for CPI Hub
# Multi-stage build for optimized production image

# Stage 1: Build stage
FROM node:20-alpine as builder

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy application source
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production

# Create app directories
RUN mkdir -p /app/logs /app/backups

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built application from build stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/.env.production ./.env.production
COPY --from=builder /app/scripts ./scripts

# Make the deploy script executable
RUN chmod +x ./scripts/deploy.sh

# Expose the application port
EXPOSE 5000

# Command to run the application
CMD ["node", "dist/server/index.js"]