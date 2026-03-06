import { test, expect } from '@playwright/test';

test('home page loads and shows header', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.header-title')).toContainText('RESEARCH JOURNAL');
});

test('home page has navigation links', async ({ page }) => {
  await page.goto('/');
  const nav = page.locator('.header-nav');
  await expect(nav.getByText('[library]')).toBeVisible();
  await expect(nav.getByText('[+ add]')).toBeVisible();
  await expect(nav.getByText('[lab]')).toBeVisible();
  await expect(nav.getByText('[graph]')).toBeVisible();
});

test('home page renders idea library', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Research Journal/);
});
