import {
  Activity,
  Bell,
  CheckCircle2,
  FileSpreadsheet,
  LayoutGrid,
  LockKeyhole,
  Search,
  ShieldCheck,
  UsersRound,
  Workflow,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  AppShellLayout,
  Body,
  Button,
  Divider,
  Heading,
  Input,
  SubLabel,
  SWITCHABLE_APP_ICONS,
  type AppShellNavGroup,
  type AppShellNavItem,
} from '@repo/ui'
import { Link, useLocation } from 'react-router-dom'
import { buildNavbarGetStartedPath, setActiveLandingContext } from '../lib/authRedirect'

type EtlShowcaseFeature = {
  title: string
  label: string
  eyebrow: string
  metric: string
  subMetric: string
  description: string
  icon: LucideIcon
  bullets: string[]
}

const ctaHref = buildNavbarGetStartedPath('etl')
const EtlBrandIcon = SWITCHABLE_APP_ICONS.etl

const showcaseFeatures: EtlShowcaseFeature[] = [
  {
    title: 'Privacy-First Processing',
    label: 'Privacy',
    eyebrow: 'DATA STAYS LOCAL',
    metric: '0',
    subMetric: 'raw files uploaded',
    description:
      'Open-ETL processes source datasets locally with IndexedDB-backed execution, so sensitive CSV records do not need to move through a third-party backend.',
    icon: ShieldCheck,
    bullets: [
      'Keep raw biomedical, financial, and operational records local.',
      'Use cloud services for workflow metadata, not source data.',
      'Reduce data exposure during imports, transforms, previews, and exports.',
    ],
  },
  {
    title: 'Visual Workflow Builder',
    label: 'Builder',
    eyebrow: 'PIPELINES AS A MAP',
    metric: '12',
    subMetric: 'core transform blocks',
    description:
      'Author repeatable data workflows with connected transform nodes for filtering, sorting, joining, pivoting, cleaning, and exporting structured CSV data.',
    icon: Workflow,
    bullets: [
      'Drag nodes into place and connect each transformation step.',
      'Combine no-code blocks with low-code control where needed.',
      'Make pipeline logic visible before anyone runs it.',
    ],
  },
  {
    title: 'Team & Governance',
    label: 'Governance',
    eyebrow: 'WORKSPACES & ROLES',
    metric: '4',
    subMetric: 'permission tiers',
    description:
      'Multi-organization workspaces separate personal work from team templates while role-aware access keeps important pipelines protected.',
    icon: UsersRound,
    bullets: [
      'Separate personal experiments from organization-approved workflows.',
      'Protect read-only templates used by multiple teams.',
      'Invite collaborators without exposing every operational surface.',
    ],
  },
  {
    title: 'Monitoring & Logs',
    label: 'Monitoring',
    eyebrow: 'RUN HISTORY',
    metric: '24/7',
    subMetric: 'workflow observability',
    description:
      'Track execution status, timing, warnings, and failures so teams can review pipeline health and act when an important workflow breaks.',
    icon: Activity,
    bullets: [
      'Record workflow-level status, duration, and error context.',
      'Route important failures through email, Slack, or webhooks.',
      'Review execution history without reopening source datasets.',
    ],
  },
]

const stats = [
  { label: 'Processing Model', value: 'Local', change: '+ privacy', note: 'Browser-first execution' },
  { label: 'Workflow Surface', value: 'Visual', change: '+ repeatable', note: 'Node-based authoring' },
  { label: 'Cloud Payload', value: 'Metadata', change: '+ governed', note: 'Definitions and logs' },
  { label: 'Raw Data Uploads', value: '0', change: 'required', note: 'Files stay client-side' },
]

const navHash = (title: string) => `#etl-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

const buildNavGroups = (): AppShellNavGroup[] => {
  const mainItems: AppShellNavItem[] = [
    { href: '#etl-overview', label: 'Overview', icon: <LayoutGrid className="h-5 w-5" /> },
    ...showcaseFeatures.slice(0, 2).map((feature) => {
      const Icon = feature.icon
      return { href: navHash(feature.title), label: feature.label, icon: <Icon className="h-5 w-5" /> }
    }),
  ]

  const workflowItems: AppShellNavItem[] = showcaseFeatures.slice(2).map((feature) => {
    const Icon = feature.icon
    return { href: navHash(feature.title), label: feature.label, icon: <Icon className="h-5 w-5" /> }
  })

  return [
    { category: 'main', items: mainItems },
    { title: 'WORKFLOW', items: workflowItems },
    {
      category: 'configuration',
      items: [
        { href: ctaHref, label: 'Deploy', icon: <LockKeyhole className="h-5 w-5" /> },
        { href: '#etl-hybrid-model', label: 'Alerts', icon: <Bell className="h-5 w-5" /> },
      ],
    },
  ]
}

const shellClassName = [
  'opense-theme-etl',
  '[--color-background:#fbfbf8]',
  '[--color-shell:#fbfbf8]',
  '[--color-card:#ffffff]',
  '[--color-foreground:#111827]',
  '[--color-heading:#111827]',
  '[--color-body:#7d8490]',
  '[--color-muted-foreground:#7d8490]',
  '[--color-border:#d9d9d2]',
  '[--color-border-hover:#c7c8bd]',
  '[--color-primary-light:#f3f5e8]',
  '[--color-primary-hover:#a9b77a]',
  '[--color-side-nav-active-bg:#cdd6ad]',
  '[--color-side-nav-active-foreground:#111827]',
  '[--radius-md:0.375rem]',
  '[--radius-lg:0.5rem]',
].join(' ')

const ScreenshotSlot = ({ title }: { title: string }) => (
  <div
    data-testid="etl-feature-media-placeholder"
    aria-label={`${title} screenshot placeholder`}
    className="min-h-[19rem] rounded-sm border border-dashed border-[var(--color-border)] bg-[linear-gradient(135deg,#ffffff_0%,#fbfcf7_52%,#f1f4e2_100%)] shadow-[0_18px_44px_rgba(17,24,39,0.08)] md:min-h-[27rem]"
  />
)

const SectionKicker = ({ children, className }: { children: ReactNode; className?: string }) => (
  <SubLabel as="p" className={['font-semibold uppercase tracking-[0.18em]', className].filter(Boolean).join(' ')}>
    {children}
  </SubLabel>
)

export const OpenEtlLandingPage = () => {
  const location = useLocation()
  const [activeHash, setActiveHash] = useState(() => window.location.hash || '#etl-overview')
  const navGroups = useMemo(() => buildNavGroups(), [])

  useEffect(() => {
    setActiveLandingContext('etl')
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  useEffect(() => {
    const updateHash = () => setActiveHash(window.location.hash || '#etl-overview')
    updateHash()
    window.addEventListener('hashchange', updateHash)
    return () => window.removeEventListener('hashchange', updateHash)
  }, [location.hash])

  return (
    <AppShellLayout
      brand={{ icon: <EtlBrandIcon className="h-5 w-5" />, name: 'Open-ETL', version: 'v1.0' }}
      navGroups={navGroups}
      currentPath={activeHash}
      className={shellClassName}
      mobileBreakpoint={767}
      searchContent={(
        <div className="w-full max-w-4xl">
          <Input
            aria-label="Search workflows"
            placeholder="Search workflows..."
            prefix={<Search className="h-5 w-5" />}
            readOnly
            className="h-14 rounded-md bg-white text-xl"
          />
        </div>
      )}
      renderNavLink={(item, { className, children }) => {
        if (item.href.startsWith('#')) {
          return (
            <a href={item.href} className={className}>
              {children}
            </a>
          )
        }

        return (
          <Link to={item.href} className={className}>
            {children}
          </Link>
        )
      }}
    >
      <section id="etl-overview" className="px-6 py-10 md:px-10 lg:px-14">
        <div className="grid gap-10 xl:grid-cols-[1fr_31rem]">
          <div>
            <SectionKicker>Open source data operations</SectionKicker>
            <Heading level="h1" className="mt-5 max-w-4xl whitespace-nowrap text-5xl md:text-6xl 2xl:text-7xl">
              Open-ETL
            </Heading>
            <Heading
              level="h3"
              className="mt-4 max-w-4xl text-2xl font-semibold leading-tight md:text-3xl"
              style={{ color: 'var(--color-primary-hover)' }}
            >
              Centralized data workflows. Decentralized execution.
            </Heading>
            <Body size="body1" muted className="mt-7 max-w-4xl">
              Import, process, visualize, and export data with a workflow surface designed for privacy-sensitive teams that still need repeatable, collaborative data operations.
            </Body>
          </div>

          <div className="flex items-start xl:justify-end">
            <Link to={ctaHref} data-testid="etl-start-building-workflows">
              <Button className="min-w-48 bg-[var(--color-foreground)] text-white">
                Start Building Workflows
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-12 grid border-b border-[var(--color-border)] pb-10 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="py-5 md:pr-10">
              <Body as="p" size="body2" muted className="font-semibold">{stat.label}</Body>
              <Heading level="h3" className="mt-4 text-4xl">{stat.value}</Heading>
              <SubLabel as="p" className="mt-5 text-lg font-semibold normal-case tracking-normal text-[#4da564]">
                <span aria-hidden="true">↗</span> {stat.change}
              </SubLabel>
              <Body as="p" size="body2" muted className="mt-5">{stat.note}</Body>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SectionKicker className="text-xl">Workflow preview</SectionKicker>
            <div className="flex items-center gap-5">
              <SectionKicker>Import</SectionKicker>
              <SectionKicker>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-[var(--color-foreground)]" />
                  Transform
                </span>
              </SectionKicker>
              <SectionKicker>Export</SectionKicker>
            </div>
          </div>
          <div className="mt-8">
            <ScreenshotSlot title="Open-ETL workflow overview" />
          </div>
        </div>
      </section>

      {showcaseFeatures.map((feature) => {
        const Icon = feature.icon

        return (
          <section
            key={feature.title}
            id={navHash(feature.title).slice(1)}
            className="border-t border-[var(--color-border)] px-6 py-14 md:px-10 lg:px-14"
          >
            <div className="grid gap-12 xl:grid-cols-[minmax(0,0.82fr)_minmax(30rem,1.18fr)]">
              <div>
                <div className="flex items-center gap-4">
                  <span className="grid h-11 w-11 place-items-center rounded-sm border border-[var(--color-border)] bg-[var(--color-primary-light)] text-[var(--color-primary-hover)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <SectionKicker className="text-[var(--color-primary-hover)]">{feature.eyebrow}</SectionKicker>
                </div>

                <Heading level="h2" className="mt-7 max-w-xl text-4xl md:text-5xl">
                  {feature.title}
                </Heading>
                <Body size="body2" muted className="mt-5 max-w-2xl">{feature.description}</Body>

                <div className="mt-10 grid grid-cols-2 gap-8">
                  <div>
                    <Body as="p" size="body3" muted className="font-semibold">Signal</Body>
                    <Heading level="h3" className="mt-3 text-4xl">{feature.metric}</Heading>
                  </div>
                  <div>
                    <Body as="p" size="body3" muted className="font-semibold">Status</Body>
                    <SubLabel as="p" className="mt-4 text-lg font-semibold normal-case tracking-normal text-[#4da564]">
                      <span aria-hidden="true">↗</span> {feature.subMetric}
                    </SubLabel>
                  </div>
                </div>

                <div className="mt-12">
                  <SectionKicker className="text-lg">Actionable details</SectionKicker>
                  <ul className="mt-7 divide-y divide-[var(--color-border)]">
                    {feature.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-4 py-5">
                        <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#d0802a]" />
                        <Body as="span" size="body3">{bullet}</Body>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <ScreenshotSlot title={feature.title} />
            </div>
          </section>
        )
      })}

      <section id="etl-hybrid-model" className="border-t border-[var(--color-border)] px-6 py-16 md:px-10 lg:px-14">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <span className="grid h-12 w-12 place-items-center rounded-sm border border-[var(--color-border)] bg-[var(--color-primary-light)] text-[var(--color-primary-hover)]">
              <LockKeyhole className="h-6 w-6" />
            </span>
            <Heading level="h2" className="mt-7 max-w-xl text-4xl md:text-5xl">
              The hybrid data model
            </Heading>
          </div>
          <div>
            <Body size="body1" muted className="max-w-4xl">
              Workflow definitions, metadata, and analytics can go to the cloud while actual CSV files and transformations stay inside the browser.
            </Body>
            <Divider className="mt-10" />
            <div className="grid md:grid-cols-3">
              {['Definitions', 'Execution logs', 'Local file chunks'].map((item, index) => (
                <div key={item} className={`py-7 ${index > 0 ? 'md:border-l md:border-[var(--color-border)] md:pl-8' : ''}`}>
                  <FileSpreadsheet className="h-6 w-6 text-[var(--color-primary-hover)]" />
                  <Body as="p" size="body2" className="mt-4 font-semibold">{item}</Body>
                </div>
              ))}
            </div>
            <Divider />
            <Link to={ctaHref}>
              <Button className="mt-10 min-w-48 bg-[var(--color-foreground)] text-white">
                Start Building Workflows
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </AppShellLayout>
  )
}
