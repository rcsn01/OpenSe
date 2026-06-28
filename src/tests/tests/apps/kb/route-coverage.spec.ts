import { type Page } from '@playwright/test';
import { expect, ISSUE_ID, PROJECT_ID, test } from '../../fixtures/openKb';

const safeGoto = async (page: Page, url: string) => {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isExpectedRedirectAbort =
      message.includes('ERR_ABORTED') || message.includes('interrupted by another navigation');

    if (!isExpectedRedirectAbort) {
      throw error;
    }
  }
};

const authenticatedRoutes = [
  '/dashboard',
  '/teams',
  '/projects',
  '/projects/new',
  `/projects/${PROJECT_ID}`,
  `/projects/${PROJECT_ID}/overview`,
  `/projects/${PROJECT_ID}/list`,
  `/projects/${PROJECT_ID}/list/11110000-0000-4000-8000-0000e2e10020`,
  `/projects/${PROJECT_ID}/list/issues/${ISSUE_ID}`,
  `/projects/${PROJECT_ID}/list/11110000-0000-4000-8000-0000e2e10020/issues/${ISSUE_ID}`,
  `/projects/${PROJECT_ID}/board`,
  `/projects/${PROJECT_ID}/timeline`,
  `/projects/${PROJECT_ID}/dashboard`,
  `/projects/${PROJECT_ID}/calendar`,
  `/projects/${PROJECT_ID}/workflow`,
  `/projects/${PROJECT_ID}/messages`,
  `/projects/${PROJECT_ID}/gantt`,
  `/projects/${PROJECT_ID}/workload`,
  `/projects/${PROJECT_ID}/files`,
  `/projects/${PROJECT_ID}/cycles`,
  `/projects/${PROJECT_ID}/issues/${ISSUE_ID}`,
  `/projects/${PROJECT_ID}/settings`,
  '/cycles',
  '/cycles/new',
  '/analytics',
  '/notifications',
  '/settings',
];

const staleRoutes = [
  { from: `/projects/${PROJECT_ID}/note`, to: `/projects/${PROJECT_ID}/list` },
  { from: `/projects/${PROJECT_ID}/pages`, to: `/projects/${PROJECT_ID}/list` },
  { from: `/projects/${PROJECT_ID}/pages/new`, to: `/projects/${PROJECT_ID}/list` },
  { from: `/projects/${PROJECT_ID}/pages/11110000-0000-4000-8000-00000000e2e3`, to: `/projects/${PROJECT_ID}/list` },
  { from: '/stickies', to: '/dashboard' },
];

test.describe('Open-KB Route Coverage', () => {
  test('public board route resolves without the app shell redirecting away', async ({ openKbPage }) => {
    await safeGoto(openKbPage, '/public/boards/okb-e2e-board');
    await expect(openKbPage).toHaveURL(/\/public\/boards\/okb-e2e-board$/);
    await expect(openKbPage.getByText('Open-KB public board').first()).toBeVisible();
  });

  for (const route of authenticatedRoutes) {
    test(`authenticated route ${route} resolves`, async ({ openKbPage }) => {
      await safeGoto(openKbPage, route);
      await expect(openKbPage).toHaveURL(new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[?#].*)?$`));
      await expect(openKbPage.getByText('Open-KB').first()).toBeVisible();
    });
  }

  for (const { from, to } of staleRoutes) {
    test(`stale route ${from} redirects`, async ({ openKbPage }) => {
      await safeGoto(openKbPage, from);
      await expect(openKbPage).toHaveURL(new RegExp(`${to.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[?#].*)?$`));
    });
  }

  test('unknown authenticated route returns to dashboard', async ({ openKbPage }) => {
    await safeGoto(openKbPage, '/not-a-real-open-kb-route');
    await expect(openKbPage).toHaveURL(/\/dashboard(?:[?#].*)?$/);
  });
});
