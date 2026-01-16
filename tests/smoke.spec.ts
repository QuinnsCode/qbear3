// tests/smoke.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Subdomain Tests', () => {
  test('sandbox subdomain works', async ({ page }) => {
    // This actually resolves!
    await page.goto('http://sandbox.127.0.0.1.nip.io:5173/');
    
    expect(page.url()).toContain('sandbox');
  });

  test('org subdomain redirects to login', async ({ page }) => {
    await page.goto('http://testorg.127.0.0.1.nip.io:5173/sanctum');
    await expect(page).toHaveURL(/\/user\/login/);
  });
});