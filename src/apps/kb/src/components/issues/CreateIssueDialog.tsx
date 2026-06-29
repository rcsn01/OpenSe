import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Select } from '@repo/ui'
import { useAuth } from '@repo/shared/auth/context'
import { toast } from 'sonner'
import { RichTextEditor, type RichTextEditorValue } from '../editor'
import { useCreateDraftIssue, useDeleteDraftIssue, useUpdateDraftIssue } from '../../hooks/queries/useDrafts'
import { useCreateIssue, useIssueStates } from '../../hooks/queries/useIssues'
import { useProjects } from '../../hooks/queries/useProjects'
import { useTeams } from '../../hooks/queries/useTeams'
import { getProjectIssuePath } from '../../lib/projectRoutes'
import type { IssuePriority } from '../../types'

const priorityOptions: Array<{ value: IssuePriority; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export const CreateIssueDialog = ({
  open,
  onClose,
  organisationId,
  projectId,
  globalMode = false,
}: {
  open: boolean
  onClose: () => void
  organisationId: string
  projectId?: string | null
  globalMode?: boolean
}) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedProjectId, setSelectedProjectId] = useState(projectId ?? '')
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<IssuePriority>('none')
  const [stateId, setStateId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [description, setDescription] = useState<RichTextEditorValue | null>(null)
  const [editorKey, setEditorKey] = useState(0)
  const [draftId, setDraftId] = useState<string | null>(null)
  const effectiveProjectId = globalMode ? selectedProjectId : projectId ?? ''
  const { data: projects = [], isLoading: projectsLoading } = useProjects(globalMode ? organisationId : null)
  const { data: teams = [], isLoading: teamsLoading } = useTeams(organisationId)
  const { data: states = [], isLoading: statesLoading } = useIssueStates(organisationId, effectiveProjectId, Boolean(effectiveProjectId))
  const defaultState = states.find((state) => state.is_default) ?? states[0]
  const selectedStateId = stateId || defaultState?.id || ''
  const createIssue = useCreateIssue()
  const createDraft = useCreateDraftIssue()
  const updateDraft = useUpdateDraftIssue()
  const deleteDraft = useDeleteDraftIssue()

  useEffect(() => {
    if (!open) return

    const resetId = window.setTimeout(() => {
      setTitle('')
      setPriority('none')
      setStateId('')
      setTeamId('')
      setSelectedProjectId(projectId ?? '')
      setDescription(null)
      setDraftId(null)
      setEditorKey((current) => current + 1)
    }, 0)

    return () => window.clearTimeout(resetId)
  }, [open, projectId])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!organisationId || !effectiveProjectId || !title.trim()) return

    try {
      const issue = await createIssue.mutateAsync({
        organisation_id: organisationId,
        project_id: effectiveProjectId,
        title,
        priority,
        state_id: selectedStateId || null,
        team_id: teamId || null,
        description_json: description?.json ?? null,
        description_html: description?.html ?? null,
        description_text: description?.text ?? null,
      })
      if (draftId) {
        await deleteDraft.mutateAsync({ organisationId, draftId, status: 'published' })
      }
      toast.success('Task created')
      onClose()
      navigate(getProjectIssuePath(effectiveProjectId, issue.id))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create task')
    }
  }

  const handleSaveDraft = async () => {
    if (!organisationId || !effectiveProjectId || !user) return
    if (!title.trim() && !description?.text.trim()) return

    const input = {
      organisation_id: organisationId,
      project_id: effectiveProjectId,
      title: title.trim() || 'Untitled draft',
      description_json: description?.json ?? null,
      description_html: description?.html ?? null,
      description_text: description?.text ?? null,
      payload: {
        priority,
        state_id: selectedStateId || null,
        team_id: teamId || null,
      },
    }

    try {
      const saved = draftId
        ? await updateDraft.mutateAsync({ ...input, id: draftId })
        : await createDraft.mutateAsync({ ...input, profile_id: user.id })
      setDraftId(saved.id)
      toast.success('Draft saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save draft')
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {globalMode ? (
            <label className="block space-y-2">
              <span className="text-sm font-medium">Project</span>
              <Select
                className="border border-[var(--color-border)] bg-[var(--color-background)]"
                value={selectedProjectId}
                onChange={(event) => {
                  setSelectedProjectId(event.target.value)
                  setStateId('')
                }}
                options={projects.map((project) => ({ value: project.id, label: project.name }))}
                placeholder={projectsLoading ? 'Loading projects...' : 'Select a project'}
                required
              />
            </label>
          ) : null}
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
              placeholder={teamsLoading ? 'Loading teams...' : undefined}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">State</span>
            <Select
              className="border border-[var(--color-border)] bg-[var(--color-background)]"
              value={selectedStateId}
              onChange={(event) => setStateId(event.target.value)}
              options={states.map((state) => ({ value: state.id, label: state.name }))}
              placeholder={!effectiveProjectId ? 'Select a project first' : statesLoading ? 'Loading states...' : states.length === 0 ? 'No states yet' : undefined}
              disabled={!effectiveProjectId}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Title</span>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Implement task triage workflow" required />
          </label>
          <label className="block max-w-xs space-y-2">
            <span className="text-sm font-medium">Priority</span>
            <Select
              className="border border-[var(--color-border)] bg-[var(--color-background)]"
              value={priority}
              onChange={(event) => setPriority(event.target.value as IssuePriority)}
              options={priorityOptions}
            />
          </label>
          <div className="space-y-2">
            <span className="text-sm font-medium">Description</span>
            <RichTextEditor
              key={editorKey}
              placeholder="Describe the expected behavior, context, and acceptance notes..."
              onChange={setDescription}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={!user || !effectiveProjectId || (!title.trim() && !description?.text.trim())}
              loading={createDraft.isPending || updateDraft.isPending}
            >
              Save draft
            </Button>
            <Button type="submit" disabled={!effectiveProjectId} loading={createIssue.isPending}>Create task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
