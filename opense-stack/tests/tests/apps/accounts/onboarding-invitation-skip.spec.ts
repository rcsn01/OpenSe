import { expect, test, type Page } from '@playwright/test';
import { installMockSupabaseSession } from '../../fixtures/mockSupabaseSession';

const accountsUrl = process.env.BASE_URL_ACCOUNTS || 'http://localhost:5991';
const etlUrl = process.env.BASE_URL_ETL || 'http://localhost:5992';
const accountsOrigin = new URL(accountsUrl).origin;

const gotoAccounts = async (page: Page, path: string) => {
  await page.goto(new URL(path, accountsUrl).toString());
};

const collectAccountsPaths = (page: Page) => {
  const paths: string[] = [];

  page.on('framenavigated', (frame) => {
    if (frame !== page.mainFrame()) return;
    const url = new URL(frame.url());
    if (url.origin === accountsOrigin) {
      paths.push(url.pathname);
    }
  });

  return paths;
};

test.describe('Accounts onboarding invitation skip', () => {
  test('accepting a member invitation completes onboarding and returns to a safe returnTo', async ({ page }) => {
    const visitedAccountsPaths = collectAccountsPaths(page);
    const returnTo = `${etlUrl}/dashboard?from=member-invite`;

    await installMockSupabaseSession(page, {
      userId: 'e2e-accounts-member-invite-return',
      email: 'e2e-accounts-member-invite-return@example.com',
      pendingInvite: { role: 'member', orgName: 'Member Invite Org' },
    });

    await gotoAccounts(page, `/onboarding/invitations?app=Open-ETL&returnTo=${encodeURIComponent(returnTo)}`);
    await page.getByRole('button', { name: /accept invitation/i }).click();

    await page.waitForURL(returnTo, { timeout: 15000 });
    expect(visitedAccountsPaths).not.toContain('/onboarding/create-organisation');
    expect(visitedAccountsPaths).not.toContain('/onboarding/invite-members');
  });

  test('accepting a member invitation falls back to account home without returnTo', async ({ page }) => {
    await installMockSupabaseSession(page, {
      userId: 'e2e-accounts-member-invite-fallback',
      email: 'e2e-accounts-member-invite-fallback@example.com',
      pendingInvite: { role: 'member', orgName: 'Fallback Invite Org' },
    });

    await gotoAccounts(page, '/onboarding/invitations');
    await page.getByRole('button', { name: /accept invitation/i }).click();

    await expect(page).toHaveURL(/\/account\/home$/);
  });

  test('direct invite-members visit by an editor auto-completes and redirects out', async ({ page }) => {
    await installMockSupabaseSession(page, {
      userId: 'e2e-accounts-editor-direct-invite-members',
      email: 'e2e-accounts-editor-direct-invite-members@example.com',
      initialMembershipRole: 'editor',
    });

    await gotoAccounts(page, '/onboarding/invite-members');

    await expect(page).toHaveURL(/\/account\/home$/);
    await expect(page.getByRole('button', { name: /send invitations/i })).toHaveCount(0);
    await expect(page.getByText(/invitation controls disabled/i)).toHaveCount(0);
  });

  test('stale invitations route with a member membership redirects out', async ({ page }) => {
    await installMockSupabaseSession(page, {
      userId: 'e2e-accounts-member-stale-invitations',
      email: 'e2e-accounts-member-stale-invitations@example.com',
      initialMembershipRole: 'member',
    });

    await gotoAccounts(page, '/onboarding/invitations');

    await expect(page).toHaveURL(/\/account\/home$/);
    await expect(page.getByRole('button', { name: /accept invitation/i })).toHaveCount(0);
  });
});
