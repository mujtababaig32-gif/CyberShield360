import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectProtectedPageReady } from './helpers/common';

test.describe('Dashboard', () => {
  test('loads the security posture dashboard and key actions', async ({ page }) => {
    await page.goto('/');

    await expectProtectedPageReady(page, 'Dashboard');
    await expect(page.getByText('Security Posture Dashboard')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Refresh$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export Summary' })).toBeVisible();
    await expect(page.getByText('Overall Security Score')).toBeVisible();
    await expect(page.getByText(/\d+\/100/).first()).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });

  test('dashboard refresh completes and does not leave the UI stuck', async ({ page }) => {
    await page.goto('/');
    const refresh = page.getByRole('button', { name: /^Refresh$/ });

    await refresh.click();
    await expect(page.getByRole('button', { name: /^Refresh$/ })).toBeVisible({ timeout: 30_000 });
  });

  test('dashboard has no uncaught page errors during initial load', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/');
    await expect(page.getByText('Security Posture Dashboard')).toBeVisible();
    await page.waitForTimeout(1_000);

    expect(pageErrors, `Uncaught page errors: ${pageErrors.join(' | ')}`).toEqual([]);
  });
});
