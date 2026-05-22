const legacyPermissionAliases: Record<string, string[]> = {
  'products.view': ['inventory.view', 'inventory.use'],
  'products.manage': ['inventory.create', 'inventory.edit', 'inventory.adjust', 'inventory.delete'],
  'inventory.bulk_manage': ['inventory.import_export'],
  'transactions.view': ['inventory.use'],
  'transactions.create': ['inventory.adjust', 'scanner.use'],
  'scanner.use': ['scanner.view', 'scanner.use'],
  'labels.manage': ['labels.view', 'labels.use', 'labels.manage'],
  'procurement.manage': ['procurement.view', 'procurement.create', 'procurement.receive', 'procurement.manage'],
  'alerts.manage': ['alerts.view', 'alerts.use', 'alerts.manage'],
  'company.manage': ['organisation.company.manage'],
  'billing.manage': ['organisation.billing.manage'],
  'members.view': ['organisation.view'],
  'members.manage': ['organisation.members.manage'],
  'roles.manage': ['organisation.roles.manage'],
  'activity.view': ['organisation.activity.view'],
}

const impliedPermissionAliases: Record<string, string[]> = {
  'inventory.use': ['inventory.view'],
  'inventory.create': ['inventory.view', 'inventory.use'],
  'inventory.edit': ['inventory.view', 'inventory.use'],
  'inventory.adjust': ['inventory.view', 'inventory.use'],
  'inventory.delete': ['inventory.view', 'inventory.use'],
  'inventory.import_export': ['inventory.view', 'inventory.use'],
  'scanner.use': ['scanner.view'],
  'labels.use': ['labels.view'],
  'labels.manage': ['labels.view', 'labels.use'],
  'reports.export': ['reports.view'],
  'procurement.create': ['procurement.view'],
  'procurement.receive': ['procurement.view'],
  'procurement.manage': ['procurement.view', 'procurement.create', 'procurement.receive'],
  'alerts.use': ['alerts.view'],
  'alerts.manage': ['alerts.view', 'alerts.use'],
  'organisation.members.manage': ['organisation.view'],
  'organisation.roles.manage': ['organisation.view'],
  'organisation.pages.manage': ['organisation.view'],
  'organisation.activity.view': ['organisation.view'],
  'organisation.company.manage': ['organisation.view'],
  'organisation.billing.manage': ['organisation.view'],
}

export const expandPermissionCodes = (codes: string[]) => {
  const expanded = new Set<string>()
  const queue = [...codes]

  while (queue.length > 0) {
    const code = queue.shift()
    if (!code || expanded.has(code)) continue

    expanded.add(code)
    for (const implied of [...(legacyPermissionAliases[code] ?? []), ...(impliedPermissionAliases[code] ?? [])]) {
      if (!expanded.has(implied)) queue.push(implied)
    }
  }

  return Array.from(expanded)
}

export const visiblePermissionCodes = (codes: string[], visibleCodes: Set<string>) =>
  expandPermissionCodes(codes).filter((code) => visibleCodes.has(code))

export const hasPermissionCode = (codes: string[], permissionCode: string) =>
  expandPermissionCodes(codes).includes(permissionCode)
