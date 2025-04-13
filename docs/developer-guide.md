# CPI Hub Developer Guide

## Introduction

This guide is intended for developers who want to understand, extend, or contribute to the Contextual Project Intelligence (CPI) Hub codebase. It covers the project structure, architecture, development environment setup, testing, and contribution guidelines.

## Technology Stack

CPI Hub is built using the following technologies:

### Backend
- **Node.js**: JavaScript runtime
- **Express**: Web application framework
- **TypeScript**: Static typing for JavaScript
- **PostgreSQL**: Relational database
- **Drizzle ORM**: Database ORM and query builder
- **JSON Web Tokens (JWT)**: Authentication
- **OpenAI API**: AI-powered text processing and insights

### Frontend
- **React**: UI component library
- **TypeScript**: Static typing
- **React Query**: Data fetching and state management
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: UI component library
- **D3.js**: Data visualization

### Development Tools
- **Vite**: Build tool and development server
- **ESLint**: Linting
- **Prettier**: Code formatting
- **Vitest**: Testing framework
- **MSWS**: API mocking
- **JSDOM**: DOM simulation for testing

## Project Structure

The project is organized as follows:

```
/
├── client/                # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and helper functions
│   │   ├── pages/         # Page components
│   │   ├── App.tsx        # Main application component
│   │   └── main.tsx       # Entry point
│   └── index.html         # HTML template
├── docs/                  # Documentation
├── e2e/                   # End-to-end tests
├── migrations/            # Database migrations
├── server/                # Backend server code
│   ├── __tests__/         # Server tests
│   ├── middleware/        # Express middleware
│   ├── services/          # Business logic
│   ├── utils/             # Utilities
│   ├── db.ts              # Database connection
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Data storage interface
│   └── vite.ts            # Vite integration
├── shared/                # Shared code (used by both client and server)
│   └── schema.ts          # Database schema and types
├── test/                  # Test utilities
├── drizzle.config.ts      # Drizzle ORM configuration
├── package.json           # Project dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── vite.config.ts         # Vite configuration
```

## Architecture

CPI Hub follows a client-server architecture with a clear separation of concerns:

### Frontend Architecture

The frontend uses React with a component-based architecture:

- **Pages**: Top-level components for each route
- **Components**: Reusable UI components
- **Hooks**: Custom React hooks for shared logic
- **Services**: API interaction and data processing

The frontend uses React Query for data fetching and state management, with a centralized query client configuration.

### Backend Architecture

The backend follows a layered architecture:

1. **Routes Layer**: API endpoints and request handling
2. **Service Layer**: Business logic and data processing
3. **Storage Layer**: Data access and persistence
4. **Database Layer**: PostgreSQL with Drizzle ORM

The backend implements:
- RESTful API principles
- Middleware for authentication, validation, and error handling
- Centralized error handling
- Environment-based configuration

### Data Model

The core data model consists of the following entities:

- **Users**: System users with authentication credentials
- **Projects**: Core projects managed in the system
- **Teams**: Groups of users working on projects
- **TeamMembers**: Relationship between users and teams
- **Tasks**: Work items associated with projects
- **Documents**: Files and documents related to projects
- **Activities**: Timeline of events in the system
- **Integrations**: External service connections
- **Insights**: AI-generated insights about projects
- **Relationships**: Connections between different entities

## Setting Up Development Environment

### Prerequisites

- Node.js 20.x or later
- PostgreSQL 14.x or later
- npm 9.x or later

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-organization/cpi-hub.git
   cd cpi-hub
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables by creating a `.env` file:
   ```
   NODE_ENV=development
   PORT=5000
   HOST=0.0.0.0
   DATABASE_URL=postgres://username:password@localhost:5432/cpihub
   JWT_SECRET=your-development-secret
   OPENAI_API_KEY=your-openai-api-key
   ```

4. Create a development database:
   ```
   createdb cpihub
   ```

5. Run database migrations:
   ```
   npm run db:push
   ```

6. Start the development server:
   ```
   npm run dev
   ```

7. Access the application at http://localhost:5000

### Environment Variables

The following environment variables are used in development:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| NODE_ENV | Environment mode | No | `development` |
| PORT | Server port | No | 5000 |
| HOST | Server host | No | 0.0.0.0 |
| DATABASE_URL | PostgreSQL connection URL | Yes | - |
| JWT_SECRET | Secret for JWT token signing | No | `development_jwt_secret` |
| OPENAI_API_KEY | OpenAI API key | Yes | - |
| SLACK_BOT_TOKEN | Slack bot token | No | - |
| SLACK_CHANNEL_ID | Slack channel ID | No | - |

## Development Workflow

### Code Style and Formatting

The project uses ESLint and Prettier for code style and formatting:

- Run linting: `npm run lint`
- Run formatting: `npm run format`

All code should follow the established style guides and pass linting before being committed.

### Database Changes

#### Schema Changes

1. Update the schema definition in `shared/schema.ts`
2. Generate a new migration:
   ```
   npm run db:generate -- --name migration_name
   ```
3. Apply the migration:
   ```
   npm run db:push
   ```

#### Data Migrations

For complex data migrations, create a custom migration script in `migrations/` and apply it using Drizzle.

### Adding New API Endpoints

1. Define the endpoint in `server/routes.ts`
2. Implement the necessary service methods
3. Update `storage.ts` if new data access methods are needed
4. Update the OpenAPI schema in `server/utils/openapi.ts`
5. Add tests for the new endpoint

### Adding New Frontend Features

1. Create or update components in `client/src/components/`
2. Add or modify pages in `client/src/pages/`
3. Update the routing in `client/src/App.tsx` if needed
4. Add tests for the new components

## Testing

The project uses a comprehensive testing approach:

### Unit Testing

Unit tests focus on testing individual functions and components in isolation:

- **Backend unit tests**: Located in `server/__tests__/`
- **Frontend unit tests**: Located in `client/src/__tests__/`

Run unit tests with:
```
npm run test:unit
```

### Integration Testing

Integration tests focus on testing the interaction between different parts of the system:

- **API tests**: Test API endpoints with actual database interaction
- **Frontend integration tests**: Test component interactions

Run integration tests with:
```
npm run test:integration
```

### End-to-End Testing

End-to-end tests simulate real user interactions with the application:

- Located in `e2e/`
- Use Playwright for browser automation

Run end-to-end tests with:
```
npm run test:e2e
```

### Test Coverage

Generate test coverage reports with:
```
npm run test:coverage
```

The goal is to maintain at least 80% test coverage for critical paths.

## Building and Deployment

### Building for Production

1. Build the application for production:
   ```
   npm run build
   ```

2. The build output is located in the `dist/` directory.

### Deployment Options

The application can be deployed in several ways:

1. **Docker deployment**:
   ```
   docker-compose -f docker-compose.production.yml up -d
   ```

2. **Traditional deployment**:
   - Build the application
   - Set up environment variables
   - Start the server with `npm run start`

3. **Cloud deployment**:
   - The application is compatible with platforms like Heroku, AWS, Google Cloud, etc.
   - Follow platform-specific deployment instructions

## Contributing

We welcome contributions to the CPI Hub project!

### Contribution Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm run test`
5. Commit your changes: `git commit -m "Add my feature"`
6. Push to your fork: `git push origin feature/my-feature`
7. Create a pull request

### Coding Standards

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Keep commits focused and descriptive

### Pull Request Guidelines

- Provide a clear description of the changes
- Link to any related issues
- Ensure all tests pass
- Request code review from maintainers

## API Reference

The API reference is available in OpenAPI format at `/api/docs` when the server is running. This provides interactive documentation for all API endpoints.

For offline reference, you can find the OpenAPI specification in `docs/openapi.json`.

## Troubleshooting

### Common Development Issues

#### Hot Reloading Not Working

1. Check if Vite is running correctly
2. Ensure file paths are correct
3. Try restarting the development server

#### Database Connection Issues

1. Verify PostgreSQL is running
2. Check `DATABASE_URL` in your `.env` file
3. Ensure the database exists and is accessible

#### Testing Failures

1. Check for environment-specific issues
2. Verify that the test database is set up correctly
3. Look for timing issues in async tests

### Debugging

- Use the built-in Node.js debugger with `npm run dev:debug`
- Add logging with `console.log` or the logger utility
- Use browser developer tools for frontend debugging

## Additional Resources

- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Express Documentation](https://expressjs.com/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [React Query Documentation](https://tanstack.com/query/latest)
- [D3.js Documentation](https://d3js.org/)