import { Activity, Code2, Database, LockKeyhole, ShieldCheck, UsersRound, Workflow } from 'lucide-react'
import { ProductLandingPage, type ProductLandingFeature } from '../components/ProductLandingPage'
import {
  EtlCodePreview,
  EtlGovernancePreview,
  EtlMonitoringPreview,
  EtlPersistencePreview,
  EtlPrivacyPreview,
  EtlWorkflowPreview,
  etlAnimationStyles,
} from './OpenEtlLandingPreviews'

const featureCards: ProductLandingFeature[] = [
  {
    title: 'Privacy-First Processing',
    description:
      'Source datasets are processed entirely in your browser using IndexedDB. Raw records are never sent to a third-party backend, ensuring compliance for biomedical and fintech workloads.',
    icon: ShieldCheck,
    preview: <EtlPrivacyPreview />,
  },
  {
    title: 'Visual Workflow Builder',
    description:
      'No-code and low-code pipeline authoring using React Flow. Drag, drop, and connect nodes to filter, sort, join, pivot, and transform your CSV data effortlessly.',
    icon: Workflow,
    preview: <EtlWorkflowPreview />,
  },
  {
    title: 'Local Browser Persistence',
    description:
      'Efficient local chunking and storage for large datasets during execution. Supabase is only used for saving workflow definitions and lightweight execution logs.',
    icon: Database,
    preview: <EtlPersistencePreview />,
  },
  {
    title: 'Team & Governance',
    description:
      'Multi-organization workspaces with role-aware collaboration. Keep personal workflows separate and enforce read-only protection for vital organization templates.',
    icon: UsersRound,
    preview: <EtlGovernancePreview />,
  },
  {
    title: 'Monitoring & Logs',
    description:
      'Detailed execution run logging with status, timing, and errors. Get workflow-level failure notifications pushed via Email, Slack, or webhooks.',
    icon: Activity,
    preview: <EtlMonitoringPreview />,
  },
  {
    title: 'Code Node Overrides',
    description:
      'Need something complex? Use the optional Code Node for controlled, custom JavaScript transformations right in the middle of your visual pipeline.',
    icon: Code2,
    preview: <EtlCodePreview />,
  },
]

const featureIconClass =
  'inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:color-mix(in_srgb,var(--color-primary-hover)_12%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary-light)_40%,white)] text-[var(--color-primary-hover)]'

export const OpenEtlLandingPage = () => {
  return (
    <>
      <style>{etlAnimationStyles}</style>

      <ProductLandingPage
        landingContext="etl"
        background={(
          <>
            <div className="absolute inset-0 bg-[var(--color-background)]" />
            <div
              className="absolute left-[-10rem] top-[-4rem] h-[24rem] w-[24rem] rounded-full blur-3xl"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary-light) 78%, white)' }}
            />
            <div
              className="absolute right-[-8rem] top-[16rem] h-[20rem] w-[20rem] rounded-full blur-3xl"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary-light) 45%, white)' }}
            />
          </>
        )}
        heroIcon={Database}
        iconClassName={featureIconClass}
        title="Open-ETL"
        subtitle="Centralized data workflows. Decentralized execution."
        subtitleStyle={{ color: 'var(--color-primary-hover)' }}
        description="Import, process, visualize, and export data with a powerful drag-and-drop interface. Designed specifically for privacy-sensitive sectors requiring strict data-minimization practices."
        features={featureCards}
        ctaPanelStyle={{ backgroundColor: 'color-mix(in srgb, var(--color-heading) 86%, #202610)' }}
        ctaIcon={LockKeyhole}
        ctaTitle="The Hybrid Data Model"
        ctaDescription="Workflow definitions, metadata, and analytics go to the cloud. Your actual CSV files and data transformations stay securely inside your browser's IndexedDB. Secure by design."
        ctaLabel="Start Building Workflows"
        ctaTestId="etl-start-building-workflows"
      />
    </>
  )
}