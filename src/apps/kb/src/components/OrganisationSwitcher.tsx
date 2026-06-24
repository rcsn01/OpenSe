import { Select } from '@repo/ui'
import { useOrganisation } from '../contexts/OrganisationContext'

export const OrganisationSwitcher = () => {
  const { organisationId, organisations, setOrganisationId } = useOrganisation()

  if (organisations.length <= 1) return null

  return (
    <Select
      aria-label="Select organisation"
      className="w-44 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
      value={organisationId ?? ''}
      onChange={(event) => setOrganisationId(event.target.value)}
      options={organisations.map((organisation) => ({
        value: organisation.id,
        label: organisation.name,
      }))}
    />
  )
}
