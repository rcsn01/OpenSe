import { useCompany } from '../contexts/CompanyContext'
import { EmptyState } from '../components/EmptyState'
import { Tabs } from '../components/Tabs'
import { ItemLabelsTab } from '../components/LabelStudio/ItemLabelsTab'
import { LocationLabelsTab } from '../components/LabelStudio/LocationLabelsTab'
import { ShippingLabelsTab } from '../components/LabelStudio/ShippingLabelsTab'

export const LabelStudio = () => {
  const { companyId } = useCompany()

  if (!companyId) {
    return <EmptyState title="No company selected" description="Choose a company to access label tools." />
  }

  return (
    <div className="stack">
      <Tabs
        tabs={[
          { id: 'items', label: 'Item Labels', content: <ItemLabelsTab /> },
          { id: 'locations', label: 'Bin / Shelf', content: <LocationLabelsTab /> },
          { id: 'shipping', label: 'Shipping', content: <ShippingLabelsTab /> },
        ]}
      />
    </div>
  )
}