import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to add security headers to all responses
 */
export function securityHeadersMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set security-related headers
    
    // Helps prevent XSS attacks
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Helps prevent clickjacking attacks
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    // Prevents browsers from MIME-sniffing a response away from the declared content-type
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enables strict HTTP Strict Transport Security (HSTS) for secure connections
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    // Content Security Policy (CSP) to prevent XSS attacks
    // Adjust according to your application's needs
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' wss: https:;"
    );
    
    // Referrer Policy to control what information is sent in the Referer header
    res.setHeader('Referrer-Policy', 'same-origin');
    
    // Feature-Policy to restrict what features and APIs can be used
    res.setHeader('Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), interest-cohort=()'
    );
    
    next();
  };
}

/**
 * Middleware to protect against common HTTP parameter pollution attacks
 */
export function parameterPollutionProtection() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Protect against parameter pollution
    for (const key in req.query) {
      if (Array.isArray(req.query[key])) {
        // Take the last value in the array for each parameter
        req.query[key] = req.query[key][req.query[key].length - 1];
      }
    }
    
    next();
  };
}

/**
 * Middleware to implement a simple CORS (Cross-Origin Resource Sharing) policy
 */
export function corsMiddleware(allowedOrigins: string[] = ['*']) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    
    // Check if the origin is allowed
    if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      // For requests with no origin like mobile apps or curl requests
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    // Allow commonly needed headers and methods
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  };
}