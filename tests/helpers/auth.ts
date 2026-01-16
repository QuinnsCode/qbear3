// tests/helpers/auth.ts
import { Page } from '@playwright/test';

export async function signUpUser(
    page: Page, 
    email: string, 
    password: string, 
    name: string,
    lairName: string,
    lairSubdomain: string
  ) {
    await page.goto('http://localhost:5173/user/signup');
    await page.waitForLoadState('networkidle');
    
    await page.getByRole('textbox', { name: 'Display Name' }).fill(name);
    await page.getByRole('textbox', { name: 'Email Address' }).fill(email);
    await page.getByRole('textbox', { name: 'Password', exact: true }).fill(password);
    await page.getByRole('textbox', { name: 'Confirm Password' }).fill(password);
    await page.getByRole('textbox', { name: 'Lair Name' }).fill(lairName);
    await page.getByRole('textbox', { name: 'Lair Subdomain' }).fill(lairSubdomain);
    
    await page.getByRole('button', { name: '🏕️ Free $0 ✓ • 1 active game' }).click();
    await page.getByText('I have read and agree to the').click();
    
    // This is exactly what worked in the debug test
    await page.locator('button[type="submit"]').click();
    
    // Wait a bit for navigation
    await page.waitForTimeout(2000);
}

export async function loginUser(page: Page, email: string, password: string) {
    await page.goto('http://localhost:5173/user/login');
    await page.waitForLoadState('networkidle');
    
    await page.getByRole('textbox', { name: /email/i }).fill(email);
    await page.getByRole('textbox', { name: /password/i }).fill(password);
    
    await page.locator('button[type="submit"]').click();
    
    await page.waitForTimeout(2000);
}

export async function createOrg(page: Page, slug: string, name: string) {
  await page.goto('http://localhost:5173/orgs/new');
  await page.waitForLoadState('networkidle');
  
  await page.getByRole('textbox', { name: /lair name/i }).fill(name);
  await page.getByRole('textbox', { name: /subdomain/i }).fill(slug);
  
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}