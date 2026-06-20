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
  '/issues',
  '/issues/new',
  `/issues/${ISSUE_ID}`,
  '/drafts',
  '/cycles',
  '/cycles/new',
  '/modules',
  '/modules/new',
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
});
