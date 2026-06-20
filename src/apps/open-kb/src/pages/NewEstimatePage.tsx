import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, EmptyState, Input, Select, Textarea } from '@repo/ui'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import { useOrganisation } from '../contexts/OrganisationContext'
import { useCreateEstimate } from '../hooks/queries/usePlanning'
import { useProjects } from '../hooks/queries/useProjects'

type DraftPoint = {
  name: string
  value: string
}

const defaultPoints: DraftPoint[] = [
  { name: '1 point', value: '1' },
  { name: '2 points', value: '2' },
  { name: '3 points', value: '3' },
  { name: '5 points', value: '5' },
]

export const NewEstimatePage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { organisationId } = useOrganisation()
  const { data: projects = [], isLoading } = useProjects(organisationId)
  const [projectId, setProjectId] = useState(searchParams.get('project') ?? '')
  const [name, setName] = useState('Fibonacci')
  const [description, setDescription] = useState('')
  const [points, setPoints] = useState<DraftPoint[]>(defaultPoints)
  const createEstimate = useCreateEstimate()
  const selectedProjectId = projectId || projects[0]?.id || ''

  const updatePoint = (index: number, nextPoint: Partial<DraftPoint>) => {
    setPoints((current) => current.map((point, itemIndex) => (itemIndex === index ? { ...point, ...nextPoint } : point)))
  }

  const removePoint = (index: number) => {
    setPoints((current) => current.filter((_point, itemIndex) => itemIndex !== index))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!organisationId || !selectedProjectId || !name.trim()) return

    const parsedPoints = points
      .map((point) => ({ name: point.name.trim(), value: Number(point.value) }))
      .filter((point) => point.name && Number.isFinite(point.value))

    if (parsedPoints.length === 0) {
      toast.error('Add at least one estimate point')
      return
    }

    try {
      await createEstimate.mutateAsync({
        organisation_id: organisationId,
        project_id: selectedProjectId,
        name,
        description_text: description,
        points: parsedPoints,
      })
      toast.success('Estimate scale created')
      navigate('/estimates')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create estimate scale')
    }
  }

  if (!isLoading && projects.length === 0) {
    return (
      <OpenKbPageShell>
        <EmptyState title="Create a project first" description="Estimate scales are scoped to organisation projects." />
      </OpenKbPageShell>
    )
  }

  return (
    <OpenKbPageShell isLoading={isLoading}>
      <div>
        <h1 className="text-xl font-semibold tracking-normal">New estimate</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Create a project estimate scale for issue sizing.</p>
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
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Description</span>
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="How this scale should be used..." />
        </label>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Points</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPoints((current) => [...current, { name: '', value: '' }])}
            >
              <Plus className="h-4 w-4" />
              Add point
            </Button>
          </div>
          <div className="space-y-2">
            {points.map((point, index) => (
              <div key={index} className="grid grid-cols-[minmax(0,1fr)_7rem_2.25rem] gap-2">
                <Input
                  aria-label="Point name"
                  value={point.name}
                  onChange={(event) => updatePoint(index, { name: event.target.value })}
                  placeholder="3 points"
                />
                <Input
                  aria-label="Point value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={point.value}
                  onChange={(event) => updatePoint(index, { value: event.target.value })}
                  placeholder="3"
                />
                <Button type="button" size="icon" variant="outline" aria-label="Remove point" onClick={() => removePoint(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/estimates')}>Cancel</Button>
          <Button type="submit" loading={createEstimate.isPending}>Create estimate</Button>
        </div>
      </form>
    </OpenKbPageShell>
  )
}
