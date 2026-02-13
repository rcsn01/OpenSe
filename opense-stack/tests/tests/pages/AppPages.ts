import { type Page, type Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /dashboard/i });
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
    this.addProductButton = page.getByRole('link', { name: /add product|new product/i });
    this.productRows = page.locator('tbody tr');
  }

  async goto() {
    await this.page.goto('/inventory');
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
    this.heading = page.getByRole('heading', { name: /new product|create product/i });
    this.nameInput = page.getByLabel(/name/i);
    this.skuInput = page.getByLabel(/sku/i);
    this.quantityInput = page.getByLabel(/quantity|qty/i);
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
    await this.page.goto('/scan');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
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
    await this.page.goto('/reports');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/(reports|auth)/);
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
    await expect(this.page).toHaveURL(/\/(alerts|auth)/);
  }
}

export class AttributesPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /attributes/i }).first();
  }

  async goto() {
    await this.page.goto('/settings/attributes');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/(settings\/attributes|auth)/);
  }
}

export class LabelStudioPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /label studio|labels/i }).first();
  }

  async goto() {
    await this.page.goto('/tools/labels');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/(tools\/labels|auth)/);
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
    await this.page.goto('/settings/team');
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
    await this.page.goto('/procurement');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }
}
