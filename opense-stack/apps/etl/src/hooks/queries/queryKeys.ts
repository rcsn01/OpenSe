export const workflowKeys = {
  all: ['workflows'] as const,
  list: (userId: string | undefined, orgId: string | null | undefined, mode: 'personal' | 'org') =>
    ['workflows', userId, orgId, mode] as const,
  detail: (id: string | null) => ['workflow', id] as const,
  detailBase: (id: string) => ['workflow', id] as const,
}

export const organisationKeys = {
  userOrganisations: (userId: string | undefined) => ['userOrganisations', userId] as const,
  members: (orgId: string | undefined) => ['organisationMembers', orgId] as const,
}

export const activityKeys = {
  executionLogs: (userId: string | undefined, orgId: string | null | undefined) =>
    ['executionLogs', userId, orgId] as const,
}

export const notificationKeys = {
  settings: (workflowId: string | null) => ['notificationSettings', workflowId] as const,
}

export const usageKeys = {
  orgStats: (orgId: string | null | undefined) => ['orgUsageStats', orgId] as const,
  orgActiveUsers: (orgId: string | null | undefined) => ['orgActiveUsers', orgId] as const,
  personalStats: () => ['personalUsageStats'] as const,
}

export const permissionKeys = {
  appPermissions: () => ['appPermissions'] as const,
  orgRoles: (orgId: string | undefined) => ['orgRoles', orgId] as const,
  memberRoleAssignments: (orgId: string | undefined) => ['memberRoleAssignments', orgId] as const,
}

export const versionKeys = {
  list: (workflowId: string | null) => ['workflowVersions', workflowId] as const,
  detail: (versionId: string | null) => ['workflowVersion', versionId] as const,
}

export const galleryKeys = {
  templates: () => ['galleryTemplates'] as const,
}
