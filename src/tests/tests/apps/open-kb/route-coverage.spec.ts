import { type Page } from '@playwright/test';
import { expect, ISSUE_ID, PAGE_ID, PROJECT_ID, test } from '../../fixtures/openKb';

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
  `/projects/${PROJECT_ID}/board`,
  `/projects/${PROJECT_ID}/timeline`,
  `/projects/${PROJECT_ID}/dashboard`,
  `/projects/${PROJECT_ID}/calendar`,
  `/projects/${PROJECT_ID}/workflow`,
  `/projects/${PROJECT_ID}/messages`,
  `/projects/${PROJECT_ID}/note`,
  `/projects/${PROJECT_ID}/gantt`,
  `/projects/${PROJECT_ID}/workload`,
  `/projects/${PROJECT_ID}/files`,
  `/projects/${PROJECT_ID}/drafts`,
  `/projects/${PROJECT_ID}/cycles`,
  `/projects/${PROJECT_ID}/estimates`,
  `/projects/${PROJECT_ID}/pages`,
  `/projects/${PROJECT_ID}/settings`,
  '/issues',
  '/issues/new',
  `/issues/${ISSUE_ID}`,
  '/drafts',
  '/cycles',
  '/cycles/new',
  '/estimates',
  '/estimates/new',
  '/pages',
  '/pages/new',
  `/pages/${PAGE_ID}`,
  '/stickies',
  '/intake',
  '/analytics',
  '/notifications',
  '/settings',
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

  test('unknown authenticated route returns to dashboard', async ({ openKbPage }) => {
    await safeGoto(openKbPage, '/not-a-real-open-kb-route');
    await expect(openKbPage).toHaveURL(/\/dashboard(?:[?#].*)?$/);
  });

  test('legacy project issues route redirects to list', async ({ openKbPage }) => {
    await safeGoto(openKbPage, `/projects/${PROJECT_ID}/issues`);
    await expect(openKbPage).toHaveURL(new RegExp(`/projects/${PROJECT_ID}/list(?:[?#].*)?$`));
  });
});
