import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow } from './helpers/common';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Public login and registration entry', () => {
  test('login landing page renders the primary actions', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create company account' })).toBeVisible();
    await expect(page.getByText('CyberShield360').first()).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });

  test('Get Started reveals usable email/password controls', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Get Started' }).click();

    const email = page.getByLabel('Email address');
    const password = page.locator('#login-password');

    await expect(email).toBeVisible();
    await expect(password).toBeVisible();
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible();

    await password.fill('temporary-value');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('invalid credentials show a clear error', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Run the negative login test once.');

    await page.goto('/login');
    await page.getByRole('button', { name: 'Get Started' }).click();
    await page.getByLabel('Email address').fill(`qa-not-a-user-${Date.now()}@example.invalid`);
    await page.locator('#login-password').fill('Definitely-Wrong-Password-123!');
    await page.getByRole('button', { name: /^sign in$/i }).click();

    await expect(page.getByRole('alert')).toContainText('Invalid email or password');
  });

  test('Create company account opens tenant registration', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Create company account' }).click();
    await expect(page).toHaveURL(/\/tenant-registration$/);
  });
});
