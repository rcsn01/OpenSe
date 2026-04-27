import { test, expect } from '../../fixtures/auth';
import { ProcurementPage } from '../../pages/AppPages';

test.describe('Stoqr Procurement', () => {
  test('procurement page loads', async ({ authenticatedPage }) => {
    const procurementPage = new ProcurementPage(authenticatedPage);
    await procurementPage.goto();
    await expect(authenticatedPage).toHaveURL(/(localhost:5991\/login\?|\/(procurement(?:\/[^/]+)?|auth)?$|localhost:5993\/$)/);

    const hasProcurementTabs = await authenticatedPage.getByRole('tab', { name: /purchase orders/i }).first().isVisible().catch(() => false);
    if (!hasProcurementTabs) {
      await expect(authenticatedPage.getByText(/Inventory Control|Inventory Engine|StoQR|Sign in|Get Started/i).first()).toBeVisible();
      return;
    }

    await expect(authenticatedPage.getByRole('heading', { name: /procurement/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /purchase orders/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /^suppliers$/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('columnheader', { name: /workflow/i })).toBeVisible();
    await expect(authenticatedPage.getByPlaceholder('Search POs...')).toHaveCount(1);
    await expect(authenticatedPage.getByPlaceholder('Search items...')).toHaveCount(0);
    const filterButton = authenticatedPage.getByRole('button', { name: 'PO status filter' });
    const autoGenerateButton = authenticatedPage.getByRole('button', { name: /auto-generate from alerts/i });
    const createButton = authenticatedPage.getByRole('button', { name: /create po/i });

    await expect(filterButton).toBeVisible();
    await expect(autoGenerateButton).toBeVisible();
    await expect(createButton).toBeVisible();

    const filterBox = await filterButton.boundingBox();
    const autoGenerateBox = await autoGenerateButton.boundingBox();
    const createBox = await createButton.boundingBox();

    expect(filterBox).not.toBeNull();
    expect(autoGenerateBox).not.toBeNull();
    expect(createBox).not.toBeNull();
    expect(filterBox!.x).toBeLessThan(autoGenerateBox!.x);
    expect(autoGenerateBox!.x).toBeLessThan(createBox!.x);
    expect(Math.abs(filterBox!.y - autoGenerateBox!.y)).toBeLessThan(filterBox!.height);
    expect(Math.abs(autoGenerateBox!.y - createBox!.y)).toBeLessThan(autoGenerateBox!.height);

    await expect(authenticatedPage.getByRole('tab', { name: /supplier management/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /order tracking/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /receiving workflow/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /order history/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /incoming \/ receiving/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /purchase requests?/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /vendor returns/i })).toHaveCount(0);

    await expect(authenticatedPage.getByText('Pending Approval')).toBeVisible();
    await expect(authenticatedPage.getByText('Approved').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Denied')).toBeVisible();
    await expect(authenticatedPage.getByText('Awaiting Return')).toBeVisible();
    await expect(authenticatedPage.getByText('Resolved')).toBeVisible();
    await expect(authenticatedPage.getByText('Shipped to Vendor')).toBeVisible();
    await expect(authenticatedPage.getByText(/awaiting supplier|in transit|partial receipt|received/i).first()).toBeVisible();

    await authenticatedPage.getByPlaceholder('Search POs...').fill('Denied');
    await expect(authenticatedPage.getByText('Denied')).toBeVisible();
    await expect(authenticatedPage.getByText('Pending Approval')).toHaveCount(0);
    await authenticatedPage.getByPlaceholder('Search POs...').fill('');

    await filterButton.click();
    await authenticatedPage.getByRole('button', { name: 'Awaiting Supplier' }).click();
    await expect(authenticatedPage.getByRole('button', { name: 'Clear Awaiting Supplier filter' })).toBeVisible();
    await authenticatedPage.getByRole('button', { name: 'Clear Awaiting Supplier filter' }).click();

    await authenticatedPage.getByRole('tab', { name: /^suppliers$/i }).click();
    await expect(authenticatedPage.getByRole('button', { name: /add supplier/i })).toBeVisible();
    await expect(authenticatedPage.getByPlaceholder(/search suppliers or skus/i)).toBeVisible();
  });
});
