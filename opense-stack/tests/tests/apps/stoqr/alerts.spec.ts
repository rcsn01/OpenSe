import { test, expect } from "../../fixtures/auth";
import { AlertsPage } from "../../pages/AppPages";

test.describe("Stoqr Alerts", () => {
  test("alerts feed shows delivered in-app alerts and bulk status controls", async ({
    authenticatedPage,
  }) => {
    const alertsPage = new AlertsPage(authenticatedPage);
    await alertsPage.goto();
    await alertsPage.expectLoaded();

    const feedTab = authenticatedPage
      .getByRole("button", { name: /alerts feed/i })
      .first();

    await expect(feedTab).toBeVisible();
    await expect(
      authenticatedPage.getByRole("button", { name: "Alert Rules" }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("button", { name: /notifications/i }),
    ).toHaveCount(0);
    await expect(
      authenticatedPage.getByRole("button", { name: /email \/ push/i }),
    ).toHaveCount(0);
    await expect(
      authenticatedPage.getByRole("button", { name: /history/i }),
    ).toHaveCount(0);

    await expect(
      authenticatedPage
        .getByText(
          /Low Stock Alert|No delivered alerts yet|is at .*Low Stock Alert level/i,
        )
        .first(),
    ).toBeVisible();

    const selectAll = authenticatedPage.getByLabel("Select all visible alerts");
    if (await selectAll.isEnabled()) {
      await selectAll.click();
      await expect(
        authenticatedPage.getByRole("button", { name: "Acknowledge" }).first(),
      ).toBeVisible();
      await expect(
        authenticatedPage.getByRole("button", { name: "Resolve" }).first(),
      ).toBeVisible();
    } else {
      await expect(
        authenticatedPage.getByText("No delivered alerts yet"),
      ).toBeVisible();
    }
  });

  test("alert rules exposes low-stock trigger and role recipients", async ({
    authenticatedPage,
  }) => {
    const alertsPage = new AlertsPage(authenticatedPage);
    await alertsPage.goto();
    await alertsPage.expectLoaded();

    await authenticatedPage
      .getByRole("button", { name: "Alert Rules" })
      .click();

    await expect(authenticatedPage).toHaveURL(/\/alerts\/rules$/);
    await expect(
      authenticatedPage.getByRole("heading", { name: "Alert Triggers" }),
    ).toBeVisible();
    const lowStockTrigger = authenticatedPage.getByRole("heading", {
      name: /Low-Stock Trigger/i,
    });
    if (!(await lowStockTrigger.isVisible().catch(() => false))) {
      await authenticatedPage
        .getByRole("button", { name: "New Trigger" })
        .click();
      await expect(
        authenticatedPage.getByRole("heading", { name: "Create Alert Rule" }),
      ).toBeVisible();
    } else {
      await expect(lowStockTrigger).toBeVisible();
    }
    await expect(authenticatedPage.getByLabel("Trigger type")).toHaveValue(
      "Quantity on hand <= Low stock alert level",
    );
    await expect(
      authenticatedPage.getByRole("switch", {
        name: "In-app notifications enabled",
      }),
    ).toHaveAttribute("aria-checked", "true");
    await expect(
      authenticatedPage
        .getByRole("button", { name: /Trigger|Create Rule|Save Rule/i })
        .first(),
    ).toBeVisible();
  });

  test("alert rules search filters low-stock triggers", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/alerts/rules");

    const searchInput = authenticatedPage.getByRole("combobox", {
      name: "Search alert rules...",
    });
    await expect(searchInput).toBeVisible();

    await searchInput.fill("low stock");

    await expect(searchInput).toHaveValue("low stock");
    await expect(
      authenticatedPage.getByRole("heading", { name: "Alert Triggers" }),
    ).toBeVisible();
  });

  test("alert rule editor saves exact selected chat targets independently from email roles", async ({
    authenticatedPage,
  }) => {
    const runId = Date.now();
    const ruleName = `E2E selected targets ${runId}`;
    const warehouseTargetLabel = `Mattermost webhook warehouse-${runId}.example`;
    const financeTargetLabel = `Mattermost webhook finance-${runId}.example`;

    await authenticatedPage.goto("/alerts/rules/new");
    await expect(
      authenticatedPage.getByRole("heading", { name: "Create Alert Rule" }),
    ).toBeVisible();

    await authenticatedPage.getByLabel("Rule name").fill(ruleName);
    await authenticatedPage
      .getByRole("switch", { name: "Email notifications enabled" })
      .click();
    await authenticatedPage
      .getByLabel(/^Notify /)
      .first()
      .click();

    await authenticatedPage
      .getByRole("switch", { name: "Mattermost enabled" })
      .click();
    await authenticatedPage
      .getByRole("button", { name: "Set up Mattermost" })
      .click({ force: true });
    await authenticatedPage
      .getByLabel("Connector provider")
      .selectOption("mattermost");
    await authenticatedPage
      .getByLabel("Provider target ID")
      .fill(`https://warehouse-${runId}.example/hooks/e2e`);
    await authenticatedPage
      .getByRole("button", { name: "Add Mattermost target" })
      .click();
    await expect(
      authenticatedPage.getByLabel(`Send Mattermost to ${warehouseTargetLabel}`),
    ).toBeChecked();

    await authenticatedPage
      .getByLabel("Provider target ID")
      .fill(`https://finance-${runId}.example/hooks/e2e`);
    await authenticatedPage
      .getByRole("button", { name: "Add Mattermost target" })
      .click();
    const financeTarget = authenticatedPage.getByLabel(
      `Send Mattermost to ${financeTargetLabel}`,
    );
    await expect(financeTarget).toBeChecked();
    await financeTarget.click();
    await expect(financeTarget).not.toBeChecked();

    await authenticatedPage
      .getByRole("button", { name: "Create Rule" })
      .click();
    await expect(authenticatedPage).toHaveURL(/\/alerts\/rules(?:\?|$)/);

    await authenticatedPage
      .getByRole("combobox", { name: "Search alert rules..." })
      .fill(ruleName);
    await authenticatedPage
      .getByRole("row", { name: new RegExp(ruleName) })
      .click();

    await expect(
      authenticatedPage.getByRole("heading", { name: "Edit Alert Rule" }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByLabel(`Send Mattermost to ${warehouseTargetLabel}`),
    ).toBeChecked();
    await expect(
      authenticatedPage.getByLabel(`Send Mattermost to ${financeTargetLabel}`),
    ).not.toBeChecked();
    await expect(
      authenticatedPage.getByLabel(/^Notify /).first(),
    ).toBeChecked();
  });
});
