import { LANDING_NAVBAR_OFFSET } from '@repo/ui'
import {
  ArrowRight,
  BellRing,
  Boxes,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  PackageSearch,
  Printer,
  QrCode,
  ShieldCheck,
  ShoppingCart,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MarketingFooter } from '../components/MarketingFooter'
import { MarketingPageFrame } from '../components/MarketingPageFrame'
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
import { buildNavbarGetStartedPath, setActiveLandingContext } from '../lib/authRedirect'

type StoqrShowcaseFeature = {
  title: string
  eyebrow: string
  description: string
  icon: LucideIcon
  preview: ReactNode
  tone: 'warm' | 'cool' | 'plain'
  bullets: string[]
}

const showcaseFeatures: StoqrShowcaseFeature[] = [
  {
    title: 'Dashboard',
    eyebrow: 'Know what needs attention now.',
    description:
      'Watch inventory value, stock health, pending purchase orders, and critical alerts from one calm command center built for daily operational review.',
    icon: LayoutDashboard,
    preview: <DashboardPreview />,
    tone: 'warm',
    bullets: [
      'See urgent stock risk before it becomes a stockout.',
      'Track value, movement, and purchase order pressure together.',
      'Give managers one place to start the day.',
    ],
  },
  {
    title: 'Inventory',
    eyebrow: 'Every item, folder, SKU, and quantity in reach.',
    description:
      'Browse products, locations, low-stock states, and custom fields without leaving the working surface your team uses to keep shelves accurate.',
    icon: PackageSearch,
    preview: <InventoryPreview />,
    tone: 'plain',
    bullets: [
      'Organize products by location, bin, type, or custom workflow.',
      'Filter low-stock and out-of-stock items without hunting.',
      'Keep SKU, quantity, and status details visible at once.',
    ],
  },
  {
    title: 'Scanner',
    eyebrow: 'Move faster on the floor.',
    description:
      'Scan barcode and QR labels from the browser, match the right product instantly, then add or remove stock while the item is still in your hand.',
    icon: QrCode,
    preview: <ScannerPreview />,
    tone: 'cool',
    bullets: [
      'Use the camera scanner without installing a native app.',
      'Match the scanned item to its product record immediately.',
      'Adjust stock from the same scan action surface.',
    ],
  },
  {
    title: 'Label Studio',
    eyebrow: 'Print labels that match the way you work.',
    description:
      'Build product, shelf, and batch label templates with variable fields, SKU data, and barcode output ready for day-to-day printing.',
    icon: Printer,
    preview: <LabelStudioPreview />,
    tone: 'warm',
    bullets: [
      'Create reusable templates for products, shelves, and batches.',
      'Include barcode, SKU, location, and quantity fields.',
      'Prepare consistent labels for batch printing.',
    ],
  },
  {
    title: 'Reports',
    eyebrow: 'Turn stock movement into decisions.',
    description:
      'Review valuation, velocity, shrinkage, reorder candidates, supplier movement, and exports without rebuilding reports in spreadsheets.',
    icon: ClipboardList,
    preview: <ReportsPreview />,
    tone: 'plain',
    bullets: [
      'Review valuation and movement without rebuilding sheets.',
      'Find slow-moving and reorder candidate products.',
      'Export operational views when finance or suppliers need them.',
    ],
  },
  {
    title: 'Procurement',
    eyebrow: 'Replenishment without the scramble.',
    description:
      'Create purchase orders, manage suppliers, follow receiving workflows, and spot delayed replenishment before it slows down operations.',
    icon: ShoppingCart,
    preview: <ProcurementPreview />,
    tone: 'cool',
    bullets: [
      'Track supplier, approval, receiving, and delay status.',
      'Connect reorder pressure to purchase order workflows.',
      'Keep inbound replenishment visible to the inventory team.',
    ],
  },
  {
    title: 'Alerts',
    eyebrow: 'Let the system raise its hand first.',
    description:
      'Configure low-stock, expiry, reorder, delivery, and connector notifications so the right people see problems early enough to act.',
    icon: BellRing,
    preview: <AlertsPreview />,
    tone: 'warm',
    bullets: [
      'Trigger alerts for low stock, expiry, delivery, and connectors.',
      'Separate critical events from ordinary operational noise.',
      'Route the right issue to the right team sooner.',
    ],
  },
  {
    title: 'Organisation RBAC',
    eyebrow: 'Access control that stays understandable.',
    description:
      'Invite members, assign roles, control operational permissions, and keep team access clear as your inventory workflow grows.',
    icon: ShieldCheck,
    preview: <OrganisationRbacPreview />,
    tone: 'plain',
    bullets: [
      'Invite members with roles that match their work.',
      'Restrict sensitive settings and procurement controls.',
      'Keep permissions readable as the organization grows.',
    ],
  },
]

const toneBackground: Record<StoqrShowcaseFeature['tone'], string> = {
  warm:
    'linear-gradient(180deg, color-mix(in srgb, var(--color-warning-light) 36%, white) 0%, color-mix(in srgb, var(--color-background) 86%, white) 100%)',
  cool:
    'linear-gradient(180deg, color-mix(in srgb, var(--color-info-light) 34%, white) 0%, color-mix(in srgb, var(--color-background) 88%, white) 100%)',
  plain:
    'linear-gradient(180deg, white 0%, color-mix(in srgb, var(--color-background) 88%, white) 100%)',
}

const ctaHref = buildNavbarGetStartedPath('stoqr')

export const OpenStoqrLandingPage = () => {
  useEffect(() => {
    setActiveLandingContext('stoqr')
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  return (
    <MarketingPageFrame background={(
      <>
        <div className="absolute inset-0 bg-[var(--color-background)]" />
        <div
          className="absolute left-[-10rem] top-[-4rem] h-[28rem] w-[28rem] rounded-full blur-3xl"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-warning-light) 52%, white)' }}
        />
        <div
          className="absolute right-[-9rem] top-[22rem] h-[22rem] w-[22rem] rounded-full blur-3xl"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-info-light) 34%, white)' }}
        />
      </>
    )}>
      <section
        className="mx-auto flex min-h-[92vh] max-w-7xl flex-col items-center justify-center px-6 pb-16 text-center"
        style={{ paddingTop: `calc(${LANDING_NAVBAR_OFFSET} + 4rem)` }}
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:color-mix(in_srgb,var(--color-secondary)_18%,transparent)] bg-[color:color-mix(in_srgb,var(--color-warning-light)_48%,white)] text-[var(--color-secondary)]">
          <Boxes className="h-6 w-6" />
        </span>
        <h1 className="mt-7 text-6xl font-semibold leading-none tracking-[-0.06em] text-[var(--color-heading)] md:text-8xl">
          Open-StoQr
        </h1>
        <p className="mt-5 text-2xl font-semibold text-[color:color-mix(in_srgb,var(--color-secondary)_82%,#8e5f2b)] md:text-3xl">
          Physical inventory, digitally mastered.
        </p>
        <p className="mx-auto mt-6 max-w-4xl text-lg leading-8 text-[var(--color-body)] md:text-xl">
          Track, scan, procure, report, and govern inventory operations from an open source product suite your team can actually see before they deploy it.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link
            to={ctaHref}
            data-testid="stoqr-deploy-open-stoqr"
            className="inline-flex min-w-44 items-center justify-center whitespace-nowrap rounded-full bg-[var(--color-foreground)] px-7 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
            style={{ color: 'white' }}
          >
            Deploy Open-StoQr
          </Link>
          <a
            href="#stoqr-dashboard"
            className="inline-flex items-center justify-center rounded-full border border-[var(--opense-shell-border-strong)] bg-white/72 px-7 py-3 text-sm font-semibold text-[var(--color-heading)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            See the UI
          </a>
        </div>
      </section>

      {showcaseFeatures.map((feature, index) => {
        const Icon = feature.icon

        return (
          <section
            key={feature.title}
            id={`stoqr-${feature.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            className="overflow-hidden border-t border-[color:var(--opense-shell-border)] px-6 py-20 md:py-28"
            style={{ background: toneBackground[feature.tone] }}
          >
            <div
              className={`mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16 ${
                index % 2 === 1 ? 'lg:grid-cols-[1.18fr_0.82fr]' : ''
              }`}
            >
              <div className={`max-w-xl ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                <div className="flex items-center gap-4">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:color-mix(in_srgb,var(--color-secondary)_16%,transparent)] bg-white/72 text-[var(--color-secondary)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-secondary)]">
                    {feature.eyebrow}
                  </p>
                </div>
                <h2 className="mt-7 text-4xl font-semibold leading-[1.03] tracking-[-0.055em] text-[var(--color-heading)] md:text-6xl">
                  {feature.title}
                </h2>
                <p className="mt-5 text-lg leading-8 text-[var(--color-body)] md:text-xl">
                  {feature.description}
                </p>
                <ul className="mt-10 space-y-6">
                  {feature.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-4 text-left text-base leading-7 text-[var(--color-foreground)]">
                      <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--color-secondary)]">
                        <CheckCircle2 className="h-5 w-5" />
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-10 flex flex-wrap items-center gap-5">
                  <Link
                    to={ctaHref}
                    className="inline-flex min-w-40 items-center justify-center whitespace-nowrap rounded-full bg-[var(--color-foreground)] px-6 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
                    style={{ color: 'white' }}
                  >
                    Deploy Open-StoQr
                  </Link>
                  <a
                    href="#stoqr-reports"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-secondary)]"
                  >
                    See all workflows
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
              <div
                data-testid="product-feature-preview"
                aria-hidden="true"
                className={`stoqr-showcase-preview w-full ${index % 2 === 1 ? 'is-left' : 'is-right'}`}
                style={{
                  '--stoqr-showcase-delay': `${index * 80}ms`,
                } as CSSProperties}
              >
                {feature.preview}
              </div>
            </div>
          </section>
        )
      })}

      <section className="border-t border-[color:var(--opense-shell-border)] bg-[var(--color-foreground)] px-6 py-24 text-center text-white">
        <h2 className="mx-auto max-w-4xl text-5xl font-semibold tracking-[-0.06em] md:text-7xl">
          Ready to organize your assets?
        </h2>
        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/76">
          Upgrade your team's efficiency with Open-StoQr. Open source, highly customizable, and easy to deploy for your organization.
        </p>
        <Link
          to={ctaHref}
          className="mt-9 inline-flex min-w-44 items-center justify-center whitespace-nowrap rounded-full bg-white px-7 py-3 text-sm font-semibold text-[var(--color-heading)] transition-transform duration-200 hover:-translate-y-0.5"
        >
          Deploy Open-StoQr
        </Link>
      </section>

      <MarketingFooter />
    </MarketingPageFrame>
  )
}
