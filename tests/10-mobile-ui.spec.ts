import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, projectIs } from './helpers/common';

test.describe('Authenticated mobile UI', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      !projectIs(testInfo.project.name, ['mobile-safari', 'mobile-chrome']),
      'Mobile UI tests run only on mobile projects.'
    );
  });

  test('mobile navigation opens, fits the viewport, and keeps sign out compact near the bottom', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open navigation' }).click();

    const nav = page.getByRole('dialog', { name: 'Main navigation' });
    await expect(nav).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const signOut = page.getByRole('button', { name: 'Sign out' });
    await expect(signOut).toBeVisible();

    const navBox = await nav.boundingBox();
    const signOutBox = await signOut.boundingBox();
    expect(navBox).not.toBeNull();
    expect(signOutBox).not.toBeNull();

    if (navBox && signOutBox) {
      expect(signOutBox.height).toBeLessThan(80);
      expect(signOutBox.y).toBeGreaterThan(navBox.y + navBox.height * 0.55);
    }
  });

  test('profile and notification popups stay inside the phone viewport', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Open profile menu' }).click();
    const profileAction = page.getByRole('button', { name: 'View full profile' });
    await expect(profileAction).toBeVisible();
    const profilePopup = profileAction.locator('xpath=../..');
    const profileBox = await profilePopup.boundingBox();
    const viewport = page.viewportSize();

    expect(profileBox).not.toBeNull();
    if (profileBox && viewport) {
      expect(profileBox.x).toBeGreaterThanOrEqual(0);
      expect(profileBox.x + profileBox.width).toBeLessThanOrEqual(viewport.width + 1);
    }

    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Notifications' }).click();
    const notificationAction = page.getByRole('button', { name: 'View notification center' });
    await expect(notificationAction).toBeVisible();
    const notificationPopup = notificationAction.locator('xpath=../..');
    const notificationBox = await notificationPopup.boundingBox();

    expect(notificationBox).not.toBeNull();
    if (notificationBox && viewport) {
      expect(notificationBox.x).toBeGreaterThanOrEqual(0);
      expect(notificationBox.x + notificationBox.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  });
});
