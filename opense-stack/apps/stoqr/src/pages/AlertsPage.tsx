import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { Tabs } from '../components/Tabs'
import { NotificationsTab } from '../components/Alerts/NotificationsTab'
import { CustomRulesTab } from '../components/Alerts/CustomRulesTab'
import { DeliveryTab } from '../components/Alerts/DeliveryTab'
import { HistoryTab } from '../components/Alerts/HistoryTab'
import { useAlertProducts } from '../hooks/queries/useAlerts'

export const AlertsPage = () => {
  const { companyId } = useCompany()
  const { data: products = [], isLoading } = useAlertProducts(companyId)

  return (
    <BasePage
      companyId={companyId}
      isLoading={isLoading}
      emptyStateTitle="No company selected"
      emptyStateDescription="Choose a company to view alerts."
    >
      <div className="card" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Alerts</h1>
      </div>
      <Tabs
        tabs={[
          { id: 'notifications', label: 'Notifications', content: <NotificationsTab products={products} /> },
          { id: 'rules', label: 'Custom Rules', content: <CustomRulesTab companyId={companyId || ''} /> },
          { id: 'delivery', label: 'Email / Push', content: <DeliveryTab companyId={companyId || ''} /> },
          { id: 'history', label: 'History', content: <HistoryTab companyId={companyId || ''} /> },
        ]}
      />
    </BasePage>
  )
}
