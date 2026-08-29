import { expect, test } from '@playwright/test';

const workflowKey = 'cybershield360.commercialWorkflow.v1';

test.describe('Commercial journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/service-overview');
    await page.evaluate((key) => localStorage.removeItem(key), workflowKey);
    await page.reload();
  });

  test('service → package → quotation → onboarding flow stays connected', async ({ page }) => {
    await expect(page.getByText('CyberShield360 Service Overview')).toBeVisible();

    await page.getByRole('button', { name: /Continue to Packages/ }).click();
    await expect(page).toHaveURL(/\/client-packages$/);
    await expect(page.getByText('Client Packages', { exact: true }).last()).toBeVisible();

    await page.getByRole('button', { name: /Use Package & Prepare Quotation/ }).click();
    await expect(page).toHaveURL(/\/client-quotation$/);
    await expect(page.getByText('Client Quotation', { exact: true }).last()).toBeVisible();

    await page.getByRole('button', { name: /Save & Continue to Onboarding/ }).click();
    await expect(page).toHaveURL(/\/client-onboarding$/);
    await expect(page.getByText('Client Onboarding & Scan Authorization')).toBeVisible();

    const draft = await page.evaluate((key) => localStorage.getItem(key), workflowKey);
    expect(draft).not.toBeNull();
  });

  test('authorization gate remains disabled until required consent is complete', async ({ page }) => {
    await page.goto('/client-onboarding');

    const continueButton = page.getByRole('button', { name: /Authorize & Continue to Assessment/ });
    await expect(continueButton).toBeDisabled();

    await expect(page.getByText('Authority to assess the target')).toBeVisible();
    await expect(page.getByText('Scope limited to approved assets')).toBeVisible();
    await expect(page.getByText('Non-destructive external assessment consent')).toBeVisible();
  });
});
