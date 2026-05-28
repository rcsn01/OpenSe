import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@repo/ui'

import { StoqrPageShell } from '../components/StoqrPageShell'
import { useCompany } from '../contexts/CompanyContext'
import { useTeamSettingsData, useUpdateRoleWithPermissions } from '../hooks/queries/useTeamSettings'
import { visiblePermissionCodes } from '../lib/permissions'

const formatLabel = (value: string) =>
  value
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const parseRoleRank = (value: string): number | null => {
  if (!value.trim()) return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

const normalizeRoleName = (name: string) => name.trim().toLowerCase()
const isSystemRoleName = (name: string) => ['owner', 'default', 'guest'].includes(normalizeRoleName(name))
const isOwnerRoleName = (name: string) => normalizeRoleName(name) === 'owner'
const isDefaultRoleName = (name: string) => normalizeRoleName(name) === 'default'

type PermissionGroup = {
  key: string
  label: string
  viewCode: string | null
  permissions: Array<{ code: string; label: string; actionKey: string; description: string | null; sortOrder: number }>
}

const buildPermissionGroups = (permissions: Array<{
  code: string
  description: string | null
  page_key?: string | null
  action_key?: string | null
  label?: string | null
  sort_order?: number | null
  hidden?: boolean
  deprecated?: boolean
}>): PermissionGroup[] => {
  const groups = new Map<string, PermissionGroup>()

  permissions
    .filter((permission) => !permission.hidden && !permission.deprecated)
    .forEach((permission) => {
      const parts = permission.code.split('.')
      const pageKey = permission.page_key ?? (parts.length > 1 ? parts[0] : permission.code)
      const actionKey = permission.action_key ?? (parts.length > 1 ? parts.slice(1).join('.') : 'view')
      const pageLabel = formatLabel(pageKey)
      const sortOrder = permission.sort_order ?? 0

      if (!groups.has(pageKey)) {
        groups.set(pageKey, {
          key: pageKey,
          label: pageLabel,
          viewCode: null,
          permissions: [],
        })
      }

      const group = groups.get(pageKey)!
      const permissionRow = {
        code: permission.code,
        label: permission.label ?? formatLabel(actionKey),
        actionKey,
        description: permission.description,
        sortOrder,
      }

      if (actionKey === 'view') {
        group.viewCode = permission.code
      }

      group.permissions.push(permissionRow)
    })

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      permissions: group.permissions.sort((left, right) => {
        if (left.actionKey === 'view') return -1
        if (right.actionKey === 'view') return 1
        return left.sortOrder - right.sortOrder || left.label.localeCompare(right.label)
      }),
    }))
    .sort((left, right) => {
      const leftSort = left.permissions[0]?.sortOrder ?? 0
      const rightSort = right.permissions[0]?.sortOrder ?? 0
      return leftSort - rightSort || left.label.localeCompare(right.label)
    })
}

export const RolePermissionsEditPage = () => {
  const { roleId } = useParams<{ roleId?: string }>()
  const navigate = useNavigate()
  const { companyId } = useCompany()
  const { data, isLoading } = useTeamSettingsData(companyId)
  const updateRoleMutation = useUpdateRoleWithPermissions(companyId)

  const roles = data?.roles ?? []
  const permissions = data?.permissions ?? []
  const visiblePermissionCodeSet = useMemo(() => new Set(permissions.map((permission) => permission.code)), [permissions])
  const rolePermissions = data?.rolePermissions ?? {}
  const role = roles.find((item) => item.id === roleId) ?? null
  const isSystemRole = role ? isSystemRoleName(role.name) : false
  const isOwnerRole = role ? isOwnerRoleName(role.name) : false
  const isDefaultRole = role ? isDefaultRoleName(role.name) : false
  const isLegacyGuestRole = role ? normalizeRoleName(role.name) === 'guest' : false
  const isDetailsReadOnly = isSystemRole || updateRoleMutation.isPending
  const arePermissionsReadOnly = isOwnerRole || isLegacyGuestRole || updateRoleMutation.isPending

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [roleRank, setRoleRank] = useState('100')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!role) return

    setName(role.name)
    setDescription(role.description ?? '')
    setRoleRank(String(role.role_rank ?? 100))
    setSelectedPermissions(visiblePermissionCodes(rolePermissions[role.id] ?? [], visiblePermissionCodeSet))
    setMessage(null)
  }, [role, rolePermissions, visiblePermissionCodeSet])

  const permissionGroups = useMemo(() => buildPermissionGroups(permissions), [permissions])

  const hasDuplicateRoleRank = (parsedRoleRank: number) =>
    roles.some((item) => item.id !== roleId && item.role_rank === parsedRoleRank)

  const handleTogglePermission = (permissionCode: string, checked: boolean) => {
    setSelectedPermissions((current) => {
      const group = permissionGroups.find((item) => item.permissions.some((permission) => permission.code === permissionCode))
      const isViewPermission = group?.viewCode === permissionCode

      if (checked) {
        return Array.from(new Set([...current, ...(group?.viewCode ? [group.viewCode] : []), permissionCode]))
      }

      if (isViewPermission && group) {
        const groupCodes = new Set(group.permissions.map((permission) => permission.code))
        return current.filter((code) => !groupCodes.has(code))
      }

      return current.filter((code) => code !== permissionCode)
    })
    setMessage(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!role || !roleId || isOwnerRole || isLegacyGuestRole) return

    if (isDefaultRole) {
      try {
        setMessage(null)
        await updateRoleMutation.mutateAsync({
          roleId,
          name: role.name,
          description: role.description ?? '',
          roleRank: role.role_rank,
          permissionCodes: selectedPermissions,
        })
        navigate('/settings/organisations/permissions')
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Failed to save role changes.')
      }
      return
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      setMessage('Role name is required.')
      return
    }

    const parsedRoleRank = parseRoleRank(roleRank)
    if (parsedRoleRank === null) {
      setMessage('Role rank must be a positive integer.')
      return
    }

    if (hasDuplicateRoleRank(parsedRoleRank)) {
      setMessage('Role rank must be unique within your organisation.')
      return
    }

    try {
      setMessage(null)
      await updateRoleMutation.mutateAsync({
        roleId,
        name: trimmedName,
        description,
        roleRank: parsedRoleRank,
        permissionCodes: selectedPermissions,
      })
      navigate('/settings/organisations/permissions')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save role changes.')
    }
  }

  return (
    <StoqrPageShell
      companyId={companyId}
      isLoading={isLoading}
      loadingMessage="Loading role..."
      emptyStateTitle="No organisation selected"
      emptyStateDescription="Choose an organisation to edit role permissions."
      contentClassName="flex h-full min-h-0 overflow-hidden px-2 pb-8 pt-[18px]"
      containerClassName="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-hidden text-[var(--color-foreground)]"
    >
      {!role ? (
        <EmptyState title="Role not found" description="Return to permissions and choose a role again." />
      ) : (
        <form className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden" onSubmit={handleSubmit}>
          <header className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-col gap-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit px-0 text-[var(--color-muted-foreground)] hover:bg-transparent hover:text-[var(--color-foreground)]"
                onClick={() => navigate('/settings/organisations/permissions')}
              >
                <ArrowLeft size={15} />
                Back to Permissions
              </Button>

              <div>
                <h1 className="m-0 text-3xl font-semibold leading-tight tracking-normal text-[var(--color-foreground)]">
                  Edit Role Permissions
                </h1>
                <p className="m-0 mt-2 text-sm text-[var(--color-muted-foreground)]">
                  {isSystemRole
                    ? `${role.name} is system-managed. Review its details here.`
                    : 'Choose access types per permission area for this role.'}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/settings/organisations/permissions')}
                disabled={updateRoleMutation.isPending}
              >
                {isSystemRole ? 'Back' : 'Cancel'}
              </Button>
              {!isOwnerRole && !isLegacyGuestRole ? (
                <Button
                  type="submit"
                  disabled={updateRoleMutation.isPending || (!isDefaultRole && !name.trim())}
                  loading={updateRoleMutation.isPending}
                >
                  <Save size={16} />
                  Save
                </Button>
              ) : null}
            </div>
          </header>

          {isSystemRole ? (
            <div className="shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
              {isDefaultRole
                ? 'The default role is system-managed, so its details are read-only. Its permissions can be edited by role managers.'
                : `The ${role.name.toLowerCase()} role is system-managed, so its details and permissions are read-only.`}
            </div>
          ) : null}

          {message ? (
            <div className="shrink-0 rounded-lg border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-3 py-2 text-sm text-[var(--color-status-danger-foreground)]">
              {message}
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 gap-5 overflow-hidden xl:grid-cols-[minmax(320px,0.34fr)_minmax(0,0.66fr)]">
            <Card padding="lg" className="min-h-0 overflow-y-auto">
              <CardHeader>
                <CardTitle>Role Details</CardTitle>
                <CardDescription>
                  {isSystemRole
                    ? 'Name, description, and rank are managed by the system.'
                    : 'Name, description, and rank shown across the organisation.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                    Role Name
                  </label>
                  <Input
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value)
                      setMessage(null)
                    }}
                    disabled={isDetailsReadOnly}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                    Description
                  </label>
                  <Textarea
                    value={description}
                    onChange={(event) => {
                      setDescription(event.target.value)
                      setMessage(null)
                    }}
                    disabled={isDetailsReadOnly}
                    rows={5}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                    Role Rank
                  </label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={roleRank}
                    onChange={(event) => {
                      setRoleRank(event.target.value)
                      setMessage(null)
                    }}
                    disabled={isDetailsReadOnly}
                  />
                </div>
              </CardContent>
            </Card>

            <Card padding="lg" className="flex min-h-0 flex-col overflow-hidden">
              <CardHeader className="shrink-0">
                <CardTitle>Permission Matrix</CardTitle>
                <CardDescription>
                  {isSystemRole
                    ? isDefaultRole
                      ? 'Select the permissions assigned to the default role.'
                      : 'Permissions assigned to this system-managed role.'
                    : 'Select the permissions assigned to this role.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page</TableHead>
                      <TableHead>Permission</TableHead>
                      <TableHead>Enabled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissionGroups.map((group) => (
                      group.permissions.map((permission, index) => (
                        <TableRow key={permission.code}>
                          <TableCell className="align-top font-medium text-[var(--color-foreground)]">
                            {index === 0 ? group.label : ''}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-[var(--color-foreground)]">{permission.label}</div>
                            {permission.description ? (
                              <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">{permission.description}</div>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={selectedPermissions.includes(permission.code)}
                              onChange={(event) => handleTogglePermission(permission.code, event.target.checked)}
                              disabled={arePermissionsReadOnly}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </form>
      )}
    </StoqrPageShell>
  )
}
