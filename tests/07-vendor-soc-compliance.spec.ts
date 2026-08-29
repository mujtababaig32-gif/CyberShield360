import { expect, test } from '@playwright/test';

test.describe('Vendor Risk', () => {
  test('vendor risk workspace loads with assessment controls', async ({ page }) => {
    await page.goto('/vendor-risk');

    await expect(page.getByText('Vendor Risk Center')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add Vendor', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export Vendors' })).toBeVisible();
    await expect(page.getByPlaceholder('Vendor name, e.g. Payment Gateway')).toBeVisible();
  });
});

test.describe('SOC Center', () => {
  test('deduplicated SOC queue and filters load', async ({ page }) => {
    await page.goto('/soc');

    await expect(page.getByRole('heading', { name: /SOC \/ Incident Response Center/i })).toBeVisible();
    await expect(page.getByText('Deduplicated Alert Queue', { exact: true })).toBeVisible();
    await expect(page.getByText('Raw Failed Signals', { exact: true })).toBeVisible();

    const selects = page.locator('select');
    await expect(selects).toHaveCount(2);
  });
});

test.describe('Compliance Center', () => {
  test('framework and control tabs are navigable', async ({ page }) => {
    await page.goto('/compliance');

    await expect(page.getByText('Compliance Center', { exact: true }).last()).toBeVisible();
    await page.getByRole('button', { name: 'Frameworks' }).click();
    await expect(page.getByText('Framework Readiness').first()).toBeVisible();

    await page.getByRole('button', { name: 'Controls', exact: true }).click();
    await expect(page.getByText(/Controls|Control/i).first()).toBeVisible();
  });
});
