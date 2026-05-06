import { useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCompany } from "../contexts/CompanyContext";
import { BasePage } from "../components/BasePage";
import { PageAvailabilityGuard } from "../components/PageAvailabilityGuard";
import { usePageTopBarSearch } from "../components/Search/TopBarSearch";
import { Tabs } from "../components/Tabs";
import { StockHealthValuationTab } from "../components/Reports/StockHealthValuationTab";
import { MovementVelocityTab } from "../components/Reports/MovementVelocityTab";
import { ProcurementSuppliersTab } from "../components/Reports/ProcurementSuppliersTab";
import { AuditsShrinkageTab } from "../components/Reports/AuditsShrinkageTab";
import { CustomSavedReportsTab } from "../components/Reports/CustomSavedReportsTab";

export const ReportsPage = () => {
  const { companyId } = useCompany();
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const validTabs = [
    "stock-health",
    "movement-velocity",
    "procurement-suppliers",
    "audits-shrinkage",
    "custom-saved",
  ] as const;
  const activeTab = validTabs.includes(
    (tab ?? "") as (typeof validTabs)[number],
  )
    ? tab!
    : "stock-health";
  const reportDestinationBySuggestionId: Record<string, string> = {
    "report-stock-health": "stock-health",
    "report-movement": "movement-velocity",
    "report-procurement": "procurement-suppliers",
    "report-audits": "audits-shrinkage",
    "report-custom": "custom-saved",
  };
  const handleSuggestionSelect = useCallback((suggestion: { id: string }) => {
    const nextTab = reportDestinationBySuggestionId[suggestion.id];
    if (nextTab) {
      navigate(`/reports/${nextTab}`);
    }
  }, [navigate]);

  usePageTopBarSearch(useMemo(() => ({
    searchKey: "reports",
    placeholder: "Search reports...",
    defaultSuggestions: [
      {
        id: "report-stock-health",
        title: "Stock Health & Valuation",
        subtitle: "Inventory value, aging, and folder mix",
        value: "stock health valuation",
        badge: "Report",
      },
      {
        id: "report-movement",
        title: "Movement & Velocity",
        subtitle: "Inbound, outbound, and top-moving SKUs",
        value: "movement velocity",
        badge: "Report",
      },
      {
        id: "report-procurement",
        title: "Procurement & Suppliers",
        subtitle: "Supplier and purchasing insights",
        value: "procurement suppliers",
        badge: "Report",
      },
      {
        id: "report-audits",
        title: "Audits & Shrinkage",
        subtitle: "Audit findings and shrink trends",
        value: "audits shrinkage",
        badge: "Report",
      },
      {
        id: "report-custom",
        title: "Custom & Saved Reports",
        subtitle: "Templates and scheduled delivery",
        value: "custom saved reports",
        badge: "Report",
      },
    ],
    onSuggestionSelect: handleSuggestionSelect,
  }), [handleSuggestionSelect]));

  return (
    <BasePage
      companyId={companyId}
      containerClassName="stoqr-workspace-page"
      contentStyle={{ padding: "18px 8px 32px" }}
      containerStyle={{ minWidth: 0 }}
    >
      <PageAvailabilityGuard companyId={companyId} feature="reports">
        <Tabs
          activeTab={activeTab}
          onTabChange={(nextTab) => navigate(`/reports/${nextTab}`)}
          bottomSpacing
          tabs={[
            {
              id: "stock-health",
              label: "Stock Health & Valuation",
              content: <StockHealthValuationTab companyId={companyId} />,
            },
            {
              id: "movement-velocity",
              label: "Movement & Velocity",
              content: <MovementVelocityTab companyId={companyId} />,
            },
            {
              id: "procurement-suppliers",
              label: "Procurement & Suppliers",
              content: <ProcurementSuppliersTab companyId={companyId} />,
            },
            {
              id: "audits-shrinkage",
              label: "Audits & Shrinkage",
              content: <AuditsShrinkageTab companyId={companyId} />,
            },
            {
              id: "custom-saved",
              label: "Custom & Saved Reports",
              content: <CustomSavedReportsTab companyId={companyId} />,
            },
          ]}
        />
      </PageAvailabilityGuard>
    </BasePage>
  );
};
