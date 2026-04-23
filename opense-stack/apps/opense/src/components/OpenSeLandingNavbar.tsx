import { LandingNavbar, type LandingNavbarLink } from '@repo/ui'
import { Network } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { buildNavbarGetStartedPath, getLandingContextFromPathname } from '../lib/authRedirect'

const suiteLinks: LandingNavbarLink[] = [
  { label: 'Open-ETL', href: '/etl', testId: 'nav-open-etl-product' },
  { label: 'Open-StoQR', href: '/stoqr', testId: 'nav-open-stoqr-product' },
]

const navActionClass =
  'group relative inline-flex items-center justify-center overflow-hidden rounded-full px-5 py-2 text-sm font-medium transition-transform duration-200 hover:-translate-y-px'

const renderGetStartedLink = (href: string, options?: { className?: string; onClick?: () => void }) => (
  <Link
    to={href}
    data-testid="nav-get-started"
    className={[navActionClass, options?.className].filter(Boolean).join(' ')}
    onClick={options?.onClick}
    style={{
      backgroundColor: 'var(--color-suiteNavy)',
      color: 'var(--color-background)',
      boxShadow: 'var(--opense-shell-shadow-card)',
    }}
  >
    <span className="absolute inset-0 z-0 h-full w-full translate-y-full bg-black/20 transition-transform duration-300 ease-out group-hover:translate-y-0" />
    <span className="relative z-10" style={{ color: 'inherit' }}>
      Get Started
    </span>
  </Link>
)

const renderSuiteLink = (link: LandingNavbarLink, options: { className?: string; onClick?: () => void }) => (
  <Link
    key={`${link.label}-${link.href}`}
    to={link.href}
    data-testid={link.testId}
    className={options.className}
    onClick={options.onClick}
  >
    {link.label}
  </Link>
)

export const OpenSeLandingNavbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const landingContext = getLandingContextFromPathname(location.pathname)
  const getStartedHref = buildNavbarGetStartedPath(landingContext)

  return (
    <LandingNavbar
      as="nav"
      brand={(
        <Link to="/" data-testid="nav-opense-product" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10">
            <Network className="h-5 w-5" />
          </span>
          <span>OpenSe</span>
        </Link>
      )}
      links={suiteLinks}
      actions={(
        <div className="hidden items-center md:flex">
          {renderGetStartedLink(getStartedHref)}
        </div>
      )}
      renderLink={renderSuiteLink}
      mobileMenu={{
        open: mobileOpen,
        onToggle: () => setMobileOpen((open) => !open),
        items: suiteLinks,
        action: renderGetStartedLink(getStartedHref, {
          className: 'w-full justify-center',
          onClick: () => setMobileOpen(false),
        }),
      }}
    />
  )
}