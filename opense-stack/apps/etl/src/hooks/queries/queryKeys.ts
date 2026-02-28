export const workflowKeys = {
  all: ['workflows'] as const,
  list: (userId: string | undefined, orgId: string | null | undefined, mode: 'personal' | 'org', isDemoUser: boolean) =>
    ['workflows', userId, orgId, mode, isDemoUser] as const,
  detail: (id: string | null, isDemoUser: boolean) => ['workflow', id, isDemoUser] as const,
  detailBase: (id: string) => ['workflow', id] as const,
}

export const organisationKeys = {
  userOrganisations: (userId: string | undefined, isDemoUser: boolean) =>
    ['userOrganisations', userId, isDemoUser] as const,
  members: (orgId: string | undefined, isDemoUser: boolean) => ['organisationMembers', orgId, isDemoUser] as const,
}

export const activityKeys = {
  executionLogs: (userId: string | undefined, orgId: string | null | undefined, isDemoUser: boolean) =>
    ['executionLogs', userId, orgId, isDemoUser] as const,
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
  appPermissions: (isDemoUser: boolean) => ['appPermissions', isDemoUser] as const,
  orgRoles: (orgId: string | undefined, isDemoUser: boolean) => ['orgRoles', orgId, isDemoUser] as const,
  memberRoleAssignments: (orgId: string | undefined, isDemoUser: boolean) =>
    ['memberRoleAssignments', orgId, isDemoUser] as const,
}

export const versionKeys = {
  list: (workflowId: string | null) => ['workflowVersions', workflowId] as const,
  detail: (versionId: string | null) => ['workflowVersion', versionId] as const,
}

export const galleryKeys = {
  templates: (isDemoUser: boolean) => ['galleryTemplates', isDemoUser] as const,
}
