import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Checkbox } from '../ui/Checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog'
import { Input, Textarea } from '../ui/Input'
import { StackLayout } from '../layout/StackLayout'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table'

export type OrganisationRole = {
  id: string
  name: string
  description: string | null
  permissionCodes: string[]
}

export type OrganisationPermission = {
  code: string
  description: string | null
}

type RolePayload = {
  name: string
  description: string
  permissionCodes: string[]
}

type OrganisationPermissionsPanelProps = {
  title?: string
  description?: string
  roles: OrganisationRole[]
  permissions: OrganisationPermission[]
  loadingRoles?: boolean
  loadingPermissions?: boolean
  canManage: boolean
  isRoleEditable?: (role: OrganisationRole) => boolean
  onCreateRole: (payload: RolePayload) => Promise<void> | void
  onUpdateRole: (roleId: string, payload: RolePayload) => Promise<void> | void
  onDeleteRole?: (roleId: string) => Promise<void> | void
}

const formatLabel = (value: string) =>
  value
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

export function OrganisationPermissionsPanel({
  title = 'Organisation Roles',
  description = 'Manage roles and their permissions.',
  roles,
  permissions,
  loadingRoles = false,
  loadingPermissions = false,
  canManage,
  isRoleEditable,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
}: OrganisationPermissionsPanelProps) {
  const [addName, setAddName] = useState('')
  const [addDescription, setAddDescription] = useState('')
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPermissions, setEditPermissions] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    const rowsList = Array.from(rows.values()).sort((left, right) => left.label.localeCompare(right.label))

    return {
      types,
      rows: rowsList,
    }
  }, [permissions])

  const openEditRole = (roleId: string) => {
    const role = roles.find((item) => item.id === roleId)
    if (!role) return

    setEditingRoleId(role.id)
    setEditName(role.name)
    setEditDescription(role.description ?? '')
    setEditPermissions(role.permissionCodes)
    setError(null)
  }

  const closeEditRole = () => {
    setEditingRoleId(null)
    setEditName('')
    setEditDescription('')
    setEditPermissions([])
    setError(null)
  }

  const handleTogglePermission = (permissionCode: string, checked: boolean) => {
    setEditPermissions((current) => {
      if (checked) {
        return Array.from(new Set([...current, permissionCode]))
      }
      return current.filter((code) => code !== permissionCode)
    })
  }

  const handleAddRole = async () => {
    const trimmedName = addName.trim()
    if (!trimmedName) {
      setError('Role name is required.')
      return
    }

    try {
      setSaving(true)
      setError(null)
      await onCreateRole({
        name: trimmedName,
        description: addDescription,
        permissionCodes: [],
      })
      setAddName('')
      setAddDescription('')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save role.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveRoleEdits = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingRoleId) return

    const trimmedName = editName.trim()
    if (!trimmedName) {
      setError('Role name is required.')
      return
    }

    try {
      setSaving(true)
      setError(null)
      await onUpdateRole(editingRoleId, {
        name: trimmedName,
        description: editDescription,
        permissionCodes: editPermissions,
      })
      closeEditRole()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save role changes.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRole = async (roleId: string) => {
    if (!onDeleteRole) return
    if (!window.confirm('Delete this role? Members assigned to it will lose the custom role assignment.')) {
      return
    }

    try {
      setSaving(true)
      setError(null)
      await onDeleteRole(roleId)

      if (editingRoleId === roleId) {
        closeEditRole()
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to delete role.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <StackLayout>
      <Card padding="md">
        <CardHeader>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          {loadingRoles ? (
            <div className="py-8 text-center text-slate-500">Loading roles...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[220px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-slate-500">
                      No roles yet.
                    </TableCell>
                  </TableRow>
                )}

                {roles.map((role) => {
                  const editable = isRoleEditable ? isRoleEditable(role) : true

                  return (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium text-slate-900">{role.name}</TableCell>
                      <TableCell className="text-slate-600">{role.description || '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openEditRole(role.id)}
                            disabled={!canManage || saving || !editable}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          {onDeleteRole && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteRole(role.id)}
                              disabled={!canManage || saving || !editable}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}

                <TableRow>
                  <TableCell>
                    <Input
                      value={addName}
                      onChange={(event) => setAddName(event.target.value)}
                      placeholder="New role name"
                      disabled={!canManage || saving}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={addDescription}
                      onChange={(event) => setAddDescription(event.target.value)}
                      placeholder="Role description"
                      disabled={!canManage || saving}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      onClick={handleAddRole}
                      disabled={!canManage || saving || !addName.trim()}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Role
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingRoleId)} onClose={closeEditRole}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Edit Role Permissions</DialogTitle>
            <DialogDescription>
              Choose access types per permission area for this role.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSaveRoleEdits}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Role Name</label>
                <Input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  disabled={!canManage || saving}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <Textarea
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  disabled={!canManage || saving}
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200">
              {loadingPermissions ? (
                <div className="py-8 text-center text-sm text-slate-500">Loading permissions...</div>
              ) : (
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
                        <TableCell className="font-medium text-slate-900">{row.label}</TableCell>
                        {permissionMatrix.types.map((type) => {
                          const permissionCode = row.codesByType[type]

                          if (!permissionCode) {
                            return (
                              <TableCell key={`${row.key}-${type}`} className="text-slate-400">
                                —
                              </TableCell>
                            )
                          }

                          return (
                            <TableCell key={`${row.key}-${type}`}>
                              <Checkbox
                                checked={editPermissions.includes(permissionCode)}
                                onChange={(event) =>
                                  handleTogglePermission(permissionCode, event.target.checked)
                                }
                                disabled={!canManage || saving}
                              />
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditRole} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canManage || saving || !editName.trim()}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </StackLayout>
  )
}
