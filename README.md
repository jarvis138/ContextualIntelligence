# ContextualIntelligence

A comprehensive contextual intelligence platform built with microservices architecture.

## Architecture

This project follows a microservices architecture with the following structure:

- **client/**: Frontend React application
- **server/**: Main server application
- **services/**: Microservices
  - **auth-service**: Authentication and authorization
  - **document-service**: Document management and processing
  - **ai-service**: AI/ML processing and contextual intelligence
- **shared/**: Shared utilities and types

## Prerequisites

- Node.js 18+
- npm or yarn
- Docker (optional, for containerized deployment)

## Getting Started

### Installation

```bash
# Install root dependencies
npm install

# Install service dependencies
npm run install:services
```

### Development

```bash
# Start all services in development mode
npm run dev

# Start individual services
npm run dev:auth
npm run dev:document
npm run dev:ai

# Start frontend only
npm run client
```

### Building

```bash
# Build all services
npm run build

# Build individual services
npm run build:auth
npm run build:document  
npm run build:ai
```

### Testing

```bash
# Run all tests
npm test

# Run tests for specific service
cd services/auth-service && npm test
```

### Linting

```bash
# Lint all code
npm run lint

# Fix linting issues
npm run lint:fix
```

## CI/CD

The project uses GitHub Actions for CI/CD with the following workflows:

- **Optimized CI/CD Pipeline**: Builds, tests, and deploys services based on changes
- **Path-based triggering**: Only builds services that have changed
- **Multi-environment deployment**: Dev, Staging, and Production environments

## Services

### Auth Service
Handles authentication, authorization, and user management.

### Document Service  
Manages document upload, processing, and storage with OCR capabilities.

### AI Service
Provides AI-powered contextual intelligence and natural language processing.

## Deployment

The application can be deployed using:

- **Docker**: Container-based deployment
- **Kubernetes**: Orchestrated deployment with provided manifests
- **Netlify**: Frontend deployment
- **Cloud providers**: AWS, Azure, GCP compatible

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
NODE_ENV=development
DATABASE_URL=your-database-url
REDIS_URL=your-redis-url
JWT_SECRET=your-jwt-secret
# Add other required variables
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License