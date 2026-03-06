import { test, expect } from '@playwright/test';

test('Lab page loads with title "Genetics Lab"', async ({ page }) => {
  await page.goto('/lab');
  await expect(page.locator('h1.page-title')).toHaveText('Genetics Lab');
});

test('Shows subtitle about cross-breeding', async ({ page }) => {
  await page.goto('/lab');
  await expect(page.getByText('Cross-breed ideas', { exact: false })).toBeVisible({ timeout: 10000 });
});

test('Shows two parent selectors', async ({ page }) => {
  await page.goto('/lab');
  await expect(page.getByText('parent a', { exact: false })).toBeVisible();
  await expect(page.getByText('parent b', { exact: false })).toBeVisible();
});

test('Shows empty state message when no parents selected', async ({ page }) => {
  await page.goto('/lab');
  await expect(
    page.getByText('Select two parent ideas above to start breeding.')
  ).toBeVisible();
});

test('Parent selectors have filter inputs', async ({ page }) => {
  await page.goto('/lab');
  await page.getByText('parent a', { exact: false }).waitFor({ timeout: 10000 });
  const filterInputs = page.locator('input.form-input[placeholder*="Filter"]');
  await expect(filterInputs).toHaveCount(2);
});
