import { useState } from 'react'
import type { FormEvent } from 'react'
import { Badge, Button, Input, Select, Textarea, cn } from '@repo/ui'
import { ExternalLink, Globe2, Plus, Save, Tags, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { buildDeployBoardSlug } from '../../api/deployBoards'
import {
  useCreateIssueLabel,
  useCreateIssueState,
  useIssueLabels,
  useIssueStates,
  useOrganisationMemberProfiles,
} from '../../hooks/queries/useIssues'
import {
  useProjectMembers,
  useRemoveProjectMember,
  useUpdateProject,
  useUpsertProjectMember,
} from '../../hooks/queries/useProjects'
import { useTeams } from '../../hooks/queries/useTeams'
import {
  useCreateProjectDeployBoard,
  useDeleteProjectDeployBoard,
  useProjectDeployBoards,
  useUpdateProjectDeployBoard,
} from '../../hooks/queries/useDeployBoards'
import type { Project, ProjectMemberRole } from '../../types'
import { formatProfileName } from '../../lib/profileFormatting'

const stateGroupOptions = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'unstarted', label: 'Unstarted' },
  { value: 'started', label: 'Started' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const memberRoleOptions: Array<{ value: ProjectMemberRole; label: string }> = [
  { value: 'member', label: 'Member' },
  { value: 'lead', label: 'Lead' },
  { value: 'admin', label: 'Admin' },
  { value: 'viewer', label: 'Viewer' },
]

const swatchOptions = ['#64748b', '#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0f766e']

export const ProjectSettingsPanel = ({
  project,
  organisationId,
  canEditProject,
  canManageMembers,
}: {
  project: Project
  organisationId: string
  canEditProject: boolean
  canManageMembers: boolean
}) => {
  const { data: states = [] } = useIssueStates(organisationId, project.id)
  const { data: labels = [] } = useIssueLabels(organisationId, project.id)
  const { data: orgMembers = [] } = useOrganisationMemberProfiles(organisationId)
  const { data: projectMembers = [] } = useProjectMembers(organisationId, project.id)
  const { data: teams = [] } = useTeams(organisationId)
  const { data: deployBoards = [] } = useProjectDeployBoards(organisationId, project.id)
  const updateProject = useUpdateProject()
  const createState = useCreateIssueState()
  const createLabel = useCreateIssueLabel()
  const upsertMember = useUpsertProjectMember()
  const removeMember = useRemoveProjectMember()
  const createDeployBoard = useCreateProjectDeployBoard()
  const updateDeployBoard = useUpdateProjectDeployBoard()
  const deleteDeployBoard = useDeleteProjectDeployBoard()
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description_text ?? '')
  const [status, setStatus] = useState<Project['status']>(project.status)
  const [visibility, setVisibility] = useState<Project['visibility']>(project.visibility)
  const [teamId, setTeamId] = useState(project.team_id ?? '')
  const [stateName, setStateName] = useState('')
  const [stateGroup, setStateGroup] = useState('backlog')
  const [stateColor, setStateColor] = useState('#64748b')
  const [labelName, setLabelName] = useState('')
  const [labelColor, setLabelColor] = useState('#2563eb')
  const [memberProfileId, setMemberProfileId] = useState('')
  const [memberRole, setMemberRole] = useState<ProjectMemberRole>('member')
  const [deployBoardTitle, setDeployBoardTitle] = useState(`${project.name} board`)
  const [deployBoardSlug, setDeployBoardSlug] = useState(buildDeployBoardSlug(`${project.identifier}-${project.name}`))
  const [deployBoardDescription, setDeployBoardDescription] = useState(project.description_text ?? '')

  const projectSpecificStates = states.filter((state) => state.project_id === project.id)
  const projectSpecificLabels = labels.filter((label) => label.project_id === project.id)
  const assignedProfileIds = new Set(projectMembers.map((member) => member.profile_id))
  const availableMembers = orgMembers.filter((member) => !assignedProfileIds.has(member.profile_id))

  const handleProjectSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) return

    try {
      await updateProject.mutateAsync({
        id: project.id,
        organisation_id: organisationId,
        name,
        description_text: description,
        status,
        visibility,
        team_id: teamId || null,
      })
      toast.success('Project updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update project')
    }
  }

  const handleCreateState = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!stateName.trim()) return

    try {
      await createState.mutateAsync({
        organisation_id: organisationId,
        project_id: project.id,
        name: stateName,
        group_key: stateGroup,
        color: stateColor,
      })
      setStateName('')
      toast.success('State created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create state')
    }
  }

  const handleCreateLabel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!labelName.trim()) return

    try {
      await createLabel.mutateAsync({
        organisation_id: organisationId,
        project_id: project.id,
        name: labelName,
        color: labelColor,
      })
      setLabelName('')
      toast.success('Label created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create label')
    }
  }

  const handleAddMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!memberProfileId) return

    try {
      await upsertMember.mutateAsync({
        organisation_id: organisationId,
        project_id: project.id,
        profile_id: memberProfileId,
        role: memberRole,
      })
      setMemberProfileId('')
      setMemberRole('member')
      toast.success('Project member added')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add project member')
    }
  }

  const handleCreateDeployBoard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!deployBoardTitle.trim() || !deployBoardSlug.trim()) return

    try {
      await createDeployBoard.mutateAsync({
        organisation_id: organisationId,
        project_id: project.id,
        title: deployBoardTitle,
        slug: deployBoardSlug,
        description_text: deployBoardDescription,
        status: 'active',
      })
      setDeployBoardTitle(`${project.name} board`)
      setDeployBoardSlug(buildDeployBoardSlug(`${project.identifier}-${project.name}`))
      setDeployBoardDescription(project.description_text ?? '')
      toast.success('Public board created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create public board')
    }
  }

  const handleDeployBoardStatus = async (boardId: string, status: string) => {
    try {
      await updateDeployBoard.mutateAsync({
        id: boardId,
        organisation_id: organisationId,
        project_id: project.id,
        status,
      })
      toast.success(status === 'active' ? 'Public board activated' : 'Public board paused')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update public board')
    }
  }

  const handleDeleteDeployBoard = async (boardId: string) => {
    try {
      await deleteDeployBoard.mutateAsync({ organisationId, projectId: project.id, boardId })
      toast.success('Public board removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove public board')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember.mutateAsync({ organisationId, memberId })
      toast.success('Project member removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove project member')
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
      <div className="space-y-4">
        <form onSubmit={handleProjectSave} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Project settings</h2>
            <Button type="submit" size="sm" disabled={!canEditProject || !name.trim()} loading={updateProject.isPending}>
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Name</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} disabled={!canEditProject} />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Identifier</span>
              <Input value={project.identifier} disabled />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Status</span>
              <Select
                className="border border-[var(--color-border)] bg-[var(--color-background)]"
                value={status}
                onChange={(event) => setStatus(event.target.value as Project['status'])}
                disabled={!canEditProject}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'archived', label: 'Archived' },
                ]}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Visibility</span>
              <Select
                className="border border-[var(--color-border)] bg-[var(--color-background)]"
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as Project['visibility'])}
                disabled={!canEditProject}
                options={[
                  { value: 'private', label: 'Private' },
                  { value: 'public', label: 'Public' },
                ]}
              />
            </label>
            <label className="block space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Team</span>
              <Select
                className="border border-[var(--color-border)] bg-[var(--color-background)]"
                value={teamId}
                onChange={(event) => setTeamId(event.target.value)}
                disabled={!canEditProject}
                options={[
                  { value: '', label: 'No team' },
                  ...teams.map((team) => ({ value: team.id, label: team.name })),
                ]}
              />
            </label>
          </div>
          <label className="mt-4 block space-y-2">
            <span className="text-sm font-medium">Description</span>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={!canEditProject} />
          </label>
        </form>

        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="mb-4 flex items-center gap-2">
            <Tags className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            <h2 className="text-sm font-semibold">States and labels</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <form onSubmit={handleCreateState} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">States</h3>
              <div className="flex flex-wrap gap-2">
                {projectSpecificStates.map((state) => (
                  <Badge key={state.id} variant="outline">
                    <span className="mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: state.color }} />
                    {state.name}
                  </Badge>
                ))}
              </div>
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_9rem]">
                <Input value={stateName} onChange={(event) => setStateName(event.target.value)} placeholder="Review" disabled={!canEditProject} />
                <Select
                  className="border border-[var(--color-border)] bg-[var(--color-background)]"
                  value={stateGroup}
                  onChange={(event) => setStateGroup(event.target.value)}
                  disabled={!canEditProject}
                  options={stateGroupOptions}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {swatchOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Use color ${color}`}
                    className={cn('h-7 w-7 rounded-full border border-[var(--color-border)]', stateColor === color && 'ring-2 ring-[var(--color-primary)] ring-offset-2')}
                    style={{ backgroundColor: color }}
                    onClick={() => setStateColor(color)}
                    disabled={!canEditProject}
                  />
                ))}
                <Button type="submit" size="sm" variant="outline" disabled={!canEditProject || !stateName.trim()} loading={createState.isPending}>
                  <Plus className="h-4 w-4" />
                  State
                </Button>
              </div>
            </form>

            <form onSubmit={handleCreateLabel} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">Labels</h3>
              <div className="flex flex-wrap gap-2">
                {projectSpecificLabels.map((label) => (
                  <Badge key={label.id} variant="outline">
                    <span className="mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
                    {label.name}
                  </Badge>
                ))}
              </div>
              <Input value={labelName} onChange={(event) => setLabelName(event.target.value)} placeholder="Customer" disabled={!canEditProject} />
              <div className="flex flex-wrap items-center gap-2">
                {swatchOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Use color ${color}`}
                    className={cn('h-7 w-7 rounded-full border border-[var(--color-border)]', labelColor === color && 'ring-2 ring-[var(--color-primary)] ring-offset-2')}
                    style={{ backgroundColor: color }}
                    onClick={() => setLabelColor(color)}
                    disabled={!canEditProject}
                  />
                ))}
                <Button type="submit" size="sm" variant="outline" disabled={!canEditProject || !labelName.trim()} loading={createLabel.isPending}>
                  <Plus className="h-4 w-4" />
                  Label
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="mb-4 flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            <h2 className="text-sm font-semibold">Public boards</h2>
          </div>
          <p className="mb-4 text-xs text-[var(--color-muted-foreground)]">
            Boards render publicly only while the project visibility is public and the board status is active.
          </p>
          <form onSubmit={handleCreateDeployBoard} className="mb-4 grid gap-3">
            <Input
              value={deployBoardTitle}
              onChange={(event) => {
                setDeployBoardTitle(event.target.value)
                setDeployBoardSlug(buildDeployBoardSlug(event.target.value))
              }}
              placeholder="Launch board"
              disabled={!canEditProject}
            />
            <Input
              value={deployBoardSlug}
              onChange={(event) => setDeployBoardSlug(buildDeployBoardSlug(event.target.value))}
              placeholder="launch-board"
              disabled={!canEditProject}
            />
            <Textarea
              value={deployBoardDescription}
              onChange={(event) => setDeployBoardDescription(event.target.value)}
              disabled={!canEditProject}
              placeholder="Public description"
            />
            <Button type="submit" variant="outline" disabled={!canEditProject || !deployBoardTitle.trim() || !deployBoardSlug.trim()} loading={createDeployBoard.isPending}>
              <Plus className="h-4 w-4" />
              Board
            </Button>
          </form>
          <div className="divide-y divide-[var(--color-border)]">
            {deployBoards.length === 0 ? (
              <div className="py-6 text-center text-sm text-[var(--color-muted-foreground)]">No public boards configured.</div>
            ) : deployBoards.map((board) => (
              <div key={board.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{board.title || board.name || board.slug}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{board.slug}</Badge>
                      <Badge variant={board.status === 'active' ? 'success' : 'neutral'}>{board.status ?? 'active'}</Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <a
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--color-muted)]"
                      href={`/public/boards/${board.slug}`}
                      aria-label="Open public board"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={board.status === 'active' ? 'Pause public board' : 'Activate public board'}
                      disabled={!canEditProject || updateDeployBoard.isPending}
                      onClick={() => handleDeployBoardStatus(board.id, board.status === 'active' ? 'paused' : 'active')}
                    >
                      <Globe2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Remove public board"
                      disabled={!canEditProject || deleteDeployBoard.isPending}
                      onClick={() => handleDeleteDeployBoard(board.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            <h2 className="text-sm font-semibold">Project members</h2>
          </div>
          <form onSubmit={handleAddMember} className="mb-4 grid gap-2">
            <Select
              aria-label="Project member"
              className="border border-[var(--color-border)] bg-[var(--color-background)]"
              value={memberProfileId}
              onChange={(event) => setMemberProfileId(event.target.value)}
              disabled={!canManageMembers}
              options={[
                { value: '', label: 'Select organisation member' },
                ...availableMembers.map((member) => ({
                  value: member.profile_id,
                  label: formatProfileName(member.profile),
                })),
              ]}
            />
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Select
                aria-label="Project member role"
                className="border border-[var(--color-border)] bg-[var(--color-background)]"
                value={memberRole}
                onChange={(event) => setMemberRole(event.target.value as ProjectMemberRole)}
                disabled={!canManageMembers}
                options={memberRoleOptions}
              />
              <Button type="submit" variant="outline" disabled={!canManageMembers || !memberProfileId} loading={upsertMember.isPending}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </form>
          <div className="divide-y divide-[var(--color-border)]">
            {projectMembers.length === 0 ? (
              <div className="py-6 text-center text-sm text-[var(--color-muted-foreground)]">No project members assigned.</div>
            ) : projectMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{formatProfileName(member.profile)}</div>
                  <div className="truncate text-xs text-[var(--color-muted-foreground)]">{member.profile?.email ?? member.profile_id}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="neutral">{member.role}</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={!canManageMembers}
                    onClick={() => handleRemoveMember(member.id)}
                    aria-label="Remove project member"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
