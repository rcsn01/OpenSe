import { type ReactNode } from 'react'
import { StackLayout } from '../layout/StackLayout'

type OrganisationTeamsShellProps = {
  toolbar?: ReactNode
  primaryContent: ReactNode
  secondaryContent?: ReactNode
  className?: string
}

export function OrganisationTeamsShell({
  toolbar,
  primaryContent,
  secondaryContent,
  className,
}: OrganisationTeamsShellProps) {
  return (
    <StackLayout className={className}>
      {toolbar}
      {secondaryContent ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>{primaryContent}</div>
          <div>{secondaryContent}</div>
        </div>
      ) : (
        primaryContent
      )}
    </StackLayout>
  )
}
