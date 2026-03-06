import { test, expect } from '@playwright/test';

test.describe('Add Idea page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/add');
  });

  test('page loads with form elements', async ({ page }) => {
    await expect(page.locator('h1.page-title')).toContainText('> new idea_');
    await expect(page.locator('#title')).toBeVisible();
    await expect(page.locator('#description')).toBeVisible();
    await expect(page.locator('#status')).toBeVisible();
    await expect(page.locator('#tags')).toBeVisible();
    await expect(page.getByRole('button', { name: '> save draft' })).toBeVisible();
  });

  test('form fields are initially empty', async ({ page }) => {
    await expect(page.locator('#title')).toHaveValue('');
    await expect(page.locator('#description')).toHaveValue('');
    await expect(page.locator('#tags')).toHaveValue('');
  });

  test('status select defaults to "idea"', async ({ page }) => {
    await expect(page.locator('#status')).toHaveValue('idea');
  });

  test('cancel link navigates back to home', async ({ page }) => {
    await page.getByRole('link', { name: /cancel/i }).click();
    await expect(page).toHaveURL('/');
  });

  test('submit button is present and shows "> save draft"', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: '> save draft' });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveText('> save draft');
  });

  test('form has required validation on title and description', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: '> save draft' });
    await submitButton.click();

    const titleInput = page.locator('#title');
    const descriptionInput = page.locator('#description');

    await expect(titleInput).toHaveAttribute('required', '');
    await expect(descriptionInput).toHaveAttribute('required', '');
  });

  test('can fill in all form fields', async ({ page }) => {
    await page.locator('#title').waitFor({ state: 'visible' });
    await page.locator('#title').click();
    await page.locator('#title').pressSequentially('Test Idea Title');
    await page.locator('#description').click();
    await page.locator('#description').pressSequentially('A detailed description.');
    await page.locator('#status').selectOption('in-progress');
    await page.locator('#tags').click();
    await page.locator('#tags').pressSequentially('audio, ML');

    await expect(page.locator('#title')).toHaveValue('Test Idea Title');
    await expect(page.locator('#description')).toHaveValue('A detailed description.');
    await expect(page.locator('#status')).toHaveValue('in-progress');
    await expect(page.locator('#tags')).toHaveValue('audio, ML');
  });

  test('status select has all 4 options', async ({ page }) => {
    const options = page.locator('#status option');
    await expect(options).toHaveCount(4);
    await expect(options.nth(0)).toHaveText('idea');
    await expect(options.nth(1)).toHaveText('in-progress');
    await expect(options.nth(2)).toHaveText('done');
    await expect(options.nth(3)).toHaveText('killed');
  });
});
