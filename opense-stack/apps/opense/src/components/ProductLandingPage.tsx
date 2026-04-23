import { LANDING_NAVBAR_OFFSET } from '@repo/ui'
import type { LucideIcon } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { LandingContext } from '../lib/authRedirect'
import { buildNavbarGetStartedPath, setActiveLandingContext } from '../lib/authRedirect'
import { MarketingFooter } from './MarketingFooter'
import { MarketingPageFrame } from './MarketingPageFrame'

export interface ProductLandingFeature {
  title: string
  description: string
  icon: LucideIcon
}

interface ProductLandingPageProps {
  landingContext: Exclude<LandingContext, 'opense'>
  background: ReactNode
  heroIcon: LucideIcon
  iconClassName: string
  title: string
  subtitle: string
  subtitleStyle?: CSSProperties
  description: string
  features: ProductLandingFeature[]
  ctaPanelStyle: CSSProperties
  ctaIcon: LucideIcon
  ctaTitle: string
  ctaDescription: string
  ctaLabel: string
  ctaTestId: string
}

export const ProductLandingPage = ({
  landingContext,
  background,
  heroIcon: HeroIcon,
  iconClassName,
  title,
  subtitle,
  subtitleStyle,
  description,
  features,
  ctaPanelStyle,
  ctaIcon: CtaIcon,
  ctaTitle,
  ctaDescription,
  ctaLabel,
  ctaTestId,
}: ProductLandingPageProps) => {
  const ctaHref = buildNavbarGetStartedPath(landingContext)

  useEffect(() => {
    setActiveLandingContext(landingContext)
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [landingContext])

  return (
    <MarketingPageFrame background={background}>
      <section
        className="mx-auto max-w-5xl px-6 pb-8 text-center"
        style={{ paddingTop: `calc(${LANDING_NAVBAR_OFFSET} + 4rem)` }}
      >
        <div className="flex justify-center">
          <span className={iconClassName}>
            <HeroIcon className="h-5 w-5" />
          </span>
        </div>

        <h1 className="mt-6 text-5xl font-semibold tracking-[-0.06em] text-[var(--color-heading)] sm:text-6xl md:text-7xl">
          {title}
        </h1>

        <p className="mt-5 text-xl font-semibold md:text-2xl" style={subtitleStyle}>
          {subtitle}
        </p>

        <p className="mx-auto mt-6 max-w-4xl text-lg leading-8 text-[var(--color-body)] md:text-xl">{description}</p>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {features.map((card) => {
            const Icon = card.icon

            return (
              <article
                key={card.title}
                className="rounded-[1.35rem] border p-6"
                style={{
                  borderColor: 'var(--opense-shell-border)',
                  backgroundColor: 'color-mix(in srgb, var(--color-card) 88%, transparent)',
                  boxShadow: 'var(--opense-shell-shadow-card)',
                }}
              >
                <span className={iconClassName}>
                  <Icon className="h-5 w-5" />
                </span>

                <h2 className="mt-8 text-3xl font-semibold tracking-[-0.05em] text-[var(--color-heading)]">{card.title}</h2>

                <p className="mt-4 text-base leading-8 text-[var(--color-body)]">{card.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div
          className="rounded-[1.75rem] px-6 py-12 text-center md:px-10 md:py-14"
          style={{
            ...ctaPanelStyle,
            boxShadow: 'var(--opense-shell-shadow-lg)',
          }}
        >
          <div className="flex justify-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/90">
              <CtaIcon className="h-7 w-7" />
            </span>
          </div>

          <h2 className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">{ctaTitle}</h2>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-white/78">{ctaDescription}</p>

          <Link
            to={ctaHref}
            data-testid={ctaTestId}
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[var(--color-heading)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            {ctaLabel}
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </MarketingPageFrame>
  )
}