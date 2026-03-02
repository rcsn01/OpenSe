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
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={filterValue}
            onChange={(event) => onFilterChange(event.target.value)}
            options={filterOptions}
            className="min-w-36"
          />
        </div>

        {canManageTeam && onInviteClick && (
          <Button onClick={onInviteClick} className="w-full sm:w-auto shadow-md shadow-blue-500/20">
            {inviteIcon}
            {inviteLabel}
          </Button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {tableContent}
      </div>

      {secondaryContent}
    </StackLayout>
  )
}
