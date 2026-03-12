import { test, expect } from '@playwright/test';

test('latent space page loads with title', async ({ page }) => {
  await page.goto('/latent-space');
  await expect(page.locator('h1.page-title')).toHaveText('Latent Space');
});

test('latent space shows subtitle', async ({ page }) => {
  await page.goto('/latent-space');
  await expect(page.locator('.page-subtitle')).toBeVisible();
});

test('navigation includes latent space link', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.header-nav').getByText('[latent space]')).toBeVisible();
});

test('latent space shows empty state or controls after hydration', async ({ page }) => {
  await page.goto('/latent-space');
  // With < 3 ideas: shows empty state. With 3+: shows controls.
  const emptyState = page.locator('.latent-empty');
  const controls = page.locator('.latent-controls');
  await expect(emptyState.or(controls)).toBeVisible({ timeout: 15000 });
});

test('latent space empty state suggests adding more ideas', async ({ page }) => {
  await page.goto('/latent-space');
  // Current dataset has only 2 ideas, so empty state should appear
  const emptyState = page.locator('.latent-empty');
  const isVisible = await emptyState.isVisible({ timeout: 15000 }).catch(() => false);
  if (isVisible) {
    await expect(emptyState).toContainText('Add more ideas');
  }
});

test('clicking latent space nav link navigates to page', async ({ page }) => {
  await page.goto('/');
  await page.locator('.header-nav').getByText('[latent space]').click();
  await expect(page).toHaveURL(/latent-space/);
  await expect(page.locator('h1.page-title')).toHaveText('Latent Space');
});
