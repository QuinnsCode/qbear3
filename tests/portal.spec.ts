// tests/portal.spec.ts
// Main-domain portal: landing page sections + the /games and /apps hubs.
// Uses relative URLs (baseURL from playwright.config.ts) so it runs anywhere.
import { test, expect } from '@playwright/test';

const RUSTY_BUNS = 'https://github.com/QuinnsCode/RustyBuns';

test.describe('Portal', () => {
  test('landing page has products, game center, and app center sections', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);

    await expect(page.locator('section#products')).toBeVisible();
    await expect(page.locator('section#games')).toBeVisible();
    await expect(page.locator('section#apps')).toBeVisible();

    // Section links into the hubs
    await expect(page.locator('a.section-link[href="/games"]')).toBeVisible();
    await expect(page.locator('a.section-link[href="/apps"]')).toBeVisible();

    // RustyBuns is linked from the nav
    await expect(page.locator(`header a[href="${RUSTY_BUNS}"]`)).toBeVisible();
  });

  test('game center lists games and links back to the portal', async ({ page }) => {
    await page.goto('/games');
    await expect(page).toHaveURL(/\/games$/);
    await expect(page.getByRole('heading', { name: 'Sanctum' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sandbox' })).toBeVisible();
    await expect(page.locator('a.portal-card[href="/sanctum"]')).toBeVisible();
    await expect(page.locator('header a.nav-link.active')).toHaveText('Games');
  });

  test('app center lists apps including RustyBuns on GitHub', async ({ page }) => {
    await page.goto('/apps');
    await expect(page).toHaveURL(/\/apps$/);
    await expect(page.getByRole('heading', { name: 'RustyBuns' })).toBeVisible();
    await expect(page.locator(`a.portal-card[href="${RUSTY_BUNS}"]`)).toBeVisible();
    await expect(page.locator('a.portal-card[href="https://qlave.dev"]')).toBeVisible();
    await expect(page.locator('header a.nav-link.active')).toHaveText('Apps');
  });

  test('unknown paths still redirect home', async ({ page }) => {
    await page.goto('/definitely-not-a-route');
    await expect(page).toHaveURL(/\/$/);
  });
});
