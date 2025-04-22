# ContextualIntelligence - UAT Testing

Thank you for participating in User Acceptance Testing for ContextualIntelligence! This document provides instructions for setting up and testing the application.

## Quick Start

### Windows Users
1. Double-click the `start-uat.bat` file to start the application
2. The application will be available at http://localhost:3000

### macOS/Linux Users
1. Open Terminal
2. Navigate to the project directory: `cd path/to/ContextualIntelligence`
3. Run: `npm run uat`
4. The application will be available at http://localhost:3000

## Test User Accounts

Use these accounts for testing:

| Username | Password | Role       |
|----------|----------|------------|
| admin    | password | Admin      |
| user     | password | Regular    |
| viewer   | password | Read-only  |

## Testing Instructions

1. Follow the [UAT-Manual-TestPlan.md](docs/UAT-Manual-TestPlan.md) document to perform manual testing
2. Record any issues or feedback using the provided feedback form
3. Take screenshots of any issues encountered

## Application Features

The ContextualIntelligence application includes:

- Dashboard with insights and analytics
- Project management
- Document management
- Team collaboration
- Analytics and reporting
- Task management
- Knowledge graph visualization
- User settings and preferences
- Notification system
- Search functionality

## Key Areas for Testing

Please pay special attention to:

1. **Navigation** - Is the application intuitive to navigate?
2. **Search** - Does search return relevant results?
3. **Notifications** - Are notifications displayed correctly?
4. **User Interface** - Is the UI consistent and responsive?
5. **Data Integrity** - Is information saved correctly?
6. **Performance** - Does the application respond quickly?

## Reporting Issues

When reporting issues, please include:

1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Screenshots if applicable
5. Browser and OS used

## Helpful Tips

- The application supports keyboard shortcuts (press `?` to view)
- Use `Ctrl+K` or `Cmd+K` to access global search
- The sidebar can be collapsed for more workspace
- Most tables can be sorted by clicking column headers
- Dashboard widgets can be rearranged

## Technical Support

If you encounter technical issues during testing:

- Email: support@contextualintelligence.com
- Slack: #uat-support channel

Thank you for helping improve ContextualIntelligence! 