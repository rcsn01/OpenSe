import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  useAddProjectTab,
  useRemoveProjectTab,
  useUpdateProjectTab,
} from '../../hooks/queries/useProjects'
import {
  getProjectTabInstancePath,
  getProjectTabPath,
  isProjectTabKey,
  projectTabDefinitionByKey,
  requiredProjectTabKey,
  type ProjectTabKey,
} from '../../lib/projectTabs'
import type { ProjectTab } from '../../types'
import type { ProjectIssueListViewConfig } from './project-list/projectIssueListLogic'

export const isRequiredProjectTab = (tab: ProjectTab) => tab.metadata?.required === true

export const metadataWithoutRequired = (metadata: ProjectTab['metadata']) => {
  const rest = { ...(metadata ?? {}) }
  delete rest.required
  return rest
}

export const getCopiedProjectTabLabel = (label: string, tabs: ProjectTab[]) => {
  const baseLabel = `${label.trim() || 'Tab'} copy`
  const existingLabels = new Set(tabs.map((tab) => tab.label.trim().toLowerCase()))
  if (!existingLabels.has(baseLabel.toLowerCase())) return baseLabel

  let suffix = 2
  while (existingLabels.has(`${baseLabel} ${suffix}`.toLowerCase())) {
    suffix += 1
  }
  return `${baseLabel} ${suffix}`
}

export const useProjectTabActions = ({
  organisationId,
  projectId,
  visibleTabs,
  activeTab,
  activeTabId,
  activeTabInstance,
}: {
  organisationId: string | null
  projectId: string | null
  visibleTabs: ProjectTab[]
  activeTab: ProjectTabKey
  activeTabId: string | null
  activeTabInstance: ProjectTab | null
}) => {
  const navigate = useNavigate()
  const [renameTab, setRenameTab] = useState<ProjectTab | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const addProjectTab = useAddProjectTab()
  const updateProjectTab = useUpdateProjectTab()
  const removeProjectTab = useRemoveProjectTab()
  const tabMutationBusy = addProjectTab.isPending || updateProjectTab.isPending || removeProjectTab.isPending

  const handleTabChange = useCallback((tab: ProjectTab) => {
    if (!projectId) return
    navigate(getProjectTabInstancePath(projectId, tab.tab_key as ProjectTabKey, tab.id))
  }, [navigate, projectId])

  const handleAddTab = useCallback(async (tabKey: ProjectTabKey) => {
    if (!organisationId || !projectId) return
    const definition = projectTabDefinitionByKey.get(tabKey)
    if (!definition) return

    try {
      await addProjectTab.mutateAsync({
        organisation_id: organisationId,
        project_id: projectId,
        tab_key: tabKey,
        label: definition.label,
        sort_order: Math.max(0, ...visibleTabs.map((tab) => tab.sort_order)) + 10,
      })
      toast.success(`${definition.label} tab added`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add tab')
    }
  }, [addProjectTab, organisationId, projectId, visibleTabs])

  const handleRemoveTab = useCallback(async (tab: ProjectTab) => {
    if (!organisationId || isRequiredProjectTab(tab)) return

    try {
      await removeProjectTab.mutateAsync({
        id: tab.id,
        organisation_id: organisationId,
        project_id: tab.project_id,
      })
      if (activeTabId === tab.id && projectId) {
        navigate(getProjectTabPath(projectId, requiredProjectTabKey), { replace: true })
      }
      toast.success(`${tab.label} tab removed`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove tab')
    }
  }, [activeTabId, navigate, organisationId, projectId, removeProjectTab])

  const handleOpenRenameTab = useCallback((tab: ProjectTab) => {
    setRenameTab(tab)
    setRenameValue(tab.label)
  }, [])

  const handleRenameTab = useCallback(async () => {
    if (!organisationId || !renameTab) return
    const label = renameValue.trim()
    if (!label) {
      toast.error('Tab name is required')
      return
    }

    try {
      await updateProjectTab.mutateAsync({
        id: renameTab.id,
        organisation_id: organisationId,
        project_id: renameTab.project_id,
        label,
      })
      setRenameTab(null)
      setRenameValue('')
      toast.success('Tab renamed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to rename tab')
    }
  }, [organisationId, renameTab, renameValue, updateProjectTab])

  const handleCopyTab = useCallback(async (tab: ProjectTab) => {
    if (!organisationId || !projectId || !isProjectTabKey(tab.tab_key)) return
    const tabIndex = visibleTabs.findIndex((item) => item.id === tab.id)
    const followingTabs = tabIndex >= 0 ? visibleTabs.slice(tabIndex + 1) : []
    const nextSortOrder = followingTabs.length > 0
      ? Math.min(...followingTabs.map((item) => item.sort_order))
      : tab.sort_order + 20
    const hasSortGap = nextSortOrder > tab.sort_order + 1
    const sortOrder = hasSortGap
      ? Math.floor((tab.sort_order + nextSortOrder) / 2)
      : tab.sort_order + 10

    try {
      if (!hasSortGap) {
        await Promise.all(followingTabs.map((item) => updateProjectTab.mutateAsync({
          id: item.id,
          organisation_id: organisationId,
          project_id: item.project_id,
          sort_order: item.sort_order + 10,
        })))
      }
      const copiedTab = await addProjectTab.mutateAsync({
        organisation_id: organisationId,
        project_id: projectId,
        tab_key: tab.tab_key,
        label: getCopiedProjectTabLabel(tab.label, visibleTabs),
        sort_order: sortOrder,
        metadata: metadataWithoutRequired(tab.metadata),
      })
      navigate(getProjectTabInstancePath(projectId, copiedTab.tab_key as ProjectTabKey, copiedTab.id))
      toast.success(`${copiedTab.label} tab created`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to copy tab')
    }
  }, [addProjectTab, navigate, organisationId, projectId, updateProjectTab, visibleTabs])

  const handleListViewChange = useCallback(async (config: ProjectIssueListViewConfig) => {
    if (!organisationId || !activeTabInstance || activeTab !== 'list') return

    try {
      await updateProjectTab.mutateAsync({
        id: activeTabInstance.id,
        organisation_id: organisationId,
        project_id: activeTabInstance.project_id,
        metadata: {
          ...(activeTabInstance.metadata ?? {}),
          listView: config,
        },
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save list view')
    }
  }, [activeTab, activeTabInstance, organisationId, updateProjectTab])

  const handleMoveTab = useCallback(async (tab: ProjectTab, direction: 'left' | 'right') => {
    if (!organisationId) return
    const index = visibleTabs.findIndex((item) => item.id === tab.id)
    const swapWith = visibleTabs[direction === 'left' ? index - 1 : index + 1]
    if (!swapWith) return

    try {
      await Promise.all([
        updateProjectTab.mutateAsync({
          id: tab.id,
          organisation_id: organisationId,
          project_id: tab.project_id,
          sort_order: swapWith.sort_order,
        }),
        updateProjectTab.mutateAsync({
          id: swapWith.id,
          organisation_id: organisationId,
          project_id: swapWith.project_id,
          sort_order: tab.sort_order,
        }),
      ])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to move tab')
    }
  }, [organisationId, updateProjectTab, visibleTabs])

  return {
    renameTab,
    renameValue,
    setRenameTab,
    setRenameValue,
    tabMutationBusy,
    handleTabChange,
    handleAddTab,
    handleRemoveTab,
    handleOpenRenameTab,
    handleRenameTab,
    handleCopyTab,
    handleListViewChange,
    handleMoveTab,
  }
}
