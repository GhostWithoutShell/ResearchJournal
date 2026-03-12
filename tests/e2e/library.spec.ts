import { test, expect } from '@playwright/test';

test('library page shows "Idea Library" title', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1.page-title')).toHaveText('Idea Library');
});

test('library page shows idea count in subtitle', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.page-subtitle')).toContainText('ideas tracked');
});

test('filter bar is present with status buttons', async ({ page }) => {
  await page.goto('/');
  const filtersBar = page.locator('.filters-bar');
  await expect(filtersBar).toBeVisible();
  await expect(filtersBar.getByRole('button', { name: 'all' })).toBeVisible();
  await expect(filtersBar.getByRole('button', { name: 'idea' })).toBeVisible();
  await expect(filtersBar.getByRole('button', { name: 'in-progress' })).toBeVisible();
  await expect(filtersBar.getByRole('button', { name: 'done' })).toBeVisible();
  await expect(filtersBar.getByRole('button', { name: 'killed' })).toBeVisible();
});

test('sort select is present', async ({ page }) => {
  await page.goto('/');
  const sortSelect = page.locator('.filters-bar select');
  await expect(sortSelect).toBeVisible();
  const options = sortSelect.locator('option');
  await expect(options).toHaveCount(4);
});

test('shows idea cards', async ({ page }) => {
  await page.goto('/');
  await page.locator('.idea-grid .card').first().waitFor({ timeout: 10000 });
  const count = await page.locator('.idea-grid .card').count();
  expect(count).toBeGreaterThanOrEqual(2);
});

test('cards have titles that are links', async ({ page }) => {
  await page.goto('/');
  await page.locator('.idea-grid .card').first().waitFor({ timeout: 10000 });
  const cards = page.locator('.idea-grid .card');
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(2);
  for (let i = 0; i < count; i++) {
    const titleLink = cards.nth(i).locator('.card-title a');
    await expect(titleLink).toBeVisible();
  }
});

test('cards show tags', async ({ page }) => {
  await page.goto('/');
  await page.locator('.idea-grid .card').first().waitFor({ timeout: 10000 });
  const tags = page.locator('.idea-grid .card .tag');
  await expect(tags.first()).toBeVisible();
});

test('clicking status filter "idea" still shows cards', async ({ page }) => {
  await page.goto('/');
  await page.locator('.filters-bar').getByRole('button', { name: 'idea' }).click();
  await page.locator('.idea-grid .card').first().waitFor({ timeout: 10000 });
  const count = await page.locator('.idea-grid .card').count();
  expect(count).toBeGreaterThanOrEqual(2);
});

test('sort select can be changed', async ({ page }) => {
  await page.goto('/');
  const sortSelect = page.locator('.filters-bar select');
  await sortSelect.selectOption('oldest');
  await expect(sortSelect).toHaveValue('oldest');
});

test('search bar is present', async ({ page }) => {
  await page.goto('/');
  const searchInput = page.locator('input[type="search"], input[placeholder*="earch"]');
  await expect(searchInput).toBeVisible();
});
