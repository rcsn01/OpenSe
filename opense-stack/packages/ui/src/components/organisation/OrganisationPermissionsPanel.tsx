import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "../ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/Card";
import { Checkbox } from "../ui/Checkbox";
import {
  SideSheet,
  SideSheetBody,
  SideSheetContent,
  SideSheetDescription,
  SideSheetFooter,
  SideSheetHeader,
  SideSheetTitle,
} from "../ui/SideSheet";
import { Input, Textarea } from "../ui/Input";
import { StackLayout } from "../layout/StackLayout";
import {
  DataTable,
  type DataTableColumn,
  type DataTableTopRowConfig,
} from "../ui/DataTable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/Table";

export type OrganisationRole = {
  id: string;
  name: string;
  description: string | null;
  roleRank?: number;
  permissionCodes: string[];
};

export type OrganisationPermission = {
  code: string;
  description: string | null;
  page_key?: string | null;
  action_key?: string | null;
  label?: string | null;
  sort_order?: number | null;
  hidden?: boolean;
  deprecated?: boolean;
};

type RolePayload = {
  name: string;
  description: string;
  roleRank: number;
  permissionCodes: string[];
};

type OrganisationPermissionsPanelProps = {
  title?: string;
  description?: string;
  roles: OrganisationRole[];
  permissions: OrganisationPermission[];
  loadingRoles?: boolean;
  loadingPermissions?: boolean;
  canManage: boolean;
  isRoleEditable?: (role: OrganisationRole) => boolean;
  onEditRole?: (roleId: string) => void;
  onCreateRole: (payload: RolePayload) => Promise<void> | void;
  onUpdateRole: (roleId: string, payload: RolePayload) => Promise<void> | void;
  onDeleteRole?: (roleId: string) => Promise<void> | void;
};

type RoleTableRow = {
  id: string;
  name: string;
  description: string | null;
  roleRank?: number;
  editable: boolean;
};

type RoleSortField = "name" | "description" | "role-rank";

const formatLabel = (value: string) =>
  value
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

type PermissionGroup = {
  key: string;
  label: string;
  viewCode: string | null;
  permissions: Array<{
    code: string;
    label: string;
    actionKey: string;
    description: string | null;
    sortOrder: number;
  }>;
};

const buildPermissionGroups = (
  permissions: OrganisationPermission[],
): PermissionGroup[] => {
  const groups = new Map<string, PermissionGroup>();

  permissions
    .filter((permission) => !permission.hidden && !permission.deprecated)
    .forEach((permission) => {
      const parts = permission.code.split(".");
      const pageKey =
        permission.page_key ?? (parts.length > 1 ? parts[0] : permission.code);
      const actionKey =
        permission.action_key ??
        (parts.length > 1 ? parts.slice(1).join(".") : "view");

      if (!groups.has(pageKey)) {
        groups.set(pageKey, {
          key: pageKey,
          label: formatLabel(pageKey),
          viewCode: null,
          permissions: [],
        });
      }

      const group = groups.get(pageKey)!;
      if (actionKey === "view") {
        group.viewCode = permission.code;
      }

      group.permissions.push({
        code: permission.code,
        label: permission.label ?? formatLabel(actionKey),
        actionKey,
        description: permission.description,
        sortOrder: permission.sort_order ?? 0,
      });
    });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      permissions: group.permissions.sort((left, right) => {
        if (left.actionKey === "view") return -1;
        if (right.actionKey === "view") return 1;
        return (
          left.sortOrder - right.sortOrder ||
          left.label.localeCompare(right.label)
        );
      }),
    }))
    .sort((left, right) => {
      const leftSort = left.permissions[0]?.sortOrder ?? 0;
      const rightSort = right.permissions[0]?.sortOrder ?? 0;
      return leftSort - rightSort || left.label.localeCompare(right.label);
    });
};

export function OrganisationPermissionsPanel({
  title = "Organisation Roles",
  description = "Manage roles and their permissions.",
  roles,
  permissions,
  loadingRoles = false,
  loadingPermissions = false,
  canManage,
  isRoleEditable,
  onEditRole,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
}: OrganisationPermissionsPanelProps) {
  const [addName, setAddName] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addRoleRank, setAddRoleRank] = useState("100");
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRoleRank, setEditRoleRank] = useState("100");
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rolePage, setRolePage] = useState(1);
  const [rolePageSize, setRolePageSize] = useState(10);
  const [roleSortField, setRoleSortField] = useState<RoleSortField | null>(
    null,
  );
  const [roleSortDirection, setRoleSortDirection] = useState<"asc" | "desc">(
    "asc",
  );

  const permissionGroups = useMemo(
    () => buildPermissionGroups(permissions),
    [permissions],
  );

  const openEditRole = (roleId: string) => {
    const role = roles.find((item) => item.id === roleId);
    if (!role) return;

    setEditingRoleId(role.id);
    setEditName(role.name);
    setEditDescription(role.description ?? "");
    setEditRoleRank(String(role.roleRank ?? 100));
    setEditPermissions(role.permissionCodes);
    setError(null);
  };

  const closeEditRole = () => {
    setEditingRoleId(null);
    setEditName("");
    setEditDescription("");
    setEditRoleRank("100");
    setEditPermissions([]);
    setError(null);
  };

  const parseRoleRank = (value: string): number | null => {
    if (!value.trim()) return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
  };

  const hasDuplicateRoleRank = (roleRank: number, ignoreRoleId?: string) => {
    return roles.some(
      (role) => role.id !== ignoreRoleId && role.roleRank === roleRank,
    );
  };

  const handleTogglePermission = (permissionCode: string, checked: boolean) => {
    setEditPermissions((current) => {
      const group = permissionGroups.find((item) =>
        item.permissions.some((permission) => permission.code === permissionCode),
      );
      const isViewPermission = group?.viewCode === permissionCode;

      if (checked) {
        return Array.from(
          new Set([
            ...current,
            ...(group?.viewCode ? [group.viewCode] : []),
            permissionCode,
          ]),
        );
      }

      if (isViewPermission && group) {
        const groupCodes = new Set(
          group.permissions.map((permission) => permission.code),
        );
        return current.filter((code) => !groupCodes.has(code));
      }

      return current.filter((code) => code !== permissionCode);
    });
  };

  const handleAddRole = async () => {
    const trimmedName = addName.trim();
    if (!trimmedName) {
      setError("Role name is required.");
      return;
    }

    const parsedRoleRank = parseRoleRank(addRoleRank);
    if (parsedRoleRank === null) {
      setError("Role rank must be a positive integer.");
      return;
    }

    if (hasDuplicateRoleRank(parsedRoleRank)) {
      setError("Role rank must be unique within your organisation.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onCreateRole({
        name: trimmedName,
        description: addDescription,
        roleRank: parsedRoleRank,
        permissionCodes: [],
      });
      setAddName("");
      setAddDescription("");
      setAddRoleRank("100");
      setIsAddingRole(false);
    } catch (err: any) {
      setError(err?.message ?? "Failed to save role.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRoleEdits = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingRoleId) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      setError("Role name is required.");
      return;
    }

    const parsedRoleRank = parseRoleRank(editRoleRank);
    if (parsedRoleRank === null) {
      setError("Role rank must be a positive integer.");
      return;
    }

    if (hasDuplicateRoleRank(parsedRoleRank, editingRoleId)) {
      setError("Role rank must be unique within your organisation.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onUpdateRole(editingRoleId, {
        name: trimmedName,
        description: editDescription,
        roleRank: parsedRoleRank,
        permissionCodes: editPermissions,
      });
      closeEditRole();
    } catch (err: any) {
      setError(err?.message ?? "Failed to save role changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!onDeleteRole) return;
    if (
      !window.confirm(
        "Delete this role? Members assigned to it will lose the custom role assignment.",
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onDeleteRole(roleId);

      if (editingRoleId === roleId) {
        closeEditRole();
      }
    } catch (err: any) {
      setError(err?.message ?? "Failed to delete role.");
    } finally {
      setSaving(false);
    }
  };

  const roleRows = useMemo<RoleTableRow[]>(() => {
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      roleRank: role.roleRank,
      editable: isRoleEditable ? isRoleEditable(role) : true,
    }));
  }, [isRoleEditable, roles]);

  const sortedRoleRows = useMemo(() => {
    if (!roleSortField) {
      return roleRows;
    }

    const getSortValue = (row: RoleTableRow) => {
      switch (roleSortField) {
        case "name":
          return row.name;
        case "description":
          return row.description ?? "";
        case "role-rank":
          return row.roleRank ?? Number.MAX_SAFE_INTEGER;
        default:
          return "";
      }
    };

    return [...roleRows].sort((a, b) => {
      const first = getSortValue(a);
      const second = getSortValue(b);

      const comparison =
        typeof first === "number" && typeof second === "number"
          ? first - second
          : String(first).localeCompare(String(second), undefined, {
              numeric: true,
              sensitivity: "base",
            });

      return roleSortDirection === "asc" ? comparison : -comparison;
    });
  }, [roleRows, roleSortDirection, roleSortField]);

  const roleTotalPages = Math.max(1, Math.ceil(sortedRoleRows.length / rolePageSize));
  const paginatedRoleRows = useMemo(() => {
    const startIndex = (rolePage - 1) * rolePageSize;
    return sortedRoleRows.slice(startIndex, startIndex + rolePageSize);
  }, [rolePage, rolePageSize, sortedRoleRows]);

  useEffect(() => {
    setRolePage(1);
  }, [roles, rolePageSize]);

  useEffect(() => {
    if (rolePage > roleTotalPages) {
      setRolePage(roleTotalPages);
    }
  }, [rolePage, roleTotalPages]);

  const handleRoleSortChange = (nextSortField: RoleSortField) => {
    if (roleSortField === nextSortField) {
      setRoleSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc",
      );
      return;
    }

    setRoleSortField(nextSortField);
    setRoleSortDirection("asc");
  };

  const usesRoutedEdit = Boolean(onEditRole);

  const roleColumns = useMemo<DataTableColumn<RoleTableRow, RoleSortField>[]>(
    () => [
      {
        id: "name",
        header: "Role Name",
        sortKey: "name",
        width: usesRoutedEdit ? "32%" : "26%",
        cellClassName: "font-medium text-[var(--color-foreground)]",
        renderCell: (row) => (
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate">{row.name}</span>
            {!row.editable ? (
              <span className="shrink-0 rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-muted-foreground)]">
                System-managed
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: "description",
        header: "Description",
        sortKey: "description",
        width: usesRoutedEdit ? "50%" : "44%",
        cellClassName: "text-[var(--color-muted-foreground)]",
        renderCell: (row) => row.description || "—",
      },
      {
        id: "role-rank",
        header: "Role Rank",
        sortKey: "role-rank",
        width: usesRoutedEdit ? "18%" : "14%",
        cellClassName: "text-[var(--color-muted-foreground)]",
        renderCell: (row) => row.roleRank ?? "—",
      },
      ...(!usesRoutedEdit
        ? [
            {
              id: "actions",
              header: "Actions",
              sortable: false,
              align: "right" as const,
              width: "16%",
              cellClassName: "text-right",
              renderCell: (row: RoleTableRow) => (
                <div className="flex justify-end gap-2">
                  {!row.editable ? (
                    <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
                      System-managed
                    </span>
                  ) : (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openEditRole(row.id)}
                        disabled={!canManage || saving}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      {onDeleteRole && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteRole(row.id)}
                          disabled={!canManage || saving}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ),
            },
          ]
        : []),
    ],
    [canManage, onDeleteRole, openEditRole, saving, usesRoutedEdit],
  );

  const roleTableTopRow: DataTableTopRowConfig = {
    actions: [
      {
        id: "add-role",
        label: "Add Role",
        icon: <Plus className="h-4 w-4" />,
        variant: "ghost",
        disabled: !canManage || saving || isAddingRole,
        onClick: () => setIsAddingRole(true),
      },
    ],
  };

  return (
    <StackLayout className="min-h-0 flex-1">
      <Card variant="plain" padding="md" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {(title || description) && (
          <CardHeader>
            <div>
              {title && <CardTitle>{title}</CardTitle>}
              {description && <CardDescription>{description}</CardDescription>}
            </div>
          </CardHeader>
        )}
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {loadingRoles ? (
            <div className="py-8 text-center text-slate-500">
              Loading roles...
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
              <DataTable
                variant="operational"
                columns={roleColumns}
                rows={paginatedRoleRows}
                getRowId={(row) => row.id}
                emptyState="No roles yet."
                className="min-h-0 flex-1"
                minTableWidth={900}
                tableLayout="fixed"
                sortField={roleSortField}
                sortDirection={roleSortDirection}
                onSortChange={handleRoleSortChange}
                topRow={roleTableTopRow}
                getRowProps={(row) => {
                  const canOpenRole = usesRoutedEdit && canManage && !saving;

                  return canOpenRole
                    ? {
                        className: "cursor-pointer hover:bg-[var(--color-muted)]",
                        onClick: () => onEditRole?.(row.id),
                      }
                    : {};
                }}
                pagination={{
                  currentPage: rolePage,
                  totalPages: roleTotalPages,
                  totalItems: sortedRoleRows.length,
                  itemsPerPage: rolePageSize,
                  onPageChange: setRolePage,
                  onItemsPerPageChange: (nextPageSize) => {
                    setRolePageSize(nextPageSize);
                    setRolePage(1);
                  },
                }}
                bottomRow={isAddingRole ? (
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_auto_auto] md:items-start">
                    <Input
                      value={addName}
                      onChange={(event) => setAddName(event.target.value)}
                      placeholder="New role name"
                      disabled={!canManage || saving}
                    />
                    <Input
                      value={addDescription}
                      onChange={(event) => setAddDescription(event.target.value)}
                      placeholder="Role description"
                      disabled={!canManage || saving}
                    />
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={addRoleRank}
                      onChange={(event) => setAddRoleRank(event.target.value)}
                      placeholder="Role rank"
                      disabled={!canManage || saving}
                    />
                    <Button
                      type="button"
                      onClick={handleAddRole}
                      disabled={!canManage || saving || !addName.trim()}
                    >
                      {saving ? "Saving..." : "Create Role"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setIsAddingRole(false);
                        setAddName("");
                        setAddDescription("");
                        setAddRoleRank("100");
                        setError(null);
                      }}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : undefined}
                bottomRowCellClassName="bg-[var(--color-table-row-bg)] px-4 py-3"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <SideSheet
        open={Boolean(editingRoleId)}
        onClose={closeEditRole}
        size="page"
      >
        <SideSheetContent>
          <SideSheetHeader>
            <SideSheetTitle>Edit Role Permissions</SideSheetTitle>
            <SideSheetDescription>
              Choose access types per permission area for this role.
            </SideSheetDescription>
          </SideSheetHeader>

          <form
            className="flex min-h-0 flex-1 flex-col gap-4"
            onSubmit={handleSaveRoleEdits}
          >
            <SideSheetBody className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Role Name
                  </label>
                  <Input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    disabled={!canManage || saving}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Description
                  </label>
                  <Textarea
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                    disabled={!canManage || saving}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Role Rank
                  </label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={editRoleRank}
                    onChange={(event) => setEditRoleRank(event.target.value)}
                    disabled={!canManage || saving}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                {loadingPermissions ? (
                  <div className="py-8 text-center text-sm text-slate-500">
                    Loading permissions...
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Permission</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Enabled</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissionGroups.map((group) =>
                        group.permissions.map((permission, index) => (
                          <TableRow key={permission.code}>
                            <TableCell className="align-top font-medium text-slate-900">
                              {index === 0 ? group.label : ""}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-slate-900">
                                {permission.label}
                              </div>
                              {permission.description ? (
                                <div className="mt-1 text-xs text-slate-500">
                                  {permission.description}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={editPermissions.includes(permission.code)}
                                onChange={(event) =>
                                  handleTogglePermission(
                                    permission.code,
                                    event.target.checked,
                                  )
                                }
                                disabled={!canManage || saving}
                              />
                            </TableCell>
                          </TableRow>
                        )),
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
            </SideSheetBody>

            <SideSheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeEditRole}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canManage || saving || !editName.trim()}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </SideSheetFooter>
          </form>
        </SideSheetContent>
      </SideSheet>
    </StackLayout>
  );
}
