import { test, expect } from '@playwright/test';
import type { Browser, Page } from 'playwright';

// UAT Test Suite for ContextualIntelligence

let browser: Browser;
let page: Page;

// Setup before tests
test.beforeAll(async ({ browser: browserRef }) => {
  browser = browserRef;
});

// Setup before each test
test.beforeEach(async ({ page: pageRef }) => {
  page = pageRef;
  await page.goto('http://localhost:3000');
  // Wait for page to fully load
  await page.waitForLoadState('networkidle');
});

// UAT Test Cases

// 1. Basic Navigation
test('UAT-1: User can navigate to main sections of the application', async () => {
  // Dashboard should be visible
  await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
  
  // Navigate to Projects
  await page.click('a:has-text("Projects")');
  await expect(page.locator('h1:has-text("Projects")')).toBeVisible();
  
  // Navigate to Documents
  await page.click('a:has-text("Documents")');
  await expect(page.locator('h1:has-text("Documents")')).toBeVisible();
  
  // Navigate to Teams
  await page.click('a:has-text("Teams")');
  await expect(page.locator('h1:has-text("Teams")')).toBeVisible();
});

// 2. Notification System
test('UAT-2: Notification system works correctly', async () => {
  // Verify notification bell is visible
  await expect(page.locator('button:has([data-lucide="bell"])')).toBeVisible();
  
  // Click notification bell
  await page.click('button:has([data-lucide="bell"])');
  
  // Verify notification panel opens
  await expect(page.locator('div:has-text("Notifications")')).toBeVisible();
});

// 3. Search Functionality
test('UAT-3: Global search works correctly', async () => {
  // Find search input
  await page.click('#global-search');
  
  // Type search query
  await page.fill('#global-search', 'test');
  
  // Submit search
  await page.press('#global-search', 'Enter');
  
  // Verify we're on search results page
  await expect(page.url()).toContain('/search');
  await expect(page.locator('text=Search results')).toBeVisible();
});

// 4. User Settings
test('UAT-4: User can access and modify settings', async () => {
  // Navigate to settings
  await page.click('a:has-text("Settings")');
  
  // Verify settings page loaded
  await expect(page.locator('h1:has-text("Settings")')).toBeVisible();
  
  // Go to notification settings
  await page.click('button:has-text("Notifications")');
  
  // Toggle a setting
  const firstSwitch = page.locator('button[role="switch"]').first();
  const initialState = await firstSwitch.getAttribute('aria-checked');
  await firstSwitch.click();
  
  // Verify switch state changed
  await expect(firstSwitch).toHaveAttribute('aria-checked', initialState === 'true' ? 'false' : 'true');
});

// 5. Project Creation
test('UAT-5: User can create a new project', async () => {
  // Navigate to projects
  await page.click('a:has-text("Projects")');
  
  // Click create button
  await page.click('button:has-text("Create")');
  
  // Fill project details
  await page.fill('input[name="name"]', 'UAT Test Project');
  await page.fill('textarea[name="description"]', 'This is a test project for UAT');
  
  // Submit form
  await page.click('button:has-text("Create Project")');
  
  // Verify project was created
  await expect(page.locator('text=UAT Test Project')).toBeVisible();
});

// 6. Document Upload
test('UAT-6: User can upload a document', async () => {
  // Navigate to documents
  await page.click('a:has-text("Documents")');
  
  // Click upload button
  await page.click('button:has-text("Upload")');
  
  // Set file input
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'test-document.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('This is a test document for UAT testing')
  });
  
  // Submit upload
  await page.click('button:has-text("Upload Document")');
  
  // Verify document appears in list
  await expect(page.locator('text=test-document.txt')).toBeVisible();
});

// 7. Team Management
test('UAT-7: Team functionality works correctly', async () => {
  // Navigate to teams
  await page.click('a:has-text("Teams")');
  
  // Create new team
  await page.click('button:has-text("Create Team")');
  await page.fill('input[name="name"]', 'UAT Test Team');
  await page.fill('textarea[name="description"]', 'This is a test team for UAT');
  await page.click('button:has-text("Create")');
  
  // Verify team was created
  await expect(page.locator('text=UAT Test Team')).toBeVisible();
});

// 8. Analytics Dashboard
test('UAT-8: Analytics dashboard loads correctly', async () => {
  // Navigate to analytics
  await page.click('a:has-text("Analytics")');
  
  // Verify analytics page loaded
  await expect(page.locator('h1:has-text("Analytics")')).toBeVisible();
  
  // Check for charts
  await expect(page.locator('.recharts-responsive-container')).toBeVisible();
});

// 9. Help Documentation
test('UAT-9: Help system is accessible', async () => {
  // Click help icon
  await page.click('button:has([data-lucide="help-circle"])');
  
  // Verify help dialog opens
  await expect(page.locator('div:has-text("Help & Resources")')).toBeVisible();
});

// 10. Error Handling
test('UAT-10: Application handles errors gracefully', async () => {
  // Try to navigate to a non-existent page
  await page.goto('http://localhost:3000/non-existent-page');
  
  // Verify 404 page is shown
  await expect(page.locator('text=Page Not Found')).toBeVisible();
}); 