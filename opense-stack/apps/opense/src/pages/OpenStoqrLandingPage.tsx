import {
  BellRing,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  PackageSearch,
  Printer,
  QrCode,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react'
import { ProductLandingPage, type ProductLandingFeature } from '../components/ProductLandingPage'
import {
  AlertsPreview,
  DashboardPreview,
  InventoryPreview,
  LabelStudioPreview,
  OrganisationRbacPreview,
  ProcurementPreview,
  ReportsPreview,
  ScannerPreview,
} from '../components/stoqr-previews'

const featureCards: ProductLandingFeature[] = [
  {
    title: 'Dashboard',
    description:
      'Monitor total inventory value, stock health, pending purchase orders, and urgent alerts from one operational command center.',
    icon: LayoutDashboard,
    preview: <DashboardPreview />,
  },
  {
    title: 'Inventory',
    description:
      'Browse products, folders, quantities, SKUs, and stock status with fast filters built for storerooms, warehouses, and distributed teams.',
    icon: PackageSearch,
    preview: <InventoryPreview />,
  },
  {
    title: 'Scanner',
    description:
      'Use browser-based barcode and QR scanning to look up items, add stock, remove stock, and keep floor operations moving.',
    icon: QrCode,
    preview: <ScannerPreview />,
  },
  {
    title: 'Label Studio',
    description:
      'Design product, shelf, and batch labels with barcodes, variable fields, and print-ready templates for everyday inventory work.',
    icon: Printer,
    preview: <LabelStudioPreview />,
  },
  {
    title: 'Reports',
    description:
      'Track valuation, movement, shrinkage, reorder candidates, supplier performance, and exportable reports without spreadsheet drift.',
    icon: ClipboardList,
    preview: <ReportsPreview />,
  },
  {
    title: 'Procurement',
    description:
      'Create purchase orders, manage suppliers, follow receiving workflows, and spot delayed replenishment before it hits operations.',
    icon: ShoppingCart,
    preview: <ProcurementPreview />,
  },
  {
    title: 'Alerts',
    description:
      'Configure low-stock, expiry, reorder, connector, and delivery notifications so the right people see problems early.',
    icon: BellRing,
    preview: <AlertsPreview />,
  },
  {
    title: 'Organisation RBAC',
    description:
      'Invite members, assign roles, control access to inventory operations, and keep permissions understandable as teams grow.',
    icon: ShieldCheck,
    preview: <OrganisationRbacPreview />,
  },
]

const featureIconClass =
  'inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:color-mix(in_srgb,var(--color-secondary)_14%,transparent)] bg-[color:color-mix(in_srgb,var(--color-warning-light)_44%,white)] text-[var(--color-secondary)]'

export const OpenStoqrLandingPage = () => {
  return (
    <ProductLandingPage
      landingContext="stoqr"
      background={(
        <>
          <div className="absolute inset-0 bg-[var(--color-background)]" />
          <div
            className="absolute left-[-9rem] top-[-2rem] h-[22rem] w-[22rem] rounded-full blur-3xl"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-warning-light) 52%, white)' }}
          />
          <div
            className="absolute right-[-8rem] top-[18rem] h-[18rem] w-[18rem] rounded-full blur-3xl"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-secondary) 12%, white)' }}
          />
        </>
      )}
      heroIcon={Boxes}
      iconClassName={featureIconClass}
      title="Open-StoQr"
      subtitle="Physical inventory, digitally mastered."
      subtitleStyle={{ color: 'color-mix(in srgb, var(--color-secondary) 82%, #8e5f2b)' }}
      description="Track, scan, and manage your inventory operations with high customization and accessibility. Perfect for modern warehouses, retail backrooms, and distributed asset management."
      features={featureCards}
      ctaPanelStyle={{ backgroundColor: 'color-mix(in srgb, var(--color-secondary) 34%, #2f1707)' }}
      ctaIcon={TrendingUp}
      ctaTitle="Ready to Organize Your Assets?"
      ctaDescription="Upgrade your team's efficiency with Open-StoQr. Open source, highly customizable, and easy to deploy for your organization."
      ctaLabel="Deploy Open-StoQr"
      ctaTestId="stoqr-deploy-open-stoqr"
    />
  )
}
