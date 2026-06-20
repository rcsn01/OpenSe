import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Badge, Button, EmptyState, Input, Select, Textarea } from '@repo/ui'
import { Inbox, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import { useOrganisation } from '../contexts/OrganisationContext'
import { useCreateIntake, useCreateIntakeIssue, useIntakeIssues, useIntakes, useUpdateIntakeIssueStatus } from '../hooks/queries/useIntake'
import { useProjects } from '../hooks/queries/useProjects'
import type { IntakeIssueStatus, IntakeStatus } from '../types'

const intakeStatusOptions: Array<{ value: IntakeStatus; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
]

const intakeIssueStatusTone: Record<IntakeIssueStatus, 'neutral' | 'success' | 'danger' | 'warning'> = {
  submitted: 'neutral',
  accepted: 'success',
  declined: 'danger',
  snoozed: 'warning',
}

const isIntakeIssueStatus = (value: string | null): value is IntakeIssueStatus =>
  value === 'submitted' || value === 'accepted' || value === 'declined' || value === 'snoozed'

export const IntakePage = () => {
  const { organisationId } = useOrganisation()
  const { data: projects = [], isLoading: projectsLoading } = useProjects(organisationId)
  const { data: intakes = [], isLoading: intakesLoading } = useIntakes(organisationId)
  const { data: intakeIssues = [], isLoading: issuesLoading } = useIntakeIssues(organisationId)
  const createIntake = useCreateIntake()
  const createIntakeIssue = useCreateIntakeIssue()
  const updateStatus = useUpdateIntakeIssueStatus()
  const [queueProjectId, setQueueProjectId] = useState('')
  const [queueTitle, setQueueTitle] = useState('')
  const [queueDescription, setQueueDescription] = useState('')
  const [queueStatus, setQueueStatus] = useState<IntakeStatus>('open')
  const [requestIntakeId, setRequestIntakeId] = useState('')
  const [requestTitle, setRequestTitle] = useState('')
  const [requestDescription, setRequestDescription] = useState('')

  const selectedIntake = useMemo(
    () => intakes.find((intake) => intake.id === requestIntakeId) ?? intakes[0],
    [intakes, requestIntakeId],
  )

  const handleCreateQueue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const projectId = queueProjectId || projects[0]?.id
    if (!organisationId || !projectId || !queueTitle.trim()) return

    try {
      const intake = await createIntake.mutateAsync({
        organisation_id: organisationId,
        project_id: projectId,
        title: queueTitle,
        description_text: queueDescription,
        status: queueStatus,
      })
      setQueueTitle('')
      setQueueDescription('')
      setRequestIntakeId(intake.id)
      toast.success('Intake queue created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create intake queue')
    }
  }

  const handleCreateRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!organisationId || !selectedIntake?.id || !selectedIntake.project_id || !requestTitle.trim()) return

    try {
      await createIntakeIssue.mutateAsync({
        organisation_id: organisationId,
        project_id: selectedIntake.project_id,
        intake_id: selectedIntake.id,
        title: requestTitle,
        description_text: requestDescription,
      })
      setRequestTitle('')
      setRequestDescription('')
      toast.success('Intake request submitted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit intake request')
    }
  }

  const handleStatus = async (intakeIssueId: string, status: IntakeIssueStatus) => {
    if (!organisationId) return

    try {
      await updateStatus.mutateAsync({ organisationId, intakeIssueId, status })
      toast.success('Intake request updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update request')
    }
  }

  if (!projectsLoading && projects.length === 0) {
    return (
      <OpenKbPageShell>
        <EmptyState title="Create a project first" description="Intake queues are scoped to organisation projects." />
      </OpenKbPageShell>
    )
  }

  return (
    <OpenKbPageShell isLoading={projectsLoading || intakesLoading || issuesLoading}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">Intake</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Capture, review, and triage incoming work before it becomes planned issues.</p>
        </div>
        <Badge variant="neutral">{intakeIssues.length} requests</Badge>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-3">
          {intakeIssues.length === 0 ? (
            <EmptyState title="No intake requests" description="Submit a request to start triage." />
          ) : intakeIssues.map((item) => {
            const status = isIntakeIssueStatus(item.status) ? item.status : 'submitted'
            return (
              <article key={item.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={intakeIssueStatusTone[status]}>{status}</Badge>
                      <span className="text-xs text-[var(--color-muted-foreground)]">{item.intake?.title ?? item.intake?.name ?? 'Intake'}</span>
                    </div>
                    <h2 className="mt-3 line-clamp-2 text-base font-semibold">{item.title ?? item.name}</h2>
                    <p className="mt-2 line-clamp-3 text-sm text-[var(--color-muted-foreground)]">{item.description_text || 'No request details.'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => handleStatus(item.id, 'accepted')}>Accept</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => handleStatus(item.id, 'snoozed')}>Snooze</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => handleStatus(item.id, 'declined')}>Decline</Button>
                  </div>
                </div>
              </article>
            )
          })}
        </section>

        <aside className="space-y-5">
          <form onSubmit={handleCreateRequest} className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <h2 className="text-sm font-semibold">Submit request</h2>
            </div>
            <Select
              aria-label="Intake queue"
              className="border border-[var(--color-border)] bg-[var(--color-background)]"
              value={selectedIntake?.id ?? ''}
              onChange={(event) => setRequestIntakeId(event.target.value)}
              options={intakes.map((intake) => ({ value: intake.id, label: intake.title ?? intake.name ?? 'Untitled intake' }))}
              placeholder={intakes.length === 0 ? 'No queues yet' : undefined}
            />
            <Input value={requestTitle} onChange={(event) => setRequestTitle(event.target.value)} placeholder="Request title" required />
            <Textarea value={requestDescription} onChange={(event) => setRequestDescription(event.target.value)} placeholder="Context, customer, or expected outcome..." />
            <Button type="submit" className="w-full" loading={createIntakeIssue.isPending} disabled={!selectedIntake}>Submit request</Button>
          </form>

          <form onSubmit={handleCreateQueue} className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <h2 className="text-sm font-semibold">New queue</h2>
            </div>
            <Select
              aria-label="Queue project"
              className="border border-[var(--color-border)] bg-[var(--color-background)]"
              value={queueProjectId || projects[0]?.id || ''}
              onChange={(event) => setQueueProjectId(event.target.value)}
              options={projects.map((project) => ({ value: project.id, label: `${project.identifier} · ${project.name}` }))}
              required
            />
            <Input value={queueTitle} onChange={(event) => setQueueTitle(event.target.value)} placeholder="Customer feedback" required />
            <Select
              aria-label="Queue status"
              className="border border-[var(--color-border)] bg-[var(--color-background)]"
              value={queueStatus}
              onChange={(event) => setQueueStatus(event.target.value as IntakeStatus)}
              options={intakeStatusOptions}
            />
            <Textarea value={queueDescription} onChange={(event) => setQueueDescription(event.target.value)} placeholder="What belongs in this intake queue..." />
            <Button type="submit" className="w-full" loading={createIntake.isPending}>Create queue</Button>
          </form>
        </aside>
      </div>
    </OpenKbPageShell>
  )
}
