/**
 * Swagger UI Middleware
 * 
 * This middleware adds Swagger UI to the API server for interactive API documentation.
 */
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateOpenApiSpec } from '../utils/openapi';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';

/**
 * Set up Swagger UI for API documentation
 */
export function setupSwagger(app: Express): void {
  try {
    // Generate or load OpenAPI specification
    const docsDir = path.join(process.cwd(), 'docs');
    const specPath = path.join(docsDir, 'openapi.json');
    
    let openApiSpec;
    
    // Check if spec file exists
    if (fs.existsSync(specPath)) {
      // Load existing spec if available
      const specContent = fs.readFileSync(specPath, 'utf8');
      openApiSpec = JSON.parse(specContent);
      logger.info('Loaded existing OpenAPI specification');
    } else {
      // Generate new spec
      openApiSpec = generateOpenApiSpec();
      logger.info('Generated new OpenAPI specification');
    }
    
    // Set up Swagger UI middleware
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
      },
    }));
    
    // Serve the raw OpenAPI spec
    app.get('/api/docs.json', (req, res) => {
      res.json(openApiSpec);
    });
    
    logger.info('Swagger UI is available at /api/docs');
  } catch (error) {
    logger.error('Failed to set up Swagger UI:', { error });
  }
}