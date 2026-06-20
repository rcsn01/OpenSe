import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Input, Select } from '@repo/ui'
import { toast } from 'sonner'
import { buildProjectIdentifier } from '../api/projects'
import { RichTextEditor, type RichTextEditorValue } from '../components/editor'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import { useOrganisation } from '../contexts/OrganisationContext'
import { useCreateProject } from '../hooks/queries/useProjects'
import { useTeams } from '../hooks/queries/useTeams'

export const NewProjectPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { organisationId } = useOrganisation()
  const createProject = useCreateProject()
  const { data: teams = [] } = useTeams(organisationId)
  const [name, setName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [teamId, setTeamId] = useState(searchParams.get('team') ?? '')
  const [description, setDescription] = useState<RichTextEditorValue | null>(null)

  const suggestedIdentifier = useMemo(() => buildProjectIdentifier(name), [name])
  const resolvedIdentifier = identifier || suggestedIdentifier

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!organisationId || !name.trim()) return

    try {
      const project = await createProject.mutateAsync({
        organisation_id: organisationId,
        team_id: teamId || null,
        name,
        identifier: resolvedIdentifier,
        description_text: description?.text ?? null,
      })
      toast.success('Project created')
      navigate(`/projects/${project.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create project')
    }
  }

  return (
    <OpenKbPageShell>
      <div>
        <h1 className="text-xl font-semibold tracking-normal">New project</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Create an organisation-scoped project. No workspace layer is created.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Name</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Product roadmap" required />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Identifier</span>
          <Input value={resolvedIdentifier} onChange={(event) => setIdentifier(event.target.value.toUpperCase())} maxLength={12} required />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Team</span>
          <Select
            className="border border-[var(--color-border)] bg-[var(--color-background)]"
            value={teamId}
            onChange={(event) => setTeamId(event.target.value)}
            options={[
              { value: '', label: 'No team' },
              ...teams.map((team) => ({ value: team.id, label: team.name })),
            ]}
          />
        </label>
        <div className="space-y-2">
          <span className="text-sm font-medium">Description</span>
          <RichTextEditor placeholder="Summarise the project goals, owners, and scope..." onChange={setDescription} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/projects')}>Cancel</Button>
          <Button type="submit" loading={createProject.isPending}>Create project</Button>
        </div>
      </form>
    </OpenKbPageShell>
  )
}
