import { expect, type Page } from '@playwright/test';

export async function expectNoHorizontalOverflow(page: Page, tolerance = 3) {
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  );

  expect(
    overflow,
    `Page has ${overflow}px of horizontal overflow`
  ).toBeLessThanOrEqual(tolerance);
}

export async function expectProtectedPageReady(page: Page, title: string) {
  await expect(page.locator('main > header')).toContainText(title);
  await expect(
    page.getByText('This CyberShield360 page does not exist')
  ).toHaveCount(0);
}

export async function waitForSkeletonsToFinish(page: Page, timeout = 20_000) {
  await expect
    .poll(async () => page.locator('.animate-pulse').count(), {
      timeout,
      message: 'Loading skeletons should finish instead of running forever',
    })
    .toBe(0);
}

export function projectIs(projectName: string, allowed: string[]) {
  return allowed.includes(projectName);
}
