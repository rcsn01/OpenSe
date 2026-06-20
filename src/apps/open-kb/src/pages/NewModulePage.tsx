import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, EmptyState, Input, Select, Textarea } from '@repo/ui'
import { toast } from 'sonner'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import { useOrganisation } from '../contexts/OrganisationContext'
import { useCreateModule } from '../hooks/queries/usePlanning'
import { useProjects } from '../hooks/queries/useProjects'
import type { ModuleStatus } from '../types'

const statusOptions: Array<{ value: ModuleStatus; label: string }> = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const NewModulePage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { organisationId } = useOrganisation()
  const { data: projects = [], isLoading } = useProjects(organisationId)
  const [projectId, setProjectId] = useState(searchParams.get('project') ?? '')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ModuleStatus>('backlog')
  const createModule = useCreateModule()
  const selectedProjectId = projectId || projects[0]?.id || ''

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!organisationId || !selectedProjectId || !name.trim()) return

    try {
      await createModule.mutateAsync({
        organisation_id: organisationId,
        project_id: selectedProjectId,
        name,
        description_text: description,
        status,
      })
      toast.success('Module created')
      navigate('/modules')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create module')
    }
  }

  if (!isLoading && projects.length === 0) {
    return (
      <OpenKbPageShell>
        <EmptyState title="Create a project first" description="Modules are scoped to organisation projects." />
      </OpenKbPageShell>
    )
  }

  return (
    <OpenKbPageShell isLoading={isLoading}>
      <div>
        <h1 className="text-xl font-semibold tracking-normal">New module</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Create a project module for related work.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Project</span>
          <Select
            className="border border-[var(--color-border)] bg-[var(--color-background)]"
            value={selectedProjectId}
            onChange={(event) => setProjectId(event.target.value)}
            options={projects.map((project) => ({ value: project.id, label: `${project.identifier} · ${project.name}` }))}
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Name</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Billing workflow" required />
        </label>
        <label className="block max-w-xs space-y-2">
          <span className="text-sm font-medium">Status</span>
          <Select
            className="border border-[var(--color-border)] bg-[var(--color-background)]"
            value={status}
            onChange={(event) => setStatus(event.target.value as ModuleStatus)}
            options={statusOptions}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Description</span>
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Scope and target outcomes..." />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/modules')}>Cancel</Button>
          <Button type="submit" loading={createModule.isPending}>Create module</Button>
        </div>
      </form>
    </OpenKbPageShell>
  )
}
