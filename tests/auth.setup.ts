import fs from 'node:fs';
import path from 'node:path';
import { expect, test as setup } from '@playwright/test';

const authFile = path.join(process.cwd(), 'playwright', '.auth', 'admin.json');

setup('authenticate CyberShield360 QA user', async ({ page }) => {
  const email = process.env.CS360_EMAIL;
  const password = process.env.CS360_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Set CS360_EMAIL and CS360_PASSWORD before running the full QA suite. ' +
      'Use the included qa-run.ps1 script to be prompted securely.'
    );
  }

  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto('/login');
  await page.getByRole('button', { name: 'Get Started' }).click();
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  
  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/v1/auth/login') &&
      response.request().method() === 'POST',
    { timeout: 30_000 }
  );

  await page.getByRole('button', { name: /^Sign in$/ }).click();

  const response = await loginResponse;
  expect(response.ok(), `Login API returned HTTP ${response.status()}`).toBeTruthy();

  await page.waitForURL((url) => url.pathname === '/', { timeout: 30_000 });
  await expect(page.locator('main > header')).toContainText('Dashboard');

  await page.context().storageState({ path: authFile });
});
