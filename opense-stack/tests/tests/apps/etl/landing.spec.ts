import { test } from '@playwright/test';
import { ETLLandingPage } from '../../pages/etl/ETLLandingPage';

test.describe('ETL Landing', () => {
  test('landing page loads with core CTAs', async ({ page }) => {
    const landing = new ETLLandingPage(page);
    await landing.goto();
    await landing.expectLoaded();
  });
});
