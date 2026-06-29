export type TaskSectionKey = 'overview' | 'list' | 'board' | 'dashboard' | 'calendar' | 'gantt' | 'workload'

export const getProjectIssuePath = (projectId: string, issueId: string) =>
  `/projects/${projectId}/issues/${issueId}`

export const getProjectListIssuePath = (projectId: string, issueId: string, tabId?: string | null) =>
  tabId
    ? `/projects/${projectId}/list/${tabId}/issues/${issueId}`
    : `/projects/${projectId}/list/issues/${issueId}`

export const getProjectCyclePath = (projectId: string, cycleId: string) =>
  `/projects/${projectId}/cycles/${cycleId}`

export const getProjectListCyclePath = (projectId: string, cycleId: string, tabId?: string | null) =>
  tabId
    ? `/projects/${projectId}/list/${tabId}/cycles/${cycleId}`
    : `/projects/${projectId}/list/cycles/${cycleId}`

export const getProjectCyclesPath = (projectId: string) =>
  `/projects/${projectId}/cycles`

export const getProjectNewCyclePath = (projectId: string) =>
  `/projects/${projectId}/cycles/new`

export const getProjectListPath = (projectId: string) =>
  `/projects/${projectId}/list`

export const getTasksPath = (section: TaskSectionKey = 'list') =>
  `/tasks/${section}`

export const getTasksListIssuePath = (issueId: string) =>
  `/tasks/list/issues/${issueId}`
