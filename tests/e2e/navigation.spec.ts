import { test, expect } from '@playwright/test';

test('navigate to graph page', async ({ page }) => {
  await page.goto('/');
  await page.click('.header-nav >> text=[graph]');
  await expect(page).toHaveURL('/graph');
  await expect(page.locator('.page-title')).toContainText('Idea Graph');
});

test('navigate to add idea page', async ({ page }) => {
  await page.goto('/');
  await page.click('.header-nav >> text=[+ add]');
  await expect(page).toHaveURL('/add');
  await expect(page.locator('.page-title')).toContainText('new idea');
});

test('logo navigates back to home', async ({ page }) => {
  await page.goto('/graph');
  await page.click('.header-title');
  await expect(page).toHaveURL('/');
});
