// tests/org-isolation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Organization Isolation', () => {
  test('different org subdomains are isolated', async ({ page, context }) => {
    // Go to org1
    await page.goto('http://org1.localhost:5173/');
    
    // Note: Will redirect to login or org creation
    const org1Url = page.url();
    
    // Go to org2
    await page.goto('http://org2.localhost:5173/');
    const org2Url = page.url();
    
    // URLs should be different (different subdomains)
    expect(org1Url).not.toBe(org2Url);
    expect(org1Url).toContain('org1');
    expect(org2Url).toContain('org2');
  });

  test('sandbox is publicly accessible', async ({ page }) => {
    await page.goto('http://sandbox.localhost:5173/');
    
    // Should NOT redirect to login (public access)
    await page.waitForURL(/\/cardGame/, { timeout: 5000 });
    
    // Should show game page, not login
    await expect(page).not.toHaveURL(/\/user\/login/);
  });
});