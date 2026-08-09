import { useEffect, useMemo } from "react";
import { ContentTabs } from "@repo/ui";
import { useNavigate, useParams } from "react-router-dom";
import { useCompany } from "../contexts/CompanyContext";
import { StoqrPageShell } from "../components/StoqrPageShell";
import { PageAvailabilityGuard } from "../components/PageAvailabilityGuard";
import { PurchaseOrdersTab } from "../components/Procurement/PurchaseOrdersTab";
import { SuppliersTab } from "../components/Procurement/SuppliersTab";

const procurementTabs = ["purchase-orders", "suppliers"] as const;

type ProcurementTabId = (typeof procurementTabs)[number];

export const ProcurementPage = () => {
  const { companyId } = useCompany();
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const isValidTab = procurementTabs.includes((tab ?? "") as ProcurementTabId);
  const activeTab: ProcurementTabId = isValidTab
    ? (tab as ProcurementTabId)
    : "purchase-orders";

  useEffect(() => {
    if (tab && !isValidTab) {
      navigate("/procurement/purchase-orders", { replace: true });
    }
  }, [isValidTab, navigate, tab]);

  const tabs = useMemo(() => {
    return [
      {
        id: "purchase-orders",
        label: "Purchase Orders",
        content: <PurchaseOrdersTab companyId={companyId} />,
      },
      {
        id: "suppliers",
        label: "Suppliers",
        content: <SuppliersTab companyId={companyId} />,
      },
    ];
  }, [companyId]);

  return (
    <StoqrPageShell
      companyId={companyId}
      emptyStateTitle="No company selected"
      emptyStateDescription="Select a company to manage procurement."
      contentClassName="flex h-full min-h-0 overflow-hidden px-2 pb-8"
      containerClassName="[&>*]:min-w-0 flex h-full min-h-0 min-w-0 flex-1 flex-col gap-7 overflow-hidden text-[var(--color-foreground)]"
    >
      <PageAvailabilityGuard companyId={companyId} feature="procurement">
        <ContentTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(nextTab) => navigate(`/procurement/${nextTab}`)}
          bottomSpacing
          className="overflow-hidden"
          contentClassName="overflow-hidden"
        />
      </PageAvailabilityGuard>
    </StoqrPageShell>
  );
};
