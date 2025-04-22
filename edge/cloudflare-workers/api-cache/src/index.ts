/**
 * Cloudflare Worker for API caching and edge processing
 * This worker provides:
 * 1. API response caching at the edge
 * 2. Request routing based on user location
 * 3. Basic rate limiting
 * 4. Security headers
 */

// Define cache TTL for different API endpoints
const CACHE_TTL_CONFIG = {
  // Static content - longer cache
  '/api/v1/config': 3600, // 1 hour
  '/api/v1/public': 3600, // 1 hour
  
  // Semi-dynamic content - medium cache
  '/api/v1/documents': 300, // 5 minutes
  '/api/v1/folders': 300, // 5 minutes
  
  // Dynamic content - short cache or no cache
  '/api/v1/auth': 0, // No cache
  '/api/v1/users': 60, // 1 minute
  
  // Default TTL
  'default': 120 // 2 minutes
};

// Regional API endpoints
const REGIONAL_ENDPOINTS = {
  'us-east': 'https://us-east.api.contextualintelligence.com',
  'us-west': 'https://us-west.api.contextualintelligence.com',
  'eu-west': 'https://eu-west.api.contextualintelligence.com',
  'eu-central': 'https://eu-central.api.contextualintelligence.com',
  'ap-southeast': 'https://ap-southeast.api.contextualintelligence.com',
  'ap-northeast': 'https://ap-northeast.api.contextualintelligence.com'
};

// Region mapping by country code
const COUNTRY_TO_REGION = {
  // North America
  'US': ['us-east', 'us-west'],
  'CA': ['us-west', 'us-east'],
  'MX': ['us-west', 'us-east'],
  
  // Europe
  'GB': ['eu-west', 'eu-central'],
  'IE': ['eu-west', 'eu-central'],
  'FR': ['eu-west', 'eu-central'],
  'DE': ['eu-central', 'eu-west'],
  'IT': ['eu-central', 'eu-west'],
  'ES': ['eu-west', 'eu-central'],
  'NL': ['eu-central', 'eu-west'],
  'BE': ['eu-west', 'eu-central'],
  'CH': ['eu-central', 'eu-west'],
  'AT': ['eu-central', 'eu-west'],
  'SE': ['eu-central', 'eu-west'],
  'DK': ['eu-central', 'eu-west'],
  'NO': ['eu-central', 'eu-west'],
  'FI': ['eu-central', 'eu-west'],
  
  // Asia Pacific
  'JP': ['ap-northeast', 'ap-southeast'],
  'KR': ['ap-northeast', 'ap-southeast'],
  'SG': ['ap-southeast', 'ap-northeast'],
  'AU': ['ap-southeast', 'ap-northeast'],
  'NZ': ['ap-southeast', 'ap-northeast'],
  'IN': ['ap-southeast', 'eu-central'],
  
  // Default
  'default': ['us-east', 'eu-west']
};

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  // Requests per minute by path prefix
  '/api/v1/auth': 30,
  '/api/v1/documents': 120,
  '/api/v1/ai': 60,
  'default': 240
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Parse request URL
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Get client IP and country
    const clientIp = request.headers.get('CF-Connecting-IP') || '';
    const clientCountry = request.headers.get('CF-IPCountry') || 'default';
    
    // Check if request should be cached
    const shouldCache = isCacheable(request, path);
    
    // Apply rate limiting
    const rateLimitResult = await checkRateLimit(request, env, path);
    if (!rateLimitResult.allowed) {
      return new Response('Rate limit exceeded', {
        status: 429,
        headers: {
          'Content-Type': 'text/plain',
          'Retry-After': '60'
        }
      });
    }
    
    // Determine appropriate region
    const region = determineRegion(clientCountry, request);
    
    // If caching is enabled, try to get from cache first
    if (shouldCache) {
      const cacheKey = generateCacheKey(request, region);
      const cachedResponse = await caches.default.match(cacheKey);
      
      if (cachedResponse) {
        // Add cache hit header
        const response = new Response(cachedResponse.body, cachedResponse);
        response.headers.set('X-Cache', 'HIT');
        response.headers.set('X-Cache-Region', region);
        return response;
      }
    }
    
    // Cache miss or no caching, forward to origin
    const regionEndpoint = REGIONAL_ENDPOINTS[region];
    const originUrl = new URL(url.pathname + url.search, regionEndpoint);
    
    // Clone the request with new URL
    const originRequest = new Request(originUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow'
    });
    
    // Add region info to request
    originRequest.headers.set('X-Forwarded-Region', region);
    
    // Forward request to origin
    let response;
    try {
      response = await fetch(originRequest);
    } catch (error) {
      // If primary region fails, try fallback region
      const fallbackRegion = getFallbackRegion(clientCountry);
      const fallbackEndpoint = REGIONAL_ENDPOINTS[fallbackRegion];
      const fallbackUrl = new URL(url.pathname + url.search, fallbackEndpoint);
      
      const fallbackRequest = new Request(fallbackUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'follow'
      });
      
      fallbackRequest.headers.set('X-Forwarded-Region', `${region}-failed-${fallbackRegion}`);
      response = await fetch(fallbackRequest);
    }
    
    // Clone the response so we can modify headers
    const newResponse = new Response(response.body, response);
    
    // Add security headers
    addSecurityHeaders(newResponse);
    
    // Add cache status header
    newResponse.headers.set('X-Cache', 'MISS');
    newResponse.headers.set('X-Cache-Region', region);
    
    // If response is cacheable, store in cache
    if (shouldCache && response.ok) {
      const ttl = getCacheTTL(path);
      if (ttl > 0) {
        const cacheKey = generateCacheKey(request, region);
        
        // Clone the response for caching
        const cacheResponse = new Response(response.body, response);
        
        // Set cache control headers
        cacheResponse.headers.set('Cache-Control', `public, max-age=${ttl}`);
        
        // Store in cache
        ctx.waitUntil(caches.default.put(cacheKey, cacheResponse));
      }
    }
    
    return newResponse;
  }
};

/**
 * Determine if a request should be cached
 */
function isCacheable(request: Request, path: string): boolean {
  // Only cache GET requests
  if (request.method !== 'GET') {
    return false;
  }
  
  // Don't cache authenticated requests with Authorization header
  if (request.headers.has('Authorization')) {
    return false;
  }
  
  // Don't cache paths with no TTL
  const ttl = getCacheTTL(path);
  if (ttl <= 0) {
    return false;
  }
  
  return true;
}

/**
 * Get cache TTL for a path
 */
function getCacheTTL(path: string): number {
  // Check for exact path match
  if (path in CACHE_TTL_CONFIG) {
    return CACHE_TTL_CONFIG[path];
  }
  
  // Check for path prefix match
  for (const [prefix, ttl] of Object.entries(CACHE_TTL_CONFIG)) {
    if (path.startsWith(prefix)) {
      return ttl;
    }
  }
  
  // Return default TTL
  return CACHE_TTL_CONFIG.default;
}

/**
 * Generate a cache key for a request
 */
function generateCacheKey(request: Request, region: string): Request {
  // Clone the request with a custom cache key in the URL
  const url = new URL(request.url);
  
  // Add region to cache key to ensure region-specific caching
  url.searchParams.set('__region', region);
  
  // Create a new request with the modified URL for cache key
  return new Request(url.toString(), {
    method: request.method,
    headers: request.headers
  });
}

/**
 * Determine the appropriate region for a request
 */
function determineRegion(countryCode: string, request: Request): string {
  // Check for region override in request
  const url = new URL(request.url);
  const regionOverride = url.searchParams.get('region');
  if (regionOverride && regionOverride in REGIONAL_ENDPOINTS) {
    return regionOverride;
  }
  
  // Check for region in cookie
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  if (cookies.region && cookies.region in REGIONAL_ENDPOINTS) {
    return cookies.region;
  }
  
  // Map country to region
  const regions = COUNTRY_TO_REGION[countryCode] || COUNTRY_TO_REGION.default;
  return regions[0]; // Return primary region
}

/**
 * Get fallback region for a country
 */
function getFallbackRegion(countryCode: string): string {
  const regions = COUNTRY_TO_REGION[countryCode] || COUNTRY_TO_REGION.default;
  return regions[1] || 'us-east'; // Return secondary region or default
}

/**
 * Parse cookies from Cookie header
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  if (!cookieHeader) {
    return cookies;
  }
  
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      cookies[key] = value;
    }
  });
  
  return cookies;
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: Response): void {
  // Security headers
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Remove potentially sensitive headers
  response.headers.delete('Server');
  response.headers.delete('X-Powered-By');
}

/**
 * Check rate limit for a request
 */
async function checkRateLimit(
  request: Request, 
  env: Env, 
  path: string
): Promise<{ allowed: boolean; limit: number; remaining: number }> {
  // Get client IP
  const clientIp = request.headers.get('CF-Connecting-IP') || '';
  
  // Determine rate limit based on path
  let rateLimit = RATE_LIMIT_CONFIG.default;
  
  for (const [prefix, limit] of Object.entries(RATE_LIMIT_CONFIG)) {
    if (path.startsWith(prefix)) {
      rateLimit = limit;
      break;
    }
  }
  
  // Generate rate limit key
  const rateLimitKey = `ratelimit:${clientIp}:${path.split('/').slice(0, 3).join('/')}`;
  
  // Check current count in KV store
  const currentCount = parseInt(await env.KV_STORE.get(rateLimitKey) || '0', 10);
  
  // Increment count
  const newCount = currentCount + 1;
  
  // Store updated count with 60-second expiration
  await env.KV_STORE.put(rateLimitKey, newCount.toString(), { expirationTtl: 60 });
  
  // Check if rate limit exceeded
  return {
    allowed: newCount <= rateLimit,
    limit: rateLimit,
    remaining: Math.max(0, rateLimit - newCount)
  };
}

// Environment interface
interface Env {
  KV_STORE: KVNamespace;
}