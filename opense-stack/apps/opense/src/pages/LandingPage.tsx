import { LANDING_NAVBAR_OFFSET } from '@repo/ui'
import {
  ArrowRight,
  Boxes,
  Building2,
  ChevronRight,
  FileText,
  KeyRound,
  Network,
  ShieldCheck,
  Users,
  Workflow,
} from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { OpenSeLandingNavbar } from '../components/OpenSeLandingNavbar'
import { setActiveLandingContext } from '../lib/authRedirect'

const etlLandingPath = '/etl'
const stoqrLandingPath = '/stoqr'

const productCards = [
  {
    name: 'Open-ETL',
    eyebrow: 'Browser-native transformation',
    description:
      'Create controlled data pipelines for imports, transforms, validation, and exports without pushing sensitive source files into a vendor-owned runtime.',
    href: etlLandingPath,
    accent:
      'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 26%, transparent), color-mix(in srgb, var(--color-info) 12%, transparent), transparent)',
    icon: Workflow,
    bullets: ['Pipeline editor', 'Local-first execution', 'Template gallery'],
  },
  {
    name: 'Open-StoQR',
    eyebrow: 'Operational inventory control',
    description:
      'Run stock operations with scan-based flows, reporting, procurement, and team settings designed for warehouses, backrooms, and field inventory work.',
    href: stoqrLandingPath,
    accent:
      'linear-gradient(135deg, color-mix(in srgb, var(--color-secondary) 28%, transparent), color-mix(in srgb, var(--color-warning) 16%, transparent), transparent)',
    icon: Boxes,
    bullets: ['Inventory dashboards', 'QR and barcode scanning', 'Procurement and alerts'],
  },
]

const sharedCapabilities = [
  {
    title: 'One account across the suite',
    description: 'Centralised sign-in and registration through Accounts keeps onboarding, identity, and access flows consistent across every product surface.',
    icon: KeyRound,
  },
  {
    title: 'Organisation-aware workspaces',
    description: 'Teams, seats, billing, and org settings travel with the user instead of being rebuilt separately inside each app.',
    icon: Building2,
  },
  {
    title: 'Shared governance layer',
    description: 'Audit events, permissions, and platform-level oversight support both product-specific work and administrative control.',
    icon: ShieldCheck,
  },
  {
    title: 'Open architecture',
    description: 'The suite is structured as focused apps over shared packages, so features can evolve independently without fragmenting the platform.',
    icon: Network,
  },
]

const operatingModel = [
  {
    title: 'Authenticate once',
    detail: 'Accounts handles sign-in, sign-up, and return routing to the correct app.',
  },
  {
    title: 'Choose the workflow surface',
    detail: 'Move into ETL for data operations or StoQR for inventory execution.',
  },
  {
    title: 'Operate in context',
    detail: 'Each app stays purpose-built while still reading from the same platform identity and org state.',
  },
  {
    title: 'Review and govern',
    detail: 'Audit, billing, and admin controls remain part of the same suite rather than bolt-on extras.',
  },
]

const proofPoints = [
  { label: 'Focused products', value: '2' },
  { label: 'Shared auth hub', value: '1' },
  { label: 'Platform surfaces', value: 'Accounts · Admin' },
]

const primaryLinkClass =
  'inline-flex items-center gap-2 rounded-full bg-[var(--color-foreground)] px-5 py-3 text-sm font-medium text-[var(--color-background)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[var(--color-heading)]'

const secondaryLinkClass =
  'inline-flex items-center gap-2 rounded-full border border-[var(--opense-shell-border-strong)] bg-[var(--opense-shell-surface)] px-5 py-3 text-sm font-medium text-[var(--color-foreground)] backdrop-blur transition-colors duration-200 hover:border-[var(--color-border-hover)] hover:bg-[var(--opense-shell-surface-strong)]'

export const LandingPage = () => {
  useEffect(() => {
    setActiveLandingContext('opense')
  }, [])

  return (
    <div className="min-h-screen text-[var(--color-foreground)] [--landing-navbar-transparent-foreground:var(--color-foreground)]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-56"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--color-foreground) 54%, transparent), transparent)',
          }}
        />
        <div className="absolute left-[-8rem] top-16 h-64 w-64 rounded-full blur-3xl" style={{ backgroundColor: 'var(--opense-shell-glow)' }} />
        <div className="absolute right-[-4rem] top-20 h-72 w-72 rounded-full blur-3xl" style={{ backgroundColor: 'var(--opense-shell-glow-secondary)' }} />
        <div
          className="absolute inset-0 bg-[size:32px_32px] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.35),rgba(0,0,0,0))]"
          style={{
            backgroundImage:
              'linear-gradient(var(--opense-theme-grid) 1px, transparent 1px), linear-gradient(90deg, var(--opense-theme-grid) 1px, transparent 1px)',
          }}
        />
      </div>

      <OpenSeLandingNavbar />

      <main id="top">
        <section
          className="mx-auto grid max-w-7xl gap-12 px-6 pb-20 lg:grid-cols-[minmax(0,1.1fr)_24rem] lg:px-10 lg:pb-28"
          style={{ paddingTop: `calc(${LANDING_NAVBAR_OFFSET} + 2rem)` }}
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--opense-shell-border)] bg-[var(--opense-shell-surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-body)] shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-[var(--color-suiteOrange)]" />
              Open-source operations suite
            </div>

            <h1 className="mt-8 max-w-4xl text-5xl font-semibold leading-[0.96] tracking-[-0.05em] text-[var(--color-suiteNavy)] md:text-7xl">
              Data pipelines and inventory operations, assembled into one suite.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-body)] md:text-xl">
              OpenSe is the umbrella surface for the full platform: Open-ETL for browser-native workflow orchestration, Open-StoQR for scan-driven inventory control, and shared accounts, billing, and governance underneath both.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link to={etlLandingPath} className={primaryLinkClass} data-testid="launch-etl">
                Open ETL
                <Workflow className="h-4 w-4" />
              </Link>
              <Link to={stoqrLandingPath} className={secondaryLinkClass} data-testid="launch-stoqr">
                Open StoQR
                <Boxes className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {proofPoints.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.75rem] border p-5 backdrop-blur"
                  style={{ borderColor: 'var(--opense-shell-border)', backgroundColor: 'var(--opense-shell-surface)', boxShadow: 'var(--opense-shell-shadow-card)' }}
                >
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-suiteNavy)]">{item.value}</div>
                  <div className="mt-2 text-sm text-[var(--color-body)]">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-[2rem] border p-6 backdrop-blur-xl"
            style={{
              borderColor: 'var(--opense-shell-border)',
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--color-card) 94%, transparent), color-mix(in srgb, var(--color-card) 78%, transparent))',
              boxShadow: 'var(--opense-shell-shadow-lg)',
            }}
          >
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
              <span>Suite map</span>
              <span className="rounded-full bg-[var(--color-foreground)] px-3 py-1 text-[var(--color-background)]">Live redirects</span>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-[1.5rem] bg-[var(--color-suiteNavy)] p-5 text-[var(--color-background)] shadow-lg">
                <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-primary-light)]">
                  <Users className="h-4 w-4" />
                  Accounts
                </div>
                <p className="mt-4 text-sm leading-6 text-[color:color-mix(in_srgb,var(--color-background)_82%,transparent)]">
                  Central entry for sign-in, sign-up, onboarding, and return routing back into the correct app surface.
                </p>
              </div>

              {productCards.map((product) => {
                const Icon = product.icon

                return (
                    <Link
                    key={product.name}
                      to={product.href}
                    className="group relative overflow-hidden rounded-[1.5rem] border p-5 transition-transform duration-200 hover:-translate-y-1"
                    style={{ borderColor: 'var(--opense-shell-border)', backgroundColor: 'var(--color-card)', boxShadow: 'var(--opense-shell-shadow-card)' }}
                  >
                    <div className="absolute inset-x-0 top-0 h-28" style={{ background: product.accent }} />
                    <div className="relative flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">{product.eyebrow}</div>
                        <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--color-suiteNavy)]">{product.name}</div>
                      </div>
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-foreground)] text-[var(--color-background)] shadow-lg">
                        <Icon className="h-5 w-5" />
                      </span>
                    </div>

                    <p className="relative mt-4 text-sm leading-6 text-[var(--color-body)]">{product.description}</p>

                    <div className="relative mt-4 flex flex-wrap gap-2">
                      {product.bullets.map((bullet) => (
                        <span key={bullet} className="rounded-full border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-1 text-xs font-medium text-[var(--color-body)]">
                          {bullet}
                        </span>
                      ))}
                    </div>

                    <div className="relative mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-suiteNavy)]">
                      Enter app
                      <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        <section id="products" className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div className="max-w-2xl">
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">Product pages</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-suiteNavy)] md:text-5xl">
                OpenSe stays suite-level. ETL and StoQR keep their own landing pages.
              </h2>
              <p className="mt-4 text-base leading-7 text-[var(--color-body)] md:text-lg">
                This page explains how the suite fits together. Open-ETL and Open-StoQR now keep their original standalone entry pages inside their own apps, so product-specific onboarding and storytelling stay with the product they describe.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {productCards.map((product) => {
                const Icon = product.icon

                return (
                  <article
                    key={product.name}
                    className="rounded-[1.8rem] border p-6 backdrop-blur-xl"
                    style={{ borderColor: 'var(--opense-shell-border)', backgroundColor: 'var(--opense-shell-surface-strong)', boxShadow: 'var(--opense-shell-shadow)' }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">Standalone product page</div>
                        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--color-suiteNavy)]">{product.name}</h3>
                      </div>
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-foreground)] text-[var(--color-background)] shadow-lg">
                        <Icon className="h-5 w-5" />
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-[var(--color-body)]">{product.description}</p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {product.bullets.map((bullet) => (
                        <span key={bullet} className="rounded-full border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-1 text-xs font-medium text-[var(--color-body)]">
                          {bullet}
                        </span>
                      ))}
                    </div>

                    <a href={product.href} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-suiteNavy)]">
                      Open product page
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section id="platform" className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-16">
          <div
            className="rounded-[2.25rem] border p-8 backdrop-blur-xl md:p-10"
            style={{ borderColor: 'var(--opense-shell-border)', backgroundColor: 'var(--opense-shell-surface)', boxShadow: 'var(--opense-shell-shadow-lg)' }}
          >
            <div className="max-w-2xl">
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">Platform layer</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-suiteNavy)] md:text-5xl">
                Shared capabilities that make the suite feel like one system instead of separate launches.
              </h2>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {sharedCapabilities.map((capability) => {
                const Icon = capability.icon

                return (
                  <article key={capability.title} className="rounded-[1.6rem] border border-[var(--color-border)] bg-[var(--color-muted)] p-5">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-suiteNavy)] text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 text-lg font-semibold tracking-[-0.03em] text-[var(--color-suiteNavy)]">{capability.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[var(--color-body)]">{capability.description}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section id="architecture" className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">Architecture</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-suiteNavy)] md:text-5xl">
                Redirects are part of the product flow, not incidental plumbing.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-[var(--color-body)]">
                This suite uses Accounts as the shared identity layer. Guests are routed into the appropriate auth flow for the app they choose, while authenticated users move directly into each product dashboard.
              </p>
            </div>

            <div className="grid gap-4">
              {operatingModel.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-[1.6rem] border p-5"
                  style={{ borderColor: 'var(--opense-shell-border)', backgroundColor: 'var(--opense-shell-surface-strong)', boxShadow: 'var(--opense-shell-shadow-card)' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-foreground)] text-sm font-semibold text-[var(--color-background)]">
                      {index + 1}
                    </span>
                    <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--color-suiteNavy)]">{step.title}</h3>
                  </div>
                  <p className="mt-3 pl-13 text-sm leading-6 text-[var(--color-body)]">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:pb-24">
          <div
            className="overflow-hidden rounded-[2.5rem] p-8 text-[var(--color-background)] md:p-12"
            style={{
              background:
                'linear-gradient(135deg, var(--color-foreground), color-mix(in srgb, var(--color-foreground) 84%, var(--color-primary) 16%) 48%, var(--color-secondary) 135%)',
              boxShadow: 'var(--opense-shell-shadow-hero)',
            }}
          >
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-primary-light)]">
                <FileText className="h-4 w-4" />
                Suite entry point
              </div>
              <h2 className="mt-6 text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
                Start in OpenSe, then move into the right app for the job.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[color:color-mix(in_srgb,var(--color-background)_82%,transparent)]">
                Use this surface to understand the suite, create an account, and enter the correct workflow. ETL and StoQR stay focused. OpenSe explains how they fit together.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href="/register" className="inline-flex items-center gap-2 rounded-full bg-[var(--color-background)] px-5 py-3 text-sm font-semibold text-[var(--color-foreground)]">
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </a>
                <Link to={etlLandingPath} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-[var(--color-background)] backdrop-blur">
                  Open ETL
                  <Workflow className="h-4 w-4" />
                </Link>
                <Link to={stoqrLandingPath} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-[var(--color-background)] backdrop-blur">
                  Open StoQR
                  <Boxes className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}