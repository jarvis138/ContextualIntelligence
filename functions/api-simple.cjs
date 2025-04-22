// Enhanced Netlify function with better path handling
exports.handler = async function(event, context) {
  // Set CORS headers for all responses
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  // Handle OPTIONS requests for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Get the path from the event, handling both direct and redirected paths
  let path = event.path;
  
  // Handle both direct function calls and redirected paths
  if (path.includes('/.netlify/functions/api-simple')) {
    path = path.replace('/.netlify/functions/api-simple', '');
  } else if (path.includes('/api')) {
    path = path.replace('/api', '');
  }
  
  // Normalize path to ensure consistent handling
  if (path === '') path = '/';
  
  console.log(`Processing request: ${event.httpMethod} ${path}`);
  console.log(`Original path: ${event.path}`);
  
  // Handle different paths
  if (path === '/') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        routes: [
          '/api',
          '/api/health',
          '/api/projects'
        ],
        directRoutes: [
          '/.netlify/functions/api-simple',
          '/.netlify/functions/api-simple/health',
          '/.netlify/functions/api-simple/projects'
        ]
      })
    };
  }
  
  if (path === '/health') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'ok',
        message: 'API is healthy',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      })
    };
  }
  
  if (path === '/projects') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        projects: [
          { id: 1, name: 'Project 1', status: 'Active', lastUpdated: '2025-04-20' },
          { id: 2, name: 'Project 2', status: 'Completed', lastUpdated: '2025-04-15' },
          { id: 3, name: 'Project 3', status: 'Planning', lastUpdated: '2025-04-22' }
        ],
        timestamp: new Date().toISOString()
      })
    };
  }
  
  // Not found
  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({
      error: 'Not Found',
      path: path,
      requestPath: event.path,
      method: event.httpMethod,
      message: `The requested endpoint '${path}' does not exist.`
    })
  };
};