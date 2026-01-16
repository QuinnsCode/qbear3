// tests/helpers/turnstile.ts
import { Page } from '@playwright/test';

export async function bypassTurnstile(page: Page) {
  await page.addInitScript(() => {
    // Mock turnstile
    (window as any).turnstile = {
      render: () => 'mock-widget-id',
      getResponse: () => 'mock-token-for-testing',
      reset: () => {},
      remove: () => {},
    };
  });
}

// Use in tests:
await bypassTurnstile(page);
await page.goto('http://localhost:5173/user/signup');