// Netlify serverless function to handle API requests
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');

// Create an Express app
const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());

// Base path handling for Netlify Functions
const router = express.Router();
app.use('/', router);

// Define API routes
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// Add your API routes here
router.get('/projects', (req, res) => {
  // This is a mock response - in a real app, you would fetch data from a database
  res.json({
    projects: [
      { id: 1, name: 'Project 1', status: 'Active' },
      { id: 2, name: 'Project 2', status: 'Completed' },
      { id: 3, name: 'Project 3', status: 'Planning' }
    ],
    timestamp: new Date().toISOString()
  });
});

// Debug route to show environment
router.get('/', (req, res) => {
  res.json({
    message: 'API function is running',
    environment: process.env.NODE_ENV || 'development',
    netlifyContext: process.env.CONTEXT || 'unknown',
    timestamp: new Date().toISOString(),
    routes: [
      '/.netlify/functions/api',
      '/.netlify/functions/api/health',
      '/.netlify/functions/api/projects'
    ]
  });
});

// Not found handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.path,
    method: req.method,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message
  });
});

// Export the serverless function
module.exports.handler = serverless(app, {
  binary: false,
  request: (req, event, context) => {
    // Log request details for debugging
    console.log(`Request: ${req.method} ${req.path}`);
    console.log(`Original URL: ${req.originalUrl}`);
    console.log(`Base URL: ${req.baseUrl}`);
    
    // Add the event and context to the request
    req.netlifyEvent = event;
    req.netlifyContext = context;
  }
});