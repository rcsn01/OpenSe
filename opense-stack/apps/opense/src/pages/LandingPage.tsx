import { LANDING_NAVBAR_OFFSET } from '@repo/ui'
import { ArrowRight, Boxes, CheckCircle2, Command, Database, Network, Workflow } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MarketingFooter } from '../components/MarketingFooter'
import { MarketingPageFrame } from '../components/MarketingPageFrame'
import { setActiveLandingContext } from '../lib/authRedirect'

const etlLandingPath = '/etl'
const stoqrLandingPath = '/stoqr'

const productCards = [
  {
    title: 'Open-ETL',
    description:
      'A visual, no-code workflow builder that processes your sensitive datasets locally in the browser. Say goodbye to exposing raw data to third-party backends.',
    href: etlLandingPath,
    icon: Database,
    accent: 'color-mix(in srgb, var(--color-primary-light) 74%, white)',
    bulletColor: 'var(--color-primary-hover)',
    ctaLabel: 'Learn more about ETL',
    bullets: [
      'Privacy-first browser processing',
      'Drag-and-drop React Flow builder',
      'Multi-organization role management',
    ],
  },
  {
    title: 'Open-StoQR',
    description:
      'Smart inventory tracking system with integrated QR/Barcode scanning, comprehensive reporting, and a custom label design studio.',
    href: stoqrLandingPath,
    icon: Boxes,
    accent: 'color-mix(in srgb, var(--color-warning-light) 68%, white)',
    bulletColor: 'var(--color-secondary)',
    ctaLabel: 'Learn more about StoQr',
    bullets: [
      'Camera-based QR/Barcode scanning',
      'Built-in Label Studio & Printing',
      'Automated low-stock alerts',
    ],
  },
] as const

const infrastructureHighlights = [
  {
    title: 'Postgres & Supabase',
    description:
      'Robust relational data modeling utilizing PostgreSQL with Row Level Security managed by Supabase.',
    icon: Database,
  },
  {
    title: 'Kubernetes Ready',
    description:
      'Designed for container orchestration. Easily deployable via K8s, K3s, or standard Docker and Portainer environments.',
    icon: Workflow,
  },
  {
    title: 'Monorepo Frontend',
    description:
      'Turbo Repo architecture powering high-performance, modular React applications for both ETL and StoQr.',
    icon: Network,
  },
] as const

const primaryLinkClass =
  'inline-flex items-center justify-center rounded-xl border border-transparent px-6 py-3 text-sm font-semibold transition-colors duration-200'

const secondaryLinkClass =
  'inline-flex items-center justify-center rounded-xl border px-6 py-3 text-sm font-semibold transition-colors duration-200'

export const LandingPage = () => {
  useEffect(() => {
    setActiveLandingContext('opense')
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  return (
    <MarketingPageFrame background={(
      <>
        <div className="absolute inset-0 bg-[var(--color-background)]" />
        <div
          className="absolute left-[-10rem] top-[-4rem] h-[26rem] w-[26rem] rounded-full blur-3xl"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary-light) 82%, white)' }}
        />
        <div
          className="absolute right-[-8rem] top-64 h-[22rem] w-[22rem] rounded-full blur-3xl"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-warning-light) 56%, white)' }}
        />
        <div
          className="absolute inset-x-0 top-0 h-[26rem]"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--color-primary-light) 42%, var(--color-background)) 0%, transparent 100%)',
          }}
        />
      </>
    )}>
        <section
          className="mx-auto max-w-5xl px-6 pb-8 text-center"
          style={{ paddingTop: `calc(${LANDING_NAVBAR_OFFSET} + 4.5rem)` }}
        >
          <h1 className="mx-auto max-w-4xl text-5xl font-semibold leading-[0.94] tracking-[-0.065em] text-[var(--color-heading)] sm:text-6xl lg:text-[5.25rem]">
            The Open Source{' '}
            <span style={{ color: 'color-mix(in srgb, var(--color-primary-hover) 78%, var(--color-heading))' }}>
              SaaS Stack
            </span>{' '}
            for Modern Teams
          </h1>

          <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-[var(--color-body)] md:text-xl">
            Empower your organization with enterprise-grade, privacy-first tools. Deploy Open-ETL for secure data
            processing and Open-StoQr for intelligent inventory management, all with zero vendor lock-in.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to={etlLandingPath}
              data-testid="launch-etl"
              className={primaryLinkClass}
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-primary-light) 88%, white)',
                color: 'var(--color-heading)',
                boxShadow: 'var(--opense-shell-shadow-card)',
              }}
            >
              Explore Open-ETL
            </Link>
            <Link
              to={stoqrLandingPath}
              data-testid="launch-stoqr"
              className={secondaryLinkClass}
              style={{
                borderColor: 'var(--opense-shell-border-strong)',
                backgroundColor: 'color-mix(in srgb, var(--color-card) 84%, transparent)',
                color: 'var(--color-heading)',
              }}
            >
              Explore Open-StoQR
            </Link>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-6 py-12 lg:grid-cols-2">
          {productCards.map((card) => {
            const Icon = card.icon

            return (
              <article
                key={card.title}
                className="relative overflow-hidden rounded-[1.7rem] border p-8 backdrop-blur"
                style={{
                  borderColor: 'var(--opense-shell-border)',
                  backgroundColor: 'color-mix(in srgb, var(--color-card) 88%, transparent)',
                  boxShadow: 'var(--opense-shell-shadow-card)',
                }}
              >
                <div
                  className="absolute right-[-2rem] top-[-2rem] h-28 w-28 rounded-full"
                  style={{ backgroundColor: card.accent }}
                />

                <span
                  className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border"
                  style={{ borderColor: 'var(--opense-shell-border)', color: card.bulletColor }}
                >
                  <Icon className="h-6 w-6" />
                </span>

                <h2 className="relative mt-8 text-4xl font-semibold tracking-[-0.05em] text-[var(--color-heading)]">
                  {card.title}
                </h2>

                <p className="relative mt-4 max-w-xl text-lg leading-8 text-[var(--color-body)]">{card.description}</p>

                <ul className="relative mt-8 space-y-3">
                  {card.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-3 text-[var(--color-foreground)]">
                      <span
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border"
                        style={{
                          borderColor: 'color-mix(in srgb, var(--color-border) 82%, transparent)',
                          color: card.bulletColor,
                        }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-base">{bullet}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={card.href}
                  className="relative mt-10 inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-colors duration-200"
                  style={{
                    borderColor: 'var(--opense-shell-border-strong)',
                    backgroundColor: 'rgba(255,255,255,0.72)',
                    color: 'var(--color-heading)',
                  }}
                >
                  {card.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            )
          })}
        </section>

        <section className="mx-auto max-w-6xl px-6 py-12">
          <div
            className="rounded-[2rem] border p-8 md:p-10"
            style={{
              borderColor: 'var(--opense-shell-border)',
              backgroundColor: 'color-mix(in srgb, var(--color-card) 80%, transparent)',
              boxShadow: 'var(--opense-shell-shadow-card)',
            }}
          >
            <div className="flex justify-center">
              <span
                className="inline-flex h-14 w-14 items-center justify-center rounded-full border"
                style={{
                  borderColor: 'var(--opense-shell-border)',
                  backgroundColor: 'rgba(255,255,255,0.86)',
                  color: 'var(--color-heading)',
                }}
              >
                <Command className="h-7 w-7" />
              </span>
            </div>

            <h2 className="mt-6 text-center text-4xl font-semibold tracking-[-0.05em] text-[var(--color-heading)] md:text-5xl">
              Own Your Infrastructure
            </h2>

            <p className="mx-auto mt-5 max-w-3xl text-center text-lg leading-8 text-[var(--color-body)]">
              OpenSe is built on an open architecture. Whether you want to use our managed cloud or deploy entirely on
              your own K8s/Docker infrastructure, you remain in complete control.
            </p>

            <div
              className="mt-10 rounded-[1.5rem] border p-5"
              style={{
                borderColor: 'var(--opense-shell-border)',
                backgroundColor: 'rgba(255,255,255,0.58)',
              }}
            >
              <div
                className="rounded-[1.25rem] border border-dashed px-6 py-10"
                style={{ borderColor: 'color-mix(in srgb, var(--color-border) 92%, transparent)' }}
              >
                <div className="mx-auto grid max-w-[10rem] place-items-center gap-1 text-center text-sm leading-6 text-[var(--color-muted-foreground)]">
                  <span>System</span>
                  <span>Design</span>
                  <span>Architecture</span>
                  <span>Diagram</span>
                  <span>(System Design.svg)</span>
                </div>
              </div>
            </div>

            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {infrastructureHighlights.map((item) => {
                const Icon = item.icon

                return (
                  <article key={item.title} className="flex items-start gap-4">
                    <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/75 text-[var(--color-primary-hover)] shadow-sm">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--color-heading)]">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-body)]">{item.description}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <MarketingFooter className="mt-16" />
    </MarketingPageFrame>
  )
}
