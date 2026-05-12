import { useCallback, useMemo } from "react";
import { ContentTabs } from "@repo/ui";
import { useNavigate, useParams } from "react-router-dom";
import { useCompany } from "../contexts/CompanyContext";
import { StoqrPageShell } from "../components/StoqrPageShell";
import { PageAvailabilityGuard } from "../components/PageAvailabilityGuard";
import { StockHealthValuationTab } from "../components/Reports/StockHealthValuationTab";
import { MovementVelocityTab } from "../components/Reports/MovementVelocityTab";
import { ProcurementSuppliersTab } from "../components/Reports/ProcurementSuppliersTab";
import { AuditsShrinkageTab } from "../components/Reports/AuditsShrinkageTab";
import { CustomSavedReportsTab } from "../components/Reports/CustomSavedReportsTab";

const reportDestinationBySuggestionId: Record<string, string> = {
  "report-stock-health": "stock-health",
  "report-movement": "movement-velocity",
  "report-procurement": "procurement-suppliers",
  "report-audits": "audits-shrinkage",
  "report-custom": "custom-saved",
};

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
  const handleSuggestionSelect = useCallback((suggestion: { id: string }) => {
    const nextTab = reportDestinationBySuggestionId[suggestion.id];
    if (nextTab) {
      navigate(`/reports/${nextTab}`);
    }
  }, [navigate]);

  const searchConfig = useMemo(() => ({
    searchKey: "reports",
    placeholder: "Search reports...",
    defaultSuggestions: [
      {
        id: "report-stock-health",
        title: "Inventory Health",
        subtitle: "Inventory value, aging, and folder mix",
        value: "inventory health stock valuation",
        badge: "Report",
      },
      {
        id: "report-movement",
        title: "Stock Movement",
        subtitle: "Inbound, outbound, and top-moving SKUs",
        value: "stock movement velocity",
        badge: "Report",
      },
      {
        id: "report-procurement",
        title: "Purchasing",
        subtitle: "Supplier and purchasing insights",
        value: "purchasing procurement suppliers",
        badge: "Report",
      },
      {
        id: "report-audits",
        title: "Stock Accuracy",
        subtitle: "Audit findings and shrink trends",
        value: "stock accuracy audits shrinkage",
        badge: "Report",
      },
      {
        id: "report-custom",
        title: "Saved Reports",
        subtitle: "Templates and scheduled delivery",
        value: "saved reports custom reports",
        badge: "Report",
      },
    ],
    onSuggestionSelect: handleSuggestionSelect,
  }), [handleSuggestionSelect]);

  return (
    <StoqrPageShell
      companyId={companyId}
      search={searchConfig}
      contentClassName="flex h-full min-h-0 overflow-hidden px-2 pb-8 pt-[18px]"
      containerClassName="[&>*]:min-w-0 flex h-full min-h-0 min-w-0 flex-1 flex-col gap-7 overflow-hidden text-[var(--color-foreground)]"
    >
      <PageAvailabilityGuard companyId={companyId} feature="reports">
        <ContentTabs
          activeTab={activeTab}
          onTabChange={(nextTab) => navigate(`/reports/${nextTab}`)}
          bottomSpacing
          tabs={[
            {
              id: "stock-health",
              label: "Inventory Health",
              content: <StockHealthValuationTab companyId={companyId} />,
            },
            {
              id: "movement-velocity",
              label: "Stock Movement",
              content: <MovementVelocityTab companyId={companyId} />,
            },
            {
              id: "procurement-suppliers",
              label: "Purchasing",
              content: <ProcurementSuppliersTab companyId={companyId} />,
            },
            {
              id: "audits-shrinkage",
              label: "Stock Accuracy",
              content: <AuditsShrinkageTab companyId={companyId} />,
            },
            {
              id: "custom-saved",
              label: "Saved Reports",
              content: <CustomSavedReportsTab companyId={companyId} />,
            },
          ]}
        />
      </PageAvailabilityGuard>
    </StoqrPageShell>
  );
};
