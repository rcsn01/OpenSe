import {
  CalendarDays,
  Columns3,
  FileText,
  FolderOpen,
  Gauge,
  GanttChart,
  LayoutDashboard,
  List,
  MessageSquare,
  NotebookText,
  Settings,
  Split,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

export const projectTabKeys = [
  'overview',
  'list',
  'board',
  'timeline',
  'dashboard',
  'calendar',
  'workflow',
  'messages',
  'note',
  'gantt',
  'workload',
  'files',
  'cycles',
  'estimates',
  'pages',
  'settings',
] as const

export type ProjectTabKey = typeof projectTabKeys[number]
export type ProjectTabGroup = 'popular' | 'other' | 'existing'

export type ProjectTabDefinition = {
  key: ProjectTabKey
  label: string
  path: string
  group: ProjectTabGroup
  required?: boolean
  icon: LucideIcon
}

export const projectTabDefinitions: ProjectTabDefinition[] = [
  { key: 'overview', label: 'Overview', path: 'overview', group: 'popular', icon: LayoutDashboard },
  { key: 'list', label: 'List', path: 'list', group: 'popular', required: true, icon: List },
  { key: 'board', label: 'Board', path: 'board', group: 'popular', icon: Columns3 },
  { key: 'timeline', label: 'Timeline', path: 'timeline', group: 'popular', icon: Split },
  { key: 'dashboard', label: 'Dashboard', path: 'dashboard', group: 'popular', icon: Gauge },
  { key: 'calendar', label: 'Calendar', path: 'calendar', group: 'popular', icon: CalendarDays },
  { key: 'workflow', label: 'Workflow', path: 'workflow', group: 'other', icon: Workflow },
  { key: 'messages', label: 'Messages', path: 'messages', group: 'other', icon: MessageSquare },
  { key: 'note', label: 'Note', path: 'note', group: 'other', icon: NotebookText },
  { key: 'gantt', label: 'Gantt', path: 'gantt', group: 'other', icon: GanttChart },
  { key: 'workload', label: 'Workload', path: 'workload', group: 'other', icon: Users },
  { key: 'files', label: 'Files', path: 'files', group: 'other', icon: FolderOpen },
  { key: 'cycles', label: 'Cycles', path: 'cycles', group: 'existing', icon: CalendarDays },
  { key: 'estimates', label: 'Estimates', path: 'estimates', group: 'existing', icon: Gauge },
  { key: 'pages', label: 'Pages', path: 'pages', group: 'existing', icon: FileText },
  { key: 'settings', label: 'Settings', path: 'settings', group: 'existing', icon: Settings },
]

export const defaultProjectTabKeys: ProjectTabKey[] = [
  'overview',
  'list',
  'cycles',
  'estimates',
  'pages',
  'settings',
]

export const requiredProjectTabKey: ProjectTabKey = 'list'

export const projectTabDefinitionByKey = new Map(projectTabDefinitions.map((tab) => [tab.key, tab]))
export const projectTabKeysSet = new Set<ProjectTabKey>(projectTabKeys)

export const getProjectTabDefinition = (key: ProjectTabKey) => projectTabDefinitionByKey.get(key)

export const isProjectTabKey = (value: string | null | undefined): value is ProjectTabKey =>
  Boolean(value && projectTabKeysSet.has(value as ProjectTabKey))

export const getProjectTabKeyFromSection = (section: string | undefined): ProjectTabKey => {
  if (!section) return 'overview'
  if (section === 'issues') return 'list'
  return isProjectTabKey(section) ? section : 'overview'
}

export const getProjectTabPath = (projectId: string, key: ProjectTabKey) => {
  const path = projectTabDefinitionByKey.get(key)?.path ?? 'overview'
  return `/projects/${projectId}/${path}`
}

export const getProjectTabInstancePath = (projectId: string, key: ProjectTabKey, tabId: string) => {
  const path = projectTabDefinitionByKey.get(key)?.path ?? 'overview'
  return `/projects/${projectId}/${path}/${tabId}`
}
