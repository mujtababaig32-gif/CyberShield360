import { expect, test } from '@playwright/test';

const ALIASES = [
  '/command-center',
  '/client-success',
  '/deal-desk',
  '/attack-surface',
  '/risk-trust',
  '/human-defense',
  '/threat-ops',
  '/control-room',
];

test.describe('Deep links and 404 behavior', () => {
  for (const route of ALIASES) {
    test(`${route} deep link resolves`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-chromium', 'Run deep-link aliases once.');
      await page.goto(route);
      await expect(page.getByText('This CyberShield360 page does not exist')).toHaveCount(0);
      await expect(page.locator('main')).toBeVisible();
    });
  }

  test('unknown protected route shows the professional 404 page', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Run 404 test once.');

    await page.goto('/qa-route-that-does-not-exist');
    await expect(page.getByText('This CyberShield360 page does not exist')).toBeVisible();
    await expect(page.getByText('Page Not Found')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to Dashboard' })).toBeVisible();
  });
});
