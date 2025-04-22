// Simple Netlify function
exports.handler = async function(event, context) {
  // Get the path from the event
  const path = event.path.replace('/.netlify/functions/api-simple', '');
  
  // Handle different paths
  if (path === '' || path === '/') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'API is running',
        timestamp: new Date().toISOString(),
        routes: [
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
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'ok',
        message: 'API is healthy',
        timestamp: new Date().toISOString()
      })
    };
  }
  
  if (path === '/projects') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projects: [
          { id: 1, name: 'Project 1', status: 'Active' },
          { id: 2, name: 'Project 2', status: 'Completed' },
          { id: 3, name: 'Project 3', status: 'Planning' }
        ],
        timestamp: new Date().toISOString()
      })
    };
  }
  
  // Not found
  return {
    statusCode: 404,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      error: 'Not Found',
      path: path,
      requestPath: event.path,
      method: event.httpMethod
    })
  };
};