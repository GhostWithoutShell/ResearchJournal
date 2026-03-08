import { test, expect } from '@playwright/test';

const IDEAS = [
  {
    id: 'idea-2026-03-05-rec-audit',
    title: 'Reverse Engineering Recommendation Algorithms',
    status: 'idea',
    tags: ['algorithmic-transparency', 'inverse-modeling', 'embeddings', 'recommendation-systems', 'AI-governance'],
  },
  {
    id: 'idea-2026-03-05-kan-ambient',
    title: 'KAN Models for City Ambient Sound Analysis',
    status: 'idea',
    tags: ['KAN', 'audio', 'urban-acoustics', 'interpretable-ML', 'audio-generation', 'research'],
  },
];

test.describe('Idea Detail Page', () => {
  const idea = IDEAS[0];

  test('loads with correct title', async ({ page }) => {
    await page.goto(`/idea/${idea.id}`);
    const title = page.locator('.idea-detail-title');
    await expect(title).toBeVisible();
    await expect(title).toHaveText(idea.title);
  });

  test('shows status badge', async ({ page }) => {
    await page.goto(`/idea/${idea.id}`);
    const badge = page.locator('.badge');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(idea.status);
  });

  test('shows tags', async ({ page }) => {
    await page.goto(`/idea/${idea.id}`);
    const tags = page.locator('.tag');
    await expect(tags).toHaveCount(idea.tags.length);
    for (const tagText of idea.tags) {
      await expect(page.locator('.tag', { hasText: tagText })).toBeVisible();
    }
  });

  test('shows description text', async ({ page }) => {
    await page.goto(`/idea/${idea.id}`);
    const descriptionHeading = page.locator('h3', { hasText: 'Description' });
    await expect(descriptionHeading).toBeVisible();
    const description = page.locator('.idea-detail-description');
    await expect(description).toBeVisible();
    await expect(description).not.toBeEmpty();
  });

  test('has back to library link that navigates to home', async ({ page }) => {
    await page.goto(`/idea/${idea.id}`);
    const backLink = page.locator('a.btn.btn--ghost', { hasText: 'back to library' }).first();
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL('/');
  });

  test('shows DNA fingerprint', async ({ page }) => {
    await page.goto(`/idea/${idea.id}`);
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('shows Connections section', async ({ page }) => {
    await page.goto(`/idea/${idea.id}`);
    const connectionsHeading = page.locator('h3', { hasText: 'Connections' });
    await expect(connectionsHeading).toBeVisible();
  });

  test('second idea page also loads correctly', async ({ page }) => {
    const secondIdea = IDEAS[1];
    await page.goto(`/idea/${secondIdea.id}`);

    const title = page.locator('.idea-detail-title');
    await expect(title).toBeVisible();
    await expect(title).toHaveText(secondIdea.title);

    const badge = page.locator('.badge').first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(secondIdea.status);

    const tags = page.locator('.tag');
    await expect(tags).toHaveCount(secondIdea.tags.length);

    const findSimilarHeading = page.locator('h3', { hasText: 'Find Similar' });
    await expect(findSimilarHeading).toBeVisible();
  });
});
