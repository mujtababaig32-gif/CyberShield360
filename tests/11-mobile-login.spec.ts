import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, projectIs } from './helpers/common';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Mobile login layout', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      !projectIs(testInfo.project.name, ['mobile-safari', 'mobile-chrome']),
      'Mobile login tests run only on mobile projects.'
    );
  });

  test('login card is centered in the useful mobile area and remains fully usable', async ({ page }) => {
    await page.goto('/login');

    const card = page.locator('form.login-card');
    await expect(card).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const box = await card.boundingBox();
    const viewport = page.viewportSize();

    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();

    if (box && viewport) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box.y).toBeLessThan(viewport.height * 0.7);
      expect(box.y + box.height).toBeGreaterThan(viewport.height * 0.35);
    }

    await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();
  });
});
