import { expect, test } from '@playwright/test';


test.describe('AI Remediation', () => {
  test('page loads and does not remain stuck on loading', async ({ page }) => {
    await page.goto('/ai-remediation');

    await expect(page.getByText('AI Remediation', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('Loading AI Remediation...')).toBeHidden({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /Generate Guidance|Regenerate Guidance/ })).toBeVisible();
  });
});

test.describe('Report Builder', () => {
  test('client report controls and readiness state load', async ({ page }) => {
    await page.goto('/report-builder');

    await expect(page.getByText('Report Builder', { exact: true }).last()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download PDF' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download Excel' })).toBeVisible();
    await expect(page.getByText(/Ready|Scan Required/).first()).toBeVisible();
  });

  test('download a real PDF report when explicitly enabled', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Run the download test once.');
    test.skip(process.env.CS360_RUN_DOWNLOAD_TESTS !== 'true', 'Set CS360_RUN_DOWNLOAD_TESTS=true to test downloads.');

    await page.goto('/report-builder');
    const pdf = page.getByRole('button', { name: 'Download PDF' });
    test.skip(await pdf.isDisabled(), 'No completed Full Posture report is available.');

    const downloadPromise = page.waitForEvent('download');
    await pdf.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename().toLowerCase()).toContain('.pdf');
  });
});
