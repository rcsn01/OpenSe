import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { Tabs } from '../components/Tabs'
import { ItemLabelsTab } from '../components/LabelStudio/ItemLabelsTab'
import { LocationLabelsTab } from '../components/LabelStudio/LocationLabelsTab'
import { ShippingLabelsTab } from '../components/LabelStudio/ShippingLabelsTab'

export const LabelStudioPage = () => {
  const { companyId } = useCompany()

  return (
    <BasePage
      companyId={companyId}
      isLoading={false}
      emptyStateTitle="No company selected"
      emptyStateDescription="Choose a company to access label tools."
    >
      <Tabs
        tabs={[
          { id: 'items', label: 'Item Labels', content: <ItemLabelsTab /> },
          { id: 'locations', label: 'Bin / Shelf', content: <LocationLabelsTab /> },
          { id: 'shipping', label: 'Shipping', content: <ShippingLabelsTab /> },
        ]}
      />
    </BasePage>
  )
}