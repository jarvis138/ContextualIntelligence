/**
 * OpenAPI/Swagger Documentation Generator
 * 
 * This module generates OpenAPI documentation for the API.
 */
import * as schema from '@shared/schema';
import { zodToJsonSchema } from 'zod-to-json-schema';
import fs from 'fs';
import path from 'path';

/**
 * Generate OpenAPI specification for the API
 */
export function generateOpenApiSpec() {
  // Base OpenAPI specification
  const openApiSpec = {
    openapi: '3.0.0',
    info: {
      title: 'CPI Hub API',
      version: '1.0.0',
      description: 'API for the Contextual Project Intelligence Hub',
      contact: {
        name: 'CPI Hub Support',
        email: 'support@cpihub.example.com',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'API Server',
      },
    ],
    paths: {},
    components: {
      schemas: {},
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  };

  // Add schema components from Zod models
  const schemaModels = {
    User: schema.insertUserSchema,
    Project: schema.insertProjectSchema,
    Team: schema.insertTeamSchema,
    TeamMember: schema.insertTeamMemberSchema,
    Task: schema.insertTaskSchema,
    Document: schema.insertDocumentSchema,
    Activity: schema.insertActivitySchema,
    Integration: schema.insertIntegrationSchema,
    Insight: schema.insertInsightSchema,
    Relationship: schema.insertRelationshipSchema,
  };

  // Convert Zod schemas to JSON Schema
  Object.entries(schemaModels).forEach(([name, zodSchema]) => {
    openApiSpec.components.schemas[name] = zodToJsonSchema(zodSchema, {
      name,
      target: 'openApi3',
    });
  });

  // Define API endpoints - Projects
  openApiSpec.paths['/projects'] = {
    get: {
      summary: 'Get all projects',
      description: 'Retrieve a list of all projects with pagination',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', default: 1 },
          description: 'Page number',
        },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', default: 10 },
          description: 'Number of items per page',
        },
      ],
      responses: {
        '200': {
          description: 'List of projects',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Project' },
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                      totalItems: { type: 'integer' },
                      totalPages: { type: 'integer' },
                      hasNextPage: { type: 'boolean' },
                      hasPrevPage: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
        },
      },
    },
    post: {
      summary: 'Create a new project',
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Project' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Project created successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Project' },
            },
          },
        },
        '400': {
          description: 'Bad request',
        },
        '401': {
          description: 'Unauthorized',
        },
      },
    },
  };

  openApiSpec.paths['/projects/{id}'] = {
    get: {
      summary: 'Get project by ID',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'integer' },
          description: 'Project ID',
        },
      ],
      responses: {
        '200': {
          description: 'Project details',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Project' },
            },
          },
        },
        '404': {
          description: 'Project not found',
        },
        '401': {
          description: 'Unauthorized',
        },
      },
    },
    patch: {
      summary: 'Update a project',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'integer' },
          description: 'Project ID',
        },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Project' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Project updated successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Project' },
            },
          },
        },
        '400': {
          description: 'Bad request',
        },
        '401': {
          description: 'Unauthorized',
        },
        '404': {
          description: 'Project not found',
        },
      },
    },
  };

  // Add more endpoints for other entities
  // Tasks
  openApiSpec.paths['/projects/{id}/tasks'] = {
    get: {
      summary: 'Get tasks for a project',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'integer' },
          description: 'Project ID',
        },
      ],
      responses: {
        '200': {
          description: 'List of tasks for the project',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/Task' },
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
        },
        '404': {
          description: 'Project not found',
        },
      },
    },
    post: {
      summary: 'Create a new task for a project',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'integer' },
          description: 'Project ID',
        },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Task' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Task created successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Task' },
            },
          },
        },
        '400': {
          description: 'Bad request',
        },
        '401': {
          description: 'Unauthorized',
        },
        '404': {
          description: 'Project not found',
        },
      },
    },
  };

  // Teams
  openApiSpec.paths['/projects/{id}/teams'] = {
    get: {
      summary: 'Get teams for a project',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'integer' },
          description: 'Project ID',
        },
      ],
      responses: {
        '200': {
          description: 'List of teams for the project',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/Team' },
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
        },
        '404': {
          description: 'Project not found',
        },
      },
    },
  };

  // Health check
  openApiSpec.paths['/health'] = {
    get: {
      summary: 'API health check',
      description: 'Check the health of the API and its dependencies',
      responses: {
        '200': {
          description: 'API is healthy',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['ok'] },
                  timestamp: { type: 'string', format: 'date-time' },
                  uptime: { type: 'number' },
                  averageResponseTime: { type: 'number' },
                  requestsPerSecond: { type: 'string' },
                  errorCount: { type: 'number' },
                },
              },
            },
          },
        },
        '503': {
          description: 'API is unhealthy',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['error'] },
                  timestamp: { type: 'string', format: 'date-time' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  };

  // Authentication
  openApiSpec.paths['/register'] = {
    post: {
      summary: 'Register a new user',
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/User' },
          },
        },
      },
      responses: {
        '201': {
          description: 'User registered successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user: { $ref: '#/components/schemas/User' },
                  token: { type: 'string' },
                },
              },
            },
          },
        },
        '400': {
          description: 'Bad request',
        },
      },
    },
  };

  openApiSpec.paths['/login'] = {
    post: {
      summary: 'User login',
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['username', 'password'],
              properties: {
                username: { type: 'string' },
                password: { type: 'string', format: 'password' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user: { $ref: '#/components/schemas/User' },
                  token: { type: 'string' },
                },
              },
            },
          },
        },
        '401': {
          description: 'Invalid credentials',
        },
      },
    },
  };

  // Write OpenAPI spec to file
  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  
  const specPath = path.join(docsDir, 'openapi.json');
  fs.writeFileSync(specPath, JSON.stringify(openApiSpec, null, 2));
  
  return openApiSpec;
}