// tests/debug-signup-submit.spec.ts
import { test } from '@playwright/test';

test('debug signup submission', async ({ page }) => {
  const timestamp = Date.now();
  
  await page.goto('http://localhost:5173/user/signup');
  await page.waitForLoadState('networkidle');
  
  // Fill form
  await page.getByRole('textbox', { name: 'Display Name' }).fill('Test User');
  await page.getByRole('textbox', { name: 'Email Address' }).fill(`test-${timestamp}@example.com`);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('TestPassword123!');
  await page.getByRole('textbox', { name: 'Confirm Password' }).fill('TestPassword123!');
  await page.getByRole('textbox', { name: 'Lair Name' }).fill('Test Lair');
  await page.getByRole('textbox', { name: 'Lair Subdomain' }).fill(`testorg${timestamp}`);
  
  // Select plan
  await page.getByRole('button', { name: '🏕️ Free $0 ✓ • 1 active game' }).click();
  
  // Accept terms
  await page.getByText('I have read and agree to the').click();
  
  // Take screenshot before submit
  await page.screenshot({ path: 'before-submit.png', fullPage: true });
  
  // Log all buttons
  const buttons = await page.locator('button').all();
  console.log('Found', buttons.length, 'buttons');
  for (let i = 0; i < buttons.length; i++) {
    const text = await buttons[i].textContent();
    const type = await buttons[i].getAttribute('type');
    const disabled = await buttons[i].isDisabled();
    console.log(`Button ${i}: text="${text}", type="${type}", disabled=${disabled}`);
  }
  
  // Try to click submit
  console.log('Attempting to click submit button...');
  const submitButton = page.locator('button[type="submit"]');
  const count = await submitButton.count();
  console.log('Submit buttons found:', count);
  
  if (count > 0) {
    await submitButton.click();
    console.log('Clicked submit button');
    
    // Wait a bit
    await page.waitForTimeout(2000);
    
    // Take screenshot after submit
    await page.screenshot({ path: 'after-submit.png', fullPage: true });
    
    console.log('Final URL:', page.url());
  } else {
    console.log('NO SUBMIT BUTTON FOUND!');
  }
});