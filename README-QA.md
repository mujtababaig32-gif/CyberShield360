# CyberShield360 Playwright QA Suite

This suite is designed for the deployed CyberShield360 application and covers:

- public login and registration entry
- authenticated login setup and reusable storage state
- dashboard loading and refresh behavior
- every protected application route
- profile popup loading, contrast, outside click, Escape, and full-profile navigation
- notification popup loading, contrast, outside click, Escape, and notification-center navigation
- Global Search
- invalid domain validation
- optional real Scan All Assets workflow
- Scheduled Scans UI and cron validation
- Vendor Risk
- SOC deduplicated queue
- Compliance tabs
- AI Remediation loading behavior
- Report Builder readiness and optional PDF download
- commercial journey from Service → Package → Quotation → Onboarding
- authorization gate behavior
- mobile sidebar, compact sign-out placement, popup viewport fit
- mobile login layout and overflow
- section deep links and professional 404 handling

## Install location

Copy the contents of this package into the repository root:

`D:\CyberShield360`

The suite expects `playwright.config.ts` and the `tests` folder to live in that root.

## Run the full safe suite

```powershell
cd "D:\CyberShield360"
.\qa-run.ps1
```

The script securely prompts for the QA email and password. It does not write the password into a test file.

## Run optional real scan tests

Real Scan All tests can take several minutes and change server-side scan data:

```powershell
.\qa-run.ps1 -RunScanTests
```

## Run optional download tests

```powershell
.\qa-run.ps1 -RunDownloadTests
```

Both can be enabled together:

```powershell
.\qa-run.ps1 -RunScanTests -RunDownloadTests
```

## Run without automatically opening the HTML report

```powershell
.\qa-run.ps1 -NoOpen
```

Then open it later:

```powershell
npx playwright show-report cybershield360-qa-report
```

## Important Git ignore entries

Add these to `.gitignore`:

```text
playwright/.auth/
cybershield360-qa-report/
test-results/
blob-report/
```

Do not commit `playwright/.auth/admin.json`; it contains reusable authenticated browser state.

## Report outputs

- HTML: `cybershield360-qa-report/index.html`
- JSON: `test-results/results.json`
- JUnit XML: `test-results/junit.xml`
- failure screenshots/videos/traces: `test-results/`

## One-browser quick run

```powershell
$env:CS360_EMAIL="admin@cybershield360.com"
$env:CS360_PASSWORD="YOUR_PASSWORD"
npx playwright test --project=desktop-chromium
```

## UI mode

```powershell
npx playwright test --ui
```

For UI mode, run the setup project when authentication state expires.
