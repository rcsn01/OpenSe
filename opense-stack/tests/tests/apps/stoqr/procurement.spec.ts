import { test, expect } from '../../fixtures/auth';
import { ProcurementPage } from '../../pages/AppPages';

test.describe('Stoqr Procurement', () => {
  test('purchase orders shows procurement actions and the empty-state guidance', async ({ authenticatedPage }) => {
    const procurementPage = new ProcurementPage(authenticatedPage);
    await procurementPage.goto();

    await expect(authenticatedPage.getByRole('button', { name: 'Purchase Orders' })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: 'Suppliers' })).toBeVisible();
    await expect(authenticatedPage.getByPlaceholder('Search POs...')).toHaveCount(1);
    await expect(authenticatedPage.getByPlaceholder('Search items...')).toHaveCount(0);
    const filterButton = authenticatedPage.getByRole('button', { name: 'PO status filter' });
    const autoGenerateButton = authenticatedPage.getByRole('button', { name: /auto-generate from alerts/i });
    const createButton = authenticatedPage.getByRole('button', { name: /create po/i });

    await expect(filterButton).toBeVisible();
    await expect(autoGenerateButton).toBeVisible();
    await expect(createButton).toBeVisible();

    await expect(authenticatedPage.getByRole('heading', { name: 'No purchase orders found' })).toBeVisible();
    await expect(
      authenticatedPage.getByText('Create your first purchase order to start tracking supplier commitments and incoming stock.'),
    ).toBeVisible();

    await filterButton.click();
    await authenticatedPage.getByRole('button', { name: 'Awaiting Supplier' }).click();
    await expect(authenticatedPage.getByRole('button', { name: 'Clear Awaiting Supplier filter' })).toBeVisible();
    await authenticatedPage.getByRole('button', { name: 'Clear Awaiting Supplier filter' }).click();
  });

  test('suppliers tab shows supplier management search and actions', async ({ authenticatedPage }) => {
    const procurementPage = new ProcurementPage(authenticatedPage);
    await procurementPage.goto();

    await authenticatedPage.getByRole('button', { name: 'Suppliers' }).click();
    await expect(authenticatedPage).toHaveURL(/\/procurement\/suppliers(?:\?|$)/);
    await expect(authenticatedPage.getByRole('button', { name: /add supplier/i })).toBeVisible();
    await expect(authenticatedPage.getByPlaceholder('Search suppliers...')).toBeVisible();
    await expect(authenticatedPage.getByPlaceholder('Search POs...')).toHaveCount(0);
  });

  test('suppliers tab search filters the supplier roster', async ({ authenticatedPage }) => {
    const procurementPage = new ProcurementPage(authenticatedPage);
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const supplierName = `Supplier Search ${uniqueId}`;

    await procurementPage.goto();
    await authenticatedPage.getByRole('button', { name: 'Suppliers' }).click();
    await expect(authenticatedPage).toHaveURL(/\/procurement\/suppliers(?:\?|$)/);

    await authenticatedPage.getByRole('button', { name: /add supplier/i }).click();
    await authenticatedPage.getByLabel('Company Name').fill(supplierName);
    await authenticatedPage.getByLabel('Contact Person').fill('Casey Jones');
    await authenticatedPage.getByLabel('Phone').fill('555-0101');
    await authenticatedPage.getByLabel('Email').fill(`search-${uniqueId}@supplier.test`);
    await authenticatedPage.getByRole('button', { name: 'Save Supplier' }).click();

    await expect(authenticatedPage.getByText('Supplier added.')).toBeVisible();
    await expect(authenticatedPage.getByRole('heading', { name: supplierName })).toBeVisible();

    const searchInput = authenticatedPage.getByRole('combobox', { name: 'Search suppliers...' });
    await searchInput.fill(supplierName);

    await expect(authenticatedPage.getByRole('heading', { name: supplierName })).toBeVisible();
  });
});
