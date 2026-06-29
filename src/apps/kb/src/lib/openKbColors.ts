import type { Issue, IssueAssignee, OpenKbProfile, OpenKbTeam } from '../types'

export const openKbLightPalette = [
  '#bfdbfe',
  '#bbf7d0',
  '#fecaca',
  '#fed7aa',
  '#fde68a',
  '#c4b5fd',
  '#a7f3d0',
  '#bae6fd',
  '#fbcfe8',
  '#ddd6fe',
  '#ccfbf1',
  '#e9d5ff',
] as const

const fallbackColor = openKbLightPalette[0]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

export const normalizeHexColor = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  const shortMatch = /^#?([0-9a-f]{3})$/i.exec(trimmed)
  if (shortMatch) {
    return `#${shortMatch[1].split('').map((part) => `${part}${part}`).join('')}`.toLowerCase()
  }

  const longMatch = /^#?([0-9a-f]{6})$/i.exec(trimmed)
  return longMatch ? `#${longMatch[1].toLowerCase()}` : null
}

const hashString = (value: string) => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

export const getOpenKbItemColor = (value: string | null | undefined) => {
  const key = value?.trim() || 'open-kb-item'
  return openKbLightPalette[hashString(key) % openKbLightPalette.length]
}

export const getRandomOpenKbLightColor = () =>
  openKbLightPalette[Math.floor(Math.random() * openKbLightPalette.length)]

export const getOpenKbProfileColor = (profile: OpenKbProfile | null | undefined, fallbackIdentity?: string | null) =>
  getOpenKbItemColor(profile?.id || profile?.email || profile?.username || profile?.full_name || fallbackIdentity || 'open-kb-user')

export const getOpenKbTeamColor = (team: Pick<OpenKbTeam, 'id' | 'metadata'> | null | undefined) => {
  const metadataColor = isRecord(team?.metadata) ? normalizeHexColor(team.metadata.color) : null
  return metadataColor ?? null
}

export const getOpenKbTextColorForBackground = (color: string) => {
  const normalized = normalizeHexColor(color) ?? fallbackColor
  const red = Number.parseInt(normalized.slice(1, 3), 16)
  const green = Number.parseInt(normalized.slice(3, 5), 16)
  const blue = Number.parseInt(normalized.slice(5, 7), 16)
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
  return luminance > 0.6 ? '#1e293b' : '#ffffff'
}

export const resolveTimelineIssueColor = ({
  issue,
  assignees,
  teams,
}: {
  issue: Issue
  assignees: IssueAssignee[]
  teams: OpenKbTeam[]
}) => {
  const teamById = new Map(teams.map((team) => [team.id, team]))
  const issueTeam = issue.team_id ? (issue.team ?? teamById.get(issue.team_id) ?? null) : null
  const issueTeamStatus = issueTeam?.status ?? teamById.get(issue.team_id ?? '')?.status ?? null
  const teamColor = issueTeamStatus !== 'archived'
    ? getOpenKbTeamColor(issueTeam ?? teamById.get(issue.team_id ?? ''))
    : null
  if (teamColor) return teamColor

  const assignee = assignees.find((item) => item.issue_id === issue.id)
  if (assignee) return getOpenKbProfileColor(assignee.profile, assignee.profile_id)

  return getOpenKbItemColor(issue.id)
}
