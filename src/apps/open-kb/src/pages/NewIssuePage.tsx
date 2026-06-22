import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, EmptyState, Input, Select } from '@repo/ui'
import { useAuth } from '@repo/shared/auth/context'
import { toast } from 'sonner'
import { RichTextEditor, type RichTextEditorValue } from '../components/editor'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import { useOrganisation } from '../contexts/OrganisationContext'
import { useCreateDraftIssue, useDeleteDraftIssue, useDraftIssue, useUpdateDraftIssue } from '../hooks/queries/useDrafts'
import { useCreateIssue, useIssueStates } from '../hooks/queries/useIssues'
import { useProjects } from '../hooks/queries/useProjects'
import type { IssuePriority } from '../types'

const priorityOptions: Array<{ value: IssuePriority; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export const NewIssuePage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { organisationId } = useOrganisation()
  const { data: projects = [], isLoading: projectsLoading } = useProjects(organisationId)
  const initialProjectId = searchParams.get('project')
  const draftId = searchParams.get('draft')
  const { data: draft, isLoading: draftLoading } = useDraftIssue(organisationId, draftId)
  const [projectId, setProjectId] = useState(initialProjectId ?? '')
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<IssuePriority>('none')
  const [stateId, setStateId] = useState('')
  const [description, setDescription] = useState<RichTextEditorValue | null>(null)
  const [editorKey, setEditorKey] = useState(0)
  const selectedProjectId = projectId || projects[0]?.id || ''
  const { data: states = [], isLoading: statesLoading } = useIssueStates(organisationId, selectedProjectId)
  const defaultState = states.find((state) => state.is_default) ?? states[0]
  const selectedStateId = stateId || defaultState?.id || ''
  const createIssue = useCreateIssue()
  const createDraft = useCreateDraftIssue()
  const updateDraft = useUpdateDraftIssue()
  const deleteDraft = useDeleteDraftIssue()

  useEffect(() => {
    if (!draft) return

    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setProjectId(draft.project_id)
      setTitle(draft.title ?? '')
      setPriority(draft.payload.priority ?? 'none')
      setStateId(draft.payload.state_id ?? '')
      setDescription({
        json: draft.description_json,
        html: draft.description_html ?? '',
        text: draft.description_text ?? '',
      })
      setEditorKey((current) => current + 1)
    })

    return () => {
      cancelled = true
    }
  }, [draft])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!organisationId || !selectedProjectId || !title.trim()) return

    try {
      const issue = await createIssue.mutateAsync({
        organisation_id: organisationId,
        project_id: selectedProjectId,
        title,
        priority,
        state_id: selectedStateId || null,
        description_json: description?.json ?? null,
        description_html: description?.html ?? null,
        description_text: description?.text ?? null,
      })
      if (draftId) {
        await deleteDraft.mutateAsync({ organisationId, draftId, status: 'published' })
      }
      toast.success('Issue created')
      navigate(`/issues/${issue.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create issue')
    }
  }

  const handleSaveDraft = async () => {
    if (!organisationId || !selectedProjectId || !user) return
    if (!title.trim() && !description?.text.trim()) return

    const input = {
      organisation_id: organisationId,
      project_id: selectedProjectId,
      title: title.trim() || 'Untitled draft',
      description_json: description?.json ?? null,
      description_html: description?.html ?? null,
      description_text: description?.text ?? null,
      payload: {
        priority,
        state_id: selectedStateId || null,
      },
    }

    try {
      const saved = draftId
        ? await updateDraft.mutateAsync({ ...input, id: draftId })
        : await createDraft.mutateAsync({ ...input, profile_id: user.id })
      toast.success('Draft saved')
      if (!draftId) {
        navigate(`/issues/new?draft=${saved.id}`, { replace: true })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save draft')
    }
  }

  if (!projectsLoading && projects.length === 0) {
    return (
      <OpenKbPageShell>
        <EmptyState title="Create a project first" description="Issues are always scoped to an organisation project." />
      </OpenKbPageShell>
    )
  }

  return (
    <OpenKbPageShell isLoading={projectsLoading || statesLoading || draftLoading}>
      <div>
        <h1 className="text-xl font-semibold tracking-normal">{draftId ? 'Resume draft issue' : 'New issue'}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Create a project issue without creating a Plane workspace.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Project</span>
            <Select
              className="border border-[var(--color-border)] bg-[var(--color-background)]"
              value={selectedProjectId}
              onChange={(event) => {
                setProjectId(event.target.value)
                setStateId('')
              }}
              options={projects.map((project) => ({ value: project.id, label: `${project.identifier} · ${project.name}` }))}
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">State</span>
            <Select
              className="border border-[var(--color-border)] bg-[var(--color-background)]"
              value={selectedStateId}
              onChange={(event) => setStateId(event.target.value)}
              options={states.map((state) => ({ value: state.id, label: state.name }))}
              placeholder={states.length === 0 ? 'No states yet' : undefined}
            />
          </label>
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Title</span>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Implement issue triage workflow" required />
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
            value={description?.json}
            placeholder="Describe the expected behavior, context, and acceptance notes..."
            onChange={setDescription}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/issues')}>Cancel</Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={!user || (!title.trim() && !description?.text.trim())}
            loading={createDraft.isPending || updateDraft.isPending}
          >
            Save draft
          </Button>
          <Button type="submit" loading={createIssue.isPending}>Create issue</Button>
        </div>
      </form>
    </OpenKbPageShell>
  )
}
