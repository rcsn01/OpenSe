import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge, Button, EmptyState, Input, Select, Textarea } from '@repo/ui'
import { FolderKanban, Plus, Save, Trash2, UserPlus, UsersRound, X } from 'lucide-react'
import { toast } from 'sonner'
import { buildTeamSlug } from '../../api/teams'
import { OpenKbPageShell } from '../../components/OpenKbPageShell'
import { useOrganisation } from '../../contexts/OrganisationContext'
import { useOrganisationMemberProfiles } from '../../hooks/queries/useIssues'
import { useMyPermissions } from '../../hooks/queries/usePermissions'
import { useProjects } from '../../hooks/queries/useProjects'
import { useAddTeamMember, useCreateTeam, useDeleteTeam, useTeamMembers, useTeams, useUpdateTeam, useRemoveTeamMember } from '../../hooks/queries/useTeams'
import { formatProfileName } from '../../lib/profileFormatting'
import type { OpenKbTeam, OrganisationMemberProfile } from '../../types'

const TeamRow = ({
  team,
  projectCount,
  canEdit,
  organisationId,
  organisationMembers,
}: {
  team: OpenKbTeam
  projectCount: number
  canEdit: boolean
  organisationId: string
  organisationMembers: OrganisationMemberProfile[]
}) => {
  const updateTeam = useUpdateTeam()
  const deleteTeam = useDeleteTeam()
  const addTeamMember = useAddTeamMember()
  const removeTeamMember = useRemoveTeamMember()
  const { data: teamMembers = [] } = useTeamMembers(organisationId, team.id)
  const [name, setName] = useState(team.name)
  const [slug, setSlug] = useState(team.slug)
  const [description, setDescription] = useState(team.description_text ?? '')
  const [status, setStatus] = useState(team.status ?? 'active')
  const [selectedMemberId, setSelectedMemberId] = useState('')

  const isDirty =
    name !== team.name ||
    slug !== team.slug ||
    description !== (team.description_text ?? '') ||
    status !== (team.status ?? 'active')

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || !slug.trim()) return

    try {
      await updateTeam.mutateAsync({
        id: team.id,
        organisation_id: organisationId,
        name,
        slug,
        description_text: description,
        status,
      })
      toast.success('Team updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update team')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteTeam.mutateAsync({ organisationId, teamId: team.id })
      toast.success('Team removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove team')
    }
  }

  const activeMemberIds = new Set(teamMembers.map((member) => member.profile_id))
  const availableMembers = organisationMembers.filter((member) => !activeMemberIds.has(member.profile_id))

  const handleAddMember = async () => {
    if (!selectedMemberId) return

    try {
      await addTeamMember.mutateAsync({
        organisation_id: organisationId,
        team_id: team.id,
        profile_id: selectedMemberId,
      })
      setSelectedMemberId('')
      toast.success('Team member added')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add team member')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeTeamMember.mutateAsync({ organisationId, memberId })
      toast.success('Team member removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove team member')
    }
  }

  return (
    <form onSubmit={handleSave} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
            <UsersRound className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{team.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{team.slug}</Badge>
              <Badge variant={status === 'active' ? 'success' : 'neutral'}>{status}</Badge>
              <span className="inline-flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
                <FolderKanban className="h-3.5 w-3.5" />
                {projectCount} {projectCount === 1 ? 'project' : 'projects'}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
                <UsersRound className="h-3.5 w-3.5" />
                {teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            className="inline-flex h-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-xs font-medium hover:bg-[var(--color-muted)]"
            to={`/projects?team=${team.id}`}
          >
            Projects
          </Link>
          <Button type="submit" size="sm" disabled={!canEdit || !isDirty || !name.trim() || !slug.trim()} loading={updateTeam.isPending}>
            <Save className="h-4 w-4" />
            Save
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Remove team"
            disabled={!canEdit || projectCount > 0 || deleteTeam.isPending}
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem_9rem]">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Name</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} disabled={!canEdit} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Slug</span>
          <Input value={slug} onChange={(event) => setSlug(buildTeamSlug(event.target.value))} disabled={!canEdit} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Status</span>
          <Select
            className="border border-[var(--color-border)] bg-[var(--color-background)]"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            disabled={!canEdit}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
        </label>
      </div>
      <label className="mt-3 block space-y-2">
        <span className="text-sm font-medium">Description</span>
        <Textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={!canEdit} />
      </label>
      <div className="mt-4 border-t border-[var(--color-border)] pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Members</h3>
          <div className="flex min-w-0 gap-2">
            <Select
              className="min-w-52 border border-[var(--color-border)] bg-[var(--color-background)]"
              value={selectedMemberId}
              onChange={(event) => setSelectedMemberId(event.target.value)}
              disabled={!canEdit || availableMembers.length === 0}
              placeholder={availableMembers.length === 0 ? 'No available members' : 'Add organisation member'}
              options={availableMembers.map((member) => ({
                value: member.profile_id,
                label: formatProfileName(member.profile),
              }))}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Add team member"
              disabled={!canEdit || !selectedMemberId}
              loading={addTeamMember.isPending}
              onClick={handleAddMember}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {teamMembers.length === 0 ? (
            <span className="text-sm text-[var(--color-muted-foreground)]">No members</span>
          ) : teamMembers.map((member) => (
            <span key={member.id} className="inline-flex max-w-full items-center gap-2 rounded-full bg-[var(--color-muted)] px-2.5 py-1 text-xs">
              <span className="truncate">{formatProfileName(member.profile)}</span>
              <button
                type="button"
                aria-label="Remove team member"
                disabled={!canEdit || removeTeamMember.isPending}
                onClick={() => handleRemoveMember(member.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </div>
    </form>
  )
}

export const TeamsPage = () => {
  const { organisationId } = useOrganisation()
  const [searchParams] = useSearchParams()
  const { data: permissions = [] } = useMyPermissions(organisationId)
  const { data: teams = [], isLoading: teamsLoading } = useTeams(organisationId)
  const { data: projects = [], isLoading: projectsLoading } = useProjects(organisationId)
  const { data: organisationMembers = [], isLoading: membersLoading } = useOrganisationMemberProfiles(organisationId)
  const createTeam = useCreateTeam()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')

  const canEdit = permissions.includes('projects.edit')
  const selectedTeamId = searchParams.get('team')
  const filteredTeams = selectedTeamId ? teams.filter((team) => team.id === selectedTeamId) : teams
  const projectCounts = useMemo(() => {
    const counts = new Map<string, number>()
    projects.forEach((project) => {
      if (project.team_id) {
        counts.set(project.team_id, (counts.get(project.team_id) ?? 0) + 1)
      }
    })
    return counts
  }, [projects])
  const suggestedSlug = buildTeamSlug(name)
  const resolvedSlug = slug || suggestedSlug

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!organisationId || !name.trim()) return

    try {
      await createTeam.mutateAsync({
        organisation_id: organisationId,
        name,
        slug: resolvedSlug,
        description_text: description,
      })
      setName('')
      setSlug('')
      setDescription('')
      toast.success('Team created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create team')
    }
  }

  return (
    <OpenKbPageShell isLoading={teamsLoading || projectsLoading || membersLoading}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">Teams</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Organisation-level groups for projects. Teams do not replace organisations or create separate tenants.</p>
        </div>
        <Link
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium hover:bg-[var(--color-muted)]"
          to="/projects"
        >
          <FolderKanban className="h-4 w-4" />
          Projects
        </Link>
      </div>

      <form onSubmit={handleCreate} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          <h2 className="text-sm font-semibold">New team</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Name</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Product" disabled={!canEdit} required />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Slug</span>
            <Input value={resolvedSlug} onChange={(event) => setSlug(buildTeamSlug(event.target.value))} disabled={!canEdit} required />
          </label>
        </div>
        <label className="mt-3 block space-y-2">
          <span className="text-sm font-medium">Description</span>
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={!canEdit} />
        </label>
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={!canEdit || !name.trim()} loading={createTeam.isPending}>
            <Plus className="h-4 w-4" />
            Create team
          </Button>
        </div>
      </form>

      {filteredTeams.length === 0 ? (
        <EmptyState title="No teams yet" description="Create a team to group organisation projects without adding a workspace layer." />
      ) : (
        <div className="space-y-3">
          {filteredTeams.map((team) => (
            <TeamRow
              key={team.id}
              team={team}
              projectCount={projectCounts.get(team.id) ?? 0}
              canEdit={canEdit}
              organisationId={organisationId ?? ''}
              organisationMembers={organisationMembers}
            />
          ))}
        </div>
      )}
    </OpenKbPageShell>
  )
}
