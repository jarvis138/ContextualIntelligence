# Deploying to Netlify

This document provides instructions for deploying the ContextualIntelligence application to Netlify.

## Prerequisites

- A Netlify account
- Git repository with your code

## Deployment Steps

### Option 1: Deploy via Netlify UI

1. Log in to your Netlify account
2. Click "New site from Git"
3. Connect to your Git provider (GitHub, GitLab, or Bitbucket)
4. Select your repository
5. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist/public`
6. Click "Deploy site"

### Option 2: Deploy via Netlify CLI

1. Install Netlify CLI globally:
   ```
   npm install -g netlify-cli
   ```

2. Log in to Netlify:
   ```
   netlify login
   ```

3. Initialize your site:
   ```
   netlify init
   ```

4. Deploy your site:
   ```
   netlify deploy --prod
   ```

## Environment Variables

Set the following environment variables in Netlify:

- `DATABASE_URL`: Your database connection string
- Any other environment variables your application needs

## Testing Locally

To test your Netlify deployment locally:

```
npm install
npm run netlify:dev
```

This will start a local development server that mimics the Netlify production environment.

## Troubleshooting

- If you encounter build errors, check the build logs in the Netlify dashboard
- Make sure all dependencies are correctly listed in package.json
- Verify that your netlify.toml file is correctly configured