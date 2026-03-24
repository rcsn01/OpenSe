import type { CSSProperties } from 'react'
import { Code, Container, VStack } from '../components/ui'
import { Section, SubSection } from '../components/shared/PageSection'

type TypographyRole = {
  label: string
  token: string
  sample: string
  note?: string
  preview?: boolean
}

const roleStyle = (token: string): CSSProperties => ({
  fontSize: `var(--typography-${token}-size)`,
  lineHeight: `var(--typography-${token}-line-height)`,
  fontWeight: `var(--typography-${token}-weight)`,
  letterSpacing: `var(--typography-${token}-tracking)`,
  color: `var(--typography-${token}-color)`,
})

const groups: Array<{ title: string; roles: TypographyRole[] }> = [
  {
    title: 'Display and Headings',
    roles: [
      { label: 'Display 1', token: 'display-1', sample: 'Build once, scale forever.' },
      { label: 'Display 2', token: 'display-2', sample: 'Build once, scale forever.' },
      { label: 'Display 3', token: 'display-3', sample: 'Build once, scale forever.' },
      { label: 'Heading 1', token: 'heading-1', sample: 'System Overview' },
      { label: 'Heading 2', token: 'heading-2', sample: 'Inventory Health' },
      { label: 'Heading 3', token: 'heading-3', sample: 'Recent Activity' },
      { label: 'Heading 4', token: 'heading-4', sample: 'Top Movers' },
      { label: 'Heading 5', token: 'heading-5', sample: 'Suppliers' },
      { label: 'Heading 6', token: 'heading-6', sample: 'Filters' },
      { label: 'Subtitle Large', token: 'subtitle-large', sample: 'Clear context for the next action.' },
      { label: 'Subtitle Medium', token: 'subtitle-medium', sample: 'Clear context for the next action.' },
      { label: 'Subtitle Small', token: 'subtitle-small', sample: 'Clear context for the next action.' },
    ],
  },
  {
    title: 'Body and Text Utility',
    roles: [
      { label: 'Body 1', token: 'body-1', sample: 'Body copy for dense product explanations and long descriptions.' },
      { label: 'Body 2', token: 'body-2', sample: 'Body copy for dense product explanations and long descriptions.' },
      { label: 'Body 3', token: 'body-3', sample: 'Body copy for dense product explanations and long descriptions.' },
      { label: 'Body 4', token: 'body-4', sample: 'Body copy for dense product explanations and long descriptions.' },
      { label: 'Body 5', token: 'body-5', sample: 'Body copy for dense product explanations and long descriptions.' },
      { label: 'Body 6', token: 'body-6', sample: 'Body copy for dense product explanations and long descriptions.' },
      { label: 'Body Strong', token: 'body-strong', sample: 'Important value changed by +18%.' },
      { label: 'Body Emphasis', token: 'body-emphasis', sample: 'Reminder: rotate API keys monthly.' },
      { label: 'Muted Body', token: 'muted-body', sample: 'Last synced 5 minutes ago.' },
      { label: 'Caption', token: 'caption', sample: 'Updated automatically from warehouse scanners.' },
      { label: 'Overline', token: 'overline', sample: 'SECTION LABEL' },
      { label: 'Legal Fine Print', token: 'legal-fine-print', sample: 'By continuing, you agree to terms and privacy policy.' },
    ],
  },
  {
    title: 'Forms and Inputs',
    roles: [
      { label: 'Label Large', token: 'label-large', sample: 'Organization Name' },
      { label: 'Label Medium', token: 'label-medium', sample: 'Email Address' },
      { label: 'Label Small', token: 'label-small', sample: 'Optional' },
      { label: 'Field Label', token: 'field-label', sample: 'Password' },
      { label: 'Field Help Text', token: 'field-help-text', sample: 'Use at least 12 characters.' },
      { label: 'Field Placeholder', token: 'field-placeholder', sample: 'example@company.com' },
      { label: 'Validation Error Text', token: 'validation-error-text', sample: 'Email format is invalid.' },
      { label: 'Validation Success Text', token: 'validation-success-text', sample: 'Looks good.' },
    ],
  },
  {
    title: 'Links and Controls',
    roles: [
      { label: 'Link Default', token: 'link-default', sample: 'View details' },
      { label: 'Link Hover', token: 'link-hover', sample: 'View details' },
      { label: 'Link Visited', token: 'link-visited', sample: 'View details' },
      { label: 'Link Inverse', token: 'link-inverse', sample: 'View details' },
      { label: 'Button Text Large', token: 'button-text-large', sample: 'Create Workspace' },
      { label: 'Button Text Medium', token: 'button-text-medium', sample: 'Save Changes' },
      { label: 'Button Text Small', token: 'button-text-small', sample: 'Retry' },
      { label: 'Badge Text', token: 'badge-text', sample: 'ACTIVE' },
      { label: 'Chip Text', token: 'chip-text', sample: 'Warehouse A' },
      { label: 'Keyboard Key Text', token: 'keyboard-key-text', sample: 'Ctrl + K' },
    ],
  },
  {
    title: 'Data and Tables',
    roles: [
      { label: 'Table Header Text', token: 'table-header-text', sample: 'PRODUCT NAME' },
      { label: 'Table Cell Text', token: 'table-cell-text', sample: 'Wireless Barcode Scanner' },
      { label: 'Table Numeric Cell Text', token: 'table-numeric-cell-text', sample: '12,845' },
      { label: 'Data Metric Large', token: 'data-metric-large', sample: '98.6%' },
      { label: 'Data Metric Medium', token: 'data-metric-medium', sample: '1,284' },
      { label: 'Data Metric Small', token: 'data-metric-small', sample: '$42,810' },
      { label: 'Stat Delta Positive', token: 'stat-delta-positive', sample: '+14.2%' },
      { label: 'Stat Delta Negative', token: 'stat-delta-negative', sample: '-3.8%' },
      { label: 'Monospace Numeric', token: 'monospace-numeric', sample: '000123.4500' },
    ],
  },
  {
    title: 'Navigation and App Chrome',
    roles: [
      { label: 'Navigation Primary', token: 'navigation-primary', sample: 'Dashboard' },
      { label: 'Navigation Secondary', token: 'navigation-secondary', sample: 'Settings' },
      { label: 'Sidebar Section Label', token: 'sidebar-section-label', sample: 'OPERATIONS' },
      { label: 'Breadcrumb Text', token: 'breadcrumb-text', sample: 'Inventory / Products / Details' },
      { label: 'Tooltip Text', token: 'tooltip-text', sample: 'Copied to clipboard' },
    ],
  },
  {
    title: 'Containers and Feedback',
    roles: [
      { label: 'Toast Title', token: 'toast-title', sample: 'Update completed' },
      { label: 'Toast Body', token: 'toast-body', sample: 'All 42 records were synchronized.' },
      { label: 'Modal Title', token: 'modal-title', sample: 'Invite Team Members' },
      { label: 'Modal Body', token: 'modal-body', sample: 'Choose a role for each invited member.' },
      { label: 'Card Title', token: 'card-title', sample: 'Stock Forecast' },
      { label: 'Card Body', token: 'card-body', sample: 'Predicted 7-day demand based on recent movement.' },
      { label: 'Empty State Title', token: 'empty-state-title', sample: 'No Products Yet' },
      { label: 'Empty State Body', token: 'empty-state-body', sample: 'Create your first product to start tracking inventory.' },
      { label: 'Loading Skeleton Text', token: 'loading-skeleton-text', sample: 'Loading data...' },
    ],
  },
  {
    title: 'Code and Technical',
    roles: [
      { label: 'Code Inline', token: 'code-inline', sample: 'const seats = 25' },
      { label: 'Code Block', token: 'code-block', sample: 'SELECT * FROM inventory.products;' },
      { label: 'Terminal Text', token: 'terminal-text', sample: '$ pnpm dev --filter stoqr' },
      { label: 'Truncation Ellipsis', token: 'truncation-ellipsis', sample: 'This is a very long value that should be truncated...' },
    ],
  },
  {
    title: 'Non-Visual Utility',
    roles: [
      {
        label: 'Screen Reader Utility Text',
        token: 'screen-reader-utility',
        sample: 'Announce-only text (non-visual token).',
        preview: false,
        note: 'Use this token for accessibility-only text styles (visually hidden patterns).',
      },
    ],
  },
]

export function TypographyPage() {
  return (
    <Container size="lg" className="py-8">
      <Section title="Typography">
        {groups.map((group) => (
          <SubSection key={group.title} title={group.title}>
            <VStack>
              {group.roles.map((role) => (
                <div key={role.token} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-[var(--color-foreground)]">{role.label}</div>
                    <Code>{`--typography-${role.token}-*`}</Code>
                  </div>

                  {role.preview === false ? (
                    <div className="text-sm text-[var(--color-muted-foreground)]">{role.note ?? role.sample}</div>
                  ) : (
                    <div style={roleStyle(role.token)}>{role.sample}</div>
                  )}

                  <div className="mt-3 text-xs text-[var(--color-muted-foreground)]">
                    size: <Code>{`var(--typography-${role.token}-size)`}</Code>{' '}
                    line-height: <Code>{`var(--typography-${role.token}-line-height)`}</Code>{' '}
                    weight: <Code>{`var(--typography-${role.token}-weight)`}</Code>{' '}
                    tracking: <Code>{`var(--typography-${role.token}-tracking)`}</Code>{' '}
                    color: <Code>{`var(--typography-${role.token}-color)`}</Code>
                  </div>
                </div>
              ))}
            </VStack>
          </SubSection>
        ))}
      </Section>
    </Container>
  )
}
