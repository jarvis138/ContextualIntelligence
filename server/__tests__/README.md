# API Testing Framework

This directory contains the test files and utilities for testing the CPI Hub API.

## Structure

- `api/` - API endpoint tests for each major resource
- `utils/` - Test utilities and helpers
- `services/` - Tests for specific services

## Test Utilities

The `utils/testUtils.ts` file provides common utilities for API testing:

- `createTestApp()` - Creates a test Express app with all routes registered
- `createTestData()` - Sets up test data for use in tests
- `getAuthToken()` - Gets authentication token for a user
- `cleanupTestData()` - Cleans up test data after tests

## Running Tests

To run all tests using Vitest:

```bash
npx vitest
```

To run tests for a specific resource:

```bash
npx vitest server/__tests__/api/tasks.test.ts
```

To run tests with coverage:

```bash
npx vitest --coverage
```

For watching mode during development:

```bash
npx vitest --watch
```

## Test Coverage

The API testing framework aims to provide comprehensive coverage for:

1. **All API endpoints** - GET, POST, PATCH, DELETE methods
2. **Authentication and authorization** - Ensuring proper access control
3. **Input validation** - Testing validation of request bodies
4. **Error handling** - Testing response formats for various error scenarios
5. **Integration** - Testing integration between different API components

## Writing New Tests

When adding new API endpoints, follow this pattern for testing:

1. **Basic functionality** - Test that the endpoint works with valid inputs
2. **Authentication** - Test that the endpoint requires authentication when needed
3. **Authorization** - Test that the endpoint enforces proper access control
4. **Validation** - Test that the endpoint validates input data
5. **Error handling** - Test that the endpoint handles errors properly

Example:

```typescript
describe('RESOURCE_NAME API', () => {
  // Setup - create test app, data, and get auth tokens
  
  describe('GET /api/resource', () => {
    it('should return list of resources', async () => {
      // Test basic functionality
    });
    
    it('should require authentication', async () => {
      // Test auth requirements
    });
    
    // More tests...
  });
  
  // More endpoint tests...
});
```

## Mocking External Services

For tests that depend on external services, use the mock server setup in `test/setup.ts`:

```typescript
import { server } from '../../../test/setup';

// Mock an external API response
server.use(
  rest.get('https://api.example.com/data', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: 'mocked data'
      })
    );
  })
);
```

## Testing Authentication

Authentication tests should verify:

1. Protected endpoints reject unauthenticated requests
2. Authentication tokens provide access to protected endpoints
3. Role-based access control is enforced

## Continuous Integration

The test suite runs automatically in CI when changes are pushed to the repository.