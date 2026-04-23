import { Link } from 'react-router-dom'

export interface MarketingFooterColumn {
  title: string
  items: Array<{
    label: string
    href?: string
  }>
}

const defaultColumns: MarketingFooterColumn[] = [
  {
    title: 'Products',
    items: [
      { label: 'Open-ETL', href: '/etl' },
      { label: 'Open-StoQr', href: '/stoqr' },
    ],
  },
  {
    title: 'Resources',
    items: [{ label: 'Documentation' }, { label: 'GitHub Repository' }, { label: 'API Reference' }],
  },
  {
    title: 'Legal',
    items: [{ label: 'Privacy Policy' }, { label: 'Terms of Service' }, { label: 'License' }],
  },
]

interface MarketingFooterProps {
  className?: string
  columns?: MarketingFooterColumn[]
}

export const MarketingFooter = ({ className = 'mt-14', columns = defaultColumns }: MarketingFooterProps) => {
  return (
    <footer className={[className, 'border-t'].join(' ')} style={{ borderColor: 'var(--opense-shell-border)', backgroundColor: 'rgba(255,255,255,0.62)' }}>
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-10 md:grid-cols-[1.2fr_repeat(3,minmax(0,0.72fr))]">
        <div>
          <div className="flex items-center gap-3 text-xl font-semibold text-[var(--color-heading)]">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[color:color-mix(in_srgb,var(--color-primary-hover)_18%,white)] text-xs font-bold uppercase text-[var(--color-primary-hover)]">
              OS
            </span>
            <span>OpenSe</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-6 text-[var(--color-body)]">
            The open source SaaS stack for modern organizations. Built by Chu-Cheng Yu for Studio Project.
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <h3 className="text-sm font-semibold text-[var(--color-heading)]">{column.title}</h3>
            <ul className="mt-4 space-y-3 text-sm text-[var(--color-body)]">
              {column.items.map((item) => (
                <li key={item.label}>
                  {item.href ? (
                    <Link to={item.href} className="transition-colors duration-200 hover:text-[var(--color-heading)]">
                      {item.label}
                    </Link>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t px-6 py-4 text-center text-sm text-[var(--color-muted-foreground)]" style={{ borderColor: 'var(--opense-shell-border)' }}>
        © 2026 OpenSe Project. All rights reserved. UTS Studio.
      </div>
    </footer>
  )
}