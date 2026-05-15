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
import { DataTable, type DataTableColumn } from "../ui/DataTable";
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

  const permissionMatrix = useMemo(() => {
    const rows = new Map<
      string,
      { key: string; label: string; codesByType: Record<string, string> }
    >();
    const typeSet = new Set<string>();

    for (const permission of permissions) {
      const parts = permission.code.split(".");
      const type = parts.length > 1 ? parts[parts.length - 1] : "access";
      const resourceKey =
        parts.length > 1 ? parts.slice(0, -1).join(".") : permission.code;

      if (!rows.has(resourceKey)) {
        rows.set(resourceKey, {
          key: resourceKey,
          label: formatLabel(resourceKey),
          codesByType: {},
        });
      }

      rows.get(resourceKey)!.codesByType[type] = permission.code;
      typeSet.add(type);
    }

    const preferredOrder = ["view", "edit", "manage", "use"];
    const types = Array.from(typeSet).sort((left, right) => {
      const leftIndex = preferredOrder.indexOf(left);
      const rightIndex = preferredOrder.indexOf(right);

      if (leftIndex >= 0 && rightIndex >= 0) return leftIndex - rightIndex;
      if (leftIndex >= 0) return -1;
      if (rightIndex >= 0) return 1;
      return left.localeCompare(right);
    });

    const rowsList = Array.from(rows.values()).sort((left, right) =>
      left.label.localeCompare(right.label),
    );

    return {
      types,
      rows: rowsList,
    };
  }, [permissions]);

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
    if (!Number.isInteger(parsed) || parsed < 0) return null;
    return parsed;
  };

  const hasDuplicateRoleRank = (roleRank: number, ignoreRoleId?: string) => {
    return roles.some(
      (role) => role.id !== ignoreRoleId && role.roleRank === roleRank,
    );
  };

  const handleTogglePermission = (permissionCode: string, checked: boolean) => {
    setEditPermissions((current) => {
      if (checked) {
        return Array.from(new Set([...current, permissionCode]));
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
      setError("Role rank must be a non-negative integer.");
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
      setError("Role rank must be a non-negative integer.");
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

  const roleTableHeaderClassName =
    "border-b border-[#d9e2ef] bg-white px-4 py-4 uppercase";
  const roleTableCellClassName = "border-b border-[#d9e2ef] px-4 py-3";
  const usesRoutedEdit = Boolean(onEditRole);

  const roleColumns = useMemo<DataTableColumn<RoleTableRow, RoleSortField>[]>(
    () => [
      {
        id: "name",
        header: "Role Name",
        sortKey: "name",
        width: usesRoutedEdit ? "32%" : "26%",
        headerClassName: roleTableHeaderClassName,
        cellClassName: `${roleTableCellClassName} font-medium text-[var(--color-foreground)]`,
        renderCell: (row) => row.name,
      },
      {
        id: "description",
        header: "Description",
        sortKey: "description",
        width: usesRoutedEdit ? "50%" : "44%",
        headerClassName: roleTableHeaderClassName,
        cellClassName: `${roleTableCellClassName} text-[var(--color-muted-foreground)]`,
        renderCell: (row) => row.description || "—",
      },
      {
        id: "role-rank",
        header: "Role Rank",
        sortKey: "role-rank",
        width: usesRoutedEdit ? "18%" : "14%",
        headerClassName: roleTableHeaderClassName,
        cellClassName: `${roleTableCellClassName} text-[var(--color-muted-foreground)]`,
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
              headerClassName: roleTableHeaderClassName,
              cellClassName: `${roleTableCellClassName} text-right`,
              renderCell: (row: RoleTableRow) => (
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openEditRole(row.id)}
                    disabled={!canManage || saving || !row.editable}
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
                      disabled={!canManage || saving || !row.editable}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  )}
                </div>
              ),
            },
          ]
        : []),
    ],
    [canManage, onDeleteRole, openEditRole, saving, usesRoutedEdit],
  );

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
                getRowProps={(row) => {
                  const canEditRow = usesRoutedEdit && canManage && row.editable && !saving;

                  return canEditRow
                    ? {
                        className: "cursor-pointer hover:bg-[var(--color-muted)]",
                        onClick: () => onEditRole?.(row.id),
                      }
                    : {};
                }}
                tableWrapClassName="border-0 bg-white"
                tableClassName="bg-white"
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
                      min={0}
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
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingRole(true)}
                    disabled={!canManage || saving}
                    className="w-full justify-center border border-dashed border-[#d9e2ef] py-5"
                  >
                    <Plus className="h-4 w-4" />
                    Add Role
                  </Button>
                )}
                bottomRowCellClassName="bg-white px-4 py-3"
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
                    min={0}
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
                        {permissionMatrix.types.map((type) => (
                          <TableHead key={type}>{formatLabel(type)}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissionMatrix.rows.map((row) => (
                        <TableRow key={row.key}>
                          <TableCell className="font-medium text-slate-900">
                            {row.label}
                          </TableCell>
                          {permissionMatrix.types.map((type) => {
                            const permissionCode = row.codesByType[type];

                            if (!permissionCode) {
                              return (
                                <TableCell
                                  key={`${row.key}-${type}`}
                                  className="text-slate-400"
                                >
                                  —
                                </TableCell>
                              );
                            }

                            return (
                              <TableCell key={`${row.key}-${type}`}>
                                <Checkbox
                                  checked={editPermissions.includes(
                                    permissionCode,
                                  )}
                                  onChange={(event) =>
                                    handleTogglePermission(
                                      permissionCode,
                                      event.target.checked,
                                    )
                                  }
                                  disabled={!canManage || saving}
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
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
