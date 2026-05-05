import { type ReactNode } from 'react'
import { Select } from '../ui/Input'
import { Button } from '../ui/Button'
import { StackLayout } from '../layout/StackLayout'

type OrganisationTeamsPageProps = {
  filterValue: string
  onFilterChange: (value: string) => void
  filterOptions: { value: string; label: string }[]
  canManageTeam: boolean
  onInviteClick?: () => void
  inviteLabel?: string
  inviteIcon?: ReactNode
  tableContent: ReactNode
  secondaryContent?: ReactNode
}

export function OrganisationTeamsPage({
  filterValue,
  onFilterChange,
  filterOptions,
  canManageTeam,
  onInviteClick,
  inviteLabel = 'Invite Member',
  inviteIcon,
  tableContent,
  secondaryContent,
}: OrganisationTeamsPageProps) {
  return (
    <StackLayout>
      <div className="overflow-hidden">
        <div className="flex flex-col items-center justify-between gap-4 border-b border-[var(--color-border)] px-4 py-4 sm:flex-row">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Select
              value={filterValue}
              onChange={(event) => onFilterChange(event.target.value)}
              options={filterOptions}
              className="min-w-36"
            />
          </div>

          {canManageTeam && onInviteClick && (
            <Button onClick={onInviteClick} className="w-full shadow-md shadow-blue-500/20 sm:w-auto">
              {inviteIcon}
              {inviteLabel}
            </Button>
          )}
        </div>

        <div>
          {tableContent}
        </div>
      </div>

      {secondaryContent}
    </StackLayout>
  )
}
