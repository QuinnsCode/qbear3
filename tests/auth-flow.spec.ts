// tests/auth-flow.spec.ts
import { test, expect } from '@playwright/test';
import { signUpUser, loginUser } from './helpers/auth';

test.describe('Authentication Flow', () => {
  
  test('user can sign up with org', async ({ page }) => {
    const timestamp = Date.now();
    const email = `test-${timestamp}@example.com`;
    const orgSlug = `testorg${timestamp}`;
    
    await signUpUser(
      page, 
      email, 
      'TestPassword123!',
      'Test User',
      'Test Lair',
      orgSlug
    );
    
    // After signup, should be on the org subdomain at /sanctum
    await page.waitForTimeout(1000); // Small wait for navigation
    
    const finalUrl = page.url();
    console.log('After signup, at:', finalUrl);
    
    // Should be on org subdomain
    expect(finalUrl).toContain(`${orgSlug}.localhost`);
    expect(finalUrl).toContain('/sanctum');
  });

  test('user can login after signup', async ({ page }) => {
    const timestamp = Date.now();
    const email = `test-${timestamp}@example.com`;
    const password = 'TestPassword123!';
    const orgSlug = `testorg${timestamp}`;
    
    // First signup - creates account and org
    await signUpUser(
      page,
      email,
      password,
      'Test User',
      'Test Lair',
      orgSlug
    );
    
    // Should already be logged in and on org subdomain
    expect(page.url()).toContain(`${orgSlug}.localhost`);
    
    // Logout
    await page.goto('http://localhost:5173/user/logout');
    
    // Login again
    await loginUser(page, email, password);
    
    // Navigate to the org
    await page.goto(`http://${orgSlug}.localhost:5173/sanctum`);
    
    // Should be able to access it
    await expect(page).not.toHaveURL(/\/user\/login/);
    expect(page.url()).toContain('sanctum');
  });

  test('non-member cannot access org', async ({ page, browser }) => {
    const timestamp = Date.now();
    
    // User 1 creates org
    const user1Email = `user1-${timestamp}@example.com`;
    const orgSlug = `org${timestamp}`;
    
    await signUpUser(
      page,
      user1Email,
      'TestPassword123!',
      'User One',
      'Private Lair',
      orgSlug
    );
    
    expect(page.url()).toContain(`${orgSlug}.localhost`);
    
    // User 2 creates their own org
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    
    const user2Email = `user2-${timestamp}@example.com`;
    const user2OrgSlug = `org2${timestamp}`;
    
    await signUpUser(
      page2,
      user2Email,
      'TestPassword123!',
      'User Two',
      'Another Lair',
      user2OrgSlug
    );
    
    // User 2 tries to access User 1's org
    await page2.goto(`http://${orgSlug}.localhost:5173/sanctum`);
    await page2.waitForLoadState('networkidle');
    
    const finalUrl = page2.url();
    console.log('User 2 trying to access User 1 org, landed at:', finalUrl);
    
    // Check if they were blocked (should redirect to login or no-access)
    // OR if they can access it (which would be a security bug)
    if (finalUrl.includes('/sanctum') && finalUrl.includes(`${orgSlug}.localhost`)) {
      console.warn('⚠️  SECURITY ISSUE: User 2 can access User 1 org!');
      throw new Error('Authorization bug: Non-member can access private org');
    }
    
    // Should be redirected away
    expect(finalUrl).toMatch(/\/(user\/login|no-access|orgs\/new)/);
    
    await context2.close();
  });
});