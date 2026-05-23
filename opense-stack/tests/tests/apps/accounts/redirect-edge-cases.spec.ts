import { test, expect, type Page } from '@playwright/test';

const etlUrl = process.env.BASE_URL_ETL || 'http://localhost:5992';
const stoqrUrl = process.env.BASE_URL_STOQR || 'http://localhost:5993';
const accountsUrl = process.env.BASE_URL_ACCOUNTS || 'http://localhost:5991';

const loginUrl = (returnTo: string, app = 'Open-ETL') => {
  const params = new URLSearchParams({ app, returnTo });
  return `/login?${params.toString()}`;
};

const getSignupLinkUrl = async (page: Page) => {
  const href = await page.getByRole('link', { name: /sign up/i }).getAttribute('href');
  expect(href).toBeTruthy();
  return new URL(href as string, accountsUrl);
};

test.describe('Accounts redirect edge cases', () => {
  test('preserves safe configured app returnTo when forwarding from login to register', async ({ page }) => {
    const returnTo = `${etlUrl}/activity/usage?range=7d`;

    await page.goto(loginUrl(returnTo));

    const signup = await getSignupLinkUrl(page);
    expect(signup.pathname).toBe('/register');
    expect(signup.searchParams.get('app')).toBe('Open-ETL');
    expect(signup.searchParams.get('returnTo')).toBe(returnTo);
  });

  test('preserves safe local StoQR returnTo with path and hash-like encoded data', async ({ page }) => {
    const returnTo = `${stoqrUrl}/inventory/all?folder=front%20room`;

    await page.goto(loginUrl(returnTo, 'Open-StoQR'));

    const signup = await getSignupLinkUrl(page);
    expect(signup.searchParams.get('app')).toBe('Open-StoQR');
    expect(signup.searchParams.get('returnTo')).toBe(returnTo);
  });

  test('strips unknown external returnTo while preserving app context', async ({ page }) => {
    await page.goto(loginUrl('https://evil.example/phish'));

    const signup = await getSignupLinkUrl(page);
    expect(signup.searchParams.get('app')).toBe('Open-ETL');
    expect(signup.searchParams.has('returnTo')).toBe(false);
  });

  test('strips Accounts-origin returnTo to avoid redirect loops', async ({ page }) => {
    await page.goto(loginUrl(`${accountsUrl}/account/profile`));

    const signup = await getSignupLinkUrl(page);
    expect(signup.searchParams.get('app')).toBe('Open-ETL');
    expect(signup.searchParams.has('returnTo')).toBe(false);
  });

  test('strips localhost ports outside the app allow-list', async ({ page }) => {
    await page.goto(loginUrl('http://localhost:7777/dashboard'));

    const signup = await getSignupLinkUrl(page);
    expect(signup.searchParams.get('app')).toBe('Open-ETL');
    expect(signup.searchParams.has('returnTo')).toBe(false);
  });
});
