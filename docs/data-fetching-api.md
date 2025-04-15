# Data Fetching API Documentation

This document describes the API endpoints for the data fetching functionality of the CPI Hub.

## Table of Contents

1. [Authentication](#authentication)
2. [Connector Status](#connector-status)
3. [Tokens](#tokens)
4. [Jobs](#jobs)
5. [Data](#data)
6. [Error Handling](#error-handling)

## Authentication

All endpoints require authentication. The API uses JWT authentication via the Authorization header.

```
Authorization: Bearer <token>
```

## Connector Status

### Get Connector Status

Returns the authentication status for all connectors for the current user.

**Endpoint:**
```
GET /api/data-fetching/connectors/status
```

**Response:**
```json
{
  "connectors": [
    {
      "connectorType": "google_drive",
      "connected": true
    },
    {
      "connectorType": "slack",
      "connected": false
    },
    {
      "connectorType": "gmail",
      "connected": true
    },
    {
      "connectorType": "microsoft_graph",
      "connected": false
    }
  ]
}
```

## Tokens

### Save Token

Save an API token for a connector.

**Endpoint:**
```
POST /api/data-fetching/connectors/token
```

**Request Body:**
```json
{
  "connectorType": "google_drive",
  "accessToken": "ya29.a0...",
  "refreshToken": "1//04d...",
  "expiresAt": 1617123456789,
  "scope": "https://www.googleapis.com/auth/drive.readonly"
}
```

**Response:**
```json
{
  "success": true
}
```

### Delete Token

Delete an API token for a connector.

**Endpoint:**
```
DELETE /api/data-fetching/connectors/token
```

**Request Body:**
```json
{
  "connectorType": "google_drive"
}
```

**Response:**
```json
{
  "success": true
}
```

## Jobs

### Schedule a Job

Schedule a data fetching job.

**Endpoint:**
```
POST /api/data-fetching/jobs
```

**Request Body:**
```json
{
  "connectorType": "google_drive",
  "dataType": "files",
  "parameters": {
    "pageSize": 100,
    "q": "mimeType='application/pdf'"
  },
  "scheduleType": "cron",
  "scheduleValue": "0 0 * * *",
  "priority": "normal"
}
```

**Response:**
```json
{
  "job": {
    "id": 1,
    "jobId": "job_123456",
    "userId": 1,
    "connectorType": "google_drive",
    "dataType": "files",
    "parameters": {
      "pageSize": 100,
      "q": "mimeType='application/pdf'"
    },
    "scheduleType": "cron",
    "scheduleValue": "0 0 * * *",
    "priority": "normal",
    "status": "scheduled",
    "lastRunAt": null,
    "nextRunAt": "2025-04-16T00:00:00.000Z",
    "lastResult": null,
    "lastError": null,
    "runCount": 0,
    "createdAt": "2025-04-15T18:30:00.000Z",
    "updatedAt": "2025-04-15T18:30:00.000Z"
  }
}
```

### Get All Jobs

Get all jobs for the current user.

**Endpoint:**
```
GET /api/data-fetching/jobs
```

**Response:**
```json
{
  "jobs": [
    {
      "id": 1,
      "jobId": "job_123456",
      "userId": 1,
      "connectorType": "google_drive",
      "dataType": "files",
      "parameters": {
        "pageSize": 100,
        "q": "mimeType='application/pdf'"
      },
      "scheduleType": "cron",
      "scheduleValue": "0 0 * * *",
      "priority": "normal",
      "status": "scheduled",
      "lastRunAt": null,
      "nextRunAt": "2025-04-16T00:00:00.000Z",
      "lastResult": null,
      "lastError": null,
      "runCount": 0,
      "createdAt": "2025-04-15T18:30:00.000Z",
      "updatedAt": "2025-04-15T18:30:00.000Z"
    }
  ]
}
```

### Get Job

Get a specific job.

**Endpoint:**
```
GET /api/data-fetching/jobs/:id
```

**Response:**
```json
{
  "job": {
    "id": 1,
    "jobId": "job_123456",
    "userId": 1,
    "connectorType": "google_drive",
    "dataType": "files",
    "parameters": {
      "pageSize": 100,
      "q": "mimeType='application/pdf'"
    },
    "scheduleType": "cron",
    "scheduleValue": "0 0 * * *",
    "priority": "normal",
    "status": "scheduled",
    "lastRunAt": null,
    "nextRunAt": "2025-04-16T00:00:00.000Z",
    "lastResult": null,
    "lastError": null,
    "runCount": 0,
    "createdAt": "2025-04-15T18:30:00.000Z",
    "updatedAt": "2025-04-15T18:30:00.000Z"
  }
}
```

### Cancel Job

Cancel a scheduled job.

**Endpoint:**
```
DELETE /api/data-fetching/jobs/:id
```

**Response:**
```json
{
  "success": true
}
```

### Run Job

Run a job immediately.

**Endpoint:**
```
POST /api/data-fetching/jobs/:id/run
```

**Response:**
```json
{
  "success": true,
  "message": "Job execution started"
}
```

### Setup Full Sync

Set up a full sync schedule for all connected data sources.

**Endpoint:**
```
POST /api/data-fetching/full-sync
```

**Response:**
```json
{
  "jobs": [
    {
      "id": 1,
      "jobId": "job_123456",
      "userId": 1,
      "connectorType": "google_drive",
      "dataType": "files",
      "parameters": {
        "pageSize": 100
      },
      "scheduleType": "cron",
      "scheduleValue": "0 2 * * *",
      "priority": "normal",
      "status": "scheduled",
      "lastRunAt": null,
      "nextRunAt": "2025-04-16T02:00:00.000Z",
      "lastResult": null,
      "lastError": null,
      "runCount": 0,
      "createdAt": "2025-04-15T18:30:00.000Z",
      "updatedAt": "2025-04-15T18:30:00.000Z"
    },
    // Other jobs for different connectors
  ]
}
```

## Data

### Get Data

Get fetched data for a connector and data type.

**Endpoint:**
```
GET /api/data-fetching/data
```

**Query Parameters:**
- `connectorType`: The connector type (e.g., google_drive, slack, gmail, microsoft_graph)
- `dataType`: The data type (e.g., files, conversations, messages)
- `filter`: JSON stringified object with filter parameters
- `limit`: Maximum number of results to return (default: 20, max: 100)
- `offset`: Offset for pagination (default: 0)
- `sort`: Field to sort by (default: updated_at)
- `sortDirection`: Sort direction (asc or desc, default: desc)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "dataId": "data_123456",
      "userId": 1,
      "jobId": "job_123456",
      "connectorType": "google_drive",
      "dataType": "files",
      "title": "Project Plan.pdf",
      "content": "...",
      "metadata": {
        "mimeType": "application/pdf",
        "size": 1234567
      },
      "sourceUrl": "https://drive.google.com/file/d/abc123/view",
      "sourceId": "abc123",
      "createdAt": "2025-04-15T18:30:00.000Z",
      "updatedAt": "2025-04-15T18:30:00.000Z",
      "fetchedAt": "2025-04-15T18:30:00.000Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 1
  }
}
```

### Get Data by ID

Get a specific data item.

**Endpoint:**
```
GET /api/data-fetching/data/:id
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "dataId": "data_123456",
    "userId": 1,
    "jobId": "job_123456",
    "connectorType": "google_drive",
    "dataType": "files",
    "title": "Project Plan.pdf",
    "content": "...",
    "metadata": {
      "mimeType": "application/pdf",
      "size": 1234567
    },
    "sourceUrl": "https://drive.google.com/file/d/abc123/view",
    "sourceId": "abc123",
    "createdAt": "2025-04-15T18:30:00.000Z",
    "updatedAt": "2025-04-15T18:30:00.000Z",
    "fetchedAt": "2025-04-15T18:30:00.000Z"
  }
}
```

### Search Data

Search fetched data.

**Endpoint:**
```
GET /api/data-fetching/data/search
```

**Query Parameters:**
- `query`: The search query
- `connectorTypes`: JSON stringified array of connector types to search in
- `dataTypes`: JSON stringified array of data types to search in
- `limit`: Maximum number of results to return (default: 20, max: 100)
- `offset`: Offset for pagination (default: 0)

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "dataId": "data_123456",
      "userId": 1,
      "jobId": "job_123456",
      "connectorType": "google_drive",
      "dataType": "files",
      "title": "Project Plan.pdf",
      "content": "...",
      "metadata": {
        "mimeType": "application/pdf",
        "size": 1234567
      },
      "sourceUrl": "https://drive.google.com/file/d/abc123/view",
      "sourceId": "abc123",
      "createdAt": "2025-04-15T18:30:00.000Z",
      "updatedAt": "2025-04-15T18:30:00.000Z",
      "fetchedAt": "2025-04-15T18:30:00.000Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 1
  }
}
```

### Delete Data

Delete a specific data item.

**Endpoint:**
```
DELETE /api/data-fetching/data/:id
```

**Response:**
```json
{
  "success": true
}
```

## Error Handling

The API uses standard HTTP status codes for error responses:

- `400 Bad Request`: The request was invalid or contains malformed parameters.
- `401 Unauthorized`: Authentication failed or token is missing/invalid.
- `403 Forbidden`: The authenticated user doesn't have permission to access the requested resource.
- `404 Not Found`: The requested resource was not found.
- `500 Internal Server Error`: An error occurred on the server.

Error responses include a JSON object with error details:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Detailed error message"
  }
}
```

Common error codes:

- `INVALID_REQUEST`: The request body or parameters are invalid.
- `INVALID_TOKEN`: The OAuth token is invalid or expired.
- `JOB_NOT_FOUND`: The requested job was not found.
- `DATA_NOT_FOUND`: The requested data item was not found.
- `CANCEL_FAILED`: The job could not be cancelled.
- `EXECUTION_FAILED`: The job could not be executed.
- `SERVER_ERROR`: An internal server error occurred.