import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, EmptyState, Input, Select, Textarea } from '@repo/ui'
import { toast } from 'sonner'
import { OpenKbPageShell } from '../../../components/OpenKbPageShell'
import { useOrganisation } from '../../../contexts/OrganisationContext'
import { useCreateCycle } from '../../../hooks/queries/usePlanning'
import { useProject } from '../../../hooks/queries/useProjects'
import { getProjectCyclePath, getProjectListPath } from '../../../lib/projectRoutes'
import type { CycleStatus } from '../../../types'

const statusOptions: Array<{ value: CycleStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const NewCyclePage = () => {
  const navigate = useNavigate()
  const { projectId = '' } = useParams()
  const { organisationId } = useOrganisation()
  const { data: project, isLoading } = useProject(organisationId, projectId)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [status, setStatus] = useState<CycleStatus>('draft')
  const createCycle = useCreateCycle()
  const listPath = getProjectListPath(projectId)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!organisationId || !project || !name.trim()) return

    try {
      const cycle = await createCycle.mutateAsync({
        organisation_id: organisationId,
        project_id: project.id,
        name,
        description_text: description,
        starts_at: startsAt || null,
        ends_at: endsAt || null,
        status,
      })
      toast.success('Cycle created')
      navigate(getProjectCyclePath(project.id, cycle.id))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create cycle')
    }
  }

  if (!isLoading && !project) {
    return (
      <OpenKbPageShell>
        <EmptyState title="Project not found" description="The project was deleted or is outside your Open-KB access." />
      </OpenKbPageShell>
    )
  }

  return (
    <OpenKbPageShell isLoading={isLoading}>
      <div>
        <h1 className="text-xl font-semibold tracking-normal">New cycle</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {project ? `${project.identifier} · ${project.name}` : 'Create a time-boxed planning cycle for this project.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Name</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Sprint 12" required />
        </label>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Start</span>
            <Input type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">End</span>
            <Input type="date" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Status</span>
            <Select
              className="border border-[var(--color-border)] bg-[var(--color-background)]"
              value={status}
              onChange={(event) => setStatus(event.target.value as CycleStatus)}
              options={statusOptions}
            />
          </label>
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Description</span>
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Scope, goals, and constraints..." />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(listPath)}>Cancel</Button>
          <Button type="submit" loading={createCycle.isPending}>Create cycle</Button>
        </div>
      </form>
    </OpenKbPageShell>
  )
}
