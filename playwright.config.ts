import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.CS360_BASE_URL ?? 'https://cyber-shield360.vercel.app';
const authFile = 'playwright/.auth/admin.json';

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'cybershield360-qa-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },
    {
      name: 'desktop-firefox',
      testIgnore: [
        /02-route-smoke\.spec\.ts/,
        /10-mobile-ui\.spec\.ts/,
        /11-mobile-login\.spec\.ts/,
        /12-routing-404\.spec\.ts/,
      ],
      use: {
        ...devices['Desktop Firefox'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },
    {
      name: 'desktop-webkit',
      testIgnore: [
        /02-route-smoke\.spec\.ts/,
        /10-mobile-ui\.spec\.ts/,
        /11-mobile-login\.spec\.ts/,
        /12-routing-404\.spec\.ts/,
      ],
      use: {
        ...devices['Desktop Safari'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      testIgnore: [
        /02-route-smoke\.spec\.ts/,
        /12-routing-404\.spec\.ts/,
      ],
      use: {
        ...devices['Pixel 7'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },
  ],
});

