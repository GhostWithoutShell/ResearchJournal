import { test, expect } from '@playwright/test';

test('graph page loads with title', async ({ page }) => {
  await page.goto('/graph');
  await expect(page.locator('h1.page-title')).toHaveText('Idea Graph');
});

test('graph page shows subtitle', async ({ page }) => {
  await page.goto('/graph');
  await expect(page.locator('.page-subtitle')).toBeVisible();
});

test('graph container is present', async ({ page }) => {
  await page.goto('/graph');
  await expect(page.locator('.graph-container')).toBeVisible();
});

test('SVG element is rendered inside graph container', async ({ page }) => {
  await page.goto('/graph');
  const svg = page.locator('.graph-container svg');
  await expect(svg).toBeVisible({ timeout: 10000 });
});
