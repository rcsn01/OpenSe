import { useParams } from 'react-router-dom'
import { EmptyState } from '@repo/ui'
import { OpenKbPageShell } from '../../../components/OpenKbPageShell'
import { useOrganisation } from '../../../contexts/OrganisationContext'
import { useIssue } from '../../../hooks/queries/useIssues'
import { IssueDetailContent } from '../../../components/issues/issue-detail/IssueDetailContent'

export { IssueDetailContent } from '../../../components/issues/issue-detail/IssueDetailContent'
export const IssueDetailPage = () => {
  const { projectId, issueId } = useParams()
  const { organisationId } = useOrganisation()
  const { data: issue, isLoading } = useIssue(organisationId, issueId ?? null)

  if (!isLoading && (!issue || !projectId || issue.project_id !== projectId)) {
    return (
      <OpenKbPageShell>
        <EmptyState title="Task not found" description="The task was deleted or is outside your Open-KB access." />
      </OpenKbPageShell>
    )
  }

  return (
    <OpenKbPageShell isLoading={isLoading}>
      {issue && organisationId ? (
        <IssueDetailContent key={issue.id} issue={issue} organisationId={organisationId} />
      ) : null}
    </OpenKbPageShell>
  )
}
