import { BellRing, Boxes, LayoutDashboard, Printer, QrCode, TrendingUp, UserRoundCog } from 'lucide-react'
import { ProductLandingPage, type ProductLandingFeature } from '../components/ProductLandingPage'

const featureCards: ProductLandingFeature[] = [
  {
    title: 'Intelligent Dashboard',
    description:
      'Monitor total inventory value, stock levels, and pending orders at a glance. Visual charts track inventory trends and usage depletion over time.',
    icon: LayoutDashboard,
  },
  {
    title: 'Built-in Scanner',
    description:
      'Camera-based barcode and QR code scanning right from your web browser. Do quick stock lookups, add, or remove inventory efficiently on the floor.',
    icon: QrCode,
  },
  {
    title: 'Label Studio',
    description:
      'Design custom labels with variable fields (Barcode, SKU, Price). Use template libraries for products, shelves, or bins, and export to PDF/PNG for batch printing.',
    icon: Printer,
  },
  {
    title: 'Procurement & Reporting',
    description:
      'Create purchase orders, manage suppliers, and track receiving workflows. Generate dead stock identification and inventory valuation reports.',
    icon: TrendingUp,
  },
  {
    title: 'Automated Alerts',
    description:
      'Set custom rules for low stock notifications, reorder point triggers, and expiration warnings. Receive alerts via email or push notifications.',
    icon: BellRing,
  },
  {
    title: 'Role-Based Access',
    description:
      'Granular user management. Invite team members with specific roles (admin, editor, scanner). Maintain full audit trails and activity logs for accountability.',
    icon: UserRoundCog,
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
      ctaIcon={QrCode}
      ctaTitle="Ready to Organize Your Assets?"
      ctaDescription="Upgrade your team's efficiency with Open-StoQr. Open source, highly customizable, and easy to deploy for your organization."
      ctaLabel="Deploy Open-StoQr"
      ctaTestId="stoqr-deploy-open-stoqr"
    />
  )
}