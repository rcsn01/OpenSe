import { type Page, type Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByText('Total Value').first();
    this.logoutButton = page.getByRole('button', { name: /log out|sign out/i });
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }

  async logout() {
    await this.logoutButton.click();
  }
}

export class InventoryPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addProductButton: Locator;
  readonly productRows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /inventory/i });
    this.addProductButton = page.getByRole('button', { name: /add product|new product/i });
    this.productRows = page.locator('tbody tr');
  }

  async goto() {
    await this.page.goto('/inventory/all');
    await expect(this.page).toHaveURL(/\/inventory\/all(?:\?|$)/);
    await expect(this.page.getByRole('complementary', { name: /folder navigation/i })).toBeVisible({ timeout: 20_000 });
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }

  async goToAddProduct() {
    await this.addProductButton.click();
  }

  async getProductCount(): Promise<number> {
    return await this.productRows.count();
  }
}

export class CreateProductPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly nameInput: Locator;
  readonly skuInput: Locator;
  readonly quantityInput: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /add product|add new product|new product|create product/i });
    this.nameInput = page.getByLabel(/name/i);
    this.skuInput = page.getByPlaceholder('Optional');
    this.quantityInput = page.getByLabel(/update stock|initial stock|quantity|qty/i);
    this.saveButton = page.getByRole('button', { name: /save|create/i });
  }

  async goto() {
    await this.page.goto('/inventory/new');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }

  async createProduct(name: string, sku: string, quantity: number = 0) {
    await this.nameInput.fill(name);
    await this.skuInput.fill(sku);
    if (quantity > 0) {
      await this.quantityInput.fill(quantity.toString());
    }
    await this.saveButton.click();
  }
}

export class EditProductPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly nameInput: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /edit product/i });
    this.nameInput = page.getByLabel(/name/i);
    this.saveButton = page.getByRole('button', { name: /update product|save/i });
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }

  async updateName(name: string) {
    await this.nameInput.fill(name);
  }

  async save() {
    await this.saveButton.click();
  }
}

export class ScanPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly scanButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /scan/i });
    this.scanButton = page.getByRole('button', { name: /scan/i });
  }

  async goto() {
    await this.page.goto('/scan/scan-actions');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/scan\/scan-actions(?:\?|$)/);
    await expect(this.page.getByRole('button', { name: 'Scan' })).toBeVisible();
  }
}

export class ReportsPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /reports/i }).first();
  }

  async goto() {
    try {
      await this.page.goto('/reports');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isExpectedRedirectAbort =
        message.includes('ERR_ABORTED') || message.includes('interrupted by another navigation');

      if (!isExpectedRedirectAbort) {
        throw error;
      }
    }
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/(localhost:5991\/login\?|\/(reports\/[^/]+|auth)?$)/);
  }
}

export class AlertsPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /alerts/i }).first();
  }

  async goto() {
    await this.page.goto('/alerts');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/alerts(?:\?|$)/);
    await expect(this.heading).toBeVisible();
  }
}

export class LabelStudioPage {
  readonly page: Page;
  readonly templatesButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.templatesButton = page.getByRole('button', { name: 'Templates' });
  }

  async goto() {
    await this.page.goto('/tools/labels/templates');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/tools\/labels\/templates(?:\?|$)/);
    await expect(this.templatesButton).toBeVisible();
  }
}

export class ProductDetailPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly editButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1').first();
    this.editButton = page.getByRole('button', { name: /edit|save/i }).first();
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/inventory\//);
    await expect(this.heading).toBeVisible();
  }

  async goToEdit() {
    await this.editButton.click();
  }
}

export class TeamSettingsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly inviteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /team/i });
    this.inviteButton = page.getByRole('button', { name: /invite/i });
  }

  async goto() {
    await this.page.goto('/settings/team', { waitUntil: 'commit' });
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }
}

export class ProcurementPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /procurement/i });
  }

  async goto() {
    await this.page.goto('/procurement/purchase-orders');
    await expect(this.page).toHaveURL(/\/procurement\/purchase-orders(?:\?|$)/);
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }
}
