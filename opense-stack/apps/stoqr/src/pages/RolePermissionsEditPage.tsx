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

const formatLabel = (value: string) =>
  value
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const parseRoleRank = (value: string): number | null => {
  if (!value.trim()) return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return null
  return parsed
}

export const RolePermissionsEditPage = () => {
  const { roleId } = useParams<{ roleId?: string }>()
  const navigate = useNavigate()
  const { companyId } = useCompany()
  const { data, isLoading } = useTeamSettingsData(companyId)
  const updateRoleMutation = useUpdateRoleWithPermissions(companyId)

  const roles = data?.roles ?? []
  const permissions = data?.permissions ?? []
  const rolePermissions = data?.rolePermissions ?? {}
  const role = roles.find((item) => item.id === roleId) ?? null
  const isOwnerRole = role?.name.trim().toLowerCase() === 'owner'

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
    setSelectedPermissions(rolePermissions[role.id] ?? [])
    setMessage(null)
  }, [role, rolePermissions])

  const permissionMatrix = useMemo(() => {
    const rows = new Map<string, { key: string; label: string; codesByType: Record<string, string> }>()
    const typeSet = new Set<string>()

    for (const permission of permissions) {
      const parts = permission.code.split('.')
      const type = parts.length > 1 ? parts[parts.length - 1] : 'access'
      const resourceKey = parts.length > 1 ? parts.slice(0, -1).join('.') : permission.code

      if (!rows.has(resourceKey)) {
        rows.set(resourceKey, {
          key: resourceKey,
          label: formatLabel(resourceKey),
          codesByType: {},
        })
      }

      rows.get(resourceKey)!.codesByType[type] = permission.code
      typeSet.add(type)
    }

    const preferredOrder = ['view', 'edit', 'manage', 'use']
    const types = Array.from(typeSet).sort((left, right) => {
      const leftIndex = preferredOrder.indexOf(left)
      const rightIndex = preferredOrder.indexOf(right)

      if (leftIndex >= 0 && rightIndex >= 0) return leftIndex - rightIndex
      if (leftIndex >= 0) return -1
      if (rightIndex >= 0) return 1
      return left.localeCompare(right)
    })

    return {
      types,
      rows: Array.from(rows.values()).sort((left, right) => left.label.localeCompare(right.label)),
    }
  }, [permissions])

  const hasDuplicateRoleRank = (parsedRoleRank: number) =>
    roles.some((item) => item.id !== roleId && item.role_rank === parsedRoleRank)

  const handleTogglePermission = (permissionCode: string, checked: boolean) => {
    setSelectedPermissions((current) => {
      if (checked) {
        return Array.from(new Set([...current, permissionCode]))
      }

      return current.filter((code) => code !== permissionCode)
    })
    setMessage(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!role || !roleId || isOwnerRole) return

    const trimmedName = name.trim()
    if (!trimmedName) {
      setMessage('Role name is required.')
      return
    }

    const parsedRoleRank = parseRoleRank(roleRank)
    if (parsedRoleRank === null) {
      setMessage('Role rank must be a non-negative integer.')
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
      ) : isOwnerRole ? (
        <EmptyState title="Owner role is system-managed" description="The owner role cannot be edited directly." />
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
                  Choose access types per permission area for this role.
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
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateRoleMutation.isPending || !name.trim()}
                loading={updateRoleMutation.isPending}
              >
                <Save size={16} />
                Save
              </Button>
            </div>
          </header>

          {message ? (
            <div className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {message}
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 gap-5 overflow-hidden xl:grid-cols-[minmax(320px,0.34fr)_minmax(0,0.66fr)]">
            <Card padding="lg" className="min-h-0 overflow-y-auto">
              <CardHeader>
                <CardTitle>Role Details</CardTitle>
                <CardDescription>Name, description, and rank shown across the organisation.</CardDescription>
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
                    disabled={updateRoleMutation.isPending}
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
                    disabled={updateRoleMutation.isPending}
                    rows={5}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--color-foreground)]">
                    Role Rank
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={roleRank}
                    onChange={(event) => {
                      setRoleRank(event.target.value)
                      setMessage(null)
                    }}
                    disabled={updateRoleMutation.isPending}
                  />
                </div>
              </CardContent>
            </Card>

            <Card padding="lg" className="flex min-h-0 flex-col overflow-hidden">
              <CardHeader className="shrink-0">
                <CardTitle>Permission Matrix</CardTitle>
                <CardDescription>Select the permissions assigned to this role.</CardDescription>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permission</TableHead>
                      {permissionMatrix.types.map((type) => (
                        <TableHead key={type}>{formatLabel(type)}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissionMatrix.rows.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell className="font-medium text-[var(--color-foreground)]">
                          {row.label}
                        </TableCell>
                        {permissionMatrix.types.map((type) => {
                          const permissionCode = row.codesByType[type]

                          if (!permissionCode) {
                            return (
                              <TableCell key={`${row.key}-${type}`} className="text-[var(--color-muted-foreground)]">
                                -
                              </TableCell>
                            )
                          }

                          return (
                            <TableCell key={`${row.key}-${type}`}>
                              <Checkbox
                                checked={selectedPermissions.includes(permissionCode)}
                                onChange={(event) => handleTogglePermission(permissionCode, event.target.checked)}
                                disabled={updateRoleMutation.isPending}
                              />
                            </TableCell>
                          )
                        })}
                      </TableRow>
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
