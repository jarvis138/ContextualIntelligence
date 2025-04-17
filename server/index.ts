import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupObservability, logger } from "./services/observability";
import { featureFlagService } from "../shared/feature-flags";
import { tenantMiddleware, TenantIdentificationStrategy } from "./middleware/tenant-middleware";
import { tenantService } from "./tenant-service";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup tenant middleware - currently commented out until migration is run
// We need to run the migration script (scripts/migrate-to-multi-tenant.ts) first
// to create the tenant tables before enabling the middleware

/* UNCOMMENT AFTER RUNNING MIGRATION:
// In development mode, use a default tenant ID to simplify local development
const isDevelopment = app.get("env") === "development";
app.use(tenantMiddleware({
  strategies: [
    TenantIdentificationStrategy.SUBDOMAIN,
    TenantIdentificationStrategy.HEADER,
    TenantIdentificationStrategy.DOMAIN
  ],
  // In development mode, use tenant ID 1 as default if no tenant is identified
  defaultTenantId: isDevelopment ? 1 : undefined,
  // Paths that don't require tenant identification
  ignorePaths: [
    '/health',
    '/metrics',
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/tenants',
    '/__vite_ping',
    '/@vite',
    '/node_modules',
    '/src/components',
    '/src/lib',
    '/assets',
    '/favicon.ico'
  ]
}));
*/

// TODO: Uncomment the above middleware after running the migration script

// Initialize feature flags
if (featureFlagService.isEnabled('enhanced-logging')) {
  // Setup observability framework with enhanced logging
  setupObservability(app);
  
  logger.info('Enhanced logging enabled via feature flag');
} else {
  // Use simple logging for backwards compatibility
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        log(logLine);
      }
    });

    next();
  });
}

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
