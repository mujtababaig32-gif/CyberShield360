import { test } from '@playwright/test';
import {
  expectNoHorizontalOverflow,
  expectProtectedPageReady,
  projectIs,
} from './helpers/common';

const ROUTES = [
  ['/', 'Dashboard'],
  ['/executive-scorecard', 'Executive Scorecard'],
  ['/ai-copilot', 'AI Copilot'],
  ['/search', 'Global Search'],
  ['/service-overview', 'Service Overview'],
  ['/client-onboarding', 'Client Onboarding'],
  ['/client-packages', 'Client Packages'],
  ['/fix-plan', 'Fix Plan'],
  ['/client-quotation', 'Client Quotation'],
  ['/report-builder', 'Report Builder'],
  ['/billing', 'Billing'],
  ['/assets', 'Assets & Scans'],
  ['/asset-inventory', 'Asset Inventory'],
  ['/scheduled-scans', 'Scheduled Scans'],
  ['/vulnerabilities', 'Vulnerabilities'],
  ['/cloud-posture', 'Cloud Posture'],
  ['/attack-path', 'Attack Path'],
  ['/risks', 'Risk Register'],
  ['/compliance', 'Compliance Center'],
  ['/policy-audit', 'Policy & Audit'],
  ['/framework-mapping', 'Framework Mapping'],
  ['/vendor-risk', 'Vendor Risk'],
  ['/security-awareness', 'Security Awareness'],
  ['/phishing-simulation', 'Phishing Simulation'],
  ['/client-training', 'Client Training'],
  ['/soc', 'SOC Center'],
  ['/threat-intelligence', 'Threat Intelligence'],
  ['/dark-web', 'Dark Web'],
  ['/incident-playbooks', 'Incident Playbooks'],
  ['/ai-remediation', 'AI Remediation'],
  ['/audit-logs', 'Audit Logs'],
  ['/saas-admin', 'SaaS Admin'],
  ['/user-management', 'User Management'],
  ['/rbac', 'RBAC Engine'],
  ['/notifications', 'Notifications'],
  ['/profile', 'My Profile'],
  ['/settings', 'Settings'],
] as const;

test.describe('Protected route smoke coverage', () => {
  for (const [route, title] of ROUTES) {
    test(`${title} loads at ${route}`, async ({ page }, testInfo) => {
      test.skip(
        !projectIs(testInfo.project.name, ['desktop-chromium', 'mobile-safari']),
        'Full route matrix runs on desktop Chromium and mobile Safari.'
      );

      await page.goto(route);
      await expectProtectedPageReady(page, title);
      await expectNoHorizontalOverflow(page);
    });
  }
});
