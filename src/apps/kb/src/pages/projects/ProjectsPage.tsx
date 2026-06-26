import { Link, useSearchParams } from 'react-router-dom'
import { Badge, EmptyState, Select } from '@repo/ui'
import { Plus } from 'lucide-react'
import { OpenKbPageShell } from '../../components/OpenKbPageShell'
import { useOrganisation } from '../../contexts/OrganisationContext'
import { useProjects } from '../../hooks/queries/useProjects'
import { useTeams } from '../../hooks/queries/useTeams'

export const ProjectsPage = () => {
  const { organisationId } = useOrganisation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: projects = [], isLoading } = useProjects(organisationId)
  const { data: teams = [] } = useTeams(organisationId)
  const selectedTeamId = searchParams.get('team') ?? ''
  const filteredProjects =
    selectedTeamId === 'unassigned'
      ? projects.filter((project) => !project.team_id)
      : selectedTeamId
        ? projects.filter((project) => project.team_id === selectedTeamId)
        : projects
  const selectedTeam = teams.find((team) => team.id === selectedTeamId)

  const handleTeamChange = (teamId: string) => {
    const next = new URLSearchParams(searchParams)
    if (teamId) {
      next.set('team', teamId)
    } else {
      next.delete('team')
    }
    setSearchParams(next)
  }

  return (
    <OpenKbPageShell isLoading={isLoading}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">Projects</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Projects belong directly to the selected organisation.</p>
        </div>
        <Link
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)] shadow-[var(--shadow-sm)] hover:bg-[var(--color-primary-hover)]"
          to={selectedTeamId && selectedTeamId !== 'unassigned' ? `/projects/new?team=${selectedTeamId}` : '/projects/new'}
        >
          <Plus className="h-4 w-4" />
          New project
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <label className="flex min-w-56 items-center gap-2 text-sm">
          <span className="font-medium">Team</span>
          <Select
            className="border border-[var(--color-border)] bg-[var(--color-background)]"
            value={selectedTeamId}
            onChange={(event) => handleTeamChange(event.target.value)}
            options={[
              { value: '', label: 'All teams' },
              { value: 'unassigned', label: 'No team' },
              ...teams.map((team) => ({ value: team.id, label: team.name })),
            ]}
          />
        </label>
        {selectedTeam ? <Badge variant="outline">{selectedTeam.slug}</Badge> : null}
      </div>

      {filteredProjects.length === 0 ? (
        <EmptyState title="No projects yet" description="Create a project to unlock tasks, pages, cycles, and modules." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-border-hover)]">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline">{project.identifier}</Badge>
                <div className="flex min-w-0 items-center gap-2">
                  {project.team ? <Badge variant="outline">{project.team.name}</Badge> : null}
                  <Badge variant={project.status === 'active' ? 'success' : 'neutral'}>{project.status}</Badge>
                </div>
              </div>
              <h2 className="mt-4 truncate text-base font-semibold">{project.name}</h2>
              <p className="mt-2 line-clamp-2 min-h-10 text-sm text-[var(--color-muted-foreground)]">
                {project.description_text ?? 'No project description yet.'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </OpenKbPageShell>
  )
}
