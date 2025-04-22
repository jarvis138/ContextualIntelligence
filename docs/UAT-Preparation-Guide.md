# UAT Preparation Guide for ContextualIntelligence

## Overview
This guide outlines the steps needed to prepare the ContextualIntelligence application for User Acceptance Testing (UAT). Follow these steps to ensure the application is properly configured and ready for testing.

## Prerequisites
- Node.js 16+ installed
- Git installed
- Access to the repository
- Windows, macOS, or Linux environment

## Step 1: Clone and Install

1. Clone the repository (if not already done):
   ```bash
   git clone <repository-url>
   cd ContextualIntelligence
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Step 2: Configure Environment Variables

1. Create a `.env` file in the root directory with the following variables:
   ```
   NODE_ENV=development
   DATABASE_URL=your_database_connection_string
   JWT_SECRET=your_jwt_secret
   PORT=3000
   ```

2. If using external services like OpenAI or Slack, add their API keys:
   ```
   OPENAI_API_KEY=your_openai_api_key
   SLACK_API_TOKEN=your_slack_token
   ```

## Step 3: Setup the Database

1. Set up your database (PostgreSQL recommended):
   ```bash
   npm run db:push
   ```

2. Verify the database setup:
   ```bash
   # Check that the database tables were created
   npm run check
   ```

## Step 4: Build for UAT

1. Build the application:
   ```bash
   npm run build
   ```

2. Verify the build was successful:
   ```bash
   # The dist directory should be created with built files
   ```

## Step 5: Run UAT Environment

1. Start the application in UAT mode:
   ```bash
   npm run dev
   ```

2. Verify the application is running by accessing:
   ```
   http://localhost:3000
   ```

## Step 6: Run Automated Tests

1. Install test browsers (for Playwright):
   ```bash
   npx playwright install
   ```

2. Run the UAT automated tests:
   ```bash
   npx playwright test
   ```

3. Review the test report:
   ```bash
   npx playwright show-report
   ```

## Step 7: Manual Testing Preparation

1. Set up test accounts:
   - Admin account
   - Regular user account
   - Read-only user account

2. Prepare test data:
   - Create sample projects
   - Upload test documents
   - Set up test teams

3. Document the current state:
   - Take screenshots of initial state
   - Document version numbers
   - Note any known issues

## UAT Environment Information

- **UAT URL**: http://localhost:3000
- **Admin Login**: admin / password (for testing only)
- **Regular User**: user / password (for testing only)
- **API Documentation**: http://localhost:3000/api-docs (if available)

## Known Limitations for UAT

- Email functionality may not work without proper SMTP configuration
- External integrations require valid API keys
- Some features may be mocked for testing purposes

## Support During UAT

If UAT testers encounter issues:

1. Log the issue with steps to reproduce
2. Include screenshots or screen recordings if possible
3. Note the browser and OS used
4. Contact the development team via [communication channel]

## Post-UAT Process

After UAT completion:

1. Review feedback
2. Prioritize issues
3. Fix critical bugs
4. Schedule regression testing
5. Prepare for production deployment

---

## Validation Checklist

Before starting UAT, ensure:

- [ ] Application builds successfully
- [ ] All automated tests pass
- [ ] Test data is populated
- [ ] Test accounts are created
- [ ] UAT environment is accessible
- [ ] Test plan document is available
- [ ] All UAT testers have access and credentials
- [ ] Feedback collection method is established

## Contact Information

For technical issues during UAT preparation:
- Technical Lead: [name] - [email]
- Project Manager: [name] - [email]