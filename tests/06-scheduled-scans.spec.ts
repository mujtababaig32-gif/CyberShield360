import { expect, test } from '@playwright/test';

test.describe('Scheduled Scans', () => {
  test('monitoring schedule UI loads', async ({ page }) => {
    await page.goto('/scheduled-scans');

    await expect(page.getByText('Scheduled Scans', { exact: true }).last()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Monitoring Scheduled Scan' })).toBeVisible();
    await expect(page.getByText('Monitoring Schedule Register')).toBeVisible();
  });

  test('invalid custom cron is blocked before API creation', async ({ page }) => {
    await page.goto('/scheduled-scans');

    const frequencySelect = page
      .locator('label')
      .filter({ hasText: 'Frequency' })
      .locator('..')
      .locator('select');

    await frequencySelect.selectOption('custom');
    await page.getByPlaceholder('0 2 * * *').fill('invalid cron');

    const create = page.getByRole('button', { name: 'Create Monitoring Scheduled Scan' });
    test.skip(await create.isDisabled(), 'No assets are available, so the create action is disabled.');

    await create.click();
    await expect(page.getByText(/Cron must be a standard 5-field expression/i)).toBeVisible();
  });
});
