import { expect, test } from '@playwright/test';

test.describe('Global Search', () => {
  test('top search action opens Global Search', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open global search' }).click();
    await expect(page).toHaveURL(/\/search$/);
    await expect(page.getByText('Global Search', { exact: true }).last()).toBeVisible();
  });

  test('search finds the Assets & Scans module and opens it', async ({ page }) => {
    await page.goto('/search');

    const input = page.getByPlaceholder('Search assets, risks, reports, vendors...');
    await input.fill('assets');

    const result = page.getByRole('button', { name: /Assets & Scans/ }).first();
    await expect(result).toBeVisible({ timeout: 20_000 });
    await result.click();

    await expect(page).toHaveURL(/\/assets$/);
  });
});
