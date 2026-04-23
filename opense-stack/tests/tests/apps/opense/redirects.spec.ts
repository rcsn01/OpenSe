import { test, expect, type Page } from '@playwright/test';

const accountsUrl = process.env.BASE_URL_ACCOUNTS || 'http://localhost:5991';
const openseUrl = process.env.BASE_URL_OPENSE || 'http://localhost:5994';
const etlUrl = process.env.BASE_URL_ETL || 'http://localhost:5992';
const stoqrUrl = process.env.BASE_URL_STOQR || 'http://localhost:5993';
const accountsOrigin = new URL(accountsUrl).origin;
const hasRealUser = Boolean(process.env.E2E_TEST_EMAIL && !process.env.E2E_TEST_EMAIL.includes('example.com'));
const accountsAuthPathnames = ['/login', '/signin', '/register', '/signup'];

const getNavbarGetStarted = (page: Page) => page.getByTestId('nav-get-started').first();

const safeGoto = async (page: Page, url: string) => {
  try {
    await page.goto(url, { waitUntil: 'commit' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isExpectedRedirectAbort =
      message.includes('ERR_ABORTED') || message.includes('interrupted by another navigation');

    if (!isExpectedRedirectAbort) {
      throw error;
    }
  }
};

const expectAccountsRedirect = async (page: Page, pathname: '/login' | '/register', appName: string, returnTo: string) => {
  await page.waitForURL(
    (url) => url.origin === accountsOrigin && url.pathname === pathname,
    { timeout: 15000 },
  );

  const current = new URL(page.url());
  expect(current.searchParams.get('app')).toBe(appName);
  expect(current.searchParams.get('returnTo')).toBe(returnTo);
};

const expectAccountsLoginForAccountsApp = async (page: Page) => {
  await page.waitForURL(
    (url) => url.origin === accountsOrigin && url.pathname === '/login',
    { timeout: 15000 },
  );

  const current = new URL(page.url());
  expect(current.searchParams.get('app')).toBe('Accounts');
  expect(current.searchParams.get('returnTo')).toBeNull();
};

const expectAuthenticatedAccountsDestination = async (page: Page) => {
  await page.waitForURL(
    (url) => url.origin === accountsOrigin && !accountsAuthPathnames.includes(url.pathname),
    { timeout: 15000 },
  );
};

const loginThroughOpenSe = async (page: Page) => {
  await safeGoto(page, '/login');
  await page.waitForURL(
    (url) => url.origin === accountsOrigin && url.pathname === '/login',
    { timeout: 15000 },
  );

  const emailInput = page.getByLabel('Email');
  const passwordInput = page.getByLabel('Password');
  const submit = page.getByRole('button', { name: /sign in|log in|continue/i }).first();

  await expect(emailInput).toBeVisible({ timeout: 15000 });
  await emailInput.fill(process.env.E2E_TEST_EMAIL || '');
  await passwordInput.fill(process.env.E2E_TEST_PASSWORD || '');
  await submit.click();

  await page.waitForURL(
    (url) => {
      const isAccountsAuthRoute =
        url.origin === accountsOrigin && accountsAuthPathnames.includes(url.pathname);
      return !isAccountsAuthRoute;
    },
    { timeout: 15000 },
  );

  await page.goto(openseUrl);
  await expect(page).toHaveURL(openseUrl + '/');
};

test.describe('OpenSe Cross-App Redirects', () => {
  test('OpenSe login route redirects through Accounts sign-in', async ({ page }) => {
    await safeGoto(page, '/login');

    await expectAccountsRedirect(page, '/login', 'OpenSe', `${openseUrl}/`);
  });

  test('OpenSe register route redirects through Accounts sign-up', async ({ page }) => {
    await safeGoto(page, '/register');

    await expectAccountsRedirect(page, '/register', 'OpenSe', `${openseUrl}/`);
  });

  test('guest root navbar CTA redirects to Accounts login for the Accounts app', async ({ page }) => {
    await page.goto('/');
    await getNavbarGetStarted(page).click();

    await expectAccountsLoginForAccountsApp(page);
  });

  test('guest clicking ETL stays inside OpenSe and reaches the ETL landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('launch-etl')).toHaveAttribute('href', '/etl');
    await page.getByTestId('launch-etl').click();

    await expect(page).toHaveURL(`${openseUrl}/etl`);
    await expect(page.getByRole('heading', { name: /open-etl/i })).toBeVisible();
  });

  test('guest clicking StoQR stays inside OpenSe and reaches the StoQR landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('launch-stoqr')).toHaveAttribute('href', '/stoqr');
    await page.getByTestId('launch-stoqr').click();

    await expect(page).toHaveURL(`${openseUrl}/stoqr`);
    await expect(page.getByRole('heading', { name: /open-stoqr/i })).toBeVisible();
  });

  test('guest ETL landing navbar CTA redirects through Accounts sign-in', async ({ page }) => {
    await page.goto('/etl');
    await expect(page.getByRole('heading', { name: /open-etl/i })).toBeVisible();
    await getNavbarGetStarted(page).click();

    await expectAccountsRedirect(page, '/login', 'Open-ETL', `${etlUrl}/dashboard`);
  });

  test('guest StoQR landing navbar CTA redirects through Accounts sign-in', async ({ page }) => {
    await page.goto('/stoqr');
    await expect(page.getByRole('heading', { name: /open-stoqr/i })).toBeVisible();
    await getNavbarGetStarted(page).click();

    await expectAccountsRedirect(page, '/login', 'Open-StoQR', `${stoqrUrl}/dashboard`);
  });

  test('guest visiting internal StoQR auth route redirects through Accounts sign-in', async ({ page }) => {
    await safeGoto(page, '/auth');

    await expectAccountsRedirect(page, '/login', 'Open-StoQR', `${stoqrUrl}/dashboard`);
  });

  test('authenticated root navbar CTA goes straight to the Accounts app', async ({ page }) => {
    test.skip(!hasRealUser, 'Set real E2E_TEST_EMAIL/PASSWORD to run authenticated redirect assertions.');

    await loginThroughOpenSe(page);
    await getNavbarGetStarted(page).click();

    await expectAuthenticatedAccountsDestination(page);
  });

  test('authenticated user can move to the ETL landing page inside OpenSe and then reach the dashboard', async ({ page }) => {
    test.skip(!hasRealUser, 'Set real E2E_TEST_EMAIL/PASSWORD to run authenticated redirect assertions.');

    await loginThroughOpenSe(page);
    await page.getByTestId('launch-etl').click();
    await expect(page).toHaveURL(`${openseUrl}/etl`);
    await getNavbarGetStarted(page).click();

    await page.waitForURL(
      (url) => url.origin === new URL(etlUrl).origin && url.pathname.startsWith('/dashboard'),
      { timeout: 15000 },
    );
  });

  test('authenticated user can move to the StoQR landing page inside OpenSe and then reach the dashboard', async ({ page }) => {
    test.skip(!hasRealUser, 'Set real E2E_TEST_EMAIL/PASSWORD to run authenticated redirect assertions.');

    await loginThroughOpenSe(page);
    await page.getByTestId('launch-stoqr').click();
    await expect(page).toHaveURL(`${openseUrl}/stoqr`);
    await getNavbarGetStarted(page).click();

    await page.waitForURL(
      (url) => url.origin === new URL(stoqrUrl).origin && url.pathname.startsWith('/dashboard'),
      { timeout: 15000 },
    );
  });
});