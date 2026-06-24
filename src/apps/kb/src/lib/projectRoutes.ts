import type { OpenKbPersonalItem } from '../types'

export const getProjectIssuePath = (projectId: string, issueId: string) =>
  `/projects/${projectId}/issues/${issueId}`

export const getProjectListIssuePath = (projectId: string, issueId: string, tabId?: string | null) =>
  tabId
    ? `/projects/${projectId}/list/${tabId}/issues/${issueId}`
    : `/projects/${projectId}/list/issues/${issueId}`

export const getProjectPagePath = (projectId: string, pageId: string) =>
  `/projects/${projectId}/pages/${pageId}`

export const getProjectNewPagePath = (projectId: string) =>
  `/projects/${projectId}/pages/new`

export const getProjectPagesPath = (projectId: string) =>
  `/projects/${projectId}/pages`

export const getProjectListPath = (projectId: string) =>
  `/projects/${projectId}/list`

export const getProjectTasksPath = (projectId: string, userId: string) =>
  `/projects/${projectId}/list?assignee=${encodeURIComponent(userId)}`

export const resolveTasksProjectId = ({
  projects,
  recentVisits,
  favorites,
}: {
  projects: Array<{ id: string }>
  recentVisits: OpenKbPersonalItem[]
  favorites: OpenKbPersonalItem[]
}) => {
  const recentProject = recentVisits.find((item) => item.name === 'project' && item.project_id)?.project_id
  if (recentProject && projects.some((project) => project.id === recentProject)) {
    return recentProject
  }

  const favoriteProject = favorites.find((item) => item.name === 'project' && item.project_id)?.project_id
  if (favoriteProject && projects.some((project) => project.id === favoriteProject)) {
    return favoriteProject
  }

  return projects[0]?.id ?? null
}
