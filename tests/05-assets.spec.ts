import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow } from './helpers/common';

test.describe('Assets & Scans', () => {
  test('page loads and invalid domain is rejected clearly', async ({ page }) => {
    await page.goto('/assets');

    await expect(page.getByText('Assets & Scans', { exact: true }).last()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Scan All Assets' })).toBeVisible();

    await page.getByPlaceholder('example.com').fill('not-a-valid-domain');
    await page.getByRole('button', { name: 'Add Asset' }).click();

    await expect(page.getByRole('alert')).toContainText(/Invalid domain format/i);
    await expectNoHorizontalOverflow(page);
  });

  test('real Scan All Assets workflow completes or reports partial results', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Run the real scan once.');
    test.skip(process.env.CS360_RUN_SCAN_TESTS !== 'true', 'Set CS360_RUN_SCAN_TESTS=true to run real scans.');
    test.setTimeout(10 * 60 * 1000);

    await page.goto('/assets');
    const scanAll = page.getByRole('button', { name: 'Scan All Assets' });
    test.skip(await scanAll.isDisabled(), 'No assets are available to scan.');

    await scanAll.click();
    await expect(page.getByRole('button', { name: 'Scanning...' })).toBeVisible();

    await expect(
      page.getByText(/Scan All complete|Scan All completed with partial results|Scan All could not complete/i)
    ).toBeVisible({ timeout: 9 * 60 * 1000 });
  });
});
