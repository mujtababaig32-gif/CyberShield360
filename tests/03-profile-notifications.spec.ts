import { expect, test, type Locator } from '@playwright/test';
import { waitForSkeletonsToFinish } from './helpers/common';

async function expectSolidDarkPopup(button: Locator) {
  const popup = button.locator('xpath=../..');
  const background = await popup.evaluate((element: Element) =>
    getComputedStyle(element as HTMLElement).backgroundColor
  );
  expect(background).toBe('rgb(2, 4, 10)');
}

test.describe('Profile quick menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Security Posture Dashboard')).toBeVisible();
  });

  test('loads data, uses solid dark contrast, and closes with Escape', async ({ page }) => {
    await page.getByRole('button', { name: 'Open profile menu' }).click();

    const viewFull = page.getByRole('button', { name: 'View full profile' });
    await expect(viewFull).toBeVisible();
    await waitForSkeletonsToFinish(page);
    await expectSolidDarkPopup(viewFull);

    await page.keyboard.press('Escape');
    await expect(viewFull).toBeHidden();
  });

  test('closes when clicking outside and full profile route remains reachable', async ({ page }) => {
    await page.getByRole('button', { name: 'Open profile menu' }).click();
    const viewFull = page.getByRole('button', { name: 'View full profile' });
    await expect(viewFull).toBeVisible();

    const viewport = page.viewportSize();
    await page.mouse.click(8, Math.max(8, (viewport?.height ?? 800) - 8));
    await expect(viewFull).toBeHidden();

    await page.getByRole('button', { name: 'Open profile menu' }).click();
    await page.getByRole('button', { name: 'View full profile' }).click();
    await expect(page).toHaveURL(/\/profile$/);
  });
});

test.describe('Notification quick menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Security Posture Dashboard')).toBeVisible();
  });

  test('loading finishes, popup is dark, and Escape closes it', async ({ page }) => {
    await page.getByRole('button', { name: 'Notifications' }).click();

    await expect(page.getByText('Notification Center', { exact: true })).toBeVisible();
    await waitForSkeletonsToFinish(page);

    const viewAll = page.getByRole('button', { name: 'View notification center' });
    await expect(viewAll).toBeVisible();
    await expectSolidDarkPopup(viewAll);

    await page.keyboard.press('Escape');
    await expect(viewAll).toBeHidden();
  });

  test('closes outside and View notification center opens the page', async ({ page }) => {
    await page.getByRole('button', { name: 'Notifications' }).click();
    const viewAll = page.getByRole('button', { name: 'View notification center' });
    await expect(viewAll).toBeVisible();

    const viewport = page.viewportSize();
    await page.mouse.click(8, Math.max(8, (viewport?.height ?? 800) - 8));
    await expect(viewAll).toBeHidden();

    await page.getByRole('button', { name: 'Notifications' }).click();
    await page.getByRole('button', { name: 'View notification center' }).click();
    await expect(page).toHaveURL(/\/notifications$/);
  });
});
