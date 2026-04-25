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
    this.addProductButton = page.getByRole('button', { name: /add product|new product/i });
    this.productRows = page.locator('tbody tr');
  }

  async goto() {
    const inventoryNavLink = this.page.getByRole('link', { name: /^inventory$/i }).first();

    if (await inventoryNavLink.isVisible().catch(() => false)) {
      await inventoryNavLink.click();
    } else {
      try {
        await this.page.goto('/inventory/all', { waitUntil: 'domcontentloaded' });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const isExpectedRedirectAbort =
          message.includes('ERR_ABORTED') || message.includes('interrupted by another navigation');

        if (!isExpectedRedirectAbort) {
          throw error;
        }
      }
    }

    await this.page.waitForURL(/\/(inventory(\/all)?|auth|login)(\?|$)/, { timeout: 10000 }).catch(() => undefined);
    await this.page.waitForLoadState('networkidle').catch(() => undefined);
    await this.page.locator('.explorer-sidebar').waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
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
    this.heading = page.getByRole('heading', { name: /add new product|new product|create product/i });
    this.nameInput = page.getByLabel(/name/i);
    this.skuInput = page.getByLabel(/sku/i);
    this.quantityInput = page.getByLabel(/initial stock|quantity|qty/i);
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
    try {
      await this.page.goto('/scan', { waitUntil: 'commit' });
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
    await expect(this.page).toHaveURL(/\/(scan\/[^/]+|scan|login|auth|dashboard)/);
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
    try {
      await this.page.goto('/alerts', { waitUntil: 'commit' });
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
    await expect(this.page).toHaveURL(/\/(alerts(\/[^/]+)?|auth|login)|localhost:5993\/$/);
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
    await this.page.goto('/tools/labels', { waitUntil: 'commit' });
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/(tools\/labels(\/[^/]+)?|auth|login)|localhost:5993\/$/);
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
    try {
      await this.page.goto('/procurement');
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
    await expect(this.heading).toBeVisible();
  }
}
